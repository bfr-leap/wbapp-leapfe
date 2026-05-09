#!/usr/bin/env python3
"""Companion diagnostic for scripts/fix-track-logos.py.

Scans every public/tracks/*_logo.png and reports per-logo stats that
help triage how a new or existing logo will render against the dark
track backdrop:

  * size               width x height
  * trans%             fraction of fully transparent pixels
                       (~0% means the logo still has a solid bg
                       and probably needs WHITE_KEY / BLACK_KEY)
  * meanL              mean luminance of opaque pixels
  * blk%               fraction of opaque pixels that are near-black
  * chr                mean chroma (color saturation) of opaque pixels

Flags surfaced:

  INVERT_CANDIDATE   Predominantly-black, low-chroma logo that won't
                     read on the dark backdrop. Add the id to
                     INVERT_RGB in scripts/fix-track-logos.py.
  DARK               Mean luminance below 80; may benefit from the
                     CSS halo we already apply, otherwise consider
                     a manual treatment.
  NO_TRANSPARENCY    No keyed-out pixels at all -- logo probably
                     needs WHITE_KEY / BLACK_KEY first.
  TINY               Almost no opaque content; likely a broken file.

Usage
-----
    # After running fix-track-logos.py, list remaining issues
    python3 scripts/diagnose-track-logos.py

    # Get only the inversion candidates
    python3 scripts/diagnose-track-logos.py | grep INVERT_CANDIDATE

Dependencies
------------
    pip install Pillow
"""

from PIL import Image
import glob
import os

ROOT = os.path.join(os.path.dirname(__file__), '..')
TRACKS_DIR = os.path.join(ROOT, 'public', 'tracks')


def analyze(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    pixels = im.getdata()
    total = w * h
    transparent = 0
    lum_sum = 0.0
    lum_n = 0
    near_black = 0
    near_white = 0
    chroma_sum = 0.0
    for r, g, b, a in pixels:
        if a < 16:
            transparent += 1
            continue
        lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        lum_sum += lum
        lum_n += 1
        if lum < 40:
            near_black += 1
        if lum > 215:
            near_white += 1
        chroma_sum += max(r, g, b) - min(r, g, b)
    return {
        'w': w,
        'h': h,
        'transparent_frac': transparent / total,
        'mean_lum': lum_sum / lum_n if lum_n else 0,
        'opaque_pixels': lum_n,
        'black_frac': near_black / lum_n if lum_n else 0,
        'white_frac': near_white / lum_n if lum_n else 0,
        'mean_chroma': chroma_sum / lum_n if lum_n else 0,
    }


def main():
    rows = []
    for path in sorted(glob.glob(os.path.join(TRACKS_DIR, '*_logo.png'))):
        tid = os.path.basename(path).replace('_logo.png', '')
        stats = analyze(path)
        rows.append((tid, stats))

    # sort by mean_lum ascending so darkest logos surface first
    rows.sort(key=lambda r: r[1]['mean_lum'])

    header = f'{"id":>5}  {"size":>11}  {"trans%":>7}  {"meanL":>5}  {"blk%":>5}  {"chr":>4}  flags'
    print(header)
    print('-' * len(header))
    for tid, s in rows:
        flags = []
        # Predominantly black/dark monochrome logo: invert candidate.
        # Low mean chroma rules out colored logos that just happen to
        # have low average luminance.
        if s['black_frac'] > 0.55 and s['mean_chroma'] < 25:
            flags.append('INVERT_CANDIDATE')
        elif s['mean_lum'] < 80:
            flags.append('DARK')
        if s['transparent_frac'] < 0.05:
            flags.append('NO_TRANSPARENCY')
        if s['opaque_pixels'] < 200:
            flags.append('TINY')
        print(
            f'{tid:>5}  {s["w"]:4d}x{s["h"]:<5d}  '
            f'{s["transparent_frac"] * 100:6.1f}%  '
            f'{s["mean_lum"]:5.0f}  '
            f'{s["black_frac"] * 100:4.0f}%  '
            f'{s["mean_chroma"]:4.0f}  '
            f'{" ".join(flags)}'
        )


if __name__ == '__main__':
    main()
