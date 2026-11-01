# Repository conventions

## Learning more about Effect

This repository uses the Effect TypeScript library. Before writing Effect code, read `apps/web/node_modules/effect/AGENTS.md` completely and follow its required links. For APIs and concepts the guide does not cover, search `apps/web/node_modules/effect/src`.

## Code comments

- Do not add new code comments, including JSDoc, unless the user explicitly requests them.
- Prefer clear names and straightforward code. Explain non-obvious decisions in the change summary instead.

## TypeScript assertions

- Prefer inference, accurate generics, discriminated unions, narrowing, and `satisfies` over type assertions. Fix the owning type relationship before casting at a call site.
- Assertions are appropriate at dynamic boundaries when TypeScript cannot express a verified runtime relationship, such as a heterogeneous registry or a library interop limitation. Dynamic data alone is not justification: validate external input, or identify the construction invariant that guarantees the asserted type.
- Keep a necessary assertion narrow and local to the boundary. Explain the invariant and why inference or narrowing cannot express it in the change summary; verify that invariant with a focused check or test.
- Do not use `any`, double assertions (`as unknown as T`), non-null assertions, or unchecked type guards to silence an error. `as const` is appropriate for preserving literal and readonly inference.

## Standard libraries and reusable hooks

- Before adding a dependency, utility, or browser lifecycle effect, check [the standard-library directory](docs/standard-libraries.md) and the owning package's exports.
- Reuse existing hooks for abortable work, animation frames, events, media queries, and observers when their lifecycle matches the feature. Extend a shared hook compatibly when a reusable capability is missing; keep feature-specific rendering and state in the app.
- Do not hide reactive dependencies just to use a helper. Check cancellation on restart/unmount, Strict Mode replay, async initialization, and observer readiness when refactoring effects.
- If a native API is needed because the shared helper cannot express its lifecycle, explain that reason in the change summary rather than forcing the abstraction.
- Update the directory when adding or changing a shared API so future work can discover it. These are project-owned defaults, not permission to add dependencies.

## Tailwind class readability

- Split long Tailwind class lists into multiple string arguments to `cn()`, grouped by concern such as layout, appearance, typography, and interaction states.
- Keep short class lists on one line. When regrouping existing classes, preserve every class and its order so class merging behavior stays unchanged.
- Keep the caller's `className` as the last argument so overrides continue to work.
- Use Tailwind Variants (`tv`) when a component needs variants; do not introduce it solely to wrap a long class list.
- Use the project-local Bun formatter through `bun run format`. Do not add a formatter dependency or enable experimental class-sorting rules solely for readability.

## Style ownership

- Shared UI owns appearance and internal layout. Pages own placement, available width, and spacing between components.
- Prefer Tailwind for shared components and ordinary composition; use app CSS Modules for complex grids, motion, and authored prose.
- Apply classes to explicitly owned elements. Avoid page descendant element selectors and equivalent Tailwind arbitrary variants that reach into nested components.
- Keep page-specific typography and canvas recipes in `apps/web`; reserve `packages/ui` for reusable roles.
- Namespace page tokens (`--blog-*`, `--experiment-*`); do not reuse shared UI semantic tokens for unrelated page values.
- Put app component/module styles in `@layer components`. Declare `@layer theme, base, reset, components, utilities;` before each component stylesheet block: Next may load a module before globals, so the first loaded stylesheet must establish the same order.
- Authored prose must honor `data-prose-exclude` on embedded component roots and descendants. Inherited fonts/colors remain an explicit consumer choice.
- Verify boundary changes with the development `/style-boundaries` fixture at desktop and mobile widths, alongside relevant checks.

## Blog writing style

- Before drafting or editing blog posts in `apps/web/content/posts/`, read [the blog writing style guide](docs/writing-style-guide.md).

## Verification fence

- Keep tests proportional to the behavior at risk. Prefer existing coverage and the smallest focused regression test; use static checks or a smoke check for simple configuration and vendor wiring. Avoid suites that restate implementation details or exhaustively mock third-party behavior. Explain the concrete failure a new test would catch before adding it.
- Run `bun run verify` before delivery. Turbo selects affected lint, format, tooling-test, typecheck, and application-test tasks from their declared inputs and reuses successful cached results. Use `TURBO_SCM_BASE=HEAD TURBO_SCM_HEAD=HEAD bun run verify` to check only current uncommitted changes; the default compares the branch against `main`. Content generation is a shared prerequisite. Run `bun run verify:full` for build/configuration changes and before release; CI runs this full gate. Do not suppress failures or weaken checks to pass.
- Shared package source must not import app-owned code. Apps consume shared packages through their public exports, not `src` paths.
- TypeScript suppression directives (`@ts-ignore`, `@ts-nocheck`, and `@ts-expect-error`) are prohibited. Fix the owning type relationship.
- Necessary assertions follow the policy above; explain their invariant in the change summary, not a safety comment.

## Rat-stack engineering reference

Use [rat-stack](https://ratstack.sh/llms.txt) as an engineering reference for this project. Read its [vision](https://ratstack.sh/VISION.md) for intent and [agent rules](https://ratstack.sh/AGENTS.md) for its working contract, then adapt them to this repository. Consult relevant material on demand before non-trivial implementation or review:

- [Lore](https://ratstack.sh/lore): read the principles behind the decision, including their source evidence and limitations.
- [Skills](https://ratstack.sh/skills): select the matching procedure through [rat-stack-mode](https://ratstack.sh/skills/rat-stack-mode). Typical matches are gardener for guardrails, investigate-a-failure for diagnosis, and durability for resource ownership and failure handling.
- [Systems](https://ratstack.sh/systems): inspect the relevant implemented system, its behavior, standard, and checks before borrowing its design.
- [Glossary](https://ratstack.sh/glossary): use its definitions consistently; follow linked explanations when a term affects a design decision.

Search by the concrete task, read the matching pages and owning source, and identify which principle changes the implementation or verification. If the reference is unavailable, report that limitation; do not invent its rules. Index pages alone are not implementation guidance.

Apply these principles through the existing project boundaries:

- Use Effect for typed failures, dependencies, cancellation, concurrency, and resource ownership where those concerns justify it. Reuse the owners in [the standard-library directory](docs/standard-libraries.md). React retains UI state and component lifecycle; simple rendering and pure calculations need no Effect wrapper.
- [Execute Effects at integration boundaries](https://ratstack.sh/lore/run-effect-at-the-boundary). Give managed runtimes an explicit owner and disposal path; keep reusable Effect operations composable.
- [Register resource cleanup with its owner](https://ratstack.sh/lore/scopes-own-resources). Verify release after success, failure, and cancellation, including resources acquired after cancellation.
- Validate external data before application use, preserve expected failures, and keep provider implementations behind application-owned interfaces where an abstraction is justified.
- Use Alchemy as the reference for new infrastructure work: inspect provider support and installed APIs, declare resource ownership, and review a plan before applying changes. This does not authorize a hosting migration, dependency addition, or deployment.
- Prefer enforceable types, lint rules, and behavioral tests over additional prose. A new guardrail needs a fixture that demonstrates it rejects the prohibited behavior.

Installed versions, actual owning code, and this repository's instructions govern adaptations. Rat-stack's package manager, Foldkit, Cloudflare, test harness, and dependency pins are not automatic migrations for this Next.js/React/Bun project. Report conflicts rather than silently importing its whole stack.

When code violates an applicable principle, identify the file and behavior, link the reference, explain the consequence, and propose the smallest correction. Distinguish a demonstrated defect, an unenforced architectural preference, and an intentional framework adaptation. State what was verified and what remains unproven; do not claim a repository-wide audit from a focused change.

### Verify library guidance against source

Skills and reference pages may lag the library. Establish the resolved dependency version from the lockfile and installed package, then read that version's instructions, implementation, types, and relevant tests before relying on an API. Source evidence takes precedence over a stale skill's API example; report the discrepancy.

Prefer installed package source first. If it lacks the needed implementation or tests, fetch only the relevant upstream repository at a verified tag or commit matching that version. Use `bun run sources:fetch` to populate this project's pinned Effect, XState core, and XState Effect mirrors, then `bun run sources:check` before trusting them. See [source references](docs/agent-sources.md) for locations and update handling. Rat-stack's [source mirror utility](https://github.com/joelhooks/rat-stack/blob/main/scripts/vendor-agent-sources.sh) is the reference pattern. Keep downloaded mirrors reference-only, ignored by Git and excluded from builds, typechecks, tests, lint, and formatting. Record package version, remote, ref, resolved commit, and retrieval date. Verify that metadata against current dependencies before reuse; an existing directory is not proof of freshness. Never replace a dirty mirror automatically.

Treat checking for updates separately from verifying current behavior. Compare the installed version with official releases, changelogs, and source diffs; report relevant changes without upgrading dependencies or replacing the pinned reference with upstream HEAD. Download large repositories only when installed source and official documentation cannot answer the concrete question.

## Required library source lookup

Before implementing or reviewing Effect, XState, or their framework integrations, follow the [source lookup workflow](agent-patterns/README.md), including when evaluating custom HTTP, cache, retry, subscription, or resource adapters. Implementation agents must provide its source/decision/test evidence; reviewers must independently read the matching upstream guidance, implementation and tests. Coordinators must include these requirements in delegated tasks and enforce the workflow's completion gate before submitting or updating a PR. Use the installed Effect v4 package's full public surface and matching source checkout; keep upstream API recipes out of local guides.
