# Home mobile — capa imersiva + ritmo de celular

**Data:** 2026-07-10 · **Branch:** dev/site-completo · **Escopo:** experiência mobile
da Home/O Festival (página-mãe). Só celular (`≤600px`). Desktop **intocado** (§9 do
CLAUDE.md). Sem novo componente JS — hero com markup extra escondido no desktop + passe
de CSS mobile.

## 1. Objetivo

Home no celular pensada como produto mobile, não adaptação responsiva empilhada. Três
dores confirmadas pelo Wilke:

1. **Hero fraca no mobile** — pensada pra tela larga; centralizada, texto longo, sem
   impacto de abertura.
2. **Seções só empilham** — mesmo conteúdo mais estreito, sem ritmo/hierarquia própria.
3. **Longa/cansativa de rolar** — resolver **só com ritmo**, sem cortar nem reordenar
   seções (decisão travada).

Não incomoda: componentes pesados (flipbook, colagem, tilt) — mantidos.

## 2. Decisões travadas (aprovadas)

- **Hero = capa imersiva ancorada:** foto quase cheia, título grande ancorado embaixo
  (§4), scrim só na base, 1 parágrafo curto, botão **"Quero participar"** + dica de
  rolar (chevron). Alinhamento à esquerda no mobile.
- **Comprimento:** nada some, nada reordena. Cansaço morre com respiro + hierarquia +
  reveal progressivo que já existe. **Sem segunda navbar de seções** (a tab bar mobile
  já navega).
- **Botão da hero = "Quero participar"** (ação-mãe, aparece de cara). A repetição no
  split logo abaixo é reforço — padrão de landing, aceito.
- **Breakpoint mobile do tratamento = `≤600px`.** Entre 601–900 fica o comportamento
  atual. Desktop idêntico.
- Desktop da Home **não muda** — markup novo da hero (botão + chevron) é
  `display:none` acima de 600px.

## 3. Hero — capa imersiva ancorada (`≤600px`)

Estrutura atual (`.swc-hero`): foto rotativa full-bleed (`opacity .5`), overlay
`::after` com gradiente escuro em toda a altura, `.swc-hero__copy` centralizado
(`justify-content:center`, `text-align:center`), `<h1>` + 2 `<p>`. Sem CTA no markup.

Mudanças **só no mobile** (envolver em `@media (max-width:600px)`; desktop mantém tudo):

- **Foto:** `.swc-hero__rotator opacity: .5 → ~.85`. Foto manda.
- **Scrim:** o `::after` (gradiente escuro cheio) vira **scrim só na base** no mobile —
  ex.: `linear-gradient(to bottom, rgba(43,24,16,.55) 0%, transparent 22%, transparent 46%, rgba(43,24,16,.86) 100%)`.
  Topo mantém leve escurecida atrás do header (logo/login legíveis); base escura ancora
  o texto.
- **Ancoragem:** `.swc-hero__copy` `justify-content: center → flex-end`;
  `align-items: center → flex-start`; `text-align` de tudo dentro da hero vira `left` no
  mobile (hoje há regra `.hm .swc-hero, .hm .swc-hero * { text-align: center }` — precisa
  override mobile `text-align:left`).
- **Altura:** hero mobile usa **`100dvh`** (não `vh`) pra não pular com a barra do
  navegador. `min-height` mobile = `100dvh`.
- **Clearances:** conteúdo ancorado respeita as duas barras:
  - topo: já coberto por `padding-top` grande; garantir ≥ `var(--header-safe-offset)`.
  - base: `padding-bottom` da `.swc-hero__copy` no mobile inclui a **tab bar**
    (`calc(var(--tabbar-h) + env(safe-area-inset-bottom) + respiro)`), senão a pill/tab
    bar cobre o botão/título.
- **Texto:** só o **1º `<p>`** no mobile. O 2º `<p>` recebe `display:none` em `≤600px`.
- **Título:** `text-align:left`, escala revista pra caber em 360px sem quebra feia
  (ajustar o `clamp` mobile já existente em `@media (max-width:420px)`).
- **Markup novo (adicionar ao JSX, escondido no desktop):** dentro de `.swc-hero__copy`,
  após `.swc-hero__text`:
  - `<a className="swc-hero__cta" href="#/participar" onClick={go('/participar')}>Quero participar <I.arrow /></a>`
  - `<span className="swc-hero__scrollcue" aria-hidden="true">` com chevron (SVG inline
    ou `I` existente) + micro-animação de bounce vertical.
  - Ambos: CSS base `display:none`; `@media (max-width:600px) { display:flex/inline-flex }`.
    Desktop não renderiza visualmente → §9 preservada.
  - `prefers-reduced-motion`: chevron sem animação.

## 4. Ritmo e hierarquia mobile (`≤600px`, não corta/reordena)

- **Ritmo de banda:** `--section-y` (hoje `clamp(72px,10vw,140px)`) fica frouxo no touch.
  No mobile, reduzir o padding vertical de `.section` pra `clamp(56px, 14vw, 88px)` (via
  override mobile — **não** mexer no token global, que o desktop usa). Cada banda vira um
  "capítulo" com batida mais curta.
- **Transição de cor entre bandas:** as seções já alternam
  (chocolate `#381610` → creme → marrom `#5e3018` → creme → preto `#000`). Manter; o
  ritmo afinado já faz cada troca ler como novo beat. Sem divisórias novas.
- **Tipografia de seção:** revisar os `clamp` de `h2` (`--fs-display-md`) **só onde**
  estoura/quebra feio em 360px. Leads com `line-height:1.5` e largura de leitura
  confortável. Não renumerar clamps já calibrados — ajustar outliers.
- **Grids que empilham:** conferir que Números (2×2 → 1 col ≤420), Steps (1 col ≤520),
  split-CTA (1 col ≤720) não pareçam só "esticados": espaçamento/tamanho interno
  proporcional ao mobile, não herança direta do desktop.

## 5. Componentes touch (mantidos, domados)

- **Tilt 3D** (`.t-tilt`): pointer-only, achata em `prefers-reduced-motion`. No touch não
  atrapalha — manter.
- **Flipbook / colagem+coração / count-up:** mantidos. Conferir no preview: sem overflow
  lateral (o `.hm { overflow-x: clip }` já protege) e áreas de toque ≥44px.
- **Zero corte, zero reorder.** Conteúdo integral.

## 6. Arquivos

- `src/pages/institutional/Home.jsx` — markup novo na hero (botão CTA + scroll cue,
  escondidos no desktop) + bloco CSS mobile (`@media (max-width:600px)`) no `<style>` já
  existente da página. Nada de arquivo novo.
- Nenhum outro arquivo. Tokens globais (`--tabbar-h`, `--header-safe-offset`,
  `--hm-gutter`) reusados, **não** alterados.

## 7. Fora de escopo

- Desktop e faixa 601–900px (só mobile ≤600).
- Cortar/reordenar/esconder seções.
- Segunda navbar de seções / âncoras clicáveis (tab bar mobile já cobre navegação).
- Redesign de cards (pendência separada).
- Demais páginas institucionais no mobile (pendência separada).

## 8. Critérios de aceite

1. `≤600px`: hero é foto quase cheia, título ancorado embaixo à esquerda, scrim só na
   base, 1 parágrafo, botão "Quero participar" + chevron de rolar. Nada colado no header
   nem coberto pela tab bar.
2. Desktop (>900px) **pixel-idêntico** ao de antes: botão/chevron da hero não aparecem, 2
   parágrafos presentes, hero centralizada.
3. Scroll no mobile tem ritmo de capítulos (padding de seção afinado); nenhuma seção
   removida ou reordenada.
4. Sem overflow lateral em 360/390/430px. Áreas de toque ≥44px.
5. `prefers-reduced-motion`: chevron e demais animações estáticos.
6. `npm run build` passa.
