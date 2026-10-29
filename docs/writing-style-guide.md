# Blog writing style guide

Use this guide when drafting or editing blog posts under `apps/web/content/posts/`. The goal is to sound like Ben talking through a real problem he solved, not a spec document or a textbook.

Reference posts for voice and structure:

- [`apps/web/content/posts/self-positioning-react-components.mdx`](../apps/web/content/posts/self-positioning-react-components.mdx)
- [`apps/web/content/posts/how-i-got-my-first-developer-job.mdx`](../apps/web/content/posts/how-i-got-my-first-developer-job.mdx)
- [`apps/web/content/posts/what-i-learned-fixing-one-line-of-css-in-svelte.mdx`](../apps/web/content/posts/what-i-learned-fixing-one-line-of-css-in-svelte.mdx)

## Voice and perspective

- **Write in first person (`I` and `we`) and talk directly to `you`.** Use `I` for what you built, debugged, or learned ("I ended up needing to build my own internal ledger from scratch", "I pulled down the project and ran it locally") and `we` / `our` for product and team context ("This was our solution to pricing time", "We wanted our tutorial tips to be 20px away from their parent element").
- **Lead with the human or product problem before the architecture.** Open with why the feature exists in the real world (for example, people ghosting each other on free pickups, or a UI element flickering on resize) before showing schemas, SQL, or code.
- **Name concrete actors (`Alice` and `Bob`, `buyer` and `seller`) instead of spec roles.** Write "Bob ghosts Alice" or "Alice cancels after they agreed on a time" instead of "the accountable counterparty forfeits the held entitlement to the protected participant."
- **Be candid about scope and tradeoffs.** If something belongs in another post or isn't required for the main idea, say so plainly:
  - "This is outside the scope of this blog post, but... Maybe it'll be a part two."
  - "**Note:** This isn't a requirement for X itself. Just information for the use case we were solving for."
- **Keep a conversational rhythm.** Mix short, direct sentences ("This was our solution to pricing time.", "First things first, we lock the account row.") with longer explanations that walk through the why.

## Structure of a technical post

1. **`## tl;dr` or a short hook**: 2 to 4 sentences stating what you built, why you had to build it, and the core takeaway.
2. **The problem / product context**: What was broken, painful, or missing? Why didn't the naive approach (like a single `credits` column or plain CSS media queries) work?
3. **High-level mental model**: Bullet points, a short walkthrough table, or a diagram showing how the pieces fit together using concrete examples (`Alice` and `Bob`, a `$20` item, `3` credits).
4. **Focused code and SQL walkthroughs**:
   - Introduce snippets conversationally ("First things first, we...", "Next up...", "Let's look at...").
   - Show the specific function or query that does the work, then immediately explain the edge case it prevents ("Why lock the row? Say you have one credit left and try to accept two matches at the exact same time.").
5. **Practical wrap-up**: End with how it runs in production and a grounded closing thought rather than a generic summary.

## Words and patterns to replace

| Avoid (spec / AI tone)                                                     | Prefer (Ben's voice)                                            |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| "purchased entitlement", "held entitlement"                                | "credits", "held credits", "reserved credits"                   |
| "counterparty", "accountable participant", "exiting participant"           | "Alice and Bob", "the other person", "the person who cancelled" |
| "asserts completion", "contests the assertion"                             | "marks the pickup complete", "disputes it"                      |
| "These tables describe the implemented rules in the source reviewed on..." | State how the app works directly; drop audit disclaimers        |
| "an invariant maintained by the mutation functions"                        | "kept in sync inside our Postgres functions"                    |
| Em dashes (`—`) and mid-sentence colons                                    | Periods, commas, or short bullet lists                          |
| Dense prose paragraphs explaining rules and units                          | Short bullet points with a concrete example                     |
