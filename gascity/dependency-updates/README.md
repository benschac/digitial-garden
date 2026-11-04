# Run daily dependency updates

At 09:00 America/New_York, the scanner inventories all direct dependencies and devDependencies. Each eligible package gets one persistent bead. Eight `gpt-6-luna` workers with low reasoning effort can prepare updates concurrently in separate clones. A single publisher lands their commits one at a time directly on `benschac/digitial-garden` main.

Each commit contains one package's affected `package.json` declarations and the root `bun.lock`, including necessary transitive changes. Subjects name the actual bump, such as `chore(deps): bump turbo from 2.11.9 to 2.11.10`. Preparation workers do not push. The publisher applies each commit above current main. If manifests or the lockfile conflict, it reapplies only the selected version change and runs `bun install` to regenerate the lockfile. It preserves updates already landed below it. Conflicting versions of the selected package require review.

Stable minor and patch updates within the current major are eligible. For `0.x`, only updates within the current minor qualify. Breaking or uncertain changes, prereleases, coupled upgrades, and packages in `scripts/agent-sources.json` remain blocked for review. The scanner chooses a compatible release even if a newer major also exists. Existing candidates, including held and completed work, are reused instead of creating daily duplicates.

The [current operator authorization](SUPERVISION.md#current-operator-authorization) applies to every role. The temporary blanket no-commit restriction was lifted on 2026-11-04 for this normal compatible-update workflow. Future pauses must stop the affected scanner, worker, or publisher roles as well as updating the policy.

## Follow a package bead

A package uses the same bead throughout its lifecycle:

| Phase | Owner | Result |
| --- | --- | --- |
| `prepare` | One of eight workers | A verified local commit and preserved clone |
| `ready` | Singleton publisher | One commit applied above current main |
| `landed` | Closed bead | Confirmed remote commit and recorded evidence |
| `review` | Blocked, unassigned bead | Evidence for manual review, no automatic retry |

Clones and commit artifacts live under `$GC_CITY/.gc/dependency-updates/<bead-id>/`. The registered rig checkout is never edited. Workers pass the same bead to the publisher with a guarded atomic update, so there is no separate reopen-and-route window. On restart, agents inspect their existing evidence and remote history before repeating work. Successful scans and confirmed updates remove their owned clones after recording evidence. Review and uncertain-publication artifacts remain available.

Workers run frozen-lock installation, focused checks, and affected `bun run verify`. Preparation stays parallel, but the script admits one affected verification at a time per city through `flock`. This prevents concurrent cold MDX test compilers from exhausting the test timeout; assertions and timeouts stay unchanged. The publisher reruns relevant verification when applying a commit changes its verified tree or base. Local production builds are skipped. Vercel builds after publication, and a failed deployment does not automatically revert the commit. Existing check failures are recorded for review, not suppressed or fixed by this order.

The preparation script enforces declaration and direct-resolution scope, records checks and captures the commit SHA. Compatibility and necessary transitive lock changes remain agent judgments. Gas City provides pool caps and atomic bead claims. Git rejects non-fast-forward pushes. This is not a Git authorization gate. Eight preparation slots bound parallel work, not spending or completion time. No throughput or cost saving has been measured.

## Continue through blocked work

[The Mayor supervision contract](SUPERVISION.md) owns the queue through verified publication or explicit user deferral. Three native orders share a wake helper: `supervise-updated`, `supervise-closed`, and `supervise-catch-up`. The catch-up runs every five minutes because native event cursors can advance even when an exec action fails. An unchanged unfinished queue gets at most one reminder every fifteen minutes, and pending reminders coalesce. These are conservative operating cadences, not measured response-time guarantees.

The helper reads Beads as the source of truth, fingerprints relevant state rather than notes or timestamps, and serializes its small notification cache with `flock`. It uses `session nudge --delivery wait-idle` to request a managed wake and respect busy or permission-gated sessions. It records accepted wake receipts atomically in `$GC_CITY/.gc/dependency-updates/supervision/wake.json`. A receipt proves delivery or durable queuing, not that the Mayor finished the work. Terminal reminders stop only after the Mayor records a matching `dependency_supervision_ack` on the standing city task. The helper's `--snapshot` mode supplies the canonical identity, including historical closed records so a new batch cannot reuse an old acknowledgement. Gas City owns scheduling, cancellation, and wake recovery; the helper has no background process. Corrupt reads or state fail visibly and require repair instead of pretending the queue is empty. The shell entrypoint retains `flock` to serialize invocations, then executes the TypeScript helper with Bun. The TypeScript workflow uses Effect Schema for JSON validation, Effect for reminder orchestration and scoped receipt cleanup, and `BunRuntime.runMain` for signal handling. Only the helper retains the lock descriptor; commands and detached reminder pollers do not inherit it. Graceful cancellation terminates and awaits active commands while the helper retains the lock. Execa runs `gc` and `jq`; `jq` preserves snapshot values during projection, comparison, and serialization so existing acknowledgement hashes stay valid. Install the root workspace dependencies before running the helper.

Supervision adds scoped diagnosis, source qualification, compatibility repairs, and reviewed coupled upgrades. Ordinary one-package workers retain their restrictions. The Mayor must arrange a separate reviewed integration handoff for remediation patches outside that publisher contract. Failed attempts remain preserved, and only a concretely resolved blocker permits a fresh attempt on the same bead.

The three supervision orders are enabled for this city. Before importing the pack into another running city, disable them until its Mayor has accepted the supervision contract. Enable them together after review, validate with `gc lint gascity/dependency-updates`, and reload the city. Inspect each order's history and the Mayor's acknowledgement before claiming activation. Do not start an extra Mayor session. Disabling these orders stops future wakes; it does not cancel already claimed or queued work. The existing daily scan is controlled separately.

```sh
gc --city "$HOME/personal-site-city" order show supervise-catch-up --rig personal-site
gc --city "$HOME/personal-site-city" order history supervise-catch-up --rig personal-site
gc --city "$HOME/personal-site-city" nudge status mayor --json
```

## Prepare with one command

Workers review compatibility, then invoke the registered rig's `scripts/dependency-prepare.mjs` with an absolute JSON request path:

```sh
node /path/to/rig/scripts/dependency-prepare.mjs /absolute/request.json
```

The request names one bead, one package, an exact target and all existing declarations:

```json
{
  "city": "/absolute/path/to/city",
  "bead": "ps-example",
  "package": "turbo",
  "target": "2.11.10",
  "declarations": [
    { "path": "package.json", "section": "devDependencies", "from": "2.11.9" }
  ]
}
```

The command clones GitHub main into `<city>/.gc/dependency-updates/<bead>/prepare-script/checkout`. It checks the Bun pin, declaration coverage, version eligibility, source exclusions, manifest scope and unrelated direct lock resolutions. It regenerates the lock with install scripts disabled, runs frozen installation and affected verification, then creates one commit. It never pushes or requests a production build.

`prepare-script/result.json` records the request, base, commit, tree and command results. `commands.log` preserves output and timings. Repeating a successful request validates and returns the same artifact. Failed or interrupted attempts remain preserved and require review before another attempt. Existing legacy `prepare` artifacts remain supported by the publisher.

Release compatibility, engines, peers and necessary transitive lock changes still require worker review. The command produces a candidate commit, not publication authorization. The publisher retains its independent checks and serialized direct-to-main landing procedure.

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

The machine must be awake, Gas City running, the pinned Bun version and `flock` installed, and registry and GitHub access available. Do not create additional scanner or publisher sessions manually. `gc order run update-one --rig personal-site` starts real work and can lead to pushes; it is not a dry run. Setting `enabled = false` stops future scans but does not cancel queued or active package work.
