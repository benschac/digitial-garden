# Domain documents

Use a single root domain-document context for now. This setup does not create a multi-context migration.

Read `GLOSSARY.md` if it exists. The existing [CONTEXT.md](../../CONTEXT.md) contains the Personal Knowledge Library vocabulary and remains unchanged. Read it when working on that domain. If a future `GLOSSARY-MAP.md` exists, follow its context links.

Read relevant ADRs under `docs/adr/` if present. Missing glossary or ADR files do not block work; create domain records when a real term or decision is resolved, rather than adding empty scaffolding.

The [asset spec](../specs/asset-workflow.md) defines project, asset, style revision, run, approval, and layer set. Use those terms consistently in its tickets and code.

Repository AGENTS instructions, [pattern source lookup](../../agent-patterns/README.md), [adoption records](../../agent-patterns/ratstack-adoption.md), and current owning code take precedence over historical brain examples. Raise conflicts with existing domain decisions rather than silently replacing them.
