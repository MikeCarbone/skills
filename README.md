# Skills

A collection of skills for AI coding agents. Skills follow the
[Agent Skills](https://agentskills.io/) format and work with
[`npx skills`](https://github.com/vercel-labs/skills).

[![skills.sh](https://skills.sh/b/MikeCarbone/skills)](https://skills.sh/MikeCarbone/skills)

## Install

```bash
# Interactive install
npx skills add MikeCarbone/skills

# Install a specific skill globally (recommended for personal workflows)
npx skills add MikeCarbone/skills --skill mike-pr-stack-canvas -g -a cursor -y
npx skills add MikeCarbone/skills --skill mike-resy-reservation -g -a cursor -y

# List skills in this repo
npx skills add MikeCarbone/skills -l
```

Or with a full GitHub URL:

```bash
npx skills add https://github.com/MikeCarbone/skills
```

## Available skills

### mike-language-style-guide

Write PR descriptions, commit messages, Slack posts, and other prose in Mike
Carbone's personal voice.

**Use when:** writing text on Mike's behalf, or when asked for "my voice" / "mike style"

### mike-pr-stack-canvas

Build and live-update a Cursor Canvas that tracks a Graphite/GitHub PR stack —
review state, CI status, unresolved comments, and branch names.

**Use when:**

- Tracking a multi-PR Graphite stack
- Monitoring CI / approvals / review comments across several PRs
- Building a stack status canvas

### mike-resy-reservation

Queue and grab Resy reservations from a signed-in Cursor browser session.
Global time preference applies to every restaurant. Dry-run unless you say
to book.

**Use when:**

- Queueing a table ("grab me Carbone")
- Running a drop at the venue release time
- Checking or canceling the Resy queue

## Repository layout

```text
skills/
  {skill-name}/
    SKILL.md          # Required
    scripts/          # Optional helpers the agent can run
    references/       # Optional docs loaded on demand
```

This matches the discovery paths used by `npx skills add`.

## Creating a new skill

```bash
npx skills init my-skill-name
# then move it under skills/ if created at the repo root:
# mv my-skill-name skills/
```

See [AGENTS.md](./AGENTS.md) for conventions when editing this repo.
