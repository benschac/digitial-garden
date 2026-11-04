# Gas City recovery

- [x] Reproduce it yourself on the matching surface.
- [x] Binary-search the cause.
- [x] Plan the fix.
- [x] Verify on the same surface. Fresh wake15:27Z, same Mayor delivered15:27:20Z, publisher session created, snapshot lock reacquired.
- [ ] Stage the commits so the failing repro lands before the fix in git history. skip: keep this repair uncommitted for task-scoped review; preserve unrelated dirty work.
- [ ] Run Opening a PR. skip: user requested local city repair, existing dependency workflow uses direct publication.

throughput checkpoint: one bounded helper/test worker; root owns policy and live recovery; independent review follows stable patch.

- [x] Focused regression and aggregate verify. 15 focused tests and10/10 affected tasks passed.
- [x] Independent review. No actionable findings.
- [x] Update current authorization on standing bead, resume publisher, recover lock, observe actual Mayor reconciliation. Publisher claimed ps-sv7; same Mayor actively audited queue/remote; recovery evidence appended to existing bead.
