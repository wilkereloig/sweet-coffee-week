# Sweet Awards Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar a página Sweet Awards (Hall, `#/sweet-awards`) em um destino dinâmico e celebrativo — hero compacto, destaque da edição atual em cards de categoria com logo grande, histórico compacto, evolução repaginada — sem perder o histórico nem inventar dados.

**Architecture:** Reestruturar `src/pages/institutional/HistoricoAwards.jsx` (componente único, CSS inline em `<style>` no fim do arquivo, padrão do projeto). Reaproveitar componentes existentes (`EditionAccordion`, `Podium`, `groupByTrack`, `WinnerLogo`) e a fonte de dados via `sweetEditionsCompat.js` (que já cruza `loversAwardsResults.js` para a 2026.1). Sem novas dependências, sem tocar `AWARDS_ONLY_PUBLICATION`.

**Tech Stack:** Vite + React (JSX), hash router, CSS-in-`<style>`, `useRevealOnScroll` (IntersectionObserver), motion tokens (`motion-system.css`), skills `transitions-dev` / `make-interfaces-feel-better` / `emil-design-eng`.

## Global Constraints
- Acento da página: **rosa `#F2548A`** (`body.route-historico-awards`, já em `styles.css`). Não criar cores fora da paleta (CLAUDE.md §3).
- Margens = Home: `.wrap` 1280px / `clamp(20px,4vw,56px)` (CLAUDE.md §4). Zona de segurança header (§4.1) via `--hero-content-start`.
- Sem stickers/ornamentos sem função (§5,§6). Sem eyebrow/kicker acima de títulos. Sem fonte mono em rótulos (usar Nexa `--font-sans`/`--font-slab`).
- Dados: **não inventar**. Edição atual = `LOVERS_2026_AWARDS_RESULTS`; demais = base oficial. Empates preservados (vários nomes na mesma colocação).
- Logos reais via `resolveParticipant` (`participantAssets.js`), fallback monograma; `object-fit: contain`; nunca imagem quebrada.
- `prefers-reduced-motion`: toda animação tem que degradar (sem movimento).
- Verificação por tarefa = `npx vite build --outDir dist_verify --emptyOutDir` verde (depois `rm -rf dist_verify`) + checagem no dev via chrome-devtools (app roda dentro de `#root iframe`; consultar `document.querySelector('#root iframe').contentDocument`).
- Não commitar `CLAUDE.md` nem `Home.jsx` (têm WIP não relacionado). Branch: `dev/site-completo`. Não pushar/deployar sem ordem.

---

## File Structure
- **Modify:** `src/pages/institutional/HistoricoAwards.jsx` — todas as tarefas (estrutura JSX + `<style>` local).
- **Read-only (fontes, não alterar aqui):** `src/data/sweetEditionsCompat.js`, `src/data/loversAwardsResults.js`, `src/data/sweetCoffeeHistory.js`, `src/data/participantAssets.js`.
- Nenhum arquivo novo previsto (se um helper de "edição atual" crescer, extrair p/ topo do mesmo arquivo).

---

### Task 1: Hero compacto (título + linha + CTA)

**Files:** Modify `src/pages/institutional/HistoricoAwards.jsx` (seção `.hist-hero` + CSS `.hist-hero*`).

**Interfaces:**
- Consumes: nada novo.
- Produces: âncora `#premiacao-atual` (id na seção da Task 2) para o CTA rolar.

- [ ] **Step 1:** Reduzir a altura do hero: no CSS `.hist-hero`, trocar o padding atual (`clamp(122px,17vw,178px) 0 clamp(56px,8vw,96px)` e o `@media(min-width:960px)` de `padding-top`) por ~metade (ex.: `padding: var(--hero-content-start) 0 clamp(32px,5vw,56px)`), usando o token de zona de segurança. Remover/encolher `.hist-hero__seal` (selo grande) — cortar o elemento e seu CSS.
- [ ] **Step 2:** No JSX do hero: manter `<h1>`, trocar o parágrafo comprido por **1 linha** calorosa (copy final na Task 7 — usar placeholder curto agora, ex.: "Os combos e marcas que os Sweet Lovers elegeram, edição após edição."), e adicionar um CTA `<a href="#premiacao-atual" class="btn btn-primary">Ver premiação 2026 <I.arrow /></a>` com scroll suave (usar `scroll-behavior:smooth` no container ou handler que faz `scrollIntoView`).
- [ ] **Step 3:** Build: `npx vite build --outDir dist_verify --emptyOutDir` → verde; `rm -rf dist_verify`.
- [ ] **Step 4:** Verificar no dev (chrome-devtools): navegar `#/sweet-awards`; medir `document.querySelector('#root iframe').contentDocument.querySelector('.hist-hero').getBoundingClientRect().height` < altura anterior; CTA existe e aponta `#premiacao-atual`.
- [ ] **Step 5:** Commit: `git add src/pages/institutional/HistoricoAwards.jsx && git commit -m "feat(awards): hero compacto com CTA"`.

---

### Task 2: Seção "Premiação Lovers 2026.1" — dados + grade de 8 cards

**Files:** Modify `HistoricoAwards.jsx` (nova seção após o hero; helper de dados no topo do arquivo).

**Interfaces:**
- Consumes: `sweetEditions` de `../../data/sweetEditionsCompat` (já importado). A edição atual = `sweetEditions.find(e => e.id === '2026.1')`; seus `awards` já vêm cruzados de `loversAwardsResults`.
- Produces: `<section id="premiacao-atual">` com grade; componente `CurrentCategoryCard` (Task 3).

- [ ] **Step 1:** No topo do componente, derivar `const CURRENT = sweetEditions.find(e => e.id === '2026.1')` e `const CURRENT_AWARDS = CURRENT?.awards || []` (8 categorias, cada uma `{category, track, winners:[{place,name}]}`).
- [ ] **Step 2:** Adicionar `<section id="premiacao-atual" className="section swa-current">` logo após o hero, com header (`<h2>Premiação Lovers 2026.1</h2>` + subtítulo curto) e um container `.swa-current__grid` que mapeia `CURRENT_AWARDS` em `<CurrentCategoryCard a={a} key={a.category} />` (o card em si é a Task 3 — aqui só o esqueleto que renderiza o nome da categoria).
- [ ] **Step 3:** CSS `.swa-current__grid`: `display:grid; grid-template-columns: repeat(auto-fit, minmax(300px,1fr)); gap: var(--sp-4)`. `.swa-current` fundo creme, dentro de `.wrap`.
- [ ] **Step 4:** Build verde (`vite build` → `rm -rf dist_verify`).
- [ ] **Step 5:** Verificar (chrome-devtools): `#/sweet-awards` tem `document...querySelectorAll('.swa-current__grid > *').length === 8`; títulos das 8 categorias presentes.
- [ ] **Step 6:** Commit: `git commit -am "feat(awards): secao destaque da edicao atual (grade de 8 categorias)"`.

---

### Task 3: Card de categoria — campeão com logo grande + pódio 1-2-3

**Files:** Modify `HistoricoAwards.jsx` (componente `CurrentCategoryCard` + CSS `.swa-cat*`).

**Interfaces:**
- Consumes: `a = {category, track, winners:[{place:'1º', name}]}`. Reusar `WinnerLogo` existente (aceita `name`, resolve logo/monograma). Tom de medalha: helper `place.startsWith('1')?'gold':...` (já existe em `Podium`).
- Produces: `CurrentCategoryCard` renderizando 1º grande + 2º/3º menores.

- [ ] **Step 1:** Implementar `CurrentCategoryCard({a})`: separar `winners` por colocação — 1º(s) em bloco de destaque, 2º/3º em linha secundária. Empates: mais de um nome na mesma colocação → renderizar lado a lado.
- [ ] **Step 2:** JSX: `.swa-cat` → `<h3>{a.category}</h3>` → `.swa-cat__champ` (medalha ouro + `<WinnerLogo>` GRANDE + nome) → `.swa-cat__runners` (2º prata, 3º bronze, logos médios). Marcar trilha se `a.track` (badge pequeno).
- [ ] **Step 3:** CSS: `.swa-cat` card forte (borda/sombra, radius `--r-lg`, fundo `--cream-card`). Logo do campeão: caixa **~72–96px** (`.swa-cat__champ .hist-brand` override, `>` que hoje é 30px). Runners: logo ~40px. Medalhas reusam `.hist-medal--gold/silver/bronze`. Nome com `overflow-wrap:anywhere`.
- [ ] **Step 4:** Build verde.
- [ ] **Step 5:** Verificar (chrome-devtools): num card, existe `.swa-cat__champ img|.hist-brand__mono`; medir a caixa do logo do campeão ≥ 70px; um card com empate (ex.: "Melhor Doce" tem 3º empate `Parma Doces`+`Bolomania`) mostra 2 nomes no 3º.
- [ ] **Step 6:** Commit: `git commit -am "feat(awards): card de categoria com campeao em destaque e logo grande"`.

---

### Task 4: Motion nos cards (stagger reveal + hover)

**Files:** Modify `HistoricoAwards.jsx` (classes de motion + CSS).

**Interfaces:**
- Consumes: `useRevealOnScroll(rootRef)` (já ativo no componente); classes `motion-stagger`/`motion-reveal-up` (já no projeto).

- [ ] **Step 1:** Adicionar `motion-stagger` no `.swa-current__grid` e garantir que cada `.swa-cat` seja alvo do reveal (classe `motion-reveal-up` ou o padrão que o `motion-stagger` já aplica aos filhos).
- [ ] **Step 2:** CSS hover: `.swa-cat{transition: transform var(--dur-base) var(--ease-out), box-shadow ...} .swa-cat:hover{transform: translateY(-4px); box-shadow: var(--shadow-lg)}`. Sutil (ver skill `make-interfaces-feel-better`, sem tilt exagerado).
- [ ] **Step 3:** `@media (prefers-reduced-motion: reduce)`: zerar `transition`/`transform` dos cards e o stagger.
- [ ] **Step 4:** Build verde.
- [ ] **Step 5:** Verificar (chrome-devtools): cards têm a classe de reveal; com reduced-motion emulado, sem transform no hover. (Screenshot opcional pra mostrar o resultado.)
- [ ] **Step 6:** Commit: `git commit -am "feat(awards): stagger reveal e hover nos cards de categoria"`.

---

### Task 5: Histórico compacto (acordeão enxuto)

**Files:** Modify `HistoricoAwards.jsx` (seção `.hist-list` + `EditionAccordion` summary).

**Interfaces:**
- Consumes: `ordered = [...sweetEditions].reverse()`. **Excluir a 2026.1** da lista (já está no destaque): `ordered.filter(e => e.id !== '2026.1')`.
- Produces: summary do acordeão mostrando ano+tema+campeão do Melhor Combo.

- [ ] **Step 1:** Filtrar a 2026.1 da lista do histórico. Atualizar o subtítulo da seção (hoje "Dezesseis edições..." → refletir que a atual está acima; ex.: "As edições anteriores, do início a 2025.").
- [ ] **Step 2:** No `EditionAccordion` summary, adicionar o **campeão do Melhor Combo** daquela edição: derivar `const combo1 = (e.awards.find(a=>/melhor combo/i.test(a.category))?.winners||[]).filter(w=>w.place.startsWith('1')).map(w=>w.name).join(', ')` e mostrar num `.hist-edi__champ` (com `WinnerLogo` pequeno + nome) quando existir. Manter fechado por padrão (tirar o `defaultOpen` do índice 0, ou manter — decisão: fechar todos).
- [ ] **Step 3:** CSS `.hist-edi__champ` discreto no summary; garantir responsivo (no mobile o summary já vira coluna).
- [ ] **Step 4:** Build verde.
- [ ] **Step 5:** Verificar (chrome-devtools): `.hist-edi` count === 15 (sem a 2026.1); a edição 2025 mostra "Marlon..."/o campeão do Melhor Combo no summary (valor conforme dados atuais; correção de dados é workstream à parte).
- [ ] **Step 6:** Commit: `git commit -am "feat(awards): historico compacto sem a edicao atual, campeao no resumo"`.

---

### Task 6: "Como o Sweet Awards evoluiu" — faixa enxuta

**Files:** Modify `HistoricoAwards.jsx` (seção `.hist-evo`).

**Interfaces:**
- Consumes: o array `EVOLUTION` já existente (4 itens).

- [ ] **Step 1:** Trocar a grade de 4 cards (`.hist-evo` grid) por uma **faixa horizontal enxuta**: sequência de 4 marcos em linha (número/rótulo curto + 1 frase), separadores sutis; no mobile empilha. Reduzir peso visual (não card grande com sombra).
- [ ] **Step 2:** CSS `.hist-evo--strip`: `display:flex; gap; flex-wrap:wrap` (ou grid de 4 colunas que colapsa). Tipografia menor que a atual; sem `box-shadow` pesado.
- [ ] **Step 3:** Build verde.
- [ ] **Step 4:** Verificar (chrome-devtools): 4 marcos presentes, altura da seção menor que a atual.
- [ ] **Step 5:** Commit: `git commit -am "feat(awards): secao evolucao repaginada como faixa enxuta"`.

---

### Task 7: Copy em voz de festival

**Files:** Modify `HistoricoAwards.jsx` (todos os textos da página).

**Interfaces:** nenhuma.

- [ ] **Step 1:** Revisar/reescrever, seguindo CLAUDE.md §15 / SITE_DIRECTION §3 (caloroso, direto, "avaliam" não "votam", "Sweet Lovers" como comunidade, grafias oficiais):
  - Hero: a 1 linha (substituir o placeholder da Task 1).
  - Header da seção atual (Task 2): título + subtítulo curto.
  - Subtítulo do histórico (Task 5).
  - CTA final: revisar frases.
  - Conferir que **não sobrou** texto de bastidor/metodologia em nenhum ponto.
- [ ] **Step 2:** Build verde.
- [ ] **Step 3:** Verificar (chrome-devtools): `document...body.innerText` não contém "posts, cards e acervo" / "por suposição" / "Resultado oficial da Premiação da 16".
- [ ] **Step 4:** Commit: `git commit -am "feat(awards): copy em voz de festival"`.

---

### Task 8: Responsivo + verificação final

**Files:** Modify `HistoricoAwards.jsx` (media queries).

- [ ] **Step 1:** Garantir grade de 8 cards → 2 col (tablet) → 1 col (mobile); logo do campeão proporcional; sem overflow lateral (`overflow-x: clip` já existe em `.hist-page`). Hero e faixa de evolução ok no mobile.
- [ ] **Step 2:** Build verde.
- [ ] **Step 3:** Verificar (chrome-devtools) em 3 larguras (ex.: emular 375 / 768 / 1280): sem scroll horizontal; cards legíveis; margens = `.wrap`. Screenshot de cada pra registro.
- [ ] **Step 4:** Rodar checklist CLAUDE.md §18 (Home intacta; `AWARDS_ONLY_PUBLICATION` intacto; sem cores novas; sem stickers; margens = Home; placeholders elegantes; desktop+mobile).
- [ ] **Step 5:** Commit final: `git commit -am "feat(awards): responsivo e ajustes finais do redesign"`.

---

## Self-Review (feito)
- **Cobertura do spec:** hero compacto (T1), destaque 8 cards+logo grande (T2/T3), motion (T4), histórico compacto (T5), evolução repaginada (T6), copy (T7), responsivo (T8). ✓
- **Placeholders:** copy do hero é placeholder proposital na T1, resolvido na T7 (marcado). Sem TODOs soltos.
- **Consistência de tipos:** `a.winners[].place` é string ("1º"); `a.category`/`a.track` strings; `e.id` string ("2026.1"); `WinnerLogo({name})`; classes `.swa-cat*` novas, `.hist-*` reusadas. Consistente entre tarefas.
- **Dados:** correção dos valores (2025 etc.) é workstream separado — o plano não depende dos valores exatos.
