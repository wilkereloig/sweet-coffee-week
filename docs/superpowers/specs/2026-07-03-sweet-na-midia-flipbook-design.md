# Sweet na Mídia — Flipbook editorial (Design)

**Data:** 2026-07-03
**Branch:** dev/site-completo
**Escopo:** SÓ a seção `#sweet-na-midia` da Home (`src/pages/institutional/Home.jsx`).
**Objetivo:** trocar o grid de 6 cards + lista escondida "ver mais" por uma composição
editorial "capa de jornal" — masthead, selos como dateline, spread principal que vira de
página (flip 3D) e caixa lateral fixa com as frases de reforço.

---

## 1. Contexto e problema

A seção hoje (`Home.jsx:333-387`) tem 4 blocos desconectados: eyebrow+título+texto, 4
selos em pílula, grid de 6 cards de imprensa, lista de 7~8 secundárias atrás de botão "ver
mais", caixa de 3 frases de reforço. Feedback do usuário: visual genérico (cards de caixa
branca sem personalidade) e hierarquia fraca (blocos competem, nenhum foco claro).

Direção aprovada em brainstorm com companion visual (3 opções testadas: página estática,
carrossel de páginas, mural de recortes) — escolhida **B: carrossel de páginas**, com
composição completa validada (masthead → dateline → spread+sidebar).

## 2. Correção de contagem (achado do brainstorm)

`mediaCards` (`Home.jsx:57-73`) tem **14 itens reais**, não 13 como estimado na conversa:
- **6 featured** (`mediaFeatured`): Agora RN'24, NOVO Notícias'24, Agência Sebrae'21,
  Diário do RN'26, 96 FM'26, UFRN'22 — cada um com `description` completa.
- **8 extra** (`mediaExtra`): 98 FM Natal'24, Tribuna do Norte'26, Conversa
  Gastronômica'24, Hilneth Correia'19, TV Ponta Negra'23, Thaisa Galvão'23, Blog do BG'25,
  O Potengi'25 — só título/outlet/data/link, sem `description`.

Nenhum dado muda. `mediaCards`/`mediaFeatured`/`mediaExtra` continuam existindo tal como
estão — só ganham um agrupamento derivado por cima.

## 3. Agrupamento em páginas

6 páginas = 6 featured (1 manchete/lead por página, ordem preservada). As 8 extras
(notas/briefs) são distribuídas por uma função pura — não hardcoded por índice manual, pra
não precisar re-mapear se `mediaCards` crescer:

```js
function buildMediaPages(leads, briefs) {
  const per = Math.floor(briefs.length / leads.length)   // 1
  const remainder = briefs.length % leads.length          // 2
  let cursor = 0
  return leads.map((lead, i) => {
    const count = per + (i < remainder ? 1 : 0)           // primeiras `remainder` páginas: +1
    const pageBriefs = briefs.slice(cursor, cursor + count)
    cursor += count
    return { lead, briefs: pageBriefs }
  })
}
const mediaPages = buildMediaPages(mediaFeatured, mediaExtra)
```

Resultado com os dados atuais: página 1 e 2 com 2 notas cada, páginas 3-6 com 1 nota cada
(soma 8). Fim do botão "ver mais" — as 14 matérias inteiras viram alcançáveis folheando.

## 4. Arquitetura / componentes

**Novo:** `src/components/PressFlipbook.jsx` — mesmo padrão de `PhotoRotator.jsx`
(componente presentational com estado próprio, importado pela Home).

```jsx
<PressFlipbook
  pages={mediaPages}        // [{ lead: {outlet,date,title,description,href,cta}, briefs: [{outlet,date,title,href,cta}] }]
  interval={7500}           // ms — autoplay (mais lento que os rotators de foto: tem texto pra ler)
  autoPlay
/>
```

Renderiza só o **spread que vira** (kicker + manchete + texto + link da lead; 1-2 notas
com rule vertical; setas + pontinhos + contador "Página X de 6" embaixo). Masthead,
dateline (selos) e caixa lateral (reforço) continuam **inline no `Home.jsx`**, como hoje —
são estáticos, não fazem parte do componente.

### Estado interno do `PressFlipbook`
- `page` (índice atual, 0-based)
- `paused` (boolean — vira `true` no primeiro clique manual em seta/ponto, nunca mais
  retoma autoplay sozinho)
- timer de autoplay (`setInterval`/`requestAnimationFrame`-based, limpo no unmount e
  quando `paused`)

## 5. Interação

- **Setas** (‹ ›): avança/volta 1 página, looping (página 6 → 1 e vice-versa).
- **Pontinhos**: clicáveis, pulam direto pra página N (`aria-current` no ativo).
- **Autoplay**: avança sozinho a cada 7,5s; **para de vez** no primeiro clique manual
  (seta ou ponto) — não repega sozinho depois. Comportamento consistente com o padrão de
  "controle nas mãos de quem interage" já usado no projeto.
- **Teclado**: `ArrowLeft`/`ArrowRight` navegam quando o componente (ou seu container) tem
  foco — `tabIndex={0}` no wrapper, `role="group"` + `aria-roledescription="carrossel"`.
- **Leitor de tela**: região com `aria-live="polite"` anunciando a mudança de página
  ("Página 2 de 6"); botões com `aria-label` descritivo ("Página anterior", "Próxima
  página", "Ir para página 3").
- **`prefers-reduced-motion`**: desativa autoplay por completo (mesmo padrão já usado em
  `CountUp`, `Home.jsx:113`) e troca o flip 3D por crossfade simples/instantâneo.

## 6. Transição visual — flip 3D

Página gira no eixo vertical (CSS 3D: `transform-style: preserve-3d`, `backface-visibility:
hidden`, `perspective` no container pai), simulando uma página de jornal virando. A quina
dobrada (`::after` com gradiente diagonal, visto no mockup) fica como detalhe estático do
card — reforça a leitura de "página física" sem depender da animação.

Fallback obrigatório sem 3D (`prefers-reduced-motion` ou navegador sem suporte a
`transform-style: preserve-3d`): crossfade simples (opacity), sem rotação.

## 7. Composição da seção (masthead → dateline → spread+sidebar)

```
┌─────────────────────────────────────────────────────────┐
│ Na mídia                                    (eyebrow)    │
│ Uma história que também ganhou espaço na imprensa. (h2)  │
│ Reportagens, entrevistas e registros acadêmicos... (p)   │
├───────────────────────────────────────────────────────────┤ ← rule dupla
│ 10 ANOS DE HISTÓRIA · 16 EDIÇÕES REALIZADAS · ...  (dateline, ex-selos)│
├───────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┐  ┌──────────────────┐ │
│ │ [PressFlipbook]                  │  │ O que a imprensa │ │
│ │ kicker · manchete · texto · link │  │ reforça (fixo,   │ │
│ │ ─── 1-2 notas ───                │  │ 3 frases, caixa  │ │
│ │ ‹  • • • • • •  ›                │  │ escura)          │ │
│ └─────────────────────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

Grid `1.7fr 1fr` (spread : sidebar) no desktop. Dateline: selos viram texto uppercase
separado por "·", `border-top: 2px` + `border-bottom: 1px` (convenção de dateline de
jornal, sem pílula/chip). Sidebar: fundo `--ink` (espresso), título em `--yellow`, cada
frase como "aspas" (Georgia serif), nota "Fixo — não vira com as páginas."

Cores só da paleta oficial (creme, marrom espresso, coral, amarelo) — sem cinza de jornal
de verdade (§3 CLAUDE.md).

## 8. Responsivo

Breakpoint 960 (padrão do projeto, §17 CLAUDE.md): grid `1.7fr 1fr` → 1 coluna, sidebar
desce pra baixo do spread. Dateline usa `flex-wrap: wrap` — quebra linha sozinho em telas
estreitas. Flip 3D mantido no mobile (toque nas setas/pontinhos funciona igual a clique);
sem swipe/drag nesta primeira versão (YAGNI — adicionar só se pedido).

## 9. Testes / validação

- Build local (`npm run build`) sem erros.
- `npm run test:responsive` — sem overflow horizontal na Home em nenhum viewport.
- Confirmação manual no preview: 6 páginas navegáveis via seta/ponto/teclado, autoplay
  para no primeiro clique, `prefers-reduced-motion` cai pro crossfade, contagem de
  matérias bate (14 = 6 leads + 8 briefs, nenhuma some).
- `AWARDS_ONLY_PUBLICATION` e Home fora desta seção — não tocados.

## 10. Fora de escopo (YAGNI)

- Swipe/drag touch — só clique/teclado por ora.
- Logos reais dos veículos de imprensa (não existem no acervo — se chegarem, é spec
  separada, como `editionAssets.js` já documenta pra logos de edição).
- Any outra seção da Home além de `#sweet-na-midia`.
