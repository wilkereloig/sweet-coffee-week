# Curiosidades "Dados que se movem" (Direção E) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir `src/pages/institutional/Curiosidades.jsx` como página de dados animados (contadores, timeline de marcos, gráfico de unidades com 21 logos reais, barras do hall, cards hierárquicos do Melhor Combo com fotos), 100% derivada da base histórica.

**Architecture:** Novas funções de agregação em `src/data/sweetHistoryStats.js` (única fonte de números); página React reescrita consumindo-as, com hooks locais (IntersectionObserver + count-up), CSS próprio em `src/styles/curiosidades.css` (prefixo `.cx-`), e teste E2E Playwright (`tests/curiosidades-check.mjs`) rodando contra o build de produção via `vite preview` (mesmo modelo de `tests/responsive.mjs`).

**Tech Stack:** React 18 + Vite 5 (sem libs novas), Playwright (já em devDependencies), CSS puro com tokens globais do site.

**Spec:** `docs/superpowers/specs/2026-07-07-curiosidades-redesign-design.md` — ler antes de começar.

## Global Constraints

- Branch de trabalho: `worktree-curiosidades` (worktree em `.claude/worktrees/curiosidades`). NUNCA tocar `master` nem `dev/site-completo`.
- Paleta oficial apenas; marcadores: fundo creme → `--yellow-deep #D9960A` / `--coral-deep #C13E25` / `--pink-deep #D63648` / `--cyan-deep #149FC0`; fundo chocolate (`--choco-deep`) → `--yellow` / `--coral` / `--pink` / `--cyan`. Nenhum hex novo.
- ZERO eyebrows/kickers acima de títulos (CLAUDE.md §5). ZERO fonte mono em rótulos. ZERO stickers.
- ZERO em-dash (`—`) e en-dash (`–`) em texto visível da página nova (usar vírgula, ponto, dois-pontos ou hífen).
- Tema creme na página inteira; UM único bloco chocolate (S3 homenagens). Nada de alternância clara/escura.
- Edições NUNCA comparadas entre si (CLAUDE.md §11) — nenhum número de participantes por edição.
- Animações: só `transform`/`opacity`; `prefers-reduced-motion: reduce` → estado final imediato; easing `cubic-bezier(.22,.61,.36,1)`; sem bounce.
- Nenhum número hardcoded na página: tudo derivado de `sweetHistoryStats.js` / `participants.js` (única exceção: textos editoriais dos marcos, cujas DATAS vêm derivadas).
- Logos via `resolveParticipant` com fallback de iniciais; fotos `/images/combos/<slug>/main.jpg` com fallback editorial "Foto do combo pendente" via `onError` (Olí Gastrô e Casa de Taipa não têm pasta).
- Nomenclatura: nunca "o Sweet" (CLAUDE.md §2).
- Commits pequenos com prefixo `feat:`/`test:`/`docs:`; `npm run build` verde antes de cada commit.
- Margens: usar `PageShell`/`PageHero` existentes (hero atual da página é mantido).

---

### Task 1: Agregações novas em sweetHistoryStats.js

**Files:**
- Modify: `src/data/sweetHistoryStats.js` (adicionar import no topo + 3 funções no fim)

**Interfaces:**
- Consumes: `norm`, `canonCategory`, `collectAwardEntries`, `EDITIONS` (já existem no módulo, privados); `PARTICIPANTS` de `./participants`.
- Produces (usadas na Task 3):
  - `getHomageGroups(): Array<{ key: string, label: string, count: number, brands: Array<{ name, slug, theme }> }>` ordenado por count desc;
  - `getRepeatCategoryWinners(categoryName: string): Array<{ key, name, wins: Array<{ code, track }> }>` só quem tem 2+ vitórias de 1º, ordenado por vitórias desc;
  - `getMilestoneFacts(): { firstEdition, lastEdition, editionsCount, festivalYears, firstAwards, firstTracks, uniqueCategories }` onde cada edição é `{ code, theme }` e `uniqueCategories` é `Array<{ category, code }>`.

- [ ] **Step 1: Adicionar o import de PARTICIPANTS**

No topo de `src/data/sweetHistoryStats.js`, junto dos outros imports:

```js
import { PARTICIPANTS } from './participants'
```

- [ ] **Step 2: Adicionar as 3 funções no fim do arquivo**

```js
// ---- HOMENAGENS: marcas da Lovers agrupadas pela edição que escolheram reviver. ----
// Fonte: PARTICIPANTS[].edition (grafia normalizada; "Contos de Fada" == "Contos de Fadas").
const HOMAGE_LABELS = {
  'sweet trip': 'Sweet Trip',
  'sweet celebration': 'Sweet Celebration',
  'sweet music': 'Sweet Music',
  'contos de fadas': 'Contos de Fadas',
  'sweet series': 'Sweet Series',
  'filmes': 'Filmes',
  'terras potiguares': 'Terras Potiguares',
}

export function getHomageGroups() {
  const map = new Map()
  for (const p of PARTICIPANTS) {
    let key = norm(p.edition)
    if (key === 'contos de fada') key = 'contos de fadas'
    if (!map.has(key)) map.set(key, { key, brands: [] })
    map.get(key).brands.push({ name: p.name, slug: p.slug, theme: p.theme })
  }
  return [...map.values()]
    .map((g) => ({ ...g, label: HOMAGE_LABELS[g.key] || g.brands[0].name, count: g.brands.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// ---- Vencedores repetidos de uma categoria (só 1º lugar; trilhas/empates preservados). ----
export function getRepeatCategoryWinners(categoryName) {
  const target = norm(canonCategory(categoryName))
  const rows = collectAwardEntries().filter((r) => r.pos === 1 && norm(r.category) === target)
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.key)) map.set(r.key, { key: r.key, name: r.name, wins: [] })
    map.get(r.key).wins.push({ code: r.code, track: r.track })
  }
  return [...map.values()]
    .filter((w) => w.wins.length > 1)
    .sort((a, b) => b.wins.length - a.wins.length || a.name.localeCompare(b.name))
}

// ---- Marcos/primeiras vezes derivados da base (datas NUNCA hardcoded na página). ----
export function getMilestoneFacts() {
  const ordered = [...EDITIONS].sort((a, b) => a.ordem - b.ordem)
  const first = ordered[0] || null
  const last = ordered[ordered.length - 1] || null
  const firstAwards = ordered.find((e) => e.awards.length > 0) || null
  const firstTracks = ordered.find((e) => e.awards.some((a) => a.track)) || null
  const catCodes = new Map()
  for (const e of ordered) {
    for (const a of e.awards) {
      const k = norm(a.category)
      if (!catCodes.has(k)) catCodes.set(k, { category: a.category, codes: [] })
      catCodes.get(k).codes.push(e.code)
    }
  }
  const uniqueCategories = [...catCodes.values()]
    .filter((c) => c.codes.length === 1)
    .map((c) => ({ category: c.category, code: c.codes[0] }))
  const pick = (e) => (e ? { code: e.code, theme: e.theme } : null)
  return {
    firstEdition: pick(first),
    lastEdition: pick(last),
    editionsCount: ordered.length,
    // "2026.1" - "2016" ≈ 10.1 → 10 anos; parseFloat proposital (ids tipo "2020.2").
    festivalYears: first && last ? Math.round(parseFloat(last.code) - parseFloat(first.code)) : null,
    firstAwards: pick(firstAwards),
    firstTracks: pick(firstTracks),
    uniqueCategories,
  }
}
```

- [ ] **Step 3: Build**

Run: `npm run build` (no worktree). Expected: sucesso, sem erro de import.

- [ ] **Step 4: Commit**

```bash
git add src/data/sweetHistoryStats.js
git commit -m "feat(curiosidades): agregações de homenagens, vencedores repetidos e marcos na base de stats"
```

---

### Task 2: Teste E2E (escrito antes, falha até a página existir)

**Files:**
- Create: `tests/curiosidades-check.mjs`
- Modify: `package.json` (novo script `test:curiosidades`)

**Interfaces:**
- Consumes: build de produção (`dist/`) servido por `vite preview`; classes `.cx-*` que a Task 3 vai criar.
- Produces: comando `npm run test:curiosidades` usado como gate na Task 4.

- [ ] **Step 1: Criar `tests/curiosidades-check.mjs`**

```js
/**
 * Verificação E2E — página Curiosidades (redesign "dados que se movem").
 * Roda contra o BUILD de produção via `vite preview` (mesmo motivo de responsive.mjs:
 * em dev o DevViewportSwitcher embrulha o app num iframe).
 * Exige `dist/` já buildado: npm run build && npm run test:curiosidades
 *
 * Checa: 21 chips de marca no gráfico de homenagens; 6 na linha Sweet Trip; 5 marcos;
 * hall com 5+ linhas; card líder do Melhor Combo com o maior número; zero eyebrows;
 * sem overflow lateral em 390px; reduced-motion mostra estado final imediato.
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const PORT = 5181
const URL = `http://localhost:${PORT}/#/curiosidades`

let failures = 0
const fail = (msg) => { console.error('  ✗ ' + msg); failures++ }
const ok = (msg) => console.log('  ✓ ' + msg)

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  shell: true,
  stdio: 'pipe',
})
await new Promise((r) => setTimeout(r, 3500))

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  const units = await page.locator('.cx-unit').count()
  units === 21 ? ok('21 chips no gráfico de homenagens') : fail(`chips de homenagem: ${units} (esperava 21)`)

  const firstRow = await page.locator('.cx-waffle-row').first().locator('.cx-unit').count()
  firstRow === 6 ? ok('linha líder (Sweet Trip) com 6 marcas') : fail(`linha líder: ${firstRow} chips (esperava 6)`)

  const marcos = await page.locator('.cx-ms-item').count()
  marcos === 5 ? ok('5 marcos na linha do tempo') : fail(`marcos: ${marcos} (esperava 5)`)
  console.log('  anos dos marcos (conferir com ACERVO.md):', (await page.locator('.cx-ms-year').allTextContents()).join(' | '))

  const bars = await page.locator('.cx-bar-row').count()
  bars >= 5 ? ok(`hall dos premiados com ${bars} linhas`) : fail(`hall: só ${bars} linhas (esperava 5+)`)

  const leadTxt = await page.locator('.cx-combocard--lead .cx-combocard-n').textContent()
  const otherTxts = await page.locator('.cx-combocard:not(.cx-combocard--lead) .cx-combocard-n').allTextContents()
  const leadN = parseInt(leadTxt, 10)
  Number.isFinite(leadN) && otherTxts.every((t) => parseInt(t, 10) <= leadN)
    ? ok(`card líder do Melhor Combo com ${leadN} vitórias (maior de todos)`)
    : fail(`card líder do Melhor Combo inconsistente (líder=${leadTxt}, demais=${otherTxts.join(',')})`)

  const eyebrows = await page.locator('.cx-eyebrow, .eyebrow').count()
  eyebrows === 0 ? ok('zero eyebrows nas seções') : fail(`eyebrows na página: ${eyebrows} (esperava 0)`)

  const m = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await m.goto(URL, { waitUntil: 'networkidle' })
  await m.waitForTimeout(800)
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  overflow <= 0 ? ok('sem overflow lateral em 390px') : fail(`overflow lateral de ${overflow}px em 390px`)

  const rm = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  await rm.goto(URL, { waitUntil: 'networkidle' })
  await rm.waitForTimeout(400)
  const opacity = await rm.locator('.cx-unit').first().evaluate((el) => getComputedStyle(el).opacity)
  opacity === '1' ? ok('reduced-motion mostra estado final imediato') : fail(`reduced-motion: opacity ${opacity} (esperava 1)`)
} finally {
  await browser.close()
  server.kill('SIGTERM')
}

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nTudo verde.')
```

- [ ] **Step 2: Registrar o script no `package.json`**

Na seção `"scripts"`, depois de `"test:mobile"`:

```json
"test:curiosidades": "node tests/curiosidades-check.mjs",
```

- [ ] **Step 3: Rodar e confirmar que FALHA (página antiga não tem `.cx-*`)**

Run: `npm run build && npm run test:curiosidades`
Expected: FAIL — "chips de homenagem: 0 (esperava 21)" etc., exit code 1.

- [ ] **Step 4: Commit**

```bash
git add tests/curiosidades-check.mjs package.json
git commit -m "test(curiosidades): E2E playwright do redesign (falha até a página nova existir)"
```

---

### Task 3: Reescrever a página + CSS

**Files:**
- Create: `src/styles/curiosidades.css`
- Modify: `src/pages/institutional/Curiosidades.jsx` (reescrita completa)

**Interfaces:**
- Consumes: `getAwardWins`, `getParticipantAsset`, `getHomageGroups`, `getRepeatCategoryWinners`, `getMilestoneFacts` (Task 1); `PARTICIPANTS` de `../../data/participants`; `PageShell`, `PageHero` (+ o componente de CTA que a página atual já usa) de `../../components/layout`.
- Produces: classes `.cx-unit`, `.cx-waffle-row`, `.cx-ms-item`, `.cx-ms-year`, `.cx-bar-row`, `.cx-combocard`, `.cx-combocard--lead`, `.cx-combocard-n` que a Task 2 verifica.

- [ ] **Step 1: Guardar hero e CTA atuais como referência**

Run: `git show HEAD:src/pages/institutional/Curiosidades.jsx > /tmp/curiosidades-old.jsx` (ou ler o arquivo).
Anotar: (a) o JSX do `<PageHero ...>` (props exatas: título, lead, classe de highlight) e (b) o bloco de CTA final + seus imports. Esses DOIS blocos são preservados como estão na página nova. Conferir em `src/components/layout/index.js` (ou equivalente) o nome exato do componente de CTA exportado.

- [ ] **Step 2: Criar `src/styles/curiosidades.css`**

```css
/* ============================================================
   CURIOSIDADES — redesign "dados que se movem" (Direção E).
   Tema creme na página inteira; S3 (homenagens) é o ÚNICO bloco
   chocolate. Sem eyebrows. Animações só transform/opacity, com
   estado final imediato sob prefers-reduced-motion.
   Tokens globais: swc-redesign.css. Prefixo local: .cx-
   ============================================================ */

.cx-sec { padding: clamp(52px, 7vw, 96px) 0; }
.cx-sec--tint { background: var(--cream-deep); }
.cx-sec--choco { background: var(--choco-deep); color: var(--cream); }
.cx-sec h2 {
  font-family: var(--font-display);
  font-size: clamp(23px, 3.2vw, 34px);
  font-weight: 800; letter-spacing: -0.015em; line-height: 1.1;
  margin: 0 0 8px; max-width: 22ch; text-wrap: balance;
}
.cx-sec--choco h2 { color: var(--cream); }
.cx-lead { font-size: 14.5px; color: var(--ink-soft); margin: 0 0 30px; max-width: 56ch; }
.cx-sec--choco .cx-lead { color: rgba(255, 241, 230, 0.78); }
.cx-note { margin: 20px 0 0; font-size: 12px; color: var(--ink-mute); max-width: 66ch; }
.cx-sec--choco .cx-note { color: rgba(255, 241, 230, 0.6); }

/* ---------- tooltip de cursor ---------- */
.cx-tip {
  position: fixed; z-index: 40; pointer-events: none; opacity: 0;
  transition: opacity 0.12s ease;
  background: var(--choco-deep); color: var(--cream);
  font-size: 12px; font-weight: 600; padding: 7px 11px;
  border-radius: 8px; box-shadow: var(--shadow-md); max-width: 240px;
}
.cx-tip.is-on { opacity: 1; }

/* ---------- S1: split assimétrico de stats ---------- */
.cx-statsplit { display: grid; grid-template-columns: 1.1fr 1fr; gap: clamp(28px, 5vw, 64px); align-items: end; }
.cx-statsplit-num {
  font-family: var(--font-display); font-weight: 900;
  font-variant-numeric: tabular-nums; letter-spacing: -0.03em;
  font-size: clamp(120px, 22vw, 220px); line-height: 0.85; color: var(--yellow-deep);
}
.cx-statsplit-cap { font-size: 16px; font-weight: 700; color: var(--ink); margin-top: 10px; display: block; }
.cx-statsplit-sub { font-size: 13px; color: var(--ink-soft); margin-top: 2px; display: block; }
.cx-statlist { list-style: none; margin: 0; padding: 0; }
.cx-statlist li { display: flex; align-items: baseline; gap: 14px; padding: 16px 0; }
.cx-statlist li + li { border-top: 1px solid var(--paper-line); }
.cx-statlist-n {
  font-family: var(--font-display); font-weight: 900; line-height: 1;
  font-size: clamp(30px, 4vw, 44px); color: var(--ink);
  font-variant-numeric: tabular-nums; min-width: 2.2ch;
}
.cx-statlist-t { font-size: 14px; color: var(--ink-soft); }
@media (max-width: 720px) { .cx-statsplit { grid-template-columns: 1fr; align-items: start; } }

/* ---------- S2: marcos ---------- */
.cx-msline { position: relative; }
.cx-msline-track { position: absolute; left: 0; right: 0; top: 7px; height: 2px; background: var(--paper-line); border-radius: 99px; }
.cx-msline-fill {
  height: 100%; width: 100%; border-radius: 99px; background: var(--coral-deep);
  transform: scaleX(0); transform-origin: left;
  transition: transform 1.6s cubic-bezier(0.22, 0.61, 0.36, 1);
}
[data-in='true'] .cx-msline-fill { transform: scaleX(1); }
.cx-msline-items { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: clamp(14px, 2vw, 24px); }
.cx-ms-item { display: flex; flex-direction: column; gap: 6px; position: relative; }
.cx-ms-dot { width: 16px; height: 16px; border-radius: 50%; flex: 0 0 auto; border: 3px solid var(--cream-deep); box-shadow: 0 0 0 1px var(--paper-line); }
.cx-ms-year { font-family: var(--font-display); font-weight: 900; font-size: clamp(19px, 2.2vw, 26px); color: var(--ink); font-variant-numeric: tabular-nums; margin-top: 6px; }
.cx-ms-title { font-size: 13.5px; font-weight: 800; color: var(--ink); line-height: 1.25; }
.cx-ms-txt { font-size: 12.5px; color: var(--ink-soft); line-height: 1.45; }
@media (max-width: 860px) {
  .cx-msline-track { display: none; }
  .cx-msline-items { grid-template-columns: 1fr; gap: 18px; }
  .cx-ms-item { display: grid; grid-template-columns: 16px 1fr; gap: 4px 12px; }
  .cx-ms-dot { grid-row: 1 / 4; margin-top: 4px; }
  .cx-ms-year { margin-top: 0; }
}

/* ---------- chips de marca ---------- */
.cx-chip {
  width: 32px; height: 32px; border-radius: 50%; flex: 0 0 auto;
  background: var(--cream-card); border: 1px solid var(--paper-line);
  display: grid; place-items: center; overflow: hidden;
}
.cx-chip img { width: 100%; height: 100%; object-fit: contain; padding: 3px; }
.cx-chip-fb { font-family: var(--font-display); font-weight: 800; font-size: 11px; color: var(--ink); }

/* ---------- S3: homenagens (bloco chocolate) ---------- */
.cx-waffle { display: flex; flex-direction: column; gap: 16px; }
.cx-waffle-row { display: grid; grid-template-columns: 190px 1fr 34px; gap: 14px; align-items: center; }
.cx-waffle-label { display: flex; align-items: center; gap: 9px; font-size: 13.5px; font-weight: 700; color: var(--cream); }
.cx-waffle-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
.cx-waffle-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.cx-waffle-n { font-family: var(--font-display); font-weight: 800; font-size: 19px; color: var(--cream); text-align: right; font-variant-numeric: tabular-nums; }
.cx-sec--choco .cx-chip { border-color: rgba(255, 241, 230, 0.25); }
.cx-unit { opacity: 0; transform: scale(0.5); transition: transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.45s ease; cursor: pointer; }
[data-in='true'] .cx-unit { opacity: 1; transform: scale(1); }
@media (max-width: 560px) {
  .cx-waffle-row { grid-template-columns: 1fr; gap: 8px; }
  .cx-waffle-n { display: none; }
}

.cx-strip { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-top: 26px; }
@media (max-width: 860px) { .cx-strip { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 520px) { .cx-strip { grid-template-columns: repeat(2, 1fr); } }
.cx-stripcard { margin: 0; display: flex; flex-direction: column; gap: 6px; }
.cx-photo { aspect-ratio: 4 / 5; border-radius: 12px; overflow: hidden; background: rgba(255, 241, 230, 0.06); border: 1px solid rgba(255, 241, 230, 0.14); }
.cx-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cx-photo--pending { display: grid; place-items: center; text-align: center; padding: 12px; }
.cx-photo--pending span { font-size: 11px; font-weight: 700; color: rgba(255, 241, 230, 0.45); max-width: 16ch; line-height: 1.4; }
.cx-stripcard figcaption { font-size: 11px; font-weight: 700; color: rgba(255, 241, 230, 0.75); line-height: 1.3; }
.cx-fade { opacity: 0; transform: translateY(14px); transition: transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.6s ease; }
[data-in='true'] .cx-fade { opacity: 1; transform: translateY(0); }

/* ---------- S4: hall (barras) ---------- */
.cx-barchart { display: flex; flex-direction: column; gap: 14px; }
.cx-bar-row { display: grid; grid-template-columns: 34px 150px 1fr 40px; align-items: center; gap: 12px; }
.cx-bar-name { font-size: 14px; font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cx-bar-track { background: var(--cream-deep); border-radius: 99px; height: 14px; overflow: hidden; }
.cx-bar-fill { height: 100%; width: 100%; border-radius: 99px; transform: scaleX(0); transform-origin: left; transition: transform 1.1s cubic-bezier(0.22, 0.61, 0.36, 1); }
[data-in='true'] .cx-bar-fill { transform: scaleX(var(--pct, 1)); }
.cx-bar-val { font-family: var(--font-display); font-weight: 800; font-size: 16px; text-align: right; font-variant-numeric: tabular-nums; color: var(--ink); }
@media (max-width: 560px) {
  .cx-bar-row { grid-template-columns: 34px 1fr 40px; }
  .cx-bar-name { grid-column: 2 / 4; }
  .cx-bar-track { grid-column: 2 / 3; grid-row: 2; }
  .cx-bar-val { grid-row: 2; }
}

/* ---------- S5: melhor combo (grid hierárquico) ---------- */
.cx-combos { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: clamp(16px, 2.5vw, 26px); align-items: stretch; }
@media (max-width: 860px) { .cx-combos { grid-template-columns: 1fr; } }
.cx-combocard { display: flex; flex-direction: column; gap: 10px; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: 14px; padding: 18px; }
.cx-combocard--lead { background: var(--cream-deep); }
.cx-combocard .cx-photo { aspect-ratio: 16 / 10; border-radius: 10px; border-color: var(--paper-line); background: var(--cream); }
.cx-combocard .cx-photo--pending span { color: var(--ink-mute); max-width: 22ch; }
.cx-combocard-head { display: flex; align-items: center; gap: 12px; }
.cx-combocard-name { font-size: 15px; font-weight: 800; color: var(--ink); flex: 1; }
.cx-combocard-n { font-family: var(--font-display); font-weight: 900; font-size: 26px; color: var(--yellow-deep); font-variant-numeric: tabular-nums; }
.cx-stamps { display: flex; gap: 8px; flex-wrap: wrap; }
.cx-stamps .cx-chip { width: 26px; height: 26px; }
.cx-stamps .cx-chip-fb { font-size: 9.5px; }
.cx-combocard-caption { font-size: 10.5px; color: var(--ink-mute); margin: 0; }

/* ---------- reduced motion: estado final imediato ---------- */
@media (prefers-reduced-motion: reduce) {
  .cx-msline-fill, .cx-unit, .cx-fade, .cx-bar-fill { transition: none; }
  .cx-msline-fill { transform: scaleX(1); }
  .cx-unit { opacity: 1; transform: scale(1); }
  .cx-fade { opacity: 1; transform: none; }
  .cx-bar-fill { transform: scaleX(var(--pct, 1)); }
}
```

- [ ] **Step 3: Reescrever `src/pages/institutional/Curiosidades.jsx`**

Manter o `<PageHero ...>` e o bloco de CTA capturados no Step 1 exatamente como estavam (mesmos imports). Todo o resto vira:

```jsx
/*
 * PÁGINA INSTITUCIONAL — Curiosidades ("dados que se movem", Direção E).
 * Dados animados 100% derivados da base (sweetHistoryStats.js): stats do festival,
 * marcos/primeiras vezes (datas derivadas, nunca hardcoded), homenagens da Lovers
 * (21 chips com logo real), hall dos premiados (barras) e Melhor Combo (cards
 * hierárquicos com foto real + fallback editorial). Tema creme; S3 é o único
 * bloco chocolate. Sem eyebrows. Edições nunca comparadas entre si (CLAUDE.md §11).
 */
import React from 'react'
import { PageShell, PageHero } from '../../components/layout' // + CTA usado pela página antiga
import {
  getAwardWins,
  getParticipantAsset,
  getHomageGroups,
  getRepeatCategoryWinners,
  getMilestoneFacts,
} from '../../data/sweetHistoryStats'
import { PARTICIPANTS } from '../../data/participants'
import '../../styles/curiosidades.css'

// ---- dados calculados (puros, no load do módulo) ----
const HOMAGE = getHomageGroups()
const MILE = getMilestoneFacts()
const COMBO_REPEATS = getRepeatCategoryWinners('Melhor Combo')

// Hall: top 7 preservando empates na última posição.
const ALL_WINS = getAwardWins()
const CUT = Math.min(7, ALL_WINS.length)
let winsEnd = CUT
while (winsEnd < ALL_WINS.length && ALL_WINS[winsEnd].total === ALL_WINS[CUT - 1].total) winsEnd++
const WINS = ALL_WINS.slice(0, winsEnd)
const MAX_WINS = WINS.length ? WINS[0].total : 1

// Marcos (datas derivadas da base; textos editoriais).
const MENCAO = MILE.uniqueCategories.find((c) => /menc/i.test(c.category)) || null
const MARCOS = [
  MILE.firstEdition && { code: MILE.firstEdition.code, hl: 'var(--coral-deep)', title: 'A estreia', text: 'Nasce o Sweet & Coffee Week em Natal.' },
  MILE.firstAwards && { code: MILE.firstAwards.code, hl: 'var(--yellow-deep)', title: 'Nasce o Sweet Awards', text: `A edição ${MILE.firstAwards.theme} cria a premiação. Antes, o festival não tinha troféu.` },
  MILE.firstTracks && { code: MILE.firstTracks.code, hl: 'var(--coral-deep)', title: 'Duas trilhas de júri', text: 'Júri Técnico e voto popular Sweet Lovers, formato que vale até hoje.' },
  MENCAO && { code: MENCAO.code, hl: 'var(--pink-deep)', title: 'A única Menção Honrosa', text: 'Categoria que apareceu uma vez e nunca mais voltou.' },
  MILE.lastEdition && { code: MILE.lastEdition.code, hl: 'var(--cyan-deep)', title: 'Lovers: a década revivida', text: `Edição comemorativa: ${PARTICIPANTS.length} marcas recriam os temas que marcaram o festival.` },
].filter(Boolean)

// Cores categóricas das 4 primeiras linhas do waffle (fundo chocolate → tons claros).
const WAFFLE_DOTS = ['var(--yellow)', 'var(--coral)', 'var(--pink)', 'var(--cyan)']
const NEUTRAL_DOT = 'rgba(255,241,230,.35)'

// ---- primitivas ----

// Revela uma vez quando a seção entra na tela (reduced-motion: revela já).
function useInViewOnce(threshold = 0.25) {
  const ref = React.useRef(null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setInView(true); return undefined }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect() }
    }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, inView]
}

function CountUp({ to, suffix = '', run }) {
  const [val, setVal] = React.useState(0)
  React.useEffect(() => {
    if (!run) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVal(to); return undefined }
    let raf = 0
    let start = null
    const step = (ts) => {
      if (start === null) start = ts
      const p = Math.min((ts - start) / 1200, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [run, to])
  return <>{val}{suffix}</>
}

// Tooltip global de cursor: segue [data-tip] sem re-render de React por frame.
function CursorTip() {
  const ref = React.useRef(null)
  React.useEffect(() => {
    const tip = ref.current
    if (!tip) return undefined
    const onMove = (e) => {
      const t = e.target.closest && e.target.closest('[data-tip]')
      if (!t) { tip.classList.remove('is-on'); return }
      tip.textContent = t.getAttribute('data-tip')
      tip.classList.add('is-on')
      const w = tip.offsetWidth
      const h = tip.offsetHeight
      const left = Math.min(Math.max(8, e.clientX + 14), window.innerWidth - w - 8)
      let top = e.clientY - h - 12
      if (top < 8) top = e.clientY + 18
      tip.style.left = `${left}px`
      tip.style.top = `${top}px`
    }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [])
  return <div ref={ref} className="cx-tip" aria-hidden="true" />
}

// Logo real com fallback de iniciais (nunca inventa imagem).
function BrandChip({ name, className = '', tip }) {
  const a = getParticipantAsset(name)
  const [broken, setBroken] = React.useState(false)
  const show = a.logo && !broken
  return (
    <span className={`cx-chip ${className}`} data-tip={tip || undefined} role="img" aria-label={tip || name}>
      {show
        ? <img src={a.logo} alt="" loading="lazy" onError={() => setBroken(true)} />
        : <span className="cx-chip-fb">{a.fallback}</span>}
    </span>
  )
}

// Foto de combo com fallback editorial (pastas ausentes: Olí Gastrô, Casa de Taipa).
function ComboPhoto({ slug, alt, pendingText = 'Foto do combo pendente' }) {
  const [broken, setBroken] = React.useState(false)
  if (!slug || broken) {
    return <div className="cx-photo cx-photo--pending"><span>{pendingText}</span></div>
  }
  return (
    <div className="cx-photo">
      <img src={`/images/combos/${slug}/main.jpg`} alt={alt} loading="lazy" onError={() => setBroken(true)} />
    </div>
  )
}

// ---- seções ----

function SecStats() {
  const [ref, inView] = useInViewOnce()
  return (
    <section className="cx-sec" ref={ref} data-in={inView}>
      <div className="wrap">
        <div className="cx-statsplit">
          <div>
            <span className="cx-statsplit-num"><CountUp to={MILE.festivalYears ?? 0} run={inView} /></span>
            <span className="cx-statsplit-cap">anos de festival</span>
            <span className="cx-statsplit-sub">
              De {MILE.firstEdition ? MILE.firstEdition.code : ''} à edição comemorativa Lovers.
            </span>
          </div>
          <ul className="cx-statlist">
            <li><span className="cx-statlist-n"><CountUp to={MILE.editionsCount} run={inView} /></span><span className="cx-statlist-t">edições realizadas</span></li>
            <li><span className="cx-statlist-n"><CountUp to={PARTICIPANTS.length} run={inView} /></span><span className="cx-statlist-t">marcas na edição Lovers</span></li>
            <li><span className="cx-statlist-n"><CountUp to={HOMAGE[0] ? HOMAGE[0].count : 0} suffix="×" run={inView} /></span><span className="cx-statlist-t">marcas escolheram reviver a mesma edição</span></li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function SecMarcos() {
  const [ref, inView] = useInViewOnce()
  return (
    <section className="cx-sec cx-sec--tint" ref={ref} data-in={inView}>
      <div className="wrap">
        <h2>Os marcos que mudaram o festival</h2>
        <p className="cx-lead">Cinco primeiras vezes que definiram a década.</p>
        <div className="cx-msline">
          <div className="cx-msline-track"><div className="cx-msline-fill" /></div>
          <ol className="cx-msline-items">
            {MARCOS.map((m, i) => (
              <li className="cx-ms-item cx-fade" key={m.code} style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="cx-ms-dot" style={{ background: m.hl }} />
                <span className="cx-ms-year">{m.code}</span>
                <span className="cx-ms-title">{m.title}</span>
                <span className="cx-ms-txt">{m.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function SecHomenagens() {
  const [ref, inView] = useInViewOnce()
  const top = HOMAGE[0]
  return (
    <section className="cx-sec cx-sec--choco" ref={ref} data-in={inView}>
      <div className="wrap">
        <h2>A edição que a Lovers mais quis reviver</h2>
        <p className="cx-lead">Cada marca da Lovers recriou o tema de uma edição passada. Cada bolinha é uma marca real. Passe o mouse pra ver quem é.</p>
        <div className="cx-waffle">
          {HOMAGE.map((g, gi) => (
            <div className="cx-waffle-row" key={g.key}>
              <span className="cx-waffle-label">
                <span className="cx-waffle-dot" style={{ background: gi < 4 && g.count > 1 ? WAFFLE_DOTS[gi] : NEUTRAL_DOT }} />
                {g.label}
              </span>
              <span className="cx-waffle-chips">
                {g.brands.map((b, bi) => (
                  <BrandChip
                    key={b.slug}
                    name={b.name}
                    className="cx-unit"
                    tip={`${b.name} · ${b.theme}`}
                    // stagger por chip dentro da seção
                  />
                ))}
              </span>
              <span className="cx-waffle-n">{g.count}</span>
            </div>
          ))}
        </div>
        {top && (
          <div className="cx-strip">
            {top.brands.map((b, i) => (
              <figure className="cx-stripcard cx-fade" key={b.slug} style={{ transitionDelay: `${i * 90}ms` }}>
                <ComboPhoto slug={b.slug} alt={`Combo de ${b.name} na Lovers, homenagem à ${top.label} com tema ${b.theme}`} />
                <figcaption>{b.name}, {b.theme}</figcaption>
              </figure>
            ))}
          </div>
        )}
        <p className="cx-note">
          Acima, os combos reais que reviveram a {top ? top.label : ''} na Lovers.
          {' '}Das {MILE.editionsCount - 1} edições anteriores, {MILE.editionsCount - 1 - HOMAGE.length >= 0 ? MILE.editionsCount - 1 - HOMAGE.length : 0} não foram escolhidas por nenhuma marca,
          incluindo a {MILE.firstAwards ? MILE.firstAwards.theme : ''} ({MILE.firstAwards ? MILE.firstAwards.code : ''}), que criou o Sweet Awards.
        </p>
      </div>
    </section>
  )
}

function SecHall() {
  const [ref, inView] = useInViewOnce()
  return (
    <section className="cx-sec" ref={ref} data-in={inView}>
      <div className="wrap">
        <h2>Quem mais venceu em {MILE.festivalYears ?? 10} anos de Sweet Awards</h2>
        <p className="cx-lead">Vitórias de 1º lugar somando Júri Técnico e Sweet Lovers. Empates preservados.</p>
        <div className="cx-barchart">
          {WINS.map((w, i) => {
            // posição com empate compartilhado (1º, 2º, 2º, 4º...)
            const pos = WINS.findIndex((x) => x.total === w.total) + 1
            return (
              <div className="cx-bar-row" key={w.key} data-tip={`${w.name} · ${w.total} vitória${w.total > 1 ? 's' : ''} de 1º lugar`}>
                <BrandChip name={w.name} />
                <span className="cx-bar-name">{pos}º {w.name}</span>
                <div className="cx-bar-track">
                  <div
                    className="cx-bar-fill"
                    style={{
                      '--pct': w.total / MAX_WINS,
                      background: i === 0 ? 'var(--yellow-deep)' : 'var(--coral-deep)',
                      opacity: i === 0 ? 1 : Math.max(0.5, 1 - i * 0.08),
                      transitionDelay: `${i * 70}ms`,
                    }}
                  />
                </div>
                <span className="cx-bar-val"><CountUp to={w.total} run={inView} /></span>
              </div>
            )
          })}
        </div>
        <p className="cx-note">Logo real de quem está na Lovers 2026.1; iniciais pra marcas históricas fora da edição atual. Contagens calculadas direto da base histórica (sweetHistoryStats.js).</p>
      </div>
    </section>
  )
}

function SecCombos() {
  const [ref, inView] = useInViewOnce()
  if (!COMBO_REPEATS.length) return null
  const [lead, ...rest] = COMBO_REPEATS
  const card = (w, isLead) => {
    const asset = getParticipantAsset(w.name)
    return (
      <div className={`cx-combocard${isLead ? ' cx-combocard--lead' : ''}`} key={w.key}>
        <div className="cx-fade">
          <ComboPhoto
            slug={asset.slug}
            alt={`Combo atual de ${w.name} na Lovers 2026.1`}
            pendingText="Marca histórica, sem registro de combo no acervo digital"
          />
        </div>
        <div className="cx-combocard-head">
          <BrandChip name={w.name} />
          <span className="cx-combocard-name">{w.name}</span>
          <span className="cx-combocard-n"><CountUp to={w.wins.length} run={inView} /></span>
        </div>
        <div className="cx-stamps">
          {w.wins.map((v, i) => (
            <BrandChip
              key={`${v.code}-${v.track || 'unica'}-${i}`}
              name={w.name}
              className="cx-unit"
              tip={v.track ? `${v.code} · ${v.track}` : v.code}
            />
          ))}
        </div>
        <p className="cx-combocard-caption">
          {asset.slug ? 'Foto: combo atual na Lovers 2026.1.' : `${w.wins.length} vitórias, mais que qualquer outra marca.`}
        </p>
      </div>
    )
  }
  return (
    <section className="cx-sec cx-sec--tint" ref={ref} data-in={inView}>
      <div className="wrap">
        <h2>Melhor Combo: vitórias repetidas</h2>
        <p className="cx-lead">O prêmio mais antigo do Sweet Awards. Só {COMBO_REPEATS.length} marcas venceram mais de uma vez.</p>
        <div className="cx-combos">
          {card(lead, true)}
          {rest.map((w) => card(w, false))}
        </div>
      </div>
    </section>
  )
}

export default function Curiosidades() {
  return (
    <PageShell> {/* usar exatamente o wrapper que a página antiga usava */}
      <CursorTip />
      {/* <PageHero ...> — BLOCO PRESERVADO da página antiga, sem mudanças */}
      <SecStats />
      <SecMarcos />
      <SecHomenagens />
      <SecHall />
      <SecCombos />
      {/* CTA final — BLOCO PRESERVADO da página antiga, sem mudanças */}
    </PageShell>
  )
}
```

Notas obrigatórias pro implementador:
- O stagger dos `.cx-unit` do waffle usa `transitionDelay` inline: adicionar `style={{ transitionDelay: \`${(gi * 6 + bi) * 45}ms\` }}` no `BrandChip` do waffle (o componente precisa aceitar e repassar `style`). Assinatura final do BrandChip: `{ name, className = '', tip, style }`.
- Se o export default da página antiga tiver outro nome/assinatura (ex.: recebe props de rota), preservar exatamente.
- Se `PageShell`/`PageHero`/CTA tiverem nomes diferentes no projeto, usar os reais (Step 1).
- Textos com `·` no `data-tip` são conteúdo de tooltip, não eyebrow; permitido.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: sucesso.

- [ ] **Step 5: Conferência visual rápida em dev**

Run: `npm run dev` e abrir `http://localhost:5173/#/curiosidades` (ou usar preview tools).
Checar: hero intacto; 5 seções novas renderizam; logos aparecem; fotos do filmstrip carregam (Olí Gastrô cai no fallback); animações disparam ao rolar.

- [ ] **Step 6: Commit**

```bash
git add src/pages/institutional/Curiosidades.jsx src/styles/curiosidades.css
git commit -m "feat(curiosidades): reconstrói a página como dados animados (Direção E)"
```

---

### Task 4: Verificação completa e fechamento

**Files:**
- Modify: nenhum previsto (só correções que o E2E apontar)

**Interfaces:**
- Consumes: `npm run test:curiosidades` (Task 2), `npm run test:responsive` (existente).

- [ ] **Step 1: E2E verde**

Run: `npm run build && npm run test:curiosidades`
Expected: PASS ("Tudo verde."). Se falhar, corrigir a página (não o teste, a menos que o teste contradiga a spec) e repetir.

- [ ] **Step 2: Conferir os marcos contra o ACERVO**

O teste imprime "anos dos marcos". Abrir `ACERVO.md` (raiz) e conferir: 1º ano = primeira edição; 2º = edição que criou o Sweet Awards (spec esperava 2019.1); 3º = primeira edição com trilhas de júri (spec esperava 2020.2 — se a base disser outra coisa, A BASE VENCE, e atualizar a spec com uma linha); 4º = edição da Menção Honrosa (spec esperava 2021.1); 5º = Lovers 2026.1. Registrar divergências no commit.

- [ ] **Step 3: Responsivo global**

Run: `npm run test:responsive`
Expected: PASS (a página nova não pode quebrar as checagens globais).

- [ ] **Step 4: Checklist CLAUDE.md §18**

Conferir e anotar no resumo final: Home intocada; `AWARDS_ONLY_PUBLICATION` intocado; nenhuma cor nova; nenhum sticker; margens da Home (`.wrap`); nenhum elemento solto; placeholders elegantes; desktop e mobile OK; build verde. Extra da spec: zero eyebrow, zero em-dash visível (`grep -n "—" src/pages/institutional/Curiosidades.jsx` deve retornar só comentários, idealmente nada), nenhuma comparação edição×edição.

- [ ] **Step 5: Commit final (se houve correções) e push**

```bash
git add -A -- src/ tests/ docs/
git commit -m "fix(curiosidades): ajustes da verificação E2E"   # só se houve correção
git push -u origin worktree-curiosidades
```

⚠️ NÃO fazer merge em `dev/site-completo` sem o Wilke aprovar o preview.

---

## Self-Review (feita na escrita do plano)

- **Cobertura da spec:** S1→Task 3 SecStats; S2→SecMarcos + getMilestoneFacts; S3→SecHomenagens + getHomageGroups + ComboPhoto; S4→SecHall + getAwardWins com empates; S5→SecCombos + getRepeatCategoryWinners; S6→CTA preservado; regras transversais→Global Constraints + CSS reduced-motion; critérios de aceite→Task 4.
- **Placeholders:** os blocos "PRESERVADO da página antiga" não são placeholder de conteúdo novo — são instrução explícita de reuso com captura no Task 3 Step 1.
- **Consistência de tipos:** `getHomageGroups` → `{key,label,count,brands[{name,slug,theme}]}` consumido em SecHomenagens; `getRepeatCategoryWinners` → `{name,wins[{code,track}]}` consumido em SecCombos; `getMilestoneFacts` campos usados: firstEdition/lastEdition/editionsCount/festivalYears/firstAwards/firstTracks/uniqueCategories — todos definidos na Task 1.
