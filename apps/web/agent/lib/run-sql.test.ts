import { describe, expect, test } from "bun:test";
import { serializeModelInputSchema } from "eve/tools";
import runSql, { runSqlInputSchema } from "../tools/run_sql";

describe("SQL tool schema", () => {
  test("emits the model input schema through Eve", () => {
    expect(runSql.inputSchema).toBe(runSqlInputSchema);
    expect(serializeModelInputSchema(runSql.inputSchema)).toEqual({
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "A single read-only SELECT statement.",
        },
      },
      required: ["sql"],
      additionalProperties: false,
    });
  });

  test("validates SQL input and strips extra properties", async () => {
    expect(
      await runSqlInputSchema["~standard"].validate({
        sql: "SELECT 1",
        extra: true,
      }),
    ).toEqual({ value: { sql: "SELECT 1" } });
  });

  test.each([null, {}, { sql: 1 }, { sql: undefined }])(
    "rejects invalid tool input: %j",
    async (input) => {
      const result = await runSqlInputSchema["~standard"].validate(input);
      expect(result.issues).toBeDefined();
    },
  );
});
