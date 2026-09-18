import { defineAgent } from "eve";

export default defineAgent({
  model: "anthropic/claude-opus-4.8",
  build: {
    externalDependencies: ["sql.js"],
  },
});
