#!/usr/bin/env python3
"""Re-encode misnamed track logo files as real PNGs.

For files whose four corners are all near-white, also key out the
background to transparent with a fuzzy alpha gradient so the logo
composites cleanly over the dark track photo.

Run from the repo root: python3 scripts/fix-track-logos.py
"""

from PIL import Image
import os
import sys

TRACKS = os.path.join(os.path.dirname(__file__), '..', 'public', 'tracks')

# Files we know are JPEG/WebP wearing a .png extension or are
# indexed-color PNGs that benefit from a re-encode to RGBA.
WHITE_KEY = [
    '123', '166', '212', '219', '233', '371', '390', '445', '451',
    '475', '478', '498', '473', '474',
    # Real PNGs that were authored with alpha=255 across a white
    # background, so the white renders as a solid block.
    'n1', '20', '236', '266', '362', '419',
]
# These have non-trivial backgrounds; just re-encode as proper PNGs
# so the file extension matches the contents.
PASSTHROUGH = ['18', '145', '319', '345', '349', '463']
# Indexed-color PNGs -> re-export as RGBA so edges anti-alias.
REENCODE_RGBA = ['131', '136']

# After white-keying, monochrome-black logos still don't read on the
# dark track photo. Invert their RGB (alpha preserved) so they
# render as white-on-transparent.
INVERT_RGB = ['n1']

WHITE_THRESHOLD = 235      # below this brightness => fully opaque
WHITE_FEATHER_END = 252    # above this => fully transparent


def key_white(im):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # min channel as proxy for "how white" the pixel is
            mn = min(r, g, b)
            if mn >= WHITE_FEATHER_END:
                px[x, y] = (r, g, b, 0)
            elif mn >= WHITE_THRESHOLD:
                # linear feather between threshold and feather_end
                t = (mn - WHITE_THRESHOLD) / (WHITE_FEATHER_END - WHITE_THRESHOLD)
                px[x, y] = (r, g, b, int(a * (1 - t)))
    return im


def invert_rgb(im):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (255 - r, 255 - g, 255 - b, a)
    return im


def main():
    changed = []
    for tid in WHITE_KEY:
        p = os.path.join(TRACKS, f'{tid}_logo.png')
        im = Image.open(p)
        out = key_white(im)
        out.save(p, 'PNG', optimize=True)
        changed.append(('white-key', tid))
    for tid in PASSTHROUGH:
        p = os.path.join(TRACKS, f'{tid}_logo.png')
        im = Image.open(p).convert('RGBA')
        im.save(p, 'PNG', optimize=True)
        changed.append(('reencode', tid))
    for tid in REENCODE_RGBA:
        p = os.path.join(TRACKS, f'{tid}_logo.png')
        im = Image.open(p).convert('RGBA')
        im.save(p, 'PNG', optimize=True)
        changed.append(('rgba', tid))
    for tid in INVERT_RGB:
        p = os.path.join(TRACKS, f'{tid}_logo.png')
        im = invert_rgb(Image.open(p))
        im.save(p, 'PNG', optimize=True)
        changed.append(('invert', tid))
    for kind, tid in changed:
        print(f'{kind:10s} {tid}')


if __name__ == '__main__':
    main()
