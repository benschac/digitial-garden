# Skill archive review round one

The operator wants the existing update queue to progress through verified repairs. The frozen archive-first source patch is not accepted yet.

All three independent reviewers verified base 630a89dd191e7711dadf893c10cc8c169407bc13, the eight checkpoint file hashes and patch 333bc312e9a2fff9600d3c4160f91351d12c39ae6d1b599d69479193d969cce2. Correctness and complexity reviews found no actionable defects. Safety review reproduced one P2 defect.

The shell command may exit while background descendants retain output descriptors. archive finish hashes stdout.log and stderr.log and publishes complete=true, but later writes change those hashes. The bounded synthetic probe completed in 4.3 seconds. Native command exit was zero, manifest exit was zero, and stderr changed after manifest creation. Evidence is /private/tmp/archive-safety-Rh7PZ6/report.json. This is a capture-integrity defect. No publication-gate bypass was demonstrated.

Assign one source owner on existing ps-hwae to fix this defect in the isolated source-anchor worktree. Preserve the original checkpoint and all failed native graph history. Keep the eight-file ownership boundary. Prefer sealing separate log snapshots before hashing while explicitly preserving live raw streams as unsealed, unless owning source establishes a smaller correct resource-owner solution. Do not assume redirecting only the parent descriptors closes descendants. Do not wait indefinitely, change native timeout ownership or claim command exit proves descendant quiescence. Include any qualification log that can retain an open writer in the integrity analysis. Existing candidate provenance, qualifications, attempt budgets and publication gates remain unchanged.

Add focused synthetic coverage for late descendant output and verify recorded immutable bytes still match after the descendant writes. This catches the reproduced defect that existing tests miss. Run focused checks and required affected verify against the changed bytes. Root is repairing only missing ignored dependency links in this checkout. No installation or dependency changes are needed. Freeze a second exact manifest and patch, then root will return all three independent reviewers to the same revised bytes. Do not dispatch another duplicate panel.

The setup-only verification failure remains preserved. A bounded retry is justified only after the missing exact installed-package paths are repaired and the affected dry graph still excludes app, content, MDX, typegen and build workloads. No runtime diagnostic allowance is granted by this note.

Sequence B retained-receipt adoption remains unimplemented. This repair alone cannot authorize candidate resume, legacy qualification reuse, integration acceptance or publication.
