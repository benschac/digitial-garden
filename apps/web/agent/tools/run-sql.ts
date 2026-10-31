import { Schema } from "effect";
import { defineTool } from "eve/tools";

import { runReadOnlySql } from "../lib/sample-db";

const sqlInputSchema = Schema.Struct({
  sql: Schema.String.annotate({
    description: "A single read-only SELECT statement.",
  }),
}).pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

// Eve detects Standard Schema on objects; Effect struct schemas are functions.
export const runSqlInputSchema = { "~standard": sqlInputSchema["~standard"] };

export default defineTool({
  description:
    "Run a read-only SQL query against the analytics tables (orders, customers) " +
    "and return the columns and rows.",
  async execute({ sql }) {
    const { columns, rows } = await runReadOnlySql(sql);

    return { columns, rows: rows.slice(0, 500), truncated: rows.length > 500 };
  },
  inputSchema: runSqlInputSchema,
});
