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
});
