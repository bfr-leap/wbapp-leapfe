#!/usr/bin/env python3
"""Render a contact sheet of every track's home-page banner.

Reproduces the visual that event-card-lg.vue produces (track jpg
background + a dark vertical gradient overlay + the logo PNG
centered) for each track in public/tracks/, then tiles them into
a single grid image that can be reviewed at a glance.

Run from repo root:
    python3 scripts/render-track-thumbnails.py [output_path]

Default output: /tmp/track-audit.png
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import glob
import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
TRACKS_DIR = os.path.join(ROOT, 'public', 'tracks')

# Per-tile dimensions matching the home-page card aspect.
TILE_W = 360
TILE_H = 200
LOGO_H = 96
LABEL_H = 22
COLS = 2
GAP = 8
PAD = 12
TRACKS_PER_PAGE = 16


def list_track_ids():
    ids = []
    for path in glob.glob(os.path.join(TRACKS_DIR, '*.jpg')):
        name = os.path.basename(path)
        if name.endswith('_logo.jpg'):
            continue
        ids.append(name[: -len('.jpg')])
    return sorted(ids, key=lambda s: (not s[0].isdigit(), int(s) if s.isdigit() else 0, s))


def render_tile(tid):
    bg_path = os.path.join(TRACKS_DIR, f'{tid}.jpg')
    bg = Image.open(bg_path).convert('RGBA').resize((TILE_W, TILE_H), Image.LANCZOS)

    # Match event-card-lg's bg.opacity:0.6 + dark vertical gradient overlay.
    base = Image.new('RGBA', (TILE_W, TILE_H), (10, 10, 10, 255))
    base = Image.blend(base, bg, 0.6)
    grad = Image.new('RGBA', (TILE_W, TILE_H))
    gpx = grad.load()
    for y in range(TILE_H):
        t = y / max(TILE_H - 1, 1)
        # 0.35 -> 0.55 -> 0.85 (matches the wrap::after gradient stops)
        if t < 0.5:
            a = 0.35 + (0.55 - 0.35) * (t / 0.5)
        else:
            a = 0.55 + (0.85 - 0.55) * ((t - 0.5) / 0.5)
        for x in range(TILE_W):
            gpx[x, y] = (0, 0, 0, int(255 * a))
    base = Image.alpha_composite(base, grad)

    # Logo overlay, centered horizontally, anchored near top.
    logo_path = os.path.join(TRACKS_DIR, f'{tid}_logo.png')
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert('RGBA')
        lw, lh = logo.size
        scale = LOGO_H / lh
        new_w = max(1, int(lw * scale))
        new_h = LOGO_H
        if new_w > TILE_W - 32:
            new_w = TILE_W - 32
            new_h = max(1, int(lh * (new_w / lw)))
        logo = logo.resize((new_w, new_h), Image.LANCZOS)

        # Approximate the CSS drop-shadow halo on the components so
        # the contact sheet matches what users see in the browser.
        halo = halo_layer(logo)
        x = (TILE_W - new_w) // 2
        y = 18
        base.alpha_composite(halo, (x - 8, y - 8))
        base.alpha_composite(logo, (x, y))

    return base


def halo_layer(logo):
    """White glow behind the logo, alpha-shaped by the logo's own alpha."""
    pad = 8
    w, h = logo.size
    canvas = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    alpha = logo.split()[3]
    silhouette = Image.new('RGBA', logo.size, (255, 255, 255, 0))
    silhouette.putalpha(alpha)
    canvas.alpha_composite(silhouette, (pad, pad))
    canvas = canvas.filter(ImageFilter.GaussianBlur(radius=3))
    # Boost alpha to make the glow visible.
    r, g, b, a = canvas.split()
    a = a.point(lambda v: min(255, int(v * 1.4)))
    return Image.merge('RGBA', (r, g, b, a))


def render_page(ids, font):
    rows = (len(ids) + COLS - 1) // COLS
    cell_w = TILE_W
    cell_h = TILE_H + LABEL_H
    sheet_w = PAD * 2 + COLS * cell_w + (COLS - 1) * GAP
    sheet_h = PAD * 2 + rows * cell_h + (rows - 1) * GAP
    sheet = Image.new('RGBA', (sheet_w, sheet_h), (16, 18, 22, 255))
    draw = ImageDraw.Draw(sheet)
    for i, tid in enumerate(ids):
        r, c = divmod(i, COLS)
        x = PAD + c * (cell_w + GAP)
        y = PAD + r * (cell_h + GAP)
        draw.text((x + 4, y + 2), tid, fill=(220, 220, 220, 255), font=font)
        try:
            tile = render_tile(tid)
        except Exception as e:
            print(f'!! {tid}: {e}', file=sys.stderr)
            tile = Image.new('RGBA', (TILE_W, TILE_H), (60, 20, 20, 255))
            ImageDraw.Draw(tile).text((10, 10), f'ERR {tid}\n{e}', fill='white')
        sheet.paste(tile, (x, y + LABEL_H))
    return sheet


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else '/tmp/track-audit'
    os.makedirs(out_dir, exist_ok=True)
    ids = list_track_ids()
    try:
        font = ImageFont.truetype('DejaVuSansMono-Bold.ttf', 14)
    except OSError:
        font = ImageFont.load_default()

    n_pages = (len(ids) + TRACKS_PER_PAGE - 1) // TRACKS_PER_PAGE
    for p in range(n_pages):
        chunk = ids[p * TRACKS_PER_PAGE : (p + 1) * TRACKS_PER_PAGE]
        sheet = render_page(chunk, font)
        out = os.path.join(out_dir, f'page-{p + 1:02d}.png')
        sheet.convert('RGB').save(out, 'PNG')
        first, last = chunk[0], chunk[-1]
        print(f'wrote {out}  ({sheet.size[0]}x{sheet.size[1]}, {len(chunk)} tracks: {first}..{last})')


if __name__ == '__main__':
    main()
