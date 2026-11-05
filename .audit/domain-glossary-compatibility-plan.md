# Domain glossary compatibility plan

This is a read-only integration plan for existing ps-vgt. No skill, document, lock or immutable request changed.

Current root CONTEXT.md contains five definitions for Resource, Resource Type, Topic, Draft Resource and Published Resource. GLOSSARY.md is absent. Installed tdd already reads GLOSSARY.md. Installed codebase-design/DESIGN-IT-TWICE.md still reads CONTEXT.md, but its exact retained ps-bnw target at mattpocock/skills revision 4ae2317ddb22b046e26455e4f9c9b3aaaf62212d already reads GLOSSARY.md. The target domain-modeling at that same revision writes GLOSSARY.md exclusively. Historical claims that current tdd still consumes CONTEXT.md are stale.

The smallest final compatible tree contains the upstream-exact domain-modeling target, the upstream-exact codebase-design target, and the existing five definitions at root GLOSSARY.md. Preserve every glossary definition byte and rely on Git history for the old path. A custom edit to the vendored codebase-design consumer is unnecessary. Do not leave independently writable CONTEXT.md and GLOSSARY.md glossaries.

Mayor should bind this compatibility migration to the current existing roots after the archive and receipt repair. Prepare an isolated final tree and a concrete reviewed delivery sequence. The ordinary updater permits one skill and its exact source identity; root document migration or coupled source changes need a separate explicit provenance and scope handoff. Do not weaken that checker, modify old requests, reset attempts or publish an intermediate incompatible tree. The handoff must reconcile its delivery sequence with the one-skill-per-commit policy before claiming eligibility.

Acceptance requires exact upstream source and installed hashes for each skill, byte-preserved definitions in GLOSSARY.md, current consumer discovery against the actual integration tree, the required focused and affected checks, independent review and guarded fresh-remote publication proof. This plan establishes a concrete compatibility path, not qualification, acceptance or authorization to rewrite current project documents.

Read evidence includes current CONTEXT.md, installed tdd/SKILL.md:10, installed codebase-design/DESIGN-IT-TWICE.md:30, retained ps-bnw request.json and source/repo/skills/engineering/codebase-design/DESIGN-IT-TWICE.md:30, and retained ps-vgt source/skills/engineering/domain-modeling/SKILL.md and GLOSSARY-FORMAT.md. No candidate workload ran.
