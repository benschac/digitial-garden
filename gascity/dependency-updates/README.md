# Run daily dependency updates

At 09:00 America/New_York, the scanner inventories all direct dependencies and devDependencies. Each eligible package gets one persistent bead. Three `gpt-6-luna` workers with low reasoning effort can prepare updates concurrently in separate clones. A single publisher lands their commits one at a time directly on `benschac/digitial-garden` main.

Each commit contains one package's affected `package.json` declarations and the root `bun.lock`, including necessary transitive changes. Subjects name the actual bump, such as `chore(deps): bump turbo from 2.11.9 to 2.11.10`. Preparation workers do not push. The publisher applies each commit above current main. If manifests or the lockfile conflict, it reapplies only the selected version change and runs `bun install` to regenerate the lockfile. It preserves updates already landed below it. Conflicting versions of the selected package require review.

Stable minor and patch updates within the current major are eligible. For `0.x`, only updates within the current minor qualify. Breaking or uncertain changes, prereleases, coupled upgrades, and packages in `scripts/agent-sources.json` remain blocked for review. The scanner chooses a compatible release even if a newer major also exists. Existing candidates, including held and completed work, are reused instead of creating daily duplicates.

## Follow a package bead

A package uses the same bead throughout its lifecycle:

| Phase | Owner | Result |
| --- | --- | --- |
| `prepare` | One of three workers | A verified local commit and preserved clone |
| `ready` | Singleton publisher | One commit applied above current main |
| `landed` | Closed bead | Confirmed remote commit and recorded evidence |
| `review` | Blocked, unassigned bead | Evidence for manual review, no automatic retry |

Clones and commit artifacts live under `$GC_CITY/.gc/dependency-updates/<bead-id>/`. The registered rig checkout is never edited. Workers pass the same bead to the publisher with a guarded atomic update, so there is no separate reopen-and-route window. On restart, agents inspect their existing evidence and remote history before repeating work. Successful scans and confirmed updates remove their owned clones after recording evidence. Review and uncertain-publication artifacts remain available.

Workers run frozen-lock installation, focused checks, and affected `bun run verify`. The publisher reruns relevant verification when applying a commit changes its verified tree or base. Local production builds are skipped. Vercel builds after publication, and a failed deployment does not automatically revert the commit. Existing check failures are recorded for review, not suppressed or fixed by this order.

These are agent instructions, not a deterministic dependency policy or Git authorization gate. Gas City provides pool caps and atomic bead claims. Git rejects non-fast-forward pushes. Compatibility and diff-scope checks remain agent judgments. Three preparation slots bound parallel work, not spending or completion time. No throughput or cost saving has been measured.

## Install and inspect

The existing `update-one` order name is retained so upgrading the pack preserves its daily execution history. It now runs `scan-updates`, not a single-package update. Before importing into a new running city, set `enabled = false` in `orders/update-one.toml`, validate the configuration, then enable it. A newly enabled order may run immediately because Gas City catches up missed cron slots.

Add this under the existing `personal-site` rig in `city.toml`:

```toml
[rigs.imports.deps]
source = "/Users/benjaminschachter/personal-site/gascity/dependency-updates"
```

```sh
gc lint gascity/dependency-updates
gc --city "$HOME/personal-site-city" config show
gc --city "$HOME/personal-site-city" formula show scan-updates --rig personal-site
gc --city "$HOME/personal-site-city" order show update-one --rig personal-site
gc --city "$HOME/personal-site-city" order history update-one --rig personal-site
gc --city "$HOME/personal-site-city" --rig personal-site bd list --all --limit 0 --label dependency-update --json
```

The machine must be awake, Gas City running, the pinned Bun version installed, and registry and GitHub access available. Do not create additional scanner or publisher sessions manually. `gc order run update-one --rig personal-site` starts real work and can lead to pushes; it is not a dry run. Setting `enabled = false` stops future scans but does not cancel queued or active package work.
