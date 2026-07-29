# Sweet Awards — reestruturação de ritmo + grade de resultados Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Devolver ritmo à página Sweet Awards e trocar o carrossel de aba única por uma grade de resultados que linka pro Instagram (padrão da landing "Em breve").

**Architecture:** Arquivo único autocontido `HistoricoAwards.jsx` (JSX + `<style>` inline). Reestrutura em 5 seções com alternância de valor escuro→creme→escuro→creme→marrom. Reusa componentes já existentes no arquivo (`Podium`, `WinnerLogo`, `RecordCard`, `EditionAccordion`) e porta o padrão de card+link do `EmBreve.jsx` pro namespace `swa-result-*`. Sem embed de Instagram: só link pro `postResultado`.

**Tech Stack:** Vite + React (JSX), sem build de conteúdo. Sem framework de teste — verificação = `npx vite build` (em pasta temp do sistema) + checagens `grep`. Conferência visual é do usuário.

## Global Constraints

- **Branch:** trabalhar em `dev/site-completo`. Confirmar com `git branch --show-current` antes de editar. Se `master`/`main` → parar e avisar.
- **Arquivo único:** só `src/pages/institutional/HistoricoAwards.jsx`. Não tocar `EmBreve.jsx`, `App.jsx` (flags/rotas), `src/data/`, Home, identidade Lovers.
- **Identidade (§12):** institucional — espresso `#2B1810` (`--ink`) + creme (`--cream`) + ouro `#F8B511` (`--page-accent`). NUNCA KV Lovers.
- **Paleta (§3):** só tokens/cores oficiais já usados no arquivo. Sem cor nova, sem roxo/verde/lavanda.
- **Dados (§16):** só do que já existe — `getCurrentEditionScenes()`, `getPodiumTotals()`, `getAwardWins()`, `getDistinctCategoryCount()`, `getResultsCoverage()`, `sweetEditions`. Nada inventado. Empates preservados.
- **Instagram:** só link (`scene.postResultado`), nunca embed/iframe.
- **Motion:** só `transform`/`opacity`/`filter`, sem layout shift, respeita `prefers-reduced-motion`. Reusar classes globais (`motion-reveal-up`, `motion-stagger`, `motion-card-hover`, `motion-image-reveal`, `motion-press`). Sem lib nova.
- **Rotas congeladas:** âncora `id="premiacao-atual"` e paths públicos `/sweet-awards` / `/historico-sweet-awards` não mudam.
- **Breakpoints (§17):** escala 1080·960·720·560·420; reflow principal 960.
- **Build de verificação (SEMPRE fora do projeto, uma vez só):**
  ```bash
  npx vite build --outDir "${TEMP:-/tmp}/scw_awards_$$" --emptyOutDir && rm -rf "${TEMP:-/tmp}/scw_awards_$$"
  ```
  Falhou → parar, mostrar erro, não commitar.

---

## File Structure

- **Modify:** `src/pages/institutional/HistoricoAwards.jsx` — único arquivo. Mudanças por região:
  - Topo (consts/helpers): remover `CATEGORY_TONE`, `CEREMONY_PHOTO_SLOTS`, `SCENE_PHOTO_FILE`, `winnerPhoto`, `ReservedMedia`, `CategoryWinnerCarousel`; adicionar `CATEGORY_PHOTO`, `firstPlaceNames`, `ResultSceneImg`, `ResultPostLink`, `ComboResultCard`, `ResultCard`.
  - `AwardsHero`: trocar roster `01–08` por teaser do Grande Vencedor.
  - Corpo `HistoricoAwardsPage`: trocar `swa-current-section` (carrossel) pela grade; remover estado `activeIndex`; remover `swa-context-section`; escurecer `swa-archive-section`.
  - `<style>`: trocar blocos CSS do carrossel/contexto por `swa-result-*` e `swa-hero__teaser`; escurecer arquivo.

Reusados sem alteração: `StatusBadge`, `WinnerLogo`, `Podium`, `CategoryCard`, `RecordCard`, `groupByTrack`, `EditionAccordion`, `EVOLUTION` (só retom de cor).

---

### Task 1: Grade de resultados (S2) — substitui o carrossel

Substitui o carrossel de aba única por: card Grande Vencedor + grade das 7 categorias, cada uma com foto real, pódio (empates) e barra "Ver no Instagram". Reusa `Podium` e `WinnerLogo` já existentes.

**Files:**
- Modify: `src/pages/institutional/HistoricoAwards.jsx`

**Interfaces:**
- Consumes: `getCurrentEditionScenes()` → `scene = { key, category, description, postResultado, winners: [{place,pos,name}] }`; existing `Podium` (`winners` prop) e `WinnerLogo`.
- Produces: `ComboResultCard({scene})`, `ResultCard({scene})`, `ResultSceneImg({src,alt})`, `ResultPostLink({href})`, `CATEGORY_PHOTO`, `firstPlaceNames(winners)` — consumidos pela Task 2 (`firstPlaceNames`) e pelo corpo.

- [ ] **Step 1: Remover helpers órfãos do carrossel**

Deletar do arquivo (topo): a const `CATEGORY_TONE` (linhas ~43–52), a const `SCENE_PHOTO_FILE` + função `winnerPhoto` (linhas ~113–118), e a função inteira `CategoryWinnerCarousel` (linhas ~170–226).

- [ ] **Step 2: Adicionar os helpers da grade**

Logo após o import block (depois de `getResultsCoverage,` … `} from '../../data/sweetHistoryStats'`), adicionar:

```jsx
// Foto real por categoria da Lovers 2026.1 — mesmos frames da landing "Em breve".
// O Maestro Café vence 3 categorias: usa 3 frames diferentes, nunca repete arquivo.
const CATEGORY_PHOTO = {
  melhor_combo: '/images/combos/o-maestro-cafe/main.jpg',
  atendimento: '/images/combos/rollab-confeitaria/main.jpg',
  apresentacao: '/images/combos/just-food-coffee/main.jpg',
  doce: '/images/combos/jolie-cafe-patisserie/main.jpg',
  bebida: '/images/combos/sweet-duo-confeitaria/main.jpg',
  salgado: '/images/combos/o-maestro-cafe/photo-02.jpg',
  criatividade: '/images/combos/o-maestro-cafe/photo-03.jpg',
  envolvimento: '/images/combos/mr-cupcake-confeitaria/main.jpg',
}

// Nomes de 1º lugar de uma cena (empates viram "A e B") — pro alt e pro teaser da hero.
function firstPlaceNames(winners) {
  return (winners || []).filter((w) => w.pos === 1).map((w) => w.name).join(' e ')
}

// Foto de categoria com fallback honesto — nunca <img> quebrada nem vazio (§8).
function ResultSceneImg({ src, alt }) {
  const [broken, setBroken] = React.useState(false)
  if (!src || broken) return <div className="swa-result__nophoto">Foto pendente</div>
  return <img className="motion-image-reveal" src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBroken(true)} />
}

// Barra "Ver no Instagram" — link real pro post de resultado (nunca embed).
function ResultPostLink({ href }) {
  if (!href) return null
  return (
    <a className="swa-result__post" href={href} target="_blank" rel="noopener noreferrer">
      <I.ig width={15} height={15} />
      <span>Ver no Instagram</span>
      <I.arrow />
    </a>
  )
}

// Card do Grande Vencedor (Melhor Combo) — largo, foto + medalha + pódio + link.
function ComboResultCard({ scene }) {
  return (
    <article className="swa-result-combo motion-stagger motion-card-hover">
      <div className="swa-result-combo__media">
        <ResultSceneImg src={CATEGORY_PHOTO.melhor_combo} alt={`${scene.category} — combo vencedor: ${firstPlaceNames(scene.winners)}`} />
        <span className="swa-result-combo__medal" aria-hidden="true">1º</span>
      </div>
      <div className="swa-result-combo__body">
        <p className="swa-result-combo__tag">Grande vencedor</p>
        <h3>{scene.category}</h3>
        {scene.description && <p className="swa-result__desc">{scene.description}</p>}
        <Podium winners={scene.winners} />
        <ResultPostLink href={scene.postResultado} />
      </div>
    </article>
  )
}

// Card de categoria — foto + título + descrição + pódio + link. Reusa Podium (empates).
function ResultCard({ scene }) {
  return (
    <article className="swa-result-card motion-reveal-up motion-card-hover">
      <div className="swa-result-card__media">
        <ResultSceneImg src={CATEGORY_PHOTO[scene.key]} alt={`${scene.category} — vencedor: ${firstPlaceNames(scene.winners)}`} />
      </div>
      <h3>{scene.category}</h3>
      {scene.description && <p className="swa-result__desc">{scene.description}</p>}
      <Podium winners={scene.winners} />
      <ResultPostLink href={scene.postResultado} />
    </article>
  )
}
```

- [ ] **Step 3: Ajustar estado do componente**

Em `HistoricoAwardsPage`, remover a linha `const [activeIndex, setActiveIndex] = React.useState(0)` (~348) e a linha `const activeScene = scenes[activeIndex] || comboScene` (~359). Depois de `const comboScene = scenes.find((s) => s.key === 'melhor_combo') || scenes[0] || null`, adicionar:

```jsx
  const otherScenes = scenes.filter((s) => s.key !== 'melhor_combo')
```

- [ ] **Step 4: Trocar o JSX da seção de resultados**

Substituir o bloco inteiro `{/* 2 — CERIMÔNIA ATUAL ... */}` `<section id="premiacao-atual" className="section swa-current-section"> … </section>` (linhas ~372–403) por:

```jsx
      {/* 2 — RESULTADOS DA EDIÇÃO ATUAL: grade que linka pro Instagram */}
      <section id="premiacao-atual" className="section swa-results-section">
        <div className="wrap">
          <div className="swa-results-head motion-reveal-up">
            <h2>Todos os vencedores, <span className="hist-hl">categoria por categoria</span></h2>
            <p>A premiação da 16ª edição na avaliação dos Sweet Lovers. Cada card abre o post do resultado no Instagram, com os empates preservados.</p>
          </div>
          {comboScene && <ComboResultCard scene={comboScene} />}
          <div className="swa-results-grid">
            {otherScenes.map((scene) => <ResultCard scene={scene} key={scene.key} />)}
          </div>
        </div>
      </section>
```

- [ ] **Step 5: Trocar o CSS do carrossel pelo CSS da grade**

No `<style>`, remover os blocos do carrossel: `/* 2 — CERIMÔNIA ATUAL: um capítulo ativo por vez */` até o fim de `.swa-chapter__progress span { … }` (linhas ~512–553, inclui `.swa-current-section`, `.swa-chapter-nav*`, keyframes `swaChapterEnter`/`swaWinnerEnter`, `.swa-chapter*`, `.swa-carousel-winner*`, `.swa-winner-carousel__status`). Manter o keyframe `swaHeroPhotoSettle` por enquanto (removido na Task 3). No lugar, inserir:

```css
        /* 2 — RESULTADOS: card do grande vencedor + grade das 7 categorias */
        .swa-results-section { background: var(--cream); }
        .swa-results-head { display: flex; flex-direction: column; align-items: flex-start; text-align: left; gap: var(--sp-4); max-width: 760px; margin: 0 0 var(--sp-7); }
        .swa-results-head h2 { font-size: var(--fs-display-md); line-height: .98; }
        .swa-results-head p { max-width: 62ch; color: var(--ink-soft); font-size: var(--fs-lead); line-height: 1.4; margin: 0; text-wrap: pretty; }

        .swa-result-combo { display: grid; grid-template-columns: minmax(220px, 1fr) 1.35fr; gap: clamp(20px, 3vw, 40px); align-items: stretch; background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: clamp(20px, 2.6vw, 32px); box-shadow: var(--shadow-md); margin-bottom: clamp(28px, 4vw, 48px); }
        .swa-result-combo__media { position: relative; min-height: 240px; border-radius: 14px; overflow: hidden; background: var(--cream-card); }
        .swa-result-combo__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .swa-result-combo__medal { position: absolute; top: 14px; left: 14px; display: inline-grid; place-items: center; width: 52px; height: 52px; border-radius: 999px; background: linear-gradient(160deg, #FFE08A, #E8A20C); color: var(--ink); font-family: var(--font-display); font-weight: 900; font-size: 18px; box-shadow: 0 6px 16px rgba(43,24,16,.28), inset 0 0 0 3px rgba(255,255,255,.5); }
        .swa-result-combo__body { display: flex; flex-direction: column; gap: var(--sp-3); }
        .swa-result-combo__tag { margin: 0; font-family: var(--font-sans); font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--page-accent-dark); }
        .swa-result-combo__body h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(22px, 2.6vw, 30px); letter-spacing: -.03em; color: var(--ink); margin: 0; }

        .swa-results-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: var(--sp-4); }
        .swa-result-card { display: flex; flex-direction: column; gap: var(--sp-3); background: var(--cream-card); border: 1px solid var(--paper-line); border-radius: var(--r-lg); padding: var(--sp-5); box-shadow: var(--shadow-md); }
        .swa-result-card__media { border-radius: 12px; overflow: hidden; aspect-ratio: 4 / 3; background: var(--cream-card); }
        .swa-result-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .swa-result-card h3 { font-family: var(--font-heading); font-weight: 800; font-size: clamp(17px, 1.5vw, 20px); letter-spacing: -.02em; color: var(--ink); margin: 0; }
        .swa-result__desc { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--ink-soft); text-wrap: pretty; }
        .swa-result__nophoto { width: 100%; height: 100%; display: grid; place-items: center; padding: var(--sp-4); text-align: center; color: var(--ink-soft); font-size: 12.5px; font-style: italic; background: repeating-linear-gradient(135deg, var(--cream-card), var(--cream-card) 10px, var(--paper-line) 10px, var(--paper-line) 11px); }
        /* barra "Ver no Instagram" — link real pro post, sem embed */
        .swa-result__post { margin-top: auto; display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--paper-line); background: #fff; font-family: var(--font-sans); font-size: 13.5px; font-weight: 700; color: var(--page-accent-dark); text-decoration: none; }
        .swa-result__post svg:last-child { margin-left: auto; transition: transform .16s ease; }
        .swa-result__post:hover svg:last-child { transform: translateX(3px); }
        .swa-result__post:focus-visible { outline: 2px solid var(--page-accent); outline-offset: 2px; }
```

- [ ] **Step 6: Ajustar o responsivo do carrossel → grade**

No bloco `@media (max-width: 960px)`, remover as linhas do carrossel: `.swa-chapter { grid-template-columns: 1fr; }`, `.swa-chapter__photo { … }`, `.swa-chapter__body { … }` (linhas ~674–676). No bloco `@media (max-width: 720px)`, remover `.swa-chapter-nav { … }`, `.swa-chapter-nav__item { … }`, `.swa-chapter__number { … }`, `.swa-chapter__medal { … }` (linhas ~685–688). No bloco `@media (max-width: 560px)`, remover `.swa-chapter__photo { … }`, `.swa-chapter__body { … }`, `.swa-chapter__body h3 { … }`, `.swa-chapter__description { … }` (linhas ~703–706). Adicionar, dentro do `@media (max-width: 720px)`:

```css
          .swa-result-combo { grid-template-columns: 1fr; }
          .swa-result-combo__media { min-height: 200px; }
```

No bloco `@media (prefers-reduced-motion: reduce)`, remover a linha `.swa-chapter-nav__item, .swa-chapter__arrow, .swa-chapter__progress span { transition: none; }` e `.swa-chapter, .swa-chapter__photo, .swa-chapter__body, .swa-media-slot > img { animation: none; }` — substituir por:

```css
          .swa-result__post svg:last-child { transition: none; }
          .swa-media-slot > img { animation: none; }
```

(A referência `.swa-media-slot` sai na Task 3.)

- [ ] **Step 7: Build**

Run:
```bash
npx vite build --outDir "${TEMP:-/tmp}/scw_awards_$$" --emptyOutDir && rm -rf "${TEMP:-/tmp}/scw_awards_$$"
```
Expected: `✓ built in …` sem erro.

- [ ] **Step 8: Verificar remoção do carrossel**

Run:
```bash
grep -nE "CategoryWinnerCarousel|swa-chapter-nav|CATEGORY_TONE|winnerPhoto|activeIndex|swa-current-section" src/pages/institutional/HistoricoAwards.jsx
```
Expected: nenhuma linha (sem saída).

- [ ] **Step 9: Commit**

```bash
git add src/pages/institutional/HistoricoAwards.jsx
git commit -m "feat(awards): grade de resultados estilo 'em breve' no lugar do carrossel"
```

---

### Task 2: Teaser do Grande Vencedor na hero (S1)

Remove o roster `01–08` (mesma lista repetida na nav) e coloca no lado direito da hero um teaser do Grande Vencedor: medalha 1º + Melhor Combo + logo real + nome + micro-link "Ver no Instagram".

**Files:**
- Modify: `src/pages/institutional/HistoricoAwards.jsx`

**Interfaces:**
- Consumes: `comboScene` (passado como prop), `firstPlaceNames` (Task 1), `WinnerLogo`.
- Produces: `AwardsHero({ onExplore, comboScene })` — nova assinatura consumida pelo corpo.

- [ ] **Step 1: Reescrever `AwardsHero`**

Substituir a função `AwardsHero` inteira (linhas ~146–168) por:

```jsx
// Hero tipográfica: à esquerda o título/CTA, à direita o teaser do Grande Vencedor
// (Melhor Combo) — substância real da edição, não roster repetido.
function AwardsHero({ onExplore, comboScene }) {
  const firstWinner = comboScene ? comboScene.winners.find((w) => w.pos === 1) : null
  const lead = comboScene ? firstPlaceNames(comboScene.winners) : ''
  return (
    <section className="swa-hero">
      <div className="wrap swa-hero__inner">
        <div className="swa-hero__copy">
          <h1>Sweet Awards <span>Lovers 2026.1</span></h1>
          <p>Oito categorias e oito conquistas que celebram sabor, atendimento, criatividade e a experiência inteira do festival.</p>
          <a href="#premiacao-atual" className="btn btn-primary motion-press" onClick={onExplore}>Conhecer os vencedores <I.arrow /></a>
        </div>
        {comboScene && firstWinner && (
          <aside className="swa-hero__teaser" aria-label={`Grande vencedor: ${comboScene.category}`}>
            <span className="swa-hero__teaser-tag"><span className="hist-medal hist-medal--gold" aria-hidden="true">1</span> Grande vencedor</span>
            <p className="swa-hero__teaser-cat">{comboScene.category}</p>
            <div className="swa-hero__teaser-brand">
              <WinnerLogo name={firstWinner.name} />
              <strong>{lead}</strong>
            </div>
            {comboScene.postResultado && (
              <a className="swa-hero__teaser-link" href={comboScene.postResultado} target="_blank" rel="noopener noreferrer">
                <I.ig width={14} height={14} /> Ver no Instagram <I.arrow />
              </a>
            )}
          </aside>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Atualizar a chamada no corpo**

Trocar `<AwardsHero onExplore={scrollToCurrent} scenes={scenes} />` (linha ~370) por:

```jsx
      <AwardsHero onExplore={scrollToCurrent} comboScene={comboScene} />
```

- [ ] **Step 3: Trocar o CSS do roster pelo do teaser**

No `<style>`, remover o bloco do roster: o comentário `/* roster das 8 categorias … */` e as regras `.swa-hero__roster`, `.swa-hero__roster li`, `.swa-hero__roster-num` (linhas ~501–504). Inserir no lugar:

```css
        /* teaser do Grande Vencedor (lado direito da hero) — substituiu o roster */
        .swa-hero__teaser { align-self: center; justify-self: stretch; display: flex; flex-direction: column; align-items: flex-start; gap: var(--sp-4); padding: clamp(24px, 3vw, 40px); background: rgba(255,241,230,.06); border: 1px solid rgba(255,241,230,.16); border-radius: var(--r-lg); }
        .swa-hero__teaser-tag { display: inline-flex; align-items: center; gap: 9px; font-family: var(--font-sans); font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--page-accent); }
        .swa-hero__teaser-cat { margin: 0; font-family: var(--font-heading); font-weight: 800; font-size: clamp(26px, 3vw, 40px); line-height: 1; letter-spacing: -.03em; color: var(--cream); }
        .swa-hero__teaser-brand { display: flex; align-items: center; gap: var(--sp-3); }
        .swa-hero__teaser-brand .hist-brand { width: 54px; height: 54px; border-radius: 12px; }
        .swa-hero__teaser-brand .hist-brand--img { background: #fff; }
        .swa-hero__teaser-brand strong { font-family: var(--font-heading); font-weight: 800; font-size: clamp(19px, 2vw, 26px); color: var(--cream); letter-spacing: -.02em; overflow-wrap: anywhere; }
        .swa-hero__teaser-link { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-size: 13px; font-weight: 700; color: var(--page-accent); text-decoration: none; }
        .swa-hero__teaser-link svg:last-child { transition: transform .16s ease; }
        .swa-hero__teaser-link:hover svg:last-child { transform: translateX(3px); }
        .swa-hero__teaser-link:focus-visible { outline: 2px solid var(--page-accent); outline-offset: 3px; border-radius: 4px; }
```

- [ ] **Step 4: Ajustar o responsivo da hero**

No `@media (max-width: 960px)`, trocar a linha `.swa-hero__roster { max-width: 720px; }` (linha ~673) por:

```css
          .swa-hero__teaser { align-self: stretch; }
```

No `@media (prefers-reduced-motion: reduce)`, adicionar `.swa-hero__teaser-link svg:last-child` à lista de `transition: none;` (juntar com a regra `.swa-result__post svg:last-child { transition: none; }` da Task 1):

```css
          .swa-result__post svg:last-child, .swa-hero__teaser-link svg:last-child { transition: none; }
```

- [ ] **Step 5: Build**

Run:
```bash
npx vite build --outDir "${TEMP:-/tmp}/scw_awards_$$" --emptyOutDir && rm -rf "${TEMP:-/tmp}/scw_awards_$$"
```
Expected: `✓ built in …` sem erro.

- [ ] **Step 6: Verificar remoção do roster**

Run:
```bash
grep -nE "swa-hero__roster|scenes=\{scenes\}" src/pages/institutional/HistoricoAwards.jsx
```
Expected: nenhuma linha.

- [ ] **Step 7: Commit**

```bash
git add src/pages/institutional/HistoricoAwards.jsx
git commit -m "feat(awards): teaser do grande vencedor na hero no lugar do roster 01-08"
```

---

### Task 3: Arquivo escuro (S3) — funde contexto, mata a banda vazia, segundo pico

Funde a copy de contexto no bloco de arquivo, remove a `swa-context-section` e a banda de foto vazia 16:7 (`CEREMONY_PHOTO_SLOTS`/`ReservedMedia`/`swa-memory-grid`), escurece a seção de arquivo pra fundo espresso (`--ink`) — o dourado finalmente acende — e retona a evolução pra contraste sobre escuro.

**Files:**
- Modify: `src/pages/institutional/HistoricoAwards.jsx`

**Interfaces:**
- Consumes: `EVOLUTION`, `RecordCard`, `podiumLeader`, `winsLeader`, `distinctCategories`, `coverage` (já no corpo).
- Produces: nada novo (só reestrutura markup + CSS).

- [ ] **Step 1: Remover a banda de foto vazia (consts + componente)**

Deletar: a const `CEREMONY_PHOTO_SLOTS` + seu comentário (linhas ~54–59) e a função `ReservedMedia` inteira (linhas ~120–142).

- [ ] **Step 2: Remover a seção de contexto do JSX**

Deletar o bloco inteiro `{/* 4 — CONTEXTO CURTO */}` `<section className="section swa-context-section"> … </section>` (linhas ~405–416).

- [ ] **Step 3: Reescrever a abertura do arquivo (funde a copy de contexto)**

No bloco `{/* 5 — ARQUIVO … */}` `<section className="section swa-archive-section">`, trocar a `<div className="hist-head motion-reveal-up"> … </div>` (linhas ~421–424) por:

```jsx
          <div className="hist-head motion-reveal-up">
            <h2>O arquivo do <span className="hist-hl">Sweet Awards</span></h2>
            <p>O Sweet Awards reconhece o que fica depois da última mordida: o sabor que emocionou, o atendimento que acolheu e a comunidade que provou, fotografou e votou. A Lovers 2026.1 é o destaque de agora — aqui ficam os marcos e recordes que contam a história completa da premiação.</p>
          </div>
```

- [ ] **Step 4: Retonar a evolução pra fundo escuro**

Substituir a const `EVOLUTION` (linhas ~339–344) por (só as cores `hl` mudam — tons claros da paleta que contrastam no espresso):

```jsx
const EVOLUTION = [
  { hl: '#F2693C', t: 'De Melhor Combo a múltiplas categorias', d: 'O primeiro resultado registrado reconhece o Melhor Combo. Com o tempo, a premiação passa a olhar para cada parte da experiência.' },
  { hl: '#F8B511', t: 'A entrada do Júri Técnico', d: 'Além do público, edições passam a registrar avaliações de júri técnico, somando olhares especializados sobre os destaques.' },
  { hl: '#2BC4E8', t: 'A força dos Sweet Lovers', d: 'A comunidade que prova, fotografa e compartilha também ajuda a eleger os combos e marcas que mais marcaram cada edição.' },
  { hl: '#F2548A', t: 'Categorias que valorizam a experiência', d: 'Sabor, atendimento, criatividade, apresentação e encantamento entram na premiação, reconhecendo a loja inteira, não só o combo.' },
]
```

- [ ] **Step 5: Escurecer o CSS do arquivo + remover CSS órfão de contexto/mídia**

No `<style>`:

(a) Remover o bloco `.swa-media-slot* { … }` (linhas ~505–510) e o keyframe `swaHeroPhotoSettle` (linha ~525).

(b) Remover o bloco `/* 4 — CONTEXTO + MEMÓRIA DA CERIMÔNIA */` — regras `.swa-context-section`, `.swa-context-copy*`, `.swa-context`, `.swa-memory-grid*` (linhas ~555–565).

(c) Trocar a regra `.swa-archive-section { background: var(--cream-deep, var(--bg-soft)); }` (linha ~649) e adicionar os overrides de tema escuro. Substituir essa linha por:

```css
        /* 3 — ARQUIVO (espresso): segundo pico escuro; dourado acende */
        .swa-archive-section { background: var(--ink); }
        .swa-archive-section .hist-head h2 { color: var(--cream); }
        .swa-archive-section .hist-head p { color: rgba(255,241,230,.8); }
        .swa-archive-section .hist-evo__step h3 { color: var(--cream); }
        .swa-archive-section .hist-evo__step p { color: rgba(255,241,230,.72); }
        .swa-archive-section .hist-evo__step + .hist-evo__step { border-left-color: rgba(255,241,230,.16); }
        .swa-archive-section .swa-record { background: rgba(255,241,230,.06); border-color: rgba(255,241,230,.16); }
        .swa-archive-section .swa-record__label { color: rgba(255,241,230,.6); }
        .swa-archive-section .swa-record__name { color: var(--page-accent); }
        .swa-archive-section .swa-record__value { color: rgba(255,241,230,.8); }
        .swa-archive-section .swa-coverage { color: rgba(255,241,230,.55); }
```

(d) No `@media (max-width: 960px)`, remover as linhas `.swa-context-copy { … }`, `.swa-memory-grid { … }`, `.swa-memory-grid .swa-media-slot:first-child { … }` (linhas ~677–679). No `@media (max-width: 560px)`, remover `.swa-memory-grid { … }` e `.swa-memory-grid .swa-media-slot:first-child { … }` (linhas ~701–702). No `@media (prefers-reduced-motion: reduce)`, remover a referência `.swa-media-slot > img` (a regra `animation: none;` fica só pra o que sobrar — se ficar vazia, remover a regra).

- [ ] **Step 6: Build**

Run:
```bash
npx vite build --outDir "${TEMP:-/tmp}/scw_awards_$$" --emptyOutDir && rm -rf "${TEMP:-/tmp}/scw_awards_$$"
```
Expected: `✓ built in …` sem erro.

- [ ] **Step 7: Verificar remoção da banda/contexto**

Run:
```bash
grep -nE "CEREMONY_PHOTO_SLOTS|ReservedMedia|swa-context|swa-memory|swa-media-slot|cream-deep" src/pages/institutional/HistoricoAwards.jsx
```
Expected: nenhuma linha.

- [ ] **Step 8: Commit**

```bash
git add src/pages/institutional/HistoricoAwards.jsx
git commit -m "feat(awards): arquivo em bloco escuro, sem banda de foto vazia"
```

---

### Task 4: Acordeões (S4) + validação final

A seção de acordeões (`hist-list-section`) e o CTA (`hist-cta`) já estão corretos e não mudam de dado. Esta task só confirma o ritmo (creme → marrom fecham a alternância), roda a validação de fechamento do CLAUDE.md §18 e verifica que não sobrou CSS órfão.

**Files:**
- Modify: (nenhuma edição de código esperada; só se o CSS órfão-scan achar sobra)

**Interfaces:**
- Consumes: estado final das Tasks 1–3.
- Produces: página validada.

- [ ] **Step 1: Scan de CSS/JS órfão**

Run:
```bash
grep -nE "swa-chapter|swa-current|swa-context|swa-memory|swa-media-slot|swa-hero__roster|CATEGORY_TONE|winnerPhoto|CategoryWinnerCarousel|CEREMONY_PHOTO_SLOTS|ReservedMedia|SCENE_PHOTO_FILE|activeIndex" src/pages/institutional/HistoricoAwards.jsx
```
Expected: nenhuma linha. Se aparecer algo, remover a linha/bloco correspondente (é sobra) e re-rodar.

- [ ] **Step 2: Confirmar alternância de valor das 5 seções**

Run:
```bash
grep -nE "swa-hero \{|swa-results-section \{|swa-archive-section \{|hist-list-section \{|hist-cta \{" src/pages/institutional/HistoricoAwards.jsx
```
Expected: 5 linhas — hero `var(--ink)` (escuro), results `var(--cream)`, archive `var(--ink)`, list `var(--cream)`, cta `#5e3018` (marrom). Confirma escuro→creme→escuro→creme→marrom.

- [ ] **Step 3: Confirmar que só há link de Instagram (nunca embed)**

Run:
```bash
grep -nE "iframe|instagram.com/embed|blockquote class=\"instagram" src/pages/institutional/HistoricoAwards.jsx
```
Expected: nenhuma linha (só `postResultado` via `<a>`).

- [ ] **Step 4: Build final**

Run:
```bash
npx vite build --outDir "${TEMP:-/tmp}/scw_awards_$$" --emptyOutDir && rm -rf "${TEMP:-/tmp}/scw_awards_$$"
```
Expected: `✓ built in …` sem erro.

- [ ] **Step 5: Checklist §18 (reportar ao usuário)**

Confirmar por leitura/grep: (1) Home não tocada — só `HistoricoAwards.jsx` no `git status`; (2) flags de `App.jsx` não alteradas; (3) sem cor nova (só tokens/hex já usados no arquivo + paleta oficial); (4) sem sticker; (5) margens seguem `.wrap`; (6) sem elemento solto (medalha/pódio/link = funcionais); (7) fallbacks honestos ("Foto pendente", monograma); (8) responsivo 960/720/560 revisado; (9) build ok; (10) sem CSS órfão. Pedir conferência visual ao usuário (desktop + mobile).

- [ ] **Step 6: Commit (só se o Step 1 exigiu remoção)**

```bash
git add src/pages/institutional/HistoricoAwards.jsx
git commit -m "chore(awards): remove CSS orfao remanescente da reestruturacao"
```

- [ ] **Step 7: Push**

```bash
git push origin dev/site-completo
```

---

## Self-Review

**1. Spec coverage** (spec `2026-07-17-sweet-awards-ritmo-grade-resultados-design.md`):
- §5 S1 Hero (remove roster, teaser Grande Vencedor) → Task 2 ✓
- §5 S2 Resultados (grade estilo Em breve, link Instagram, combo destaque, 7 categorias, remove numeração 01–08, âncora `premiacao-atual`) → Task 1 ✓
- §5 S3 Arquivo escuro (funde contexto, remove banda 16:7, evolução retonada, recordes) → Task 3 ✓
- §5 S4 Acordeões (mantidos, sem mudança de dado) → Task 4 ✓
- §5 S5 CTA marrom (mantido) → intocado, confirmado no Task 4 Step 2 ✓
- §8 riscos: namespace `swa-result-*` sem colisão ✓; remoção limpa de CSS órfão → Task 4 Step 1 ✓; estado `activeIndex` removido → Task 1 Step 3 ✓; build em temp → todas as tasks ✓

**2. Placeholder scan:** sem TBD/TODO; todo passo tem código ou comando exato. ✓

**3. Type consistency:** `firstPlaceNames(winners)` definido na Task 1, usado na Task 2. `comboScene` e `otherScenes` derivados de `scenes` no corpo. `AwardsHero({onExplore, comboScene})` — assinatura casada entre Task 2 Step 1 (def) e Step 2 (chamada). `ResultCard`/`ComboResultCard`/`ResultSceneImg`/`ResultPostLink` definidos e usados na Task 1. `Podium`/`WinnerLogo` reusados sem mudança de assinatura. ✓
