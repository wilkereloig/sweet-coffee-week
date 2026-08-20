# Sweet Awards — reestruturação de ritmo + grade de resultados estilo "Em breve"

**Data:** 2026-07-17
**Branch:** `dev/site-completo`
**Arquivo alvo:** `src/pages/institutional/HistoricoAwards.jsx` (componente `HistoricoAwardsPage`)
**Rotas públicas (congeladas, NÃO mudam):** `/sweet-awards`, `/historico-sweet-awards`

---

## 1. Problema

A página Sweet Awards (`HistoricoAwards.jsx`) está **sem ritmo e sem dinamismo**. Diagnóstico:

1. **Miolo é parede de creme.** Sequência de fundos: escuro → creme → creme → `cream-deep` (quase igual) → creme → marrom. Três/quatro seções creme seguidas sem alternância. Um único pico visual (o card escuro do carrossel), depois planície.
2. **As 8 categorias aparecem 3× seguidas** — roster `01–08` na hero, `01–08` na nav de abas, `01` no card. Hero-roster e nav são a mesma lista colada, sem informação nova.
3. **Numeração decorativa** em 4 tratamentos (roster, nav, card, evolução). Categoria de premiação não é sequência → `01 Melhor Combo` é enfeite.
4. **Banda de foto vazia 16:7** no centro (`swa-context-section` → `CEREMONY_PHOTO_SLOTS`): placeholder sem asset, zona morta que despenca o momentum.
5. **Três `hist-head` idênticos** (título centralizado + sub) = metrônomo previsível.
6. **Acento dourado `#F8B511` lava sobre creme** — só acende no escuro (hero, card). 4 das 6 seções perdem o acento.
7. **Depois do card, tudo tem o mesmo peso** — records, evolução, acordeões: claros, bordinha `paper-line`, sem segundo pico.

## 2. Objetivo

- Seção de resultados da última edição (Lovers 2026.1) passa a funcionar como a página **Em breve** (`EmBreve.jsx`): **cards de resultado que linkam pro Instagram** (foto real + pódio + barra "Ver no Instagram"), **nunca embed**.
- Reestruturar as demais seções pra devolver ritmo: alternância de valor claro/escuro, matar zona morta, desduplicar listas, variar cabeçalhos.
- **Preservar todo conteúdo e dado real.** Nada inventado.

## 3. Decisões travadas (brainstorming)

- **Instagram:** cards que linkam (igual `EmBreve`), não embed. Regra do projeto "nunca embed" mantida.
- **Ambição:** reestruturar de verdade — reordenar/fundir/cortar seções, manter todo dado real.
- **Grande Vencedor:** teaser na hero (tira), card cheio na seção Resultados. Sem eco.

## 4. Fontes de dado (verificadas — NÃO inventar)

Todas já existem e já são consumidas por `EmBreve.jsx` / `HistoricoAwards.jsx`:

- `getCurrentEditionScenes()` (`src/data/sweetHistoryStats.js`) — 8 cenas da Lovers 2026.1, pódios cruzados (`sweetCoffeeHistory.js` × `loversAwardsResults.js` por `key`), `winners` achatados `[{place,pos,name}]`, `description`, `postResultado`.
- `scene.postResultado` — **8 URLs reais de post de resultado no Instagram** confirmadas em `sweetCoffeeHistory.js` (edição 2026.1), uma por categoria.
- `getPodiumTotals()`, `getAwardWins()`, `getDistinctCategoryCount()`, `getResultsCoverage()` — recordes de participantes.
- `sweetEditions` (`sweetEditionsCompat`) — histórico 2016–2025 pros acordeões.
- `resolveParticipant` (logo/fallback monograma), `editionMark` (logo da edição).
- Fotos de combo por categoria: `/images/combos/<slug>/main.jpg` (+ frames `photo-02/03` pras vitórias múltiplas do O Maestro Café).

**Único asset pendente:** foto de cerimônia/celebração → por isso a banda vazia é **removida**, não preenchida.

## 5. Estrutura nova (5 seções, alternância de valor)

Ordem e fundo: **escuro → creme → escuro → creme → marrom**.

### Seção 1 — HERO (espresso `--ink`, escuro)
- Split 2 colunas desktop, 1 coluna mobile (reflow **960px**, escala canônica §17).
- **Esquerda:** H1 `Sweet Awards` + `span` dourado itálico `Lovers 2026.1` (mantém), lead curto, CTA `Conhecer os vencedores →` (scroll suave até `#premiacao-atual`).
- **Direita:** REMOVE o roster `01–08`. Entra **teaser do Grande Vencedor**: tira com medalha `1º` + `Melhor Combo` + logo real (`resolveParticipant`) + nome (O Maestro Café) + micro-link "Ver no Instagram" (`postResultado` da cena `melhor_combo`).
- **Zona de segurança** header↔hero mantida (`padding-top: var(--hero-content-start)`, §4.1).
- Motion: `motion-stagger` na entrada, foto do teaser com settle (`transform: scale`), respeita `prefers-reduced-motion`.

### Seção 2 — RESULTADOS (creme) — grade estilo Em breve
- **Substitui** o carrossel escuro de aba única inteiro (`CategoryWinnerCarousel`, `swa-chapter-nav`, `swa-chapter`).
- Cabeçalho **alinhado à esquerda** (quebra o metrônomo de heads centralizados): `Todos os vencedores, categoria por categoria` + linha "cada card abre o post do resultado no Instagram".
- **Card Grande Vencedor** (Melhor Combo, largo): foto real + medalha `1º` + descrição + pódio completo (empates preservados) + barra **"Ver no Instagram"**.
- **Grade das 7 categorias restantes:** card = foto real + título + descrição + pódio + barra "Ver no Instagram". Grid `repeat(auto-fit, minmax(min(280px,100%), 1fr))`, reflow 1 coluna no mobile.
- Reaproveita o padrão do `EmBreve` (`eb-combo`/`eb-cat`/`eb-podium`/`PostLink` → renomeados no namespace da página, ex.: `swa-result-*`). Logos reais + fallback monograma; foto quebrada → "Foto pendente".
- **Remove a numeração decorativa 01–08** das categorias.
- Âncora `id="premiacao-atual"` mantida (alvo dos CTAs).

### Seção 3 — ARQUIVO (espresso escuro) — segundo pico
- **Funde** a antiga `swa-context-section` (só a copy) + `swa-archive-section`. **Remove `CEREMONY_PHOTO_SLOTS`, `ReservedMedia`, `swa-memory-grid` e a banda 16:7 vazia.**
- **Abertura:** copy de contexto ("Uma premiação feita de experiência e encontro") como lead do bloco escuro.
- **Marcos da evolução:** 4 passos (`EVOLUTION`) em tira horizontal sobre escuro, numeração `1–4` mantida (sequência real da evolução da premiação — uso legítimo de ordinal). Retonar as cores de `--hl` pra contraste sobre escuro.
- **Recordes de participantes:** 3 cards (`podiumLeader`, `winsLeader`, `distinctCategories`) + linha de cobertura (`getResultsCoverage`). Sempre participante, nunca edição (§11). Cards adaptados pro fundo escuro (dourado acende).

### Seção 4 — ACORDEÕES por edição (creme)
- `EditionAccordion` mantido: `<details>` fechado por padrão, acessível, mais recente primeiro, exclui 2026.1 (já no destaque).
- Summary: logo da edição + código + tema + campeão Melhor Combo + contagem + badge de status.
- Trilhas (Júri Técnico / Sweet Lovers) preservadas, empates preservados, nota honesta 2016–2018 sem premiação.
- Sem mudança de dado — só respiro/alinhamento pra casar com o ritmo novo.

### Seção 5 — CTA (marrom `#5e3018`)
- Mantido: título + 2 botões (`Rever os vencedores 2026.1` → `#premiacao-atual`; `Ver edições do festival` → `/edicoes`). Fecha o gradiente de valor.

## 6. Regras respeitadas (CLAUDE.md / AGENTS.md)

- **§12 Sweet Awards:** identidade institucional (espresso `#2B1810` + creme + ouro `#F8B511`), NUNCA KV Lovers. Página pode ser alterada com pedido explícito (é o caso). Flags/rotas/dados oficiais intocados.
- **§3 paleta:** só tons oficiais; acento dourado via `--page-accent` (`body.route-historico-awards`). Sem cor nova.
- **§5 elementos soltos:** medalhas/pódio/selo 1º = funcionais (codificam colocação), não sticker. Remove numeração `01–08` decorativa das categorias.
- **§11 curiosidades:** recordes comparam participantes, nunca edições entre si.
- **§4/§4.1 margens + zona de segurança:** alinhamento ao menu (`--hm-gutter` / `.wrap`), hero respeita `--hero-content-start`.
- **§17 breakpoints:** escala 1080·960·720·560·420; reflow principal 960.
- **"nunca embed" Instagram:** só link pro post (`postResultado`).
- **Motion:** só `transform`/`opacity`/`filter`, sem layout shift, respeita `prefers-reduced-motion`; reusa/expande motion-system, sem lib nova.
- **URLs QR / flags de publicação:** não tocadas.

## 7. Fora de escopo (YAGNI)

- Sem embed real de Instagram (decisão travada).
- Sem foto de cerimônia (asset inexistente → banda removida, não preenchida).
- Sem mexer em `EmBreve.jsx`, `App.jsx` (flags/rotas), dados em `src/data/`.
- Sem mexer em Home/O Festival ou identidade Lovers.
- Sem renomear slugs/rotas.

## 8. Riscos / atenção

- **Namespace CSS:** o arquivo é 100% `<style>` inline. Ao portar padrões do `EmBreve` (`eb-*`), renomear pra `swa-result-*` pra não colidir com estilos globais nem com o que sobra. Cuidado com especificidade `.section`/`.cta` (aviso do frontend-design).
- **Remoção limpa:** ao cortar `CategoryWinnerCarousel`, `swa-chapter*`, `swa-chapter-nav`, `ReservedMedia`, `CEREMONY_PHOTO_SLOTS`, `swa-context-section`, `swa-memory-grid` — remover também o CSS órfão correspondente (não deixar regra morta).
- **Estado React:** `activeIndex`/`setActiveIndex` do carrossel somem; a grade é estática (sem estado de aba). Simplifica o componente.
- **Build:** `npx vite build` em pasta temp do sistema (nunca dentro da raiz — §build de verificação).

## 9. Validação (antes de finalizar)

1. Home não alterada. 2. Flags `App.jsx` não alteradas. 3. Sem cor nova. 4. Sem sticker. 5. Margens seguem a Home. 6. Sem elemento solto sem função. 7. Placeholders (acordeão/logo/foto) claros e honestos. 8. Desktop + mobile ok (reflow 960/720/560). 9. `npm run build` (temp externa). 10. Sem CSS órfão.
