# AGENTS.md

Guidance for AI coding agents working in this repository.

## Repository overview

A public collection of Agent Skills installable via:

```bash
npx skills add MikeCarbone/skills
```

Skills follow the [Agent Skills](https://agentskills.io/) format and the
[`npx skills`](https://github.com/vercel-labs/skills) discovery layout.

## Directory structure

```text
skills/
  {skill-name}/           # kebab-case; matches frontmatter `name`
    SKILL.md              # Required
    scripts/              # Optional executable helpers
    references/           # Optional progressive-disclosure docs
skills.sh.json            # Optional skills.sh page groupings
README.md
AGENTS.md
```

## Naming conventions

- Skill directory: `kebab-case` (e.g. `mike-pr-stack-canvas`)
- Frontmatter `name`: must match the directory name
- `SKILL.md`: exact filename, uppercase
- Scripts: `kebab-case.py` / `kebab-case.sh` / `kebab-case.mjs`

## SKILL.md requirements

```markdown
---
name: my-skill
description: What it does and when to use it. Include trigger phrases.
---

# Skill title

Instructions…
```

- Keep `SKILL.md` under 500 lines
- Put detailed material in `references/`
- Prefer scripts over large inline code blocks
- Do not hardcode organization-specific product names unless the skill is
  intentionally org-specific

## Adding a skill

1. Create `skills/{skill-name}/SKILL.md` with valid frontmatter
2. Add optional `scripts/` / `references/`
3. Document it in `README.md`
4. If useful, add it to a group in `skills.sh.json`
5. Verify discovery:

```bash
npx skills add MikeCarbone/skills -l
```

## Local verification

```bash
npx skills add . -l
npx skills add . --skill mike-pr-stack-canvas -g -a cursor -y
```
