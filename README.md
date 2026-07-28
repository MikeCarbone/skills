# Skills

Personal [Cursor Agent Skills](https://cursor.com/help/customization/skills) I share publicly.

## Install

Copy a skill folder into your Cursor skills directory:

```bash
git clone https://github.com/MikeCarbone/skills.git
cp -R skills/mike-pr-stack-canvas ~/.cursor/skills/
```

Or clone this repo somewhere and symlink:

```bash
ln -s /path/to/skills/mike-pr-stack-canvas ~/.cursor/skills/mike-pr-stack-canvas
```

Restart Cursor (or reload the window), then run the skill with `/skill-name` in Agent chat.

## Skills

| Skill | Description |
| --- | --- |
| [`mike-pr-stack-canvas`](./mike-pr-stack-canvas/) | Cursor Canvas tracker for a GitHub / Graphite PR stack (review state, CI, comments, branches) |
