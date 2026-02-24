# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Trạm CP12** is a single-page static website for a homestay accommodation in Đà Lạt, Vietnam. Deployed as a standalone GitHub Pages site.

- **Language:** Vietnamese (HTML `lang="vi"`) with mixed Vietnamese/English content
- **Stack:** Vanilla HTML5, CSS3, and JavaScript (no frameworks, no bundler, no build step)
- **Hosting:** GitHub Pages — `tramcp12.github.io/portfolio/`
- **External Dependencies:** Google Fonts only (runtime, non-blocking); `html-validate` (dev-only)

---

## Repository Structure

```
portfolio/
├── index.html           # Main page — HTML only, no inline scripts
├── cp12.css             # Complete stylesheet
├── cp12.js              # All JavaScript — 3 IIFEs in DOM order
│
├── img/                 # Self-hosted images
│   ├── travel-lake-run.jpg
│   ├── travel-flower-garden.jpg
│   ├── travel-langbiang.jpg      ← og:image
│   ├── travel-night-market.jpg
│   ├── travel-hill-loop.jpg
│   ├── travel-zen-monastery.jpg
│   └── favicon.svg
│
├── validate.js          # Architectural invariant checker (11 rules)
├── package.json         # Dev tooling
├── .gitignore
│
├── .github/workflows/
│   ├── ci.yml           # Validate + lint on every push/PR
│   └── pages.yml        # Auto-deploy to GitHub Pages on main push
│
└── CLAUDE.md            # This file
```

`cp12.html` is kept in the repo as the original Wix source reference — it is **not** served by GitHub Pages. `index.html` is the standalone deployment version.

---

## Development Workflow

### Making Changes

1. **Edit `index.html`** for HTML changes
2. **Edit `cp12.js`** for JavaScript changes
3. **Edit `cp12.css`** for all styling changes
4. **Test locally** by opening `index.html` in a browser — no build step needed
5. **Run validation** to confirm architectural invariants still hold
6. **Commit and push** to a feature branch → CI runs automatically

### Validation

Install dev dependencies (one-time):
```bash
npm install
```

Run all checks:
```bash
npm run check
```

Or individually:
```bash
node validate.js          # 11 architectural invariant checks
npx html-validate index.html  # HTML spec compliance
```

`validate.js` enforces these invariants — **do not break them**:

| Check | File | Rule |
|-------|------|------|
| CSS-1 | `cp12.css` | Font families appear exactly once (Cormorant Garamond, Be Vietnam Pro) |
| CSS-2 | `cp12.css` | Shared button base extracted to `.btn-base` or grouped selector |
| CSS-3 | `cp12.css` | Alpha tokens `--gold-20` and `--pine-dark-90` defined in `:root` |
| A-1 | `cp12.css` | `@media (prefers-reduced-motion: reduce)` guard exists |
| R-1 | `cp12.css` | `@media (max-width: 768px)` tablet breakpoint exists |
| JS-1 | `cp12.js` | `try { } catch (e) { }` init guard exists |
| JS-3 | `cp12.js` | `var cachedNav = null` nav caching pattern exists |
| P-1 | `index.html` | No `<img>` tags — all images are CSS `background` properties |
| H-1 | `index.html` | `og:image` meta tag present for social sharing |

### Manual Testing Checklist

- Check all sections render correctly
- Test responsive layout at 768px and 480px widths
- Verify scroll-triggered animations
- Test modal open/close (click play button, Escape key, backdrop click)
- Test hamburger menu on mobile viewport
- Test travel filter tabs (All / Running / Food / Nature)
- Test keyboard navigation (PageDown, Shift+ArrowDown)
- Run Lighthouse or axe DevTools accessibility audit

### Branch Strategy

Work on `claude/...` feature branches; never commit directly to `main`.

### Deployment

Push to `main` → `pages.yml` deploys to GitHub Pages automatically (~30 seconds).

One-time GitHub repo settings:
1. **Settings → Pages → Source**: Select **GitHub Actions**
2. **Settings → Branches**: Require CI status check to pass before merge on `main`

---

## JavaScript Architecture

`cp12.js` contains three IIFEs in DOM order. Each IIFE uses independent local variables — do not merge them (both IIFE 1 and IIFE 3 declare `var wrap`; merging would create a collision).

| IIFE | Responsibility |
|------|---------------|
| 1 | Hero play button + video frame click/keydown handlers |
| 2 | Travel filter tabs (`data-filter`, `aria-selected`, live count) |
| 3 | Modal, mobile nav, IO reveal, scroll RAF, dot nav, anchor scroll |

`window.cp12OpenModal` is set in IIFE 3 and called (with guard) from IIFE 1. This is intentional — the guard `if (window.cp12OpenModal)` is defensive coding, kept for robustness.

---

## HTML Structure

Seven sections inside `#cp12-wrap`, tracked by dot-nav via `data-section` and JS `querySelectorAll`:

```
#home     — Hero (two-column, diagonal clip-path)
#video    — Welcome film showcase with modal trigger
#rooms    — 4 room cards in a grid
#explore  — Filterable travel guide (Running / Food / Nature)
#about    — Two-column brand story
#journal  — Blog / journal cards
#cta      — Booking call-to-action with contact details
<footer>  — Multi-column footer, social links, copyright
```

---

## CSS Conventions

### Design Tokens

All colours, typography, and spacing are CSS variables on `#cp12-wrap`. **Never hard-code colour values.**

#### Colour Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--cream` | `#f5f0e8` | Primary light background |
| `--warm-white` | `#fdfaf5` | Elevated light surfaces |
| `--pine` | `#2d4a3e` | Primary brand green |
| `--pine-light` | `#3d6357` | Hover states on pine |
| `--pine-dark` | `#1a3028` | Footer, CTA backgrounds |
| `--pine-mid` | `#5c8b7a` | Mid-tone accents |
| `--mist` | `#b8cabd` | Subtle green tints |
| `--earth` | `#8b6347` | Warm brown accent |
| `--terracotta` | `#c4724a` | Vibrant warm accent |
| `--gold` | `#c9a96e` | Highlight/gold accent |
| `--charcoal` | `#2a2522` | Primary dark text |
| `--slate` | `#4a5568` | Secondary text |
| `--slate-light` | `#718096` | Tertiary/muted text |
| `--text-warm` | `#3d3530` | Warm-tinted body text |
| `--slate-blue` | `#2d4a7a` | Badge/info accents |
| `--gold-20` | alpha variant | Defined as token; required by validate.js |
| `--pine-dark-90` | alpha variant | Defined as token; required by validate.js |

#### Typography

| Font | Weights | Used For |
|------|---------|----------|
| Cormorant Garamond | 300, 600, italic 300 | Headings, decorative text |
| Be Vietnam Pro | 300, 400, 500 | Body copy, UI labels |

Each font family must appear **exactly once** in `cp12.css` (validate.js CSS-1 check).

### Naming Conventions

- **Sections:** `.sect-home`, `.sect-rooms`, `.sect-explore`, etc.
- **Components:** `.hero-left`, `.room-card`, `.travel-card`, `.blog-card`
- **Utilities:** `.fade-up`, `.delay-1` through `.delay-5`, `.cp12-reveal`
- **State:** `.active`, `.visible`, `.open`, `.on-dark`, `.on-light`
- **Buttons:** `.btn-primary`, `.btn-outline`, `.btn-ghost`

### Responsive Breakpoints

| Breakpoint | Width | Changes |
|------------|-------|---------|
| Desktop | >900px | Full layout, sidebar dots visible |
| Tablet | ≤768px | Single columns, hamburger nav |
| Mobile | ≤480px | Stacked layouts, reduced padding |
| Reduced motion | `prefers-reduced-motion` | All animations disabled |

### Z-Index Layers

| Layer | Z-index | Element |
|-------|---------|---------|
| Base content | 1 | Cards, sections |
| Navigation | 100–1000 | Nav bar (increases on scroll) |
| Mobile nav overlay | 200 | Hamburger menu panel |
| Sidebar UI | 9000 | Dot nav, next-section button |
| Modal | 1000000 | Video modal overlay |

### Layered Card Backgrounds

Room and blog cards use a **3-layer CSS background** pattern:

```css
background:
  linear-gradient(...)   /* 1. Diagonal light shaft / specular highlight */,
  radial-gradient(...)   /* 2. Atmospheric glow */,
  linear-gradient(...);  /* 3. Base gradient */
```

---

## JavaScript Conventions

### Architecture Requirements

The following patterns are enforced by `validate.js` and must be maintained:

- **Error safety:** The main init block must be wrapped in `try { } catch (e) { }`
- **Nav caching:** Nav element must be cached: `var cachedNav = null;` / `if (!cachedNav) { cachedNav = ... }`
- **No `<img>` tags:** All images use CSS `background` properties for performance

### Animation System

Scroll-triggered animations use `IntersectionObserver` (threshold `0.18`) on `.cp12-reveal` elements, which gain `.visible` to trigger CSS keyframe animations.

**Core keyframes:**

| Name | Effect |
|------|--------|
| `cp12fu` | Fade-up (most common) |
| `cp12SlideLeft` / `cp12SlideRight` | Horizontal slide-in |
| `cp12ScaleUp` | Scale from 0.9 with fade |
| `cp12FadeScale` | Smooth scale transition |
| `cp12GlowPulse` | Pulsing box-shadow |
| `cp12BobDown` | Vertical bob (next-button) |

Staggered children use `:nth-child` selectors with increasing `animation-delay`.

### Event Patterns

- **Scroll:** `window.addEventListener('scroll', ...)` — nav shadow, dot activation, next-button visibility
- **Keyboard:** `Escape` closes modal; `PageDown` / `Shift+ArrowDown` advance to next section
- **Reveal:** `IntersectionObserver` with `threshold: 0.18`

### Data Attributes Used in JS

| Attribute | Element | Purpose |
|-----------|---------|---------|
| `data-category` | Travel cards | Shown/hidden by filter tabs |
| `data-filter` | Filter tab buttons | Active value (`all`, `running`, `food`, `nature`) |
| `data-label` | Dot nav items | Tooltip text |
| `data-target` | Dot nav items | Section ID to scroll to |
| `data-section` | `<section>` elements | Tracked by scroll for dot activation |

---

## Accessibility Requirements

- **ARIA:** Keep `aria-label`, `role`, and `aria-live` attributes intact
- **Focus management:** Modal must trap focus on open and restore on close
- **Skip nav:** `.skip-nav` must remain the first interactive element
- **Keyboard:** Modal closes with `Escape`; buttons respond to `Enter` and `Space`
- **Reduced motion:** Respect `@media (prefers-reduced-motion: reduce)`

---

## Key Constraints

- **No JS frameworks** — vanilla JS only, no build step
- **npm is dev-only** — `html-validate` is a dev tool; no runtime npm dependencies
- **Three IIFEs in `cp12.js`** — keep them separate (variable name collisions if merged)
- **Scope all CSS under `#cp12-wrap`** — required for isolation
- **Use `var` in IIFE-scoped code** — modern browser APIs (`IntersectionObserver`, `classList`, arrow functions) are fine
- **Images in `img/`** — all travel card images are self-hosted; do not reintroduce Wix CDN URLs
- **No `<img>` tags** — all images use CSS `background` properties (P-1 invariant)
- **Run `npm run check`** before committing CSS or JS changes

---

## Content Reference

### Rooms

| ID | Name | Price/Night |
|----|------|-------------|
| `r1` | Phòng Trạm (Signature Room) | 580,000 VND |
| `r2` | Góc Gió (Breeze Nook) | 450,000 VND |
| `r3` | Tổ Chim (Birdsong Suite) | 720,000 VND |
| `r4` | Dorm Trạm (Social Dormitory) | 180,000 VND |

### Contact

- **Email:** `cp12tramdungchill@gmail.com`
- **Phone:** `+84765679228`
- **Address:** 228/6 Đường Phú Đồng Thiên Vương, Phường 8, Đà Lạt, Lâm Đồng, Việt Nam

### Social Links

Facebook · Instagram · YouTube · TikTok · Google Maps

### External Assets

- **Fonts:** Google Fonts CDN (Cormorant Garamond, Be Vietnam Pro) — loaded non-blocking via `media="print"` trick
- **Travel images:** Self-hosted in `img/` directory (6 JPEG files)
- **Room/blog card backgrounds:** Pure CSS gradients — no image files needed
