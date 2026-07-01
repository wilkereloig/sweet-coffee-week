# HeroBase — Design (Etapa 1 da refatoração institucional)

**Data:** 2026-07-01
**Branch:** dev/site-completo
**Escopo:** SÓ HeroBase. Unificação de tokens é etapa futura (spec própria).
**Objetivo:** um único componente/CSS de hero para as 6 páginas institucionais, de modo
que "ajuste global de hero" passe a valer em todas — hoje não vale (ver causa raiz).

---

## 1. Contexto e causa raiz

Auditoria confirmou: cada página institucional tem sua própria hero, com classe própria
e CSS em bloco `<style>` inline. Uma regra global em `src/styles.css:538-559` tenta
unificar 6 heroes, mas mira o seletor `.ed-hero` — que **nenhuma página usa** (a Edições
é `.edx-hero`). Resultado:

- Regra global cobre 5: `.cur-hero`, `.participar-hero`, `.apoiar-hero`, `.contato-hero`, `.hist-hero`.
- **Edições (`.edx-hero`) fica fora** → auto-estilizada inline.
- Home (`.swc-hero`) fica fora **por design** (chocolate, page-mãe, §9 CLAUDE.md).

Além disso a regra global usa 4× `!important` (background/padding/texto), o que sobrescreve
os comentários "banda chocolate" de Participar/Apoiar/Contato — hoje essas heroes
renderizam **acento** (`var(--page-accent)`), não chocolate.

## 2. Escopo (decidido)

- Etapa 1 = **só HeroBase**. Tokens = etapa separada.
- HeroBase cobre **6 páginas**: Edições, Curiosidades, Participar, Apoiar, Contato,
  Histórico Awards.
- **Home fora** — exceção documentada (§9: não tocar sem pedido). Mantém `.swc-hero`.
- Abordagem escolhida: **componente React com slots** (mata duplicação de estilo E de
  estrutura). Não é CSS-only nem híbrido.

## 3. Contrato do componente

`src/components/HeroBase.jsx` — presentational, sem estado.

```jsx
<HeroBase
  variant="accent"   // 'accent' (fundo = --page-accent, texto --ink) | 'dark' (chocolate, texto creme)
  title={<>…</>}      // ReactNode rico (aceita highlight via <HeroHL>)
  subtitle={<>…</>}   // ReactNode | ReactNode[] (1 ou 2 parágrafos)
  actions={<>…</>}    // opcional: botões/links
  aside={<form/>}     // opcional: presença ATIVA layout 2 colunas; empilha no mobile
  seal={false}        // opcional: selo decorativo girando
>
  {children}          // opcional: conteúdo extra na coluna de copy (ex.: participar-shots)
</HeroBase>
```

Helper de highlight exportado junto: `HeroHL` = `<span className="hero__hl" style={{'--hl': cor}}>`.
Unifica as 6 classes atuais (`cur-hl`, `participar-hl`, `apoiar-hl`, `contato-hl`, `edx-hl`,
`hist-hl`) numa só (`hero__hl`).

### Lógica de layout (dona do componente)
- sem `aside` → 1 coluna, copy com max-width.
- com `aside` → grid 2 colunas (copy | aside) no desktop; empilha no mobile.
- sempre: zona-segurança de topo (`--hero-content-start`), `min-height` clamp, container
  `.wrap` (max-width 1280 / clamp(20px,4vw,56px) — igual à Home, §4), tipografia H1/lead,
  responsivo.
- `variant='accent'`: `background: var(--page-accent)`, `color: var(--ink)`.
- `variant='dark'`: `background: #2B1810` (chocolate), texto creme.

### Mapa de uso (preserva o visual atual)

| Página | variant | actions | aside | seal | children |
|---|---|---|---|---|---|
| Curiosidades | accent | — | — | — | — |
| Contato | accent | — | — | — | — |
| Histórico Awards | accent | 1 botão | — | — | — |
| Participar | accent | 1 link | form | ✔ | participar-shots |
| Apoiar | accent | 2 botões | form | ✔ | — |
| Edições | dark | — | — | — | hint (role p/ percorrer) |

## 4. CSS

Novo arquivo `src/styles/hero.css`, importado em `src/main.jsx` (após `styles.css`).
Dono de: `.hero`, `.hero--dark`, `.hero--split`, `.hero__inner`, `.hero__copy`,
`.hero__aside`, `.hero__title`, `.hero__lead`, `.hero__actions`, `.hero__hl`, `.hero__seal`
+ media queries.

**Substitui:**
- a regra global `src/styles.css:538-559` (incl. `.ed-hero` morto e os 4 `!important`);
- os blocos de hero inline nas 6 páginas (`edx-hero*`, `cur-hero*`, `participar-hero*`,
  `apoiar-hero*`, `contato-hero*`, `hist-hero*`).

**Não substitui (fica na página):** estilo dos formulários (`participar-form*`,
`apoiar-form*`) — é conteúdo do slot `aside`, não da hero. Estilo do `participar-shots`
idem (conteúdo de `children`).

Ganho: alterar qualquer aspecto das heroes = editar `hero.css`/`HeroBase.jsx` **uma vez**.

## 5. Migração (incremental, uma página por vez)

Verificar no preview (desktop + mobile) antes de seguir para a próxima:

1. **Curiosidades** — valida shell accent 1-coluna.
2. **Contato** — igual, sem extras.
3. **Histórico Awards** — + `actions`.
4. **Edições** — `variant='dark'`; a hero adota `.wrap` (alinha margem à Home, §4). A
   apresentação horizontal abaixo (`edx-stage`) mantém `.edx-wrap` — só a hero migra.
5. **Participar** — + `aside` (form) + `seal` + `children` (shots).
6. **Apoiar** — + `aside` (form) + 2 `actions` + `seal`.
7. **Limpeza** — remover regra global `styles.css:538-559` e o CSS de hero morto das 6
   páginas.

## 6. Verificação

- Cada página revisada no preview (desktop + mobile), comparando com o estado atual.
- **Teste de aceitação:** alterar 1 token/valor de hero (ex.: `padding-top` ou
  `min-height`) em `hero.css` e confirmar que muda nas **6** páginas simultaneamente.
- `npm run build` verde (em `dist_check --emptyOutDir`).

## 7. Riscos e decisões

- **Chocolate vs acento (Participar/Apoiar/Contato):** comentários dizem chocolate; hoje
  renderiza acento (global `!important` vence). Decisão: **manter acento** (visual atual).
  Trocar é só mudar `variant` na página — não bloqueia esta etapa.
- **Home:** intocada. Documentar como exceção no CLAUDE.md §4.1 / §9.
- **Formulários:** lógica e CSS de form não são reescritos; entram via slot `aside`.
- **Edições `.edx-wrap`:** compartilhado com o stage; só a hero passa a `.wrap`.

## 8. Fora de escopo (etapas futuras)

- Unificação de tokens (styles.css v1 vs swc-redesign.css v2).
- Componentes `CTASection`, `SectionHeader`, `ValueCard`/`CardsGrid`, `useHonestFormSubmit`,
  `RankedList`, `PageSection`.
- Remoção de dead code (`.site-sidebar`, `.combo-rail`).
- Tokenização de breakpoints.
