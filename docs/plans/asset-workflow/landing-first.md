# Land prerequisites before the feature stack

Status: Proposed sequencing. This document does not authorize installation, commits, publication, or merging.

## Early landing lane

These changes can be reviewed and landed without waiting for the complete asset workflow. Each still needs its own checks and review.

| Work | Independent result | Dependency | What it unblocks |
| --- | --- | --- | --- |
| [PRE-01](preparation/01-workflow-docs.md) | Approved spec, tracker mapping, and Graphite handoff instructions in the owning repo | Approval of the documented workflow | Reproducible worker assignments |
| [PRE-02](preparation/02-reference-fixtures.md) | Small, deterministic layered-image fixture with provenance and expected metadata | None | Offline preview/export validation |
| [PRE-03](preparation/03-canvas-dependency.md) | Qualified canvas dependency and a narrowly changed lockfile | Confirmation of the canvas choice | AW-01 canvas shell |
| [AW-01](issues/01-projects.md) | A usable local project workspace that saves notes and layout | PRE-03 if the selected implementation needs a new canvas package | All later feature slices |
| [AW-02](issues/02-references.md) | Uploaded references that persist and reopen | AW-01 | Parallel styles and composition work |

PRE-01 and PRE-02 can proceed independently of dependency qualification after preparation work is authorized. They should be sibling PRs against trunk, not forced into one stack. PRE-03 is also independently reviewable once its library choice is settled.

The first product stack starts on the checked canvas dependency revision if it is not yet landed. Once the prerequisite lands, the coordinator restacks the feature work onto the updated trunk.

PRE-01 is an administrative readiness condition for dispatch, not a code dependency inserted into every ticket. PRE-02 supplies a reusable test input, not a dependency that blocks writing unrelated feature code.

This lane is an explicit exception to the default vertical-slice rule. Documentation, checked test assets, and a narrowly scoped dependency addition are useful prerequisites by themselves. Business behavior remains in vertical slices.

## Current dependency baseline

The consuming app manifest already declares these packages, as observed on 2026-11-05:

| Need | Existing dependency |
| --- | --- |
| Runtime validation, errors, services, and resources | Effect 4.1.2 |
| Finite state behavior where justified | XState 6.0.0-alpha.71 and @xstate/effect 1.0.0-alpha.10 |
| AI integration | AI SDK 7.0.162 and Eve 0.80.1 |
| Animation | motion 14.9.0 |
| Reusable UI and browser lifecycle helpers | Workspace UI and react-hooks packages |
| Server-only module boundary | server-only 0.0.1 |

These are manifest declarations, not proof that installed source or runtime behavior matches. Implementers still perform the version/source checks in the engineering evidence guide.

The app manifest does not declare React Flow, a fal client, or a ZIP library. Only the canvas dependency is proposed for the early dependency diff. No new versions are selected in this planning pass.

## Dependency policy

PRE-03 owns only the chosen canvas package and the necessary lockfile delta. Its owner checks React compatibility, Next client boundaries, existing compiler configuration, required styles, and the production build before calling it ready.

Do not upgrade Effect, React, Next, or unrelated dependencies while adding the canvas package. Do not purchase the React Flow Pro template. The standard core library is the current proposal, pending explicit selection.

Provider SDK additions belong with the first real provider integration after source/API inspection establishes a need. Existing transport capabilities may suffice. An archive package belongs with portable export if the chosen bundle format requires it. Database and orchestration frameworks are not prerequisites for this feature.

Only one agent edits package manifests and the lockfile at a time. Reconcile the dependency diff with current trunk before release; do not fold unrelated dependency-remediation work into it.

## Proof required to land

- The diff is useful or explicitly justified without the remaining feature stack.
- No public route, scheduler, provider call, or generation is activated unintentionally.
- The dependency diff has a reproducible compatibility result on the actual app. A successful install is not enough.
- Tests appropriate to the change and required repository checks pass.
- The responsible reviewer sees the exact diff that would land.
- Scope and rollback are clear; unrelated user changes remain untouched.

PRE-03 affects build dependencies, so its planned gate includes the repository's full verification/build requirement. PRE-01 and PRE-02 use proportionate documentation and fixture checks.

## Later work that can also land early

AW-03 is a complete style library and need not wait for composition generation. AW-04 is independently usable with prompts and subject references and need not wait for styles. Either may land after its own dependencies, review, checks, and authorization.

AW-04 must already be safe on restart and uncertain submission. It is not acceptable to land an unsafe submit path with a promise that AW-05 will fix it.

Preview and export remain separate branches after AW-10. Neither needs to wait for the other to be reviewed or to land, although integrated acceptance requires both.

## Scope still excluded

This preparation lane does not introduce an unused service framework, a speculative database, generic queue infrastructure, or broad shared-UI refactors. A shared helper is extracted only when a concrete slice needs it and existing owners do not fit.

No work in this lane changes the held dependency or skill-update queues. Landing these items will require the normal authorization and checks for this feature's own branches.
