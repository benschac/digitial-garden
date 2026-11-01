import { describe, expect, test } from "bun:test";

import { serializeModelInputSchema } from "eve/tools";

import runSql, { runSqlInputSchema } from "../tools/run-sql";

describe("SQL tool schema", () => {
  test("emits the model input schema through Eve", () => {
    expect(runSql.inputSchema).toBe(runSqlInputSchema);
    expect(serializeModelInputSchema(runSql.inputSchema)).toEqual({
      additionalProperties: false,
      properties: {
        sql: {
          description: "A single read-only SELECT statement.",
          type: "string",
        },
      },
      required: ["sql"],
      type: "object",
    });
  });

  test("validates SQL input and strips extra properties", async () => {
    expect(
      await runSqlInputSchema["~standard"].validate({
        extra: true,
        sql: "SELECT 1",
      })
    ).toEqual({ value: { sql: "SELECT 1" } });
  });

  test.each([null, {}, { sql: 1 }, { sql: undefined }])(
    "rejects invalid tool input: %j",
    async (input) => {
      const result = await runSqlInputSchema["~standard"].validate(input);
      expect(result.issues).toBeDefined();
    }
  );
});
