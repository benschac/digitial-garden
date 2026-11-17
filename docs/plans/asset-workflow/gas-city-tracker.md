# Gas City Beads tracker adapter

Status: Installed through the approved setup. Epic `ps-cdek` and sixteen children were published blocked and unassigned; see [the ticket index](tickets.md).

The installed repository contract is [docs/agents/issue-tracker.md](../../agents/issue-tracker.md). This document preserves the publication procedure and dependency mapping used during setup.

## Tracker identity

The tracker is Gas City Beads. The city is `/Users/benjaminschachter/personal-site-city` and the rig is `personal-site`.

Run rig issue operations through `gc bd --rig personal-site` from the city directory. Do not create this feature in the city-level store or an unrelated rig.

Use one feature epic and sixteen child issues for this plan: three preparation tasks, twelve implementation tasks, and one integration-review task. The epic describes the feature and approved scope. Each child contains its own deliverable and acceptance criteria.

The child relationship groups work. Native blocking relationships determine readiness. Graphite branch ancestry is separate from both.

## Skill mapping

| to-tickets concept | Gas City representation |
| --- | --- |
| Parent feature | Rig-level epic |
| One ticket | One persistent rig-level issue |
| Child of feature | `--parent` with the real epic ID |
| Blocked by | `--deps blocked-by:<id>` at creation or `dep add <dependent> --blocked-by <prerequisite>` |
| Proposed ticket ID | Namespaced metadata identifying PRE-01 through PRE-03 or AW-01 through AW-13 |
| Acceptance criteria | Issue acceptance field or explicit checklist in the body |
| Spec traceability | Spec reference and revision plus relevant acceptance criterion numbers |
| Ready for an agent | Explicit release and routing after implementation authorization; not inferred from publication |

The default to-tickets `ready-for-agent` label is overridden for the current planning-only phase. Create the epic and every child with initial status `blocked`, without an assignee, routing metadata, dispatch labels, or a timed defer.

The CLI documents that `bd ready` excludes blocked issues. This is evidence about ready-work selection, not a universal guarantee against an operator explicitly routing or modifying an issue. Verify held status after publication and do not launch a workflow.

## Issue content

Each child includes:

- Its self-contained user-visible deliverable and scope exclusions.
- Acceptance checks and requirement references.
- Native blocking IDs after the prerequisites have been created.
- Exclusive module responsibilities and the required source-lookup contract.
- Relevant adopted pattern IDs, with the requirement to inspect current owners and pinned library source.
- The intended Graphite diff identity and the coordinator's ownership of stack operations.
- An explicit note that implementation has not been authorized.

Avoid copying a long list of concrete source paths into every ticket. The versioned engineering evidence document owns those navigation pointers. The actual task must remain understandable from its issue body if a local link is unavailable.

At publication time, copy the applicable confirmed spec and stack constraints into the epic body. Record the source document revision or digest. PRE-01 later places the approved documentation in the owning repository; it is not a prerequisite for merely retaining the backlog in Beads.

## Dependency graph

| Ticket | Native blockers |
| --- | --- |
| PRE-01 Workflow documentation | None |
| PRE-02 Reference fixtures | None |
| PRE-03 Canvas qualification | None; its body requires confirmation of the canvas choice |
| AW-01 Projects | PRE-03 resolved |
| AW-02 References | AW-01 |
| AW-03 Style library | AW-02 |
| AW-04 Composition submission | AW-02 |
| AW-05 Run recovery | AW-04 |
| AW-06 Output selection | AW-04 |
| AW-07 Apply styles | AW-03, AW-04 |
| AW-08 Approval | AW-06, AW-07 |
| AW-09 Layer generation | AW-05, AW-08 |
| AW-10 Layer editing | AW-09 |
| AW-11 Motion preview | AW-10 |
| AW-12 Portable export | AW-10 |
| AW-13 Integration review | AW-11, AW-12 |

The draft's conditional PRE-03 edge becomes a decision-resolution dependency in Beads. If no new canvas dependency is needed, PRE-03 closes with the checked selection and explicit skipped-addition rationale. It does not install an unnecessary package. Until that decision is resolved, AW-01 remains blocked.

PRE-01 is an administrative requirement before implementation dispatch, not an artificial code dependency on every task. PRE-02 supports tests and can land independently. Implementation workers may use existing fixtures if appropriate rather than waiting on an unrelated fixture task.

## Publication procedure

1. Review this tracker mapping and the existing breakdown. Do not repeat settled product questions.
2. Confirm the current rig/store and inspect for an existing epic or imported issues belonging to this feature. Do not change unrelated issues.
3. Preview creation with the CLI's `--dry-run` support. Use exact issue bodies from files, not shell-interpolated prose.
4. Create the blocked epic and capture its returned ID.
5. Create each blocked child in dependency order with its real parent and prerequisite IDs.
6. Record a receipt mapping provisional IDs to real bead IDs, together with source document digests.
7. Read back each issue and verify the body, parent, status, assignee, metadata, and native edges.
8. Verify none of this epic's children is ready. Report any unexpected state rather than changing or dispatching it automatically.

Creation supports `--body-file`, `--acceptance`, `--parent`, `--deps`, `--status`, `--metadata`, `--spec-id`, `--json`, and `--dry-run`, as verified from the installed CLI help.

On partial failure, keep the receipt and reconcile already-created issues before retrying. A metadata value or external reference is not assumed to enforce uniqueness. Do not blindly rerun the entire import.

Do not modify an existing parent issue merely to publish its children. If the feature epic already exists, reuse its verified identity and preserve its content and status.

## Separate execution authorization

Publication does not cook a formula, create a convoy, assign workers, or sling work. No status release, timed wake-up, or automatic merge accompanies ticket creation.

After implementation authorization, the coordinator resolves technical choices and verifies the Graphite-compatible worktree and publication procedure. It releases only the intended work frontier, with real prerequisite changes present in the selected base.

The inspected Gas City decomposer normally creates implementation work. Before using that path with this pre-created backlog, verify how it consumes existing issue IDs. Do not create a duplicate second ticket graph or assume an unverified import option exists.

Keep scheduling dependencies distinct from stack order. Restacking an independent branch above another for review does not add an implementation blocker.

## Configuration installation

After review, the setup step records this custom tracker contract in the owning repository and adds a minimal pointer under its existing Agent skills instructions. It also records the triage vocabulary and domain-document layout required by the setup skill.

Do not install a default GitHub Issues tracker or apply generic readiness labels. Beads remains the tracker for this feature, and the current hold policy takes precedence over the generic to-tickets default.

Setup approval covered the documentation and held backlog only. No implementation or dispatch authorization follows from setup.
