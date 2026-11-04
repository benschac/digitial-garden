# Gas City recovery 2026-11-04

User restored small compatible dependency update commits and requested working automation. Normal singleton publication restored, actual compatibility and failed-check holds preserved.

## Root cause and fix

Verified orphan gc nudge poll PID99434 PPID1 held wake.lock FD9 for8h. Parent helper forwarded FD9 through Execa; detached poller retained it. Busy scheduled helpers returned0 without reconciliation. Removed seven extra stdio entries; helper retains FD9 while Effect finalizer awaits active direct command. Targeted identity-checked SIGTERM released existing lock; preserved process evidence separately. Removed only obsolete publisher suspension patch; city config resolved and soft reload completed, no unrelated session restart.

## Source and decisions

patterns consult gascity and supervision; dependency-supervision entry corrected. Gas City1.5.1 source4f698fe2a7eefae49e545c5e38189f1b63fb9b39 ensureNudgePoller and lifecycle tests confirm detached lifetime. Effect4.1.2 source506eef143bcc1750ce58920aac1e45da7265d103 resource/runtime/process guides, acquireUseRelease and interruption tests support retaining finalizer ownership. Execa10.2.1 stdio normalization/types confirm only standard streams forwarded. Installed distribution lacks upstream tests; actual Bun/Execa regression covers boundary. Independent reviewer repeated source inspection and15test pass. Rat Stack scopes-own-resources reinforces ownership; no broad adapter migration justified.

## Verification

Detached-child regression before fix exits75 rather than0; after fix15tests pass including mutual exclusion, failure, cancellation and delayed child termination. Pack lint and source checks pass. Affected verify10/10 passes with6cache hits after allowing local socket fixtures outside sandbox. First run caught two new-test spacing errors, corrected. Sandboxed run then failed3dev-port tests with EPERM; unsandboxed run passed without check changes.

Live wake receipt advanced from07:06Z to15:27:06Z; delivered to same Mayor15:27:20Z. Snapshot mode reacquired lock successfully. Exactly one publisher session created automatically. Same Mayor visibly audited current queue and remote; publisher claimed ps-sv7 and began artifact checks, ps-x2f remains ready. Root recorded recovery evidence on existing supervision bead. Publication is still in progress, not claimed complete.

## Remaining status limitation

Gas City status uses one-second bounded snapshots; BdStore lacks Counter so retained-row health hydrates closed history and times out. Active cache reconciles; readiness cache rejection reason unresolved. Direct queue/session reads succeed. No database corruption established, no broad restart/migration/timeout increase performed.

## Applied principles

Fix Root Causes removed descriptor inheritance instead of repeatedly clearing locks. Prove It Works required live lock reacquisition, delivered wake and actual existing-bead claim, not just successful scheduled order receipts.
