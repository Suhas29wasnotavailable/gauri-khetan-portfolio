# Gauri Khetan, portfolio website

A playful digital gallery: restrained ivory-and-black UI, with each project
opening into its own colour world. Built to the brief in `front end brief.pdf`,
with all copy taken from `master copy.pdf`.

No build step, no dependencies. Open it, edit it, drag it onto a host.

---

## Running it locally

```bash
python3 site/tools/serve.py        # then open http://localhost:8848
```

You can also just double-click `index.html`, the site uses hash URLs
(`#/work/vanae`) precisely so it works from the filesystem, from a subfolder,
and from any static host without server configuration.

## Deploying

Drag the whole `site/` folder onto **Netlify Drop** or **Vercel**, or push it to
**GitHub Pages**. Nothing else to configure.

If you later want clean URLs (`/work/vanae` instead of `/#/work/vanae`), set
`HASH_MODE = false` at the top of `assets/js/app.js`. The `_redirects` and
`vercel.json` files already contain the rewrite rules that needs.

---

## Where things live

```
index.html              the shell, everything else is rendered into it
404.html                copy of index.html, for hosts that need one
assets/
  css/base.css          design tokens, type scale, reset, reveal animations
  css/shell.css         loader, cursor, nav, footer, page transitions
  css/components.css    case-study blocks + the signature interactions
  css/views.css         home, exhibition wall, project pages, about, playground
  fonts/                seven self-hosted families (OFL), see Typography below
  img/                  generated WebP, do not edit by hand
  js/data.js            ← ALL THE WORDS AND STRUCTURE
  js/media.js           generated image manifest, do not edit by hand
  js/ui.js              cursor, reveals, parallax, image helpers
  js/blocks.js          the case-study block components
  js/views.js           the pages
  js/app.js             router + the "door" transition
tools/build_assets.py   turns the original artwork into responsive WebP
tools/serve.py          local preview server
_preview.html           dev-only viewport harness, safe to delete
```

**Almost everything you'll want to change is in `assets/js/data.js`.**

---

## Common edits

### Change any wording
`assets/js/data.js`. Copy is grouped by page (`HOME`, `ABOUT`, `PLAYGROUND`,
`CONTACT`) and then by project inside `PROJECTS`.

### Add photographs to a project
1. Put the folder of originals next to `site/` (e.g. `KALI GHATA/`).
2. Add an entry to `SOURCES` in `tools/build_assets.py`:
   ```python
   "kali-ghata": [
       ("hero",  "KALI GHATA/box-01.jpg", "The closed mithai box"),
       ("box-02","KALI GHATA/box-02.jpg", "The box opened, sweets in their tray"),
   ],
   ```
3. Run `python3 site/tools/build_assets.py` (needs `pip3 install pillow pymupdf`).
4. In `data.js`, set the project's `cover: 'kali-ghata/hero'`, delete its
   `pendingArt: true` line, and add figure blocks wherever you want images:
   ```js
   { t: 'figure', media: 'kali-ghata/box-02', size: 'wide', caption: '…' },
   ```

All eight projects have their artwork wired in. If a future project arrives
before its photographs do, leave `cover: null` and set `pendingArt: true`: the
wall tile falls back to a generated colour plate in that project's palette and
the page carries an honest note. Swap in real images with the four steps above.

### Add a whole new project
Append an object to `PROJECTS` in `data.js` with a `tile: { ratio }`, then give
it a `grid-area` in `views.css` under "The exhibition wall".

The wall is a strict 12-column grid. Every tile spans whole columns and sits on
an explicit row, so nothing is ever nudged by a stray margin. Variety comes from
span and aspect ratio only. The current rhythm is: one full-width opening, three
paired rows, one full-width close.

### Project order
The order of `PROJECTS` in `data.js` drives the wall, the numbering and the
"next project" link. Change the array order and everything follows, but renumber
the `num` fields to match.

### Add the CV
Save it as `assets/gauri-khetan-cv.pdf`. The About page links to it
automatically; until the file exists that link quietly becomes an email request.

### The contact form
It composes an email in the visitor's mail app, nothing is stored, and there's
no backend to maintain. To collect submissions properly instead, sign up for
Formspree and point the form's `submit` handler in `views.js` at your endpoint.

---

## Typography

Three faces carry the whole site:

| role | face | used for |
| --- | --- | --- |
| Identity | **Cormorant Garamond** | the wordmark, page titles, editorial statements |
| UI | **Manrope** | navigation, metadata, labels, section headings, buttons |
| Body | **Inter** | every paragraph |

On top of that each project gets one display face for its title, set in
`type: { display, track, weight }` on the project in `data.js`:

| project | display face |
| --- | --- |
| NILĀB | Yatra One |
| VANAÉ | Bodoni Moda |
| ELECTRA | Space Grotesk (also its section headings) |
| SHROOMA | Manrope, so the existing logo stays the identity |
| KALI GHATA | Cormorant Garamond |
| MOST DAYS | Manrope |
| LIGNE 1925 | Manrope |
| RECASTING RANI | Cormorant Garamond, plus Tiro Devanagari Hindi for the
  bilingual line under the title |

`applyTheme()` writes `--display`, `--display-track`, `--display-weight` and
`--heading` per page, so a project's face never leaks into the next one.

All seven families are self-hosted and every `@font-face` is declared up front.
That costs nothing: a browser only downloads a family when a page actually
renders text in it, so the home page pulls three files and a project page pulls
one more.

Sizes follow the font brief's hierarchy, set once as tokens in `base.css`:
title 44>88px, section heading 24>32, subtitle 11.5>13, body 16>17,
caption 11>12, navigation 11>12.

---

## The blocks a case study can use

Set these in a project's `blocks` array in `data.js`:

| `t:` | what it is |
| --- | --- |
| `intro` | the opening paragraphs |
| `statement` | a big serif line with supporting copy |
| `text` | labelled heading + paragraphs |
| `figure` | one image (`size: 'full' \| 'wide' \| 'inset'`, `contain: true` for artwork on a plate) |
| `duo` | two images, offset |
| `split` | image beside text (`side: 'left' \| 'right'`) |
| `columns` | a labelled list of short phrases |
| `words` | large hoverable list of qualities |
| `arc` | process steps with arrows |
| `gallery` | horizontal drag-scroll row |
| `outcome` | outcome + takeaway pair |
| `info` | the quiet fact table at the end |
| `soon` | a coming-soon panel |
| `feature` | the project's signature interaction (below) |

### Signature interactions
One per project, each demonstrating the design rather than decorating the page:

- **VANAÉ**, `hotspots`: markers on the bag that explain the four decisions
  holding its shape together.
- **KALI GHATA**, `tension`: three sliders for the pairs the brand has to hold
  at once (traditional/contemporary, nostalgic/relevant, artisanal/premium).
- **ELECTRA**, `lens` + `palette`: a magnifier over one print so the small
  motifs surface, and the collection's colours, which recolour the page accent
  as you move across them.
- **SHROOMA**, `toggle`: everyday retail ↔ premium hospitality, showing one
  identity adapting to two registers.
- **NILĀB**, `lens`: a magnifier over the painted surface.
- **MOST DAYS**, `week`: pick a day, and that day's bottle and line appear.
- **LIGNE 1925** and **RECASTING RANI** run on the shared blocks: a full-bleed
  sheet, a drag-through filmstrip and generous editorial spacing. Neither needed
  a bespoke interaction to carry its story.

---

## Notes

- Images: 212 MB of originals become 31 MB of responsive WebP, lazy-loaded with
  blur-up placeholders. Re-run `build_assets.py` after adding any.
- The `Shoots/` folder is the Recasting Rani project. A handful of outtakes from
  it, deliberately different frames, are the only photographs in Playground.
- Galleries are filmstrips: fixed height, width follows each image. Rows line up
  and nothing gets cropped to fit.
- Motion respects `prefers-reduced-motion`; the custom cursor and hover-reveals
  turn themselves off on touch devices.
- The SHROOMA business cards carry other people's phone numbers and email
  addresses, so only the logo side of that card is published.
- Fonts are self-hosted, so the site makes no third-party requests at all.
