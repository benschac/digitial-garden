# Preserve the existing skill customizations

Read-only source comparison found concrete integrations for ps-syv and ps-6of. No source, lock, immutable request or candidate was edited. These are prerequisites for a separately reviewed customization integration, not ordinary updater adoption or accepted changes.

## Tailwind design system, ps-syv

Source wshobson/agents at7e2fb559cf4b824b27f1fec49fe88f7511066d26. Exact target directory hash4e5bfe5af9b5da504752432dc45ed605af350cf1489a58419afad4123a514f89. Current SKILL.md and references/advanced-patterns.md already equal the target. references/details.md differs because upstream restores the RHF/Zod login example intentionally removed by5e3b476 and fixes two relative links.

Preserve the Effect Schema paragraph and omitted Zod example. Take only the two ./advanced-patterns.md link corrections. Independently computed merged installed hash b3e36b3593ce51472b14e591e29e96e9e7fccf737973b31b3055302b13d45943, subject to revalidation against actual integration bytes.

## React view transitions, ps-6of

Source vercel-labs/agent-skills at1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62. Exact target hash6c9169eb561dcdea32408e2525a2eb5375d709dd8dbb3412b895e6c58a8dc22e. All five reference files and README match current customized content byte-for-byte. Remaining differences are two non-Next React availability sentences in SKILL.md/AGENTS.md plus metadata.json. The exact metadata blob aabe3e140c433367818fd1ece9455c336db93111 was deliberately deleted in9033709.

Take the two availability updates and keep metadata absent. Independently computed merged installed hash8225f482d41487ec0e3eabdc517df95ac7d4290d7dd74079637d3867b0bae5e0, subject to revalidation against actual integration bytes.

## Existing validator remains strict

scripts/skill-update.mjs correctly requires baseline lock identity, original content hash, exact target hash and exact pinned upstream file bytes. These merged variants differ from upstream and the current recorded baseline lock is stale. Do not change immutable requests, replace installed hashes with upstream hashes, or weaken the ordinary source-exact checker.

The existing Mayor should arrange a separate scoped integration/provenance handoff on the same source beads. Record upstream identity and upstream hash separately from merged installed content identity. Preserve prior requests, failed attempts, exact local customizations and lock fields. Require one skill per commit, focused diff/hash/source review, the relevant real qualification, a guarded fresh-remote publication owner and explicit acceptance. No new semantic decision is needed merely to preserve the already committed local intent; any metadata policy change or upstream-exactness exception must be explicit in that handoff rather than disguised as an ordinary candidate.
