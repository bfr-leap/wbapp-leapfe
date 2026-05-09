#!/usr/bin/env python3
"""Re-encode misnamed track logo files as real PNGs.

For files whose four corners are all near-white, also key out the
background to transparent with a fuzzy alpha gradient so the logo
composites cleanly over the dark track photo.

Run from the repo root: python3 scripts/fix-track-logos.py
"""

from PIL import Image
import base64
import glob
import os
import re
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
# Tracks in SWAP_LOGO_AND_MAP get a fresh wordmark logo from their
# SVG, so they don't need inversion.
INVERT_RGB = [
    'n1', '18', '47', '145', '163', '164', '179', '523',
]

# These tracks shipped with logo and map content swapped: the
# _logo.png is actually a track outline and the _map.svg holds
# the wordmark. Swap them: render the SVG to PNG (logo) and
# embed the PNG into a new SVG (map).
SWAP_LOGO_AND_MAP = ['124', '169', '236', '276', '419']

# Tracks missing a map svg, paired with the donor track id whose
# map should be reused.
COPY_MAP = {'164': '163'}

# Tracks whose _map.svg embeds a raster PNG with an opaque white
# background. Re-embed the raster with white keyed out so the map
# matches the dark/transparent style of the vector maps.
SVG_KEY_WHITE = ['341']

# Tracks whose .jpg backgrounds are framed too high (mostly sky),
# so the home/results banners only show clouds. (top, left, right,
# bottom) as fractions of the source. None means "leave that edge".
JPG_CROP = {
    '149': (0.40, 0.0, 1.0, 1.0),
    '485': (0.40, 0.0, 1.0, 1.0),
}

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


def key_corner_color(im, tolerance=40, feather=20):
    """Sample the four corners and key whichever color they share.

    Useful for raster maps with a flat (white-ish or grey-ish)
    background that varies enough to miss a fixed white threshold.
    """
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    corners = [
        px[0, 0],
        px[w - 1, 0],
        px[0, h - 1],
        px[w - 1, h - 1],
    ]
    # Average corner color (alpha-weighted, ignoring already-transparent).
    rs, gs, bs, n = 0, 0, 0, 0
    for r, g, b, a in corners:
        if a < 16:
            continue
        rs += r
        gs += g
        bs += b
        n += 1
    if not n:
        return im
    cr, cg, cb = rs // n, gs // n, bs // n
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            d = max(abs(r - cr), abs(g - cg), abs(b - cb))
            if d <= tolerance:
                px[x, y] = (r, g, b, 0)
            elif d <= tolerance + feather:
                t = (d - tolerance) / feather
                px[x, y] = (r, g, b, int(a * t))
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


def png_to_svg_image(png_path, svg_path, key_bg=True):
    """Wrap a PNG into a minimal SVG via a base64 <image> tag.

    If key_bg, key out the corner-colored background of the PNG
    before embedding so the SVG composites with transparency.
    """
    im = Image.open(png_path).convert('RGBA')
    if key_bg:
        im = key_corner_color(im)
    from io import BytesIO

    buf = BytesIO()
    im.save(buf, 'PNG', optimize=True)
    data = base64.b64encode(buf.getvalue()).decode('ascii')
    w, h = im.size
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {w} {h}">\n'
        f'  <image href="data:image/png;base64,{data}" '
        f'width="{w}" height="{h}"/>\n'
        f'</svg>\n'
    )
    with open(svg_path, 'w') as f:
        f.write(svg)


def svg_to_png(svg_path, png_path, output_height=300):
    """Rasterize an SVG to PNG, sized for use as a logo overlay."""
    import cairosvg

    cairosvg.svg2png(
        url=svg_path,
        write_to=png_path,
        output_height=output_height,
    )


def key_white_svg_image(svg_path):
    """White-key the embedded raster of a PNG-in-SVG map.

    These maps are rasters wrapped in <svg><image href="data:..."/></svg>
    with an opaque white background, so they paint a white block over
    the dark backdrop. Decode the raster, key out white, re-embed.
    """
    with open(svg_path) as f:
        body = f.read()
    m = re.search(r'href="data:image/(png|jpeg);base64,([^"]+)"', body)
    if not m:
        return False
    fmt, b64 = m.group(1), m.group(2)
    from io import BytesIO

    im = key_corner_color(Image.open(BytesIO(base64.b64decode(b64))))
    out = BytesIO()
    im.save(out, 'PNG', optimize=True)
    new_b64 = base64.b64encode(out.getvalue()).decode('ascii')
    body = re.sub(
        r'href="data:image/(png|jpeg);base64,[^"]+"',
        f'href="data:image/png;base64,{new_b64}"',
        body,
        count=1,
    )
    with open(svg_path, 'w') as f:
        f.write(body)
    return True


def main():
    # Run order matters: structural swaps & copies first so the rest
    # of the pipeline operates on the corrected file roles.
    changed = []
    for tid in SWAP_LOGO_AND_MAP:
        png_path = os.path.join(TRACKS, f'{tid}_logo.png')
        svg_path = os.path.join(TRACKS, f'{tid}_map.svg')
        # Render current SVG (the wordmark) to a PNG that will become
        # the logo. Stash to a temp first so we don't clobber inputs.
        tmp_logo = png_path + '.new'
        svg_to_png(svg_path, tmp_logo)
        # Wrap the original PNG (the track outline) into a fresh SVG
        # that becomes the map.
        png_to_svg_image(png_path, svg_path)
        os.replace(tmp_logo, png_path)
        changed.append(('swap', tid))
    for tid, donor in COPY_MAP.items():
        src = os.path.join(TRACKS, f'{donor}_map.svg')
        dst = os.path.join(TRACKS, f'{tid}_map.svg')
        with open(src) as f:
            body = f.read()
        with open(dst, 'w') as f:
            f.write(body)
        changed.append((f'copy-from-{donor}', f'{tid}_map.svg'))
    for tid in SVG_KEY_WHITE:
        svg_path = os.path.join(TRACKS, f'{tid}_map.svg')
        if key_white_svg_image(svg_path):
            changed.append(('svg-key-white', tid))
    for tid, (t, l, r, b) in JPG_CROP.items():
        jpg_path = os.path.join(TRACKS, f'{tid}.jpg')
        im = Image.open(jpg_path)
        w, h = im.size
        box = (int(l * w), int(t * h), int(r * w), int(b * h))
        im.crop(box).save(jpg_path, 'JPEG', quality=88)
        changed.append(('jpg-crop', tid))

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
