import assert from "node:assert/strict";
import { test } from "node:test";

import { Predicate } from "effect";

import { decideIntegration } from "./orchestrator-integrate.mjs";

const hash = (digit) => digit.repeat(40);
const roles = ["correctness", "security", "complexity"];

const context = () => {
  const policy = {
    checks: [{ command: ["/tools/bun", "run", "verify"], name: "verify" }],
    forbiddenPaths: ["src/forbidden.mjs"],
    localOnly: true,
    ownedPaths: ["src/example.mjs", "src/renamed.mjs", "docs/example.md"],
    protectedPaths: ["scripts/gate.mjs"],
    revision: hash("1"),
    targetRef: "refs/heads/main",
    toolchain: {
      arch: "arm64",
      bun: "1.4.3",
      node: "v24.15.0",
      platform: "darwin",
    },
    verification: {
      dependencyLinks: [],
      executables: {
        bun: "/tools/bun",
        git: "/tools/git",
        node: "/tools/node",
      },
      policyPath: "orchestration/policy.json",
      policySha256: "1".repeat(64),
      verifierSha256: "2".repeat(64),
    },
    verifierCommit: hash("2"),
    version: 1,
  };

  const task = {
    attemptId: "attempt-1",
    authorIds: ["worker-1"],
    dependencies: [
      {
        id: "contract-B1b",
        kind: "contract",
        revision: hash("5"),
        status: "ready",
      },
    ],
    id: "task-1",
    resources: "ready",
    revision: hash("3"),
    specificationRevision: hash("4"),
  };

  const dependencyRevisions = [{ id: "contract-B1b", revision: hash("5") }];

  const candidate = {
    attemptId: task.attemptId,
    baseCommit: hash("c"),
    commit: hash("a"),
    dependencyRevisions,
    policyRevision: policy.revision,
    specificationRevision: task.specificationRevision,
    taskId: task.id,
    taskRevision: task.revision,
    tree: hash("b"),
    verifierCommit: policy.verifierCommit,
  };

  const integration = {
    commits: [{ commit: hash("d"), tree: hash("e") }],
    currentBase: candidate.baseCommit,
    expectedBase: candidate.baseCommit,
    mode: "independent",
    resultCommit: hash("d"),
    resultTree: hash("e"),
    targetRef: policy.targetRef,
  };

  const expectedEvidence = {
    artifacts: [
      {
        id: "policy",
        path: "/artifacts/run/policy.json",
        sha256: policy.verification.policySha256,
      },
      {
        id: "log-verify",
        path: "/artifacts/run/verify.json",
        sha256: "f".repeat(64),
      },
    ],
    attemptId: task.attemptId,
    baseCommit: integration.expectedBase,
    candidateCommit: integration.resultCommit,
    candidateTree: integration.resultTree,
    checks: policy.checks.map((item) => ({
      ...item,
      logArtifactId: `log-${item.name}`,
    })),
    taskId: task.id,
    toolchain: policy.toolchain,
    verifierCommit: policy.verifierCommit,
  };

  const checks = expectedEvidence.checks.map((item) => ({
    ...item,
    cleanupError: null,
    exitCode: 0,
    signal: null,
    status: "passed",
    timedOut: false,
  }));

  const receipt = {
    ...expectedEvidence,
    candidateCommit: candidate.commit,
    candidateTree: candidate.tree,
    checks,
  };

  const diff = [{ path: "src/example.mjs", status: "added" }];

  const verification = {
    artifacts: structuredClone(expectedEvidence.artifacts),
    checks: structuredClone(checks),
    errors: [],
    provenance: {
      ...policy.verification,
      attemptId: task.attemptId,
      candidateBase: candidate.baseCommit,
      candidateCommit: candidate.commit,
      candidateTree: candidate.tree,
      changedPaths: ["src/example.mjs"],
      controlCommit: policy.verifierCommit,
      expectedBase: integration.expectedBase,
      isolation: "local-checkout-only",
      resultCommit: integration.resultCommit,
      resultTree: integration.resultTree,
      taskId: task.id,
      toolchain: policy.toolchain,
      verifierCommit: policy.verifierCommit,
    },
    receipt,
    reportArtifact: {
      path: "/artifacts/run/report.json",
      sha256: "3".repeat(64),
    },
    status: "passed",
    version: 1,
  };

  const verificationBinding = {
    commits: integration.commits,
    dependencyRevisions,
    mode: integration.mode,
    policyRevision: policy.revision,
    reportArtifact: verification.reportArtifact,
    specificationRevision: task.specificationRevision,
    taskRevision: task.revision,
  };

  const review = {
    attemptId: task.attemptId,
    baseCommit: integration.expectedBase,
    candidateCommit: candidate.commit,
    candidateTree: candidate.tree,
    dependencyRevisions,
    optionalSuggestions: [],
    policyRevision: policy.revision,
    resultCommit: integration.resultCommit,
    resultTree: integration.resultTree,
    reviewerId: "reviewer-1",
    role: "general",
    specificationRevision: task.specificationRevision,
    taskId: task.id,
    taskRevision: task.revision,
    verdict: "approved",
    verifierCommit: policy.verifierCommit,
  };

  const risk = {
    authorityChanged: false,
    behaviorChanged: false,
    buildOrConfigChanged: false,
    concurrentIntegration: false,
    dependentCode: false,
    deploymentChanged: false,
    kind: "ordinary",
    permissionsChanged: false,
    productDecision: false,
    recoveryChanged: false,
    reversible: true,
    verificationChanged: false,
  };

  return Object.fromEntries(
    Object.entries({
      actions: ["local_integrate"],
      candidate,
      diff,
      expectedEvidence,
      integration,
      policy,
      reviews: [review],
      risk,
      task,
      verification,
      verificationBinding,
    }).map(([key, value]) => [key, structuredClone(value)])
  );
};

const diffPaths = (diff) => [
  ...new Set(
    diff.flatMap((entry) =>
      entry.status === "renamed"
        ? [entry.path, entry.previousPath]
        : [entry.path]
    )
  ),
];

const withReviews = (data) => {
  data.reviews = roles.map((role) => ({
    ...data.reviews[0],
    reviewerId: `reviewer-${role}`,
    role,
  }));

  return data;
};

const atPath = (value, path) => {
  let item = value;

  for (const key of path) {
    item = item[key];
  }

  return item;
};

const setAt = (value, path, replacement) => {
  const parent = atPath(value, path.slice(0, -1));
  parent[path.at(-1)] = replacement;
};

const assertLane = (data, lane, code, recommendation) => {
  const result = decideIntegration(data, recommendation);
  assert.equal(result.lane, lane, JSON.stringify(result));
  assert.equal(
    result.readyForIntegration,
    ["FAST_INTEGRATE", "STACKED_REVIEW"].includes(lane)
  );

  if (code) {
    assert.ok(result.reasonCodes.includes(code), JSON.stringify(result));
  }

  return result;
};

test("complete ordinary evidence is eligible for local fast integration", () => {
  assert.deepEqual(decideIntegration(context()), {
    lane: "FAST_INTEGRATE",
    readyForIntegration: true,
    reasonCodes: [],
    requiredReviewRoles: ["general"],
  });
});

test("B2 report preserves the original candidate base after result rebasing", () => {
  const data = context();
  data.candidate.baseCommit = hash("8");
  data.verification.provenance.candidateBase = data.candidate.baseCommit;
  assert.notEqual(
    data.verification.provenance.candidateBase,
    data.integration.expectedBase
  );
  assertLane(data, "FAST_INTEGRATE");
  data.verification.provenance.candidateBase = hash("9");
  assertLane(data, "REWORK", "STALE_PROVENANCE_CANDIDATEBASE");
});

test("B2 cleanup failures remain blocked even when exit code and status claim success", () => {
  for (const cleanupError of [
    "Verification process group survived cleanup",
    "",
  ]) {
    for (const status of [
      "passed",
      "check_failure",
      "infrastructure_failure",
    ]) {
      const data = context();
      data.verification.status = status;
      data.verification.checks[0].cleanupError = cleanupError;
      data.verification.receipt.checks = structuredClone(
        data.verification.checks
      );
      assertLane(data, "BLOCKED", "VERIFICATION_INFRASTRUCTURE_FAILED");
    }
  }
});

test("changed behavior is stacked and still requires its ordinary independent review", () => {
  const data = context();
  data.risk.behaviorChanged = true;
  assertLane(data, "STACKED_REVIEW", "PROTECTED_OR_CHANGED_BEHAVIOR");
  data.reviews = [];
  assertLane(data, "BLOCKED", "MISSING_REVIEW_GENERAL");
});

test("sensitive boundaries require three distinct roles on the identical candidate and result", () => {
  for (const field of [
    "verificationChanged",
    "permissionsChanged",
    "authorityChanged",
    "concurrentIntegration",
    "recoveryChanged",
    "deploymentChanged",
  ]) {
    const data = withReviews(context());
    data.risk[field] = true;
    const result = assertLane(data, "STACKED_REVIEW");
    assert.deepEqual(result.requiredReviewRoles, roles);

    for (const role of roles) {
      assertLane(
        { ...data, reviews: data.reviews.filter((item) => item.role !== role) },
        "BLOCKED",
        `MISSING_REVIEW_${role.toUpperCase()}`
      );
    }
  }
});

test("trivial docs alone can omit reviews and optional suggestions never veto approval", () => {
  const data = context();
  data.risk.kind = "trivial_docs";
  data.diff = [{ path: "docs/example.md", status: "modified" }];
  data.verification.provenance.changedPaths = diffPaths(data.diff);
  data.reviews = [];
  assert.deepEqual(assertLane(data, "FAST_INTEGRATE").requiredReviewRoles, []);
  data.risk.authorityChanged = true;
  assertLane(data, "BLOCKED", "MISSING_REVIEW_SECURITY");
  const ordinary = context();
  ordinary.reviews[0].optionalSuggestions = ["Consider a shorter name later"];
  assertLane(ordinary, "FAST_INTEGRATE");
  delete ordinary.reviews[0].optionalSuggestions;
  assertLane(ordinary, "FAST_INTEGRATE");
});

const requiredPaths = (value, prefix = []) =>
  Object.entries(value).flatMap(([key, child]) => {
    if (key === "optionalSuggestions") {
      return [];
    }

    const path = [...prefix, key];

    return [
      path,
      ...(Predicate.isObjectOrArray(child) ? requiredPaths(child, path) : []),
    ];
  });

test("each missing required field or container fails closed, including provenance despite a valid receipt", () => {
  for (const path of requiredPaths(context())) {
    const data = context();
    const parent = atPath(data, path.slice(0, -1));
    Reflect.deleteProperty(parent, path.at(-1));
    const result = decideIntegration(data);
    assert.equal(result.readyForIntegration, false, path.join("."));
    assert.equal(
      result.lane,
      "BLOCKED",
      `${path.join(".")}: ${JSON.stringify(result)}`
    );
  }
});

test("every required scalar rejects an unknown value", () => {
  for (const path of requiredPaths(context())) {
    const data = context();
    const value = atPath(data, path);

    if (Predicate.isObjectOrArray(value)) {
      continue;
    }

    setAt(data, path, value === null ? "unknown" : null);

    const receiptFailure =
      path.join(".") === "verification.receipt.checks.0.cleanupError" ||
      path.join(".") === "verification.receipt.checks.0.exitCode" ||
      path.join(".") === "verification.receipt.checks.0.signal";

    assertLane(
      data,
      receiptFailure ? "REWORK" : "BLOCKED",
      receiptFailure ? "B2_RECEIPT_MISMATCH_CHECKS" : undefined
    );
  }
});

test("unknown classifications, actions, model lanes and contract versions fail closed", () => {
  for (const path of [
    ["risk", "kind"],
    ["integration", "mode"],
    ["verificationBinding", "mode"],
    ["verification", "status"],
    ["verification", "provenance", "isolation"],
    ["verification", "checks", 0, "status"],
    ["reviews", 0, "role"],
    ["reviews", 0, "verdict"],
    ["task", "dependencies", 0, "kind"],
    ["task", "dependencies", 0, "status"],
    ["task", "resources"],
    ["diff", 0, "status"],
    ["actions", 0],
    ["policy", "version"],
    ["verification", "version"],
  ]) {
    const data = context();
    setAt(data, path, "unknown");
    assertLane(data, "BLOCKED");
  }

  assertLane(context(), "BLOCKED", "UNKNOWN_MODEL_RECOMMENDATION", "accept");
});

test("each prohibited operation is blocked and each authority expansion requires a human decision", () => {
  for (const action of [
    "push",
    "deploy",
    "force_update",
    "rewrite_history",
    "alter_branch_protection",
    "delete_shared_infrastructure",
  ]) {
    const data = context();
    data.actions.push(action);
    assertLane(data, "BLOCKED", `PROHIBITED_${action.toUpperCase()}`);
  }

  for (const action of [
    "add_dependency",
    "destructive_migration",
    "credential_expansion",
    "permission_expansion",
    "production_write",
  ]) {
    const data = context();
    data.actions.push(action);
    assertLane(data, "HUMAN_REVIEW", `AUTHORIZATION_${action.toUpperCase()}`);
  }
});

test("only the fixed local main target is eligible", () => {
  for (const [path, value] of [
    [["policy", "targetRef"], "refs/heads/other"],
    [["policy", "localOnly"], false],
    [["integration", "targetRef"], "refs/remotes/origin/main"],
  ]) {
    const data = context();
    setAt(data, path, value);
    assertLane(data, "BLOCKED");
  }
});

test("every candidate, report and coordinator binding identity is current", () => {
  for (const [section, fields] of [
    [
      ["candidate"],
      [
        "taskId",
        "attemptId",
        "taskRevision",
        "specificationRevision",
        "policyRevision",
        "verifierCommit",
        "baseCommit",
      ],
    ],
    [
      ["verification", "provenance"],
      [
        "taskId",
        "attemptId",
        "controlCommit",
        "verifierCommit",
        "candidateCommit",
        "candidateTree",
        "candidateBase",
        "expectedBase",
        "resultCommit",
        "resultTree",
      ],
    ],
    [
      ["verificationBinding"],
      ["taskRevision", "specificationRevision", "policyRevision"],
    ],
    [
      ["expectedEvidence"],
      [
        "taskId",
        "attemptId",
        "candidateCommit",
        "candidateTree",
        "baseCommit",
        "verifierCommit",
      ],
    ],
    [
      ["verification", "receipt"],
      [
        "taskId",
        "attemptId",
        "candidateCommit",
        "candidateTree",
        "baseCommit",
        "verifierCommit",
      ],
    ],
  ]) {
    for (const field of fields) {
      const data = context();
      setAt(
        data,
        [...section, field],
        field.endsWith("Id") ? "stale" : hash("9")
      );
      assertLane(data, "REWORK");
    }
  }

  for (const section of ["candidate", "verificationBinding"]) {
    const data = context();
    data[section].dependencyRevisions[0].revision = hash("9");
    assertLane(data, "REWORK");
  }
});

test("unresolved dependencies and resource reservations block; missing dependency bindings are stale", () => {
  const data = context();
  data.task.dependencies[0].status = "blocked";
  data.task.resources = "blocked";
  const result = assertLane(data, "BLOCKED");
  assert.ok(result.reasonCodes.includes("UNRESOLVED_DEPENDENCY"));
  assert.ok(result.reasonCodes.includes("RESOURCE_UNAVAILABLE"));
  const stale = context();
  stale.candidate.dependencyRevisions = [];
  assertLane(stale, "REWORK", "STALE_CANDIDATE_DEPENDENCYREVISIONS");
});

test("changed argv, toolchain, artifact bytes or log bindings invalidate evidence", () => {
  for (const section of [["expectedEvidence"], ["verification", "receipt"]]) {
    for (const [path, value] of [
      [["checks", 0, "command", 1], "--skip"],
      [["checks", 0, "logArtifactId"], "policy"],
      [["artifacts", 0, "path"], "logs/other.txt"],
      [["artifacts", 0, "sha256"], "9".repeat(64)],
      ...["node", "bun", "platform", "arch"].map((key) => [
        ["toolchain", key],
        "other",
      ]),
    ]) {
      const data = context();
      setAt(data, [...section, ...path], value);
      assertLane(data, "REWORK");
    }
  }
});

test("matching worker receipts cannot replace coordinator commands or B2 execution provenance", () => {
  const data = context();
  data.expectedEvidence.checks[0].command = ["true"];
  data.verification.receipt.checks[0].command = ["true"];
  data.verification.checks[0].command = ["true"];
  assertLane(data, "REWORK", "CHECK_POLICY_MISMATCH");
  const untrusted = context();
  delete untrusted.verification;
  assertLane(untrusted, "BLOCKED", "INVALID_VERIFICATION");
});

test("B1b rejects missing checks, missing logs and duplicate artifact identities", () => {
  const check = context();
  check.verification.receipt.checks = [];
  assertLane(check, "BLOCKED", "INVALID_RECEIPT");
  const log = context();
  log.verification.receipt.artifacts.pop();
  assertLane(log, "BLOCKED", "INVALID_RECEIPT");
  const duplicate = context();
  duplicate.verification.receipt.artifacts.push(
    structuredClone(duplicate.verification.receipt.artifacts[0])
  );
  assertLane(duplicate, "BLOCKED", "INVALID_RECEIPT");
});

test("verify is mandatory and build/config changes also require the approved absolute Bun argv", () => {
  const missing = context();
  missing.policy.checks[0].name = "skip";
  assertLane(missing, "BLOCKED", "MISSING_REQUIRED_VERIFY");
  const altered = context();
  altered.policy.checks[0].command.push("--filter=nothing");
  assertLane(altered, "BLOCKED", "MISSING_REQUIRED_VERIFY");
  const data = context();
  data.risk.buildOrConfigChanged = true;
  assertLane(data, "BLOCKED", "MISSING_REQUIRED_VERIFY_FULL");
  data.policy.checks.push({
    command: ["/tools/bun", "run", "verify:full"],
    name: "verify:full",
  });
  const logged = { ...data.policy.checks.at(-1), logArtifactId: "full-log" };

  const artifact = {
    id: "full-log",
    path: "/artifacts/run/full.txt",
    sha256: "1".repeat(64),
  };

  const completed = {
    ...logged,
    cleanupError: null,
    exitCode: 0,
    signal: null,
    status: "passed",
    timedOut: false,
  };

  data.expectedEvidence.checks.push(logged);
  data.verification.receipt.checks.push(structuredClone(completed));
  data.verification.checks.push(completed);
  data.expectedEvidence.artifacts.push(artifact);
  data.verification.receipt.artifacts.push(structuredClone(artifact));
  data.verification.artifacts.push(structuredClone(artifact));
  assertLane(data, "FAST_INTEGRATE");
});

test("actual B2 failure statuses remain distinct and can never normalize to success", () => {
  const failed = context();
  failed.verification.checks[0].exitCode = 1;
  failed.verification.checks[0].status = "check_failure";
  failed.verification.status = "check_failure";
  failed.verification.receipt.checks = structuredClone(
    failed.verification.checks
  );
  assertLane(failed, "REWORK", "ACCEPTANCE_FAILED");
  failed.verification.status = "infrastructure_failure";
  assertLane(failed, "BLOCKED", "VERIFICATION_INFRASTRUCTURE_FAILED");
  failed.verification.status = "passed";
  assertLane(failed, "BLOCKED", "INCONSISTENT_VERIFICATION_STATUS");
  const rejected = context();
  rejected.verification = {
    errors: ["Protected verification inputs changed"],
    status: "rejected",
  };
  assertLane(rejected, "BLOCKED", "VERIFICATION_REJECTED");
  rejected.verification = {
    errors: ["Contaminated verification checkout"],
    status: "infrastructure_failure",
  };
  assertLane(rejected, "BLOCKED", "VERIFICATION_INFRASTRUCTURE_FAILED");
});

test("owned additions, modifications, deletions and both rename endpoints are checked exactly", () => {
  for (const status of ["added", "modified", "deleted", "renamed"]) {
    const data = context();
    data.diff = [
      {
        path: "src/example.mjs",
        status,
        ...(status === "renamed" && { previousPath: "src/renamed.mjs" }),
      },
    ];
    data.verification.provenance.changedPaths = diffPaths(data.diff);
    assertLane(data, "FAST_INTEGRATE");

    for (const key of status === "renamed"
      ? ["path", "previousPath"]
      : ["path"]) {
      const invalid = structuredClone(data);
      invalid.diff[0][key] = "src/forbidden.mjs";
      invalid.policy.ownedPaths.push("src/forbidden.mjs");
      invalid.verification.provenance.changedPaths = diffPaths(invalid.diff);
      assertLane(invalid, "REWORK", "OWNERSHIP_VIOLATION");
    }
  }
});

test("path traversal, absolutes, Windows paths and prefix collisions cannot expand ownership", () => {
  for (const path of [
    "/src/example.mjs",
    "../src/example.mjs",
    "scripts/../src/example.mjs",
    "scripts//example.mjs",
    "./src/example.mjs",
    "C:/src/example.mjs",
    "scripts\\example.mjs",
    "src/example.mjs/",
    "src/example.mjs\u0000",
  ]) {
    const data = context();
    data.diff[0].path = path;
    data.verification.provenance.changedPaths = diffPaths(data.diff);
    assertLane(data, "REWORK", "INVALID_DIFF_PATH");
    data.policy.ownedPaths.push(path);
    assertLane(data, "BLOCKED", "INVALID_POLICY_PATHS");
  }

  for (const path of [
    "src/example.mjs-extra",
    "src/example.mjs/child",
    "scripts-neighbor/example.mjs",
  ]) {
    const data = context();
    data.diff[0].path = path;
    data.verification.provenance.changedPaths = diffPaths(data.diff);
    assertLane(data, "REWORK", "OWNERSHIP_VIOLATION");
  }
});

test("protected paths escalate the review requirement even if the risk label says ordinary", () => {
  const data = withReviews(context());
  data.policy.protectedPaths.push("src/example.mjs");
  assert.deepEqual(
    assertLane(data, "STACKED_REVIEW").requiredReviewRoles,
    roles
  );
});

test("self, duplicate and stale reviews cannot satisfy independent review requirements", () => {
  const self = context();
  self.reviews[0].reviewerId = "worker-1";
  assertLane(self, "BLOCKED", "NONINDEPENDENT_REVIEW");
  const duplicate = withReviews(context());
  duplicate.risk.permissionsChanged = true;
  duplicate.reviews[1].reviewerId = duplicate.reviews[0].reviewerId;
  assertLane(duplicate, "BLOCKED", "NONINDEPENDENT_REVIEW");

  for (const field of [
    "candidateCommit",
    "candidateTree",
    "resultCommit",
    "resultTree",
    "baseCommit",
    "policyRevision",
    "verifierCommit",
    "taskRevision",
    "specificationRevision",
    "attemptId",
    "taskId",
  ]) {
    const data = context();
    data.reviews[0][field] = field.endsWith("Id") ? "other" : hash("9");
    assertLane(data, "BLOCKED", "STALE_REVIEW");
  }
});

test("actionable review findings require rework while retaining all independent review roles", () => {
  const data = context();
  data.reviews[0].verdict = "changes_requested";
  assertLane(data, "REWORK", "ACTIONABLE_REVIEW_FINDINGS");
});

test("B2 contamination failure, moved bases and unverified independent commits prevent eligibility", () => {
  const dirty = context();
  dirty.verification.status = "infrastructure_failure";
  dirty.verification.errors = ["Contaminated verification checkout"];
  assertLane(dirty, "BLOCKED", "VERIFICATION_INFRASTRUCTURE_FAILED");
  const data = context();
  data.integration.currentBase = hash("8");
  assertLane(data, "REWORK", "BASE_MOVED");
  data.integration.commits.unshift({ commit: hash("6"), tree: hash("7") });
  data.verificationBinding.commits = structuredClone(data.integration.commits);
  assertLane(data, "REWORK", "PARTIAL_COMMIT_VERIFICATION");
});

test("an atomic dependent batch binds the invocation scope and actual tested result tree", () => {
  const data = context();
  data.risk.dependentCode = true;
  assertLane(data, "REWORK", "DEPENDENT_CODE_REQUIRES_ATOMIC_BATCH");
  data.integration.mode = "atomic";
  data.integration.commits.unshift({ commit: hash("6"), tree: hash("7") });
  data.verificationBinding.mode = "atomic";
  data.verificationBinding.commits = structuredClone(data.integration.commits);
  assertLane(data, "STACKED_REVIEW");
  data.verificationBinding.commits.shift();
  assertLane(data, "REWORK", "STALE_VERIFICATION_BINDING_COMMITS");
  data.integration.commits[1].tree = hash("8");
  assertLane(data, "BLOCKED", "INVALID_INTEGRATION_COMMITS");
});

test("model advice can escalate but never reduce a deterministic lane or review requirement", () => {
  const sensitive = withReviews(context());
  sensitive.risk.permissionsChanged = true;
  assert.deepEqual(
    assertLane(sensitive, "STACKED_REVIEW", undefined, "FAST_INTEGRATE")
      .requiredReviewRoles,
    roles
  );

  for (const lane of ["BLOCKED", "HUMAN_REVIEW", "REWORK", "STACKED_REVIEW"]) {
    assertLane(context(), lane, `MODEL_${lane}`, lane);
  }

  const blocked = context();
  blocked.actions.push("push");

  for (const lane of [
    "FAST_INTEGRATE",
    "STACKED_REVIEW",
    "REWORK",
    "HUMAN_REVIEW",
  ]) {
    assertLane(blocked, "BLOCKED", "PROHIBITED_PUSH", lane);
  }
});

test("simultaneous failures retain stable ordered reasons with blocked then human then rework precedence", () => {
  const data = context();
  data.actions.push("push", "add_dependency");
  data.integration.currentBase = hash("8");
  data.risk.behaviorChanged = true;
  assert.deepEqual(assertLane(data, "BLOCKED").reasonCodes, [
    "PROHIBITED_PUSH",
    "AUTHORIZATION_ADD_DEPENDENCY",
    "BASE_MOVED",
    "PROTECTED_OR_CHANGED_BEHAVIOR",
  ]);
  data.actions = ["local_integrate", "add_dependency"];
  assertLane(data, "HUMAN_REVIEW");
  data.actions = ["local_integrate"];
  assertLane(data, "REWORK");
  delete data.verification.receipt;
  data.actions.push("push");
  assertLane(data, "BLOCKED", "PROHIBITED_PUSH");
});

const deepFreeze = (value) => {
  if (Predicate.isObjectOrArray(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }

    Object.freeze(value);
  }

  return value;
};

test("frozen inputs are repeatable and unchanged; output mutation cannot affect later decisions", () => {
  const data = deepFreeze(context());
  const before = structuredClone(data);
  const first = decideIntegration(data);
  assert.deepEqual(decideIntegration(data), first);
  first.requiredReviewRoles.push("security");
  first.reasonCodes.push("invented");
  assert.deepEqual(decideIntegration(data), decideIntegration(before));
  assert.deepEqual(data, before);
});

const trap = () => assert.fail("input behavior executed");
const callable = () => {};

test("getters, proxies, sparse arrays, inherited objects and cycles fail without invoking input behavior", () => {
  for (const value of [
    null,
    undefined,
    [],
    "context",
    new Proxy({}, { get: trap, getPrototypeOf: trap, ownKeys: trap }),
    Object.create(context()),
  ]) {
    assertLane(value, "BLOCKED");
  }

  const data = context();
  Object.defineProperty(data.policy, "revision", { get: trap });
  assertLane(data, "BLOCKED");
  const cycle = context();
  cycle.verification.receipt = cycle;
  assertLane(cycle, "BLOCKED");
  const sparse = context();
  sparse.reviews = Array.from({ length: 1 });
  assertLane(sparse, "BLOCKED");
  const arrayGetter = context();
  Object.defineProperty(arrayGetter.actions, "0", { get: trap });
  assertLane(arrayGetter, "BLOCKED");

  Object.defineProperty(callable, "policy", { get: trap });
  assertLane(callable, "BLOCKED");
});
