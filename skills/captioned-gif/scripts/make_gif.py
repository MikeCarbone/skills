#!/usr/bin/env python3
"""Assemble a captioned animated GIF from a sequence of screenshots.

Usage:  python make_gif.py <spec.json>

The spec (see SKILL.md and example-spec.json) lists frames with captions,
bar colors, and per-frame durations. Paths inside the spec resolve relative
to the spec file, so a spec + its PNGs is portable as a folder.

Why a caption *bar* instead of overlaid text: each screenshot is pasted onto
a canvas that is taller than the image and pre-filled with the bar color, so
the exposed strip along the bottom becomes a solid caption bar. The color
encodes state at a glance: neutral for setup steps, red for the broken
"before", green for the fixed "after". Text sitting in its own bar stays
legible over any UI, which overlaid text does not.
"""
import json
import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ModuleNotFoundError:
    sys.exit(
        "Pillow is required (and system ffmpeg is usually built without the\n"
        "drawtext filter, so Pillow is the reliable path). Set it up once:\n"
        "  python3 -m venv .venv && ./.venv/bin/pip install Pillow\n"
        "  ./.venv/bin/python make_gif.py <spec.json>"
    )

# Named bar colors; any \"#rrggbb\" string works too.
COLORS = {
    "neutral": (33, 37, 43),
    "slate": (33, 37, 43),
    "red": (178, 59, 59),
    "green": (33, 150, 83),
    "blue": (37, 99, 235),
    "amber": (180, 120, 20),
    "gray": (90, 96, 104),
}

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/Library/Fonts/Arial.ttf",
]


def resolve_color(value):
    if isinstance(value, str) and value.startswith("#"):
        h = value.lstrip("#")
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    return COLORS.get(value or "neutral", COLORS["neutral"])


def load_font(path, size):
    for p in ([path] if path else []) + FONT_CANDIDATES:
        if p and os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def wrap(draw, text, font, max_width):
    """Greedy word-wrap so long captions never clip off the edge."""
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if not cur or draw.textlength(trial, font=font) <= max_width:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines or [""]


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: python make_gif.py <spec.json>")
    spec_path = sys.argv[1]
    base = os.path.dirname(os.path.abspath(spec_path))
    spec = json.load(open(spec_path))

    width = spec.get("width")                 # output width; None keeps native
    crop = spec.get("crop")                   # [left, top, right, bottom], applied to every frame
    pad = spec.get("padding", 28)
    font = load_font(spec.get("font"), spec.get("font_size", 30))
    default_dur = spec.get("default_duration", 2000)
    line_h = font.getbbox("Ag")[3] + 6

    # Pass 1: load + crop every frame, wrap captions, and find the bar height
    # that fits the tallest caption. A GIF needs uniform frame size, so the bar
    # height must be shared across all frames.
    prepared, size = [], None
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    for f in spec["frames"]:
        img = Image.open(os.path.join(base, f["image"])).convert("RGB")
        if crop:
            img = img.crop(tuple(crop))
        if size and img.size != size:
            sys.exit(f"frame {f['image']} is {img.size}, expected {size}; "
                     "all frames (after crop) must be the same size for a GIF.")
        size = img.size
        lines = wrap(probe, f.get("caption", ""), font, size[0] - 2 * pad)
        prepared.append((img, lines, f))
    bar_h = max(spec.get("bar_height", 70),
                max(line_h * len(lines) + 20 for _, lines, _ in prepared))

    # Pass 2: composite each frame onto a color bar, caption it, resize.
    frames, durations = [], []
    for img, lines, f in prepared:
        w, h = img.size
        canvas = Image.new("RGB", (w, h + bar_h), resolve_color(f.get("color")))
        canvas.paste(img, (0, 0))
        draw = ImageDraw.Draw(canvas)
        y = h + (bar_h - line_h * len(lines)) // 2
        for line in lines:
            draw.text((pad, y), line, font=font, fill=(255, 255, 255))
            y += line_h
        if width:
            canvas = canvas.resize((width, round(canvas.height * width / w)), Image.LANCZOS)
        frames.append(canvas.convert("P", palette=Image.ADAPTIVE, colors=256))
        durations.append(f.get("duration", default_dur))

    out = os.path.join(base, spec.get("output", "demo.gif"))
    frames[0].save(out, save_all=True, append_images=frames[1:],
                   duration=durations, loop=spec.get("loop", 0),
                   disposal=2, optimize=True)
    kb = os.path.getsize(out) // 1024
    print(f"wrote {out}  ({len(frames)} frames, {kb}K)")


if __name__ == "__main__":
    main()
