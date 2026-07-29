/*
 * DADOS — métricas de força do festival para a página "Apoiar".
 * Fonte: painel do Instagram oficial (@sweetcoffeeweek) + histórico comercial das
 * edições. Números arredondados para baixo e prefixados com "+" (nunca inflar).
 *
 * Regras de exibição (ver CLAUDE.md / brief Apoiar):
 *  - seguidores aparecem como "+65 mil" (print mostra 65,5 mil) — NÃO usar "389 seguindo";
 *  - posts como "+1.600" (print: 1.667);
 *  - alcance, interações e visualizações são MÉTRICAS DISTINTAS — não chamar
 *    genericamente de "impressões".
 *
 * `tier`: 'big'  → cards de destaque (visualizações, interações, alcance);
 *         'support' → cards de apoio (seguidores, combos, movimentação, edições,
 *                     anos, posts). A ordem do array já é a prioridade visual.
 */
export const SUPPORT_METRICS = [
  {
    tier: 'big',
    label: 'Visualizações',
    value: '+18 milhões',
    detail: 'Volume acumulado de visualizações nos conteúdos digitais do festival.',
  },
  {
    tier: 'big',
    label: 'Interações',
    value: '+290 mil',
    detail: 'Curtidas, comentários, compartilhamentos e respostas gerados pelo conteúdo.',
  },
  {
    tier: 'big',
    label: 'Alcance',
    value: '+200 mil',
    detail: 'Público alcançado pelas publicações e conteúdos do festival.',
  },
  {
    tier: 'support',
    label: 'Seguidores no Instagram',
    value: '+65 mil',
    detail: 'Comunidade ativa acompanhando edições, combos, participantes e resultados.',
  },
  {
    tier: 'support',
    label: 'Combos vendidos',
    value: '+34 mil',
    detail: 'Consumo gerado nas últimas edições do festival.',
  },
  {
    tier: 'support',
    label: 'Movimentação direta',
    value: '+R$ 712 mil',
    detail: 'Valor movimentado diretamente nas últimas edições.',
  },
  {
    tier: 'support',
    label: 'Edições realizadas',
    value: '16',
    detail: 'Histórico consolidado desde 2016.',
  },
  {
    tier: 'support',
    label: 'Anos de história',
    value: '10',
    detail: 'Uma década conectando público, marcas locais e experiências gastronômicas.',
  },
  {
    tier: 'support',
    label: 'Posts publicados',
    value: '+1.600',
    detail: 'Conteúdo recorrente sobre participantes, combos, bastidores e Sweet Awards.',
  },
]

export const SUPPORT_METRICS_BIG = SUPPORT_METRICS.filter((m) => m.tier === 'big')
export const SUPPORT_METRICS_SUPPORT = SUPPORT_METRICS.filter((m) => m.tier === 'support')
