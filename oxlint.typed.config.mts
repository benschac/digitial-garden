import { recommended } from "@effect/tsgo/oxlint-presets";
import { defineConfig } from "oxlint";

import base from "./oxlint.config.mts";

export default defineConfig({
  ...base,
  extends: [...base.extends, recommended],
  overrides: [
    ...base.overrides,
    {
      files: ["**/apps/web/src/app/experiments/wasm-canvas/wasm-engine.ts"],
      rules: { "typescript/no-unsafe-type-assertion": "off" },
    },
    {
      files: [
        "**/apps/web/agent/lib/sample-db.ts",
        "**/apps/web/scripts/social-preview-native.ts",
      ],
      rules: {
        "typescript/promise-function-async": [
          "error",
          { checkMethodDeclarations: false },
        ],
      },
    },
  ],
  rules: {
    ...base.rules,
    "effecttsgo/effect-try-without-catch": "error",
    "effecttsgo/global-error-in-effect-catch": "error",
    "effecttsgo/lazy-promise-in-effect-sync": "error",
    "effecttsgo/promise-in-effect-success": "error",
    "effecttsgo/run-effect-inside-effect": "error",
    "effecttsgo/try-catch-in-effect-gen": "error",
    "effecttsgo/unknown-in-effect-catch": "error",
  },
});
