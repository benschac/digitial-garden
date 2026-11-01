# Rat Stack adoption

These Rat Stack principles were inspected in the `meeeeed` checkout. The inventory preserves that repository and its original paths as source provenance.

The [inventory](ratstack-inventory.json) records every file in the inspected checkout's `.brain/resources/lore` and `.brain/data/learn-cards`, plus 38 related archive and tooling files. The snapshot contains 121 lore files, 27 learn-card files, and 38 related files: 186 items total. This is exhaustive for those two directories, not for the entire `.brain` or source repository.

Each item records the source path, SHA-256 of the inspected bytes, disposition, reason, and local destination. The repository URL and Git revision identify the checkout; content hashes identify the inspected bytes even when a file differs from that revision. Files were read from the local checkout. This receipt does not claim that the source worktree was clean or that the archived prose is current product authority.

## Dispositions

- **Adopted:** a principle is represented in local guidance, a catalog entry, or an executable check. Review-only policies remain review-only; adoption does not assert a runtime subsystem exists. Original snippets are not copied API authority.
- **Reference:** useful research or future design context without an installed local implementation. Follow its source path in the recorded repository when needed.
- **Excluded:** historical speaker material, incompatible source-stack details, or tooling that would silently change this project's framework or build ownership.

The [engineering policies](engineering-policies.md) cover applicable principles beyond today's implementations. The [catalog](catalog.md) routes those principles and existing owners. Pinned library mirrors continue to own API evidence.

## Tooling decisions

The executable-fixture approach from the pattern and boundary plugins is adopted through the local import checks and real-Oxlint fixtures. Their Cloudflare request-lifetime assumptions, Foldkit conventions, capability registry names and source-specific allowlists are not copied wholesale. In particular, a prohibition on every shared pending cache would conflict with this application's intentional shared-request owner.

The existing source-reference tooling already supplies exact commits, package checks, dirty-mirror protection and upgrade discovery. It remains the owner instead of importing the source repository's refresh script. Catalog source receipts add decision invalidation on pin changes.

`find-peers.ts` remains a research reference: it queries Sourcegraph for package families and ranks candidates, not verified exact-version implementations. The source-specific checker-bump script and audited regex allowlist are excluded; they target a different package manager, checker setup and content parser. Learn-card fixtures are evidence of selected syntax checks, not proof that examples typecheck or behave correctly. Local owners and their behavior tests remain the preferred examples.

This inventory is a recorded adoption decision, not a live upstream synchronization service. A later source refresh must compare bytes and revisit dispositions. It must not automatically replace local rules, update dependency pins, or mark a review-only policy as enforced.

## Inventory tooling

`bun run ratstack:adoption search <concern>` finds adoption decisions by their source names and rationale. `ratstack:adoption:check` validates the receipt and local destinations as part of pattern verification. `bun run ratstack:adoption audit /path/to/meeeeed` additionally compares the recorded revision, complete directory inventory and file hashes against a source checkout; it does not fetch or change that checkout. The grounding ledger under `.brain/data/lore` is included as claim provenance, not application authority.

## Additional brain search scope

The follow-up inventory inspected every top-level resource document and every area document, including the historical systems for the agent front door, learning, durability, capabilities, devtools, flags, database and auth. It also inspected the lore-graph, Git-snapshot and Layer-startup project notes. These identify useful graph traversal and export-provenance ideas, but their archived implementation descriptions are not proof of current runtime wiring. The repository-native catalog already supplies related-entry traversal; a full graph service, teaching-history store or exported-source build pipeline remains a separately scoped implementation.

Other historical project/task documents, CAFE news, Foldkit comparison artifacts, product proof datasets and dated peer-refresh reports were discovered by path but are not claimed as fully audited or adopted. No separate systems or skills directory exists inside this `.brain`; the area documents link to historical system and skill routes.
