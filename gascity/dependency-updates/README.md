# Run daily dependency updates

This pack schedules one package update at 09:00 America/New_York each day. The updater creates one commit and pushes directly to `benschac/digitial-garden` `main`. It uses a fresh clone and leaves the registered rig checkout untouched. The order is enabled.

Stable minor and patch updates are eligible within the current major. For `0.x`, only updates within the current minor are eligible. Major releases, prereleases, documented breaking changes, coupled upgrades, and packages in `scripts/agent-sources.json` become review tasks. Each commit changes one package's existing declarations and the root `bun.lock`, including necessary transitive changes.

The worker runs a frozen-lock install, focused checks, and `bun run verify`. It skips local production builds. Vercel validates builds after the push, so a failed deployment does not prevent the commit from landing. This pack does not automatically revert commits or repair failed deployments.

These policies are agent instructions, not a deterministic dependency or Git authorization gate. Gas City enforces the singleton worker and its default order overlap checks. A normal Git push prevents non-fast-forward publication. The worker still makes the compatibility and diff-scope judgments.

## Install the pack

For a new installation, set `enabled = false` in `orders/update-one.toml` first. Add the import under the existing `personal-site` rig in the city's `city.toml`:

```toml
[rigs.imports.deps]
source = "/Users/benjaminschachter/personal-site/gascity/dependency-updates"
```

Validate the pack and resolved configuration before enabling the order:

```sh
gc lint gascity/dependency-updates
gc --city "$HOME/personal-site-city" config show
gc --city "$HOME/personal-site-city" formula show update-one --rig personal-site
```

Disabled orders are omitted from `order list` and `order show`. To inspect the schedule before activation, enable a copy in a temporary city that is not running.

Set `enabled = true` in the installed `orders/update-one.toml` after reviewing the schedule and the `personal-site/deps.updater` agent. Gas City can dispatch the first run immediately because its cron scheduler catches up a missed run. Later runs follow the daily schedule. Keep Gas City running for scheduled execution. The machine must be awake and have registry access, the pinned Bun version, and GitHub push credentials available to the worker.

## Inspect or run an update

Use the canonical order name shown by `order list` if an import qualifies it:

```sh
gc --city "$HOME/personal-site-city" order show update-one --rig personal-site
gc --city "$HOME/personal-site-city" order history update-one --rig personal-site
gc --city "$HOME/personal-site-city" order run update-one --rig personal-site
```

`order run` executes real work and can push to main. It is not a dry run. Avoid manual dispatch while an earlier run remains open. To stop future daily dispatch, set `enabled = false`. Disabling the order does not cancel active work.
