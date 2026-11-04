import { recommended } from "@effect/tsgo/oxlint-presets";
import { defineConfig } from "oxlint";

import base from "./oxlint.config.mts";

export default defineConfig({
  ...base,
  extends: [...base.extends, recommended],
});
