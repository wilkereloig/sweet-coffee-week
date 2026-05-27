# CODE_REVIEW_GRAPH — Sweet & Coffee Week

Mapa estrutural do projeto. Use como referência rápida antes de qualquer alteração — evita reler o projeto inteiro a cada tarefa.

---

## 1. Visão geral

- **Stack:** Vite + React (JSX), CSS vanilla, sem TypeScript.
- **Tipo:** SPA estática (landing + páginas internas), deploy Vercel.
- **Sistema de rotas:** hash router customizado em `src/router.js` (`useRoute`).
- **Página principal atual:** landing comemorativa da edição **Sweet & Coffee Week Lovers** (10 anos do festival).
- **Fontes:** Adobe Typekit (`sofia-pro-comp`) + Google Fonts (Instrument Serif, DM Sans, Caveat, Caprasimo, JetBrains Mono).
- **Dev server:** `npm run dev` → `localhost:5173`.

---

## 2. Estrutura principal de arquivos

| Arquivo | Função |
|---|---|
| `src/main.jsx` | Entry point Vite. Monta `<App />` no DOM, importa `styles.css`. |
| `src/App.jsx` | Root component. Roteamento via `useRoute`, renderiza `Nav` + página atual. |
| `src/router.js` | Hash router customizado. Hook `useRoute()` retorna rota corrente. |
| `src/styles.css` | Estilos globais. Tokens CSS, identidades visuais (Institucional + Lovers), animações `.reveal`, hover microinterações. |
| `src/components/nav.jsx` | Menu/header (desktop + mobile). |
| `src/components/icons.jsx` | Ícones SVG + `LoversWordmark`. |
| `src/pages/lovers/Hub.jsx` | **Landing principal Lovers** (atual fonte de verdade da página). |
| `src/pages/lovers/Combos.jsx` | Página interna combos (bloqueada até dados reais). |
| `src/pages/lovers/Mapa.jsx` | Página interna mapa (bloqueada até dados reais). |
| `src/pages/lovers/Awards.jsx` | Página interna premiação (bloqueada até dados reais). |
| `src/pages/lovers/ComboDetail.jsx` | Detalhe de combo individual (bloqueada até dados reais). |
| `src/data/participants.js` | Dados reais dos participantes (preencher quando confirmado). |
| `src/data/combos.js` | Dados reais dos combos (preencher quando confirmado). |

---

## 3. Página Lovers — `src/pages/lovers/Hub.jsx`

Landing principal da edição. Seções renderizadas em `LoversPage()`, nesta ordem:

1. **Hero** — lockup "Sweet & Coffee Lovers" + texto da edição + 3 tiles (10 anos / 15 temas / 4 a 14 jun).
2. **Sobre** — manifesto da edição comemorativa, 4 blocos (Revisitar / Recriar / Celebrar / Provar).
3. **ComoFunciona** — 4 passos numerados (Escolha tema → Combo → Memória → Rota).
4. **Participantes** — placeholder/em breve. Lista completa virá via `participants.js`.
5. **Combos** — manifesto + chips de temas históricos + box "em breve".
6. **Mapa** — placeholder mapa + rota (em breve).
7. **Awards** — explicação do Sweet Awards + categorias (em breve).
8. **FinalCTA** — chamada final + botões + footnote.

---

## 4. Estados de pré-lançamento

Feature flags declaradas no topo de `Hub.jsx`:

```js
const hasParticipantsData = false
const hasCombosData       = false
const hasMapData          = false
const hasVotingData       = false
```

Enquanto `false`, cada seção exibe estado **"em breve"** com placeholders e botões `aria-disabled`. Trocar para `true` apenas quando os dados reais estiverem confirmados em `src/data/*`.

---

## 5. Dados

- **`src/data/participants.js`** — fonte de verdade dos participantes reais da edição.
- **`src/data/combos.js`** — fonte de verdade dos combos reais.
- **`participantId`** — chave que liga cada combo ao participante correspondente.
- **Nunca usar dados fictícios em produção.** As constantes `PARTICIPANTS`, `COMBOS`, `MAP_STOPS`, `AWARD_CATS` em `Hub.jsx` são apenas placeholders enquanto os dados reais não estão prontos.

---

## 6. Animações

- **Hook:** `useRevealOnScroll()` definido em `Hub.jsx` (topo do arquivo).
- **Mecânica:** `IntersectionObserver` com `threshold: 0.16` e `rootMargin: "0px 0px -8% 0px"`. Adiciona `.is-visible` ao entrar na viewport. Cleanup no unmount.
- **Acessibilidade:** respeita `prefers-reduced-motion: reduce` (entrega elementos visíveis imediatamente).
- **Classes CSS em `src/styles.css`:**
  - `.reveal` (base)
  - `.reveal-up`, `.reveal-left`, `.reveal-right`, `.reveal-scale` (variantes)
  - `.reveal-hero-lockup`, `.reveal-pop` (Hero específicos)
  - `.reveal-delay-1` … `.reveal-delay-5` (cascata)
- **Hover microinterações:** apenas em `@media (hover: hover)`, aplicadas só após `.is-visible` em `.sobre__block`, `.como__card`, `.part__card`, `.combos__formula`, `.awards__card`.
- **Sem biblioteca externa** — não usar Framer Motion, GSAP ou similares.

---

## 7. Menu / Header — `src/components/nav.jsx`

- Menu mobile já ajustado em iteração anterior.
- **Header mobile deve manter apenas:** logo/brand + botão hambúrguer.
- **Páginas internas** (Combos / Mapa / Awards / ComboDetail) ficam **bloqueadas** enquanto não houver dados reais — manter rotas presentes mas indicar "em breve".
- Estilos relacionados ao menu mobile estão em `src/styles.css`.

---

## 8. Regras de segurança para agentes

Regras obrigatórias antes de tocar em qualquer arquivo:

1. **Não alterar rotas** sem solicitação explícita.
2. **Não ativar páginas internas** de combos, mapa ou awards sem dados reais confirmados.
3. **Não usar placeholders como dados reais** — `PARTICIPANTS`/`COMBOS` em `Hub.jsx` são fictícios.
4. **Não alterar `src/data/*`** sem autorização do usuário.
5. **Ajustes visuais da landing Lovers:** priorizar `src/pages/lovers/Hub.jsx` e `src/styles.css`.
6. **Ajustes de menu:** usar apenas `src/components/nav.jsx` e `src/styles.css`.
7. **Grafias oficiais (preservar sempre):**
   - Festival: **Sweet & Coffee Week**
   - Edição: **Sweet & Coffee Week Lovers**
   - Premiação: **Sweet & Coffee Week Awards**
   - Evitar: "Sweet Coffee Week", "Sweet Coffee", "Sweet & Coffee Lovers", "Sweet Coffee Lovers".
8. **Datas da edição Lovers:** 4 a 14 de junho.
9. **Edição comemora 10 anos** do festival.
10. **A página deve comunicar 15 temas/memórias históricas**, incluindo **"Início / 2016"** como tema inaugural.

---

## 9. URLs estáveis para QR Codes — REGRA PERMANENTE

**Esta regra é inegociável. URLs públicas dos QR Codes da edição Sweet & Coffee Week Lovers NÃO podem mudar depois de definidas.**

### Padrões fixos

- **Combo de participante:** `https://www.sweetcoffeeweek.com.br/#/lovers/combos/{slug-do-participante}`
- **Premiação:** `https://www.sweetcoffeeweek.com.br/#/lovers/awards`

### Regras obrigatórias

1. **Nunca alterar o padrão de rota** `#/lovers/combos/:slug`.
2. **Nunca alterar a rota da premiação** `#/lovers/awards`.
3. **O slug do combo é sempre igual ao slug do participante** correspondente.

   Exemplo:
   ```
   participant.id:        "adocee-doceria"
   participant.slug:      "adocee-doceria"
   combo.participantId:   "adocee-doceria"
   combo.slug:            "adocee-doceria"

   URL final: https://www.sweetcoffeeweek.com.br/#/lovers/combos/adocee-doceria
   ```
4. **Não criar slugs baseados no nome do combo.** O slug do combo continua sendo o slug do participante, mesmo que o nome do combo mude.
5. **Não renomear slugs já definidos em `src/data/participants.js`.**
6. **Não trocar hash routing por path routing** nesta edição. Manter formato com `#`.
7. **Se uma alteração futura exigir mudar URL, rota ou slug, parar e avisar antes.** Nunca executar automaticamente.

### Logos dos participantes

As logos dos participantes da edição Lovers devem ficar em `public/logos/participants/` e usar o nome do slug do participante em PNG. O campo `logo` em `participants.js` deve apontar para `/logos/participants/{slug}.png`.

Exemplos:
- `public/logos/participants/adocee-doceria.png` → `logo: "/logos/participants/adocee-doceria.png"`
- `public/logos/participants/parma-doces.png` → `logo: "/logos/participants/parma-doces.png"`

Não renomear os arquivos de logo depois de definidos — o nome do arquivo é o slug do participante.

### Slugs congelados para QR Codes (21 participantes)

```
adocee-doceria
bolomania
caffe-basilicos
canutos
caroli-douces
casa-1190
casa-de-taipa-tapiocaria
delicato-bolos
douce-di-maria
jolie-cafe-patisserie
just-food-coffee
mangai
mr-cupcake-confeitaria
o-maestro-cafe
oli-gastro
padoca-do-bosque
paneer-patisserie
parma-doces
rollab-confeitaria
sweet-duo-confeitaria
wow-cookies
```

Resultado esperado: páginas de combo dos participantes e página de premiação permanecem com URLs estáveis para criação de QR Codes, mesmo que textos, layouts, nomes de combos ou dados internos mudem depois.

---

## 10. Como usar este arquivo

Antes de qualquer tarefa nova:

1. **Ler `CODE_REVIEW_GRAPH.md`** primeiro para mapear o projeto.
2. Confirmar quais arquivos estão no escopo permitido pela tarefa.
3. Se existir um arquivo `CLAUDE.md` ou outro documento de instruções do projeto, consultar junto com este mapa.
4. Listar os arquivos a serem modificados **antes** de editar qualquer linha.
5. Manter escopo mínimo — não refatorar fora do pedido.

Este arquivo deve ser atualizado quando:
- Houver mudança estrutural significativa (nova página, novo componente principal).
- As flags `hasParticipantsData`/`hasCombosData`/`hasMapData`/`hasVotingData` virarem `true`.
- A constante `THEMES` ou a contagem de temas mudar.
