# Sweet na Mídia — Flipbook editorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o grid de 6 cards + lista escondida "ver mais" da seção
`#sweet-na-midia` (Home) por uma composição editorial "capa de jornal": masthead,
selos como dateline, spread principal que vira de página (flip 3D) e caixa lateral
fixa com as frases de reforço.

**Architecture:** Um componente novo e isolado (`PressFlipbook.jsx`, padrão de
`PhotoRotator.jsx`) encapsula a virada de página; masthead/dateline/sidebar continuam
inline no `Home.jsx` por serem estáticos. Uma função pura (`buildMediaPages`) reagrupa
os dados existentes (`mediaFeatured`/`mediaExtra`) em páginas — nenhum dado é criado,
apagado ou reordenado.

**Tech Stack:** React (JSX, sem TypeScript), CSS puro (custom properties do projeto,
sem framework), Vite. Sem framework de teste unitário no projeto (confirmado:
`package.json` só tem `dev`/`build`/`preview`/`test:responsive`(Playwright)/`test:mobile`/
`qr:lovers` — nenhum `test`/`jest`/`vitest`). Verificação = `npm run build` (sintaxe) +
checagem manual no navegador via as ferramentas de preview + `npm run test:responsive`
(Playwright, overflow/menu) — é assim que o projeto testa UI hoje. Para a única lógica
pura (`buildMediaPages`), a verificação usa `node -e` inline antes de colar o código no
componente (não criamos framework de teste novo pra uma função).

## Global Constraints

- Home é a página-mãe (§9 CLAUDE.md) — só mexer nesta seção (`#sweet-na-midia`); nenhuma
  outra seção da Home muda.
- Paleta oficial só (§3 CLAUDE.md): creme, marrom espresso, coral, amarelo — sem cinza
  de jornal de verdade, sem cor nova.
- Reusar os design tokens reais do projeto (não os hex do mockup do brainstorm):
  `--cream`, `--cream-card`, `--paper-line`, `--ink` (`--choco-deep` `#2B1810`), `--ink-soft`,
  `--coral` (`#E8553A`), `--coral-deep`, `--yellow`, `--font-heading` (`'Nexa Slab'`),
  `--font-sans` (`--font-body`), `--r-lg`, `--shadow-md`, `--sp-3`..`--sp-8`,
  `--ease-out-soft`, `--motion-fast` — todos já definidos em
  `src/styles/swc-redesign.css` e `src/styles/layout-tokens.css`.
- Nenhum dado de `mediaCards`/`mediaFeatured`/`mediaExtra`/`mediaSeals`/`mediaReinforce`
  muda de conteúdo — só de agrupamento/apresentação (§16 CLAUDE.md, não inventar dado).
- Contagem real: 6 `mediaFeatured` + 8 `mediaExtra` = 14 matérias (não 13 — corrigido no
  spec). Todas as 14 devem continuar alcançáveis (sem "ver mais" escondendo nada).
- Acessibilidade: teclado (← →), `aria-live`, `prefers-reduced-motion` com fallback sem
  rotação 3D — mesmo padrão já usado em `CountUp` (`Home.jsx:113`) e `PhotoRotator.jsx`.
- Breakpoint de reflow 2 colunas → 1: **960px** (padrão do projeto, §17 CLAUDE.md).
- `AWARDS_ONLY_PUBLICATION` e qualquer outra seção da Home: não tocar.
- Build local (`npm run build`) tem que passar antes de cada commit.

---

### Task 1: Agrupamento de dados — `buildMediaPages`

**Files:**
- Modify: `src/pages/institutional/Home.jsx:74-75`

**Interfaces:**
- Consumes: `mediaFeatured` (array de `{outlet,date,title,description,href,cta,category,featured:true}`),
  `mediaExtra` (array de `{outlet,date,title,href,cta,category,featured:false}`) — já
  existem no arquivo, sem mudança.
- Produces: `mediaPages` — `Array<{ lead: <item de mediaFeatured>, briefs: Array<item de mediaExtra> }>`,
  1 item por `mediaFeatured` na mesma ordem, consumido pelo `PressFlipbook` na Task 3.

- [ ] **Step 1: Verificar o algoritmo de agrupamento isoladamente (sem framework de teste — projeto não tem um; ver Tech Stack)**

Rodar no terminal (não entra no repo, é só verificação):

```bash
node -e "
function buildMediaPages(leads, briefs) {
  if (!leads.length) return []
  const per = Math.floor(briefs.length / leads.length)
  const remainder = briefs.length % leads.length
  let cursor = 0
  return leads.map((lead, i) => {
    const count = per + (i < remainder ? 1 : 0)
    const pageBriefs = briefs.slice(cursor, cursor + count)
    cursor += count
    return { lead, briefs: pageBriefs }
  })
}
const leads = Array.from({length:6}, (_,i) => ({title:'lead'+i}))
const briefs = Array.from({length:8}, (_,i) => ({title:'brief'+i}))
const pages = buildMediaPages(leads, briefs)
console.log('briefs por pagina:', pages.map((p) => p.briefs.length))
console.log('total de briefs usados:', pages.reduce((n, p) => n + p.briefs.length, 0))
console.log('total de paginas:', pages.length)
"
```

Expected: `briefs por pagina: [ 2, 2, 1, 1, 1, 1 ]`, `total de briefs usados: 8`, `total de
paginas: 6`. Se bater, o algoritmo está correto — cola no arquivo no próximo passo.

- [ ] **Step 2: Colar a função no `Home.jsx`, logo depois de `mediaFeatured`/`mediaExtra`**

Ler `src/pages/institutional/Home.jsx` linhas 73-76 — hoje é:

```js
const mediaFeatured = mediaCards.filter((c) => c.featured)
const mediaExtra = mediaCards.filter((c) => !c.featured)
```

Substituir por (adiciona logo depois, não remove nada):

```js
const mediaFeatured = mediaCards.filter((c) => c.featured)
const mediaExtra = mediaCards.filter((c) => !c.featured)

// Agrupa em páginas do PressFlipbook: 1 manchete (lead) por página + notas
// (briefs) distribuídas o mais igual possível — sem hardcode de índice, pra não
// precisar remapear se mediaCards crescer.
function buildMediaPages(leads, briefs) {
  if (!leads.length) return []
  const per = Math.floor(briefs.length / leads.length)
  const remainder = briefs.length % leads.length
  let cursor = 0
  return leads.map((lead, i) => {
    const count = per + (i < remainder ? 1 : 0)
    const pageBriefs = briefs.slice(cursor, cursor + count)
    cursor += count
    return { lead, briefs: pageBriefs }
  })
}
const mediaPages = buildMediaPages(mediaFeatured, mediaExtra)
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built in ...` sem erro (`mediaPages` fica sem uso nenhum ainda — isso não
quebra o build, é só uma const nova).

- [ ] **Step 4: Commit**

```bash
git add src/pages/institutional/Home.jsx
git commit -m "feat(home): agrupa matérias de imprensa em páginas (buildMediaPages)"
```

---

### Task 2: Componente `PressFlipbook`

**Files:**
- Create: `src/components/PressFlipbook.jsx`
- Modify: `src/styles/motion-system.css` (adiciona no fim do arquivo)

**Interfaces:**
- Consumes: nada do resto do projeto além de `I` (`src/components/icons.jsx`, export
  `I.arrow`, já usado em `Home.jsx`).
- Produces: `export function PressFlipbook({ pages, interval = 7500, autoPlay = true })`
  — `pages` no formato produzido pela Task 1 (`{ lead, briefs }[]`). Consumido pela
  Task 3 via `<PressFlipbook pages={mediaPages} interval={7500} autoPlay />`.

- [ ] **Step 1: Criar `src/components/PressFlipbook.jsx`**

```jsx
import React from 'react'
import { I } from './icons'

/*
 * PressFlipbook — spread editorial "capa de jornal" com virada de página 3D.
 *
 * - Cada página = 1 manchete (lead) + 0-2 notas (briefs). Navegação por
 *   seta/ponto/teclado (← →). Autoplay opcional, mas para de vez no primeiro
 *   clique manual (usuário assume o controle) — não retoma sozinho.
 * - Virada real em 3D (rotateY): a página-alvo já fica parada por baixo
 *   (camada "base", sem animação); a página anterior sobe por cima (camada
 *   "over") e gira/some, revelando a base. Evita ter que 3D-posicionar as 6
 *   páginas ao mesmo tempo.
 * - prefers-reduced-motion: sem rotação — crossfade simples e mais rápido.
 * - Pausa quando a aba está oculta (document.hidden), como o PhotoRotator.
 *
 * Doc: src/design/SITE_DIRECTION.md (§ Sweet na Mídia).
 */
const AUTOPLAY_MIN = 4000
const FLIP_MS = 600
const FLIP_MS_REDUCED = 220

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function PressFlipbook({ pages, interval = 7500, autoPlay = true }) {
  const list = Array.isArray(pages) ? pages.filter((p) => p && p.lead) : []
  const count = list.length

  const [page, setPage] = React.useState(0)
  const [outgoing, setOutgoing] = React.useState(null) // { index, dir, turning }
  const [paused, setPaused] = React.useState(!autoPlay)
  const liveRef = React.useRef(null)
  const timeoutRef = React.useRef(null)
  const rafRef = React.useRef(null)

  const clearTimers = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  const goTo = React.useCallback((rawNext, dir) => {
    if (count <= 1) return
    const nextIndex = ((rawNext % count) + count) % count
    if (nextIndex === page) return
    clearTimers()
    const reduced = prefersReducedMotion()
    setOutgoing({ index: page, dir, turning: false })
    rafRef.current = requestAnimationFrame(() => {
      setOutgoing((o) => (o ? { ...o, turning: true } : o))
    })
    timeoutRef.current = setTimeout(() => setOutgoing(null), reduced ? FLIP_MS_REDUCED : FLIP_MS)
    setPage(nextIndex)
  }, [count, page, clearTimers])

  const next = React.useCallback(() => goTo(page + 1, 'next'), [goTo, page])
  const prev = React.useCallback(() => goTo(page - 1, 'prev'), [goTo, page])
  const stop = () => setPaused(true)

  React.useEffect(() => () => clearTimers(), [clearTimers])

  React.useEffect(() => {
    if (paused || count <= 1 || prefersReducedMotion()) return
    const delay = Math.max(AUTOPLAY_MIN, interval)
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      goTo(page + 1, 'next')
    }, delay)
    return () => clearInterval(id)
  }, [paused, count, interval, page, goTo])

  React.useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = `Página ${page + 1} de ${count}`
  }, [page, count])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { stop(); next() }
    else if (e.key === 'ArrowLeft') { stop(); prev() }
  }

  if (!count) return null

  const renderPage = (p) => (
    <>
      <span className="press-flipbook__kicker">
        {p.lead.outlet}{p.lead.date ? ` · ${p.lead.date}` : ''}
      </span>
      <h4 className="press-flipbook__headline">{p.lead.title}</h4>
      {p.lead.description && <p className="press-flipbook__body">{p.lead.description}</p>}
      <a
        className="press-flipbook__link"
        href={p.lead.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${p.lead.cta || 'Ler matéria'} na ${p.lead.outlet} sobre o Sweet & Coffee Week`}
      >
        {p.lead.cta || 'Ler matéria'} <I.arrow />
      </a>
      {p.briefs && p.briefs.length > 0 && (
        <div className="press-flipbook__briefs">
          {p.briefs.map((b) => (
            <a
              key={b.href}
              className="press-flipbook__brief"
              href={b.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${b.cta || 'Ler matéria'} na ${b.outlet} sobre o Sweet & Coffee Week`}
            >
              <span className="press-flipbook__brief-outlet">
                {b.outlet}{b.date ? ` · ${b.date}` : ''}
              </span>
              <span className="press-flipbook__brief-title">{b.title}</span>
            </a>
          ))}
        </div>
      )}
    </>
  )

  return (
    <div
      className="press-flipbook"
      role="group"
      aria-roledescription="carrossel"
      aria-label="Matérias sobre o Sweet & Coffee Week na imprensa"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="press-flipbook__stage">
        <article className="press-flipbook__page press-flipbook__page--base">
          {renderPage(list[page])}
        </article>
        {outgoing && (
          <article
            className={
              'press-flipbook__page press-flipbook__page--over ' +
              `press-flipbook__page--out-${outgoing.dir}` +
              (outgoing.turning ? ' is-turning' : '')
            }
          >
            {renderPage(list[outgoing.index])}
          </article>
        )}
      </div>

      <div className="press-flipbook__nav">
        <button type="button" className="press-flipbook__navbtn" onClick={() => { stop(); prev() }} aria-label="Página anterior">‹</button>
        <div className="press-flipbook__dots">
          {list.map((p, i) => (
            <button
              key={p.lead.href}
              type="button"
              className={'press-flipbook__dot' + (i === page ? ' is-active' : '')}
              aria-label={`Ir para página ${i + 1}`}
              aria-current={i === page ? 'true' : undefined}
              onClick={() => { stop(); goTo(i, i > page ? 'next' : 'prev') }}
            />
          ))}
        </div>
        <button type="button" className="press-flipbook__navbtn" onClick={() => { stop(); next() }} aria-label="Próxima página">›</button>
        <span className="press-flipbook__count" aria-hidden="true">Página {page + 1} de {count}</span>
      </div>
      <span className="press-flipbook__sr" role="status" aria-live="polite" ref={liveRef} />
    </div>
  )
}
```

- [ ] **Step 2: Adicionar o CSS no fim de `src/styles/motion-system.css`**

```css

/* ============================================================================
   PRESS FLIPBOOK — spread de imprensa com virada 3D (componente
   src/components/PressFlipbook.jsx). Camada "base" mostra a página alvo já
   parada; camada "over" é a página anterior girando por cima até sumir,
   revelando a base — evita 3D-posicionar as 6 páginas ao mesmo tempo.
   ============================================================================ */
.press-flipbook { outline: none; }
.press-flipbook:focus-visible .press-flipbook__stage { box-shadow: 0 0 0 3px var(--coral); border-radius: var(--r-lg); }

.press-flipbook__stage {
  position: relative; width: 100%; min-height: 360px;
  perspective: 1800px; -webkit-perspective: 1800px;
}

.press-flipbook__page {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  background: var(--cream-card); border: 1px solid var(--paper-line);
  border-radius: var(--r-lg); box-shadow: var(--shadow-md);
  padding: var(--sp-6); box-sizing: border-box;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
}
.press-flipbook__page--base { position: relative; z-index: 1; }
.press-flipbook__page--over {
  z-index: 2; transform: rotateY(0deg); opacity: 1;
  transition: transform var(--dur-flip, 600ms) var(--ease-out-soft),
              opacity var(--dur-flip, 600ms) var(--ease-out-soft);
}
.press-flipbook__page--out-next { transform-origin: left center; }
.press-flipbook__page--out-prev { transform-origin: right center; }
.press-flipbook__page--out-next.is-turning { transform: rotateY(-120deg); opacity: 0; }
.press-flipbook__page--out-prev.is-turning { transform: rotateY(120deg); opacity: 0; }
.press-flipbook__page::after {
  content: ''; position: absolute; right: 0; bottom: 0; width: 30px; height: 30px;
  background: linear-gradient(135deg, transparent 50%, var(--coral) 50%);
  border-radius: 0 0 var(--r-lg) 0; opacity: .9;
}

.press-flipbook__kicker {
  display: inline-block; align-self: flex-start; font-family: var(--font-sans);
  font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
  color: #fff; background: var(--coral); padding: 4px 10px; border-radius: 4px;
  margin-bottom: var(--sp-4);
}
.press-flipbook__headline {
  font-family: var(--font-heading); font-weight: 800; font-size: clamp(20px, 2.2vw, 26px);
  line-height: 1.15; color: var(--ink); margin: 0 0 var(--sp-3); text-wrap: balance;
}
.press-flipbook__body { font-family: var(--font-sans); font-size: 14.5px; line-height: 1.55; color: var(--ink-soft); margin: 0 0 var(--sp-4); text-wrap: pretty; }
.press-flipbook__link { align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-weight: 700; font-size: 14px; color: var(--coral-deep); }
.press-flipbook__link svg { width: 16px; height: 16px; transition: transform var(--motion-fast) var(--ease-out-soft); }
.press-flipbook__link:hover svg { transform: translateX(4px); }
.press-flipbook__link:focus-visible { outline: 2px solid var(--coral-deep); outline-offset: 3px; border-radius: 4px; }

.press-flipbook__briefs {
  display: flex; gap: var(--sp-5); margin-top: auto; padding-top: var(--sp-4);
  border-top: 1px solid var(--paper-line);
}
.press-flipbook__brief { flex: 1; min-width: 0; }
.press-flipbook__brief-outlet {
  display: block; font-family: var(--font-sans); font-size: 10.5px; font-weight: 800;
  letter-spacing: .05em; text-transform: uppercase; color: var(--coral-deep); margin-bottom: 4px;
}
.press-flipbook__brief-title { display: block; font-family: var(--font-heading); font-size: 13.5px; font-weight: 700; line-height: 1.3; color: var(--ink); }
.press-flipbook__brief:hover .press-flipbook__brief-title { text-decoration: underline; }

.press-flipbook__nav { display: flex; align-items: center; justify-content: center; gap: var(--sp-4); margin-top: var(--sp-5); }
.press-flipbook__navbtn {
  width: 34px; height: 34px; border-radius: 999px; border: 1px solid var(--paper-line);
  background: var(--cream-card); color: var(--ink); font-size: 16px; line-height: 1;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  transition: background var(--motion-fast) var(--ease-out-soft), border-color var(--motion-fast) var(--ease-out-soft);
}
.press-flipbook__navbtn:hover { background: var(--coral); border-color: var(--coral); color: #fff; }
.press-flipbook__navbtn:focus-visible { outline: 2px solid var(--coral-deep); outline-offset: 2px; }
.press-flipbook__dots { display: flex; align-items: center; gap: 6px; }
.press-flipbook__dot { width: 7px; height: 7px; padding: 0; border: none; border-radius: 999px; background: var(--paper-line); cursor: pointer; transition: all var(--motion-fast) var(--ease-out-soft); }
.press-flipbook__dot.is-active { width: 20px; border-radius: 4px; background: var(--coral); }
.press-flipbook__dot:focus-visible { outline: 2px solid var(--coral-deep); outline-offset: 2px; }
.press-flipbook__count { font-family: var(--font-sans); font-size: 12px; font-weight: 700; color: var(--ink-soft); opacity: .7; margin-left: var(--sp-3); }
.press-flipbook__sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

@media (max-width: 640px) {
  .press-flipbook__stage { min-height: 440px; }
  .press-flipbook__briefs { flex-direction: column; gap: var(--sp-3); }
}

@media (prefers-reduced-motion: reduce) {
  .press-flipbook__page--over { transition: opacity 200ms linear; transform: none !important; }
  .press-flipbook__page--out-next.is-turning,
  .press-flipbook__page--out-prev.is-turning { transform: none; opacity: 0; }
  .press-flipbook__link svg,
  .press-flipbook__navbtn,
  .press-flipbook__dot { transition: none; }
}
```

Nota: `.press-flipbook__stage` tem `min-height: 360px` fixo (não mede dinamicamente a
página anterior/atual) — se uma manchete futura for bem mais longa que as atuais, a
camada `--over` pode ultrapassar essa altura durante os ~600ms da virada. Aceitável pro
conteúdo real de hoje (textos curtos, 1-2 notas); se `mediaCards` ganhar descrições bem
mais longas no futuro, ajustar o `min-height`.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ built in ...` sem erro (componente criado mas ainda não importado em
lugar nenhum — não quebra o build).

- [ ] **Step 4: Commit**

```bash
git add src/components/PressFlipbook.jsx src/styles/motion-system.css
git commit -m "feat(home): cria componente PressFlipbook (virada de página 3D)"
```

---

### Task 3: Integrar na Home — masthead, dateline, spread, sidebar

**Files:**
- Modify: `src/pages/institutional/Home.jsx:10-16` (imports)
- Modify: `src/pages/institutional/Home.jsx:77-103` (remove `MediaCard`)
- Modify: `src/pages/institutional/Home.jsx:218-219` (remove `mediaOpen`)
- Modify: `src/pages/institutional/Home.jsx:335-388` (seção `#sweet-na-midia`)
- Modify: `src/pages/institutional/Home.jsx:681-729` (CSS `.hm-media*`)

**Interfaces:**
- Consumes: `PressFlipbook` (Task 2), `mediaPages`/`mediaSeals`/`mediaReinforce` (Task 1
  e dados já existentes).
- Produces: nada consumido por outra task — esta é a integração final visível.

> ⚠️ Os números de linha acima são os do arquivo **antes** desta task (conferir com
> `grep -n` antes de editar, já que a Task 1 pode ter deslocado algumas linhas em poucas
> unidades). Usar os textos exatos abaixo como âncora do `Edit`, não só o número.

- [ ] **Step 1: Import do `PressFlipbook`**

Em `src/pages/institutional/Home.jsx`, linha 14 hoje é:

```js
import { PhotoRotator } from '../../components/PhotoRotator'
```

Adicionar logo depois:

```js
import { PhotoRotator } from '../../components/PhotoRotator'
import { PressFlipbook } from '../../components/PressFlipbook'
```

- [ ] **Step 2: Remover `MediaCard`**

Localizar e apagar o bloco inteiro (comentário + função, hoje linhas 77-103):

```js
// Card de mídia — selo do veículo + badge de categoria, título, descrição e
// link externo (nova aba). aria-label descritivo (sem "clique aqui").
function MediaCard({ c }) {
  return (
    <div className="t-tilt">
    <article className="hm-media__card t-tilt-card">
      <div className="hm-media__card-head">
        <span className="hm-media__outlet">{c.outlet}</span>
        {c.category && <span className="hm-media__cat">{c.category}</span>}
        {c.date && <time className="hm-media__date" dateTime={c.date}>{c.date}</time>}
      </div>
      <h4>{c.title}</h4>
      <p>{c.description}</p>
      <a
        className="hm-media__link motion-press"
        href={c.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${c.cta} na ${c.outlet} sobre o Sweet & Coffee Week`}
      >
        {c.cta} <I.arrow />
      </a>
      <div className="t-tilt-glare" aria-hidden="true"></div>
    </article>
    </div>
  )
}
```

Apagar por completo — `PressFlipbook` (Task 2) substitui essa renderização. `I` continua
importado e usado em outros pontos do arquivo (linhas 267, 270, 273, 276, 421) — não
mexer no import.

- [ ] **Step 3: Remover o estado `mediaOpen`**

Hoje:

```js
  // "Sweet na mídia" — revela matérias extras além das 6 em destaque.
  const [mediaOpen, setMediaOpen] = React.useState(false)

```

Apagar as 3 linhas (comentário + state + linha em branco). Sem "ver mais", esse estado
não tem mais consumidor.

- [ ] **Step 4: Substituir a seção `#sweet-na-midia`**

Hoje (abre em `<section id="sweet-na-midia" className="section hm-media">`, fecha em
`</section>` — bloco inteiro):

```jsx
      {/* SWEET NA MÍDIA — credibilidade institucional: chancela + imprensa.
          Banda creme (quebra a sequência escura, estética de clipping). */}
      <section id="sweet-na-midia" className="section hm-media">
        <div className="wrap">
          <div className="hm-head hm-media__head motion-reveal-up">
            <span className="hm-media__eyebrow">Na mídia</span>
            <h2>Uma história que também ganhou <span className="keep-together"><span className="hl-w" style={{ '--hl': 'var(--coral)' }}>espaço na imprensa</span>.</span></h2>
            <p>Reportagens, entrevistas e registros acadêmicos ajudam a contar como o Sweet &amp; Coffee Week se tornou uma tradição gastronômica e afetiva de Natal.</p>
          </div>

          {/* Selos rápidos de credibilidade — não repetidos nos cards */}
          <ul className="hm-media__seals motion-stagger">
            {mediaSeals.map((s) => <li className="hm-media__seal" key={s}>{s}</li>)}
          </ul>

          {/* 6 cards de imprensa em destaque */}
          <div className="hm-media__grid motion-stagger">
            {mediaFeatured.map((c) => <MediaCard c={c} key={c.href} />)}
          </div>

          {mediaExtra.length > 0 && (
            <>
              <div className="hm-media__more">
                <button
                  type="button"
                  className="btn btn-secondary motion-press"
                  aria-expanded={mediaOpen}
                  aria-controls="sweet-media-extra"
                  onClick={() => setMediaOpen((v) => !v)}
                >
                  {mediaOpen ? 'Ver menos' : 'Ver mais matérias'}
                </button>
              </div>
              <ul id="sweet-media-extra" className="hm-media__list" hidden={!mediaOpen}>
                {mediaExtra.map((c) => (
                  <li className="hm-media__row" key={c.href}>
                    <span className="hm-media__row-outlet">{c.outlet}</span>
                    <span className="hm-media__row-theme">{c.title}{c.date ? ` · ${c.date}` : ''}</span>
                    <a className="hm-media__row-link" href={c.href} target="_blank" rel="noopener noreferrer" aria-label={`${c.cta || 'Ler'} na ${c.outlet}`}>
                      {c.cta || 'Ler'} <I.arrow />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* O que a imprensa reforça — 3 frases curtas */}
          <div className="hm-media__reinforce motion-reveal-up">
            <h3>O que a imprensa reforça</h3>
            <ul>
              {mediaReinforce.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </div>
      </section>
```

Substituir por:

```jsx
      {/* SWEET NA MÍDIA — capa de jornal: masthead, selos como dateline e
          spread principal (PressFlipbook) que vira de página, com caixa
          lateral fixa pras 3 frases de reforço. Banda creme. */}
      <section id="sweet-na-midia" className="section hm-media">
        <div className="wrap">
          <div className="hm-head hm-media__head motion-reveal-up">
            <span className="hm-media__eyebrow">Na mídia</span>
            <h2>Uma história que também ganhou <span className="keep-together"><span className="hl-w" style={{ '--hl': 'var(--coral)' }}>espaço na imprensa</span>.</span></h2>
            <p>Reportagens, entrevistas e registros acadêmicos ajudam a contar como o Sweet &amp; Coffee Week se tornou uma tradição gastronômica e afetiva de Natal.</p>
          </div>

          {/* Dateline — selos de credibilidade como tira de jornal (não pílula) */}
          <ul className="hm-media__dateline motion-reveal-up">
            {mediaSeals.map((s) => <li key={s}>{s}</li>)}
          </ul>

          {/* Spread que vira de página + caixa lateral fixa */}
          <div className="hm-media__grid">
            <PressFlipbook pages={mediaPages} interval={7500} autoPlay />

            <aside className="hm-media__side motion-reveal-up">
              <h3>O que a imprensa reforça</h3>
              <ul>
                {mediaReinforce.map((r) => <li key={r}>{r}</li>)}
              </ul>
              <p>Fixo — não vira com as páginas.</p>
            </aside>
          </div>
        </div>
      </section>
```

- [ ] **Step 5: Substituir o CSS `.hm-media*`**

Hoje (linhas 681-729, do comentário de bloco até o `@media (prefers-reduced-motion)`):

```css
.hm .hm-media { background: var(--cream); }
.hm-media__head { max-width: 720px; }
.hm-media__head h2 { font-size: clamp(28px, 3.4vw, 46px); line-height: 1.05; }
.hm-media__eyebrow { font-family: var(--font-sans); font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); }
.hm-media__head p { max-width: 56ch; }

/* Selos rápidos de credibilidade (pílulas) */
.hm-media__seals { list-style: none; margin: var(--sp-6) 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--sp-3); }
.hm-media__seal { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--coral-deep); background: rgba(232,85,58,.08); border: 1px solid rgba(232,85,58,.2); border-radius: 999px; padding: 8px 16px; }
.hm-media__seal::before { content: ''; width: 7px; height: 7px; border-radius: 999px; background: var(--coral); }

/* 6 cards (3/2/1 col), selo textual do veículo */
.hm-media__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); margin-top: var(--sp-8); }
.hm-media__card-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: var(--sp-4); }
.hm-media__card-head .hm-media__outlet { margin-bottom: 0; }
.hm-media__cat { font-family: var(--font-sans); font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-soft); background: rgba(43,24,16,.06); border-radius: 999px; padding: 4px 10px; }
.hm-media__date { margin-left: auto; font-family: var(--font-sans); font-size: 12px; font-weight: 700; color: var(--ink-soft); opacity: .8; font-variant-numeric: tabular-nums; }
.hm-media__card { display: flex; flex-direction: column; align-items: flex-start; height: 100%; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-5); box-shadow: var(--shadow-md); transition: transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out); }
.hm-media__card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
.hm-media__outlet { display: inline-block; padding: 5px 12px; border-radius: 999px; background: rgba(232,85,58,.1); color: var(--coral-deep); font-family: var(--font-sans); font-size: 11.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-bottom: var(--sp-4); }
.hm-media__card h4 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 1.4vw, 20px); line-height: 1.16; color: var(--ink); margin: 0 0 var(--sp-3); text-wrap: balance; }
.hm-media__card p { color: var(--ink-soft); font-size: 14px; line-height: 1.5; margin: 0 0 var(--sp-5); text-wrap: pretty; }
.hm-media__link { align-self: flex-start; margin-top: auto; display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-weight: 700; font-size: 14px; color: var(--accent); }
.hm-media__link svg { width: 16px; height: 16px; transition: transform var(--motion-fast, .16s) var(--ease-out-soft, ease); }
.hm-media__link:hover svg { transform: translateX(4px); }
.hm-media__link:focus-visible { outline: 2px solid var(--cyan-deep); outline-offset: 3px; border-radius: 4px; }

/* Ver mais + lista secundária compacta (linhas, não cards) */
.hm-media__more { display: flex; justify-content: center; margin-top: var(--sp-6); }
.hm-media__list { list-style: none; margin: var(--sp-5) auto 0; padding: 0; max-width: 760px; }
.hm-media__list[hidden] { display: none; }
.hm-media__row { display: grid; grid-template-columns: minmax(120px, auto) 1fr auto; align-items: center; gap: var(--sp-4); padding: var(--sp-4) 0; border-top: 1px solid var(--paper-line); }
.hm-media__row:last-child { border-bottom: 1px solid var(--paper-line); }
.hm-media__row-outlet { font-family: var(--font-sans); font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--coral-deep); }
.hm-media__row-theme { font-size: 14.5px; color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hm-media__row-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-sans); font-weight: 700; font-size: 13px; color: var(--accent); white-space: nowrap; }
.hm-media__row-link svg { width: 14px; height: 14px; }
.hm-media__row-link:focus-visible { outline: 2px solid var(--cyan-deep); outline-offset: 3px; border-radius: 4px; }

/* O que a imprensa reforça — faixa final de 3 frases */
.hm-media__reinforce { margin-top: var(--sp-8); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-6) var(--sp-7); box-shadow: var(--shadow-sm); }
.hm-media__reinforce h3 { font-family: var(--font-sans); font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--coral-deep); margin: 0 0 var(--sp-5); }
.hm-media__reinforce ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-5); }
.hm-media__reinforce li { position: relative; padding-left: 18px; font-family: var(--font-heading); font-weight: 700; font-size: clamp(15px, 1.3vw, 18px); line-height: 1.3; color: var(--ink); text-wrap: balance; }
.hm-media__reinforce li::before { content: ''; position: absolute; left: 0; top: .42em; width: 8px; height: 8px; border-radius: 999px; background: var(--coral); }

@media (max-width: 860px) { .hm-media__grid { grid-template-columns: repeat(2, 1fr); } .hm-media__reinforce ul { grid-template-columns: 1fr; gap: var(--sp-4); } }
@media (max-width: 560px) { .hm-media__grid { grid-template-columns: 1fr; } .hm-media__row { grid-template-columns: 1fr auto; } .hm-media__row-theme { grid-column: 1 / -1; white-space: normal; } }
@media (prefers-reduced-motion: reduce) { .hm-media__card, .hm-media__link svg { transition: none; } }
```

Substituir por:

```css
.hm .hm-media { background: var(--cream); }
.hm-media__head { max-width: 640px; }
.hm-media__head h2 { font-size: clamp(28px, 3.4vw, 46px); line-height: 1.05; }
.hm-media__eyebrow { font-family: var(--font-sans); font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); }
.hm-media__head p { max-width: 56ch; }

/* Dateline — selos de credibilidade como tira de jornal (convenção de
   dateline/masthead, não pílula/chip) */
.hm-media__dateline {
  list-style: none; margin: var(--sp-6) 0 0; padding: var(--sp-3) 0;
  border-top: 2px solid var(--ink); border-bottom: 1px solid var(--paper-line);
  display: flex; flex-wrap: wrap; row-gap: 6px;
  font-family: var(--font-sans); font-size: 11.5px; font-weight: 700;
  letter-spacing: .05em; text-transform: uppercase; color: var(--ink-soft);
}
.hm-media__dateline li:not(:last-child)::after { content: '·'; margin: 0 14px; opacity: .5; font-weight: 400; }

/* Spread (PressFlipbook) + caixa lateral fixa */
.hm-media__grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: var(--sp-5); align-items: stretch; margin-top: var(--sp-7); }

.hm-media__side { background: var(--ink); border-radius: var(--r-lg); padding: var(--sp-6); color: var(--cream); display: flex; flex-direction: column; }
.hm-media__side h3 { font-family: var(--font-sans); font-size: 11.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--yellow); border-bottom: 2px solid var(--yellow); padding-bottom: var(--sp-3); margin: 0 0 var(--sp-4); }
.hm-media__side ul { list-style: none; margin: 0; padding: 0; }
.hm-media__side li { font-family: var(--font-heading); font-size: 15px; line-height: 1.45; padding: var(--sp-3) 0; border-bottom: 1px solid rgba(255,241,230,.14); }
.hm-media__side li:last-of-type { border-bottom: none; }
.hm-media__side li::before { content: '“'; color: var(--coral); font-size: 20px; margin-right: 4px; }
.hm-media__side p { font-family: var(--font-sans); font-size: 12px; opacity: .6; margin: var(--sp-4) 0 0; }

@media (max-width: 960px) { .hm-media__grid { grid-template-columns: 1fr; } }
@media (max-width: 560px) { .hm-media__dateline { font-size: 10.5px; } }
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: `✓ built in ...` sem erro.

- [ ] **Step 7: Verificação manual no navegador**

1. Iniciar/garantir o dev server rodando (`npm run dev` ou o preview já ativo) e abrir a
   Home (`/#/`).
2. Rolar até `#sweet-na-midia`. Confirmar: masthead igual a antes, dateline com os 4
   selos separados por "·", spread com manchete grande, setas/pontinhos, caixa lateral
   escura com as 3 frases.
3. Clicar na seta "›" 3x — confirmar que a manchete muda a cada clique e a página vira
   com rotação visível (não é só fade). Clicar num ponto do meio — pula direto pra
   aquela página. Contar: 6 páginas navegáveis, cobrindo as 6 manchetes originais + as 8
   notas nas páginas certas (nenhuma das 14 matérias "sumiu").
4. Focar o carrossel (Tab até ele) e apertar `←`/`→` — deve navegar igual ao clique.
5. Aguardar ~8s sem interagir — autoplay avança sozinho. Clicar uma vez em qualquer
   controle — autoplay não deve mais avançar sozinho depois disso.
6. Emular `prefers-reduced-motion: reduce` (`preview_resize` com `colorScheme`, ou nas
   devtools do navegador) e recarregar — confirmar que não roda autoplay e que a virada
   vira crossfade simples (sem rotação 3D).
7. Redimensionar para <960px — grid empilha (spread em cima, caixa lateral embaixo).

- [ ] **Step 8: Commit**

```bash
git add src/pages/institutional/Home.jsx
git commit -m "feat(home): seção Sweet na Mídia vira spread editorial com PressFlipbook"
```

---

### Task 4: Regressão final

**Files:** nenhum (só verificação; editar apenas se algo falhar).

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: `✓ built in ...` sem erro.

- [ ] **Step 2: Teste responsivo automatizado**

Run: `npm run test:responsive`
Expected: `✓ 6/6 viewports OK` (ou o total atual de viewports), sem overflow horizontal,
sem processo `vite preview` órfão ao final.

- [ ] **Step 3: Conferir que nada fora do escopo mudou**

```bash
git diff --stat HEAD~4 -- src/pages/institutional/Home.jsx
grep -n "AWARDS_ONLY_PUBLICATION" src/data/*.js
```

Expected: o diff acumulado das 4 tasks só toca as linhas de import, `mediaPages`,
`MediaCard`/`mediaOpen` (removidos), a seção `#sweet-na-midia` e o bloco CSS
`.hm-media*` — nenhuma outra seção da Home. `AWARDS_ONLY_PUBLICATION` continua com o
valor de antes desta feature (não é tocado por nenhuma task).

- [ ] **Step 4: Corrigir se algo falhou, senão nenhum commit novo necessário**

Se o Step 2 ou 3 acusar algo, corrigir o arquivo relevante, repetir Steps 1-3, e só então
commitar a correção:

```bash
git add -A -- src/pages/institutional/Home.jsx src/components/PressFlipbook.jsx src/styles/motion-system.css
git commit -m "fix(home): ajuste pós-regressão no flipbook de imprensa"
```

Se tudo passou de primeira, esta task termina sem commit (as 3 tasks anteriores já
cobrem o trabalho completo).
