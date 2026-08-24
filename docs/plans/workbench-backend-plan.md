# Workbench backend implementation plan

Status: proposed

Date: 2026-08-23

Scope: Projects vertical slice first; no implementation is authorized by this document.

## Outcome

Build a modular NestJS backend in the existing Bun/Turborepo workspace, backed by portable PostgreSQL through Drizzle ORM and Drizzle Kit. Ship the Projects vertical slice before adding experiments, technologies, workers, agents, realtime features, Effect, or database-backed blog interactions.

Published blog posts are not a backend domain in the initial platform. Their canonical source is the validated Markdown and MDX under `apps/web/content/posts`; NestJS and PostgreSQL are reserved for future mutable interactions or publishing workflow state.

The target result is one deployable API, one existing Next.js web app, and a small set of purpose-specific packages with enforced dependency direction:

```text
apps/web ───────────────> packages/contracts
    │                            ▲
    └──── HTTP/oRPC ─────> apps/api
                              │  │
                              │  ├──> packages/domain
                              │  └──> packages/database ──> packages/domain
                              └─────> packages/contracts

packages/contracts: transport schemas and oRPC contracts; no NestJS or Drizzle
packages/domain: application/domain types, policies, ports; no framework imports
packages/database: Drizzle schema, client factory, migrations; no NestJS imports
apps/api: Nest composition, auth adapter, controllers, application services,
          and concrete Drizzle repository adapters
```

## Baseline verified on 2026-08-23

- The repository is an all-untracked seed, so there is no committed migration history or existing backend architecture to preserve.
- Bun 1.4.0 is the package manager; Turborepo 2.10.11 delegates `build`, `dev`, `lint`, and `check-types` to package scripts.
- `apps/web` is a minimal Next.js 16.3.2 / React 19.2.8 App Router application.
- No `apps/api`, `packages/*`, PostgreSQL configuration, authentication provider, or migration owner exists yet.
- The current Turbo transit-node setup already allows dependency-aware cache invalidation for parallel lint and typecheck tasks.
- Current oRPC v2 is a beta. Its NestJS integration is ESM-only and recommends `module: "NodeNext"` with Node.js 22+ for Nest versions before native ESM support.

## Decisions to record before implementation

### D1. Runtime and package strategy

- Keep Bun as the workspace package manager and root task runner.
- Run the API as a Node.js 22+ ESM application; do not assume Bun runtime compatibility is equivalent to Node deployment compatibility.
- Compile `@workbench/domain`, `@workbench/database`, and `@workbench/contracts` to `dist/`. They must be usable by NestJS, scripts, tests, and future workers without relying on Next.js transpilation.
- Use explicit package `exports` and `workspace:*` dependencies. Do not import another package through relative filesystem paths.

### D2. PostgreSQL connection boundary

- Use Drizzle's `node-postgres` adapter with one `pg.Pool` owned by the NestJS application.
- `packages/database` exports the complete schema, the typed database type, and a framework-free factory. It does not read environment variables or use NestJS lifecycle hooks.
- `apps/api` validates `DATABASE_URL`, constructs one pool through `DatabaseModule`, exports the stable `DATABASE` token, enables shutdown hooks, and closes the pool once during application shutdown.
- Use a direct PostgreSQL connection for migrations. For a persistent Supabase-hosted API, use a direct connection when IPv6 is available or Supavisor session mode on IPv4-only infrastructure. Do not use transaction mode unless the deployment becomes ephemeral/serverless and prepared statements are disabled deliberately.
- Keep runtime and migration URLs separately configurable (`DATABASE_URL` and `DATABASE_MIGRATION_URL`) so the provider can change without changing schema or repository code.

### D3. Migration ownership

- Drizzle TypeScript schema is the model source of truth.
- Drizzle Kit is the only migration generator and applier for this repository. Store generated SQL and Drizzle metadata under `packages/database/migrations/`.
- Never use `drizzle-kit push`, automatic synchronization, or runtime migrations during API startup.
- Review generated SQL, apply it to an empty disposable PostgreSQL database, and run repository integration tests before deployment.
- Treat applied migration files as immutable. Schema corrections become new migrations.
- If Supabase Data API access is enabled later, add RLS, grants, and policies as reviewed custom SQL in the same Drizzle migration ledger. Do not introduce a second Supabase CLI migration ledger.

### D4. Authentication boundary

- Recommended initial adapter: Supabase Auth, with the API verifying asymmetric JWTs against the project's JWKS and deriving `ownerId` from the verified `sub` claim.
- Keep `AuthVerifier`, `AuthenticatedActor`, and authorization policies independent of Supabase. Supabase-specific token verification belongs in `apps/api`.
- Never accept `ownerId` from a request body or query parameter.
- Public procedures use no actor. Private procedures require an authenticated actor and include `ownerId` in every repository predicate.
- Do not authorize from user-editable metadata. If authorization claims are later needed, use trusted application metadata and account for claim refresh.
- Implementation must pause before auth scaffolding if Supabase Auth is not the intended provider.

### D5. HTTP and oRPC transport

- Revise the original “oRPC later” decision only after the Phase 1 compatibility gate passes.
- Put Zod input/output schemas and contract-first oRPC definitions in `packages/contracts`. This package may import `@orpc/contract`, `@orpc/openapi`, and Zod, but never NestJS, Drizzle, or server implementations.
- Implement contracts in Nest controllers with `@orpc/nest`; controller methods translate transport input/context, call application services, and map declared errors. They contain no SQL.
- Give every procedure explicit OpenAPI routing metadata so the same implementation exposes conventional HTTP/OpenAPI routes and a typed client.
- Pin all oRPC v2 packages to one exact beta version. Do not use a floating `@beta` range. Upgrade them as one reviewed set.
- If the compatibility spike fails, keep the same Zod contracts and application services, use conventional Nest route decorators, and defer the oRPC adapter. Database and domain work must not be blocked by this fallback.

### D6. Next.js consumption

- Keep `apps/web` on the App Router and the default Node.js runtime for authenticated and database-backed routes.
- The API remains the system-of-record boundary. Server Components call a server-only typed oRPC/OpenAPI client rather than importing `packages/database`.
- Prefer Server Components for initial reads and pass serializable data into Client Components. Use client fetching only for genuinely interactive refresh behavior.
- Use Server Actions only as thin web-specific mutation adapters when progressive enhancement is valuable; they call the API and do not duplicate application rules.
- Start independent reads together and use Suspense where progressive rendering improves the page. Avoid server-to-client-to-server waterfalls.
- Keep secrets server-only. A browser-visible API origin may use `NEXT_PUBLIC_*`; database URLs, Supabase secrets, and administrative keys may not.

### D7. Minimal dependency budget

Install dependencies only in the package that uses them and pin compatible versions in the lockfile:

- `apps/api`: Nest core/config/platform packages, `reflect-metadata`, `rxjs`, `@orpc/nest`, `@orpc/server`, and the chosen auth verifier dependency.
- `packages/contracts`: `@orpc/contract`, `@orpc/openapi`, and Zod.
- `packages/database`: `drizzle-orm` and `pg`; Drizzle Kit and PostgreSQL types are development-only.
- `apps/web`: only the oRPC client/link package needed to consume the contract.
- Tests: one repository-wide test runner strategy plus Nest's test utilities and an HTTP test client. Decide the runner in Phase 0 rather than installing Jest and Vitest together.

Do not add a generic repository library, ORM integration wrapper, class-validator stack, query cache, or database test abstraction unless a concrete test or adapter requires it.

### D8. File-based blog boundary

- Keep canonical published post bodies and metadata in Git-backed Markdown or MDX files, not PostgreSQL.
- Use Markdown by default. Use MDX only when an allowlisted React component materially improves a post.
- Validate YAML frontmatter through one server-only content registry and statically generate public blog routes from published, eligible slugs.
- Compile repository-controlled MDX only. Reject content-level imports, exports, arbitrary expressions, and non-allowlisted components.
- Keep drafts, revisions, publications, comments, reactions, bookmarks, and view events out of the initial schema. Add a specific table only with its first concrete writer and reader.
- If a studio drafting workflow is added later, the database may own private pre-publication state, but the committed Markdown or MDX artifact remains the canonical public version after publication.

## Proposed workspace

```text
apps/
  api/
    src/
      app.module.ts
      main.ts
      config/
      health/
      infrastructure/
        auth/
        database/
          database.constants.ts
          database.module.ts
          database.provider.ts
      modules/
        projects/
          projects.module.ts
          projects.controller.ts
          projects.application-service.ts
          drizzle-project.repository.ts
          project-http.mapper.ts
    test/
  web/
    content/posts/
    src/
      app/
        blog/
        rss.xml/
        sitemap.ts
      components/mdx/
      lib/content/
      lib/orpc/
packages/
  contracts/
    src/projects/
  database/
    drizzle.config.ts
    migrations/
    src/
      client.ts
      schema/projects.ts
      schema/index.ts
      types.ts
  domain/
    src/projects/
      project.ts
      project-errors.ts
      project-policy.ts
      project-repository.ts
  shared/                 # create only when the first real shared utility exists
```

Do not create empty `mobile`, `worker`, `experiments`, `posts`, or `technologies` packages merely to reserve names. In particular, do not create a database-backed posts package for the file-based public blog.

## Projects model for the first migration

Create only fields required by an immediate writer and reader:

| Column | Purpose |
| --- | --- |
| `id uuid primary key` | Stable project identity; generated by PostgreSQL or supplied explicitly. |
| `owner_id uuid not null` | Verified actor scope for private operations. |
| `slug text not null` | Public identifier with a named global unique index. |
| `title text not null` | Draft and public display title. |
| `summary text not null` | Concise public/project-list content. |
| `status text not null` | Constrained to the implemented `draft` and `published` states. |
| `published_at timestamptz null` | Publication time; written and cleared by publish/unpublish transitions. |
| `created_at timestamptz not null` | Creation audit time. |
| `updated_at timestamptz not null` | Last application-controlled update time. |

Required database rules:

- Named unique index on `slug` for predictable conflict mapping.
- Check constraint for implemented status values.
- Index supporting public listing: status plus deterministic publication/ID ordering.
- Index supporting owned lookups: `owner_id` plus `id`.
- No JSONB, soft deletion, generic metadata, speculative SEO columns, or technology/artifact tables in the first migration.

Database row types remain internal. Domain types and public outputs are separately mapped and must not expose `ownerId` or private status details unintentionally.

## Delivery phases

### Phase 0 — freeze prerequisites and evidence

1. Confirm Node.js 22+ is the API runtime and Bun remains the package manager.
2. Confirm Supabase Auth or select a different `AuthVerifier` adapter.
3. Confirm the local disposable PostgreSQL strategy. Recommended: a repository-scoped Docker Compose PostgreSQL service plus separate runtime and test URLs; CI uses a PostgreSQL service container.
4. Confirm the target Supabase connection mode for the eventual deployment.
5. Capture dependency versions before installation. Do not add unrelated libraries.

Exit evidence:

- A short decision log records runtime, auth provider, local database strategy, migration owner, and oRPC beta policy.
- No remote database has been mutated.

### Phase 1 — monorepo foundations and compatibility spike

1. Add package-local TypeScript configuration and scripts for `apps/api`, `packages/domain`, `packages/database`, and `packages/contracts`.
2. Add explicit `workspace:*` dependency edges matching the architecture graph.
3. Scaffold the smallest Nest application with ESM/`NodeNext`, validated configuration, shutdown hooks, and liveness/readiness endpoints.
4. Add one trivial contract-first oRPC procedure implemented through `@orpc/nest`, invoke it over HTTP, generate/inspect its OpenAPI route, and call it from a typed test client.
5. Verify Nest guards/decorators execute on the synthesized route and verify error mapping behavior.
6. Delete the spike procedure or turn it into the health contract; do not keep demo domain code.

Exit evidence:

- API build and boot succeed on Node 22+.
- Nest HTTP, oRPC typed client, OpenAPI routing, guard behavior, and shutdown all have focused tests.
- The exact oRPC v2 beta is pinned consistently, or the fallback decision is recorded.

### Phase 2 — portable database package and first migration

1. Add the framework-free PostgreSQL/Drizzle client factory and complete-schema database type.
2. Add the `projects` schema and export only intentional package entry points.
3. Configure Drizzle Kit with strict PostgreSQL settings and `DATABASE_MIGRATION_URL`.
4. Generate the initial migration, review SQL, and add a check that applies all migrations to an empty disposable database.
5. Add `DatabaseModule` in Nest with one `DATABASE` provider and one pool cleanup path.
6. Add readiness `SELECT 1`; keep liveness independent of PostgreSQL.

Exit evidence:

- Empty-database migration replay passes.
- Schema typecheck passes without Nest imports in `packages/database`.
- API readiness changes from unavailable to ready based on actual database reachability without exposing credentials.
- Pool shutdown is tested or observed in a focused application lifecycle test.

### Phase 3 — Projects domain and persistence

1. Define Project domain types, publication policy, repository port, and explicit failures in `packages/domain`.
2. Implement meaningful repository operations:
   - `createProjectDraft`
   - `findOwnedProject`
   - `publishOwnedProject`
   - `listPublicProjects`
   - `findPublicProjectBySlug`
3. Scope private predicates by both project identity and verified `ownerId` inside SQL.
4. Map the named slug constraint/SQLSTATE `23505` to a stable application conflict without exposing driver errors.
5. Use deterministic public ordering and a cursor of `(publishedAt, id)`; keep the first implementation small but avoid an offset-only public feed.
6. Add application services with repository fakes, then concrete repository integration tests against PostgreSQL.

Exit evidence:

- Draft creation, publish transition, invalid transition, duplicate slug, public visibility, deterministic pagination, and owner isolation tests pass.
- The concrete repository has a sibling integration test.
- No controller or contract imports Drizzle; no domain file imports NestJS, Drizzle, HTTP, or Supabase.

### Phase 4 — Projects HTTP/oRPC surface

Define these initial operations with explicit input, output, routing, and declared errors:

| Use case | Access | Suggested route |
| --- | --- | --- |
| Create project draft | owner | `POST /v1/projects` |
| Publish project | owner | `POST /v1/projects/{id}/publish` |
| List public projects | public | `GET /v1/projects` |
| Get public project by slug | public | `GET /v1/projects/{slug}` |

Implementation rules:

1. Validate at the contract/transport boundary.
2. Build the authenticated actor from verified request context, never input.
3. Keep handlers thin: map input, invoke one application use case, map result/error.
4. Return explicit public output schemas that omit `ownerId` and internal fields.
5. Test anonymous/public behavior, authentication requirements, validation, not-found, conflict, and cross-owner mutation attempts over real HTTP.
6. Snapshot or validate the generated OpenAPI document so routing and output contracts cannot drift silently.

Exit evidence:

- All four acceptance paths work over HTTP and through the typed client.
- A draft cannot be retrieved publicly.
- Cross-owner publish behaves as not found or forbidden according to the recorded disclosure policy.
- Controllers contain no SQL and application services contain no HTTP response types.

### Phase 5 — Next.js public content integration

1. Add a server-only oRPC/OpenAPI client in `apps/web` with an explicit API origin.
2. Render the project list and slug detail from Server Components.
3. Use `notFound()` for missing public slugs and route-level `error.tsx` for recoverable API failures.
4. Add cache/revalidation behavior only after publication freshness requirements are explicit.
5. Keep studio mutation UI out of this phase; prove the public read path first.
6. Keep the blog independent of the API: load validated local Markdown/MDX, statically generate published posts, and produce metadata, RSS, and sitemap entries from the same registry.

Exit evidence:

- Next build and typecheck pass.
- Drafts remain absent from rendered public pages.
- No database or server-only credential enters the client bundle.
- Missing slugs render the intended 404 boundary.

### Phase 6 — finish the Projects capability set

Only after the core slice passes:

1. Add edit-owned-project and unpublish-project use cases with policy tests.
2. Add `technologies`, then `project_technologies`, with a surrogate key and a named unique index for project/technology membership.
3. Add `artifacts` only with its first concrete create and read flows.
4. Put multi-write replacement/attachment operations inside one Drizzle transaction coordinated by the application service.
5. Add studio endpoints/UI after the authorization and response boundaries are proven.

Do not begin experiments or database-backed post interactions until this phase's acceptance tests pass.

### Phase 7 — hardening and deployment automation

1. Add CI PostgreSQL service and run empty migration replay, repository integration tests, HTTP tests, typechecks, lint, and builds.
2. Use `turbo run <task> --affected` in CI with an explicit base branch when it is not `main`.
3. Add deployment migration as an explicit, single-run release step before API rollout; never run it during application bootstrap.
4. Add structured request/error logs with credential and token redaction.
5. Document backup/restore and migration rollback posture before the first production schema change.
6. If Supabase Data API is enabled, add and test RLS before granting exposed roles any table access.

## Turborepo task plan

Task logic lives in each package. Root scripts only delegate with `turbo run`.

| Task | Package behavior | Turbo behavior |
| --- | --- | --- |
| `build` | Next builds `.next`; compiled packages/API build `dist` | `dependsOn: ["^build"]`; outputs configured per package |
| `dev` | Web and API run persistent dev servers | `cache: false`, `persistent: true`; use package config if behavior differs |
| `lint` | Biome lint in each package | depend on transit node for dependency-aware cache invalidation |
| `check-types` | `tsc --noEmit` per package | transit node; declare actual tsbuildinfo outputs where incremental |
| `test` | unit tests in domain/API/contracts | transit node; cache only declared file outputs |
| `test:integration` | PostgreSQL repositories and HTTP app | `cache: false` initially; declare test DB env explicitly |
| `db:generate` | Drizzle Kit in `packages/database` | side-effecting, package-scoped, `cache: false` |
| `db:check` | Drizzle migration consistency check | package-scoped and cacheable if it only reads files |
| `db:migrate` | apply checked-in migrations to an explicit URL | side-effecting, `cache: false`; never part of `dev` or API startup |

Specific Turbo changes:

- Keep the existing transit-node pattern for lint and typecheck.
- Move package-specific output differences into package-level `turbo.json` files rather than accumulating `package#task` overrides in the root.
- Declare API-only database environment variables on API/database tasks and include package-local `.env*` files in task inputs. Do not create a root `.env`.
- Add `dist/**` only for packages that actually emit it; retain the existing Next outputs for `apps/web`.
- Do not use `--parallel`, manual `prebuild` dependency chains, or root scripts that bypass Turbo.

## Verification matrix

| Layer | Smallest decisive proof |
| --- | --- |
| Domain | Publication and authorization policy unit tests with repository fakes |
| Contract | Input/output/error schema tests plus OpenAPI generation validation |
| Database schema | Generate/check migration and replay from an empty PostgreSQL database |
| Repository | Real PostgreSQL tests for constraints, predicates, ordering, and isolation |
| Application | Use-case tests proving domain error mapping and repository calls |
| HTTP/oRPC | Boot Nest and exercise anonymous/authenticated requests plus typed client |
| Lifecycle | Readiness query and pool closure on app shutdown |
| Next.js | Focused route tests, typecheck, and production build |
| Monorepo | `turbo run lint check-types test build` and an affected-task dry run |

## Final Projects acceptance checklist

- [ ] An authenticated owner can create a project draft.
- [ ] The acting owner comes from verified auth context, never request data.
- [ ] Drafts never appear in public list/detail operations.
- [ ] A published project can be fetched by slug.
- [ ] Duplicate slugs return the declared conflict consistently.
- [ ] Private reads and mutations include owner scope in SQL predicates.
- [ ] Cross-owner access is covered by repository and HTTP tests.
- [ ] Public ordering and cursors are deterministic.
- [ ] The migration builds an empty PostgreSQL database.
- [ ] Repository integration tests pass against real PostgreSQL.
- [ ] Nest owns exactly one connection pool and closes it gracefully.
- [ ] Readiness checks PostgreSQL without exposing connection details.
- [ ] No controller imports Drizzle.
- [ ] `packages/database` imports no NestJS modules.
- [ ] `packages/domain` imports no NestJS, Drizzle, HTTP, or Supabase code.
- [ ] `packages/contracts` imports no NestJS or Drizzle code.
- [ ] Next.js imports no database package and leaks no server credential.
- [ ] oRPC beta compatibility is pinned and proven, or the fallback is recorded.

## Stop conditions during implementation

Pause and request direction if any of these becomes true:

- The intended authentication provider is not Supabase Auth and changes the actor model.
- The deployment is serverless/edge rather than a persistent Node NestJS service, changing pool ownership or connection mode.
- A Supabase project already has migration history that this repository is expected to adopt.
- oRPC v2 beta cannot satisfy Nest guard, validation, OpenAPI, or error semantics in the compatibility spike.
- A schema change would require destructive SQL or rewriting an applied migration.
- The first real artifact/technology requirements contradict the proposed normalized model.

## Explicitly deferred

Experiments, database-backed post interactions and publishing workflows, native clients, Cloudflare workers, queues, WebSockets, realtime, vector search, agents, Effect, generic repositories, automatic schema synchronization, and speculative metadata remain out of scope until a concrete feature and its tests require them. The file-based public blog is owned entirely by `apps/web`.
