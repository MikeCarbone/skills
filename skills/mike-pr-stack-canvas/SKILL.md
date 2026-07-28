---
name: mike-pr-stack-canvas
description: >-
  Build and live-update a Cursor Canvas that tracks a Graphite/GitHub PR stack
  (review state, CI, unresolved comments, branches, Open PR links). Use when
  the user asks for a PR stack tracker, stack status canvas, Graphite stack
  dashboard, or to run mike-pr-stack-canvas.
disable-model-invocation: true
---

# PR stack tracker canvas

Create a Cursor Canvas that tracks a multi-PR stack with live GitHub status.
Canvas files cannot fetch the network — the agent polls `gh` and rewrites the
canvas snapshot on a loop.

Also read the canvas skill before writing `.canvas.tsx` files.

## When to use

- User wants a visual tracker for a Graphite/stacked PR series
- User asks to monitor CI, approvals, or review comments across several PRs
- User says “stack canvas”, “PR tracker”, or `/mike-pr-stack-canvas`

## Hard rules

1. **One canvas file** at  
   `/Users/<user>/.cursor/projects/<workspace>/canvases/<name>.canvas.tsx`
2. Import **only** from `cursor/canvas`. Embed all data inline — **no `fetch()`**.
3. Prefer width **`maxWidth: 780`** (not a narrow ~520 column).
4. **Do not** make whole PR rows clickable. Put a plain text link on the right:  
   `Open PR #123`.
5. Show for each PR: title, **branch**, review state, CI, unresolved comments.
6. Top links: issue tracker URL (if any) + **Graphite stack** URL (base/bottom PR).
7. Keep polling via an agent `/loop` that rewrites `REVIEW_SNAPSHOT*` constants.
8. On loop ticks, reply with a **short delta** only (what changed).
9. Add a **Refresh now** button via `useCanvasAction` → `newComposerChat` with a
   poll prompt. Canvas cannot fetch GitHub itself; the button opens a chat that
   asks an agent to rewrite the snapshot.

## Inputs to gather

If missing, ask briefly:

- Repo (`owner/name`)
- Ordered PR numbers (bottom → top of stack)
- Canvas title / ticket key (e.g. `PROJ-123`)
- Optional issue tracker URL
- Optional Graphite stack URL (else build from base PR):  
  `https://app.graphite.com/github/pr/<owner>/<repo>/<basePrNumber>/<url-encoded-title-slug>`

## Layout (required)

```
[H1 title]
[subtitle]
[Issue tracker link]  [Graphite stack link]

[Stats row: Done / PRs open / Approved / Unresolved / CI]

Polled <relative age> · <Eastern local time> · refreshes every 5m via agent loop
  (store ISO UTC in REVIEW_SNAPSHOT_AT; display with formatPolledAt)

GitHub PRs card
  Row:  "PR N · <short title>"     Open PR #NNNN
        <branch monospace>
        [Review state] [CI · …] [N unresolved]
  …
```

### Per-PR row details

- Title left, `Open PR #N` link right (`flexShrink: 0`)
- Title: `whiteSpace: "nowrap"` + ellipsis; give the canvas enough width
- Branch under title in monospace tertiary text
- Pills: review state · CI · unresolved comments
- Unsubmitted PRs: title + “Not open” (no fake link)

### Review / CI enums

**reviewState:** `draft` | `approved` | `not_approved` | `changes_requested`  
**ci:** `none` | `running` | `success` | `failure`

Map GitHub:

- `isDraft` → `draft`
- `reviewDecision === APPROVED` → `approved`
- `reviewDecision === CHANGES_REQUESTED` → `changes_requested`
- else (open, not draft) → `not_approved`
- CI: any failing conclusion → `failure`; else any in-progress/queued/pending → `running`; else `success` (or `none` if no checks)

## Snapshot data model

Keep polled fields in constants the loop can rewrite:

```ts
type ReviewSnapshot = {
  branch: string;
  unresolved: number;
  resolved: number;
  readyForReview: boolean;
  reviewState: PrReviewState;
  reviewStateLabel: string;
  ci: CiState;
  ciLabel: string;
};

const REVIEW_SNAPSHOT_AT = "…Z";
const REVIEW_SNAPSHOT: Record<PrId, ReviewSnapshot> = { … };
```

Static stack metadata (`title`, `summary`, `files`, `notes`, `prUrl`, `prNumber`) lives in a `PRS` array. Planned-but-unopened PRs may have empty `prUrl` / empty `branch`.

## Workflow

### 1. Create the canvas

1. Write `<name>.canvas.tsx` under the workspace `canvases/` dir.
2. Use `useCanvasState` for interactive bits (selected PR, checklist status, editable URL overrides). Bump state keys (`v8`, `v9`, …) when defaults must refresh.
3. Include optional detail panel + checklist if useful; keep the **GitHub PRs** card as the hero.

### 2. Initial poll

Resolve this skill’s install directory, then run the poll script (or equivalent
`gh` queries):

```bash
python3 scripts/poll-pr-stack.py \
  --owner <owner> --repo <repo> \
  101 102 103
```

When the skill is installed via `npx skills`, run the script from the installed
skill folder (for Cursor global installs, typically under `~/.cursor/skills/`).

Write results into `REVIEW_SNAPSHOT` / `REVIEW_SNAPSHOT_AT`.

### 3. Start a 5m refresh loop

Follow the loop skill. Unique sentinel, e.g. `AGENT_LOOP_TICK_<stack>_pr_poll`.

Prompt each tick should:

1. Poll all open stack PR numbers (and any newly listed in the canvas)
2. Rewrite `REVIEW_SNAPSHOT_AT` + `REVIEW_SNAPSHOT` (branch, review state, CI, threads)
3. Keep UI structure
4. Reply with a short delta

Default interval: **5 minutes**. Stop when the user says to stop the loop.

### 4. Manual refresh button

Canvas UI cannot call GitHub. Add a button that dispatches:

```tsx
const dispatch = useCanvasAction();

<Button
  variant="secondary"
  onClick={() =>
    dispatch({
      type: "newComposerChat",
      userPrompt: REFRESH_PROMPT, // same poll instructions as the loop
    })
  }
>
  Refresh now
</Button>
```

`newComposerChat` opens a new agent chat with the canvas `@`-mentioned and runs
the refresh prompt there. Keep `REFRESH_PROMPT` in sync with the loop prompt.

### 5. Link the canvas

In the chat reply, link the `.canvas.tsx` with a short label so the user can open it beside chat.

## Optional sections

Include when helpful; omit when empty:

- Stack checklist (`TodoList`) for implementation status vs GitHub review status
- Selected-PR detail card (summary, files, scratch notes)
- Callout that canvas cannot fetch GitHub itself

## Constraints

- No network calls inside the canvas
- Do not resolve GitHub threads or reply on PRs from this skill
- Prefer rewriting snapshot constants over inventing a second data channel
- When restarting the loop (e.g. after changing the poll prompt), kill the old loop PID first
