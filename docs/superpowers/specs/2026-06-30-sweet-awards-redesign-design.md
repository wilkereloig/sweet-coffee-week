# Design — Redesign da página Sweet Awards (Hall)

**Data:** 2026-06-30 · **Rota:** `#/sweet-awards` · **Componente:** `src/pages/institutional/HistoricoAwards.jsx`

## Contexto

O Hall é agora a página oficial publicada do Sweet Awards (ver memória
`publicado-vs-desenvolvimento`). Hoje é um acervo em acordeão de 16 edições —
funcional, mas "arquivo": sem vida, sem destaque nas categorias, logos pequenas,
hero grande demais, e com textos de bastidor que não são comunicação pública.
Objetivo: transformar num destino **dinâmico e celebrativo** que as pessoas queiram
ver, liderando pela edição atual, sem perder o histórico.

Identidade: institucional do festival, acento **rosa `#F2548A`** (família Awards),
margens da Home (1280 / clamp 20–56px), sem stickers. Regras: CLAUDE.md §3,§4,§12,§15.

## Problemas que este redesign resolve
1. Página sem graça/vida → estrutura celebrativa + motion.
2. Categorias sem destaque → grade de cards fortes por categoria.
3. Logos pequenas → logo do campeão em tamanho grande.
4. Hero grande demais → hero compacto (~metade da altura).
5. Textos que não deveriam estar → passe de copy em voz de festival.
6. "Organizar tudo" → hierarquia clara: atual → histórico → contexto → CTA.

## Estrutura (ordem das seções)
1. Hero compacto
2. **Destaque — Premiação Lovers 2026.1** (coração da página)
3. Histórico (acordeão compacto)
4. "Como o Sweet Awards evoluiu" — repaginada (faixa enxuta, não bloco de texto)
5. CTA final

### 1. Hero compacto
- ~Metade da altura atual; sem selo/ornamento grande.
- Conteúdo: título ("Hall dos vencedores do Sweet Awards") + **1 linha** calorosa curta
  + **CTA** ("Ver premiação 2026" → scroll suave até a seção 2).
- Fundo rosa da identidade; respeita a zona de segurança do header (CLAUDE.md §4.1).

### 2. Destaque — Premiação Lovers 2026.1 (coração)
- **Grade de 8 cards grandes**, um por categoria oficial: Melhor Combo, Melhor Doce,
  Melhor Bebida, Melhor Salgado, Melhor Atendimento, Melhor Apresentação, Melhor
  Criatividade, Encantamento em Loja.
- **Anatomia do card:**
  - Nome da categoria no topo.
  - **Campeão (1º):** logo GRANDE + nome, medalha ouro. Peça de destaque do card.
  - **2º e 3º:** logos médios/menores + nome, prata/bronze, abaixo do campeão.
  - **Empates:** múltiplos nomes na mesma colocação, lado a lado (preservar).
- Logos reais via `resolveParticipant` (`participantAssets.js`), fallback monograma
  elegante — nunca imagem quebrada. Tamanho do campeão bem maior que o atual `.hist-brand`.
- **Motion:** cards revelam em stagger no scroll (`motion-stagger` + reveal-on-scroll);
  hover com leve lift/tilt. Skills de referência: `transitions-dev`,
  `make-interfaces-feel-better`, `emil-design-eng`. Respeitar `prefers-reduced-motion`.
- **Fonte de dados:** `loversAwardsResults.js` (`LOVERS_2026_AWARDS_RESULTS.premiacao.categorias`),
  já cruzado no adapter `sweetEditionsCompat.js`. Descrição da categoria (se usada) de
  `sweetCoffeeHistory.js` (edição 2026.1).

### 3. Histórico — acordeão compacto
- Uma linha por edição (15 edições, 2016–2025; a 2026.1 já está no destaque acima).
- **Resumo visível:** ano + tema + **campeão do Melhor Combo** daquela edição.
- Fechado por padrão; clica → abre categorias/trilhas/pódios (formato atual, enxuto).
- Mais recentes primeiro. Preserva trilhas (Júri Técnico / Sweet Lovers), empates,
  menção honrosa, patrocínios e a nota honesta quando não houve premiação (2016–2018).
- Reaproveita os componentes atuais (`EditionAccordion`, `Podium`, `groupByTrack`).

### 4. "Como o Sweet Awards evoluiu" — repaginada
- Manter a informação, mas **não** como 4 cards de texto morto: virar uma **faixa
  enxuta** (linha do tempo curta / marcos em sequência horizontal). Objetivo: contexto
  em poucos segundos, sem parecer parede de texto.

### 5. CTA final
- Manter o fechamento afetivo + botões (ex.: "Ver edições do festival", "Participar").

## Copy (voz de festival)
- Hero: 1 linha calorosa (substitui a atual comprida).
- Zero texto de bastidor/metodologia (o bloco de transparência já foi removido).
- Tom CLAUDE.md §15 / SITE_DIRECTION §3: caloroso, direto, ritmo; "avaliam" não "votam";
  "Sweet Lovers" como comunidade; grafias oficiais.

## Fora de escopo (workstream separado)
- **Correção dos dados** (ex.: 2025 · Melhor Combo — pódio correto: 1º Marlon Vinicius,
  2º O Maestro Café + Bolomania (empate), 3º Delicato). A base atual foi extraída
  automaticamente dos posts do Instagram oficial e tem erros. Método acordado: o Wilke
  envia os prints dos posts de resultado → transcrição com visão → confirmação dele →
  vira a verdade versionada. A página nova reflete os dados corrigidos quando chegarem.
  **Não** bloqueia o redesign (estrutura independe dos valores exatos).

## Arquivos afetados
- `src/pages/institutional/HistoricoAwards.jsx` — reestruturação (hero, destaque atual,
  histórico compacto, evolução repaginada) + CSS local.
- Possível helper de leitura da edição atual (reusar lógica de cruzamento com
  `loversAwardsResults.js` já existente no adapter — não duplicar dado).
- Sem novas dependências. Sem tocar em `AWARDS_ONLY_PUBLICATION`.

## Verificação
- Build verde (`vite build`).
- Visual (chrome-devtools no iframe do dev): hero compacto; 8 cards de categoria com
  logo grande do campeão + pódio; empates lado a lado; histórico compacto abre/fecha;
  evolução em faixa; motion em stagger; `prefers-reduced-motion` respeitado.
- Responsivo desktop/tablet/mobile (grade 8→coluna; sem overflow lateral).
- Margens = Home (1280 / clamp 20–56px); acento rosa; zona de segurança do header.
