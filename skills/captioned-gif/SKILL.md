---
name: captioned-gif
description: >-
  Turn a sequence of screenshots (PNGs) into a captioned animated GIF with a
  colored bottom caption bar (neutral / red / green to encode state) and
  per-frame timing. Use this whenever you need a before/after or step-by-step
  demo GIF from stills, such as attaching a visual to a PR, showing a bug fix, or
  narrating a UI flow with labels. Reach for it any time the request is "make a
  gif", "before/after gif", "caption these screenshots into a gif", "demo gif
  for the PR", or turning screen captures into a short annotated animation. It
  is stills-to-GIF, not screen recording.
---

# Captioned demo GIF

Build a short, labeled animated GIF out of ordinary screenshots. The distinctive
part is the **caption bar**: each frame gets a solid colored strip along the
bottom holding one line of text, where the color tells the story at a glance:
neutral for setup steps, red for the broken "before", green for the fixed
"after". This reads clearly in a PR and survives being scaled down, which
overlaid-on-image text does not.

It's stills stitched into a GIF with per-frame durations, so you hold longer on
the payoff frames. No screen recorder, no video encoder.

## Setup (once per environment)

The assembler uses Pillow. System `ffmpeg` is usually built without the
`drawtext` filter and ImageMagick often isn't installed, so Pillow is the
reliable path. Create a throwaway venv so you don't touch the global env:

```bash
python3 -m venv /tmp/gifvenv && /tmp/gifvenv/bin/pip install -q Pillow
```

Use `/tmp/gifvenv/bin/python` to run the script below.

## Workflow

1. **Capture same-sized frames.** Grab a PNG at each beat of the flow. Any
   screenshotter works; for a running web app, `agent-browser screenshot
   <path>` is convenient (see the `agent-browser` skill). Two things matter:
   every frame must be the **same dimensions** (a GIF can't mix sizes), and you
   want a clean UI (hide dev toolbars / debug overlays first) so they don't
   distract. Capturing the "before/broken" state and the "after/fixed" state as
   separate frames is what makes the red→green beat land.

2. **Write a spec.** Describe the frames in a small JSON file next to the PNGs.
   Copy `assets/example-spec.json` and edit it. Image and output paths resolve
   **relative to the spec file**, so a spec plus its PNGs is a portable folder.

3. **Run the assembler:**

   ```bash
   /tmp/gifvenv/bin/python scripts/make_gif.py path/to/spec.json
   ```

   It prints the output path, frame count, and size. Send the GIF to the user
   (or attach it) — don't post it anywhere yourself unless asked.

## Spec format

```json
{
  "output": "demo.gif",           // written next to the spec
  "width": 1200,                  // output width in px; omit to keep native size
  "crop": [0, 0, 1366, 556],      // optional [left, top, right, bottom] applied to every frame
  "default_duration": 2000,       // ms per frame unless overridden
  "frames": [
    {"image": "01.png", "caption": "Step one", "color": "neutral"},
    {"image": "04.png", "caption": "Before: nothing happens", "color": "red",   "duration": 2300},
    {"image": "05.png", "caption": "After the fix: it works",  "color": "green", "duration": 2700}
  ]
}
```

- **color**: a name (`neutral`, `red`, `green`, `blue`, `amber`, `gray`) or any
  `#rrggbb`. Lean on `neutral` for setup, `red` for the bug, `green` for the fix.
- **duration**: milliseconds. Hold ~2.5-3s on the payoff frame and ~1.5-2s on
  intros so the loop has rhythm.
- **crop**: trim dead space (empty page bottom, unrelated chrome) so the frame
  is focused before the bar is added. Same crop applies to all frames.
- Optional top-level knobs: `font_size` (default 30), `bar_height` (min 70; auto
  grows for wrapped captions), `padding` (default 28), `loop` (default 0 =
  forever), `font` (path to a .ttf to override the default).

Long captions wrap automatically, and the script errors out if the frames
aren't a uniform size. Those are the two mistakes that otherwise produce a broken GIF.

## How the caption bar works

If you ever need to tweak it, the mechanism is small: make a canvas that's
`bar_height` pixels **taller** than the screenshot and fill the whole canvas
with the bar color, paste the screenshot at the top, then draw white text into
the exposed bottom strip (vertically centered with `textbbox`/line metrics, not
a guessed offset). Everything lives in `scripts/make_gif.py`.
