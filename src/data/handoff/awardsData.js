/*
 * AWARDS_DADOS — dados da página Sweet Awards.
 *
 * ⚠️ ISTO NÃO É MAIS UM SNAPSHOT. Até 07/08/2026 este arquivo era uma cópia
 * congelada, gerada uma vez e mantida à mão — uma segunda fonte de verdade que
 * envelheceu e passou a mostrar número errado no Hall (Mr. Cupcake 28 em vez de
 * 29, Marlon Vinicius 24 em vez de 26). Agora ele DERIVA da fonte a cada import:
 *
 *   src/data/sweetCoffeeHistory.js  → edições, categorias, pódios, trilhas, aliases
 *   src/data/loversAwardsResults.js → pódios da 2026.1 (vazios na base, de propósito)
 *   src/data/editionAssets.js       → marca de cada edição
 *   src/data/imageLibrary.js        → fotos de cada edição
 *
 * A única coisa escrita à mão aqui é NOTAS: uma linha editorial por edição, que
 * nenhum dado deriva. Corrigir pódio, alias ou contagem é mexer só na fonte —
 * esta página acompanha sozinha.
 *
 * PUBLICAÇÃO DE RESULTADO (16/11/2026): uma edição só entra aqui — e portanto no
 * Hall, nas contagens e no histórico — quando a base traz pódio (pelo menos uma
 * colocação com nome) E `premiacao.status` deixou de ser 'em-apuracao'. Os dois
 * juntos: categoria definida sem pódio não é resultado, e pódio com status em
 * apuração ainda não foi liberado. `estadoPremiacao()` diz em que ponto a edição
 * está. Passo a passo: docs/numeros-do-site.md, "Publicar o resultado".
 */
import { SWEET_COFFEE_HISTORY } from '../sweetCoffeeHistory.js'
import { LOVERS_2026_AWARDS_RESULTS } from '../loversAwardsResults.js'
import { editionMark } from '../editionAssets.js'
import { editionPhotos } from '../imageLibrary.js'

/* Uma linha por edição premiada. É conteúdo editorial: não sai de dado nenhum. */
const NOTAS = {
  '2019.1': 'A estreia do Sweet Awards, com uma categoria única decidida pelo público.',
  '2019.2': 'Segunda edição da premiação, ainda concentrada no Melhor Combo.',
  '2020.1': 'A premiação saltou de uma para sete categorias.',
  '2020.2': 'Primeira edição a separar Júri Técnico e Sweet Lovers.',
  '2021.1': 'Doze categorias, a maior expansão de critérios até então, com a única Menção Honrosa registrada.',
  '2021.2': 'Quinze categorias: o auge da premiação, com júri técnico e público lado a lado.',
  '2022':   'A partir daqui, a premiação passou a ser inteiramente decidida pelos Sweet Lovers.',
  '2023':   'Oito categorias na edição que reuniu 33 endereços de Natal e Parnamirim.',
  '2024':   'Oito categorias na edição Books.',
  '2025':   'Oito categorias na edição Celebration.',
  '2026.1': 'Oito categorias na edição dos dez anos, com pódio completo divulgado pela organização.',
}

/* Normalização única, igual à de sweetHistoryStats.js: minúsculas, sem acento,
   "&" vira " e ", e todo o resto que não é letra ou número vira espaço. É o que
   faz "Canuto's" e "Canuto’s" caírem na mesma chave. */
const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{Mn}/gu, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Monta os dados do Sweet Awards a partir da base. Função pura: os testes
 *  passam uma base sintética para conferir a publicação futura sem tocar no
 *  acervo real. Em produção só existe a chamada sem argumentos, logo abaixo. */
export function construirAwards(history = SWEET_COFFEE_HISTORY, lovers = LOVERS_2026_AWARDS_RESULTS) {
  const { edicoes = [], participantAliases = {}, categoryAliases = {} } = history

  const CANON_MARCA = {}
  for (const [canon, vars] of Object.entries(participantAliases)) {
    CANON_MARCA[norm(canon)] = canon
    for (const v of vars) CANON_MARCA[norm(v)] = canon
  }
  const CANON_CAT = {}
  for (const [canon, vars] of Object.entries(categoryAliases)) {
    CANON_CAT[norm(canon)] = canon
    for (const v of vars) CANON_CAT[norm(v)] = canon
  }
  const marca = (n) => CANON_MARCA[norm(n)] || (n || '').trim()
  const categoria = (c) => CANON_CAT[norm(c)] || (c || '').trim()

  /* 2026.1: a base histórica traz as 8 categorias com metadado mas com `colocacoes`
     sempre vazio — os pódios reais vivem em loversAwardsResults.js. O join é pela
     `key`, que os dois arquivos compartilham. */
  const LOVERS_POR_KEY = new Map(lovers.premiacao.categorias.map((c) => [c.key, c]))

  function categoriasDe(ed) {
    const cats = (ed.premiacao && ed.premiacao.categorias) || []
    return cats.map((c) => {
      const fonte = ed.id === '2026.1' ? LOVERS_POR_KEY.get(c.key) : null
      const colocacoes = (fonte ? fonte.colocacoes : c.colocacoes) || []
      return {
        nome: categoria(c.categoria),
        // Nome usado NAQUELA edição. Só aparece quando o alias junta duas
        // categorias da mesma edição no mesmo nome (2020.1: Take Away e Delivery).
        nomeOriginal: c.categoria || null,
        trilha: c.trilha || null,
        desc: c.descricao || '',
        pod: colocacoes.map((p) => ({ pos: p.pos, nomes: (p.nomes || []).map(marca) })),
      }
    })
  }

  const temPodio = (cats) => cats.some((c) => c.pod.some((p) => p.nomes.length > 0))

  return {
    edicoes: edicoes
      .map((ed) => ({ ed, cats: categoriasDe(ed) }))
      /* Só resultado publicado: pódio na base e status fora de 'em-apuracao'. */
      .filter(({ ed, cats }) => temPodio(cats) && (ed.premiacao || {}).status !== 'em-apuracao')
      .map(({ ed, cats }) => ({
        code: ed.id,
        tema: ed.tema || ed.nome,
        periodo: ed.periodo || '',
        nota: NOTAS[ed.id] || '',
        logo: editionMark(ed.id).logo,
        fotos: editionPhotos(ed.id).slice(0, 3),
        cats,
        /* Menção Honrosa: reconhecimento SEM ordem de colocação. Vive fora de
           `cats` de propósito — se entrasse ali viraria colocação e inflaria o
           Hall em sete linhas fantasma. Só a 2021.1 tem. */
        mencao: ed.premiacao && ed.premiacao.mencaoHonrosa
          ? {
              categoria: categoria(ed.premiacao.mencaoHonrosa.categoria),
              nomes: (ed.premiacao.mencaoHonrosa.nomes || []).map(marca),
            }
          : null,
      })),
  }
}

export const AWARDS_DADOS = construirAwards()

/** Em que ponto está o Sweet Awards de uma edição:
 *  'divulgado' (resultado publicado, a edição está em `dados.edicoes`),
 *  'em-apuracao' (edição encerrada, resultado ainda não liberado) ou
 *  'sem-premiacao' (não teve, ou o acervo não registra). */
export function estadoPremiacao(code, dados = AWARDS_DADOS, history = SWEET_COFFEE_HISTORY) {
  if (dados.edicoes.some((e) => e.code === code)) return 'divulgado'
  const ed = (history.edicoes || []).find((e) => e.id === code)
  return ed && (ed.premiacao || {}).status === 'em-apuracao' ? 'em-apuracao' : 'sem-premiacao'
}

export default AWARDS_DADOS
