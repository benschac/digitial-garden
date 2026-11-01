# Pattern catalog

The [catalog](catalog.json) connects task concerns to existing application owners, source evidence and checks. Start with the concern, follow related entries, then read the owning code. Follow the [source lookup workflow](README.md) before changing library-dependent behavior. The catalog is navigation and recorded decisions, not an API recipe book or a replacement for review.

The [Rat Stack adoption record](ratstack-adoption.md) accounts for the inspected brain's lore, learn cards and related tooling. Use `bun run ratstack:adoption search <concern>` to find what was adopted, retained as reference or excluded. The [engineering policies](engineering-policies.md) cover additional applicable principles, explicitly as review guidance where no local runtime implementation exists. `bun run ratstack:adoption audit /path/to/meeeeed` checks the imported inventory against its source bytes; normal verification checks the receipt and local destinations without requiring that checkout.

## Reading an entry

- `concerns` supplies search terms; `related` connects adjacent decisions.
- `decision` states the local choice; `owners` points to its implementation.
- `sources` records source mirror identity and paths inspected. An empty list means no upstream evidence is recorded for that entry: complete the source lookup before changing library APIs. A source list does not claim an exhaustive upstream audit.
- `references` provides external rationale, subordinate to local instructions and installed source.
- `checks` names an existing check or documentation owner and the limited claim it supports. A static documentation reference describes policy, not executable enforcement. Run the relevant checks before claiming behavior is verified.
- `exceptions` protects intentional framework adaptations; `gaps` keeps missing proof visible.

## Adapters and cartridges

Name the application job and its contract before selecting a vendor. Keep provider calls behind the existing integration boundary, inject the implementation at composition, and identify who closes every owned resource. Preserve errors and cancellation across that boundary. Existing plain interfaces and Promise facades are valid adaptations; introducing a service package is not automatically an improvement.

For a cartridge, identify its public exports, provider implementation, resources, composition point and dependent callers. Test replacement against the same contract. Verify removal against real imports and configuration. Import boundaries establish dependency direction, but cannot establish that a replacement provider preserves semantics or that infrastructure can be deleted safely.

## Maintaining evidence

When changing an owner, check its entries and related patterns. When upgrading dependencies, compare the source manifest with recorded source identities and re-read affected guidance, implementation and tests before updating the receipt. Do not mechanically refresh commits to silence drift. Add new recurring decisions with an executable rejection fixture or behavior test where practical; explicitly label review-only requirements.

Prefer links to tested application owners over duplicate learn snippets. This avoids maintaining a second implementation that can pass independently while the product regresses. External Rat Stack material remains a reference; its historical brain, runtime stack and provider policies are not imported as project authority.

Catalog validity establishes discoverability and recorded provenance. Passing tests establishes their stated coverage. Neither proves universal correctness, actual provider behavior, or a measured improvement in agent output.
