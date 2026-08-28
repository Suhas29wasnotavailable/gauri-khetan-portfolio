#!/usr/bin/env python3
"""
Build the website image assets.

Reads the original artwork folders that sit next to `site/`, converts every
picture we use into responsive WebP, and writes `site/assets/js/media.js`
with the manifest the front end reads (sizes + blur-up placeholders).

Run from anywhere:   python3 site/tools/build_assets.py
Requires:            pillow, pymupdf   (pip3 install pillow pymupdf)

To add a new project's images:
  1. drop the folder next to this one,
  2. add an entry to SOURCES below,
  3. re-run this script,
  4. reference the new keys in site/assets/js/projects.js
"""

import base64
import io
import json
import os
import re
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[2]      # gauri_portfolio/
SITE = ROOT / "site"
OUT = SITE / "assets" / "img"
WIDTHS = [480, 900, 1440, 2000]
QUALITY = 76

# slug -> list of (output-name, source-path-relative-to-ROOT, alt text)
# PDF pages are addressed as "file.pdf#<page>" (1-indexed).
SOURCES = {
    "vanae": [
        ("hero",        "VANAÉ/3.png",                 "The VANAÉ bamboo handbag held against a plum backdrop"),
        ("carry-01",    "VANAÉ/1.png",                 "The bag carried close to the body, front view"),
        ("carry-02",    "VANAÉ/2.png",                 "The fan silhouette seen from the side"),
        ("carry-03",    "VANAÉ/4.png",                 "A hand resting on the woven bamboo surface"),
        ("carry-04",    "VANAÉ/5.png",                 "The raised central spine catching the light"),
        ("object",      "VANAÉ/VANAÉ 1.png",           "The bag held out flat, showing the full fan geometry"),
        ("drawing",     "VANAÉ/IMG_2783.jpg",          "Orthographic drawings and component breakdown for the bag"),
        ("weave",       "VANAÉ/IMG_2784.jpg",          "Weave geometry study of the bamboo twill"),
    ],
    "nilab": [
        ("hero",        "NILĀB/IMG_7295.jpg",          "The blue NILĀB potli with its painted tree and parrot"),
        ("blue-01",     "NILĀB/IMG_7293.jpg",          "The blue potli held by its beaded handle"),
        ("blue-02",     "NILĀB/IMG_7294.jpeg",         "The blue potli seen against a warm ochre backdrop"),
        ("blue-03",     "NILĀB/IMG_7294.jpg",          "Two hands holding the blue potli open"),
        ("green-01",    "NILĀB/IMG_7290.jpg",          "The green potli suspended from a pearl handle"),
        ("green-02",    "NILĀB/IMG_7291.jpg",          "Close detail of the painted elephant and tassels"),
        ("green-03",    "NILĀB/IMG_7292.jpg",          "The green potli resting on its side"),
        ("pair",        "NILĀB/IMG_7296.jpg",          "Both potlis together, blue and green"),
        ("sketch-01",   "NILĀB/NILĀB 1/1.png",         "Line drawing of the potli with its painted tree"),
        ("sketch-02",   "NILĀB/NILĀB 1/2.png",         "Line drawing of the domed, arched variation"),
        ("sketch-03",   "NILĀB/NILĀB 1/3.png",         "Line drawing of the gathered potli form"),
        ("sketch-04",   "NILĀB/NILĀB 1/4.png",         "Sheet of potli silhouette explorations"),
    ],
    "kali-ghata": [
        ("bag-navy",     "KALI GHATA/26ad3bd0-0634-40b8-b27f-b12873405b54.JPG", "The navy gift bag, printed with a flowering vine and small animals"),
        ("bag-cream",    "KALI GHATA/3b159c7d-244e-4852-a085-9576984233cc.JPG", "The cream gift bag showing three women carrying trays of mithai"),
        ("logo",         "KALI GHATA/KG logo.png",            "The KALI GHATA wordmark"),
        ("logo-script",  "KALI GHATA/KG logo (2).png",        "The Kali Ghata script logo in pink"),
        ("logo-light",   "KALI GHATA/KG logo (1).png",        "A lighter cut of the KALI GHATA wordmark"),
        ("illustration", "KALI GHATA/Digital /Kg Digital 1.png", "Three women in a lotus arcade, each holding a tray of sweets"),
        ("pat-figures",  "KALI GHATA/Digital /Kg Digital 3 .png", "Navy pattern of dancing figures, peacocks and flowering vines"),
        ("pat-pomegranate", "KALI GHATA/Digital /1.png",      "Pomegranates set in an ogee lattice on cream"),
        ("pat-botanical",   "KALI GHATA/Digital /2.png",      "Pink lilies, hummingbirds and pomegranates on cream"),
        ("pat-tile",        "KALI GHATA/Digital /3.png",      "Geometric tile pattern in navy, red and cream"),
        ("pat-line",        "KALI GHATA/Digital /4.png",      "Fine navy line drawing of roses and leaves on white"),
        ("pat-paisley",     "KALI GHATA/Digital /5.png",      "Gold paisley on a magenta ground"),
        ("panel-peacock",   "KALI GHATA/Digital /6.png",      "Ornamental coral panel with peacocks, monkeys and botanicals"),
        ("pat-toile",       "KALI GHATA/Digital /7.png",      "Monkeys taking tea under palm trees, drawn as a toile"),
        ("pat-vine",        "KALI GHATA/Digital /8.png",      "Dense flowering vine on deep navy"),
        ("motifs",          "KALI GHATA/Digital /9.png",      "Pomegranate motifs in red, each holding a different scene"),
        ("motifs-line",     "KALI GHATA/Digital /10.png",     "The same pomegranate motifs drawn as line work"),
    ],
    "electra": [
        ("print-01", "ELECTRA/1.png", "Checked ground overrun by ribbons, flowers and eyes"),
        ("print-02", "ELECTRA/2.png", "Colour-blocked collage of roses, eyes, moons and shells"),
        ("print-03", "ELECTRA/3.png", "A scattered bouquet exploding across a cream ground"),
        ("print-04", "ELECTRA/4.png", "Interlacing ribbons in purple, orange and green"),
        ("print-05", "ELECTRA/5.png", "Dense central medallion of flowers, eyes and ornament"),
        ("print-06", "ELECTRA/6.png", "Magenta leaves and small yellow flowers on cream"),
        ("print-07", "ELECTRA/7.png", "Swirling paisley field in orange, purple and gold"),
        ("print-08", "ELECTRA/8.png", "Oversized flowers in turquoise, coral and pink"),
        ("print-09", "ELECTRA/9.png", "Night garden: bright blooms and vines on deep navy"),
    ],
    "shrooma": [
        ("hero",        "SHROOMA/Digitals/4I.png",     "Illustrated strip following the mushrooms from farm to kitchen"),
        ("logo-mark",   "SHROOMA/Logo/9.png",          "The SHROOMA oyster mushroom mark"),
        ("logo-word",   "SHROOMA/Logo/11.png",         "The SHROOMA wordmark"),
        ("pattern",     "SHROOMA/Digitals/1.png",      "Repeating oyster mushroom pattern"),
        ("characters",  "SHROOMA/Digitals/3I.png",     "Illustrated mushroom characters at work on the farm"),
        ("banners",     "SHROOMA/Digitals/4.png",      "Set of illustrated banner strips"),
        ("cast-01",     "SHROOMA/Digitals/Character illustration.pdf#1", "The full cast of mushroom characters"),
        ("cast-02",     "SHROOMA/Digitals/Character illustration.pdf#2", "Mushroom characters lined up by size"),
        ("sticker-01",  "SHROOMA/Print media/STICKER 1.pdf#1", "Scan-for-recipes sticker with QR code"),
        ("sticker-02",  "SHROOMA/Print media/Sticker 2.pdf#1", "Oyster mushrooms roundel sticker"),
        ("card",        "SHROOMA/Print media/business card shrooma .pdf#3", "The SHROOMA business card, logo side"),
        ("stall-01",    "SHROOMA/Stall Design /1 copy 2.png", "Isometric drawing of the sampling stall"),
        ("stall-02",    "SHROOMA/Stall Design /2 copy 2.png", "Isometric drawing of the stall with hanging grow bags"),
        ("stall-03",    "SHROOMA/Stall Design /3 copy 2.png", "The suspended mushroom sculpture over the counter"),
    ],
    "most-days": [
        ("hero",        "most days/most days /1.png",  "The open MOST DAYS box with seven bottles, one per day"),
        ("box",         "most days/most days /2.png",  "The closed MOST DAYS box"),
        ("bottle-01",   "most days/most days /3.png",  "The Monday bottle in butter yellow"),
        ("bottle-02",   "most days/most days /4.png",  "Close crop of the Monday bottle"),
        ("lineup",      "most days/most days /5.png",  "All seven bottles lined up in their day colours"),
        ("deck-01",     "most days/most-days-deck/Slide1.jpg",  "Title slide: most days, no rules no rush"),
        ("deck-02",     "most days/most-days-deck/Slide3.jpg",  "A weekly ritual for imperfect wellness"),
        ("deck-03",     "most days/most-days-deck/Slide4.jpg",  "The seven-day colour system"),
        ("deck-04",     "most days/most-days-deck/Slide5.jpg",  "Typography and wordmark studies"),
        ("deck-05",     "most days/most-days-deck/Slide6.jpg",  "The hero box architecture"),
        ("deck-06",     "most days/most-days-deck/Slide7.jpg",  "The seven-day system laid out as colour cards"),
        ("deck-07",     "most days/most-days-deck/Slide8.jpg",  "Bottle design notes"),
        ("deck-08",     "most days/most-days-deck/Slide9.jpg",  "Materials specification"),
        ("deck-09",     "most days/most-days-deck/Slide10.jpg", "Lifestyle and second-life notes"),
    ],
    "ligne-1925": [
        ("iterations",  "LIGNE 1925/1.png",  "Iterations sheet: construction and proportion studies for the emerald monk shoe"),
        ("talisman",    "LIGNE 1925/2.png",  "Oxblood loafer with an Art Deco talisman ornament in champagne gold and emerald"),
        ("horsebit",    "LIGNE 1925/3.png",  "Colour-blocked loafer with brushed brass horsebit, beside colour-blocking experiments"),
        ("sunburst",    "LIGNE 1925/4.png",  "Midnight navy loafer with a hand-painted Art Deco sunburst across the vamp"),
        ("panel",       "LIGNE 1925/5.png",  "Emerald and ivory loafer built from one continuous Art Deco panel"),
        ("architectural","LIGNE 1925/6.png", "Black loafer on a 55mm architectural heel, with stepped Art Deco geometry studies"),
        ("tassel",      "LIGNE 1925/7.png",  "Oxblood tassel loafer with twin leather tassels and geometric stitching"),
        ("suede",       "LIGNE 1925/8.png",  "Forest green suede loafer with a hand-stitched split toe"),
        ("derby",       "LIGNE 1925/9.png",  "Structured derby in emerald and burgundy on a 40mm Cuban heel"),
        ("moccasin",    "LIGNE 1925/10.png", "Cream and chocolate moccasin with apron seam and stitch pattern studies"),
        ("penny",       "LIGNE 1925/11.png", "Black penny loafer with an ivory saddle strap and Art Deco cut-out"),
        ("spectator",   "LIGNE 1925/12.png", "Black and ivory spectator oxford beside Art Deco skyline motifs"),
    ],
    # RECASTING RANI. The Shoots folder is this project.
    "recasting-rani": [
        ("hero",       "Shoots/IMG_9625.JPG",   "A purple train trailing the length of a white marble arcade"),
        ("niche",      "Shoots/Snapseed.jpg",   "Seated inside a scalloped niche, framed by the arch"),
        ("purple-01",  "Shoots/1000107751.JPG", "Purple silk against a carved wooden door"),
        ("purple-02",  "Shoots/1000107757.JPG", "Standing full height against an old timber door"),
        ("purple-03",  "Shoots/IMG_9636.JPG",   "Seated on a step beneath a carved white colonnade, purple skirt pooling"),
        ("purple-04",  "Shoots/IMG_9657.jpg",   "Full-length purple silhouette on a pale terrace"),
        ("purple-05",  "Shoots/IMG_9810.JPG",   "A face framed by the opening in a carved screen, maang tikka catching the light"),
        ("purple-06",  "Shoots/Snapseed 2.jpg", "Mid-step across a patterned wall"),
        ("red-01",     "Shoots/1000109266.JPG", "Red spread the width of a scalloped arcade"),
        ("red-02",     "Shoots/1000109267.JPG", "Reaching across an arch in red"),
        ("red-03",     "Shoots/1000109268.JPG", "Hair and red silk in raking evening light"),
        ("red-04",     "Shoots/1000109269.JPG", "A gilt mirror held up in place of a face"),
        ("red-05",     "Shoots/1000109270.JPG", "Overhead crop of red tulle and a raised arm"),
        ("red-06",     "Shoots/1000109271.JPG", "Red cloth pulled through an iron-studded door"),
        ("red-07",     "Shoots/1000107739.JPG", "Red drape beside a brass burner set in a lit alcove"),
        ("red-08",     "Shoots/1000107804.JPG", "A small gilt mirror raised in front of the face"),
        ("red-09",     "Shoots/IMG_9790.JPG",   "Hands raised to a jewelled headpiece, deep red embroidery in low light"),
        ("red-10",     "Shoots/IMG_9791.JPG",   "Close crop of a nose ring, chain and bangles against red embroidery"),
        ("red-11",     "Shoots/IMG_9793.JPG",   "Resting against a hand, framed by a mirror in low warm light"),
        ("yellow-01",  "Shoots/1000107763.JPG", "A hand wrapped in yellow organza, moon motif embroidered beside it"),
        ("yellow-02",  "Shoots/1000107769.JPG", "A yellow skirt caught mid-spin"),
        ("yellow-03",  "Shoots/1000107772.JPG", "Yellow cloth left hanging in a stone alcove"),
        ("yellow-04",  "Shoots/1000107778.JPG", "An arm letting a yellow dupatta fall"),
        ("yellow-05",  "Shoots/Snapseed 3.jpg", "A yellow sleeve raised across the face"),
        ("ochre-01",   "Shoots/1000108661.JPG", "Ochre fabric knotted and lit from one side"),
        ("ochre-02",   "Shoots/1000108663.JPG", "Hands folded behind an olive drape"),
        ("ochre-03",   "Shoots/1000108664.JPG", "A figure standing in a distant arched doorway"),
        ("orange-01",  "Shoots/IMG_9688.JPG",   "Standing against a white staircase in saffron and striped red"),
        ("orange-02",  "Shoots/IMG_9699.JPG",   "Leaning across a white stair against the sky, saffron skirt spread down the steps"),
        ("orange-03",  "Shoots/IMG_9690.JPG",   "Head tipped back against the stair rail, saffron and red against white"),
        ("green-01",   "Shoots/Snapseed 5.jpg", "Green and gold, seated against a pale column"),
        ("green-02",   "Shoots/IMG_9834.JPG",   "Sunglasses raised, green velvet and silver bangles in bright daylight"),
        ("detail-01",  "Shoots/IMG_9672.jpg",   "An overhead frame with a painted elephant"),
        ("detail-02",  "Shoots/IMG_9823.JPG",   "A bangled hand reaching for the ring on an iron-studded door"),
        ("window",     "Shoots/1000107754.JPG", "A face framed by a small stone window"),
    ],
    # Playground: outtakes and visual studies, deliberately different frames
    # from the ones the Recasting Rani case study uses.
    "playground": [
        ("ph-01", "Shoots/1000107760.JPG", "Prints laid out on the floor between set-ups"),
        ("ph-02", "Shoots/1000107742.JPG", "A pink object set inside a velvet-lined box"),
        ("ph-03", "Shoots/1000108662.JPG", "Close study of ochre fabric and its pearl detailing"),
        ("ph-04", "Shoots/IMG_9626.JPG",   "A wider frame of the marble arcade, train trailing"),
        ("ph-05", "Shoots/IMG_9675.JPG",   "High-key studio frame, saffron and coral against white"),
        ("ph-06", "Shoots/IMG_9678.JPG",   "The same set-up, mid-turn"),
        ("ph-07", "Shoots/Snapseed 4.jpg", "A profile turned toward a plaster wall"),
    ],
}


def load_source(rel: str) -> Image.Image:
    """Open a source file. Supports `something.pdf#2` for a PDF page."""
    if "#" in rel:
        path, page = rel.rsplit("#", 1)
        import pymupdf

        doc = pymupdf.open(ROOT / path)
        pix = doc[int(page) - 1].get_pixmap(dpi=200)
        return Image.open(io.BytesIO(pix.tobytes("png")))
    return Image.open(ROOT / rel)


def flatten(im: Image.Image) -> Image.Image:
    """Honour EXIF rotation, then composite transparency onto white.

    Camera and phone files often store the frame in landscape with an
    orientation tag telling the viewer to turn it. Without exif_transpose
    every one of those comes out on its side.
    """
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(bg, im)
    return im.convert("RGB")


def lqip(im: Image.Image) -> str:
    """A 24px-wide blurred data URI used for the blur-up reveal."""
    t = im.copy()
    t.thumbnail((24, 24))
    t = t.filter(ImageFilter.GaussianBlur(0.6))
    buf = io.BytesIO()
    t.save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def average(im: Image.Image) -> str:
    t = im.copy().resize((1, 1))
    return "#%02X%02X%02X" % t.getpixel((0, 0))


def main() -> int:
    manifest: dict[str, dict] = {}
    total_in = total_out = 0

    for slug, entries in SOURCES.items():
        dest = OUT / slug
        dest.mkdir(parents=True, exist_ok=True)
        for name, rel, alt in entries:
            src = ROOT / rel.split("#")[0]
            if not src.exists():
                print(f"  !  missing, skipped: {rel}")
                continue
            total_in += src.stat().st_size
            im = flatten(load_source(rel))
            w, h = im.size
            widths = [x for x in WIDTHS if x < w] + [min(w, WIDTHS[-1])]
            widths = sorted(set(widths))

            for target in widths:
                out = dest / f"{name}-{target}.webp"
                r = im.resize((target, round(h * target / w)), Image.LANCZOS)
                r.save(out, "WEBP", quality=QUALITY, method=5)
                total_out += out.stat().st_size

            manifest[f"{slug}/{name}"] = {
                "src": f"assets/img/{slug}/{name}",
                "w": w,
                "h": h,
                "widths": widths,
                "alt": alt,
                "lqip": lqip(im),
                "avg": average(im),
            }
            print(f"  ✓  {slug}/{name}  {w}×{h}  →  {len(widths)} sizes")

    js = SITE / "assets" / "js" / "media.js"
    js.write_text(
        "// Generated by tools/build_assets.py. Do not edit by hand.\n"
        "export const MEDIA = "
        + json.dumps(manifest, indent=1, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )

    print(
        f"\n{len(manifest)} images · sources {total_in/1e6:.0f} MB "
        f"→ web {total_out/1e6:.1f} MB · wrote {js.relative_to(ROOT)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
