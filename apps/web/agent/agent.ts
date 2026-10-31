import { defineAgent } from "eve";

export default defineAgent({
  build: {
    externalDependencies: ["sql.js"],
  },
  model: "anthropic/claude-opus-4.8",
});
