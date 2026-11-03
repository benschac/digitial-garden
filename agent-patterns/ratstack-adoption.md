# Rat Stack adoption

The [inventory](ratstack-inventory.json) records Rat Stack material inherited by the `meeeeed` checkout. It preserves the source repository, revision, paths and content hashes. Local adoption decisions remain separate from source discovery.

The index covers all 242 tracked `.brain` files at revision `20afc6d3ea8980d133f3b3014d018ba1e37b58a0`, plus nine tooling files. This includes lore, resources, areas, projects, tasks, learn cards and other datasets. The earlier adoption pass classified 186 files. The additional 65 files are indexed as historical references, without claiming they have been reviewed or adopted.

Each item records its source path, SHA-256, disposition, rationale, local destinations and searchable terms derived from the source bytes. Terms are sorted, unique lowercase words and numbers. Searches can find words inside documents without needing the sibling checkout or a network connection. The index does not retain word order or support phrase search. Use the original document to understand a match.

The archive's own `.brain/index.svx` identifies its pages as historical evidence, not current instructions. Archived implementation claims do not establish current behavior in either project. The current Rat Stack website and this recorded archive can differ.

## Dispositions

- **Adopted:** a principle is represented in local guidance, a catalog entry, or an executable check. Review-only policies remain review-only; adoption does not assert a runtime subsystem exists. Original snippets are not copied API authority.
- **Reference:** historical research, project records or future design context without an adopted local implementation. Automatically indexed files remain in this category until reviewed. Follow the pinned source link before applying a principle.
- **Excluded:** historical speaker material, incompatible source-stack details, or tooling that would silently change this project's framework or build ownership.

The [engineering policies](engineering-policies.md) cover applicable principles beyond today's implementations. The [catalog](catalog.md) routes those principles and existing owners. Pinned library mirrors continue to own API evidence.

## Tooling decisions

The executable-fixture approach from the pattern and boundary plugins is adopted through the local import checks and real-Oxlint fixtures. Their Cloudflare request-lifetime assumptions, Foldkit conventions, capability registry names and source-specific allowlists are not copied wholesale. In particular, a prohibition on every shared pending cache would conflict with this application's intentional shared-request owner.

The existing source-reference tooling already supplies exact commits, package checks, dirty-mirror protection and upgrade discovery. It remains the owner instead of importing the source repository's refresh script. Catalog source receipts add decision invalidation on pin changes.

`find-peers.ts` remains a research reference: it queries Sourcegraph for package families and ranks candidates, not verified exact-version implementations. The source-specific checker-bump script and audited regex allowlist are excluded; they target a different package manager, checker setup and content parser. Learn-card fixtures are evidence of selected syntax checks, not proof that examples typecheck or behave correctly. Local owners and their behavior tests remain the preferred examples.

The index command rebuilds derived search terms at the recorded revision. It does not advance that revision or adopt new rules. Updating the source revision requires a separate review of changed bytes and dispositions. It must not automatically replace local rules, update dependency pins, or mark a review-only policy as enforced.

## Inventory tooling

Start non-trivial implementation and review with `bun run patterns consult <concern>`. It returns local catalog decisions and matching source records together. Source links also connect matches back to applicable catalog entries. Read those entries and sources before choosing an implementation. Report the decision the evidence changed, or why the source does not apply.

- `bun run patterns consult "hexagonal architecture"` finds local boundary policy and original source material.
- `bun run patterns consult <concern> --json` returns separate `patterns` and `references` arrays.
- `bun run ratstack:adoption search <concern>` searches source paths, rationales, local destinations and indexed document terms.
- `bun run ratstack:adoption show <source-path>` returns the source record and immutable repository link.
- `bun run ratstack:adoption read <source-path> /path/to/meeeeed` reads source text after checking its revision and hash.
- `bun run ratstack:adoption index /path/to/meeeeed` rebuilds the term index and adds missing tracked brain files as references. It preserves existing adoption decisions and rejects changed source identity or existing content.
- `bun run ratstack:adoption audit /path/to/meeeeed` verifies all tracked brain files are represented and checks source hashes and indexed terms. Ignored files do not enter the inventory.

After rebuilding the index, run `bun run format agent-patterns/ratstack-inventory.json` and the source audit. Normal `patterns:check` and `bun run verify` validate records and local destinations without needing the source checkout. These checks prove retrieval and provenance constraints. They cannot prove that an agent read the source or applied its guidance correctly.

## Architecture and adoption boundaries

The `domain-boundaries` entry adapts hexagonal architecture by keeping application job contracts with their owner and supplying provider adapters at composition. Existing Next.js, React and Bun owners still govern implementation. That entry is review policy. It does not establish a repository-wide hexagonal import rule or prove provider interchangeability.

Brain areas describe historical systems, and resource pages link to procedures and source evidence. All are now searchable, including project/task documents, CAFE news, Foldkit comparisons, proof datasets and peer-refresh reports. Their presence in search is not an instruction to build those systems. A full graph service, learning-history store or architecture migration needs its own concrete application requirement and behavioral verification.
