#!/usr/bin/env python3
"""Re-encode misnamed track logo files as real PNGs.

For files whose four corners are all near-white, also key out the
background to transparent with a fuzzy alpha gradient so the logo
composites cleanly over the dark track photo.

Run from the repo root: python3 scripts/fix-track-logos.py
"""

from PIL import Image
import glob
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
# Files with near-black backgrounds (originally JPEGs that didn't
# survive white-key). Same fuzzy keying but against black.
BLACK_KEY = ['18', '145']
# These have non-trivial backgrounds; just re-encode as proper PNGs
# so the file extension matches the contents.
PASSTHROUGH = ['319', '345', '349', '463']
# Indexed-color PNGs -> re-export as RGBA so edges anti-alias.
REENCODE_RGBA = ['131', '136']

# After keying, monochrome-black logos still don't read on the dark
# track photo. Invert their RGB (alpha preserved) so they render as
# white-on-transparent. Auto-detect candidates with:
#   python3 scripts/diagnose-track-logos.py | grep INVERT_CANDIDATE
INVERT_RGB = [
    'n1', '18', '47', '124', '145', '163', '164', '179', '236',
    '276', '419', '523',
]

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


BLACK_THRESHOLD = 20
BLACK_FEATHER_END = 3


def key_black(im):
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            mx = max(r, g, b)
            if mx <= BLACK_FEATHER_END:
                px[x, y] = (r, g, b, 0)
            elif mx <= BLACK_THRESHOLD:
                t = (BLACK_THRESHOLD - mx) / (BLACK_THRESHOLD - BLACK_FEATHER_END)
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


def tighten(im, padding_frac=0.03):
    """Crop to opaque bbox plus a small breathing margin.

    object-fit: contain in CSS scales by full image dimensions, so a
    logo with lots of transparent padding renders much smaller than
    the slot allows. Cropping to bbox lets contain do its job.
    """
    im = im.convert('RGBA')
    alpha = im.split()[3]
    mask = alpha.point(lambda v: 255 if v > 16 else 0)
    bbox = mask.getbbox()
    if not bbox:
        return im
    left, top, right, bottom = bbox
    bw, bh = right - left, bottom - top
    pad_x = int(bw * padding_frac)
    pad_y = int(bh * padding_frac)
    iw, ih = im.size
    return im.crop(
        (
            max(0, left - pad_x),
            max(0, top - pad_y),
            min(iw, right + pad_x),
            min(ih, bottom + pad_y),
        )
    )


def main():
    # Run order matters: key out background -> re-encode -> invert.
    changed = []
    for tid in WHITE_KEY:
        p = os.path.join(TRACKS, f'{tid}_logo.png')
        out = key_white(Image.open(p))
        out.save(p, 'PNG', optimize=True)
        changed.append(('white-key', tid))
    for tid in BLACK_KEY:
        p = os.path.join(TRACKS, f'{tid}_logo.png')
        out = key_black(Image.open(p))
        out.save(p, 'PNG', optimize=True)
        changed.append(('black-key', tid))
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

    # Final pass: every logo gets tightened to its opaque bbox so the
    # browser's object-fit: contain doesn't waste the slot on padding.
    for path in sorted(glob.glob(os.path.join(TRACKS, '*_logo.png'))):
        tid = os.path.basename(path).replace('_logo.png', '')
        im = tighten(Image.open(path))
        im.save(path, 'PNG', optimize=True)
        changed.append(('tighten', tid))

    for kind, tid in changed:
        print(f'{kind:10s} {tid}')


if __name__ == '__main__':
    main()
