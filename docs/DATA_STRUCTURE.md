# DATA_STRUCTURE.md — Organização centralizada de conteúdo

> **Status deste documento:** proposta de arquitetura de dados (alvo pós-refatoração).
> Descreve como o conteúdo do site Sweet & Coffee Week **deveria** estar organizado em
> `src/data/`, quais dados hoje estão **hardcoded em componentes** e devem migrar, e como
> cada grupo se mapeia para o que **já existe** na pasta.
>
> **Convenção de marcação usada aqui:**
> - **[ATUAL]** — arquivo/estrutura que já existe no repositório hoje.
> - **[PROPOSTO]** — arquivo/estrutura que ainda não existe; alvo desta organização.
> - **[MIGRAR]** — conteúdo hoje hardcoded em `.jsx` que deve ser movido para `src/data/`.
>
> Regra de ouro (herdada do `CLAUDE.md` §16): **o código em `src/data/` é a fonte da
> verdade.** `ACERVO.md` é transcrição legível; se divergir, vale o código — e atualiza-se
> o `ACERVO.md`. Nada de inventar dado, ranking fake ou logo inexistente.

---

## 1. Por que centralizar

Hoje `src/data/` já é o ponto forte do projeto: **13 arquivos**, base histórica robusta,
`resolveParticipant` com fallback de iniciais que nunca inventa logo, e o adapter
`sweetEditionsCompat` cruzando fontes. O problema não é a pasta — é que **algumas ilhas de
conteúdo escaparam** para dentro de componentes `.jsx` (depoimentos, cards da Home,
marcos de Curiosidades) e que **constantes de configuração** (canais, navegação, metadados
sociais) estão duplicadas por vários arquivos.

O objetivo desta organização é que **cada tipo de conteúdo tenha um lar único e óbvio**:
editar um depoimento, trocar o handle do Instagram ou ajustar um passo do "como participar"
deve ser 1 edição em 1 arquivo de dados — nunca caçar a string dentro do JSX de uma página
de 500+ linhas.

Grupos-alvo propostos:

| Grupo | Papel | Melhor formato |
|---|---|---|
| `data/editions` | Edições do festival (1–16) + assets por edição | mapa por code + resolvers |
| `data/participants` | Participantes Lovers + assets/logos | mapa por slug + resolver |
| `data/awards` | Sweet Awards: categorias, pódios, histórico | array por edição + cálculos puros |
| `data/media` | Galerias, fotos de combos, cards de mídia/imprensa | arrays de objetos por contexto |
| `data/sponsors` | Apoiadores/patrocinadores + cotas de apoio | array de objetos + tiers |
| `data/stats` | Números do festival, métricas, rankings | objeto/derivações puras |
| `data/navigation` | Rotas, menu, rodapé | array de objetos |
| `data/siteContent` | Copy institucional reutilizável (steps, depoimentos, CTAs) | mapa por página/seção |

> **Nota de escopo:** os nomes acima são **grupos conceituais**. Na prática, `src/data/` é
> plano (sem subpastas) e assim deve permanecer, para não quebrar os imports existentes.
> Cada "grupo" vira **um ou mais arquivos** `data/<nome>.js`. A seção 4 lista o nome de
> arquivo concreto proposto para cada um.

---

## 2. Inventário atual de `src/data/` [ATUAL]

Os 13 arquivos que já existem e devem permanecer como base:

| Arquivo | Grupo | O que guarda |
|---|---|---|
| `sweetCoffeeHistory.js` | editions / awards | **Base oficial das 16 edições** (inclui Lovers). Fonte de verdade histórica. |
| `loversAwardsResults.js` | awards | Pódios da 16ª edição (Lovers 2026.1). Base histórica traz esses pódios vazios de propósito. |
| `sweetEditionsCompat.js` | editions | **Adapter** oficial→legado; cruza fontes para 2026.1 e expõe `sweetEditions`. |
| `sweetHistoryStats.js` | stats | **Cálculos puros** (rankings, evolução de categorias) derivados da base. |
| `sweetHistory.js` (antigo) | editions | Base antiga de 15 edições — **legado a migrar** (ainda referenciada por algumas páginas). |
| `participants.js` | participants | 21 participantes da edição Lovers (slugs congelados — ver §5). |
| `participantAssets.js` | participants | `resolveParticipant` + fallback de iniciais. Nunca inventa logo. |
| `editionAssets.js` | editions | Logos por edição (`EXISTING_MARKS` mapeado por code; hoje aponta caminhos ainda não entregues + `TEN_YEARS_SEAL`). |
| `editions.js` | editions | Config/estrutura de edições. |
| `sweetAwards.js` | awards | Config das categorias/premiação. |
| `supportMetrics.js` | sponsors / stats | Métricas de apoio (usadas em Apoiar). |
| `pesquisaLovers.js` | siteContent | Conteúdo/estrutura da página Pesquisa. |
| `homeGalleries.js` | media | Galerias da Home. |
| `comboPhotos.js` | media | Fotos de combos (por slug). |

**Verdade sobre o `editionAssets.js`:** o `EXISTING_MARKS` já existe e mapeia `code → caminho`
(`/images/editions/<id>/logo.png`), mas os arquivos ainda **não foram entregues** no acervo.
O resolver reserva o espaço e devolve fallback editorial — comportamento correto, manter.
Quando os logos chegarem, basta preencher os caminhos; **não** mudar a assinatura do resolver.

---

## 3. Conteúdo hoje hardcoded que deve migrar [MIGRAR]

Estas são as **exceções** ao padrão do projeto — conteúdo real morando dentro de `.jsx`.
Devem sair para `src/data/` (só mover + importar; **não** reescrever o conteúdo).

| Constante | Onde está hoje | Grupo | Destino proposto |
|---|---|---|---|
| `TESTIMONIALS` | `Participar.jsx:51` (depoimentos reais) | siteContent | `data/testimonials.js` [PROPOSTO] |
| `STEPS` | `Participar.jsx:102` (como participar) | siteContent | `data/participarContent.js` [PROPOSTO] |
| `mediaCards` | `Home.jsx:63` (cards de imprensa/mídia) | media | `data/mediaContent.js` [PROPOSTO] |
| `STEPS` | `Home.jsx:29` (passos da Home) | siteContent | `data/homeContent.js` [PROPOSTO] |
| `STATS` | `Home.jsx:36` (números da Home) | stats | `data/homeStats.js` [PROPOSTO] ou `sweetHistoryStats.js` se derivável |
| `EVO_MARCOS` | `Curiosidades.jsx:47` (evolução/marcos) | siteContent | `data/curioContent.js` [PROPOSTO] |
| `MOMENTOS` | `Curiosidades.jsx:55` (momentos marcantes) | siteContent | `data/curioContent.js` [PROPOSTO] |

Além do conteúdo, há **constantes de configuração duplicadas** que também devem centralizar
(não são `src/data/` puro — são config — mas resolvem a mesma dor de "N cópias"):

| Constante | Ocorrências hoje | Destino proposto |
|---|---|---|
| `INSTAGRAM_URL` / handle | 4× (`SiteFooter.jsx:6`, `Participar.jsx:20`, `Apoiar.jsx:21`, `Contato.jsx:13`) | `src/config/channels.js` [PROPOSTO] |
| Lógica clipboard→Instagram | 3× (`Participar.jsx`, `Apoiar.jsx`, `SiteFooter.jsx`) | `src/hooks/useContactForm.js` [PROPOSTO] (consome `channels.js`) |

> ⚠️ **Home é protegida (`CLAUDE.md` §9).** Mover uma `const` de dados da Home para
> `src/data/` **não altera layout** e é permitido em princípio, mas se houver qualquer
> dúvida sobre "não alterar a Home", migrar primeiro **Participar** e **Curiosidades** e
> deixar a Home por último, validando que o render fica idêntico.

---

## 4. Grupos propostos — detalhe por grupo

Para cada grupo: o que guarda, o formato recomendado, campos sugeridos, o que migra do JSX,
e como facilita a manutenção.

### 4.1 `data/editions` — edições do festival

- **O que guarda:** as 16 edições (2016 → 2026.1 Lovers): identidade, período, tema, cidade,
  contagem de participantes, referência ao logo da edição.
- **Formato:** **mapa por `code`** (`'2016'`, `'2017.1'`, …, `'2026.1'`) + funções resolver.
  Mapa por code (e não array por índice) porque as edições são referenciadas por código em
  awards, assets e stats — a chave estável evita bugs de índice.
- **Arquivos [ATUAL]:** `sweetCoffeeHistory.js` (verdade), `sweetEditionsCompat.js` (adapter),
  `editions.js` (config), `editionAssets.js` (logos + selo 10 anos).
- **Campos sugeridos por edição:**
  `code`, `label` (nome público), `year`, `season` (`1`|`2`|`unica`|`lovers`), `theme`,
  `city`, `participantsCount`, `hasAwards` (bool — 2016–2018 sem premiação), `logoPath`
  (via `editionAssets`), `heroPhoto`/`gallery` (via `data/media`).
- **Migração:** nada de novo aqui — este grupo já está bem estruturado. **Ação pendente:**
  aposentar `sweetHistory.js` (base antiga de 15 edições) migrando as páginas que ainda a
  usam (Edições/Histórico) para `sweetCoffeeHistory.js` via o adapter.
- **Manutenção:** adicionar/editar uma edição = 1 entrada na base oficial; logos entram só
  preenchendo `EXISTING_MARKS[code]` quando o acervo entregar.

### 4.2 `data/participants` — participantes Lovers

- **O que guarda:** os 21 participantes da edição Lovers (nome, slug, marca/logo, combos).
- **Formato:** **array de objetos + índice por slug**; resolver dedicado para assets.
- **Arquivos [ATUAL]:** `participants.js` (dados), `participantAssets.js` (`resolveParticipant`
  + fallback de iniciais).
- **Campos sugeridos:** `slug` (**congelado** — ver §5), `name`, `logo` (resolvido), `combos[]`,
  `awards[]` (referência cruzada, não duplicar pódio).
- **Migração:** nenhuma. Grupo já correto.
- **Manutenção:** logo real via `resolveParticipant`; ausência de logo cai em iniciais — nunca
  inventar. **Não renomear slugs** (QR Codes impressos dependem deles).

### 4.3 `data/awards` — Sweet Awards

- **O que guarda:** as 8 categorias oficiais + históricas computadas, pódios por edição,
  trilhas Júri Técnico / Sweet Lovers, empates preservados, nota de 2016–2018 sem premiação.
- **Formato:** **array por edição** para o histórico + **cálculos puros** separados.
- **Arquivos [ATUAL]:** `sweetAwards.js` (config categorias), `sweetCoffeeHistory.js` (histórico
  por edição), `loversAwardsResults.js` (pódios da atual, 2026.1), `sweetHistoryStats.js`
  (rankings/derivações).
- **Regra de dados (cruzar fontes, não inventar) — herdada do `CLAUDE.md` §12:**
  - descrições das categorias → `sweetCoffeeHistory.js` (edição 2026.1);
  - **pódios da edição atual → `loversAwardsResults.js`** (na base histórica estão vazios de
    propósito);
  - histórico das demais edições → `sweetCoffeeHistory.js`.
- **Campos sugeridos por pódio:** `edition` (code), `category`, `track` (`juri`|`lovers`),
  `positions[]` (com empates), `participantSlug` (liga a `data/participants`).
- **Migração:** nenhuma de conteúdo. **Cuidado:** não mover pódios da atual para a base
  histórica "para unificar" — a separação é intencional.
- **Manutenção:** o selo dourado de 1º lugar é a única peça celebrativa (codifica colocação,
  não é sticker). Novo ranking = função pura em `sweetHistoryStats.js`, nunca número cravado.

### 4.4 `data/media` — galerias, fotos e cards de mídia

- **O que guarda:** galerias da Home, fotos de combos por slug, e os **cards de mídia/imprensa**
  hoje hardcoded na Home.
- **Formato:** **arrays de objetos por contexto** (uma lista por galeria/seção).
- **Arquivos [ATUAL]:** `homeGalleries.js`, `comboPhotos.js`.
- **Arquivo [PROPOSTO]:** `data/mediaContent.js` para receber `mediaCards` (`Home.jsx:63`).
- **Campos sugeridos:**
  - galeria: `id`, `title`, `photos[]` (`{ src, alt, ratio }`);
  - combo: `slug`, `main` (`/images/combos/<slug>/main.jpg`), `alt`;
  - card de mídia: `title`, `outlet`, `url`, `date`, `thumb`, `alt`.
- **Migração [MIGRAR]:** `mediaCards` → `data/mediaContent.js`.
- **Manutenção:** trocar uma matéria/foto de imprensa = editar um objeto; `alt` sempre
  presente; sem hotlink externo (regra §7 do `CLAUDE.md`). Fotos pesadas do acervo
  (`fotos-combos-site/`) são **assets**, não dados — não referenciar daqui.

### 4.5 `data/sponsors` — apoiadores e cotas de apoio

- **O que guarda:** oportunidades/benefícios de apoio (página Apoiar) e, quando houver,
  marcas apoiadoras com presença no festival.
- **Formato:** **array de objetos** para cotas/benefícios; **array de objetos** para marcas.
- **Arquivos [ATUAL]:** `supportMetrics.js` (métricas de apoio já usadas em Apoiar).
- **Arquivo [PROPOSTO]:** `data/sponsors.js` se/quando surgirem marcas apoiadoras nomeadas
  (hoje **não há** essa lista — não inventar; manter só as métricas/benefícios reais).
- **Campos sugeridos:**
  - cota/benefício: `id`, `title`, `description`, `perks[]`;
  - marca (futuro): `name`, `logo`, `tier`, `url`.
- **Migração:** nenhuma imediata; se a Apoiar tiver benefícios hardcoded no JSX, movê-los
  para `supportMetrics.js` ou `data/sponsors.js`.
- **Manutenção:** ajustar cotas de apoio sem tocar no JSX da página Apoiar; benefícios
  comerciais versionados num só lugar.

### 4.6 `data/stats` — números, métricas e rankings

- **O que guarda:** os "Números" do festival, métricas agregadas, rankings criativos de
  Curiosidades — tudo **derivado** da base histórica sempre que possível.
- **Formato:** **funções/derivações puras** (preferir) + objeto de números fixos quando o
  dado não é derivável.
- **Arquivos [ATUAL]:** `sweetHistoryStats.js` (cálculos), `supportMetrics.js` (apoio).
- **Arquivos [PROPOSTO]:** `data/homeStats.js` para o `STATS` da Home, **se** não for
  derivável de `sweetHistoryStats.js`. Se for derivável, calcular lá e **não** cravar número.
- **Campos sugeridos:** `label`, `value`, `suffix`, `source` (edição/base de origem).
- **Migração [MIGRAR]:** `STATS` (`Home.jsx:36`) → derivar em `sweetHistoryStats.js` ou
  `data/homeStats.js`.
- **Manutenção:** número que muda com nova edição se recalcula sozinho; menos risco de
  "23 participantes" desatualizado escondido no JSX. Rótulos institucionais em Nexa
  (`font-sans`/`font-slab`), **nunca** mono (`CLAUDE.md` §5).

### 4.7 `data/navigation` — rotas, menu e rodapé

- **O que guarda:** itens do menu principal, links do rodapé, e o mapa rota→label→acento.
- **Formato:** **array de objetos** (ordem = ordem de exibição).
- **Arquivos [ATUAL]:** hoje **não existe** — os itens de menu/rodapé vivem espalhados em
  `nav.jsx` e `SiteFooter.jsx`, e o acento por rota vive em `body.route-*` (`styles.css`).
- **Arquivo [PROPOSTO]:** `data/navigation.js`.
- **Campos sugeridos:** `route` (hash), `label`, `accent` (token `--page-accent`),
  `inMenu` (bool), `inFooter` (bool), `external` (bool).
- **Migração [MIGRAR]:** extrair a lista de links de `nav.jsx`/`SiteFooter.jsx` para cá.
  **Não** mover a definição CSS de `--page-accent` (essa continua em `styles.css`); o campo
  `accent` aqui é só referência/documentação da rota.
- **Manutenção:** adicionar uma página ao menu = 1 entrada; ordem e presença em menu/rodapé
  num só lugar. **Não** mexer nas rotas congeladas dos QR Codes (§5) sem decisão explícita.

### 4.8 `data/siteContent` — copy institucional reutilizável

- **O que guarda:** blocos de texto/estrutura de páginas: passos "como participar",
  depoimentos, marcos e momentos de Curiosidades, CTAs recorrentes.
- **Formato:** **mapa por página/seção** (um export por página) ou arquivos pequenos por página.
- **Arquivos [ATUAL]:** `pesquisaLovers.js` (já segue este padrão para a Pesquisa).
- **Arquivos [PROPOSTO]:** `data/testimonials.js`, `data/participarContent.js`,
  `data/homeContent.js`, `data/curioContent.js`.
- **Campos sugeridos:**
  - depoimento: `author`, `role`, `quote`, `photo?`;
  - step: `n`, `title`, `text`;
  - marco/momento: `year`/`edition`, `title`, `text`.
- **Migração [MIGRAR]:** `TESTIMONIALS`, `STEPS` (ambas as páginas), `EVO_MARCOS`, `MOMENTOS`
  (ver tabela §3).
- **Manutenção:** editar um depoimento ou passo = 1 objeto; páginas viram composição de
  layout + dados, e a copy institucional deixa de ser refém de arquivos `.jsx` gigantes
  (`Home.jsx` ~852 linhas, `Apoiar.jsx` ~524, `Participar.jsx` ~517).

---

## 5. Restrições invioláveis ao mexer em dados

Antes de renomear qualquer coisa, reler `CLAUDE.md`. Em especial:

- **Slugs de participantes são congelados.** URLs de QR Code impressas
  (`#/lovers/combos/:slug` e `#/lovers/awards`) **não podem mudar**. Não renomear slugs em
  `participants.js`; lista dos 21 slugs congelados na seção 9 do `CODE_REVIEW_GRAPH.md`.
- **Rotas congeladas.** Não trocar hash routing por path routing; não renomear rota de combo
  ou de awards. Mudança em rota/slug exige **parar e avisar**.
- **Não inventar dado.** Sem ranking fake, sem logo inventado, sem esconder ausência de dado.
  Ausência = fallback editorial claro (iniciais, "Foto pendente", moldura), nunca imagem
  externa aleatória.
- **`sweetHistory.js` é legado** (15 edições). A verdade é `sweetCoffeeHistory.js` (16). Ao
  migrar páginas, apontar para a base oficial via `sweetEditionsCompat`.
- **Fonte da verdade é o código.** Ao editar qualquer dado, atualizar também o `ACERVO.md`
  se o resumo legível ficar defasado.

---

## 6. Mapa consolidado: arquivo atual → grupo proposto

| Arquivo `src/data/` [ATUAL] | Grupo proposto | Ação |
|---|---|---|
| `sweetCoffeeHistory.js` | editions + awards | manter (verdade) |
| `sweetEditionsCompat.js` | editions | manter (adapter) |
| `editions.js` | editions | manter |
| `editionAssets.js` | editions | manter; preencher logos quando o acervo entregar |
| `sweetHistory.js` | editions | **aposentar** (migrar consumidores p/ base oficial) |
| `participants.js` | participants | manter (slugs congelados) |
| `participantAssets.js` | participants | manter (resolver + fallback) |
| `sweetAwards.js` | awards | manter |
| `loversAwardsResults.js` | awards | manter (pódios da atual) |
| `sweetHistoryStats.js` | stats (+awards) | manter; receber `STATS` derivável da Home |
| `supportMetrics.js` | sponsors / stats | manter |
| `homeGalleries.js` | media | manter |
| `comboPhotos.js` | media | manter |
| `pesquisaLovers.js` | siteContent | manter (já é o padrão-alvo) |

| Conteúdo hardcoded [MIGRAR] | Origem | Destino proposto [PROPOSTO] |
|---|---|---|
| `TESTIMONIALS` | `Participar.jsx:51` | `data/testimonials.js` |
| `STEPS` (Participar) | `Participar.jsx:102` | `data/participarContent.js` |
| `mediaCards` | `Home.jsx:63` | `data/mediaContent.js` |
| `STEPS` (Home) | `Home.jsx:29` | `data/homeContent.js` |
| `STATS` (Home) | `Home.jsx:36` | `sweetHistoryStats.js` (derivar) ou `data/homeStats.js` |
| `EVO_MARCOS` | `Curiosidades.jsx:47` | `data/curioContent.js` |
| `MOMENTOS` | `Curiosidades.jsx:55` | `data/curioContent.js` |

| Config duplicada [MIGRAR] | Origem | Destino proposto [PROPOSTO] |
|---|---|---|
| `INSTAGRAM_URL` / handle | 4× (footer + 3 páginas) | `src/config/channels.js` |
| Lógica clipboard→Instagram | 3× (Participar, Apoiar, footer) | `src/hooks/useContactForm.js` |
| Itens de menu/rodapé | `nav.jsx`, `SiteFooter.jsx` | `data/navigation.js` |

---

## 7. Como isso facilita a manutenção (resumo)

1. **Uma fonte por conceito.** Depoimento, número, canal, item de menu — cada um em 1 lugar.
   "Trocar o Instagram do site" = 1 edição em `channels.js`, não 4.
2. **Páginas ficam magras.** `.jsx` volta a ser layout + composição; a copy institucional e os
   dados moram em `src/data/`, seguindo o padrão que o projeto já domina bem.
3. **Números que se recalculam.** Preferir derivação pura em `sweetHistoryStats.js` a cravar
   valores — nova edição atualiza a Home/Curiosidades sem caça a strings.
4. **Assets e dados separados.** Logos/fotos são resolvidos por `*Assets.js` com fallback que
   nunca inventa; os dados só referenciam caminhos/slugs.
5. **Segurança preservada.** Slugs e rotas congeladas ficam num arquivo de dados versionado e
   auditável, reduzindo o risco de renomear algo que quebra um QR Code impresso.

> **Ao concluir cada migração:** rodar `npm run build`, confirmar que a página renderiza
> idêntica, e atualizar este documento + `ACERVO.md` se a estrutura de dados mudar
> (`CLAUDE.md` §19 e §16).
