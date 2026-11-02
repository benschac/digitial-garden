# Portable supervised city template

This directory versions the reusable portion of the local pilot. The active city remains `.tools/gascity-beads-pilot`; these files do not automatically update it. Read the [operating contract](../operating-contract.md) before deployment or dispatch.

| File | Ownership |
| --- | --- |
| `pack.toml`, `packs.lock` | Root pack and the existing pinned `core` and `bd` imports |
| `city.toml` | Codex deployment defaults copied from the supervised pilot |
| `agents/worker/` | Reusable worker prompt and dormant configuration |

The provider retains `workspace-write`, approvals on request, disabled Codex hooks and disabled automatic startup-dialog acceptance. These are configured defaults, not proof of unrestricted-action denial. The worker starts suspended with zero minimum sessions, one maximum session and fresh conversation state. Its relative work directory resolves beneath the deployed city's `.gc/worktrees/`; the path setting does not create a Git worktree. The coordinator must reserve and prepare that worktree before enabling any worker. Session age is not a task lifetime budget.

One-off task agents, review candidates, absolute checkout paths and the always-failing qualification formula are excluded. The experimental `pilot-restricted-exec` provider remains local qualification history; it is not the supervised worker's provider. The separate `../agents/worker.toml` and `../qualification/worker.json` are frozen A2 evidence, not templates to deploy.

## Validate without starting a city

From the repository root, copy the template to a disposable directory and ask Gas City to compose it:

```sh
staging_city=$(mktemp -d "${TMPDIR:-/tmp}/personal-site-city-config.XXXXXX") &&
  cp -R orchestration/personal-site/city-template/. "$staging_city/" &&
  gc --city "$staging_city" config show --validate &&
  gc --city "$staging_city" config show --json
```

This loads the pinned imports through Gas City's shared pack cache. It does not initialize, register, start or dispatch a city. Inspect the resolved `worker` suspension, session limits, work directory and provider options. Imported maintenance agents are present too; the template is not a promise that starting a city launches no processes. The singleton-drain warning is expected for demand-driven workers; do not add an always-on session to silence it.

## Adopt reviewed changes

Keep deployment separate from versioning. Before changing the active city, reconcile its current tasks, sessions, budgets and reservations. Compare the staged configuration against `gc --city .tools/gascity-beads-pilot config show --json`. Review differences individually; copying this entire directory over an active city would overwrite local policy and omit task-specific definitions.

Keep `.gc/site.toml`, `.beads/`, database backups, credentials, caches, logs and working trees local and ignored. Preserve existing task IDs and history. A new Git clone contains these defaults, not the Beads database or a recovered running city.

For a future deployment, use Gas City's supported initialization procedure, then apply the reviewed pack and deployment files while workers remain suspended. Bind isolated worktrees and explicit task contracts, validate the resolved configuration, and only then enable the intended task worker under the coordinator. The original `.tools/gascity` development city and root `gascity.toml` are separate and remain unchanged.

## Source and verification

The layout targets Gas City 1.5.1, tag commit `4f698fe2a7eefae49e545c5e38189f1b63fb9b39`, with Codex CLI 0.166.0. The import pins and lockfile are copied from the existing pilot, not updated to upstream HEAD. The schema and relative-workdir behavior were checked against the pinned [pack specification](https://github.com/gastownhall/gascity/blob/v1.5.1/docs/reference/specs/pack-spec.md), [agent configuration](https://github.com/gastownhall/gascity/blob/v1.5.1/internal/config/config.go), and [workdir tests](https://github.com/gastownhall/gascity/blob/v1.5.1/cmd/gc/template_resolve_workdir_test.go).

Configuration composition validates the portable definition. It does not establish worker launch, sandbox isolation, browser access, recovery or end-to-end acceptance. Those remain explicit runtime checks on the deployed candidate.
