import { describe, expect, test } from "bun:test";

import { Effect, Layer } from "effect";
import initSqlJs from "sql.js";

import {
  createSampleDb,
  disposeSampleDb,
  runReadOnlySql,
  SampleDbDisposedError,
} from "./sample-db";
import {
  makeSampleDbLayer,
  SampleDb,
  SampleDbInitializationError,
  SampleDbQueryError,
} from "./sample-db-service";
import type { SampleDbConnection } from "./sample-db-service";

function createDriver() {
  const calls = { loads: 0, creates: 0, seeds: 0, queries: 0, closes: 0 };
  class Database implements SampleDbConnection {
    constructor() {
      calls.creates++;
    }
    run() {
      calls.seeds++;
    }
    exec() {
      calls.queries++;
      return [{ columns: ["value"], values: [[42]] }];
    }
    close() {
      calls.closes++;
    }
  }
  const initialize = async () => {
    calls.loads++;
    return { Database };
  };
  return { calls, Database, initialize };
}

describe("sample-db", () => {
  test("keeps the public Promise owner alive until explicit disposal", async () => {
    try {
      await runReadOnlySql("CREATE TABLE lifetime_test (value INTEGER)");
      await runReadOnlySql("INSERT INTO lifetime_test VALUES (7)");
      expect(await runReadOnlySql("SELECT value FROM lifetime_test")).toEqual({
        columns: ["value"],
        rows: [[7]],
      });
    } finally {
      await disposeSampleDb();
    }
    await disposeSampleDb();
    await expect(runReadOnlySql("SELECT 1")).rejects.toBeInstanceOf(
      SampleDbDisposedError,
    );
  });

  test("executes real sql.js with the existing seed, output, and persistent mutations", async () => {
    const database = createSampleDb();
    try {
      expect(
        await database.runReadOnlySql(
          "SELECT customers.name, SUM(orders.amount_cents) AS total FROM orders JOIN customers ON customers.id = orders.customer_id GROUP BY customers.id ORDER BY customers.id",
        ),
      ).toEqual({
        columns: ["name", "total"],
        rows: [
          ["Acme", 5700],
          ["Globex", 9900],
          ["Initech", 800],
        ],
      });
      expect(await database.runReadOnlySql("")).toEqual({
        columns: [],
        rows: [],
      });
      expect(
        await database.runReadOnlySql(
          "INSERT INTO customers VALUES (13, 'New customer', 'free')",
        ),
      ).toEqual({ columns: [], rows: [] });
      expect(
        await database.runReadOnlySql(
          "SELECT name FROM customers WHERE id = 13; SELECT 99",
        ),
      ).toEqual({ columns: ["name"], rows: [["New customer"]] });
      expect(
        await database.runReadOnlySql("SELECT id FROM customers WHERE id = -1"),
      ).toEqual({ columns: [], rows: [] });
      await expect(
        database.runReadOnlySql(
          "UPDATE orders SET amount_cents = amount_cents + 1 WHERE id = 1; SELECT missing FROM orders",
        ),
      ).rejects.toBeInstanceOf(SampleDbQueryError);
      expect(
        await database.runReadOnlySql(
          "SELECT amount_cents FROM orders WHERE id = 1",
        ),
      ).toEqual({ columns: ["amount_cents"], rows: [[4201]] });
    } finally {
      await database.dispose();
    }
    await expect(database.runReadOnlySql("SELECT 1")).rejects.toBeInstanceOf(
      SampleDbDisposedError,
    );
  });

  test("retries real initialization only on a later request after failure", async () => {
    let attempts = 0;
    const failure = new Error("module unavailable");
    const database = createSampleDb(
      makeSampleDbLayer(() => {
        attempts++;
        if (attempts === 1) throw failure;
        return initSqlJs();
      }),
    );
    try {
      await expect(database.runReadOnlySql("SELECT 1")).rejects.toMatchObject({
        _tag: "SampleDbInitializationError",
        cause: failure,
      });
      expect(attempts).toBe(1);
      expect(
        await database.runReadOnlySql("SELECT COUNT(*) AS count FROM orders"),
      ).toEqual({
        columns: ["count"],
        rows: [[4]],
      });
      await database.runReadOnlySql("SELECT 2");
      expect(attempts).toBe(2);
    } finally {
      await database.dispose();
    }
  });

  test("coalesces concurrent initialization and retains the database across queries", async () => {
    const driver = createDriver();
    const started = Promise.withResolvers<undefined>();
    const ready = Promise.withResolvers<undefined>();
    const database = createSampleDb(
      makeSampleDbLayer(async () => {
        started.resolve(undefined);
        await ready.promise;
        return driver.initialize();
      }),
    );
    try {
      const pending = Array.from({ length: 10 }, () =>
        database.runReadOnlySql("SELECT 42"),
      );
      await started.promise;
      ready.resolve(undefined);
      expect(await Promise.all(pending)).toEqual(
        Array.from({ length: 10 }, () => ({
          columns: ["value"],
          rows: [[42]],
        })),
      );
      await database.runReadOnlySql("SELECT 42");
      expect(driver.calls).toEqual({
        loads: 1,
        creates: 1,
        seeds: 1,
        queries: 11,
        closes: 0,
      });
    } finally {
      ready.resolve(undefined);
      await database.dispose();
    }
    expect(driver.calls.closes).toBe(1);
  });

  test("shares an asynchronous initialization failure and recovers on the next call", async () => {
    const driver = createDriver();
    const started = Promise.withResolvers<undefined>();
    const ready = Promise.withResolvers<undefined>();
    const failure = new Error("load rejected");
    let attempts = 0;
    const database = createSampleDb(
      makeSampleDbLayer(async () => {
        attempts++;
        if (attempts === 1) {
          started.resolve(undefined);
          await ready.promise;
          throw failure;
        }
        return driver.initialize();
      }),
    );
    try {
      const pending = Promise.allSettled([
        database.runReadOnlySql("SELECT 1"),
        database.runReadOnlySql("SELECT 2"),
      ]);
      await started.promise;
      ready.resolve(undefined);
      expect(await pending).toMatchObject([
        {
          status: "rejected",
          reason: { _tag: "SampleDbInitializationError", cause: failure },
        },
        {
          status: "rejected",
          reason: { _tag: "SampleDbInitializationError", cause: failure },
        },
      ]);
      expect(attempts).toBe(1);
      await database.runReadOnlySql("SELECT 3");
      expect(attempts).toBe(2);
      expect(driver.calls.queries).toBe(1);
    } finally {
      ready.resolve(undefined);
      await database.dispose();
    }
  });

  test("closes a database immediately when seeding fails before retrying", async () => {
    const driver = createDriver();
    const failure = new Error("seed failed");
    class Database extends driver.Database {
      override run() {
        super.run();
        if (driver.calls.seeds === 1) throw failure;
      }
    }
    const database = createSampleDb(
      makeSampleDbLayer(async () => ({ Database })),
    );
    try {
      await expect(database.runReadOnlySql("SELECT 1")).rejects.toMatchObject({
        _tag: "SampleDbInitializationError",
        cause: failure,
      });
      expect(driver.calls).toEqual({
        loads: 0,
        creates: 1,
        seeds: 1,
        queries: 0,
        closes: 1,
      });
      await database.runReadOnlySql("SELECT 1");
      expect(driver.calls).toEqual({
        loads: 0,
        creates: 2,
        seeds: 2,
        queries: 1,
        closes: 1,
      });
    } finally {
      await database.dispose();
    }
    expect(driver.calls.closes).toBe(2);
  });

  test("types constructor failures and permits a later initialization attempt", async () => {
    const driver = createDriver();
    class Database extends driver.Database {
      constructor() {
        super();
        if (driver.calls.creates === 1) throw new Error("construction failed");
      }
    }
    const database = createSampleDb(
      makeSampleDbLayer(async () => ({ Database })),
    );
    try {
      await expect(database.runReadOnlySql("SELECT 1")).rejects.toBeInstanceOf(
        SampleDbInitializationError,
      );
      expect(driver.calls.closes).toBe(0);
      await database.runReadOnlySql("SELECT 1");
      expect(driver.calls.creates).toBe(2);
    } finally {
      await database.dispose();
    }
    expect(driver.calls.closes).toBe(1);
  });

  test("does not retry SQL failures or discard the initialized database", async () => {
    const driver = createDriver();
    const failure = new Error("invalid SQL");
    class Database extends driver.Database {
      override exec() {
        const result = super.exec();
        if (driver.calls.queries === 1) throw failure;
        return result;
      }
    }
    const database = createSampleDb(
      makeSampleDbLayer(async () => ({ Database })),
    );
    try {
      await expect(database.runReadOnlySql("invalid")).rejects.toMatchObject({
        _tag: "SampleDbQueryError",
        cause: failure,
      });
      expect(driver.calls.queries).toBe(1);
      await database.runReadOnlySql("SELECT 42");
      expect(driver.calls).toEqual({
        loads: 0,
        creates: 1,
        seeds: 1,
        queries: 2,
        closes: 0,
      });
    } finally {
      await database.dispose();
    }
  });

  test("disposes exactly once and rejects new work immediately", async () => {
    const driver = createDriver();
    const database = createSampleDb(makeSampleDbLayer(driver.initialize));
    await database.runReadOnlySql("SELECT 42");
    const disposal = database.dispose();
    expect(database.dispose()).toBe(disposal);
    await expect(database.runReadOnlySql("SELECT 42")).rejects.toBeInstanceOf(
      SampleDbDisposedError,
    );
    await disposal;
    await database.dispose();
    expect(driver.calls).toEqual({
      loads: 1,
      creates: 1,
      seeds: 1,
      queries: 1,
      closes: 1,
    });
  });

  test("disposal before first use does not initialize anything", async () => {
    const driver = createDriver();
    const database = createSampleDb(makeSampleDbLayer(driver.initialize));
    await database.dispose();
    await expect(database.runReadOnlySql("SELECT 42")).rejects.toBeInstanceOf(
      SampleDbDisposedError,
    );
    expect(driver.calls).toEqual({
      loads: 0,
      creates: 0,
      seeds: 0,
      queries: 0,
      closes: 0,
    });
  });

  test("disposal during module loading prevents late allocation, seeding, and queries", async () => {
    const driver = createDriver();
    const started = Promise.withResolvers<undefined>();
    const ready = Promise.withResolvers<{ Database: typeof driver.Database }>();
    const database = createSampleDb(
      makeSampleDbLayer(() => {
        started.resolve(undefined);
        return ready.promise;
      }),
    );
    const pending = Promise.allSettled([
      database.runReadOnlySql("SELECT 1"),
      database.runReadOnlySql("SELECT 2"),
    ]);
    await started.promise;
    await database.dispose();
    ready.resolve({ Database: driver.Database });
    await ready.promise;
    expect(await pending).toMatchObject([
      { status: "rejected" },
      { status: "rejected" },
    ]);
    await expect(database.runReadOnlySql("SELECT 3")).rejects.toBeInstanceOf(
      SampleDbDisposedError,
    );
    expect(driver.calls).toEqual({
      loads: 0,
      creates: 0,
      seeds: 0,
      queries: 0,
      closes: 0,
    });
  });

  test("accepts a substitute service layer without sql.js initialization", async () => {
    const queries: string[] = [];
    const database = createSampleDb(
      Layer.succeed(SampleDb)({
        query: (sql) =>
          Effect.sync(() => {
            queries.push(sql);
            return { columns: ["substitute"], rows: [[sql]] };
          }),
      }),
    );
    try {
      expect(await database.runReadOnlySql("test query")).toEqual({
        columns: ["substitute"],
        rows: [["test query"]],
      });
      expect(queries).toEqual(["test query"]);
    } finally {
      await database.dispose();
    }
  });
});
