import { isDeepStrictEqual } from "node:util";
import { isProxy } from "node:util/types";

import { Predicate, Result, Schema } from "effect";

import { validateEvidence } from "./orchestrator-evidence.mjs";

const text = Schema.String.check(Schema.isPattern(/\S/u));
const sha = Schema.String.check(Schema.isPattern(/^[\da-f]{40}$/u));
const digest = Schema.String.check(Schema.isPattern(/^[\da-f]{64}$/u));
const revision = Schema.Struct({ id: text, revision: sha });
const revisions = Schema.Array(revision);
const commit = Schema.Struct({ commit: sha, tree: sha });
const command = Schema.TupleWithRest(Schema.Tuple([text]), [Schema.String]);
const check = Schema.Struct({ command, name: text });
const loggedCheck = Schema.Struct({ ...check.fields, logArtifactId: text });

const toolchain = Schema.Struct({
  arch: text,
  bun: text,
  node: text,
  platform: text,
});

const artifact = Schema.Struct({ id: text, path: text, sha256: digest });

const diffEntry = Schema.Union([
  Schema.Struct({
    path: text,
    status: Schema.Literals(["added", "modified", "deleted"]),
  }),
  Schema.Struct({
    path: text,
    previousPath: text,
    status: Schema.Literal("renamed"),
  }),
]);

const policySchema = Schema.Struct({
  checks: Schema.NonEmptyArray(check),
  forbiddenPaths: Schema.Array(text),
  localOnly: Schema.Boolean,
  ownedPaths: Schema.NonEmptyArray(text),
  protectedPaths: Schema.Array(text),
  revision: sha,
  targetRef: text,
  toolchain,
  verification: Schema.Struct({
    dependencyLinks: Schema.Array(Schema.Struct({ path: text, source: text })),
    executables: Schema.Struct({ bun: text, git: text, node: text }),
    policyPath: text,
    policySha256: digest,
    verifierSha256: digest,
  }),
  verifierCommit: sha,
  version: Schema.Literal(1),
});

const taskSchema = Schema.Struct({
  attemptId: text,
  authorIds: Schema.NonEmptyArray(text),
  dependencies: Schema.Array(
    Schema.Struct({
      ...revision.fields,
      kind: Schema.Literals(["hard", "contract"]),
      status: Schema.Literals(["ready", "blocked"]),
    })
  ),
  id: text,
  resources: Schema.Literals(["ready", "blocked"]),
  revision: sha,
  specificationRevision: sha,
});

const candidateSchema = Schema.Struct({
  ...commit.fields,
  attemptId: text,
  baseCommit: sha,
  dependencyRevisions: revisions,
  policyRevision: sha,
  specificationRevision: sha,
  taskId: text,
  taskRevision: sha,
  verifierCommit: sha,
});

const integrationSchema = Schema.Struct({
  commits: Schema.NonEmptyArray(commit),
  currentBase: sha,
  expectedBase: sha,
  mode: Schema.Literals(["independent", "atomic"]),
  resultCommit: sha,
  resultTree: sha,
  targetRef: text,
});

const riskSchema = Schema.Struct({
  authorityChanged: Schema.Boolean,
  behaviorChanged: Schema.Boolean,
  buildOrConfigChanged: Schema.Boolean,
  concurrentIntegration: Schema.Boolean,
  dependentCode: Schema.Boolean,
  deploymentChanged: Schema.Boolean,
  kind: Schema.Literals(["ordinary", "trivial_docs", "sensitive"]),
  permissionsChanged: Schema.Boolean,
  productDecision: Schema.Boolean,
  recoveryChanged: Schema.Boolean,
  reversible: Schema.Boolean,
  verificationChanged: Schema.Boolean,
});

const reportArtifact = Schema.Struct({ path: text, sha256: digest });

const verificationStatus = Schema.Literals([
  "passed",
  "check_failure",
  "infrastructure_failure",
  "rejected",
]);

const reportCheck = Schema.Struct({
  ...loggedCheck.fields,
  cleanupError: Schema.Union([Schema.String, Schema.Null]),
  exitCode: Schema.Union([Schema.Int, Schema.Null]),
  signal: Schema.Union([text, Schema.Null]),
  status: Schema.Literals([
    "passed",
    "check_failure",
    "infrastructure_failure",
  ]),
  timedOut: Schema.Boolean,
});

const verificationSchema = Schema.Struct({
  artifacts: Schema.Array(artifact),
  checks: Schema.Array(reportCheck),
  errors: Schema.Array(text),
  provenance: Schema.Struct({
    attemptId: text,
    candidateBase: sha,
    candidateCommit: sha,
    candidateTree: sha,
    changedPaths: Schema.Array(text),
    controlCommit: sha,
    dependencyLinks: Schema.Array(Schema.Struct({ path: text, source: text })),
    executables: Schema.Struct({ bun: text, git: text, node: text }),
    expectedBase: sha,
    isolation: Schema.Literal("local-checkout-only"),
    policyPath: text,
    policySha256: digest,
    resultCommit: sha,
    resultTree: sha,
    taskId: text,
    toolchain,
    verifierCommit: sha,
    verifierSha256: digest,
  }),
  receipt: Schema.Unknown,
  reportArtifact,
  status: verificationStatus,
  version: Schema.Literal(1),
});

const verificationBindingSchema = Schema.Struct({
  commits: Schema.NonEmptyArray(commit),
  dependencyRevisions: revisions,
  mode: Schema.Literals(["independent", "atomic"]),
  policyRevision: sha,
  reportArtifact,
  specificationRevision: sha,
  taskRevision: sha,
});

const reviewSchema = Schema.Struct({
  attemptId: text,
  baseCommit: sha,
  candidateCommit: sha,
  candidateTree: sha,
  dependencyRevisions: revisions,
  optionalSuggestions: Schema.optionalKey(Schema.Array(text)),
  policyRevision: sha,
  resultCommit: sha,
  resultTree: sha,
  reviewerId: text,
  role: Schema.Literals(["general", "correctness", "security", "complexity"]),
  specificationRevision: sha,
  taskId: text,
  taskRevision: sha,
  verdict: Schema.Literals(["approved", "changes_requested"]),
  verifierCommit: sha,
});

const lanes = [
  "BLOCKED",
  "HUMAN_REVIEW",
  "REWORK",
  "STACKED_REVIEW",
  "FAST_INTEGRATE",
];

const prohibitedActions = [
  "push",
  "deploy",
  "force_update",
  "rewrite_history",
  "alter_branch_protection",
  "delete_shared_infrastructure",
];

const authorizationActions = [
  "add_dependency",
  "destructive_migration",
  "credential_expansion",
  "permission_expansion",
  "production_write",
];

const actionSchema = Schema.Literals([
  "local_integrate",
  ...prohibitedActions,
  ...authorizationActions,
]);

const sensitiveRoles = ["correctness", "security", "complexity"];

const snapshot = (value, ancestors = new Set()) => {
  if (isProxy(value) || Predicate.isFunction(value)) {
    return;
  }

  if (!Predicate.isObjectOrArray(value)) {
    return value;
  }

  if (ancestors.has(value) || ancestors.size >= 32) {
    return;
  }

  const next = new Set([...ancestors, value]);

  if (Array.isArray(value)) {
    return Array.from({ length: value.length }, (_, index) =>
      snapshot(
        Object.getOwnPropertyDescriptor(value, String(index))?.value,
        next
      )
    );
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    return;
  }

  return Object.fromEntries(
    Reflect.ownKeys(value).map((key) => [
      key,
      snapshot(Object.getOwnPropertyDescriptor(value, key)?.value, next),
    ])
  );
};

const validPath = (path) =>
  !path.startsWith("/") &&
  !/[\\:]/u.test(path) &&
  [...path].every(
    (character) =>
      character.codePointAt(0) > 31 && character.codePointAt(0) !== 127
  ) &&
  path.split("/").every((part) => part !== "" && part !== "." && part !== "..");

const duplicate = (items) => new Set(items).size !== items.length;
const same = isDeepStrictEqual;

const dependencyRevisions = (task) =>
  task.dependencies.map(({ id, revision: value }) => ({ id, revision: value }));

const reviewRoles = (risk, protectedChange) => {
  if (
    !risk ||
    protectedChange ||
    risk.kind === "sensitive" ||
    risk.verificationChanged ||
    risk.permissionsChanged ||
    risk.concurrentIntegration ||
    risk.recoveryChanged ||
    risk.authorityChanged ||
    risk.deploymentChanged
  ) {
    return [...sensitiveRoles];
  }

  if (
    risk.kind === "trivial_docs" &&
    !risk.behaviorChanged &&
    !risk.buildOrConfigChanged &&
    !risk.dependentCode
  ) {
    return [];
  }

  return ["general"];
};

const evaluateActions = ({ actions }, add) => {
  for (const action of actions) {
    if (prohibitedActions.includes(action)) {
      add("BLOCKED", `PROHIBITED_${action.toUpperCase()}`);
    }

    if (authorizationActions.includes(action)) {
      add("HUMAN_REVIEW", `AUTHORIZATION_${action.toUpperCase()}`);
    }
  }

  if (!actions.includes("local_integrate")) {
    add("BLOCKED", "LOCAL_INTEGRATION_NOT_REQUESTED");
  }
};

const evaluatePolicy = ({ policy, integration, risk }, add) => {
  if (policy && (policy.targetRef !== "refs/heads/main" || !policy.localOnly)) {
    add("BLOCKED", "PROHIBITED_POLICY_TARGET");
  }

  if (integration && integration.targetRef !== "refs/heads/main") {
    add("BLOCKED", "PROHIBITED_INTEGRATION_TARGET");
  }

  if (policy) {
    for (const paths of [
      policy.ownedPaths,
      policy.forbiddenPaths,
      policy.protectedPaths,
    ]) {
      if (paths.some((path) => !validPath(path)) || duplicate(paths)) {
        add("BLOCKED", "INVALID_POLICY_PATHS");
      }
    }

    if (duplicate(policy.checks.map(({ name }) => name))) {
      add("BLOCKED", "DUPLICATE_POLICY_CHECKS");
    }

    for (const name of [
      "verify",
      ...(risk?.buildOrConfigChanged ? ["verify:full"] : []),
    ]) {
      if (
        !policy.checks.some(
          (item) =>
            item.name === name &&
            same(item.command, [
              policy.verification.executables.bun,
              "run",
              name,
            ])
        )
      ) {
        add(
          "BLOCKED",
          `MISSING_REQUIRED_${name.toUpperCase().replace(":", "_")}`
        );
      }
    }
  }
};

const evaluatePaths = ({ policy, paths }, add) => {
  for (const path of paths) {
    if (!validPath(path)) {
      add("REWORK", "INVALID_DIFF_PATH");
    }

    if (
      policy &&
      (!policy.ownedPaths.includes(path) ||
        policy.forbiddenPaths.includes(path))
    ) {
      add("REWORK", "OWNERSHIP_VIOLATION");
    }
  }
};

const evaluateTask = ({ task }, add) => {
  if (task) {
    if (task.resources !== "ready") {
      add("BLOCKED", "RESOURCE_UNAVAILABLE");
    }

    if (task.dependencies.some((item) => item.status !== "ready")) {
      add("BLOCKED", "UNRESOLVED_DEPENDENCY");
    }

    if (
      duplicate(task.dependencies.map(({ id }) => id)) ||
      duplicate(task.authorIds)
    ) {
      add("BLOCKED", "DUPLICATE_TASK_IDENTITIES");
    }
  }
};

const evaluateCandidate = ({ candidate, task, policy }, add) => {
  if (candidate && task) {
    for (const [field, value] of Object.entries({
      attemptId: task.attemptId,
      dependencyRevisions: dependencyRevisions(task),
      specificationRevision: task.specificationRevision,
      taskId: task.id,
      taskRevision: task.revision,
    })) {
      if (!same(candidate[field], value)) {
        add("REWORK", `STALE_CANDIDATE_${field.toUpperCase()}`);
      }
    }
  }

  if (candidate && policy) {
    if (candidate.policyRevision !== policy.revision) {
      add("REWORK", "STALE_CANDIDATE_POLICY");
    }

    if (candidate.verifierCommit !== policy.verifierCommit) {
      add("REWORK", "STALE_CANDIDATE_VERIFIER");
    }
  }
};

const evaluateIntegration = ({ integration }, add) => {
  if (integration) {
    if (integration.currentBase !== integration.expectedBase) {
      add("REWORK", "BASE_MOVED");
    }

    if (
      duplicate(integration.commits.map((item) => item.commit)) ||
      !same(integration.commits.at(-1), {
        commit: integration.resultCommit,
        tree: integration.resultTree,
      })
    ) {
      add("BLOCKED", "INVALID_INTEGRATION_COMMITS");
    }
  }
};

const evaluateRisk = ({ risk, protectedChange }, add) => {
  if (risk) {
    if (risk.productDecision || !risk.reversible) {
      add("HUMAN_REVIEW", "MATERIAL_DECISION_REQUIRED");
    }

    if (
      protectedChange ||
      risk.behaviorChanged ||
      risk.dependentCode ||
      risk.authorityChanged ||
      risk.verificationChanged ||
      risk.permissionsChanged ||
      risk.deploymentChanged ||
      risk.concurrentIntegration ||
      risk.recoveryChanged ||
      risk.kind === "sensitive"
    ) {
      add("STACKED_REVIEW", "PROTECTED_OR_CHANGED_BEHAVIOR");
    }
  }
};

const compareBindings = (actual, expected, prefix, add) => {
  for (const [field, value] of Object.entries(expected)) {
    if (!same(actual[field], value)) {
      add("REWORK", `${prefix}_${field.toUpperCase()}`);
    }
  }
};

const evaluateVerification = (
  {
    verification,
    verificationBinding,
    policy,
    task,
    candidate,
    integration,
    paths,
    risk,
  },
  add
) => {
  if (!verification) {
    return;
  }

  const { provenance } = verification;
  compareBindings(
    provenance,
    {
      ...(policy && {
        ...policy.verification,
        controlCommit: policy.verifierCommit,
        toolchain: policy.toolchain,
        verifierCommit: policy.verifierCommit,
      }),
      ...(task && { attemptId: task.attemptId, taskId: task.id }),
      ...(candidate && {
        candidateBase: candidate.baseCommit,
        candidateCommit: candidate.commit,
        candidateTree: candidate.tree,
      }),
      ...(integration && {
        expectedBase: integration.expectedBase,
        resultCommit: integration.resultCommit,
        resultTree: integration.resultTree,
      }),
    },
    "STALE_PROVENANCE",
    add
  );

  if (
    !same(
      [...new Set(provenance.changedPaths)].toSorted(),
      [...new Set(paths)].toSorted()
    ) ||
    duplicate(provenance.changedPaths)
  ) {
    add("REWORK", "STALE_PROVENANCE_CHANGEDPATHS");
  }

  if (verificationBinding) {
    compareBindings(
      verificationBinding,
      {
        ...(policy && { policyRevision: policy.revision }),
        ...(task && {
          dependencyRevisions: dependencyRevisions(task),
          specificationRevision: task.specificationRevision,
          taskRevision: task.revision,
        }),
        ...(integration && {
          commits: integration.commits,
          mode: integration.mode,
        }),
        reportArtifact: verification.reportArtifact,
      },
      "STALE_VERIFICATION_BINDING",
      add
    );
  }

  if (integration?.mode === "independent" && integration.commits.length !== 1) {
    add("REWORK", "PARTIAL_COMMIT_VERIFICATION");
  }

  if (risk?.dependentCode && integration?.mode !== "atomic") {
    add("REWORK", "DEPENDENT_CODE_REQUIRES_ATOMIC_BATCH");
  }
};

const evaluateVerificationStatus = (verification, status, add) => {
  if (status === "infrastructure_failure") {
    add("BLOCKED", "VERIFICATION_INFRASTRUCTURE_FAILED");
  }

  if (status === "rejected") {
    add("BLOCKED", "VERIFICATION_REJECTED");
  }

  if (status === "check_failure") {
    add("REWORK", "ACCEPTANCE_FAILED");
  }

  if (!verification) {
    return;
  }

  const failedChecks = verification.checks.filter(
    (item) =>
      item.status !== "passed" ||
      item.cleanupError !== null ||
      item.exitCode !== 0 ||
      item.signal !== null ||
      item.timedOut
  );

  if (
    status === "passed" &&
    (verification.errors.length > 0 || failedChecks.length > 0)
  ) {
    add("BLOCKED", "INCONSISTENT_VERIFICATION_STATUS");
  }

  if (
    status === "check_failure" &&
    !failedChecks.some(
      (item) => item.status === "check_failure" && item.exitCode !== 0
    )
  ) {
    add("BLOCKED", "INCONSISTENT_VERIFICATION_STATUS");
  }

  if (
    failedChecks.some(
      (item) =>
        item.status === "infrastructure_failure" ||
        item.cleanupError !== null ||
        item.exitCode === null ||
        item.signal !== null ||
        item.timedOut
    )
  ) {
    add("BLOCKED", "VERIFICATION_INFRASTRUCTURE_FAILED");
  }
};

const validReceiptBindings = (value) => {
  if (!Predicate.isObject(value) || !Array.isArray(value.checks)) {
    return false;
  }

  const successful = {
    ...value,
    checks: value.checks.map((item) => ({ ...item, exitCode: 0 })),
  };

  return validateEvidence(successful, value).ok;
};

const normalizeReceipt = (verification, add) => {
  if (!verification) {
    return;
  }

  const raw = verification.receipt;

  const checked = Schema.decodeUnknownResult(Schema.Array(reportCheck), {
    onExcessProperty: "error",
  })(raw?.checks);

  if (Result.isFailure(checked) || !validReceiptBindings(raw)) {
    add("BLOCKED", "INVALID_RECEIPT");

    return;
  }

  const { provenance } = verification;
  compareBindings(
    raw,
    {
      artifacts: verification.artifacts,
      attemptId: provenance.attemptId,
      baseCommit: provenance.expectedBase,
      candidateCommit: provenance.candidateCommit,
      candidateTree: provenance.candidateTree,
      checks: verification.checks,
      taskId: provenance.taskId,
      toolchain: provenance.toolchain,
      verifierCommit: provenance.verifierCommit,
    },
    "B2_RECEIPT_MISMATCH",
    add
  );

  const policyArtifact = verification.artifacts.find(
    (item) => item.id === "policy"
  );

  if (policyArtifact?.sha256 !== provenance.policySha256) {
    add("BLOCKED", "MISSING_OR_MISMATCHED_POLICY_ARTIFACT");
  }

  return {
    ...raw,
    candidateCommit: provenance.resultCommit,
    candidateTree: provenance.resultTree,
    checks: verification.checks.map(
      ({ name, command: argv, logArtifactId, exitCode }) => ({
        command: argv,
        exitCode,
        logArtifactId,
        name,
      })
    ),
  };
};

const evaluateExpected = ({ expected, task, policy, integration }, add) => {
  if (expected) {
    const bindings = {
      ...(task && { attemptId: task.attemptId, taskId: task.id }),
      ...(policy && {
        toolchain: policy.toolchain,
        verifierCommit: policy.verifierCommit,
      }),
      ...(integration && {
        baseCommit: integration.expectedBase,
        candidateCommit: integration.resultCommit,
        candidateTree: integration.resultTree,
      }),
    };

    for (const [field, value] of Object.entries(bindings)) {
      if (!same(expected[field], value)) {
        add("REWORK", `STALE_EXPECTED_${field.toUpperCase()}`);
      }
    }

    if (
      policy &&
      !same(
        expected.checks.map(({ name, command: argv }) => ({
          command: argv,
          name,
        })),
        policy.checks
      )
    ) {
      add("REWORK", "CHECK_POLICY_MISMATCH");
    }
  }
};

const evaluateEvidenceCompleteness = ({ actual, expected, policy }, add) => {
  for (const evidence of [actual, expected]) {
    if (
      evidence &&
      policy?.checks.some(
        ({ name }) => !evidence.checks.some((item) => item.name === name)
      )
    ) {
      add("BLOCKED", "MISSING_REQUIRED_CHECK");
    }
  }
};

const evaluateReceipt = ({ actual, expected }, add) => {
  if (actual) {
    if (actual.checks.some((item) => item.exitCode !== 0)) {
      add("REWORK", "ACCEPTANCE_FAILED");
    }

    if (
      expected &&
      !validateEvidence(
        {
          ...actual,
          checks: actual.checks.map((item) => ({ ...item, exitCode: 0 })),
        },
        expected
      ).ok
    ) {
      add("REWORK", "RECEIPT_BINDING_MISMATCH");
    }
  }
};

const evaluateReviews = (
  { reviews, task, candidate, integration, policy, requiredReviewRoles },
  add
) => {
  const validReviews = [];
  const reviewerIds = new Set();

  for (const review of reviews) {
    let valid = true;

    if (
      reviewerIds.has(review.reviewerId) ||
      task?.authorIds.includes(review.reviewerId)
    ) {
      add("REWORK", "NONINDEPENDENT_REVIEW");
      valid = false;
    }

    reviewerIds.add(review.reviewerId);

    const bindings = {
      ...(candidate && {
        candidateCommit: candidate.commit,
        candidateTree: candidate.tree,
      }),
      ...(integration && {
        baseCommit: integration.expectedBase,
        resultCommit: integration.resultCommit,
        resultTree: integration.resultTree,
      }),
      ...(policy && {
        policyRevision: policy.revision,
        verifierCommit: policy.verifierCommit,
      }),
      ...(task && {
        attemptId: task.attemptId,
        dependencyRevisions: dependencyRevisions(task),
        specificationRevision: task.specificationRevision,
        taskId: task.id,
        taskRevision: task.revision,
      }),
    };

    if (
      Object.entries(bindings).some(
        ([field, value]) => !same(review[field], value)
      )
    ) {
      add("REWORK", "STALE_REVIEW");
      valid = false;
    }

    if (review.verdict === "changes_requested") {
      add("REWORK", "ACTIONABLE_REVIEW_FINDINGS");
    }

    if (valid) {
      validReviews.push(review);
    }
  }

  for (const role of requiredReviewRoles) {
    if (
      !validReviews.some((review) => role === "general" || review.role === role)
    ) {
      add("BLOCKED", `MISSING_REVIEW_${role.toUpperCase()}`);
    }
  }
};

const readVerification = (context, decode, add) => {
  const verification = decode(
    verificationSchema,
    context?.verification,
    "VERIFICATION"
  );

  const status = decode(
    verificationStatus,
    context?.verification?.status,
    "VERIFICATION_STATUS"
  );

  const verificationBinding = decode(
    verificationBindingSchema,
    context?.verificationBinding,
    "VERIFICATION_BINDING"
  );

  const expected = validReceiptBindings(context?.expectedEvidence)
    ? context.expectedEvidence
    : undefined;

  if (!expected) {
    add("BLOCKED", "INVALID_EXPECTED_EVIDENCE");
  }

  evaluateVerificationStatus(verification, status, add);
  const actual = normalizeReceipt(verification, add);

  return { actual, expected, verification, verificationBinding };
};

export const decideIntegration = (trustedContext, modelRecommendation) => {
  const reasons = new Map();
  const add = (lane, code) => reasons.set(code, lane);

  const decode = (schema, input, label) => {
    const result = Schema.decodeUnknownResult(schema, {
      errors: "all",
      onExcessProperty: "error",
    })(input);

    if (Result.isFailure(result)) {
      add("BLOCKED", `INVALID_${label}`);

      return;
    }

    return result.success;
  };

  const data = snapshot(trustedContext);

  const context =
    decode(
      Schema.Struct({
        actions: Schema.Unknown,
        candidate: Schema.Unknown,
        diff: Schema.Unknown,
        expectedEvidence: Schema.Unknown,
        integration: Schema.Unknown,
        policy: Schema.Unknown,
        reviews: Schema.Unknown,
        risk: Schema.Unknown,
        task: Schema.Unknown,
        verification: Schema.Unknown,
        verificationBinding: Schema.Unknown,
      }),
      data,
      "CONTEXT"
    ) ?? data;

  const policy = decode(policySchema, context?.policy, "POLICY");
  const task = decode(taskSchema, context?.task, "TASK");
  const candidate = decode(candidateSchema, context?.candidate, "CANDIDATE");

  const integration = decode(
    integrationSchema,
    context?.integration,
    "INTEGRATION"
  );

  const risk = decode(riskSchema, context?.risk, "RISK");

  const { verification, verificationBinding, expected, actual } =
    readVerification(context, decode, add);

  const decodeEntries = (schema, input, label, nonempty = false) => {
    const entries = decode(
      nonempty
        ? Schema.NonEmptyArray(Schema.Unknown)
        : Schema.Array(Schema.Unknown),
      input,
      label
    );

    return (entries ?? []).flatMap((entry, index) => {
      const parsed = decode(schema, entry, `${label}_${index}`);

      return parsed === undefined ? [] : [parsed];
    });
  };

  const changes = decodeEntries(diffEntry, context?.diff, "DIFF", true);

  const actions = decodeEntries(
    actionSchema,
    context?.actions,
    "ACTIONS",
    true
  );

  const reviews = decodeEntries(reviewSchema, context?.reviews, "REVIEWS");

  const paths = changes.flatMap((change) =>
    change.status === "renamed"
      ? [change.previousPath, change.path]
      : [change.path]
  );

  const protectedChange = Boolean(
    policy && paths.some((path) => policy.protectedPaths.includes(path))
  );

  const requiredReviewRoles = reviewRoles(risk, protectedChange);

  const state = {
    actions,
    actual,
    candidate,
    changes,
    expected,
    integration,
    paths,
    policy,
    protectedChange,
    requiredReviewRoles,
    reviews,
    risk,
    task,
    verification,
    verificationBinding,
  };

  evaluateActions(state, add);
  evaluatePolicy(state, add);
  evaluatePaths(state, add);
  evaluateTask(state, add);
  evaluateCandidate(state, add);
  evaluateIntegration(state, add);
  evaluateRisk(state, add);
  evaluateVerification(state, add);
  evaluateExpected(state, add);
  evaluateEvidenceCompleteness(state, add);
  evaluateReceipt(state, add);
  evaluateReviews(state, add);

  if (modelRecommendation !== undefined) {
    if (!lanes.includes(modelRecommendation)) {
      add("BLOCKED", "UNKNOWN_MODEL_RECOMMENDATION");
    } else if (modelRecommendation !== "FAST_INTEGRATE") {
      add(modelRecommendation, `MODEL_${modelRecommendation}`);
    }
  }

  const ordered = [...reasons].toSorted(
    ([left, leftLane], [right, rightLane]) =>
      lanes.indexOf(leftLane) - lanes.indexOf(rightLane) ||
      (left < right ? -1 : Number(left > right))
  );

  const lane = ordered[0]?.[1] ?? "FAST_INTEGRATE";

  return {
    lane,
    readyForIntegration: lane === "FAST_INTEGRATE" || lane === "STACKED_REVIEW",
    reasonCodes: ordered.map(([code]) => code),
    requiredReviewRoles,
  };
};
