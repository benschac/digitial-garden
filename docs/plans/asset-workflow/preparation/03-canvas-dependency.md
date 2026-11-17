# PRE-03: Qualify and add the chosen canvas dependency

Bead: `ps-cdek.3`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Prerequisites: Confirmation of the canvas library choice

## What it delivers

Qualify the proposed React Flow core library against the current app and add only the approved package and lockfile changes. Record a reproducible compatibility result before downstream UI work starts.

## Acceptance criteria

- [ ] Confirm the exact version and peer compatibility using owning package metadata at execution time.
- [ ] Use the existing app's React, Next, compiler, and styling setup for a real client import/render smoke check.
- [ ] No Effect, React, Next, provider SDK, database, or unrelated dependency upgrades are included.
- [ ] The required full verification/build gate passes and the lockfile delta is reviewed.
- [ ] Qualification evidence records imports, style requirements, tested version, and limitations. An install alone is not success.
- [ ] If the library is rejected or existing capabilities suffice, record the decision and skip the addition rather than landing an unused alternative.

## Ownership and validation

The selected app dependency and lockfile, plus concise compatibility evidence. One writer owns these files. Any retained compatibility fixture is isolated from the public product.

Perform dependency and actual app compatibility checks in an isolated checkout. Temporary smoke code is not product scaffolding. No generation API calls or template purchases.

Follow the [engineering evidence](../engineering-evidence.md) and [early landing policy](../landing-first.md). Read the current repository instructions and standard-library directory before changes.

This is a proposed independently landable diff, not authorization to install, publish, dispatch, or merge it.
