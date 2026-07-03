# Edições — Refino (Etapa 2: mecanismo, bug e polish)

**Data:** 2026-07-03
**Branch:** dev/site-completo (implementação a fazer nessa branch — sessão atual está
em worktree `claude/distracted-bohr-4ddcba`, mesclar/portar antes do push final).
**Escopo:** só a página Edições (`src/pages/institutional/Edicoes.jsx`) + 1 fix de
1 linha em `src/styles.css` que é a causa raiz de um bug global de sticky mobile.
**Objetivo:** página se descreve no topo do arquivo como "Etapa 1 = estrutura... sem
refino visual final". Este spec é a Etapa 2: corrige um bug real de navegação mobile,
troca o mecanismo de apresentação horizontal por um mais leve/direto, e dá acabamento
visual/editorial.

---

## 1. Contexto e causa raiz (bug)

Investigação ao vivo (preview + computed styles, não achismo) achou bug confirmado:
no mobile (<767px), a barra de navegação por chips (`.edx-chips-wrap`, `position:
sticky; top:0`) não gruda — rola junto com o conteúdo e some após ~1 tela.

Causa raiz: `src/styles.css:1341`, dentro de `@media (max-width: 767px)`:
```css
html, body { overflow-x: hidden; max-width: 100%; }
```
Sem `overflow-y` explícito. Pelo spec de CSS Overflow, quando `overflow-x` é definido
e `overflow-y` fica no valor inicial (`visible`), o `overflow-y` é promovido a `auto`
— em **html E body simultaneamente**. Isso cria 2 scroll containers redundantes; o
`body` formalmente vira "scroll container" mas nunca rola de verdade (seu
`clientHeight == scrollHeight`, já que sua altura é intrínseca ao conteúdo). Como
`position: sticky` resolve contra o scroll container mais próximo — `body`, não
`html` — o sticky nunca reconhece o viewport visual e simplesmente não gruda.

Confirmado via `getComputedStyle`: com a regra ativa, `html` e `body` computam
`overflow-y: auto` os dois; `body.scrollTop` fica travado em 0 mesmo com
`documentElement.scrollTop` mudando — prova de que é `html` quem realmente rola, mas
o sticky está "amarrado" no `body`.

Fix: acrescentar `overflow-y: visible` explícito na mesma regra — cancela a promoção,
mantém a proteção de overflow horizontal que a regra existe pra dar. É bug de origem
global (afeta qualquer `position: sticky` mobile no site), fix na fonte.

## 2. Escopo decidido

- Bug do sticky mobile: fix.
- Mecanismo de apresentação horizontal desktop (≥980px): **trocado** (não só
  ajustado) — ver §3.
- Polish visual/editorial: tons por edição, tipografia/hierarquia, transições entre
  painéis, slots de logo/foto — ver §4.
- Fora de escopo (perguntado e descartado): aprofundar conteúdo por edição
  (curiosidades/comparações dentro do próprio card) — usuário não pediu.
- Fora de escopo: qualquer alteração em `src/data/editions.js`,
  `sweetCoffeeHistory.js`, `editionGallery.js` — dados já 100% completos (16/16
  logos reais em `public/images/editions/<code>/logo.png`, 16/16 galerias reais em
  `public/images/edicoes/`), confirmado nesta sessão. Não inventar/alterar dado.

## 3. Novo mecanismo horizontal (desktop, ≥980px, sem reduced-motion)

### 3.1 O que sai
- `.edx-stage` com altura artificial `${TOTAL * 135}vh` (~2160vh) só pra criar
  distância de scroll pro scroll-jack.
- Listener de `scroll` + `requestAnimationFrame` computando `progress` e aplicando
  `translate3d` manual no trilho (`Edicoes.jsx`, efeito "Scroll-driven").
- Cálculo de `pick(i)` baseado em `outer.offsetTop + (i/(TOTAL-1)) * dist`.

### 3.2 O que entra
- `.edx-stage` vira bloco normal de `100vh` no fluxo da página (sem spacer
  artificial).
- `.edx-track` vira contêiner nativamente scrollável na horizontal:
  `overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth`
  (`auto` sob `prefers-reduced-motion: reduce`). Cada `.edx-slide` ganha
  `scroll-snap-align: start`.
- Listener de `wheel` no `.edx-stage`: `deltaY` dominante → redireciona pra
  `track.scrollLeft`, com `preventDefault()` **só quando não está na borda**. Na 1ª
  edição rolando pra cima, ou na 16ª rolando pra baixo, o evento não é interceptado
  — a página rola normalmente (sai pro hero acima / pro `SiteFooter` abaixo, que já
  renderiza em `edicoes` via `FOOTER_ROUTES`).
- `pick(i)` vira `track.scrollTo({ left: i * vw, behavior })` — direto, sem
  depender das edições intermediárias.
- Navegação por teclado (novo, incluso de graça pela troca de mecanismo): `.edx-stage`
  focável, `←`/`→` avança/volta 1 edição.
- Barra de progresso recalculada por
  `track.scrollLeft / (track.scrollWidth - track.clientWidth)` em vez da conta de vh.
- `active` (índice pro nav/progresso) passa a vir de um listener de `scroll` no
  `track` (horizontal), não mais do scroll vertical da página.

### 3.3 Rede de segurança
Combinar wheel-redirect com scroll-snap nativo é sensível a ajuste fino entre
browsers/trackpads — vai ser testado ao vivo no preview antes de dar como pronto.
Independente do wheel funcionar perfeitamente, clique em chip/número e as setas de
teclado sempre navegam corretamente (não dependem do wheel).

### 3.4 Mobile/reduced-motion
Sem mudança de mecanismo — continua pilha vertical (`.edx-stack`) com chips sticky no
topo (após o fix do §1). `horizontal` (o state que decide qual modo renderizar) segue
controlado pelos mesmos `matchMedia` já existentes (`min-width: 980px` +
`prefers-reduced-motion`).

## 4. Polish visual/editorial

- **Tons por edição**: `TONES` estendido de 4 (`coral, pink, cyan, yellow`) pra 6,
  incluindo `peach` e `choco` — tokens já existentes em `swc-redesign.css`, zero cor
  nova (cumpre §3 do CLAUDE.md). Reduz repetição de padrão de 1-a-cada-4 pra
  1-a-cada-6 em 16 edições.
- **Tipografia/hierarquia**: revisar ritmo vertical entre índice → logo → título →
  etapa → lead → meta → status; reforçar peso do título vs. elementos de apoio;
  revisar ponto de corte do `line-clamp` do lead.
- **Transições entre painéis**: elementos internos do painel ativo ganham entrada
  suave (fade + leve deslocamento), sincronizada com o snap — sensação de "página
  virando" além do trilho deslizando.
- **Slots de logo/foto**: revisar sombra/borda/proporção do slot de logo e do slot de
  foto (principal + mini-galeria) pra mais coesão entre os dois.

## 5. Limpeza menor

`src/data/editionAssets.js` tem comentário desatualizado dizendo que os logos "ainda
não existem no acervo" — falso hoje (16/16 confirmados). Atualiza o comentário pra
refletir o estado real. Lógica de fallback (`is-fallback`) **não é removida** — continua
como rede de segurança caso um arquivo falte/quebre no futuro.

## 6. Verificação

- `npm run build` limpo.
- `npm run test:responsive` (já corrigido em sessão anterior pra usar `?preview=1`) —
  garante que o fix em `styles.css:1341` não regride outras páginas.
- Preview manual: desktop (wheel/snap/chips/teclado, incluindo casos de borda 1ª/16ª
  edição), mobile (chip sticky, scroll da pilha), tablet (768px, modo vertical),
  reduced-motion (cai pra pilha vertical, sem wheel-redirect), resize ao vivo cruzando
  980px.
- Screenshots antes/depois.

## 7. Riscos conhecidos (documentados, não bloqueiam início)

- Ajuste fino de wheel-redirect + scroll-snap pode exigir iteração durante a
  implementação (tuning específico de browser/dispositivo) — mitigado pela rede de
  segurança do §3.3.
- Troca de mecanismo é mudança de sensação (de "scrubbing" contínuo pra "paginado com
  wheel-assist") — decisão explícita do usuário (Opção 2, preferida sobre a Opção 1
  de refino incremental que foi recomendada).
