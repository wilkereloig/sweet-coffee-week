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

/* TRÊS COISAS DIFERENTES (16/11/2026), cada uma com a sua fonte:
   · edição em DESTAQUE editorial — a que acabou de acontecer, com resultado ou
     não: `EDICAO_EM_DESTAQUE` em src/data/resultadosEdicao.js;
   · ÚLTIMA EDIÇÃO COM RESULTADO PUBLICADO — a que abre a seção de resultados,
     com foto: derivada de AWARDS_DADOS (`ultimaComResultado` em consulta.js),
     nunca digitada aqui;
   · histórico e Hall — todas as publicadas.
   Enquanto a edição em destaque está em apuração, a página abre com APURACAO e
   os resultados anteriores seguem logo abaixo. Publicado o resultado, as duas
   primeiras passam a ser a mesma edição e a abertura volta a ser ABERTURA. */

/* Abertura com resultado publicado (o estado permanente da página). */
export const ABERTURA = {
  titulo: 'O prêmio que o público entrega.',
  lead: 'A cada edição, quem prova os combos dá a nota e define o pódio de cada categoria.',
  /* leva aos resultados (SECOES.resultados.id) */
  acao: 'Ver os premiados',
  /* Quando os resultados que abrem a página são os da edição em destaque. */
  acaoDestaque: 'Conheça os vencedores',
}

/* Abertura enquanto a edição em destaque está EM APURAÇÃO. Tema e código vêm
   da base (resultadosEdicao.js). ⚠️ A4: sem data, sem cerimônia, sem contagem
   regressiva e sem nome de casa — só o que está confirmado: a edição terminou,
   a organização confere as avaliações e o resultado sai primeiro no Instagram
   oficial (docs/cartoon-2026-2/22-encerramento-da-edicao.md §3). */
export const APURACAO = {
  rotulo: (tema, code) => `Edição ${tema} · ${code}`,
  titulo: (tema) => `O reconhecimento da ${tema} está a caminho.`,
  estado: 'Resultados em apuração',
  texto:
    'A edição terminou, e as avaliações dos Sweet Lovers passam pela conferência da organização. ' +
    'O resultado sai primeiro no Instagram do festival e depois entra aqui, com o pódio de cada categoria.',
  instagram: { rotulo: 'Acompanhar no Instagram', href: 'https://www.instagram.com/sweetcoffeeweek/' },
  anteriores: 'Ver resultados anteriores',
  trofeu: 'Troféu do Sweet Awards: uma fatia de bolo dourada com uma colher, sobre base em formato de selo.',
}

/* As quatro áreas de consulta. O `id` é a âncora (o índice aponta para ele) e o
   `indice` é o rótulo curto do índice; a contagem ao lado vem dos dados. */
export const SECOES = {
  /* O texto desta seção depende de QUAL edição ela mostra: vem de
     `textoResultados(edicao)`, abaixo. Aqui só o que não muda. */
  resultados: {
    id: 'swa-resultados',
    icone: 'trofeu',
  },
  nota: {
    id: 'swa-nota',
    indice: 'Quem dá a nota',
    icone: 'avaliacao',
    rotulo: 'Como é decidido',
    titulo: 'Quem dá a nota',
    apoio: 'Desde 2019, a avaliação passou por três formatos.',
  },
  hall: {
    id: 'swa-hall',
    indice: 'Hall dos mais premiados',
    icone: 'medalha',
    rotulo: 'Hall dos mais premiados',
    titulo: 'Quem mais subiu ao pódio',
    apoio:
      'Soma de 1º, 2º e 3º lugares em todas as edições com premiação registrada, ' +
      'nas trilhas de Júri Técnico e Sweet Lovers.',
  },
  historico: {
    id: 'swa-historico',
    indice: 'Histórico por edição',
    icone: 'historico',
    /* O intervalo de anos vem dos dados (index.jsx), não digitado. */
    rotulo: (de, ate) => (de && ate ? `Histórico completo · ${de} a ${ate}` : 'Histórico completo'),
    titulo: 'Todos os pódios, edição por edição',
    apoio: 'O pódio de cada categoria, edição por edição.',
  },
}

/* Texto editorial próprio de uma edição, quando existe. Sem entrada aqui, a
   seção usa o texto genérico montado dos dados (tema e categorias). */
const RESULTADOS_DA_EDICAO = {
  '2026.1': {
    titulo: 'Os vencedores dos dez anos',
    apoio:
      'Oito categorias decididas pelos Sweet Lovers entre 4 e 14 de junho de 2026. ' +
      'Empates aparecem na mesma colocação.',
    legendaFotos:
      'As fotos mostram o combo de cada casa premiada na edição Lovers, não necessariamente ' +
      'o item que venceu a categoria.',
  },
}

/** Texto da seção de resultados para a edição que ela mostra. `anterior` =
 *  a edição em destaque ainda está em apuração, então estes são os últimos
 *  resultados publicados, e o rótulo diz isso. */
export function textoResultados(edicao, { anterior = false } = {}) {
  const proprio = RESULTADOS_DA_EDICAO[edicao.code] || {}
  const n = edicao.cats.length
  return {
    indice: `Resultados ${edicao.code}`,
    rotulo: `${anterior ? 'Último resultado publicado' : 'Resultado oficial'} · ${edicao.code} ${edicao.tema}`,
    titulo: proprio.titulo || `Os vencedores da edição ${edicao.tema}`,
    apoio: proprio.apoio ||
      `${n} ${n === 1 ? 'categoria decidida' : 'categorias decididas'} pela avaliação do público. Empates aparecem na mesma colocação.`,
    legendaFotos: proprio.legendaFotos || '',
  }
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
  'Melhor Combo': 'combo',
  'Melhor Atendimento': 'atendimento',
  'Melhor Criatividade': 'tema',
  'Melhor Apresentação': 'estrela',
  'Melhor Doce': 'cupcake',
  'Melhor Salgado': 'coxinha',
  'Melhor Bebida': 'xicara',
  'Encantamento em Loja': 'loja',
}
export const ICONE_CATEGORIA_PADRAO = 'medalha'

/* 03 — "Quem dá a nota": trilha do tempo de três momentos, em ordem
   cronológica (§7.3 — nunca dois cards gêmeos). */
export const TRILHA = [
  { ano: '2019', titulo: 'Nasce com uma categoria', icone: 'trofeu',
    cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)',
    texto: 'Uma categoria só, Melhor Combo, decidida pelo público.' },
  { ano: '2020.2 – 2021.2', titulo: 'Júri Técnico entra em cena', icone: 'curadoria',
    cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)',
    texto: 'Por três edições, profissionais convidados avaliaram execução, equilíbrio e acabamento, em paralelo ao público.' },
  { ano: '2022 em diante', hoje: true, titulo: 'Só os Sweet Lovers decidem', icone: 'avaliacao',
    cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)',
    texto: 'Quem prova dá nota ao que comeu, e o pódio sai da média dessas notas.' },
]

/* Fecho do histórico: a ausência dita com todas as letras (§7.3). */
export const ANTES_DE_2019 = {
  periodo: '2016 a 2018.2',
  titulo: 'As cinco primeiras edições não tiveram premiação',
  texto:
    'O festival era um circuito de descoberta: combo a preço único, sem disputa. ' +
    'O Sweet Awards nasceu em 2019, na Pâtisserie Francesa, quando o público pediu para eleger ' +
    'o melhor combo.',
}

export const MENCAO_NOTA = 'Reconhecimento sem ordem de colocação. Não conta como pódio.'
export const SEM_RESULTADO = 'Resultado ainda não registrado.'
export const NAO_REGISTRADO = 'não registrado no acervo'
