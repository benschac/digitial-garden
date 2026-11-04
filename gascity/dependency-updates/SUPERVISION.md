# Own dependency work through completion

## Current operator authorization

On 2026-11-04, the operator restored the normal small, compatible dependency-update workflow and asked to repair and activate supervision. This supersedes the temporary blanket no-commit/no-push/no-preparation restriction recorded on psc-0e7 and psc-wisp-o3u68. Historical notes and metadata describing that restriction are not current authority.

Workers may run the trusted preparation script and create one scoped commit per eligible package. The singleton publisher may verify and publish those commits directly to main through its existing guarded workflow. Required verification may create disposable test-fixture commits. Stable minor and patch updates within the current major qualify; for 0.x, remain within the current minor. Source-pinned, prerelease, major, coupled, potentially breaking, uncertain, or failed candidates remain held for review. Small diff size alone does not establish compatibility.

Preserve all existing blocked beads, attempt budgets, failed artifacts, and prepared commits. This restoration does not resolve a failed check, authorize an unchanged retry, or automatically qualify a remediation patch. Broader source remediation and coupled upgrades still require the scoped integration handoff and review below. Never bypass checks, force-push, deploy manually, or include unrelated work.

The current authorization in this file applies to the scanner, preparation workers, publisher, and Mayor. Read it from the registered rig before dispatching, preparing, or publishing. If a later operator restriction pauses commits or publication, suspend the affected execution roles and stop new dispatch as well as recording it here; editing the Mayor's notes alone does not stop scheduled workers.

## Standing workflow

The Mayor is the sole coordinator for the personal-site dependency queue. The operator authorized this continuing workflow, including scoped remediation of upgrade blockers. This grant includes autonomous planning, decomposition, implementation, and independent review within the dependency-remediation scope below; do not stop at routine artifact approval gates. Genuine product or API semantic choices outside that scope still require the operator. A blocked bead is unfinished work. An empty ready queue is not completion.

Native orders wake this same Mayor on bead updates, bead closure, and a five-minute catch-up cadence. Read current records on every wake. The wake helper never routes, retries, edits, publishes, or closes work. Eight preparation slots and one publisher remain the execution limits.

## Reconcile current state

1. Find and reuse the city task labeled `dependency-supervision`. Preserve its history and standing ownership. Do not create another coordinator task while one exists. If ownership points at another active coordinator, resolve that ownership before mutating work.
2. Read the entire rig queue and active sessions, including legacy review tasks. Do not use the default limited list or only the ready queue.

   ```sh
   gc --city "$GC_CITY" bd list --all --limit 0 --label dependency-supervision --json
   gc --city "$GC_CITY" --rig personal-site bd list --all --limit 0 --json
   gc --city "$GC_CITY" session list --json
   ```

3. Reconcile actual remote declarations, exact direct lock resolutions, commit ancestry, saved artifacts, real dependency edges, and current claims. Notes and prior summaries are evidence to check, not current truth. A range accepting a target does not prove that the named package resolves to that target.
4. Give every unfinished dependency bead an active owner, an executable prerequisite or remediation task, or a specific unresolved operator decision. Leave active claims alone. Repair unowned routing only after checking current ownership and artifact validity, using guarded updates. A missing, partial, or failed read must never become an empty queue.
5. Dispatch available work through the existing pools. Do not manufacture jobs to occupy all eight slots. Keep one active candidate per package and preserve the singleton publisher. Reuse the same package bead through preparation, remediation, publication, and acceptance.
6. Record a compact checkpoint on the standing supervision task with remote proof, active owners, concrete next actions, and holds. Continue independent work while other tasks run. Register supported waits when useful, then allow the native orders to wake the same owner again. Do not start detached watchers or another scanner, publisher, or coordinator.

## Resolve blockers

Classify each blocker before another attempt. Inspect existing remediation tasks and dependency edges first. Create at most one active task for a shared root cause, label it `dependency-remediation`, record `dependency_remediation_key`, and link every affected package bead to it. Record its ID as `dependency_remediation_bead` on those package beads. A remediation task must name an owner, exact file or package scope, acceptance checks, and the evidence that permits the dependent packages to resume.

Use configured implementation and review roles for scoped work. Discover the current formula catalog and inspect the chosen formula before launching it. Do not guess a formula name or launch a workflow that implicitly broadens publication authority.

```sh
gc --city "$GC_CITY" formula catalog --json
gc --city "$GC_CITY" formula show FORMULA --json
```

The authorized remediation scope includes:

- Correcting stale phase, claim, and route metadata after checking the real owner and prepared artifact. Do not alter failed results to make them pass.
- Diagnosing shared test or tooling failures and fixing their actual cause in an isolated checkout. Do not weaken assertions, disable checks, expand timeouts merely to turn a failure green, or bundle unrelated cleanup.
- Qualifying source-pinned upgrades against exact installed and target upstream sources, updating the affected source pins and catalog evidence, and running the repository's required source checks.
- Making narrow compatibility adaptations for documented API changes, with focused behavioral checks and independent review.
- Handling coupled package families as an explicitly scoped, reviewed atomic upgrade when peer constraints prevent a valid one-package sequence. Prefer real prerequisite beads and sequential independent updates when that works. Record any necessary group exception on every affected bead. Never disguise a coupled change as an ordinary one-package preparation.

The existing one-package preparation script and publisher keep their scope restrictions. A source remediation or coupled group needs a separate reviewed integration handoff naming the responsible integration owner, allowed files, checks, and publication authority. The handoff may carry this approved workflow's normal reviewed integration authority to the existing remote main, with the ordinary publisher quiescent and exactly one integration owner. Routine scoped fixes do not need another publication permission request. The Mayor owns arranging that handoff and following it through acceptance; parking it as another unowned review bead does not discharge the task. Do not send a broader patch to the ordinary dependency publisher or have multiple agents land concurrently. Use the existing city verification lock for overlapping verification. Follow repository instructions, including stronger review or build checks when the remedial change requires them.

No force pushes, manual deployments, deployment-configuration changes, credential changes, branch-protection changes, new dependency families, or unrelated app changes are authorized by this workflow. Existing Vercel builds triggered by an authorized normal push remain unchanged; they are not proof of deployment acceptance. Ask the operator only for an actual decision outside the approved scope, with the concrete options and evidence. A routine repair within the scope above does not need repeated permission.

## Resume deliberately

Before requeuing the same package bead, record the exact resolved blocker, its accepted remediation commit or other evidence, the current base, original declarations, and the next attempt's scope. Verify that no live owner or exact preparation process still holds the attempt. Preserve failed results, logs, commits, and request bytes under named archives before any explicitly reviewed fresh attempt. Never overwrite attempt history or reset the record of failures.

Allow one fresh attempt per newly resolved blocker. Another failure with the same cause returns to diagnosis; it does not authorize an unchanged retry. Use a finite attempt and time budget recorded on the remediation task. Exhaustion requires a new evidence-backed plan or a specific operator decision, while independent work continues. A changed timestamp or repeated wake is not new evidence. Credential and policy denials are not transient retry candidates.

## Accept or defer explicitly

Close a package bead only after confirming its exact target declarations, direct lock resolutions, successful required checks, and landed commit ancestry on fresh remote main. Already accepted historical beads retain their acceptance when the recorded landed commit remains in history; a later authorized upgrade may supersede their target. A prepared commit, passing local check, dispatched workflow, or running session does not establish publication. Vercel deployment acceptance remains a separate claim.

Explicit user deferral remains distinct from landed. Preserve the bead and record `status=deferred`, `dependency_disposition=deferred`, `dependency_decision_by=human`, and `dependency_decision_reference` pointing to the actual user instruction. Verify that instruction before setting these fields. A worker's recommendation, guessed approval, unavailable evidence, or ordinary blocked state cannot authorize deferral. Clear the disposition and route through review if the user resumes it.

The helper keeps closed and deferred records in its snapshot so another batch cannot reuse an earlier acknowledgement. A queued or delivered reminder is not a reconciliation acknowledgement. To stop reminders when all records are closed or explicitly deferred, validate the remote outcomes and referenced user decisions, then acknowledge the exact snapshot on the standing city supervision task.

Run the installed helper with `--snapshot` to obtain the canonical `snapshot` and `snapshot_id` without sending a wake. Use its absolute path under the registered rig's `gascity/dependency-updates/assets/scripts/`. A busy helper exits nonzero in this mode; wait for it before reading a snapshot. Capture a snapshot before the audit and again after it. If the identities differ, reconcile the changed queue before acknowledging.

Keep the standing task assigned to `mayor` and `in_progress`. Append the audit evidence and set `dependency_supervision_ack` to the verified `snapshot_id` using a guarded update on that task. Do not copy an old wake receipt or acknowledge while unresolved work remains. The helper requires this matching Beads acknowledgement before terminal reminders stop; a changed queue invalidates it. The helper cannot authenticate prose or operator identity, so the Mayor owns verifying actual user decisions.

The current batch is complete only when every target is remotely verified or explicitly deferred. Report the two outcomes separately. Keep standing supervision available for later scans. Final closure continues bounded reminders until acknowledged. A newly installed helper with no unfinished work, or an acknowledged terminal snapshot, stays quiet.
