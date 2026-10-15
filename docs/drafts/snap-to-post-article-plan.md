# Quick Catalog article plan

## Current direction: three posts

The project is now called **Quick Catalog**. The reader-facing draft at `apps/web/content/posts/build-snap-to-post.mdx` is **Part 1: What the Phone Can Figure Out on Device**. Its filename and slug remain stable. It remains a draft.

1. **What the phone can figure out.** Focus on photograph selection, OCR evidence, frame ownership, the bounded OCR worker, pending-frame replacement, generation invalidation, and the handoff to remote identification. A technical draft is written and will be refined collaboratively, one implementation section at a time. Product motivation and usage examples have “Add here” placeholders for the author.
2. **Coordinating identification with Effect.** A standalone first draft is at `apps/web/content/posts/coordinating-identification-with-effect.mdx`, previewed at `/blog/coordinating-identification-with-effect`. It covers the A1/A2/B1 example, deferred execution, item-before-global permits, the Promise boundary, caller coalescing, cancellation, and cleanup. The queue, caller, and installed Effect semaphore source were rechecked for this pass. Technical prose remains collaborative working material; the motivation placeholder is for the author.
3. **From an identity guess to a researched listing.** Use the source article's selected-image upload, remote candidates, Exa evidence, seller narration, resolver, and progressive return paths. This part remains to be written as a standalone post.

Preserve `apps/web/content/posts/how-we-use-effect-in-snap-to-post.mdx` as the complete source and research draft, with its current explanation aligned to Quick Catalog and its dated research/validation history preserved. Part one uses focused live-OCR and saved-photo diagrams; the broader draft retains the backend identification diagram.

Part one's worker and frame-lifetime descriptions were checked against the current mobile frame-delivery, capture, inference, native OCR worker, and frame-extractor source. This is source verification, not a new device benchmark. Keep the generation-reset/non-interruption distinction and the live/photo inference mutex caveat.

The October 15 content pass simplifies local prediction coverage to provisional frontend feedback. The supplied September 3 iPhone trace assessment supports useful early detector/classifier categories in that session; typical latency, screen-render timing, device cost, and the richer local VLM’s additional benefit remain unestablished. Both drafts distinguish photo OCR refinement from late live OCR, explain preview versus finalized-photo uploads, and preserve the caller barrier that can delay a same-item refinement. The saved-photo and backend diagrams follow the uploaded evidence; classifier/VLM details remain only where they explain frontend behavior or scheduling. No runtime removal of local models is implied.

The earlier single-post plan below remains as an authoring checklist for part two. Its proposed next writing pass no longer describes part one.

## Collaborative editing approach

Leave nontechnical framing, personal motivation, and product anecdotes to the author, using visible “Add here” placeholders. Do not invent those passages. Work through one technical implementation at a time: inspect the owning code, explain its execution and tradeoffs, discuss the explanation with the author, then revise that section. The existing technical prose is a starting draft, not an agreed final explanation.

## Earlier single-post plan

The reader-facing draft is `apps/web/content/posts/build-snap-to-post.mdx`. This first pass writes the opening through the handoff to the queue walkthrough. Its separate slug allows development preview while the original remains available.

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

Review the new part-two draft one implementation section at a time, beginning with deferred tasks and nested permits. The initial pass includes cancellation and failure; refine those explanations with the author before expanding the article or adding interactive demonstrations.

Before publication, verify excerpts against the owning implementation, replace private source paths with public permalinks if available, run content validation, and check the rendered article at desktop and mobile widths. Add a historical motivation story only if the author supplies a real incident or implementation frustration.
