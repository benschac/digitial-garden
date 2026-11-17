# Graphite stacks and parallel Gas City work

Status: Proposed workflow. No branches or PRs created.

## Observed context

The Graphite MCP was consulted through `learn_gt`. A read-only `gt log short --no-interactive` in the owning personal-site repository showed only `main`. This does not verify remote authentication, publication permissions, or Gas City integration.

Graphite manages a parent branch for each diff. The feature's task graph can have multiple prerequisites; a Graphite branch does not acquire those prerequisites simply because tickets link to them.

## Prerequisites that land first

Use the [early landing lane](landing-first.md) before building a long feature stack.

PRE-01 workflow docs and PRE-02 reference fixtures are independent sibling PRs against trunk. PRE-03 canvas qualification/addition is a separate sibling after its choice is confirmed. There is no artificial stack dependency between those three.

AW-01 can stack on the checked PRE-03 branch while it awaits landing. If PRE-03 is skipped because no package is needed, AW-01 starts from checked trunk. Once PRE-03 lands, restack the feature branch onto updated trunk.

Only the coordinator changes manifests/lockfiles and Graphite metadata. Documentation and fixture work can proceed in parallel in separate worktrees.

No merge is performed by this plan. Independently landable means the diff can satisfy review and checks without the full feature, not that those gates are waived.

## Proposed review structure

Use one small PR per implementation ticket, with `codex/asset-<number>-<name>` branches. AW-13 is a verification gate, not a compulsory empty PR.

A deterministic review order is:

```text
main
  01 Projects
    02 References
      03 Style library
        04 Composition submission
          05 Run recovery
            06 Output selection
              07 Apply styles
                08 Approval
                  09 Layer generation
                    10 Layer editing
                      11 Motion preview
                        12 Export
```

This is an optional final linear review order, not a requirement to implement serially. Its incidental ancestry does not add behavior dependencies to tickets. No worker must wait for unrelated work merely to begin its isolated implementation.

During development, independent branches may be siblings:

- AW-03 and AW-04 can start from the checked AW-02 revision.
- AW-05 and AW-06 can start from the checked AW-04 revision.
- AW-07 requires both AW-03 and AW-04 in its base.
- AW-11 and AW-12 can start from the checked AW-10 revision.

A shorter stack can be reviewed and landed before later work exists, but landing requires separate authorization. The plan does not require accumulating all twelve open PRs.

## Joining parallel work

The coordinator manages joins explicitly:

1. Record the checked commits for every prerequisite. Completed work alone is insufficient if its verification is still pending.
2. Serialize the completed prerequisite branches into a single parent chain with Graphite move/restack operations, or use trunk after those prerequisites have landed with authorization.
3. Inspect each PR's diff against its immediate parent. It must contain only that ticket's change, with no duplicate prerequisite patch.
4. Run affected checks on the newly combined base.
5. Release the dependent ticket only after every required change is present in the checked base.

For example, AW-03 and AW-04 can be authored independently. Before AW-07 starts, the coordinator can place AW-04 above AW-03, restack AW-04's existing children, and verify the combined base. AW-07 then uses a parent chain containing both prerequisites.

AW-08 joins AW-06 and AW-07. AW-09 joins AW-05 and AW-08. AW-13 verifies a revision containing both AW-11 and AW-12. The same rule applies at each join.

If a downstream worker is already active, do not rewrite its checked-out base in place. Finish or checkpoint its patch, record its old base, then move it to the new checked base under coordinator control.

Do not cherry-pick prerequisite commits into every child branch to manufacture multiple-parent ancestry. That duplicates changes and damages review boundaries.

## Worktree and metadata ownership

Parallel workers use isolated worktrees at explicit base revisions. The coordinator verifies installed Graphite worktree behavior before choosing where stack commands execute.

The coordinator is the single writer for Graphite parent metadata, restacks, and submission. Workers produce and verify their owned changes. Shared repository metadata makes simultaneous stack mutations unsafe even when source worktrees differ.

The existing Gas City shared-drain mode is serial. Use separate isolated work assignments for the potential parallel groups, with a verified way to supply each dependency base. The pinned pack's detached-HEAD preparation is not sufficient by itself.

Before implementation, prove the intended worktree/base handoff on disposable local branches or establish a coordinator-operated procedure. This preparatory draft does not perform that test.

## Graphite command policy after authorization

The Graphite tool instructions require confirming the intended stack before building. This document is the proposed structure for that confirmation.

After implementation is authorized, code is written and validated before the new diff is committed. Stage only owned files. Use `gt create` for a new diff and `gt modify` for changes to an existing diff, rather than raw commit commands.

The coordinator uses scoped `gt move` and `gt restack` operations for joins and ancestor updates. Verify the installed command flags before execution. Avoid a global sync or restack that could alter unrelated work.

Submission uses `gt submit --no-interactive` only after publication is authorized and its ancestor scope is inspected. A command that includes downstack branches must not publish unrelated or unapproved work. No auto-merge is enabled.

The Gas City default worker/publisher contract must be checked for raw commit/push behavior and adjusted or bypassed through an explicit coordinator-owned path for this feature. Do not assume the standard executing formula already obeys this Graphite policy.

## Review and update rules

A reviewer receives the ticket, immediate parent revision, diff revision, source evidence, and acceptance checks. It reviews the ticket's delta and relevant inherited assumptions.

If a parent changes, the coordinator restacks affected descendants, resolves conflicts, and reruns checks affected by the changed base. A prior review is not proof that the new composition works.

Each ticket carries its own tests and failure handling. AW-13 proves integration and the full user experience; it does not excuse unverified individual diffs.

## Preconditions before dispatch

- Approved ticket graph and intended stack structure.
- Confirmed technical defaults and provider evaluation authorization.
- Concrete file ownership and frozen contracts at each split.
- Verified worktree base selection and serialized Graphite metadata ownership.
- An explicit Graphite-compatible commit and publication path for Gas City.
- Approved tracker mapping and real dependency links.
- Separate authorization for implementation, publication, and landing as applicable.

Nothing in this plan changes the existing no-implementation boundary.
