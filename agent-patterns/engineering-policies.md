# Engineering policies adopted from Rat Stack

These are review policies for future and changed work, not claims that the site implements every referenced system. They group the applicable principles from the source inventory into project decisions. Existing implementation-backed catalog entries remain authoritative for their owners. No new runtime API recipe, dependency, durable worker, provider adapter or infrastructure deployment is introduced here. Before choosing library APIs, complete the pinned source lookup workflow; the historical brain examples target a different version and framework.

For every policy below, review the named owner and add the smallest behavioral check for the concrete failure being changed. The policy text itself is not runtime enforcement.

## Bound work before it reaches a provider

Name the producer, queue, active workers and result allocation separately. Bound each relevant stage using measured limits, propagate waiting or refusal to producers, and reserve independent capacity for work that must not starve. Apply result limits before the driver materializes rows.

Sources: [concurrent-work-needs-an-owner](https://ratstack.sh/lore/concurrent-work-needs-an-owner), [backpressure-reaches-the-producer](https://ratstack.sh/lore/backpressure-reaches-the-producer), [admission-controls-new-work](https://ratstack.sh/lore/admission-controls-new-work), [queries-need-result-bounds](https://ratstack.sh/lore/queries-need-result-bounds), [bulkheads-isolate-capacity](https://ratstack.sh/lore/bulkheads-isolate-capacity).

## Retries require identity and a budget

Retry only classified transient failures under a total attempt and time budget. Establish receiver-side idempotency before retrying writes. A timeout means local waiting ended, not that remote execution failed. Treat already-absent cleanup as success only when absence is the promised postcondition.

Sources: [retry-needs-idempotency](https://ratstack.sh/lore/retry-needs-idempotency), [retry-load-needs-a-budget](https://ratstack.sh/lore/retry-load-needs-a-budget), [timeouts-bound-waiting](https://ratstack.sh/lore/timeouts-bound-waiting), [cleanup-can-be-an-idempotent-postcondition](https://ratstack.sh/lore/cleanup-can-be-an-idempotent-postcondition).

## Persist required work and recovery facts

Before promising crash recovery, name the authoritative durable store, work identity, commit boundary, checkpoint and redrive owner. Persist scheduled intent and external decisions needed for replay. Commit progress with state when one transaction can own both; otherwise design and test reconciliation. Retain exhausted work with a deliberate redrive path.

Sources: [durability](https://ratstack.sh/lore/durability), [durable-work-needs-storage](https://ratstack.sh/lore/durable-work-needs-storage), [request-lifetime-is-not-durability](https://ratstack.sh/lore/request-lifetime-is-not-durability), [checkpoints-follow-commits](https://ratstack.sh/lore/checkpoints-follow-commits), [replay-needs-stable-inputs](https://ratstack.sh/lore/replay-needs-stable-inputs), [durable-timers-need-recovery](https://ratstack.sh/lore/durable-timers-need-recovery), [dead-letters-need-a-return-path](https://ratstack.sh/lore/dead-letters-need-a-return-path).

## Preserve decoding during representation changes

Define which retained versions remain readable before changing a schema. Plan coexistence, conversion and consumer migration before deleting the old representation. Test historical payloads and rollback against the owning decoder.

Sources: [old-events-must-still-decode](https://ratstack.sh/lore/old-events-must-still-decode), [schema-changes-need-a-transition](https://ratstack.sh/lore/schema-changes-need-a-transition).

## Compose dependencies at the integration owner

Name services for application jobs, capture stable construction dependencies once, and supply implementations at the existing composition owner. Keep per-request identity separate from long-lived construction dependencies. Preserve visible requirements and deliberate sharing; verify exact library APIs through pinned source before changing composition.

Sources: [effect-basics](https://ratstack.sh/lore/effect-basics), [context-and-requirements](https://ratstack.sh/lore/context-and-requirements), [dependency-injection-is-the-reason-to-choose-effect](https://ratstack.sh/lore/dependency-injection-is-the-reason-to-choose-effect), [layers-make-dependencies-explicit](https://ratstack.sh/lore/layers-make-dependencies-explicit), [services-capture-dependencies](https://ratstack.sh/lore/services-capture-dependencies), [layer-constructor-pattern](https://ratstack.sh/lore/layer-constructor-pattern).

## Tests preserve independent behavioral evidence

State the failure a test detects before writing it. Keep the expected result independent of the implementation. Use a focused example for a seam, properties for input invariants and model histories for stateful ordering. Reproduce useful agent-discovered failures and demonstrate new guardrails reject a planted violation.

Sources: [tests-that-earn-their-place](https://ratstack.sh/lore/tests-that-earn-their-place), [property-based-testing](https://ratstack.sh/lore/property-based-testing), [model-based-testing](https://ratstack.sh/lore/model-based-testing), [recovery-needs-model-tests](https://ratstack.sh/lore/recovery-needs-model-tests), [agents-explore-tests-remember](https://ratstack.sh/lore/agents-explore-tests-remember), [the-fence](https://ratstack.sh/lore/the-fence).

## Observe meaningful outcomes and overload

Observe named application operations and their failures, latency, traffic and saturation. Preserve correlation and useful failure context while excluding credentials and private payloads. Capture only data the product is authorized to retain; define retention and deletion before adding event storage.

Sources: [trace-meaningful-operations](https://ratstack.sh/lore/trace-meaningful-operations), [golden-signals-expose-overload](https://ratstack.sh/lore/golden-signals-expose-overload), [capture-first](https://ratstack.sh/lore/capture-first).

## Keep domain decisions independent of providers

Keep deterministic domain decisions separate from time, I/O and provider coordination. Group contracts and decisions with the application job, inject adapters at composition, and verify the import graph and callers before claiming a component can be replaced or removed.

Sources: [pure-cores-reduce-timelines](https://ratstack.sh/lore/pure-cores-reduce-timelines), [structure-effect-by-domain](https://ratstack.sh/lore/structure-effect-by-domain), [hexagonal-architecture](https://ratstack.sh/lore/hexagonal-architecture), [cartridges](https://ratstack.sh/lore/cartridges), [a-clean-playground](https://ratstack.sh/lore/a-clean-playground).

## Validate status and data at transport boundaries

Validate transport status and external payloads before application use. Keep declared input, output and refusal behavior consistent across exposed surfaces. Preserve causes while reporting actionable location and repair information. Inspect framework-owned transport contracts and pinned HTTP client guidance before adding another adapter.

Sources: [http-responses-need-validation](https://ratstack.sh/lore/http-responses-need-validation), [schemas-define-the-boundary](https://ratstack.sh/lore/schemas-define-the-boundary), [one-schema-three-surfaces](https://ratstack.sh/lore/one-schema-three-surfaces), [openapi-describes-the-refusal-too](https://ratstack.sh/lore/openapi-describes-the-refusal-too), [errors-are-part-of-the-interface](https://ratstack.sh/lore/errors-are-part-of-the-interface), [error-model](https://ratstack.sh/lore/error-model), [failures-keep-their-meaning](https://ratstack.sh/lore/failures-keep-their-meaning).

## Preflight and resolve source content at build time

For future external source snippets, pin source identity, preflight independent requests before emitting assets, tokenize full source before selecting excerpt lines, and derive rendered views from one source model. Preserve the current content pipeline until a change has a concrete owner and behavior test; do not introduce request-time source fetching.

Sources: [build-time-work-stays-out-of-requests](https://ratstack.sh/lore/build-time-work-stays-out-of-requests), [code-snippets](https://ratstack.sh/lore/code-snippets), [one-snippet-model-two-renderers](https://ratstack.sh/lore/one-snippet-model-two-renderers), [tokenize-before-slicing](https://ratstack.sh/lore/tokenize-before-slicing), [engine-neutral-tokens-keep-adapters-replaceable](https://ratstack.sh/lore/engine-neutral-tokens-keep-adapters-replaceable), [accumulate-independent-errors](https://ratstack.sh/lore/accumulate-independent-errors).

## Make recovery and overload policies explicit

Name each task lifetime, failure observer and recovery owner. Specify what restarts, which state is reconstructed and when repeated recovery stops. Model circuit-breaker states and probe admission before introducing one. Recycle bounded resources and verify recovery under load; in-process task ownership does not establish process isolation or durable recovery.

Sources: [effect-is-not-beam](https://ratstack.sh/lore/effect-is-not-beam), [every-task-needs-an-owner](https://ratstack.sh/lore/every-task-needs-an-owner), [supervision-is-a-recovery-policy](https://ratstack.sh/lore/supervision-is-a-recovery-policy), [restart-from-known-state](https://ratstack.sh/lore/restart-from-known-state), [circuit-breakers-have-state](https://ratstack.sh/lore/circuit-breakers-have-state), [steady-state-recycles-resources](https://ratstack.sh/lore/steady-state-recycles-resources).

## Expose application jobs consistently to agents

Expose existing application jobs through shared contracts and handlers when additional surfaces are needed. Provide discovery, actionable links and explicit permissions. Batch or compose calls only within the original authority. Verify the actual host can discover and execute the surface; a protocol response alone does not establish host UI behavior.

Sources: [one-capability-every-surface](https://ratstack.sh/lore/one-capability-every-surface), [mcp-is-another-surface](https://ratstack.sh/lore/mcp-is-another-surface), [an-mcp-your-users-want](https://ratstack.sh/lore/an-mcp-your-users-want), [one-program-can-replace-several-tool-calls](https://ratstack.sh/lore/one-program-can-replace-several-tool-calls), [hateoas](https://ratstack.sh/lore/hateoas), [two-lines-of-curl-is-a-front-door](https://ratstack.sh/lore/two-lines-of-curl-is-a-front-door), [how-we-do-it-with-effect](https://ratstack.sh/lore/how-we-do-it-with-effect).

## Review infrastructure ownership before applying

For new infrastructure, identify resource ownership, provider support, permission bindings and deploy-versus-runtime initialization. Inspect a concrete plan before applying it and test the target platform. Existing hosting and framework choices remain authoritative; this policy does not migrate the site to Alchemy or Cloudflare.

Sources: [infrastructure-as-effects](https://ratstack.sh/lore/infrastructure-as-effects), [cloud-as-a-library](https://ratstack.sh/lore/cloud-as-a-library), [bindings](https://ratstack.sh/lore/bindings), [plan-model](https://ratstack.sh/lore/plan-model), [init-runs-twice](https://ratstack.sh/lore/init-runs-twice), [ambient-cloud](https://ratstack.sh/lore/ambient-cloud), [distilled](https://ratstack.sh/lore/distilled).

## Validate configuration at its owner

Read and validate configuration at the owning startup or integration boundary, pass typed values to consumers, and supply controlled settings in tests. Keep request identity outside shared configuration and redact secrets from diagnostics. Preserve framework-required environment handling.

Sources: [configuration-is-a-dependency](https://ratstack.sh/lore/configuration-is-a-dependency).
