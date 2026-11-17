# Issue tracker

Use Gas City Beads for this repository's engineering-skill tickets.

- City: `/Users/benjaminschachter/personal-site-city`.
- Rig: `personal-site`.
- Invoke rig operations through `gc bd --rig personal-site` from the city directory.
- Use one epic per feature and one persistent child issue per approved slice.
- Use native blocking dependencies. Parent-child grouping and Graphite ancestry do not replace those edges.
- Read descriptions and comments before changing existing issues. Preserve existing parent issues.
- Use structured arguments or body files for writes. Capture returned IDs and record a receipt; reconcile partial imports instead of blindly repeating them.

## Current authorization

The asset-workflow backlog is authorized for publication only. Create its epic and children as `blocked`, with no assignee, routing metadata, timed defer, or readiness label. Do not cook a formula, create a convoy, sling work, or release status without separate implementation authorization.

The `ready-for-agent` default in to-tickets is overridden by this hold. A ready query excludes blocked issues, but explicit routing is still prohibited. Verify the statuses and dependencies after publication.

## Planning and execution

Use [the asset workflow plan](../plans/asset-workflow/README.md), [tracker adapter](../plans/asset-workflow/gas-city-tracker.md), and [stack policy](../plans/asset-workflow/stack-workflow.md). The local receipt maps provisional identifiers to real Beads IDs.

Do not invoke both a fresh task-decomposition workflow and this existing ticket graph without verifying how the workflow consumes existing IDs. Avoid duplicate implementation issues.

Graphite owns diff ancestry. The coordinator owns stack metadata, joins, and restacks. No code commit, push, PR creation, or merge is authorized by publishing tickets.

For future features, establish their execution authorization explicitly; do not inherit the asset feature's scope or silently reuse dispatch labels.
