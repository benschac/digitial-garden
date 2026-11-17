# PRE-02: Add a small layered reference fixture

Bead: `ps-cdek.2`. Parent: `ps-cdek`. Status: Published to Beads as blocked and unassigned. Implementation is not authorized. Prerequisites: None

## What it delivers

Add a small deterministic composition and transparent layers with recorded dimensions, positions, order, and provenance. Preview and export work can use it without paid generation.

## Acceptance criteria

- [ ] Fixture bytes come from owned existing artwork or a deterministic synthetic sample; provenance is recorded.
- [ ] The set includes real alpha transparency, overlapping layers, a hidden-layer example, and known placement metadata.
- [ ] Expected static composition and dimensions are documented for offline comparison.
- [ ] A small validation check confirms files, dimensions, transparency, and metadata consistency.
- [ ] The fixture contains no credentials or temporary provider URLs and avoids copying the full existing asset directory.

## Ownership and validation

Test fixtures and their narrowly scoped validation. No runtime import or public asset publication.

Validate the actual image bytes and assembled fixture. Tests that consume it remain with their owning feature diffs.

Follow the [engineering evidence](../engineering-evidence.md) and [early landing policy](../landing-first.md). Read the current repository instructions and standard-library directory before changes.

This is a proposed independently landable diff, not authorization to install, publish, dispatch, or merge it.
