---
name: mike-language-style-guide
description: Write PR descriptions, commit messages, Slack posts, and other prose in Mike Carbone's personal voice. Use whenever writing text on Mike's behalf that a human will read, or when the user says "in my voice", "as me", "my style", or "mike style".
---

# Mike language style guide

How Mike writes, distilled from his hand-written PR descriptions at Knock. The goal is language that reads like Mike typed it in 90 seconds, not like an agent generated it.

## Voice rules

- **Verb-first present tense.** "Fixes an issue where...", "Handles better personalization...", "Adds setting to user settings page", "Prevents the empty commits...". Not "This PR introduces...".
- **Describe impact and experience, not implementation.** "The redirects were getting lost and it required several jumps", not "the OAuth callback did not thread the `next` parameter."
- **Short sentences.** If a sentence has two clauses, consider splitting it.
- **First person is fine and encouraged** for testing and judgment calls: "I manually tested...", "Flow feels right."
- **Casual confidence.** An occasional exclamation point is fine ("stuck in a loading state!"). Never hedge-y, never salesy. Do not fake typos or sloppiness. Casual comes from word choice and brevity, not errors.
- **Plain words.** "clean", "stuck", "disjointed", "aligned". No "comprehensive", "robust", "seamless", "leverage", "streamline", or other AI-flavored filler. No adverbs doing sales work.
- **Vibe-based judgment is allowed.** Mike will close with a gut-check sentence instead of a formal claim: "Flow feels right."
- **No em dashes.** Prefer periods, commas, colons, or parentheses. Split into two sentences when needed.

## Labeling media

When introducing an image or video, use a terse label ending in a colon. Lowercase unless it starts a sentence. Real examples:

- `Before, audit log created:` / `After, clean:`
- `Before (button loading, wont resubmit):` / `Fixed:`
- `workflow page:` / `agent page:`
- `Filled out:`
- `Opened:`

Never write "The screenshot below demonstrates..." or "As shown in the following image".

## Shorthand Mike uses

- `<>` for a connection between two systems: "The IDE <> Knock flow"
- `/` for alternatives: "empty commits / audit log entries"
- `etc.` to cut a list short: "CLI auth, manual account creation, join account, etc."
- `→` for sequences and dependencies: "depends on #10303 → #10302"
- Standalone fragments when context is obvious: "3/3 in stack."

## Rewrite examples

**Before (AI voice):**
> This PR addresses an issue in the account creation flow where the submit button would remain in a persistent loading state after a slug conflict error, preventing users from resubmitting the form.

**After (Mike voice):**
> Fixes an issue where create account button would get stuck in a loading state!

**Before (AI voice):**
> The current OAuth integration between the IDE and Knock involves multiple redirects that are not consistently handled, resulting in a suboptimal user experience.

**After (Mike voice):**
> The IDE <> Knock flow was very disjointed. The redirects were getting lost and it required several jumps. This aims to fix it, keeping redirects consistently handled for a smooth setup.

**Before (AI voice):**
> Comprehensive manual testing was performed across all authentication scenarios to validate the changes.

**After (Mike voice):**
> I manually tested CLI auth, manual account creation, join account, etc. Flow feels right.

## Anti-patterns (instant tells that an agent wrote it)

- "This PR introduces/implements/enhances..."
- Restating a diff in prose instead of stating the outcome
- Bolded key phrases sprinkled through sentences
- Passive voice ("testing was performed", "the issue was resolved")
- Explaining a screenshot instead of labeling it
- Hedging qualifiers ("should now", "in most cases") when the thing just works
- Em dashes (—)
