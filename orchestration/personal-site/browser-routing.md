# Browser routing

These are project agent-routing options, not Codex command-line flags or native Gas City provider settings. Select one in the task prompt. Codex CLI defaults to `desktop-handoff`; an unknown host also uses that route.

| Option | Action |
| --- | --- |
| `desktop-handoff` | Prepare browser verification for a desktop-app conversation. Make no built-in browser calls in CLI. |
| `desktop-native` | In a desktop-app-hosted conversation, preflight browser access once, then perform the required checks. |

The CLI daemon in this pilot lacks the desktop browser transport. A working browser window does not establish CLI access. Keep temporary `BROWSER_USE_ACCESS_PIPE_PATH` and `BROWSER_USE_ACCESS_VERIFYING_IDENTITY` values owned by the desktop app; never copy them into CLI configuration. Starting a CLI worker from the app does not make that worker desktop-hosted.

## Prepare the handoff

1. Reconcile the existing task, remaining budget, prerequisites, candidate and worktree. Gas City retains scheduling ownership. Include this routing document in worker prompts, particularly for older worktrees whose AGENTS.md predates it.
2. Finish eligible non-browser work within the existing budget. Reserve the candidate worktree and port for verification. Record the exact commit and tree, worktree path, clean/dirty state, server command and URL. Dirty or unidentified candidates cannot receive final acceptance.
3. Append a handoff to the existing owning bead using the commands in [reporting](reporting.md). Record browser verification as pending; retain other blockers and all deadlines, attempts and evidence. A handoff neither consumes a new implementation attempt nor renews a budget.
4. Give the user the desktop prompt below with actual values. Do not claim automatic desktop dispatch. Continue unrelated eligible Gas City work; browser-dependent acceptance remains blocked.

```text
Use desktop-native browser routing for Gas City convoy psbp-ftb.
Repository: /Users/benjaminschachter/personal-site
City: .tools/gascity-beads-pilot
Existing task: <bead ID>
Candidate commit/tree: <full commit> / <full tree>
Reserved worktree: <absolute path>
Server command and URL: <command> / <URL>
Required checks and viewports: <task-specific checklist and dimensions>
Read AGENTS.md and orchestration/personal-site/browser-routing.md.
Reconcile the task, current candidate and remaining budget before checking.
Record browser evidence on this task; coordinator retains acceptance and integration.
```

## Execute and return evidence

The desktop session verifies that the server serves the reserved candidate, then checks the specified routes, interactions and desktop/mobile viewports. Record timestamp, browser, dimensions, results, screenshots and candidate identity on the owning bead. Include failed checks and limitations. For the blog pilot, use the approved behavior in the existing E3 contract.

If desktop preflight reports `The browser access host is unavailable`, record that result once and return to handoff mode. Retry only after an explicit host change; do not loop through reinstalls, configuration resets or new worker attempts. If budget expires, preserve the candidate and report the pending gate.

The coordinator checks returned evidence against the exact integration candidate, requires independent reviews and repository verification, and reruns affected checks after code changes. A pending handoff, a loaded example page, or CLI test success cannot satisfy browser acceptance. Any separately running verification worker counts toward the [current lane ceiling](operating-contract.md#capacity-and-budgets); coordinator-performed checks remain coordinator work. Integration stays serialized.

Email alert delivery is a separate prerequisite. A Beads handoff is durable state, not proof that an email was sent.
