# Agent configuration cleanup

- [x] Reproduce it yourself on the matching surface via the driver skill.
- [x] Binary-search the cause.
- [x] Plan the fix.
- [x] Verify on the same surface.
- [x] Stage the commits so the failing repro lands before the fix in git history.
  - The operator requested a cleanup commit after verification. Keep one scoped configuration commit; the actual nested checkout supplied the failing reproducer without a new synthetic test commit.
- [ ] Run Opening a PR.
  - Skip publication. Deliver the local reviewed patch with existing unrelated edits preserved.

Throughput checkpoint: delegate the isolated lint boundary fix; main owns lock reconciliation, documentation, and verification. Data remains the existing skill-name-to-source lock map. Remove only entries for already deleted skills. Preserve generated provider hooks and candidate history.

Read-only candidate lookup succeeded using the existing city and rig. No queue mutations are part of this cleanup.

Root lint and formatting pass. Aggregate affected verification passed all 14 tasks with 4 cache hits. The lock comparison proved only the three retired entries changed. Independent read-only review found no actionable issues and confirmed the actual root lint command passes. No new comments or suppressions were introduced.
