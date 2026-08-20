# Edições — apresentação fluida, intuitiva e guiada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o scroll-jacking proporcional (rAF) da apresentação horizontal de Edições
por um motor de passos discretos (snap total por painel), com setas Prev/Next como
controle principal, chips compactos secundários e um CTA final pro Sweet Awards.

**Architecture:** Novo hook `useSteppedPresentation` (mecânica de wheel/teclado/
engajamento/cooldown) consumido por `EdicoesPage`, que continua dona do estado `active`
(mesma fonte única de hoje). Modo mobile/reduced-motion (stack vertical) não muda de
mecanismo — só herda CSS de chip compacto e ganha o mesmo CTA final.

**Tech Stack:** React 18 (hooks), CSS puro (sem lib nova). Sem framework de teste
unitário no projeto — validação via `npm run build`, `npm run test:responsive` e
verificação manual no preview (mesmo padrão já usado nos specs/planos anteriores deste
repo, ex. `docs/superpowers/plans/` do PressFlipbook).

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-07-04-edicoes-redesign-fluido-design.md`.
- Paleta só oficial (creme, bege, rosa, amarelo, azul/ciano, coral, marrom, vinho) — sem
  cor nova (CLAUDE.md §3).
- Não dividir as 16 edições por fase/era (CLAUDE.md §11) — sequência direta 1→16 mantida.
- Sem stickers/elementos soltos sem função (CLAUDE.md §5).
- Sem dependência nova.
- `npm run build` tem que passar antes de qualquer commit.
- Ícones: reusar `I.chevronLeft`/`I.chevronRight` de `src/components/icons.jsx` — sem
  SVG novo.
- Motion tokens existentes (`src/styles/layout-tokens.css`): `--motion-slow: 560ms`,
  `--ease-spring-soft: cubic-bezier(.16,1,.3,1)`, `--motion-fast: 160ms`,
  `--ease-out-soft: cubic-bezier(.2,.7,.2,1)`.
- Commits pequenos, só arquivos da tarefa (CLAUDE.md — fluxo de finalização).

---

## Task 1: Motor de passos discretos (`useSteppedPresentation`) + integração no stage

**Files:**
- Create: `src/hooks/useSteppedPresentation.js`
- Modify: `src/pages/institutional/Edicoes.jsx:21-29` (imports), `:186-264` (estado/efeitos/`pick`), `:266-300` (JSX do stage horizontal)

**Interfaces:**
- Produces: `useSteppedPresentation({ enabled, stageRef, total, active, setActive }) → void`
  (hook não retorna nada — só efeitos colaterais: liga wheel/teclado/IO enquanto
  `enabled` for `true`, chama `setActive` do próprio componente). Consumido só por
  `EdicoesPage` nesta task; Task 2/3 reaproveitam o mesmo `active`/`setActive` já
  existente no componente, sem depender de nada novo deste hook.

- [ ] **Step 1: Criar o hook**

```js
// src/hooks/useSteppedPresentation.js
import React from 'react'

// Motor de passos discretos p/ apresentações horizontais tipo Edições — substitui
// scroll proporcional por avanço de 1 índice por gesto (wheel/teclado). Estado do
// índice ativo continua fora (controlado), o hook só cuida da mecânica:
//   - engajamento: IntersectionObserver no stageRef (a apresentação "prende" o wheel
//     só quando ocupa a maior parte do viewport);
//   - wheel: sempre intercepta (preventDefault) enquanto engajado e não estiver na
//     borda na direção do gesto — mesmo durante o cooldown, pra não vazar scroll pra
//     página no meio de uma rolada contínua de trackpad. Só a CHAMADA de setActive é
//     limitada a 1 por janela de cooldown;
//   - borda (primeiro/último painel) na direção do gesto: não intercepta, scroll
//     nativo segue pro hero/rodapé;
//   - teclado (←/→/Home/End): mesma trava de borda, sem cooldown (repetição de tecla
//     já é limitada pelo SO).
const COOLDOWN_MS = 560 // == --motion-slow (layout-tokens.css), duração da transition do track

export function useSteppedPresentation({ enabled, stageRef, total, active, setActive }) {
  const activeRef = React.useRef(active)
  activeRef.current = active
  const engagedRef = React.useRef(false)
  const lockedRef = React.useRef(false)

  const step = React.useCallback((delta) => {
    const next = activeRef.current + delta
    if (next < 0 || next > total - 1) return
    setActive(next)
  }, [total, setActive])

  // Engajamento — stage ocupando a maior parte do viewport.
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const node = stageRef.current
    if (!node) return
    const io = new IntersectionObserver(
      ([entry]) => { engagedRef.current = entry.isIntersecting },
      { threshold: 0.6 }
    )
    io.observe(node)
    return () => { io.disconnect(); engagedRef.current = false }
  }, [enabled, stageRef])

  // Wheel + teclado.
  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const onWheel = (e) => {
      if (!engagedRef.current) return
      const delta = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0
      if (!delta) return
      const atBoundary = (delta > 0 && activeRef.current >= total - 1) ||
                          (delta < 0 && activeRef.current <= 0)
      if (atBoundary) return // solta o scroll nativo (hero/rodapé)
      e.preventDefault()
      if (lockedRef.current) return
      lockedRef.current = true
      step(delta)
      setTimeout(() => { lockedRef.current = false }, COOLDOWN_MS)
    }

    const onKey = (e) => {
      if (!engagedRef.current) return
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
      else if (e.key === 'End') { e.preventDefault(); setActive(total - 1) }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [enabled, total, step, setActive])
}
```

- [ ] **Step 2: Rodar build pra confirmar que o hook novo não quebra nada (ainda não é usado)**

Run: `npm run build`
Expected: build passa sem erros (arquivo novo, sem import ainda).

- [ ] **Step 3: Ligar o hook em `Edicoes.jsx` e remover o motor antigo (rAF)**

Em `src/pages/institutional/Edicoes.jsx`, adicionar o import (perto da linha 24, junto
dos outros hooks):

```js
import { useSteppedPresentation } from '../../hooks/useSteppedPresentation'
```

Remover **por inteiro** o efeito de scroll proporcional de hoje (bloco atual,
`Edicoes.jsx:208-232`):

```js
  // Scroll-driven: vertical → translateX do trilho. rAF, sem listener pesado.
  React.useEffect(() => {
    if (!horizontal) return
    const outer = outerRef.current
    const track = trackRef.current
    if (!outer || !track) return
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const vw = window.innerWidth
      const dist = outer.offsetHeight - vh
      const passed = Math.min(Math.max(-outer.getBoundingClientRect().top, 0), dist)
      const progress = dist > 0 ? passed / dist : 0
      const maxX = (TOTAL - 1) * vw
      track.style.transform = `translate3d(${-progress * maxX}px,0,0)`
      const idx = Math.round(progress * (TOTAL - 1))
      setActive((prev) => (prev === idx ? prev : idx))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [horizontal])
```

E no lugar (mesma posição no arquivo), chamar o hook novo:

```js
  useSteppedPresentation({ enabled: horizontal, stageRef: outerRef, total: TOTAL, active, setActive })
```

Remover a declaração de `trackRef` (`Edicoes.jsx:189`, `const trackRef = React.useRef(null)`)
— não é mais escrito imperativamente, o transform agora vem do render (Step 4).

**Não mexer** no efeito de `IntersectionObserver` do modo mobile (bloco atual,
`Edicoes.jsx:234-249`, comentário "Modo vertical: observa qual painel está visível...") —
ele continua funcionando exatamente como hoje, é um mecanismo diferente (observa os 16
painéis individualmente durante scroll vertical nativo) e não faz parte desta mudança.

Simplificar `pick` (substituir o bloco atual, `Edicoes.jsx:251-264`):

```js
  const pick = React.useCallback((i) => {
    if (horizontal) { setActive(i); return }
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = document.getElementById(`edx-panel-${i}`)
    if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [horizontal])
```

- [ ] **Step 4: Trocar a altura do stage e o transform do track pra controlado por `active`**

Em `Edicoes.jsx:283-294` (JSX do `<section className="edx-stage">`), trocar:

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
```

por:

```jsx
        <section
          ref={outerRef}
          className="edx-stage"
          style={{ height: '130vh' }}
          role="region"
          aria-roledescription="carousel"
          aria-label="Apresentação das edições"
        >
          <div className="edx-sticky">
            <div className="edx-viewport">
              <div className="edx-track" style={{ width: `${TOTAL * 100}vw`, transform: `translateX(${-active * 100}vw)` }}>
                {PANELS.map((e, i) => <EditionSlide e={e} key={e.code} live={Math.abs(i - active) <= 1} />)}
              </div>
            </div>
```

Adicionar a transition no CSS do track — em `Edicoes.jsx:338` trocar:

```css
        .edx-track { display: flex; height: 100%; will-change: transform; }
```

por:

```css
        .edx-track { display: flex; height: 100%; will-change: transform; transition: transform var(--motion-slow) var(--ease-spring-soft); }
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 6: Verificação manual no preview (desktop ≥980px)**

Abrir `/edicoes` no preview, redimensionar pra desktop (≥980px), sem
`prefers-reduced-motion`:
- Rolar o mouse/trackpad pra baixo sobre a apresentação → avança exatamente 1 edição
  por vez, com transição suave (~560ms), nunca para no meio de dois painéis.
- No painel 01, rolar pra cima → solta o scroll, sobe pro hero normalmente.
- No painel 16, rolar pra baixo → solta o scroll, desce pro rodapé normalmente.
- `ArrowRight`/`ArrowLeft`/`Home`/`End` (com a apresentação engajada no viewport)
  navegam corretamente.
- Clicar num chip da barra inferior ainda pula direto pro painel certo.
- Redimensionar pra <980px → stack vertical de sempre, sem regressão.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useSteppedPresentation.js src/pages/institutional/Edicoes.jsx
git commit -m "feat(edicoes): motor de passos discretos substitui scroll proporcional"
```

---

## Task 2: Setas Prev/Next + contador flutuante

**Files:**
- Modify: `src/pages/institutional/Edicoes.jsx` (JSX do stage horizontal + `<style>`)

**Interfaces:**
- Consumes: `active`, `setActive`, `TOTAL`, `PANELS`, `pad2` — já existentes no
  componente (de Task 1 e do código original).
- Produces: nenhuma interface nova consumida por outra task (CTA da Task 3 substitui
  a seta `--next` só no painel final, reaproveitando a mesma classe `.edx-arrow`).

- [ ] **Step 1: Adicionar as setas e o contador no JSX**

Em `Edicoes.jsx`, dentro de `.edx-sticky` (logo depois da `<div className="edx-viewport">`
fechar, antes de `<div className="edx-progress">` — ver Task 1 Step 4 pro estado atual
desse trecho), adicionar:

```jsx
              {active > 0 && (
                <button
                  type="button"
                  className="edx-arrow edx-arrow--prev"
                  onClick={() => setActive((a) => Math.max(a - 1, 0))}
                  aria-label="Edição anterior"
                >
                  <I.chevronLeft width={22} height={22} />
                </button>
              )}

              {active < TOTAL - 1 && (
                <button
                  type="button"
                  className="edx-arrow edx-arrow--next"
                  onClick={() => setActive((a) => Math.min(a + 1, TOTAL - 1))}
                  aria-label="Próxima edição"
                >
                  <I.chevronRight width={22} height={22} />
                </button>
              )}

              <p className="edx-counter" aria-live="polite">
                {pad2(active + 1)} / {pad2(TOTAL)} — {PANELS[active].theme}
              </p>
```

(O CTA que substitui a seta `--next` no painel 16 entra na Task 3 — por ora, painel 16
simplesmente não mostra seta "próxima", igual ao painel 0 não mostrar "anterior".)

- [ ] **Step 2: CSS das setas e do contador**

Adicionar ao `<style>` de `Edicoes.jsx`, depois da regra `.edx-progress span { ... }`
(perto da linha 353):

```css
        /* SETAS — controle principal da apresentação (substituem o texto .edx-nav__now
           no desktop; o contador flutuante assume esse papel). */
        .edx-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 4; display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 999px; border: none; background: color-mix(in srgb, var(--ink) 55%, transparent); color: var(--cream); cursor: pointer; transition: background var(--motion-fast) var(--ease-out-soft), transform var(--motion-fast) var(--ease-out-soft); }
        .edx-arrow:hover { background: color-mix(in srgb, var(--ink) 75%, transparent); transform: translateY(-50%) scale(1.06); }
        .edx-arrow:focus-visible { outline: 2px solid var(--cyan-deep); outline-offset: 3px; }
        .edx-arrow--prev { left: clamp(12px, 2vw, 32px); }
        .edx-arrow--next { right: clamp(12px, 2vw, 32px); }

        .edx-counter { position: absolute; top: clamp(20px, 3vh, 32px); left: 50%; transform: translateX(-50%); z-index: 4; margin: 0; font-family: var(--font-sans); font-size: 13px; font-weight: 700; letter-spacing: .02em; color: var(--ink-soft); background: color-mix(in srgb, var(--cream) 85%, transparent); border-radius: 999px; padding: 6px 16px; white-space: nowrap; }

        /* o contador flutuante substitui a leitura de progresso no desktop —
           esconde o texto duplicado da barra inferior só nesse modo (mobile mantém,
           não tem contador flutuante lá). */
        .edx-sticky .edx-nav__now { display: none; }
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 4: Verificação manual no preview (desktop ≥980px)**

- Painel 01: só a seta "próxima" aparece (sem "anterior").
- Painéis 02–15: as duas setas aparecem, clique avança/volta 1 painel.
- Painel 16: só a seta "anterior" aparece (seta "próxima" não renderiza — o slot fica
  vazio até a Task 3 colocar o CTA ali).
- Contador mostra "01 / 16 — <tema>" e atualiza a cada passo (wheel, teclado, seta ou
  chip).
- Tirar um screenshot do painel 04 pra registrar o antes/depois.

- [ ] **Step 5: Commit**

```bash
git add src/pages/institutional/Edicoes.jsx
git commit -m "feat(edicoes): setas Prev/Next + contador flutuante como controle principal"
```

---

## Task 3: CTA final pro Sweet Awards (desktop + mobile) + prop `navigate`

**Files:**
- Modify: `src/pages/institutional/Edicoes.jsx:186` (assinatura do componente), JSX do
  stage horizontal (Task 2) e do stack mobile.

**Interfaces:**
- Consumes: prop `navigate` — já enviado por `App.jsx:112`
  (`<EdicoesPage navigate={navigate} />`), hoje ignorado por `EdicoesPage()`.
- Produces: nenhuma interface nova consumida por outra task.

- [ ] **Step 1: Aceitar o prop `navigate` e criar o helper `go`**

Em `Edicoes.jsx:186`, trocar:

```js
export function EdicoesPage() {
```

por:

```js
export function EdicoesPage({ navigate }) {
```

Logo depois da declaração de `pick` (Task 1 Step 3), adicionar o helper (mesmo padrão
de `Curiosidades.jsx:91`/`Home.jsx:156`/`Contato.jsx:37`/`HistoricoAwards.jsx:254`):

```js
  const go = React.useCallback((path) => (e) => {
    e.preventDefault()
    navigate(path)
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [navigate])
```

- [ ] **Step 2: CTA no painel final do modo desktop**

Em `Edicoes.jsx`, no bloco de setas da Task 2, trocar a seta "próxima" condicional por:

```jsx
              {active < TOTAL - 1 ? (
                <button
                  type="button"
                  className="edx-arrow edx-arrow--next"
                  onClick={() => setActive((a) => Math.min(a + 1, TOTAL - 1))}
                  aria-label="Próxima edição"
                >
                  <I.chevronRight width={22} height={22} />
                </button>
              ) : (
                <a
                  href="/sweet-awards"
                  className="edx-arrow edx-arrow--cta"
                  onClick={go('/sweet-awards')}
                >
                  Ver os vencedores no Sweet Awards
                </a>
              )}
```

- [ ] **Step 3: CTA no fim do stack mobile**

No branch mobile do JSX (`Edicoes.jsx`, `<section className="edx-stack">`), depois de
`<div className="edx-stack__list">...</div>`, adicionar:

```jsx
          <div className="edx-stack__cta">
            <a href="/sweet-awards" className="edx-arrow edx-arrow--cta" onClick={go('/sweet-awards')}>
              Ver os vencedores no Sweet Awards
            </a>
          </div>
```

- [ ] **Step 4: CSS do CTA**

Adicionar ao `<style>`, depois de `.edx-arrow--next { ... }`:

```css
        .edx-arrow--cta { width: auto; height: auto; padding: 14px 22px; border-radius: 999px; background: var(--page-accent, var(--cyan)); color: var(--ink); font-family: var(--font-sans); font-weight: 700; font-size: 14px; text-decoration: none; white-space: nowrap; }
        .edx-arrow--cta:hover { background: var(--cyan-deep); color: var(--cream); transform: translateY(-50%) scale(1.03); }

        .edx-stack__cta { display: flex; justify-content: center; padding: 0 var(--page-gutter) var(--section-y, clamp(56px, 12vw, 96px)); }
        .edx-stack__cta .edx-arrow--cta { position: static; transform: none; }
        .edx-stack__cta .edx-arrow--cta:hover { transform: scale(1.03); }
```

(`.edx-stack__cta .edx-arrow--cta` zera `position`/`transform` herdados de `.edx-arrow`
porque no mobile o CTA fica no fluxo normal do documento, não flutuando sobre o painel.)

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 6: Verificação manual no preview**

- Desktop: no painel 16, clicar no CTA "Ver os vencedores no Sweet Awards" → navega pra
  `/sweet-awards` (rota `historico-awards`) e a página abre no topo.
- Mobile (<980px): rolar até o fim do stack, CTA aparece depois do painel 16, clique
  navega igual.
- Nenhuma outra rota/página foi tocada.

- [ ] **Step 7: Commit**

```bash
git add src/pages/institutional/Edicoes.jsx
git commit -m "feat(edicoes): CTA final linka pro Sweet Awards (desktop + mobile)"
```

---

## Task 4: Chips compactos + acessibilidade final + verificação completa

**Files:**
- Modify: `src/pages/institutional/Edicoes.jsx` (`<style>` — regras `.edx-nav__item`,
  `.edx-nav__n`, `.edx-nav__y`)

**Interfaces:** nenhuma — só polish de CSS + passo de verificação, não introduz nada
consumido por código futuro.

- [ ] **Step 1: Compactar os chips (desktop secundário + mobile)**

Em `Edicoes.jsx`, trocar as regras atuais (perto da linha 344-348):

```css
        .edx-nav__item { display: inline-flex; flex-direction: column; align-items: center; gap: 1px; min-width: 48px; padding: 7px 9px; border: 1px solid var(--paper-line); border-radius: 10px; background: var(--cream-card); color: var(--ink-soft); cursor: pointer; transition: border-color .16s, color .16s, background .16s; }
        .edx-nav__item:hover { color: var(--ink); border-color: var(--page-accent, var(--cyan)); }
        .edx-nav__item.is-active { background: var(--page-accent, var(--cyan)); border-color: var(--page-accent, var(--cyan)); color: var(--ink); }
        .edx-nav__n { font-family: var(--font-display); font-weight: 900; font-size: 13px; line-height: 1; }
        .edx-nav__y { font-size: 10px; font-weight: 700; opacity: .8; white-space: nowrap; }
```

por:

```css
        .edx-nav__item { display: inline-flex; flex-direction: column; align-items: center; gap: 1px; min-width: 38px; padding: 5px 7px; border: 1px solid var(--paper-line); border-radius: 8px; background: var(--cream-card); color: var(--ink-soft); cursor: pointer; transition: border-color .16s, color .16s, background .16s; }
        .edx-nav__item:hover { color: var(--ink); border-color: var(--page-accent, var(--cyan)); }
        .edx-nav__item.is-active { background: var(--page-accent, var(--cyan)); border-color: var(--page-accent, var(--cyan)); color: var(--ink); }
        .edx-nav__n { font-family: var(--font-display); font-weight: 900; font-size: 11px; line-height: 1; }
        .edx-nav__y { font-size: 9px; font-weight: 700; opacity: .8; white-space: nowrap; }
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 3: Rodar o teste de responsividade do projeto**

Run: `npm run test:responsive`
Expected: sem overflow horizontal em nenhum viewport (script já existente, cobre a Home
e páginas institucionais).

- [ ] **Step 4: Verificação manual completa (matriz final)**

No preview:
- Desktop ≥980px: wheel/teclado/setas/chips/CTA — todo o fluxo da Task 1-3 revalidado
  junto (não só isolado).
- Resize <980px: stack vertical, chips compactos, CTA no fim — sem regressão.
- Emular `prefers-reduced-motion: reduce`: cai no stack vertical mesmo em desktop largo
  (comportamento já existente, `mqMotion` — só confirmar que não quebrou).
- Screenshot final do painel 01 (desktop) e do stack mobile pra registro.

- [ ] **Step 5: Commit**

```bash
git add src/pages/institutional/Edicoes.jsx
git commit -m "style(edicoes): chips compactos + verificação final da apresentação"
```

---

## Fora de escopo (YAGNI — não implementar nesta plan)

- Dividir edições por fase/era (proibido, CLAUDE.md §11).
- Peek do painel vizinho (descartado no brainstorm).
- Swipe/touch-drag customizado no desktop (telas touch ≥980px).
- Qualquer mudança em `editions.js`, `sweetCoffeeHistory.js`, `editionAssets.js`,
  `editionGallery.js`, `PhotoRotator.jsx`.
