# Edições — "Cinema da Década" (redesign photo-first)

**Data:** 2026-07-07 · **Status:** proposta (aguardando aprovação)
**Página:** `src/pages/institutional/Edicoes.jsx` (rota `#/edicoes`)
**Modo (taste-skill §11):** Redesign — Overhaul visual. Preserva: rota/slug, IA, motor de
passos (`useSteppedPresentation`), modo vertical mobile, fallbacks honestos, dados.
Substitui: composição visual dos painéis, hero, galeria, controles.

**Design Read:** página institucional de história de festival, público afetivo + marcas +
imprensa, linguagem editorial-cinematográfica photo-first, CSS nativo no sistema
terracotta existente. **Dials: VARIANCE 8 · MOTION 7 · DENSITY 3.**

---

## 1. Conceito

Hoje o painel é um "card grande": coluna de texto à esquerda, caixa de foto 4:3 à
direita. O acervo (11-12 fotos reais POR edição em `/images/edicoes/<code>/NN.webp`,
187 no total) aparece espremido em 4 slots pequenos.

O redesign inverte a hierarquia: **cada edição vira uma cena de documentário**. A foto
ocupa o painel inteiro (full-bleed, com scrim no tom da edição); o conteúdo editorial
(número, tema, lead, pódio) entra como camada tipográfica por cima. O scroll continua
sendo o "projetor" (motor de passos mantido), mas o que avança agora são cenas, não
cards.

Âncora narrativa por painel (novo): **o pódio real da edição** ("quem venceu aqui"),
derivado de `premiacao.categorias[].colocacoes` — ponte direta com o Sweet Awards.

## 2. O que fica (auditoria — patterns to preserve)

- Motor de passos discretos (wheel/teclado, borda solta o scroll) — aprovado e revisado.
- Sequência direta 1 → 16, sem divisão por fases (CLAUDE.md §10). **Sem interstícios
  de era**: a passagem do tempo é carregada por tom + fotografia, não por painéis extras.
- Modo vertical no mobile/reduced-motion, com chips.
- Fallbacks honestos ("Logo pendente", "Acervo pendente").
- Paleta oficial; tons por edição (coral/pink/cyan/yellow); acento da rota ciano.
- Container 1280 / gutter clamp(20,4vw,56); zona de segurança do header (§4.1).
- Regra de dados: nada inventado; fontes `sweetCoffeeHistory.js`, `editions.js`,
  `editionGallery.js`, `editionAssets.js`, `loversAwardsResults.js` (Lovers).

## 3. O que muda (patterns to retire)

- Painel "texto vs caixa de foto" → cena full-bleed em camadas.
- 4 PhotoRotators por painel (1 main + 3 thumbs com timers) → **1 foto-cena com
  crossfade lento + filmstrip estática com scroll-snap** (todas as fotos da edição
  visíveis, sem timers múltiplos). Menos motion-ruído, mais acervo.
- Hero PageHero genérico + hint textual → **capa-índice**: faixa ciano institucional
  mantida (§3 do CLAUDE.md), com filmstrip cronológica das 16 edições (miniaturas
  clicáveis que pulam direto pra edição) no lugar do hint. O hint de rolagem sai
  (a filmstrip + o primeiro painel já comunicam a mecânica).
- Contador "01 / 16 — Tema" → sem travessão: `01/16 · Tema` (máx. 1 "·" por linha).
- Régua de chips numerados → **timeline de anos**: uma linha única com marcas por
  edição, rótulo = ano (2016 … 2026), marca ativa expandida com o tema. Mesma função
  de "controle de apresentação", mais leitura de década.

## 4. Anatomia do painel (desktop)

Camadas, de trás pra frente:

1. **Foto-cena** — full-bleed, `object-fit: cover`, crossfade lento (~7s) entre 2-3
   fotos curadas da edição (subset da galeria; curadoria manual = novo campo `sceneShots`
   em módulo de dados, com fallback = primeiras fotos da galeria). Scrim: gradiente do
   tom da edição (color-mix com --ink, opacidade calibrada p/ contraste AA do texto).
2. **Numeral de fundo** — o número da edição como tipografia display gigante
   (~18vw, tom da edição em baixa opacidade), ancorado à direita. É dado (posição na
   série), não eyebrow; substitui o índice pequeno atual.
3. **Coluna editorial** (esquerda, largura ~44%, alinhada ao grid do site):
   - marca da edição (slot logo/selo atual, mantido);
   - título do tema (display, clamp maior que hoje: ~64-84px);
   - código + período + participantes em UMA linha de meta;
   - lead (clamp 3 linhas, como hoje);
   - **pódio da edição** (novo, ver §5);
   - badge de status só quando não há pódio (ex.: "sem premiação nesta edição").
4. **Filmstrip** (base do painel) — tira horizontal com scroll-snap das fotos da
   edição (thumbs ~96px, estáticas, lazy). Clique numa thumb → vira a foto-cena.
   Painéis fora de foco: filmstrip não monta (mantém padrão `live` atual).

Transição entre painéis: track translateX mantido + **parallax de camada** (foto-cena
se move ~60% da velocidade do texto via transform no wrapper interno) + numeral de
fundo com delay curto. Tudo transform/opacity, nada de layout.

## 5. Pódio da edição (dados reais)

Novo seletor `getEditionHighlights(code)` (em `src/data/`, derivado — nada hardcoded):

- Edições 2019.1+ com `premiacao.status === 'completa'`: até 3 categorias em destaque
  (prioridade: Melhor Combo, depois ordem da base), mostrando **só o 1º lugar**
  (empates preservados: nomes lado a lado). Logos via `resolveParticipant` com
  fallback de iniciais (padrão Awards).
- Link "pódio completo no Sweet Awards" por painel (âncora da edição, se existir;
  senão rota geral) — substitui o CTA-seta atual? Não: o CTA final da apresentação
  continua sendo o link forte; o link do painel é discreto (texto).
- 2016-2018 (`categorias` vazias): sem pódio; nota curta honesta ("A premiação nasceu
  em 2019.1"), apenas no painel 2019.1 como marco — nos anteriores, nada (ausência
  não vira placeholder).
- **Lovers (2026.1): pódios vêm de `loversAwardsResults.js`** (regra CLAUDE.md §12 —
  na base histórica estão vazios de propósito).

## 6. Painel 16 (Lovers) — final especial

- Mesma anatomia, com selo dos 10 anos em destaque (asset real existente) e scrim
  no acento da página.
- Pódio Lovers (trilhas Júri Técnico / Sweet Lovers, resumido a 1º lugares).
- CTA da apresentação integrado ao painel (botão "Ver os vencedores no Sweet Awards",
  único intent de Awards na página inteira — remove duplicação seta+painel).

## 7. Pós-apresentação (epílogo curto)

Uma seção enxuta após o stage: convite pra Curiosidades ("O lado curioso desses 10
anos") — 1 headline + 1 CTA. Sem repetir intent do Awards. Layout distinto (banda
cheia no tom creme, tipografia display), não card.

## 8. Mobile / reduced-motion

- Mantém stack vertical + chips (que viram a timeline de anos compacta, sticky).
- Painel mobile herda a linguagem: foto-cena no topo (aspect 4:5, estática — sem
  crossfade no mobile), numeral menor, coluna editorial, pódio, filmstrip scroll-snap
  (touch nativo, permitido — não é sticky horizontal complexo).
- Reduced-motion: crossfade e parallax desligam; foto-cena estática.

## 9. Performance

- Janela `live ±1` mantida para: crossfade da foto-cena, montagem da filmstrip.
- Foto-cena do painel 1 com `loading="eager"` (LCP); resto lazy.
- Thumbs da filmstrip: mesmas .webp (já otimizadas); sem novos assets obrigatórios.
- Zero `window.addEventListener('scroll')` (motor atual já usa wheel interceptado +
  IntersectionObserver, mantido).

## 10. Conformidades e exceções declaradas

- **Stack:** sem dependências novas (sem Tailwind/Motion/GSAP — taste-skill adaptado
  ao stack Vite+React+CSS do projeto; motor próprio já cobre o "horizontal pan").
- **Sem eyebrows/rótulos mono** (CLAUDE.md §5): numeral gigante e meta são dados,
  não labels; nenhum micro-label caixa-alta acima do título.
- **Sem em-dash em copy visível nova**; separador "·" no máx. 1 por linha.
- **Sem overlay de pill em foto**: tags "Acervo" saem de cima da imagem nos fallbacks
  (viram texto do slot, não etiqueta sobre foto real).
- **Scroll hint do hero**: removido (skill bane scroll cues; a filmstrip clicável
  assume a função de anunciar a apresentação).
- **Tema único** (creme institucional) do topo ao rodapé; scrims são tom-sobre-foto,
  não inversão de tema.
- Contraste AA auditado painel a painel (texto sobre scrim é o risco nº 1 do conceito;
  calibrar scrim por foto-cena curada).

## 11. Tarefas de implementação (ordem)

1. **Dados** — `src/data/editionHighlights.js`: `getEditionHighlights(code)` (pódios
   1º lugar por edição, empates, fonte dupla histórico/Lovers) + curadoria `sceneShots`
   (2-3 frames por edição; fallback = início da galeria). Sem tocar nas bases.
2. **Painel photo-first (desktop)** — nova composição em camadas (foto-cena + scrim +
   numeral + coluna editorial + pódio). Substitui slide atual; fallbacks preservados.
3. **Filmstrip** — tira scroll-snap por painel (thumb→cena), remove mini-rotators;
   janela `live` mantida.
4. **Hero-capa** — filmstrip cronológica clicável no hero ciano; remove hint; copy nova.
5. **Controles** — timeline de anos (substitui chips numerados), contador sem travessão,
   parallax de camadas na transição; painel Lovers especial + CTA único + epílogo
   Curiosidades.
6. **Polish + validação** — mobile, reduced-motion, contraste AA por painel, build,
   preflight taste-skill (§14) + checklist CLAUDE.md §18; atualizar CLAUDE.md §10 e
   SITE_DIRECTION.md.

Cada tarefa fecha com build verde e commit próprio (`feat(edicoes): …`), na branch
`dev/site-completo`.

## 12. Riscos

- **Contraste texto-sobre-foto**: mitigado por scrim calibrado + curadoria de
  `sceneShots` (escolher frames com área "calma" à esquerda).
- **Peso de 187 imagens**: mitigado por live-window + lazy (padrão já validado).
- **Regressão do motor de passos**: composição muda, mecânica não; testar borda
  (primeiro/último painel) e teclado após cada tarefa.
