# Sweet Awards Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans in spirit, but this
> run is executed via the `Workflow` tool (Ultracode session) — one agent per phase below,
> with a verify + adversarial-review pass before commit. Tasks use checkbox syntax for
> tracking; JSX/CSS content is NOT pre-written verbatim here (would duplicate ~1500 lines
> for no benefit) — each task instead pins exact data contracts, file targets, and content
> requirements the implementing agent must satisfy, per `writing-plans` adapted for a
> content/visual-heavy feature rather than a typical TDD unit.

**Goal:** Rebuild the Sweet Awards experience (`#/sweet-awards` institutional page +
`EmBreve.jsx` public landing) as a premium espresso/creme/gold hall-of-fame that leads with
photography (Melhor Combo reveal + 8 category scenes) instead of a stat grid, while reusing
the existing accordion/history infrastructure and fixing a real data-cross bug found during
research.

**Architecture:** Extend `sweetHistoryStats.js` with pure, reusable derivation functions
(podium totals, distinct categories, combo-champion gallery, tie stats, coverage, and a
correctly-crossed "current edition scenes" list). Rewrite `HistoricoAwards.jsx`'s current-
edition section (keep the accordion + adapter for history 2016–2025 — no need to touch a
working system). Rewrite `EmBreve.jsx`'s awards section to drop Instagram iframes and lead
with Melhor Combo. Repoint the page's `--page-accent` from pink to espresso/gold.

**Tech Stack:** React 18 (JSX), Vite, plain CSS (page-scoped `<style>` blocks + `src/styles.css`
route tokens), `useRevealOnScroll` (IntersectionObserver, threshold 0) for scroll reveals — NO
new animation library (project rule; `transform`/`opacity` only, existing `motion-*` classes).

## Global Constraints

- Palette: only creme, bege, rosa, amarelo, azul/ciano, coral/vermelho, marrom, vinho
  (CLAUDE.md §3). This page's identity: espresso `#2B1810` + creme + gold `#F8B511`. No pink-
  dominant treatment (explicit user direction supersedes the current pink `--page-accent` for
  this route — see Task 5).
- No stickers, blobs, dashboard-style tables, or Instagram iframes/embeds.
- No invented data: podiums cross `sweetCoffeeHistory.js` (descriptions/links) with
  `loversAwardsResults.js` (podium places) by matching `key`, joined via `resolveParticipant`
  for logos (fallback = initials, never invented).
- Do not touch: Home, `COMING_SOON_PUBLICATION`, `AWARDS_ONLY_PUBLICATION`, existing routes,
  `/lovers/painel`, QR Code URLs, `loversAwardsResults.js`/`sweetCoffeeHistory.js` data itself.
- Motion: `transform`/`opacity` only, no loops/pulses, `prefers-reduced-motion` respected,
  mobile = vertical chapters (no horizontal scroll/pinning).
- Breakpoints: canonical scale 1080 · 960 · 720 · 560 · 420 (CLAUDE.md §17); validate at
  desktop and 375px specifically per this task's ask.

## Research findings (already verified — do not re-derive)

1. **`sweetHistoryStats.js`'s internal `editionAwards()` has a real bug**: for `ed.id ===
   '2026.1'` it only swaps in `LOVERS_2026_AWARDS_RESULTS` categorias when
   `cats.length === 0` — but `sweetCoffeeHistory.js`'s 2026.1 `premiacao.categorias` array
   has 8 entries (with `colocacoes: []` each, i.e. the INNER array is empty, not the outer
   one). So the condition never fires and `EDITIONS`-based aggregates (used by
   `getAwardWins()`, etc.) currently silently drop ALL of 2026.1's wins. This is in-scope to
   fix (file is `sweetHistoryStats.js`) and directly affects the new "recordes históricos"
   requirement (2026.1 is the richest dataset — undercounting it would misreport "mais
   pódios"/"mais primeiros lugares").
2. Both `sweetCoffeeHistory.js`'s 2026.1 categorias and `LOVERS_2026_AWARDS_RESULTS.premiacao
   .categorias` share identical `key` values (`melhor_combo`, `atendimento`, `apresentacao`,
   `doce`, `bebida`, `salgado`, `criatividade`, `envolvimento`) — safe join key.
3. `sweetCoffeeHistory.js` 2026.1 categorias carry `descricao` + `postResultado` (Instagram
   permalink) per category — `LOVERS_2026_AWARDS_RESULTS` categorias do NOT. `EmBreve.jsx`
   already does this exact cross locally (`LOVERS_META`) — reuse the same join, but move it
   into `sweetHistoryStats.js` as a shared, exported function so both pages consume one source.
4. `sweetEditionsCompat.js` (used by `HistoricoAwards.jsx`'s accordion) does its OWN simpler
   cross (wholesale replaces `premiacao` with `LOVERS_PREM` for 2026.1) — this is fine for the
   accordion (which doesn't need descriptions/post links) and must NOT be touched; it is a
   separate, working code path from `sweetHistoryStats.js`.
5. Champion photo per category (real files, confirmed to exist under
   `public/images/combos/<slug>/`):
   - Melhor Combo → `o-maestro-cafe/main.jpg`
   - Melhor Atendimento → `rollab-confeitaria/main.jpg`
   - Melhor Apresentação → `just-food-coffee/main.jpg`
   - Melhor Doce → `jolie-cafe-patisserie/main.jpg`
   - Melhor Bebida → `sweet-duo-confeitaria/main.jpg`
   - Melhor Salgado → `o-maestro-cafe/photo-02.jpg` (O Maestro Café wins 3 categories —
     reuse the brand's real gallery, never the identical frame twice)
   - Melhor Criatividade → `o-maestro-cafe/photo-03.jpg`
   - Encantamento em Loja → `mr-cupcake-confeitaria/main.jpg`
6. 2nd/3rd place brands with confirmed `public/images/combos/<slug>/main.jpg` for any card
   that wants a small supporting photo: `mr-cupcake-confeitaria`, `jolie-cafe-patisserie`,
   `douce-di-maria`, `parma-doces`, `bolomania`, `paneer-patisserie`, `casa-1190`, `canutos`.
7. Current `HistoricoAwards.jsx` (501 lines) already has a working, accessible accordion
   (`EditionAccordion`, `groupByTrack`, `StatusBadge`, `WinnerLogo`, ties-preserving
   `groupByPlace`) for the 2016–2025 history — **keep this intact**, only restyle tokens
   (Task 5) and replace the *current-edition* section (`swa-current`/`CurrentCategoryCard`,
   lines 101–144 and 276–287) with the new photo-led scenes.
8. `EmBreve.jsx` (215 lines) currently embeds a live Instagram `<iframe>` per category
   (`PostCard`/`toEmbedUrl`/`.eb-post__frame`) — this is exactly what must be removed, per
   explicit instruction, replaced with a plain "Ver resultado no Instagram" link button
   (`.eb-post__bar` already exists and is kept, only the iframe goes).

---

### Task 1: Fix the 2026.1 cross + add derived-stats functions

**Files:**
- Modify: `src/data/sweetHistoryStats.js`

**Interfaces (exported, pure, no side effects):**
- `getCurrentEditionScenes(): Array<{ key, category, description, postResultado, track,
  winners: Array<{ place: '1º'|'2º'|'3º', pos: 1|2|3, name: string }> }>` — the 8 categories
  of 2026.1, description+link from history, podium from Lovers results, joined by `key`.
  Order = the order categories appear in `sweetCoffeeHistory.js` (Melhor Combo first).
- `getPodiumTotals(): Array<{ key, name, totalPodiums, firstPlaces, cats: string[] }>` sorted
  by `totalPodiums` desc then name — every brand's appearances across pos 1/2/3, all 16
  editions (uses the fixed `EDITIONS`, so 2026.1 counts now).
- `getDistinctCategoryCount(): { total: number, categories: string[] }` — canonicalized
  (via existing `canonCategory`) distinct category names ever awarded across history.
- `getComboChampionsGallery(): Array<{ code, theme, names: string[] }>` — one entry per
  edition that had a Melhor Combo 1st place, ordered oldest→newest.
- `getTieStats(): { totalTiedPlacements: number, examples: Array<{ code, category, place,
  names: string[] }> }` — every podium placement (pos) with more than one name, across all
  editions; `examples` capped at 6 most recent for display, `totalTiedPlacements` is the full
  count (no silent truncation — the count must reflect all of them even though examples caps).
- `getResultsCoverage(): { totalEditions: number, withResults: number, withoutResults: number,
  editionsWithoutResults: Array<{ code, theme, note }> }`.

**Steps:**
- [ ] Fix `editionAwards(ed)`: for `ed.id === '2026.1'`, always cross by `key` against
  `LOVERS_2026_AWARDS_RESULTS.premiacao.categorias` (matching `c.key`) instead of the current
  `cats.length === 0` check, so `winners` are populated from the Lovers results while
  `category`/`track` still come from the history file's own categoria list (canonicalized).
- [ ] Add `getCurrentEditionScenes()` reusing the same join (share one internal helper with
  the `editionAwards` fix — do not duplicate the join logic in two places).
- [ ] Add `getPodiumTotals()`, `getDistinctCategoryCount()`, `getComboChampionsGallery()`,
  `getTieStats()`, `getResultsCoverage()` — all built on the existing `EDITIONS` /
  `collectAwardEntries()` / `aggregate()` internals already in the file. Reuse `norm` /
  `canonCategory` / `resolveParticipant` already imported — do not reimplement normalization.
- [ ] Sanity-check in a scratch node run (or via the build) that `getCurrentEditionScenes()`
  returns 8 entries each with a non-empty `winners` array (regression check for the bug fix).
- [ ] No existing exported function's signature changes — `Curiosidades.jsx` (out of scope)
  keeps working unmodified, only gets more correct 2026.1 data through `getAwardWins()` etc.

### Task 2: Rebuild the current-edition section of `HistoricoAwards.jsx`

**Files:**
- Modify: `src/pages/institutional/HistoricoAwards.jsx`

**Consumes:** `getCurrentEditionScenes()`, `getPodiumTotals()`, `getDistinctCategoryCount()`,
`getComboChampionsGallery()`, `getTieStats()`, `getResultsCoverage()` from Task 1.
Also keeps existing imports: `resolveParticipant`, `sweetEditions` (compat), `AWARD_STATUS`,
`editionMark`, `PageShell`/`PageHero`, icons.

**Structure to build (replacing/inserting around the current 5 sections):**
1. Hero (`<PageHero>`, keep as-is — title "Sweet Awards", subtitle mentioning Lovers 2026.1
   result + hall of vencedores, CTA scrolling to the reveal section).
2. **Grande revelação** — new section: Melhor Combo scene from
   `getCurrentEditionScenes()[0]` (or `.find(s => s.key === 'melhor_combo')`) as the visual
   lead: full-bleed real photo (`o-maestro-cafe/main.jpg`) + gold medal + brand logo (via
   `resolveParticipant`) + 2nd/3rd place strip below + one short paragraph (2–3 sentences,
   AGENTS.md §15 tone) explaining why Melhor Combo is the category that weighs most (média
   de Doce+Salgado+Bebida — the `description` field literally says this, reuse it, don't
   invent new copy that duplicates/contradicts it).
3. **8 cenas fotográficas** — grid/sequence of all 8 `getCurrentEditionScenes()` entries
   (Melhor Combo included, reusing the same photo — real "different editorial framing" is
   not required if it's the literal same file, but MUST use a different real photo where one
   exists per Research Finding 5, i.e. Melhor Salgado/Criatividade use O Maestro Café's
   `photo-02`/`photo-03`, not `main.jpg` again). Each scene: photo, category name, champion
   name+logo, 2nd/3rd with logos, ties rendered as multiple names on the same medal (reuse
   `groupByPlace`-style logic already in the file, don't reinvent). Motion: scroll-reveal by
   mask on the photo (e.g. `clip-path`/`overflow:hidden` translate reveal) + very subtle
   parallax (`translateY` tied to scroll position, small — a few px, never causing layout
   shift), gated by `prefers-reduced-motion` exactly like existing `.hist-edi__chev` pattern.
4. **Contexto curto** — 1 short paragraph: Sweet Awards recognizes sabor, experiência e
   comunidade (no new stat, just tone-setting copy per AGENTS.md §15).
5. **Recordes históricos, apresentados como histórias** — replace/extend the existing
   `EVOLUTION` strip (`hist-evo-section`) — keep the trilha explanation card (Júri Técnico /
   Sweet Lovers, can reuse existing copy) and ADD: a "mais pódios" story card (from
   `getPodiumTotals()[0]`), a "mais primeiros lugares" story card (from `getAwardWins()[0]`,
   already exists), a "categorias premiadas" story card (from `getDistinctCategoryCount()`),
   and a **galeria de campeões de Melhor Combo** — a horizontal logo/name strip from
   `getComboChampionsGallery()` (one small item per edition, oldest→newest, with edition code
   as caption) — NOT a bar chart, NOT a ranking table: names/logos in a row, a walk through
   history. Include one honest transparency line near this section using
   `getResultsCoverage()` (e.g. "X das 16 edições têm pódio completo registrado; Y ainda sem
   premiação (antes de 2019)") — do not claim records are definitive without this line.
6. **Acervo por edição** — KEEP the existing accordion section (`hist-list-section`,
   `EditionAccordion`, `ordered = sweetEditions...`) unchanged in logic; only restyle tokens
   per Task 5 (no rosa-dominant colors) — ties/2016–2018 "sem premiação" notes already work,
   do not touch that behavior.
7. CTA final — keep, pointing to `#/edicoes` and `#/curiosidades` (already does both).
- [ ] Remove `CurrentCategoryCard` + `swa-current`/`.swa-cat*` CSS block (superseded by the
  new photo scenes) — do not leave dead code/CSS behind.
- [ ] Keep `WinnerLogo`, `groupByPlace`, `Podium`, `CategoryCard`, `EditionAccordion`,
  `groupByTrack`, `StatusBadge` as-is (still used by the accordion section).

### Task 3: Rebuild the awards section of `EmBreve.jsx`

**Files:**
- Modify: `src/pages/institutional/EmBreve.jsx`

**Consumes:** `getCurrentEditionScenes()` from Task 1 (replaces the local `LOVERS_META` +
`CATEGORIES` merge — same data, one shared source instead of a second local join).

**Steps:**
- [ ] Delete `toEmbedUrl()` and `PostCard` (iframe embed) entirely.
- [ ] Reorder so Melhor Combo renders first, as a slightly larger/lead card (photo + gold
  medal + champion), before the remaining 7 in a compact grid.
- [ ] Each category card: real photo (per Research Finding 5/6 mapping), podium (existing
  `MEDAL`/`.eb-podium`/`BrandChip` markup can stay), and — instead of the removed iframe —
  keep only the existing `.eb-post__bar` "Ver no Instagram" link (already iframe-free markup,
  just remove the `<iframe>` sibling and the now-unused `.eb-post__frame` CSS).
- [ ] Keep hero (`.eb-hero`) and footer (`.eb-foot`) untouched — only the awards section
  (`.eb-awards`/`.eb-grid`/`.eb-cat`) changes.
- [ ] Compact = smaller card padding/photo aspect than the full institutional page, not a
  removal of information — still 8 categories, still real logos/photos/links.

### Task 4: Motion pass

**Files:**
- Modify: `src/pages/institutional/HistoricoAwards.jsx` (page-scoped `<style>` block)
- Modify: `src/pages/institutional/EmBreve.jsx` (page-scoped `<style>` block)

**Steps:**
- [ ] Hero: short reveal only (reuse `motion-stagger`/`motion-reveal-up`, already used
  elsewhere in both files — no new hero animation system).
- [ ] Melhor Combo reveal: medal + photo + logo + podium enter in stagger (`motion-stagger`
  on the container, staggered child `transition-delay` via nth-child or existing pattern from
  `.swa-current__grid`/`.hist-list` — check how `motion-stagger` currently staggers children
  in this codebase before adding a new mechanism).
- [ ] Category scenes: scroll reveal by mask (`clip-path`/`overflow` + `transform`) + subtle
  parallax on the photo only (`transform: translateY(...)`, driven by IntersectionObserver
  ratio or scroll position — small amplitude, e.g. ≤ 12px, never `top`/`margin`).
- [ ] Records section: arrow rotation reuse pattern from `.hist-edi__chev` (already rotates
  180deg on open) if an expandable element is used; otherwise a short entrance only.
- [ ] `transform`/`opacity` only anywhere new is added — no `width`/`height`/`top`/`left`
  animated.
- [ ] `@media (prefers-reduced-motion: reduce)` block disables all new transforms/parallax
  (mirror the existing block at the end of `HistoricoAwards.jsx`'s `<style>`).
- [ ] Mobile: scenes stack as vertical chapters (no horizontal scroll-snap, no pinning) —
  confirm the grid/flex direction collapses to `1fr` at the existing 720px breakpoint used
  elsewhere in this file.

### Task 5: Re-tone the page accent (espresso/gold, not pink-dominant)

**Files:**
- Modify: `src/styles.css` (the `body.route-historico-awards { --page-accent: ... }` rule —
  grep for `route-historico-awards` to find it; do not touch other routes' accent rules)
- Modify: `AGENTS.md` (§3 "Acentos atuais" line + §12 identity note — this is a confirmed new
  preference per §19, not a random doc edit)
- Modify: `CLAUDE.md` (same two references, kept in sync — CLAUDE.md is the canonical file per
  §0 of this session; AGENTS.md is a stale duplicate found during research, update both so
  they stop contradicting each other)

**Steps:**
- [ ] Change `--page-accent` for `route-historico-awards` from `#F2548A` (pink) to a gold tone
  within the official palette, e.g. `#F8B511` (amarelo/gold, already used everywhere else as
  the medal-gold) — confirm contrast with `--ink` per the existing hero-background rule
  (§4: hero background = `--page-accent` full, text in dark ink) still passes.
- [ ] Confirm `CATEGORY_TONE` map in `HistoricoAwards.jsx` (kept for the accordion's
  `CategoryCard`, if still referenced after Task 2) has no dominant-pink entries — adjust
  individual category tones to fit the espresso/gold/cream story if needed, keeping them
  inside the official palette (§3).
- [ ] Update AGENTS.md §3 line: `Awards/Histórico rosa #F2548A` → the new gold value, and
  §12's description if it still says "rosa" anywhere.
- [ ] Update CLAUDE.md's matching lines (§3 "Acentos atuais", §12) to the same new value —
  keep the two files' Sweet Awards accent references consistent.
- [ ] Do not touch any other route's `--page-accent` in this pass.

### Task 6: Verify

**Files:** none (validation only)

**Steps:**
- [ ] `npm run build` (or `dist_check` if `dist/` is Dropbox-locked). Must be green before
  any commit.
- [ ] Browser-drive `#/sweet-awards` at desktop width and at 375px: confirm all 8 categories
  render, Melhor Combo reveal renders with a real photo + gold medal, ties render as multiple
  names on one medal (check "Melhor Doce" 3rd place — Parma Doces + Bolomania tied — and
  "Melhor Bebida" 2nd place — Canuto's + Casa 1190 tied — and "Encantamento em Loja" 2nd place
  — Jolie + O Maestro Café tied), no horizontal overflow, no console errors.
- [ ] Browser-drive the public `EmBreve` route at desktop and 375px: confirm no `<iframe>`
  remains in the DOM, Melhor Combo appears first, "Ver resultado no Instagram" links still
  point to the correct `postResultado` URLs, no console errors.
- [ ] Toggle `prefers-reduced-motion: reduce` (emulate via CDP/`resize_window` colorScheme-
  style override or inline style check) and confirm transforms are disabled, no layout shift.
- [ ] Confirm images use `object-fit: contain` for logos and real `object-fit: cover` (or
  intentional crop) for combo photos; confirm any missing-asset path shows the existing
  fallback (monogram / "Foto pendente"), never a broken `<img>` or invented external image.
- [ ] Re-read the diff once against this plan's Task list — confirm nothing outside the
  allowed scope (Home, flags, routes, `/lovers/painel`, QR URLs, source data files) changed.

### Task 7: Commit

**Files:** only the files touched above.

**Steps:**
- [ ] `git add` only: `src/data/sweetHistoryStats.js`, `src/pages/institutional/
  HistoricoAwards.jsx`, `src/pages/institutional/EmBreve.jsx`, `src/styles.css`, `AGENTS.md`,
  `CLAUDE.md`, this plan file.
- [ ] Commit message: `feat(sweet-awards): redesign premiacao com cenas fotograficas e
  recordes historicos` (or similarly scoped `feat:`), body notes the 2026.1 cross-bug fix.
- [ ] `git push origin dev/site-completo` — only after Task 6 fully passes.
- [ ] Report: build result, commit hash+message, push result.

---

## Self-review (writing-plans skill, run before execution)

1. **Spec coverage:** Hero(✓ Task 2.1) · Grande revelação(✓ Task 2.2) · 8 cenas(✓ Task 2.3) ·
   Contexto curto(✓ Task 2.4) · Recordes como histórias(✓ Task 2.5, Task 1) · Acervo por
   edição(✓ Task 2.6, unchanged) · CTA final(✓ Task 2.7, unchanged) · dados derivados
   (✓ Task 1) · EmBreve (✓ Task 3) · Movimento (✓ Task 4) · Responsividade/acessibilidade
   (✓ Tasks 2–4, 6) · Validação (✓ Task 6) · commit/push escopado (✓ Task 7). No gaps found.
2. **Placeholder scan:** no TBD/"add validation"/"similar to Task N" left unresolved — every
   task names exact files, exact function names, and exact data sources.
3. **Type/name consistency:** `getCurrentEditionScenes`, `getPodiumTotals`,
   `getDistinctCategoryCount`, `getComboChampionsGallery`, `getTieStats`,
   `getResultsCoverage` are the only new exports, referenced identically across Tasks 1–3.
