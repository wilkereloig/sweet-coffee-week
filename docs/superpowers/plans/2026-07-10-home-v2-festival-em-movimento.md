# Home V2 Festival em Movimento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the duplicated project's Home as a desktop-first editorial route that presents the festival as movement through Natal.

**Architecture:** Replace only `src/pages/institutional/Home.jsx` in the V2 copy. Reuse the existing router, real gallery assets, canonical festival facts, shared header/footer, tokens, and icons. Keep all original routes intact.

**Tech Stack:** React 18, Vite, existing CSS tokens and `PhotoRotator`.

## Global Constraints

- Work only in `site-sweet-coffee-week-home-v2`; leave the original project untouched.
- Preserve official nomenclature, real data, palette, routes, and the institutional/Lovers separation.
- Desktop is the primary target; the layout must reflow cleanly below 960px without a separate mobile redesign.
- Do not add dependencies, random decorative assets, or invented metrics.
- Validate at 1440px, 1280px, 1024px, and 390px, then run the Vite build.

---

### Task 1: Replace the Home narrative

**Files:**
- Modify: `src/pages/institutional/Home.jsx`

- [ ] Replace the existing Home markup with the `Festival em movimento` sequence: asymmetric hero, route strip, city/brand story, three audience paths, edition lifecycle, proof metrics, media, and F2 closure.
- [ ] Reuse `heroGalleryImages`, `aboutGalleryImages`, `festivalFacts`, `PhotoRotator`, and existing navigation routes.

### Task 2: Build the visual system inside the page

**Files:**
- Modify: `src/pages/institutional/Home.jsx`

- [ ] Add page-scoped CSS for the new desktop composition, including responsive reflow at the canonical 1080, 960, 720, 560, and 420 breakpoints.
- [ ] Ensure visible focus states, reduced-motion behavior, no horizontal overflow, and interactive feedback on links.

### Task 3: Validate the isolated V2

**Files:**
- Test: Vite dev server and browser screenshots

- [ ] Install the copied project's dependencies if absent, start the V2 server on a new port, and inspect the Home at the required desktop widths.
- [ ] Run `npm run build -- --outDir dist_check` and remove the temporary output after validation.
