# Edições — Refino (Etapa 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken mobile sticky chip-nav, replace the desktop horizontal
presentation's scroll-jack mechanism with a native scroll-snap + wheel-redirect
mechanism, and give the page an editorial visual polish pass — without touching any
data file or the Home page.

**Architecture:** All work lives in 3 files: `src/styles.css` (1-line bug fix),
`src/data/editionAssets.js` (1 stale comment), `src/pages/institutional/Edicoes.jsx`
(mechanism rewrite + visual polish, in its existing embedded `<style>` block — this
codebase's established pattern for institutional pages, not changed here).

**Tech Stack:** React 18 (function components + hooks), plain CSS (embedded per-page
`<style>` block, CSS custom properties from `src/styles/swc-redesign.css`), native
browser APIs only (no new dependencies): `scroll-snap`, `WheelEvent`,
`IntersectionObserver` (already used), `matchMedia` (already used).

## Global Constraints

- Paleta oficial only — no new colors (CLAUDE.md §3). New tones must be existing CSS
  vars already defined in `src/styles/swc-redesign.css`.
- Margens/grid seguem a Home (`--maxw` 1280 / `--pad` clamp(20,4vw,56)) — unchanged in
  this plan, `.edx-page`/`.edx-wrap` already compliant.
- Não usar eyebrow/kicker acima de título, não usar `var(--font-mono)` em rótulos
  institucionais (CLAUDE.md §5) — unaffected by this plan, no new labels added above
  titles.
- Sem stickers/ilustrações soltas (CLAUDE.md §6) — unaffected.
- Home não é tocada (CLAUDE.md §9) — this plan touches zero Home files.
- Não inventar dado — `src/data/editions.js`, `sweetCoffeeHistory.js`,
  `editionGallery.js` are NOT modified by this plan (data already 100% complete,
  confirmed in the design spec).
- Breakpoint desktop↔mobile pra Edições é 980px (não 960 — a página já usa esse valor
  antes deste plano; não renumerar, ver CLAUDE.md §17 "só quando o conteúdo daquele
  bloco exigir ponto próprio").
- `npm run build` deve passar limpo antes de qualquer commit de código.
- `npm run test:responsive` deve continuar em 6/6 depois do fix do Task 1 (regressão
  em outras páginas seria um sinal de erro no fix).

---

## Task 1: Fix do bug de sticky mobile (causa raiz global)

**Files:**
- Modify: `src/styles.css:1341`

**Interfaces:**
- Consumes: nada (fix isolado, sem dependência de outro task).
- Produces: `overflow-y: visible` explícito na regra `@media (max-width: 767px) html,
  body`, usado implicitamente por qualquer `position: sticky` mobile no site (inclusive
  o `.edx-chips-wrap` que os próximos tasks não tocam, mas que passa a funcionar).

- [ ] **Step 1: Aplicar o fix**

Em `src/styles.css`, trocar:

```css
@media (max-width: 767px) {
  html, body { overflow-x: hidden; max-width: 100%; }
```

por:

```css
@media (max-width: 767px) {
  html, body { overflow-x: hidden; overflow-y: visible; max-width: 100%; }
```

- [ ] **Step 2: Build**

Rodar: `npm run build`
Esperado: build limpo, sem erro (é só CSS, não deveria quebrar nada).

- [ ] **Step 3: Verificar o sticky ao vivo**

Subir o preview (`preview_start` com a config `sweet-coffee-week` do
`.claude/launch.json`, ou `npm run dev`), redimensionar pra mobile (375×812),
navegar pra `#/edicoes`, rolar a página e checar que a barra de chips gruda no topo
em vez de rolar embora.

Se estiver usando o preview MCP (Claude Code), o app roda dentro de um `<iframe>` em
DEV (`DevViewportSwitcher`) — acessar via
`document.querySelector('iframe').contentDocument`. Script de verificação
(`preview_eval`):

```js
(() => {
  const f = document.querySelector('iframe'); const d = f.contentDocument;
  d.documentElement.scrollTop = 900;
  const c = d.querySelector('.edx-chips-wrap');
  const r = c.getBoundingClientRect();
  return { top: r.top, overflowY: getComputedStyle(d.body).overflowY };
})()
```

Esperado: `top` fica em `0` (ou muito próximo — a barra grudou no topo do viewport),
`overflowY` continua `"visible"` (não mais `"auto"`).

- [ ] **Step 4: Rodar a suíte de responsividade**

Rodar: `npm run build && npm run test:responsive`
Esperado: `✓ 6/6 viewports OK` (sem regressão em nenhuma página — este fix é global).

- [ ] **Step 5: Commit**

```bash
git add src/styles.css
git commit -m "fix(mobile): overflow-y explícito evita quebrar position:sticky em html+body"
```

---

## Task 2: Corrigir comentário desatualizado em editionAssets.js

**Files:**
- Modify: `src/data/editionAssets.js`

**Interfaces:**
- Consumes: nada.
- Produces: nada consumido por outros tasks (limpeza isolada de comentário).

- [ ] **Step 1: Ler o comentário atual**

Abrir `src/data/editionAssets.js` e localizar o comentário que descreve os logos como
ausentes do acervo (situação já não verdadeira — os 16 logos existem em
`public/images/editions/<code>/logo.png`, confirmado nesta sessão).

- [ ] **Step 2: Corrigir o texto**

Substituir a afirmação de que os logos "ainda não existem" por uma nota de que os 16
logos reais já estão no acervo (`public/images/editions/<code>/logo.png`) e que a
lógica `is-fallback` permanece como rede de segurança (arquivo ausente/quebrado no
futuro), não como caminho esperado hoje.

- [ ] **Step 3: Build**

Rodar: `npm run build`
Esperado: build limpo (mudança é só comentário, zero impacto funcional).

- [ ] **Step 4: Commit**

```bash
git add src/data/editionAssets.js
git commit -m "docs(edicoes): corrige comentário desatualizado sobre logos do acervo"
```

---

## Task 3: Trocar o mecanismo horizontal desktop (scroll-jack → scroll-snap nativo)

**Files:**
- Modify: `src/pages/institutional/Edicoes.jsx:186-311` (component body + JSX) e
  `src/pages/institutional/Edicoes.jsx:334-338` (CSS do stage/sticky/viewport/track)

**Interfaces:**
- Consumes: `PANELS`, `TOTAL` (definidos no topo do arquivo, inalterados),
  `EditionSlide`, `EditionNav` (componentes existentes, inalterados neste task).
- Produces: refs `stageRef` (substitui `outerRef`) e `trackRef` (agora o próprio
  elemento com `overflow-x:auto`); função `pick(i)` com nova assinatura
  (`trackRef.current.scrollTo(...)`); state `active`/`horizontal` (mesmos nomes,
  mesma semântica). Task 4 e Task 6 dependem desses nomes exatos.

### Contexto

Hoje o `useEffect` de "Scroll-driven" (linhas ~208-232) escuta `scroll`/`resize` da
página inteira, calcula progresso a partir da altura artificial de `.edx-stage`
(`${TOTAL*135}vh`) e aplica `translate3d` manual no trilho. Isso sai por completo.

- [ ] **Step 1: Reescrever o corpo do componente (state, refs, efeitos, pick)**

Em `src/pages/institutional/Edicoes.jsx`, susbtituir todo o trecho de
`export function EdicoesPage() {` até o fim da função `pick` (o `}, [horizontal])`
que fecha o `useCallback` de `pick`, ou seja, desde a linha 186 até a linha 264 do
arquivo original — por:

```jsx
export function EdicoesPage() {
  const pageRef = React.useRef(null)
  const stageRef = React.useRef(null)
  const trackRef = React.useRef(null)
  // Observer de reveal p/ o <PageHero> (usa .motion-reveal-up; aqui não há
  // PageShell, então a página provê o observer — igual às demais institucionais).
  useRevealOnScroll(pageRef)
  const [active, setActive] = React.useState(0)
  const [horizontal, setHorizontal] = React.useState(false)

  // Modo horizontal só no desktop e sem reduced-motion.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mqWide = window.matchMedia('(min-width: 980px)')
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const evaluate = () => setHorizontal(mqWide.matches && !mqMotion.matches)
    evaluate()
    mqWide.addEventListener('change', evaluate)
    mqMotion.addEventListener('change', evaluate)
    return () => { mqWide.removeEventListener('change', evaluate); mqMotion.removeEventListener('change', evaluate) }
  }, [])

  // Desktop: trilho nativamente scrollável (scroll-snap). O wheel vertical do
  // mouse/trackpad é redirecionado pra scrollLeft ENQUANTO o cursor está sobre a
  // seção; nas bordas (1ª edição rolando pra cima / 16ª rolando pra baixo) o evento
  // não é interceptado — a página rola normal (sai pro hero acima / rodapé abaixo).
  React.useEffect(() => {
    if (!horizontal) return
    const track = trackRef.current
    if (!track) return
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return // gesto já é horizontal — deixa nativo
      const max = track.scrollWidth - track.clientWidth
      const atStart = track.scrollLeft <= 0
      const atEnd = track.scrollLeft >= max - 1
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return // borda — libera scroll da página
      e.preventDefault()
      track.scrollLeft += e.deltaY
    }
    track.addEventListener('wheel', onWheel, { passive: false })
    return () => track.removeEventListener('wheel', onWheel)
  }, [horizontal])

  // Desktop: progresso + índice ativo vêm do scroll horizontal nativo do trilho.
  React.useEffect(() => {
    if (!horizontal) return
    const track = trackRef.current
    if (!track) return
    let raf = 0
    const update = () => {
      raf = 0
      const max = track.scrollWidth - track.clientWidth
      const progress = max > 0 ? track.scrollLeft / max : 0
      const idx = Math.round(progress * (TOTAL - 1))
      setActive((prev) => (prev === idx ? prev : idx))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    track.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => { track.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [horizontal])

  // Modo vertical: observa qual painel está visível p/ acender o chip ativo.
  React.useEffect(() => {
    if (horizontal || typeof window === 'undefined') return
    const nodes = PANELS.map((_, i) => document.getElementById(`edx-panel-${i}`)).filter(Boolean)
    if (!nodes.length) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const i = Number(en.target.id.replace('edx-panel-', ''))
          setActive(i)
        }
      })
    }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' })
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [horizontal])

  // Clique na navegação → rola até a edição (horizontal: scrollLeft nativo do
  // trilho; vertical: scrollIntoView do painel).
  const pick = React.useCallback((i) => {
    const clamped = Math.min(Math.max(i, 0), TOTAL - 1)
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (horizontal && trackRef.current) {
      const track = trackRef.current
      track.scrollTo({ left: clamped * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' })
    } else {
      const el = document.getElementById(`edx-panel-${clamped}`)
      if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }
  }, [horizontal])
```

- [ ] **Step 2: Simplificar o JSX do branch desktop**

Substituir:

```jsx
        <section
          ref={outerRef}
          className="edx-stage"
          style={{ height: `${TOTAL * 135}vh` }}
          aria-label="Apresentação das edições"
        >
          <div className="edx-sticky">
            <div className="edx-viewport">
              <div ref={trackRef} className="edx-track" style={{ width: `${TOTAL * 100}vw` }}>
                {PANELS.map((e, i) => <EditionSlide e={e} key={e.code} live={Math.abs(i - active) <= 1} />)}
              </div>
            </div>
            <div className="edx-progress" aria-hidden="true">
              <span style={{ width: `${((active + 1) / TOTAL) * 100}%` }} />
            </div>
            <EditionNav active={active} onPick={pick} />
          </div>
        </section>
```

por:

```jsx
        <section
          ref={stageRef}
          className="edx-stage"
          aria-label="Apresentação das edições"
        >
          <div ref={trackRef} className="edx-track">
            {PANELS.map((e, i) => <EditionSlide e={e} key={e.code} live={Math.abs(i - active) <= 1} />)}
          </div>
          <div className="edx-progress" aria-hidden="true">
            <span style={{ width: `${((active + 1) / TOTAL) * 100}%` }} />
          </div>
          <EditionNav active={active} onPick={pick} />
        </section>
```

(O comentário `{/* DESKTOP — apresentação horizontal scroll-driven */}` acima dessa
seção pode ficar; ajustar o texto pra "DESKTOP — trilho horizontal nativo
(scroll-snap) + wheel-redirect" se quiser, não é obrigatório pro funcionamento.)

- [ ] **Step 3: Reescrever o CSS do stage/track**

Substituir:

```css
        /* STAGE — desktop sticky horizontal */
        .edx-stage { position: relative; background: var(--cream); }
        .edx-sticky { position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        .edx-viewport { flex: 1; overflow: hidden; padding-top: clamp(80px, 11vh, 130px); }
        .edx-track { display: flex; height: 100%; will-change: transform; }
```

por:

```css
        /* STAGE — bloco normal de 100vh no fluxo da página (sem scroll-jack). O
           trilho é nativamente scrollável na horizontal (scroll-snap); o wheel
           vertical é redirecionado por JS enquanto o cursor está sobre a seção
           (ver useEffect "onWheel" no componente). */
        .edx-stage { position: relative; height: 100vh; background: var(--cream); display: flex; flex-direction: column; outline: none; }
        .edx-track {
          flex: 1;
          display: flex;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          padding-top: clamp(80px, 11vh, 130px);
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .edx-track::-webkit-scrollbar { display: none; }
```

Depois, na regra `.edx-slide` (mais abaixo no mesmo bloco `<style>`), que hoje é:

```css
        .edx-slide { min-width: 100vw; height: 100%; display: flex; align-items: center; background: color-mix(in srgb, var(--tone) 5%, var(--cream)); }
```

trocar por (adiciona `flex-shrink: 0` e `scroll-snap-align`/`scroll-snap-stop` —
necessário pro flex row não tentar encolher os painéis e pro snap parar 1 painel por
gesto):

```css
        .edx-slide { min-width: 100vw; flex-shrink: 0; height: 100%; display: flex; align-items: center; background: color-mix(in srgb, var(--tone) 5%, var(--cream)); scroll-snap-align: start; scroll-snap-stop: always; }
```

- [ ] **Step 4: Build**

Rodar: `npm run build`
Esperado: build limpo. Se aparecer `outerRef is not defined` ou `edx-sticky`/
`edx-viewport` órfão em algum lugar, revisar se algum outro ponto do arquivo ainda
referencia esses nomes (não deveria — eram usados só nesse trecho).

- [ ] **Step 5: Verificar ao vivo (desktop)**

Preview em viewport desktop (`preview_resize` preset `desktop` ou nativo), navegar
`#/edicoes`. Script de verificação (`preview_eval`, mesmo padrão de acesso ao iframe
do Task 1):

```js
(() => {
  const f = document.querySelector('iframe'); const d = f.contentDocument;
  const track = d.querySelector('.edx-track');
  const before = track.scrollLeft;
  track.dispatchEvent(new d.defaultView.WheelEvent('wheel', { deltaY: 900, bubbles: true, cancelable: true }));
  return { before, after: track.scrollLeft, scrollWidth: track.scrollWidth, clientWidth: track.clientWidth };
})()
```

Esperado: `after > before` (o wheel simulado moveu o trilho pra direita).
Repetir com `deltaY: -900` a partir do início (`scrollLeft` já em 0): esperar que
NÃO mude (borda — sem o quê rolar pra trás) e que a página normal continuaria
scrollável (não testado neste script, checar manualmente).

Testar clique num chip distante (ex.: `16`) via `preview_click` no seletor
`.edx-nav__list li:nth-child(16) button` — esperado: o trilho pula direto pro
painel 16, sem passar visualmente pelos intermediários.

- [ ] **Step 6: Rodar a suíte de responsividade**

Rodar: `npm run test:responsive`
Esperado: `✓ 6/6` (a suíte testa a Home, não Edições diretamente, mas confirma que
nada global quebrou).

- [ ] **Step 7: Commit**

```bash
git add src/pages/institutional/Edicoes.jsx
git commit -m "feat(edicoes): troca scroll-jack por scroll-snap nativo + wheel-redirect no desktop"
```

---

## Task 4: Navegação por teclado (←/→)

**Files:**
- Modify: `src/pages/institutional/Edicoes.jsx` (novo `useEffect` + atributos JSX +
  CSS de foco)

**Interfaces:**
- Consumes: `stageRef`, `pick`, `active`, `horizontal` (Task 3).
- Produces: nada consumido por outros tasks.

- [ ] **Step 1: Adicionar o efeito de teclado**

**Atenção à ordem:** este efeito usa `pick` no array de dependências — `pick` é uma
`const` declarada via `useCallback` mais abaixo no componente (Task 3, Step 1). Se o
efeito for inserido ANTES da declaração de `pick` no corpo da função, o array de
dependências `[horizontal, active, pick]` tenta ler `pick` antes dela existir
(temporal dead zone) e o componente quebra com `ReferenceError: Cannot access
'pick' before initialization`. Por isso este efeito entra **depois** do `const pick
= React.useCallback(...)` (a última declaração de hook no componente), não perto do
efeito de progresso.

Logo após o fechamento do `useCallback` de `pick` (a linha `}, [horizontal])` que
fecha a definição de `pick`, e antes do `return (` do componente, inserir:

```jsx
  // Desktop: setas do teclado navegam entre edições quando a apresentação está focada.
  React.useEffect(() => {
    if (!horizontal) return
    const stage = stageRef.current
    if (!stage) return
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      pick(active + (e.key === 'ArrowRight' ? 1 : -1))
    }
    stage.addEventListener('keydown', onKey)
    return () => stage.removeEventListener('keydown', onKey)
  }, [horizontal, active, pick])
```

- [ ] **Step 2: Tornar a seção focável e anunciar o atalho**

No JSX do Task 3 (branch desktop), trocar:

```jsx
        <section
          ref={stageRef}
          className="edx-stage"
          aria-label="Apresentação das edições"
        >
```

por:

```jsx
        <section
          ref={stageRef}
          className="edx-stage"
          tabIndex={0}
          aria-label="Apresentação das edições — use as setas do teclado para navegar"
        >
```

- [ ] **Step 3: CSS de foco visível**

Na regra `.edx-stage` (bloco `<style>`, Task 3), acrescentar logo abaixo:

```css
        .edx-stage:focus-visible { box-shadow: inset 0 0 0 3px var(--page-accent, var(--cyan)); }
```

- [ ] **Step 4: Build**

Rodar: `npm run build`
Esperado: limpo.

- [ ] **Step 5: Verificar ao vivo**

Clicar na seção (foco) e simular teclado via `preview_eval`:

```js
(() => {
  const f = document.querySelector('iframe'); const d = f.contentDocument;
  const stage = d.querySelector('.edx-stage'); stage.focus();
  const track = d.querySelector('.edx-track');
  const before = track.scrollLeft;
  stage.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  return { before, after: track.scrollLeft };
})()
```

Esperado: `after > before` (avançou 1 painel). Repetir com `ArrowLeft` e conferir que
volta.

- [ ] **Step 6: Commit**

```bash
git add src/pages/institutional/Edicoes.jsx
git commit -m "feat(edicoes): navegação por setas do teclado na apresentação horizontal"
```

---

## Task 5: Estender tons pra 6 + ritmo tipográfico

**Files:**
- Modify: `src/pages/institutional/Edicoes.jsx` (const `TONES` + CSS de espaçamento
  do `.edx-slide__*`)

**Interfaces:**
- Consumes: nada de outros tasks.
- Produces: nada consumido por outros tasks.

- [ ] **Step 1: Estender TONES**

Trocar:

```js
const TONES = ['coral', 'pink', 'cyan', 'yellow']
```

por:

```js
const TONES = ['coral', 'pink', 'cyan', 'yellow', 'peach', 'choco']
```

(`--peach` e `--choco` já existem em `src/styles/swc-redesign.css` — nenhuma cor
nova é criada, cumpre CLAUDE.md §3.)

- [ ] **Step 2: Ajustar ritmo vertical do painel**

No bloco `<style>`, trocar as 5 linhas abaixo (mantendo todo o resto de cada regra
igual — só os valores de margem indicados mudam):

```css
        .edx-slide__index { display: flex; align-items: baseline; gap: 14px; padding-bottom: var(--sp-3); border-bottom: 1px solid var(--paper-line); margin-bottom: var(--sp-4); }
```
→ `margin-bottom: var(--sp-5);`

```css
        .edx-logo { position: relative; width: clamp(88px, 8vw, 120px); aspect-ratio: 1; margin-top: var(--sp-5); border-radius: 16px; display: grid; place-items: center; overflow: hidden; }
```
→ `margin-top: var(--sp-6);`

```css
        .edx-slide__title { font-family: var(--font-heading); font-weight: 800; letter-spacing: -.03em; font-size: clamp(30px, 3.6vw, 56px); line-height: 1; color: var(--ink); margin: var(--sp-4) 0 0; text-wrap: balance; }
```
→ `margin: var(--sp-5) 0 0;`

```css
        .edx-slide__lead { margin: var(--sp-4) 0 0; max-width: 48ch; color: var(--ink-soft); font-size: clamp(14.5px, 1vw, 16px); line-height: 1.5; text-wrap: pretty; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
```
→ `margin: var(--sp-6) 0 0; max-width: 52ch;`

```css
        .edx-slide__status { margin-top: var(--sp-4); }
```
→ `margin-top: var(--sp-5);`

Resultado: índice→logo e logo→título abrem um pouco (sp-5/sp-6), título→etapa
continua colado (8px, é subtítulo), lead abre bem mais (sp-6 — sinaliza "novo
parágrafo"), meta e status ganham sp-5. Hierarquia fica mais clara sem mudar nenhuma
fonte/cor.

- [ ] **Step 3: Build**

Rodar: `npm run build`
Esperado: limpo.

- [ ] **Step 4: Verificar os 6 tons ao vivo**

No preview, navegar por edições e conferir visualmente as 6 primeiras (`01` a `06`
cobrem os 6 tons na ordem: coral, pink, cyan, yellow, peach, choco). Screenshot de
cada uma.

Atenção especial ao tom `choco` (`#3A2114`, escuro — usado como cor de destaque em
`.edx-slide__num`, `.edx-slide__code`, `.edx-slide__etapa`): como é próximo do
`--ink` (texto padrão), pode ler como "sem destaque" em vez de pop de cor. Se, ao
olhar a edição que cai nesse tom (a 6ª: `2019.2`), o número/etapa não se destacarem
claramente do texto padrão da página, ajustar substituindo `choco` por uma variação
mais clara do mesmo tom só nesse uso específico (ex.: usar `--peach` duas vezes na
rotação em vez de incluir `choco`) — decisão a confirmar com o usuário antes de
seguir pro Task 6 se o problema aparecer.

- [ ] **Step 5: Commit**

```bash
git add src/pages/institutional/Edicoes.jsx
git commit -m "style(edicoes): estende tons por edição pra 6 (peach+choco) e ajusta ritmo vertical"
```

---

## Task 6: Transição de entrada por painel (desktop)

**Files:**
- Modify: `src/pages/institutional/Edicoes.jsx` (`EditionSlide`, os dois `.map()` de
  `PANELS`, CSS novo)

**Interfaces:**
- Consumes: `active` state (Task 3), componente `EditionSlide` (existente).
- Produces: nada consumido por outros tasks.

### Por que não um fade-from-zero

Painéis vizinhos ficam parcialmente visíveis durante o gesto de scroll/snap (arrasto
revela a borda do painel ao lado). Esconder o painel inativo (`opacity:0` por
padrão) faria o usuário ver um vazio durante a transição. A transição usa uma queda
sutil de opacidade (100%→82%) + leve deslocamento (6px), nunca opacidade zero — e é
escopada só ao `.edx-stage` (desktop), não à pilha mobile, que não muda de mecânica.

- [ ] **Step 1: Adicionar prop `active` ao `EditionSlide`**

Trocar a assinatura da função:

```jsx
function EditionSlide({ e, live = true }) {
```

por:

```jsx
function EditionSlide({ e, live = true, active = false }) {
```

E, na mesma função, trocar a linha do `<article>`:

```jsx
    <article className="edx-slide" id={`edx-panel-${e.number - 1}`} style={{ '--tone': `var(--${e.tone}, var(--page-accent))` }} aria-roledescription="slide" aria-label={`Edição ${e.number} de ${TOTAL} — ${e.theme} (${e.code})`}>
```

por:

```jsx
    <article className={`edx-slide${active ? ' is-active' : ''}`} id={`edx-panel-${e.number - 1}`} style={{ '--tone': `var(--${e.tone}, var(--page-accent))` }} aria-roledescription="slide" aria-label={`Edição ${e.number} de ${TOTAL} — ${e.theme} (${e.code})`}>
```

- [ ] **Step 2: Passar `active` nos dois `.map()`**

No branch desktop (dentro de `.edx-track`):

```jsx
            {PANELS.map((e, i) => <EditionSlide e={e} key={e.code} live={Math.abs(i - active) <= 1} />)}
```
→
```jsx
            {PANELS.map((e, i) => <EditionSlide e={e} key={e.code} live={Math.abs(i - active) <= 1} active={i === active} />)}
```

No branch mobile (dentro de `.edx-stack__list`), deixar como está — a prop não é
passada lá (default `active=false`), porque o CSS do Step 3 abaixo é escopado só ao
`.edx-stage`, então o valor não teria efeito visual ali mesmo se passado; não passar
mantém a intenção explícita no código.

- [ ] **Step 3: CSS da transição (escopado ao desktop)**

Adicionar, logo depois da regra `.edx-slide { ... }` (a que ganhou
`scroll-snap-align` no Task 3):

```css
        .edx-stage .edx-slide__left, .edx-stage .edx-slide__right {
          transition: opacity .45s var(--ease-out-soft, ease), transform .45s var(--ease-out-soft, ease);
        }
        .edx-stage .edx-slide:not(.is-active) .edx-slide__left,
        .edx-stage .edx-slide:not(.is-active) .edx-slide__right {
          opacity: .82;
          transform: translateY(6px);
        }
        .edx-stage .edx-slide.is-active .edx-slide__left,
        .edx-stage .edx-slide.is-active .edx-slide__right {
          opacity: 1;
          transform: translateY(0);
        }
```

E, no bloco `@media (prefers-reduced-motion: reduce)` já existente no fim do
`<style>` (hoje só com `.edx-progress span, .edx-nav__item { transition: none; }`),
acrescentar mais uma linha na mesma regra:

```css
        @media (prefers-reduced-motion: reduce) {
          .edx-progress span, .edx-nav__item, .edx-slide__left, .edx-slide__right { transition: none; }
        }
```

(Sob reduced-motion o branch desktop nem renderiza — `horizontal` fica `false` — mas
a regra cobre o caso raro de alguém alternar a preferência com a página já aberta e
o React ainda não ter re-renderizado o branch.)

- [ ] **Step 4: Build**

Rodar: `npm run build`
Esperado: limpo.

- [ ] **Step 5: Verificar ao vivo**

Navegar entre 2-3 edições no desktop (clique nos chips) e observar visualmente: o
painel que sai deve escurecer/descer sutilmente, o que entra deve assentar
(opacity 1, sem deslocamento). Confirmar que, durante o arrasto/snap em si (não só
depois de assentar), nenhum painel fica completamente invisível — capturar 1
screenshot no meio da transição (`preview_screenshot` logo após disparar um
`scrollTo` com `behavior:'smooth'`, antes do fim da animação).

- [ ] **Step 6: Commit**

```bash
git add src/pages/institutional/Edicoes.jsx
git commit -m "style(edicoes): transição sutil de entrada por painel no desktop"
```

---

## Task 7: Acabamento visual dos slots de logo/foto

**Files:**
- Modify: `src/pages/institutional/Edicoes.jsx` (CSS dos slots `.edx-logo*` e
  `.edx-photo*`)

**Interfaces:**
- Consumes: nada de outros tasks.
- Produces: nada consumido por outros tasks.

- [ ] **Step 1: Suavizar e unificar as sombras do logo**

Trocar as duas ocorrências do filtro de sombra do logo:

```css
        .edx-logo--seal img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 8px 18px rgba(0,0,0,.25)); }
```
→ `filter: drop-shadow(0 4px 10px rgba(0,0,0,.16));`

```css
        .edx-logo--real img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 6px 14px rgba(43,24,16,.2)); }
```
→ `filter: drop-shadow(0 4px 10px rgba(43,24,16,.16));`

(Logo é um selo pequeno ao lado de uma foto grande com `box-shadow: var(--shadow-lg)`
— uma sombra igualmente pesada nos dois deixava o selo pequeno com peso visual
desproporcional ao seu tamanho.)

- [ ] **Step 2: Respiro entre foto principal e mini-galeria**

Trocar:

```css
        .edx-photo { display: flex; flex-direction: column; gap: 12px; width: 100%; }
```
→ `gap: 14px;`

- [ ] **Step 3: Build**

Rodar: `npm run build`
Esperado: limpo.

- [ ] **Step 4: Verificar ao vivo**

Screenshot de 2-3 edições no desktop, checar visualmente que o logo não "pesa" mais
que a foto ao lado e que a mini-galeria tem respiro levemente maior.

- [ ] **Step 5: Commit**

```bash
git add src/pages/institutional/Edicoes.jsx
git commit -m "style(edicoes): suaviza sombra do logo e ajusta respiro da galeria"
```

---

## Task 8: Verificação final

**Files:** nenhum (só validação)

**Interfaces:**
- Consumes: todos os tasks anteriores (1-7) já commitados.
- Produces: nada — último task do plano.

- [ ] **Step 1: Build limpo**

Rodar: `npm run build`
Esperado: `✓ built in Xs`, zero erro/warning novo.

- [ ] **Step 2: Suíte de responsividade completa**

Rodar: `npm run build && npm run test:responsive`
Esperado: `✓ 6/6 viewports OK`.

- [ ] **Step 3: Matriz manual no preview**

Cobrir, com `preview_resize` + `preview_screenshot`/`preview_eval`:

- **Desktop (≥980px):** wheel scroll avança/recua; borda na 1ª e 16ª edição libera
  scroll da página; clique em chip distante pula direto; setas do teclado
  funcionam com a seção focada; barra de progresso acompanha; os 6 tons aparecem
  ao longo das 16 edições sem repetição a cada 4.
- **Tablet (768px) e mobile (390/414/430px):** pilha vertical, chips grudam no
  topo ao rolar (fix do Task 1), sem overflow horizontal.
- **Resize ao vivo cruzando 980px:** com a página aberta, redimensionar de
  1200px pra 900px e vice-versa — o layout troca de modo sem travar/quebrar.
- **`prefers-reduced-motion: reduce`:** `preview_resize` com
  `colorScheme` não cobre isso — emular via `preview_eval` setando
  `window.matchMedia` não é confiável (é read-only); alternativa: usar
  `preview_eval` pra checar que, quando a media query bate nativamente (rodando
  em ambiente/SO com a preferência ativada), `horizontal` fica `false` — se não
  houver como emular no ambiente disponível, documentar como verificado por
  leitura de código (a lógica já existente de `mqMotion` não foi alterada por
  nenhum task deste plano, só consumida).

- [ ] **Step 4: Screenshots antes/depois**

Guardar ao menos 1 screenshot desktop e 1 mobile do estado final, pra comparação
com os screenshots já tirados durante o brainstorming desta sessão.

- [ ] **Step 5: Reportar**

Resumir pro usuário: o que foi corrigido/trocado/polido, resultado do build e da
suíte, e lembrar que o push pra `dev/site-completo` (ou merge da branch de trabalho
atual) exige confirmação explícita antes de ser feito — não fazer sozinho.
