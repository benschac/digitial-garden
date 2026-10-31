import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next],
  ignorePatterns: [
    ...core.ignorePatterns,
    ".agent/**",
    ".agent_sources/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".continue/**",
    ".cursor/**",
    ".gemini/**",
    ".opencode/**",
    ".pi/**",
    ".roo/**",
    ".windsurf/**",
    "tools/oxlint/anti-slop/**",
  ],
  jsPlugins: [
    {
      name: "anti-slop",
      specifier: "./tools/oxlint/anti-slop/index.ts",
    },
    {
      name: "anti-slop-effect",
      specifier: "./tools/oxlint/anti-slop/effect/index.ts",
    },
  ],
  overrides: [
    {
      files: [
        "**/apps/web/agent/lib/sample-db-service.ts",
        "**/apps/web/agent/lib/sample-db.ts",
        "**/apps/web/scripts/watch-wasm-lifecycle.ts",
        "**/apps/web/src/app/experiments/wasm-canvas/particle-initialization.ts",
        "**/apps/web/src/app/experiments/wasm-canvas/wasm-engine.ts",
        "**/apps/web/src/components/ai-elements/prompt-input-attachments.ts",
      ],
      rules: { "unicorn/throw-new-error": "off" },
    },
    {
      files: ["**/apps/web/agent/lib/sample-db-service.ts"],
      rules: { "max-classes-per-file": ["error", 3] },
    },
    {
      files: [
        "**/apps/web/src/app/experiments/wasm-canvas/particle-initialization.ts",
        "**/apps/web/src/components/ai-elements/prompt-input-attachments.ts",
      ],
      rules: { "max-classes-per-file": ["error", 2] },
    },
    {
      files: ["**/apps/web/src/app/experiments/wasm-canvas/wasm-engine.ts"],
      rules: { "max-classes-per-file": ["error", 5] },
    },
    {
      files: [
        "**/apps/web/src/app/experiments/typegpu-particles/typegpu-particle-shaders.ts",
        "**/apps/web/src/app/experiments/typegpu-particles/typegpu-particle-renderer.ts",
        "**/apps/web/src/app/experiments/wasm-canvas/webgpu-particle-renderer.ts",
        "**/apps/web/src/lib/perlin-noise.ts",
      ],
      rules: { "no-bitwise": "off" },
    },
    {
      files: [
        "**/apps/web/src/app/experiments/perlin-noise/perlin-noise-experiment.tsx",
        "**/apps/web/src/app/experiments/typegpu-particles/typegpu-particles.tsx",
        "**/apps/web/src/app/experiments/forces/forces-experiment.tsx",
        "**/apps/web/src/app/experiments/wasm-canvas/wasm-canvas.tsx",
      ],
      rules: { "jsx-a11y/prefer-tag-over-role": "off" },
    },
    {
      files: ["**/packages/ui/src/index.ts"],
      rules: { "oxc/no-barrel-file": "off" },
    },
    {
      files: ["**/apps/web/src/mdx-components.tsx"],
      rules: {
        "react/no-clone-element": "off",
        "react/no-react-children": "off",
      },
    },
    {
      files: ["**/apps/web/src/components/ai-elements/shimmer.tsx"],
      rules: { "react/static-components": "off" },
    },
    {
      files: ["**/apps/web/src/components/ai-elements/prompt-input.tsx"],
      rules: {
        "promise/avoid-new": "off",
        "react/hook-use-state": "off",
        "react/no-react-children": "off",
      },
    },
    {
      files: ["**/packages/ui/src/components/spinner.tsx"],
      rules: { "jsx-a11y/prefer-tag-over-role": "off" },
    },
    {
      files: [
        "**/apps/web/src/app/typography-inspector.tsx",
        "**/apps/web/src/app/article-content-overlay.tsx",
        "**/apps/web/src/app/article-rhythm-inspector.tsx",
        "**/apps/web/src/app/experiments/forces/forces-experiment.tsx",
      ],
      rules: { "react/exhaustive-effect-dependencies": "off" },
    },
    {
      files: ["**/apps/web/src/app/_components/agent-chat-submission.ts"],
      rules: {
        "func-style": ["error", "declaration", { allowArrowFunctions: true }],
      },
    },
    {
      files: [
        "**/apps/web/src/app/experiments/typegpu-particles/typegpu-particle-shaders.ts",
        "**/apps/web/src/lib/content/collection.ts",
      ],
      rules: { "sort-keys": "off" },
    },
    {
      files: [
        "**/apps/web/src/app/experiments/typegpu-particles/typegpu-particle-shaders.ts",
      ],
      rules: { "prefer-destructuring": "off" },
    },
    {
      files: [
        "**/apps/web/src/app/experiments/wasm-canvas/wasm-particle-renderer.ts",
      ],
      rules: { "no-empty-function": "off" },
    },
    {
      files: [
        "**/apps/web/src/components/ai-elements/prompt-input.tsx",
        "**/apps/web/src/components/ai-elements/question.tsx",
        "**/apps/web/src/mdx-components.tsx",
      ],
      rules: {
        "react/jsx-no-target-blank": [
          "error",
          {
            allowReferrer: true,
            enforceDynamicLinks: "always",
            forms: true,
            links: true,
            warnOnSpreadAttributes: false,
          },
        ],
      },
    },
    {
      files: ["**/packages/*/src/**/*"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "@/**",
                  "@personal-site/web",
                  "@personal-site/web/**",
                  "**/apps/**",
                ],
                message: "Shared packages must not depend on app-owned code.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["**/apps/**/*"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "**/packages/*/src",
                  "**/packages/*/src/**",
                  "@personal-site/*/src",
                  "@personal-site/*/src/**",
                ],
                message: "Import shared packages through their public exports.",
              },
            ],
          },
        ],
      },
    },
  ],
  rules: {
    "anti-slop-effect/no-manual-effect-error-tag": "error",
    "anti-slop-effect/no-manual-tag-comparison": "error",
    "anti-slop-effect/no-manual-tagged-construction": "error",
    "anti-slop-effect/no-service-constructor-imports": "error",
    "anti-slop-effect/prefer-effect-match": "error",
    "anti-slop/no-array-filter-map": "error",
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reduce-accumulator-copy": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-readable-spacing": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "off",
    eqeqeq: [
      "error",
      "always",
      {
        null: "ignore",
      },
    ],
    "eslint/no-eq-null": "off",
    "jsx-a11y/no-autofocus": "error",
    "no-cond-assign": ["error", "always"],
    "no-empty-pattern": [
      "error",
      {
        allowObjectPatternsAsParameters: false,
      },
    ],
    "no-restricted-globals": [
      "error",
      {
        checkGlobalObject: true,
        globals: ["isFinite", "isNaN"],
      },
    ],
    "react/jsx-no-target-blank": [
      "error",
      {
        allowReferrer: true,
        enforceDynamicLinks: "always",
        forms: true,
        links: true,
        warnOnSpreadAttributes: true,
      },
    ],
    "react/jsx-no-useless-fragment": [
      "error",
      {
        allowExpressions: true,
      },
    ],
    "react/no-array-index-key": "error",
    "typescript/ban-ts-comment": [
      "error",
      {
        "ts-check": false,
        "ts-expect-error": true,
        "ts-ignore": true,
        "ts-nocheck": true,
      },
    ],
    "typescript/no-unused-vars": [
      "error",
      {
        args: "all",
        argsIgnorePattern: "^_",
        caughtErrors: "all",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        ignoreRestSiblings: true,
        varsIgnorePattern: "^_",
      },
    ],
    "typescript/no-use-before-define": [
      "error",
      {
        allowNamedExports: true,
        classes: true,
        enums: true,
        functions: false,
        ignoreTypeReferences: true,
        typedefs: false,
        variables: true,
      },
    ],
    "typescript/prefer-optional-chain": "warn",
  },
});
