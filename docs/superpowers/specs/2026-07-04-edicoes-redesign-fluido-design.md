# Edições — apresentação fluida, intuitiva e guiada (Design)

**Data:** 2026-07-04
**Branch:** dev/site-completo
**Escopo:** SÓ o motor de interação e a navegação de `src/pages/institutional/Edicoes.jsx`
(modo desktop horizontal). Dados, textos, fotos/logos e o modo mobile/reduced-motion não
mudam de mecanismo.
**Objetivo:** manter o conceito já aprovado (CLAUDE.md §10 — apresentação horizontal,
scroll vertical controla avanço, sequência direta 1→16, sem stickers/grid comum) mas
resolver 3 atritos apontados pelo usuário na versão atual: scroll "solto" (sem encaixe),
navegação por chips difícil de escanear, falta de sensação de progresso/direção.

---

## 1. Contexto e problema

Versão atual (commits `1f190b8`…`15655cd`, 30/06–03/07): apresentação horizontal
scroll-driven — parent de `16 × 135vh` (~2160vh), `position: sticky` interno, um listener
de `scroll` (rAF) calcula `progress = scrollPassed / scrollDist` e aplica
`translateX(-progress × maxX)` a cada frame. Navegação = barra inferior com 16 chips
(número + ano) + texto "0X de 16 — tema".

Atritos confirmados pelo usuário:
1. **Scroll pesado/desconectado** — a velocidade do gesto físico vira 1:1 velocidade
   visual, sem lugar fixo pra descansar; dá pra parar no meio de dois painéis ou pular um
   inteiro num scroll rápido.
2. **Chips difíceis de escanear** — 16 botões pequenos numa fita horizontal, sem
   prev/next em destaque.
3. **Falta noção de progresso/direção** — nenhum sinal forte de "dá pra continuar" além
   da barra de progresso fina de 3px.

Fora de escopo desta rodada (perguntado e descartado): dividir por fases/eras (proibido
por CLAUDE.md §11 — sequência direta 1→16), peek do painel vizinho (usuário preferiu
manter painel cheio 100vw), repensar o conceito do zero (usuário confirmou manter scroll
vertical → avanço horizontal).

## 2. Decisões (resumo das perguntas respondidas)

| Decisão | Escolha |
|---|---|
| Encaixe do scroll | Snap total — cada "passo" de scroll = 1 edição inteira, nunca para no meio |
| Navegação primária | Setas Prev/Next (+ teclado) — chips continuam, mas compactos/secundários |
| Peek do painel vizinho | Não — painel continua 100vw cheio |
| Fim da 16ª edição | CTA "Ver os vencedores no Sweet Awards" → `/sweet-awards` (substitui a seta "próxima" no último painel) |
| Mobile / reduced-motion | Mecanismo intocado (stack vertical + scroll nativo já entrega "guiado") |

## 3. Arquitetura / arquivos

- **Novo:** `src/hooks/useSteppedPresentation.js` — isola o motor de passos discretos
  (estado, wheel, teclado, engajamento via `IntersectionObserver`, edge-release). Mesmo
  padrão de isolamento de `useRevealOnScroll.js` já existente; `Edicoes.jsx` está com 436
  linhas e a lógica de scroll já é a parte mais densa do arquivo.
- **Editado:** `src/pages/institutional/Edicoes.jsx` — passa a consumir o hook, ganha
  JSX novo (setas, contador flutuante, CTA final) e ajusta o bloco `<style>` (alturas do
  stage/sticky, classes novas). `EdicoesPage` passa a aceitar o prop `navigate` que
  `App.jsx:112` já envia (`<EdicoesPage navigate={navigate} />`) e hoje é ignorado.
- **Intocado:** `editions.js`, `sweetCoffeeHistory.js`, `editionAssets.js`,
  `editionGallery.js`, `PhotoRotator.jsx` — nenhum dado ou componente de mídia muda.

## 4. Motor de interação (`useSteppedPresentation`)

Interface do hook:

```js
// src/hooks/useSteppedPresentation.js
function useSteppedPresentation({ total, stageRef, enabled }) {
  // retorna:
  //   active        — índice atual (0..total-1)
  //   isAnimating   — true durante a transição (trava input extra)
  //   goTo(i)       — pulo direto (usado pelos chips e pelo CTA)
  //   step(delta)   — ±1 (usado pelas setas e pelo teclado)
}
```

Comportamento:
- **Engajamento**: um único `IntersectionObserver` no `stageRef` (threshold que
  considera "engajado" quando o stage ocupa a maior parte do viewport) substitui os DOIS
  mecanismos separados de hoje (rAF pro desktop + IO pro mobile) — mobile passa a usar o
  mesmo hook só pra saber "qual painel está visível" (sem wheel-jack, já que `enabled`
  vem `false` fora do modo horizontal).
- **Wheel**: engajado + `deltaY > 0` (ou `< 0`) + não está no limite naquela direção →
  `preventDefault()` + `step(±1)`; no limite (painel 0 subindo / painel 15 descendo) →
  não intercepta, scroll nativo segue pro hero/rodapé.
- **Cooldown**: `isAnimating` trava novos passos por `560ms` (mesma duração da transição
  CSS — ver §6 — evita estourar vários passos numa scrollada contínua de trackpad).
- **Teclado**: `ArrowLeft/ArrowRight` chamam `step(±1)`, `Home/End` chamam
  `goTo(0)/goTo(total-1)` — só quando engajado.
- **Wrapper (`.edx-stage`)**: cai de `16 × 135vh` (~2160vh) para `100vh + 30vh` de folga
  fixa. Como cada evento de wheel consumido é cancelado, a posição real de scroll da
  página quase não avança enquanto o usuário passeia pelas 16 edições; a folga de 30vh
  só existe pra o `position: sticky` ter onde segurar durante a interação.
- **`pick(i)` dos chips / CTA**: chama `goTo(i)` direto — sem `window.scrollTo`
  proporcional (o cálculo atual em `Edicoes.jsx:252-264` deixa de existir).

## 5. Navegação / UI

- **Setas Prev/Next**: botões circulares flutuantes ancorados nas bordas esquerda/direita
  do stage, centralizados na vertical, fundo translúcido escuro + ícones
  `I.chevronLeft`/`I.chevronRight` (já existem em `components/icons.jsx` — sem SVG novo).
  Só renderizam no modo horizontal. `aria-label` "Edição anterior" / "Próxima edição".
  - Painel 0 → seta "anterior" não renderiza.
  - Painel 15 (Lovers) → seta "próxima" dá lugar ao CTA (§6).
- **Contador flutuante**: "04 / 16 — Tema da edição" próximo às setas, `aria-live="polite"`
  — substitui o `.edx-nav__now` de hoje (evita duas leituras de progresso na tela).
- **Barra inferior (`.edx-nav`)**: só a linha fina de progresso (já existe, `.edx-progress`)
  + chips compactos (menores, gap mais apertado) pra pular direto — vira nav secundária,
  não compete com as setas como controle principal.

## 6. Transição visual

`transform: translateX(-i * 100%)` no `.edx-track`, com
`transition: transform var(--motion-slow) var(--ease-spring-soft)` (560ms — token já
existe em `layout-tokens.css`, mesmo valor do cooldown em JS, seguindo o mesmo
acoplamento CSS↔JS já usado em `PressFlipbook`/`motion-system.css:209-210`). Sem
biblioteca nova.

## 7. CTA final (painel 16 — Lovers 2026.1)

Substitui a seta "próxima" apenas no último painel: botão "Ver os vencedores no Sweet
Awards" → `navigate('/sweet-awards')`, mesmo padrão `go(path)` já usado em
`Curiosidades.jsx:91`, `Home.jsx:156`, `Contato.jsx:37`, `HistoricoAwards.jsx:254`
(`e.preventDefault(); navigate(path); window.scrollTo(0,0)`). Aparece tanto no modo
horizontal (desktop) quanto no painel final do stack mobile.

## 8. Mobile (<980px) e `prefers-reduced-motion`

Mecanismo de scroll **intocado** — stack vertical + scroll nativo da página (já é
"guiado" por natureza: não tem onde se perder). Only muda:
- Chips herdam o CSS compacto do §5 (consistência visual com desktop).
- Sem setas — scroll nativo já cumpre o papel de prev/next.
- CTA do Sweet Awards aparece no painel final do stack, igual ao desktop.

`prefers-reduced-motion: reduce` já cai no modo stack **antes** de qualquer parte do
motor novo montar (`mqMotion` em `Edicoes.jsx:200-206`, mantido) — nada adicional
necessário.

## 9. Acessibilidade

- `.edx-stage`: `role="region"` + `aria-roledescription="carousel"` +
  `aria-label="Apresentação das edições"`.
- Slides mantêm `aria-roledescription="slide"` (já existe, `Edicoes.jsx:137`).
- Setas: `<button>` reais, `aria-label` descritivo, focáveis/tabuláveis independente do
  engajamento do wheel.
- Contador: `aria-live="polite"` (migra do `.edx-nav__now` atual).

## 10. Testes / validação

- `npm run build` sem erros.
- Preview manual — desktop ≥980px: wheel avança/volta 1 painel por vez sem overshoot;
  setas somem corretamente nos painéis 0 e 15; CTA no painel 15 navega pra
  `/sweet-awards`; chips pulam direto; teclado (←/→/Home/End) funciona quando engajado;
  soltar o scroll no painel 0 sobe pro hero e no painel 15 desce pro rodapé sem travar.
- Preview manual — <980px (resize) e emulação `prefers-reduced-motion: reduce`: stack
  vertical intocado, chips compactos, CTA presente no fim.
- Sem dependência nova.

## 11. Fora de escopo (YAGNI)

- Dividir edições por fase/era — proibido por CLAUDE.md §11.
- Peek do painel vizinho — descartado nas perguntas (§2).
- Swipe/touch-drag customizado no desktop (telas touch ≥980px, ex. Surface) — fora desta
  rodada; se vier a ser pedido, é spec separada.
- Qualquer mudança em dados/fotos/logos das edições.
