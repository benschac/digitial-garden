# Asset workflow ticket index

Epic: `ps-cdek`. All sixteen child issues are blocked and unassigned. No implementation or dispatch is authorized.

[Plan](README.md) · [Spec](../../specs/asset-workflow.md) · [Receipt](beads-receipt.json)

| Plan ID | Bead | Ticket | Native blockers |
| --- | --- | --- | --- |
| PRE-01 | `ps-cdek.1` | [Publish the approved workflow documentation](preparation/01-workflow-docs.md) | None |
| PRE-02 | `ps-cdek.2` | [Add a small layered reference fixture](preparation/02-reference-fixtures.md) | None |
| PRE-03 | `ps-cdek.3` | [Qualify and add the chosen canvas dependency](preparation/03-canvas-dependency.md) | None |
| AW-01 | `ps-cdek.4` | [Local project workspace](issues/01-projects.md) | `ps-cdek.3` |
| AW-02 | `ps-cdek.5` | [Upload and reuse project references](issues/02-references.md) | `ps-cdek.4` |
| AW-03 | `ps-cdek.6` | [Save reusable style revisions](issues/03-style-library.md) | `ps-cdek.5` |
| AW-04 | `ps-cdek.7` | [Generate a composition safely](issues/04-composition-submit.md) | `ps-cdek.5` |
| AW-05 | `ps-cdek.8` | [Resume observation and recover downloads](issues/05-run-recovery.md) | `ps-cdek.7` |
| AW-06 | `ps-cdek.9` | [Compare history and select an output](issues/06-output-selection.md) | `ps-cdek.7` |
| AW-07 | `ps-cdek.10` | [Generate with a selected style revision](issues/07-style-application.md) | `ps-cdek.6`, `ps-cdek.7` |
| AW-08 | `ps-cdek.11` | [Approve an exact composition revision](issues/08-approval.md) | `ps-cdek.9`, `ps-cdek.10` |
| AW-09 | `ps-cdek.12` | [Prepare and inspect transparent layers](issues/09-layer-generation.md) | `ps-cdek.8`, `ps-cdek.11` |
| AW-10 | `ps-cdek.13` | [Save layer presentation edits](issues/10-layer-editing.md) | `ps-cdek.12` |
| AW-11 | `ps-cdek.14` | [Preview parallax and maximum offsets](issues/11-motion-preview.md) | `ps-cdek.13` |
| AW-12 | `ps-cdek.15` | [Export a portable asset bundle](issues/12-portable-export.md) | `ps-cdek.13` |
| AW-13 | `ps-cdek.16` | [Prove the complete workflow](issues/13-integration-review.md) | `ps-cdek.14`, `ps-cdek.15` |

## View the live backlog

From the city directory:

```sh
gc bd --rig personal-site show ps-cdek
gc bd --rig personal-site list --parent ps-cdek --all --deps
```

The receipt records the source and body digests at publication. Local ticket files subsequently gained their Beads IDs; those added pointers do not rewrite the issue bodies.

## Verification

All issue bodies, statuses, parents, blocking edges, lack of assignments and routing metadata, and the empty ready frontier were read back successfully.

The repository-wide affected verification stopped on four existing audit-file formatting failures. The new documentation passed targeted formatting checks. No unrelated audit files were modified.
