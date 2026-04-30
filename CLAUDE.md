# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Trạm CP12** is a single-page static website for a homestay accommodation in Đà Lạt, Vietnam. Deployed to GitHub Pages at `tramcp12.github.io/portfolio/`.

- **Stack:** Vanilla HTML5, CSS3, JavaScript — no frameworks, no runtime bundler
- **Language:** Vietnamese (default) + English, toggled client-side via IIFE 0
- **External runtime dep:** Google Fonts only (non-blocking)

---

## Development Workflow

```bash
npm install           # one-time: installs html-validate (dev only)
npm run build         # assemble outputs + validate + lint + run test suite
npm run check         # validate + lint + test against existing output (no rebuild)
node validate.js      # 17 architectural invariant checks only
npm test              # test suite only
node build.js --allow-draft  # bypass empty name/price guard (local editing)
```

**Never edit `index.html`, `cp12.css`, or `cp12.js` directly** — they are overwritten on every build. All source is in `src/`.

**Branch strategy:** work on `claude/...` feature branches; never commit directly to `main`.

---

## Build System (`build.js`)

`build.js` assembles three output files from `src/` source files:

1. **`index.html`** — HTML partials concatenated in DOM order
2. **`cp12.css`** — CSS source files concatenated in cascade order (see `cssSources` array in build.js)
3. **`cp12.js`** — 7 IIFE source files concatenated in DOM order

Build guards that run **before writing outputs** (failures abort the build):
- **CSS-1**: Each font family string must appear exactly once (build-time pre-check)
- **Phase 6**: Every `url("static/img/...")` in CSS must point to an existing file
- **Phase 7**: Every `photos[].src` path in `rooms.json` must exist on disk
- **Phase 8a**: Every `coverPhoto` path in `rooms.json` must exist on disk
- **Phase 8b**: No room in `rooms.json` may have empty `name` or `price` (bypass with `--allow-draft`)
- **Phase 10**: Every `data-bg="static/img/..."` attribute in HTML must point to an existing file
- **CRIT-1**: i18n strings may only contain `<br>`, `<em>`, `<strong>` tags (XSS guard)

After writing outputs, `build.js` runs `validate.js`, `html-validate`, then `test.js`.

---

## Architectural Invariants (`validate.js`)

17 checks enforced on built output. These **must not be broken**:

| Check   | Rule |
| ------- | ---- |
| CSS-1a  | Cormorant Garamond declared exactly once in `cp12.css` |
| CSS-1b  | Be Vietnam Pro declared exactly once in `cp12.css` |
| CSS-2   | `.btn-base` or grouped `.btn-primary`/`.btn-gold` selector exists |
| CSS-3a  | `--gold-20` defined in `:root` |
| CSS-3b  | `--pine-dark-90` defined in `:root` |
| A-1     | `@media (prefers-reduced-motion: reduce)` guard in CSS |
| R-1     | `@media (max-width: 768px)` breakpoint in CSS |
| JS-1    | `try { } catch (e) { }` init guard in `cp12.js` |
| JS-3    | `var cachedNav = null` nav caching pattern in `cp12.js` |
| P-1     | No authored `<img>` tags in generated `index.html`; runtime JS may create image elements |
| H-1     | `og:image` meta tag present |
| A-2     | No legacy `url(img/...)` references in CSS — all under `static/img/` |
| B-1     | `#cp12-room-modal` exists and is placed **outside** `<main>` |
| I18N-1  | `strings.vi.json` and `strings.en.json` have equal key counts |
| I18N-2  | All vi keys present in en |
| I18N-3  | All en keys present in vi |
| L-1     | At least one `data-bg="static/img/..."` attribute in HTML |

---

## HTML Section Order

Sections inside `#cp12-wrap > main#cp12-main` (in DOM order):

```
#home → #video → #rooms → #testimonials → #explore → #about → #location → #journal → #faq
```

Outside `<main>` but inside `#cp12-wrap` (after `</main>`):

```
.sect-book (#cta) → footer → .modal (video overlay) → #cp12-room-modal
```

The dot-nav (`#cp12-dots`) and `chrome.html.partial` (nav bar) are also outside `<main>`, prepended before it.

---

## JavaScript Architecture (7 IIFEs)

`cp12.js` is assembled from 7 IIFE source files in this order. **Do not merge them** — they use intentionally separate variable scopes.

| IIFE | Source | Responsibility |
| ---- | ------ | -------------- |
| 0 | `src/shared/lang-switcher.js` | i18n — reads `#lang-vi-data`/`#lang-en-data` JSON; applies `[data-i18n]`, `[data-i18n-html]`, `[data-i18n-aria-label]` swaps; re-renders rooms on lang change; exposes `window.cp12Esc` XSS escaper |
| 1 | `src/features/rooms/rooms.js` | Renders `#rooms-grid` from `#rooms-data` JSON; XSS-safe via `window.cp12Esc`; caches i18n strings per language in `roomStringsCache` |
| 2 | `src/features/rooms/room-modal.js` | Room detail modal — photo gallery navigation, focus trap; exposes `window.cp12OpenRoomModal`, `window.cp12CloseRoomModal`, `window.cp12RefreshModalLang` |
| 3 | `src/features/video/video.js` | Hero play button and video iframe handlers |
| 4 | `src/features/explore/explore.js` | Travel filter tabs (`data-filter`, `aria-selected`, live count) — W3C APG Tabs pattern |
| 5 | `src/shared/scroll-reveal.js` | Video modal, mobile nav (focus save/restore), IntersectionObserver reveal, scroll RAF, dot-nav, anchor scroll; exposes `window.cp12OpenModal` |
| 6 | `src/shared/lazy-loader.js` | Lazy-loads CSS backgrounds via `[data-bg]` + IntersectionObserver; **must be last IIFE** |

**Cross-IIFE globals:** `window.cp12Esc` (IIFE 0, used by 1 & 2), `window.cp12OpenModal` (IIFE 5, called by 3), `window.cp12OpenRoomModal` (IIFE 2, called by 1), `window.cp12ObserveLazy` (IIFE 6).

**Required authoring patterns:**
- Use `var` for IIFE-scoped declarations (modern browser APIs are fine)
- XSS: all dynamic HTML output must go through `window.cp12Esc` (alias as `var escHtml = window.cp12Esc`)
- Scope all CSS under `#cp12-wrap`

---

## i18n System

Strings are injected by `build.js` into `index.html` as inline `<script type="application/json">` blocks:

```html
<script id="lang-vi-data" type="application/json">{…}</script>
<script id="lang-en-data" type="application/json">{…}</script>
<script id="rooms-data"   type="application/json">[…]</script>
```

IIFE 0 reads `localStorage` key `cp12-lang` (default `"vi"`) and applies string swaps. A FOUC-prevention inline script in `<head>` sets the `lang` attribute and `.i18n-loading` class before IIFE 0 runs.

**Dual lang buttons:** `#cp12-lang-btn` (desktop nav) and `#cp12-lang-btn-mobile` (mobile overlay) are synced on every language change.

**To edit strings:** modify `src/data/strings.vi.json` or `src/data/strings.en.json`, then rebuild. Both files must have identical key sets (I18N-1/2/3 invariants). Only `<br>`, `<em>`, `<strong>` are allowed in string values (CRIT-1 guard).

Explore and Journal reference data in `src/data/travel.json` and `src/data/journal.json` must stay aligned with the English i18n card strings; `test.js` enforces this contract.

---

## Rooms Data Schema (`src/data/rooms.json`)

Each room object:

```json
{
  "id": "jan-01",
  "coverPhoto": "static/img/rooms/catalog/jan-01.jpg",
  "name": "Jan 01",
  "name_vi": "Jan 01",
  "bestFor": "…",
  "bestFor_vi": "…",
  "price": "585K",
  "featured": true,
  "comingSoon": false,
  "desc": "…",
  "desc_vi": "…",
  "meta": [{ "icon": "👥", "text": "2 guests" }],
  "meta_vi": [{ "icon": "👥", "text": "2 khách" }],
  "amenities": ["WiFi", "Balcony", "…"],
  "amenities_vi": ["WiFi", "Ban công", "…"],
  "photos": [
    { "src": "static/img/rooms/details/jan-01/1-bed-view-1.jpg", "alt": "…", "alt_vi": "…" }
  ]
}
```

- Rooms with no photos use `"photos": []` (gradient card fallback)
- `comingSoon: true` suppresses the booking CTA in the modal
- `coverPhoto` drives a `<link rel="preload">` for the first room (Phase 8c)
- Photo assets: `static/img/rooms/catalog/` (card covers), `static/img/rooms/details/{id}/` (gallery)

Current rooms: `jan-01`, `feb-02`, `mar-03`, `aug-08`, `sep-09`, `oct-10`, `nov-11`, `dorm`

---

## CSS Architecture

Cascade order is defined in the `cssSources` array in `build.js`. Key rules:

- Font family strings may only appear in `src/core/tokens.css` (CSS-1 guard)
- All colours must use CSS tokens — no hard-coded hex values
- `.section-heading` is a shared component defined in `src/core/section-labels.css` — do not redefine in feature files
- Section animation signatures (`.sect-X .card { opacity: 0 }` + `.sect-X.animated .card { animation: … }`) go at the **bottom** of each feature's CSS file
- Cross-cutting `@media (max-width: 768px)` rules go in `src/core/responsive-sentinel.css`
- `@supports backdrop-filter` must remain last (`src/core/supports.css`)

**Hamburger nav breakpoint is 900px** (not 768px). Language switcher appears in mobile overlay at ≤900px and is hidden in the desktop nav bar at that width.

---

## Static Assets

```
static/img/
├── hero-cover.jpg          # Hero section background
├── hero-logo.jpg           # Hero section logo
├── travel/                 # 6 self-hosted travel images (explore section)
└── rooms/
    ├── catalog/            # Room card cover photos ({id}.jpg)
    └── details/{id}/       # Room gallery photos
```

All `url("static/img/...")` in CSS and `data-bg="static/img/..."` in HTML are validated at build time. The legacy `img/` folder is kept until production URLs are verified post-deploy — delete it in a separate commit after verifying.

---

## Contact & Deployment

- **Email:** `cp12tramdungchill@gmail.com` · **Phone:** `+84765679228`
- **Address:** 228/6 Đường Phú Đồng Thiên Vương, Phường 8, Đà Lạt, Lâm Đồng
- Push to `main` → `pages.yml` deploys to GitHub Pages automatically
- GitHub repo settings required once: **Settings → Pages → Source: GitHub Actions**
