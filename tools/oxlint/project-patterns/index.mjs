import { definePlugin, defineRule } from "@oxlint/plugins";

const runners = new Set([
  "runPromise",
  "runPromiseWith",
  "runPromiseExit",
  "runPromiseExitWith",
  "runSync",
  "runSyncWith",
  "runSyncExit",
  "runSyncExitWith",
  "runFork",
  "runForkWith",
  "runCallback",
  "runCallbackWith",
]);

const importedEffect = (node, context) => {
  if (node.type !== "Identifier") {
    return false;
  }

  let scope = context.sourceCode.getScope(node);

  while (scope) {
    const variable = scope.set.get(node.name);

    if (variable) {
      return variable.defs.some(
        (definition) =>
          definition.type === "ImportBinding" &&
          definition.parent.source.value === "effect" &&
          definition.node.type === "ImportSpecifier" &&
          definition.node.imported.name === "Effect"
      );
    }

    scope = scope.upper;
  }

  return false;
};

const serviceExecution = defineRule({
  create(context) {
    return {
      MemberExpression(node) {
        const name = node.computed ? node.property.value : node.property.name;

        if (runners.has(name) && importedEffect(node.object, context)) {
          context.report({ messageId: "boundary", node });
        }
      },
    };
  },
  meta: {
    messages: {
      boundary:
        "Return composable Effects from service modules; execute them in the integration owner.",
    },
    type: "problem",
  },
});

export default definePlugin({
  meta: { name: "project-patterns" },
  rules: { "service-execution": serviceExecution },
});
