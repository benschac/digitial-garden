# PRE-01: Publish the approved workflow documentation

Bead: `ps-cdek.1`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Prerequisites: Approval of the spec, ticket breakdown, and tracker/stack mapping

## What it delivers

Place the approved product spec and execution guidance in the owning repository, configure the Matt skills' custom tracker documentation for Gas City Beads, and preserve the explicit separation between preparation and implementation.

## Acceptance criteria

- [ ] The source spec, tickets, and engineering evidence are accessible to fresh workers in the owning repository.
- [ ] Tracker instructions identify the city and rig, native blocking relationships, and mapping of provisional IDs to future bead IDs.
- [ ] Graphite instructions assign one metadata owner and specify dependency-base selection and review scope.
- [ ] No live beads, readiness labels, dispatch, scheduler changes, or implementation commands run as a side effect.
- [ ] Existing AGENTS guidance is updated minimally after the required configuration review; no duplicate instruction system is introduced.

## Ownership and validation

Documentation and reviewed tracker configuration only. Existing city configuration and runtime packs are outside this diff.

Validate links, instruction consistency, and repository formatting. This documentation does not claim that Gas City stack integration has been implemented.

Follow the [engineering evidence](../engineering-evidence.md) and [early landing policy](../landing-first.md). Read the current repository instructions and standard-library directory before changes.

This is a proposed independently landable diff, not authorization to install, publish, dispatch, or merge it.
