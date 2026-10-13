/*
 * Sweet Awards — texto editorial e configuração da página.
 *
 * SÓ TEXTO E ESCOLHA EDITORIAL. Nenhum resultado, contagem ou nome de marca mora
 * aqui: pódios, categorias, trilhas e menções vêm de `src/data/handoff/awardsData.js`
 * (que deriva de `sweetCoffeeHistory.js` + `loversAwardsResults.js`), e as contas
 * da página saem de `src/pages/sweet-awards/consulta.js`.
 *
 * Os ícones são nomes de `scw-icons-v2.js` — `tests/sweet-awards.test.mjs` confere
 * que todos existem (ícone inexistente não quebra a página, só some: §6.11).
 */

/** Edição cujos resultados abrem a página, com foto da casa premiada.
 *  É escolha editorial: os títulos abaixo ("dez anos") falam desta edição. */
export const EDICAO_RECENTE = '2026.1'

export const ABERTURA = {
  titulo: 'O prêmio que o público entrega.',
  lead:
    'Quem percorre a rota prova, avalia e elege. De uma categoria única em 2019 a oito pódios ' +
    'na edição dos dez anos, o Sweet Awards virou o encerramento de cada temporada do festival.',
}

/* As quatro áreas de consulta. O `id` é a âncora (o índice aponta para ele) e o
   `indice` é o rótulo curto do índice; a contagem ao lado vem dos dados. */
export const SECOES = {
  resultados: {
    id: 'swa-resultados',
    indice: 'Resultados 2026.1',
    icone: 'premios/trofeu',
    rotulo: 'Resultado oficial · 2026.1 Lovers',
    titulo: 'Os vencedores dos dez anos',
    apoio:
      'Oito categorias decididas pelos Sweet Lovers entre 4 e 14 de junho de 2026. ' +
      'Empates aparecem na mesma colocação.',
    legendaFotos:
      'As fotos mostram o combo de cada casa premiada, registrado na edição Lovers. ' +
      'O acervo identifica a foto pela marca, não pela peça.',
  },
  nota: {
    id: 'swa-nota',
    indice: 'Quem dá a nota',
    icone: 'premios/voto',
    rotulo: 'Como é decidido',
    titulo: 'Quem dá a nota',
    apoio: 'Desde 2019 a régua passou por três momentos. Hoje, quem decide é quem percorre a rota.',
  },
  hall: {
    id: 'swa-hall',
    indice: 'Hall dos mais premiados',
    icone: 'premios/medalha',
    rotulo: 'Hall dos mais premiados',
    titulo: 'Quem mais subiu ao pódio',
    apoio:
      'Todas as colocações conquistadas (1º, 2º e 3º lugares) em todas as edições com ' +
      'premiação registrada, somando Júri Técnico e Sweet Lovers.',
  },
  historico: {
    id: 'swa-historico',
    indice: 'Histórico por edição',
    icone: 'simbolos/memoria',
    rotulo: 'Histórico completo · 2019 a 2025',
    titulo: 'Todos os pódios, edição por edição',
    apoio:
      'Abra uma edição para ver o pódio de cada categoria. O acervo não liga as fotos ' +
      'dessas edições às marcas, então os resultados aparecem sem fotografia.',
  },
}

/** Ordem do índice no topo da página = ordem das seções. */
export const ORDEM_SECOES = ['resultados', 'nota', 'hall', 'historico']

export const INDICE_ROTULO = 'Nesta página'

/* Filtro dos resultados recentes. */
export const FILTRO = {
  rotulo: 'Ver categoria',
  todas: 'Todas',
}

/* Um ícone por categoria (selo do pódio). Família por assunto: doce → doces,
   bebida → bebidas… Categoria sem entrada cai no `ICONE_CATEGORIA_PADRAO`. */
export const ICONE_CATEGORIA = {
  'Melhor Combo': 'combos/trio',
  'Melhor Atendimento': 'mecanica/publico',
  'Melhor Criatividade': 'marca/estrela',
  'Melhor Apresentação': 'simbolos/destaque',
  'Melhor Doce': 'doces/fatia-de-bolo',
  'Melhor Salgado': 'salgados/coxinha',
  'Melhor Bebida': 'bebidas/cappuccino',
  'Encantamento em Loja': 'mecanica/loja',
}
export const ICONE_CATEGORIA_PADRAO = 'premios/medalha'

/* 03 — "Quem dá a nota": trilha do tempo de três momentos, em ordem
   cronológica (§7.3 — nunca dois cards gêmeos). */
export const TRILHA = [
  { ano: '2019', titulo: 'Nasce com uma categoria', icone: 'premios/trofeu',
    cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)',
    texto: 'O primeiro pódio premia um combo só. A pergunta era simples: qual foi o melhor da edição?' },
  { ano: '2020.2 – 2021.2', titulo: 'Júri Técnico entra em cena', icone: 'premios/curadoria',
    cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)',
    texto: 'Por três edições, profissionais convidados avaliam execução, equilíbrio e acabamento em paralelo ao público.' },
  { ano: '2022 em diante', hoje: true, titulo: 'Só Sweet Lovers decide', icone: 'simbolos/avaliacao-do-publico',
    cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)',
    texto: 'Quem prova dá nota ao que comeu. O pódio sai da média dessas notas, e de mais nada.' },
]

/* Fecho do histórico: a ausência dita com todas as letras (§7.3). */
export const ANTES_DE_2019 = {
  periodo: '2016 a 2018.2',
  titulo: 'As cinco primeiras edições não tiveram premiação',
  texto:
    'De 2016 a 2018.2, o festival era um circuito de descoberta: combo a preço único, sem disputa. ' +
    'O Sweet Awards nasceu na Pâtisserie Francesa, em 2019, quando o público pediu para eleger ' +
    'o melhor combo, e nunca mais saiu do calendário.',
}

export const MENCAO_NOTA = 'Reconhecimento sem ordem de colocação. Não conta como pódio.'
export const SEM_RESULTADO = 'Resultado ainda não registrado.'
export const NAO_REGISTRADO = 'não registrado no acervo'
