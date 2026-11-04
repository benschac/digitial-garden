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

const importBinding = (node, context) => {
  if (node.type !== "Identifier") {
    return;
  }

  let scope = context.sourceCode.getScope(node);

  while (scope) {
    const variable = scope.set.get(node.name);

    if (variable) {
      return variable.defs.find(
        (definition) => definition.type === "ImportBinding"
      );
    }

    scope = scope.upper;
  }
};

const memberName = (node) => {
  if (!node.computed) {
    return node.property.name;
  }

  return node.property.type === "TemplateLiteral" &&
    node.property.expressions.length === 0
    ? node.property.quasis[0].value.cooked
    : node.property.value;
};

const importedEffect = (node, context) => {
  if (node.type === "MemberExpression" && memberName(node) === "Effect") {
    const namespace = importBinding(node.object, context);

    return (
      namespace?.parent.source.value === "effect" &&
      namespace.node.type === "ImportNamespaceSpecifier"
    );
  }

  const binding = importBinding(node, context);

  return (
    (binding?.parent.source.value === "effect" &&
      binding.node.type === "ImportSpecifier" &&
      binding.node.imported.name === "Effect") ||
    (binding?.parent.source.value === "effect/Effect" &&
      binding.node.type === "ImportNamespaceSpecifier")
  );
};

const effectOperation = (node, context) => {
  if (node.type === "CallExpression") {
    return effectOperation(node.callee, context);
  }

  if (
    node.type === "MemberExpression" &&
    importedEffect(node.object, context)
  ) {
    return memberName(node);
  }

  const binding = importBinding(node, context);

  return binding?.parent.source.value === "effect/Effect" &&
    binding.node.type === "ImportSpecifier"
    ? binding.node.imported.name
    : undefined;
};

const insideEffect = (node, context) =>
  context.sourceCode.getAncestors(node).some((parent) => {
    if (parent.type !== "CallExpression") {
      return false;
    }

    const operation = effectOperation(parent.callee, context);

    return operation !== undefined && !runners.has(operation);
  });

const promiseRecovery = defineRule({
  create(context) {
    const report = (node) => {
      if (
        !context.options[0]?.allowOutsideEffect ||
        insideEffect(node, context)
      ) {
        context.report({ messageId: "boundary", node });
      }
    };

    return {
      MemberExpression(node) {
        if (importedEffect(node.object, context)) {
          return;
        }

        if (memberName(node) === "catch") {
          report(node);
        }

        if (
          memberName(node) === "then" &&
          node.parent.type === "CallExpression" &&
          node.parent.callee === node &&
          node.parent.arguments.length > 1
        ) {
          report(node);
        }
      },
      VariableDeclarator(node) {
        if (
          node.id.type !== "ObjectPattern" ||
          !node.init ||
          importedEffect(node.init, context)
        ) {
          return;
        }

        for (const property of node.id.properties) {
          if (
            property.type === "Property" &&
            (property.computed ? property.key.value : property.key.name) ===
              "catch"
          ) {
            report(property);
          }
        }
      },
    };
  },
  meta: {
    messages: {
      boundary:
        "Keep Promise rejection handling at a declared integration boundary. In Effect-owned code, use Effect.tryPromise with a typed error mapper and Effect recovery operators.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: { allowOutsideEffect: { type: "boolean" } },
        type: "object",
      },
    ],
    type: "problem",
  },
});

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
  rules: {
    "promise-recovery": promiseRecovery,
    "service-execution": serviceExecution,
  },
});
