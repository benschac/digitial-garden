# Treasure It Decider article source map

Researched October 29, 2026 against the local Treasure It checkout at commit `b32853902a1ad6b3b287197b5d74f51de17d155b`. This is source research, not production or database execution evidence.

## Draft and scope

The reader-facing draft is [Turning Marketplace Policies into a Decider](../../apps/web/content/posts/marketplace-policies-with-a-decider.mdx), previewed in development at `/blog/marketplace-policies-with-a-decider`. It remains `status: draft`.

The [ledger draft](../../apps/web/content/posts/creating-double-sided-accounting.mdx) introduces the policy layer and suggests a second post. The follow-up traces one scheduled voluntary cancellation through requirements, decision, events, state evolution, effect descriptions, persistence, and the action shown to each participant. Keep the ledger mechanics in the first post.

The local checkout is `/Users/benjaminschachter/another-treasure/another-treasure`. Its `docs/system-map.md:283-294` identifies scattered service rules as the motivation for adapting the pattern. Leave personal anecdotes to the author.

## Primary conceptual source

Jérémie Chassaing's [Functional Event Sourcing Decider](https://thinkbeforecoding.com/post/2021/12/17/functional-event-sourcing-decider) separates pure decision from pure state evolution and gives the model an explicit initial state. Historical replay folds persisted events through evolution. Conceptual signatures are `decide(command, state) → events` and `evolve(state, event) → state`; the Treasure implementation has its own argument order and explicit context.

Treasure's `reactions` function needs implementation attribution. Do not imply that returning effect descriptors establishes durable delivery or that using a decider proves a fully event-sourced application.

## Implementation source map

All paths below are relative to the Treasure checkout, with line numbers from the inspected snapshot.

| Content | Source | What it establishes |
| --- | --- | --- |
| Requirements matrix | `plans/neighborhood-commerce/active/commerce-decider-matrix-follow-up-plan.md:1-7`, `:426`, `:575-588` | References the external “Treasure It Commerce Decider Matrix v0.3”; records revised scheduled backout and server-owned execution actions. No separate literal `matrix.md` was found. |
| Types and pure decision | `packages/api/src/services/commerce/accepted-match.decider.ts:31-131`, `:183-328` | State, command, event and context unions; decision matches phase, command and actor. |
| Cancellation branch | Same decider, `:843-871` | Checks the counterparty-accountable impasse exception before ordinary voluntary cancellation. |
| Fee amounts | Same decider, `:501-520`; `packages/api/src/services/commerce/match-fee-policy.ts:1-2` | Helpers carry the supplied snapshotted base fee; current price resolver is `Math.ceil(acceptedAmountCents / 2)` milliunits. |
| Evolution | Same decider, `:330-439` | Cancellation changes match phase; credit events do not mutate this match state. |
| Reactions and action view | Same decider, `:441-490` | Reaction descriptors and participant-specific available actions. |
| Runtime loop | `packages/api/src/services/commerce/accepted-match-scheduling-policy-adapter.ts:209-280` | Hydrates current pickup/thread facts, calls `decide`, folds returned events, derives reactions. No complete historical replay on this path. |
| Persistence and effects | `packages/api/src/services/commerce/pickup-scheduling-policy.service.ts:624-725` | Expected facts, normalized credit descriptors and stable key go to the RPC; effects run after commit, emission errors are caught and logged. |
| Database safeguards | `supabase/migrations/20261024100723_lock_paid_backout_thread_before_pickup.sql:126-130`, `:180-200`, `:278-345` | Row lock, expected-state checks, descriptor validation and per-event idempotency keys. Read this version rather than an older function definition. |
| Executable policy example | `packages/api/src/services/commerce/accepted-match.decider.test.ts:493-553` | Buyer/seller symmetry, advertised action, exact events, reaction and cancelled next state. Tests inspected, not executed as part of this source research. |

## Representative trace

Let F be one participant's snapshotted base fee. For an ordinary scheduled buyer cancellation, after ruling out the protected impasse case:

1. `BuyerCancels` yields `MatchCancelled` with reason `buyer_voluntary`.
2. `CreditConsumed` with `scheduled_backout_reserved_forfeit` consumes the buyer's reserved F.
3. `CreditConsumed` with `scheduled_backout_penalty_extra` charges another F from available balance.
4. `CreditReleased` with `scheduled_backout_forfeit` releases the seller's F.
5. `evolveAll` produces the cancelled match state. The ledger shell owns balances.
6. `reactions` returns `commerce_pickup_scheduling_backed_out` as an effect descriptor.
7. The service translates the events; SQL revalidates persisted facts and applies cancellation plus settlement atomically. Domain-event interpretation follows the successful commit.

A synthetic F = 1,000 milliunits example makes the movements easy to read. General policy is 2 × F, rather than a universal two-credit charge.

## Source drift and claim boundaries

- Matrix plan `:622` still describes a static 1,000 milliunit fee. The current fee resolver and snapshotted event amounts supersede that historical amount.
- `plans/neighborhood-commerce/off-platform-match-credits-plan.md:578-579` still says scheduled cancellation releases both reservations. Current decider/tests and the matrix's later revision at `:426` contradict it.
- The action-view enum still contains `actor_forfeits_two_credits_compliant_released`; preserve the actual name in excerpts but explain the current fee-based amount.
- The matrix includes migration goals. Do not claim every credit rule already passes through a universal decider. Offer funding, Free pickups and referrals have separate policy owners; `offer-funding.decider.ts` returns credit effects directly.
- Hydrating relational state for a pure decision does not establish event-stream replay, versioned snapshots, or event-schema migration guarantees.
- Postcommit emission is not atomic with the database transaction. No durable outbox or automatic notification retry was established in this trace.
- Local source and inspected tests do not prove deployment, concurrency behavior under load, live worker execution, or notification delivery.

## Next collaborative writing pass

Ask the author for a concrete testing or rule-duplication story. Review the cancellation explanation first, including the impasse exception. Decide whether funding warrants another walkthrough; it has a different decider contract and should not be forced into the same shape.

Before publication, recheck code excerpts and source links, resolve remaining author placeholders, and review the rendered page at desktop and mobile widths. Keep publication and source/runtime verification separate.
