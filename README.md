# Trạm CP12 — Homestay Đà Lạt

Single-page static website for Trạm CP12, a homestay in Đà Lạt, Vietnam.

**Live site:** [tramcp12.github.io/portfolio](https://tramcp12.github.io/portfolio/)

## Stack

- Vanilla HTML5, CSS3, JavaScript — no frameworks, no build step
- GitHub Pages hosting with CI/CD via GitHub Actions
- Google Fonts (Cormorant Garamond + Be Vietnam Pro) — non-blocking

## Features

- Scroll-triggered reveal animations (`IntersectionObserver`)
- Filterable travel guide (Running / Food / Nature)
- Video modal with YouTube embed
- Mobile-responsive with hamburger nav
- Keyboard navigation (PageDown / Shift+ArrowDown between sections)
- Rooms grid rendered from inline JSON (`#rooms-data`) for easy content editing
- Twitter Card + Open Graph meta for social sharing
- JSON-LD `LodgingBusiness` structured data (schema.org) for SEO
- Canonical URL + YouTube preconnect for performance

## Quick start

```bash
npm install       # dev tools only
npm run check     # validate.js (11 invariants) + html-validate
```

Open `index.html` in a browser to preview locally — no server or build step needed.

## Architecture

`cp12.js` contains four IIFEs in DOM order:

| IIFE | Responsibility |
|------|---------------|
| 0 | Rooms renderer (parses `#rooms-data` JSON → `#rooms-grid`) |
| 1 | Hero play button + video frame handlers |
| 2 | Travel filter tabs |
| 3 | Modal, mobile nav, scroll, dot nav, anchor scroll |

CSS design tokens live on `#cp12-wrap`. No hard-coded colour values anywhere.

## Validation

`validate.js` enforces 11 architectural invariants (CSS, JS, HTML). CI runs on every push/PR. Merge to `main` auto-deploys to GitHub Pages (~30s).

## Contact

Email: cp12tramdungchill@gmail.com · Phone: +84 765 679 228
