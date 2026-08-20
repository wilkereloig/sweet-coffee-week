# Spec — Redesign da página Curiosidades ("dados que se movem", tratamento Direção E)

**Data:** 2026-07-07 · **Branch:** `worktree-curiosidades` · **Status:** aprovada pelo Wilke (mock Direção E)
**Mock de referência:** artifact `curiosidades-direcao-e.html` — scratchpad da sessão; serve de
referência visual, não de código a copiar. (A Direção D/v4 tinha o mesmo conteúdo com tratamento
alternado chocolate/creme + eyebrows; foi substituída pela E.)

## 1. Objetivo

Reconstruir `src/pages/institutional/Curiosidades.jsx` do zero. A página atual (cards de texto +
rankings estáticos) sai; entra uma página de **dados animados**: contadores que sobem, gráficos que
se desenham/crescem quando entram na tela, com **logos e fotos reais** do acervo. Conteúdo e visual
mudam juntos — não é polish, é reconstrução.

## 2. Decisões já tomadas (não reabrir)

- **Direção "dados animados" aprovada com tratamento E (anti-template)**. Direções B (cards
  editoriais) e C (explorador com filtros) rejeitadas — C especialmente por duplicar a linguagem
  interativa da página Edições. O tratamento E acrescenta, sobre a D:
  - **zero eyebrows/kickers** acima de títulos (reforça CLAUDE.md §5) — título abre a seção direto,
    com lead curto abaixo quando precisar;
  - **tema creme único na página inteira**, com **um só bloco chocolate deliberado** (a seção de
    homenagens, S3) — nada de alternância clara/escura seção a seção; as demais seções variam só
    dentro da família creme (`--cream` / `--cream-deep`);
  - **assimetria com hierarquia**: contadores como split assimétrico (número-herói gigante + lista
    empilhada), cards de Melhor Combo em grid 1.6fr+1fr+1fr (líder pesa mais);
  - **cada seção com família de layout própria** (split de stat, timeline, waffle+filmstrip,
    barras, cards hierárquicos) — nenhuma família repetida;
  - **zero em-dash** em texto visível da página (usar vírgula, ponto ou dois-pontos).
- **Edições não competem entre si** (rejeição registrada no CLAUDE.md §11, jul/2026). O gráfico de
  linha "participantes por edição" com pico/recorde foi rejeitado ("parece competição entre edições").
  Ranking/comparação só entre **participantes**. Linha do tempo só como **marcos/primeiras vezes**.
- **Fotos onde forem apropriadas** (pedido do Wilke): combos reais nas homenagens e nos vencedores de
  Melhor Combo, com legenda honesta quando a foto é do combo atual (não da vitória histórica).
- **Cores dos marcadores por superfície** (validadas com o validador de paleta do skill dataviz):
  - seção com fundo **creme** → variantes **deep** (`--yellow-deep #D9960A`, `--coral-deep #C13E25`,
    `--pink-deep #D63648`, `--cyan-deep #149FC0`) — todas passam banda de luminância, croma, CVD;
  - seção com fundo **chocolate** (`--choco-deep`) → tons claros (`--yellow`, `--coral`, `--pink`,
    `--cyan`) — passam contraste ≥3:1 e CVD; luminância levemente fora da banda, mitigada com labels
    diretos + gaps (não cunhar cor nova — CLAUDE.md §3).
  - Identidade nunca por cor sozinha: labels de texto sempre presentes; valores em tinta
    (`--ink`/`--cream`), nunca na cor da série.

## 3. Estrutura da página (ordem das seções)

Hero institucional padrão da rota (acento amarelo `#F8B511`, `--hero-content-start`, sem eyebrow).
Página inteira em tema creme; **só S3 é bloco chocolate**. Sem eyebrow em nenhuma seção — H2 abre
direto, lead curto abaixo quando precisar.

### S1 — "O festival em números" (creme)
Split assimétrico (~1.1fr/1fr): à esquerda, número-herói **10** gigante (count-up, `--yellow-deep`,
clamp até ~220px) com legenda "anos de festival"; à direita, lista empilhada com hairlines
(`--paper-line`) entre itens: **16** edições realizadas · **21** marcas na edição Lovers · **6×**
marcas escolheram reviver a mesma edição. Mobile: empilha em coluna.

### S2 — "Os marcos que mudaram o festival" (creme, tinte `--cream-deep`)
Timeline horizontal de **5 marcos** (linha preenche com scaleX ~1,6s; itens revelam em stagger):
1. **2016 — A estreia** (nasce o festival em Natal);
2. **2019.1 — Nasce o Sweet Awards** (edição Pâtisserie Francesa cria a premiação);
3. **2020.2 — Duas trilhas de júri** (Júri Técnico + Sweet Lovers);
4. **2021.1 — A única Menção Honrosa** da história;
5. **2026.1 — Lovers: a década revivida** (comemorativa de 10 anos, 21 marcas).
⚠️ **Conferir as datas dos marcos 3 e 4 em `sweetCoffeeHistory.js` antes de publicar** — no mock
foram derivadas do histórico transcrito; a base é a verdade (CLAUDE.md §16).
Sem número de participantes por edição. Mobile: empilha em coluna, sem trilho.

### S3 — "A edição que a Lovers mais quis reviver" (o ÚNICO bloco chocolate da página)
**Gráfico de unidades**: 1 chip circular por marca (logo real de `participants.js`/`resolveParticipant`),
agrupados em linhas pela edição homenageada, ordenadas por contagem:
Sweet Trip 6 · Sweet Celebration 5 · Sweet Music 4 · Contos de Fadas 3 · Sweet Series 1 · Filmes 1 ·
Terras Potiguares 1. Dot categórico colorido só nas 4 primeiras linhas (amarelo/coral/rosa/ciano);
linhas de escolha única com dot neutro. Chips revelam em stagger (~60ms). Tooltip por chip:
"Marca · tema escolhido". Contagem à direita (tabular-nums).
**Filmstrip abaixo**: os 6 combos reais que reviveram a Sweet Trip (fotos `main.jpg` de
`/images/combos/<slug>/`), cards 4:5 com legenda "Marca · tema". **Olí Gastrô e Casa de Taipa não
têm pasta em `/images/combos/`** → fallback editorial "Foto do combo pendente" (CLAUDE.md §8).
Nota da seção: 8 das 15 edições anteriores não foram escolhidas por ninguém, incluindo a
Pâtisserie Francesa (2019.1), que criou o Sweet Awards.

### S4 — "Quem mais venceu em dez anos de Sweet Awards" (creme)
Barras horizontais animadas (transform scaleX, nunca width) — **vitórias de 1º lugar** por
participante, somando Júri Técnico + Sweet Lovers, 2019–2026.1. Cada linha: chip de marca (logo real
p/ quem está na Lovers; iniciais p/ marcas históricas — Bocaditos, Marlon Vinicius, Cássia Ribeiro),
nome, barra (líder em `--yellow-deep`, demais em `--coral-deep` com opacidade decrescente), valor
count-up. **Números do mock são prévia manual — recalcular via `getAwardWins()` de
`sweetHistoryStats.js` na implementação.** Empates preservados (empate real em 5º no mock).
Tooltip por linha. Top ~7 com empates; sem "ver todos".

### S5 — "Melhor Combo: vitórias repetidas" (creme, tinte `--cream-deep`)
Grid hierárquico **1.6fr + 1fr + 1fr** (líder pesa mais; mobile empilha): **Bocaditos 4×**
(2019.2, 2020.1, 2020.2-Júri, 2021.2-Júri) · **O Maestro Café 2×** · **Mr. Cupcake 2×** —
⚠️ recontar na base na implementação. Cada card:
- foto do combo **atual** na Lovers com legenda explícita "Foto: combo atual na Lovers 2026.1"
  (a foto não é da vitória histórica — a legenda diz isso);
- Bocaditos (fora da Lovers, sem asset): moldura editorial "Marca histórica — sem registro de combo
  no acervo digital";
- fileira de "carimbos" (1 chip por vitória, pop em stagger ~120ms), tooltip com a edição da vitória;
- contador do total.

### S6 — CTA final padrão institucional (mesmo componente das outras páginas).

## 4. Regras transversais

- **Animações**: disparo por IntersectionObserver (threshold ~0.3, uma vez só). Reaproveitar/estender
  `useRevealOnScroll` se couber; senão hook local na página. `prefers-reduced-motion: reduce` →
  estado final direto, sem animação (obrigatório em TODAS as animações). Só `transform`/`opacity` —
  nunca animar width/height/margin. Easing `--ease-out` do sistema; nada de bounce.
- **Tooltip**: um componente único reutilizado (posição via mouse, `position:fixed`, some em
  mouseleave). Conteúdo também acessível sem hover (aria-label nos chips).
- **Chips de marca**: logo real via `resolveParticipant()` (object-fit contain, fundo creme-card,
  borda sutil); fallback = iniciais (`initialsOf`). Nunca inventar logo (CLAUDE.md §7).
- **Fotos**: `/images/combos/<slug>/main.jpg` com `loading="lazy"`, object-fit cover, aspect-ratio
  fixo; fallback editorial textual quando não existir. Não usar thumbs embutidas — isso foi só pro mock.
- **Dados**: tudo derivado de `sweetHistoryStats.js` / `sweetCoffeeHistory.js` /
  `loversAwardsResults.js` / `participants.js` em runtime — **nenhum número hardcoded** exceto os
  contadores institucionais (16/10/21) se já não houver derivação pronta. Mapa homenagem→edição vem
  de `PARTICIPANTS[].edition` (normalizar "Contos de Fada"/"Contos de Fadas" e "Filmes"). Se precisar
  de agregações novas (ex.: vitórias por categoria específica p/ Melhor Combo), adicionar função em
  `sweetHistoryStats.js`, não calcular inline na página.
- **Layout**: margens da Home (`.wrap` 1280px / clamp(20px,4vw,56px)); hero com
  `--hero-content-start`; breakpoints da escala canônica (960 desktop→tablet; 560 pros grids finos).
- **Nomenclatura** (CLAUDE.md §2): nunca "o Sweet"; "Sweet & Coffee Week", "o festival", "a edição".
- **Sem stickers, sem eyebrow-kicker acima de H1/H2, sem fonte mono em rótulos** (usar Nexa,
  caixa-alta + letter-spacing permitidos). Os "eyebrows" do mock viram rótulos Nexa conforme §5.
- **Identidades separadas**: página é institucional — tokens institucionais, nada de `--lovers-*`
  nem `.kv-lovers` (CLAUDE.md, "Duas identidades").

## 5. O que sai da página atual

Tudo — reconstrução. Em particular: seção "achados do acervo" em cards de texto, rankings de
recorrentes/pódios em tabela, evolução de categorias. O que sobrevive migra pro formato novo
(hall = barras; homenagens = unidades). `sweetHistoryStats.js` continua sendo a fonte — a API dele
não muda (páginas Awards também consomem `resolveParticipant`).

## 6. Fora de escopo

- Não mexer em Home, Edições, Awards, rotas, dados históricos (além de eventuais funções novas de
  agregação em `sweetHistoryStats.js`).
- Não instalar biblioteca de gráficos — tudo CSS/SVG/JS puro como no mock.
- Não alterar `--page-accent` da rota (amarelo já definido).

## 7. Critérios de aceite

1. `npm run build` limpo.
2. Desktop + tablet + mobile sem overflow lateral; timeline empilha no mobile.
3. `prefers-reduced-motion` mostra tudo no estado final.
4. Nenhum número divergente da base (`sweetHistoryStats.js` recalcula tudo; datas dos marcos
   conferidas em `sweetCoffeeHistory.js`).
5. Logos: reais pra quem tem, iniciais pra quem não tem; fotos: reais com legenda honesta, fallback
   editorial onde não há.
6. Nenhuma comparação edição×edição em nenhuma seção.
7. Checklist do CLAUDE.md §18 completo.
