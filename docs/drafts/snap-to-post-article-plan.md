# Snap to Post article plan

The reader-facing draft is `apps/web/content/posts/building-snap-to-post-with-effect.mdx`. This first pass writes the opening through the handoff to the queue walkthrough. Its separate slug allows development preview while the original remains available.

Keep `apps/web/content/posts/how-we-use-effect-in-snap-to-post.mdx` as the detailed source draft. It holds the implementation excerpts, source map, validation history, device caveats, and visualization specifications. This pass does not reverify the mobile implementation or carry its historical test results forward as new evidence.

## Reader and objective

Write for a developer who understands asynchronous JavaScript but hasn't seen Snap to Post or used Effect. Establish the seller's objective before naming the implementation tools. Introduce each tool when its responsibility becomes relevant.

The product objective is to turn captured item evidence into researched listing drafts while the seller continues capturing. The article's technical objective is to show how that experience leads to bounded remote concurrency, per-item serialization, and deliberate cancellation semantics.

The opening uses a hypothetical two-item capture session. Do not turn it into a personal anecdote or an observed production incident without an actual account from the author.

## Sequence for the rest of the post

| Section | Reader's question | Material from the source draft |
| --- | --- | --- |
| Objective and seller experience | What is this application helping someone do? | Opening and “From the camera to a researched listing”; written in the new draft. |
| High-level system and one item's journey | What happens to the evidence, and when does useful information return? | Local evidence, network stages, two return paths, and existing system diagram; written in the new draft. |
| Coordination requirements | Why does this flow need a queue? | Independent-item progress, same-item serialization, caller coalescing; written in the new draft. |
| Describe work before starting it | How can permits delay the actual request? | `Effect.tryPromise` factory, then `Effect.runPromise`; introduce through the existing Promise boundary. |
| Two permits, one task | Why do we acquire the item permit first? | Nested `withPermit` excerpt and the A1/A2/B1 scenario with two shared slots. Show B1 completing before A1 so spare capacity and item ownership are visibly distinct. |
| Cancellation before and after start | When can we discard work, and when must we retain capacity? | Internal abort controller, queued forwarding listener, listener removal at start, and settlement of active task Promises. |
| Failure and cleanup | What keeps a failed request from blocking the next one? | Permit finalization, wrapper bookkeeping, outer cleanup, and the `return await` detail. |
| Adoption and demonstrated benefits | What did this use of Effect actually give us? | Promise-compatible integration and queue behavior coverage; separate historical results from fresh validation. |

Each technical section should connect the requirement, its purpose, the relevant excerpt, and an observable outcome. Continue using the same item labels so readers can build on the previous example.

## Detail to retain at the point where it matters

- Four is the default active-task limit for one mobile queue instance. It is not a distributed limit or a cap on pending queue memory.
- Keeping `task(context)` inside the Promise factory delays starting the operation. Wrapping an already-created Promise cannot do that.
- Coalescing happens in the caller. It is not a semaphore feature, and every new camera observation does not become a queued request.
- Waiting cancellation prevents the task from being called. Active cancellation retains permits until the task Promise settles, and the caller separately checks abortion before publishing a returned candidate.
- Client Promise settlement does not prove that a provider stopped computing. Background research has a separate lifecycle.
- Permit ordering protects task execution; candidate reconciliation and update-boundary ownership checks protect result publication. Do not claim universal freshness for listing patches.
- Failure releases permits without automatically retrying the failed task. Application counters, listeners, and semaphore-map references have their own cleanup owners.
- The caller's `Promise.allSettled` barrier can delay another refinement for the same item even after its remote permit is released.
- Earlier visible results, multi-item throughput, and complete-listing latency are different outcomes. No measured Effect speedup is established by this draft.

## Material to keep outside the main opening

Keep the frame/worklet ownership table, OCR worker internals, copy costs, inference mutex, physical-device validation plan, and upstream fork proposals in the source draft. Bring a detail into the article only when it explains a requirement the reader has already encountered. These could support a separate camera and on-device inference post.

The speech-token API example is another use of Effect with a different purpose. Develop it as a separate section or follow-up after the queue narrative is complete; it doesn't need to interrupt the first item's journey.

Visualization build briefs, source paths, and authoring questions remain editing material. The new draft reuses the existing illustrative system diagram and does not implement executable queue demos.

## Next writing pass

Write the deferred-task and nested-permit sections first. Use the source draft's reviewed excerpts, label condensed code, and carry forward the A1/A2/B1 example. Then explain cancellation and failure before making any adoption claims.

Before publication, verify excerpts against the owning implementation, replace private source paths with public permalinks if available, run content validation, and check the rendered article at desktop and mobile widths. Add a historical motivation story only if the author supplies a real incident or implementation frustration.
