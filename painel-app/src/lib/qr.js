/*
 * Operação › QR Codes — lógica pura (tests/painel-app-qr.test.mjs).
 * O banco soma as leituras por peça e por hora (get_qr_resumo, migration 20261122_qr_painel.sql);
 * aqui só se escolhe o período, ordena, filtra e vira CSV. Plano: docs/cartoon-2026-2/12-plano-qr-leituras.md.
 */

const FUSO = 'America/Fortaleza'

/** Rótulo de cada tipo de peça (os mesmos do check de qr_pontos.tipo). */
export const TIPOS = {
  display_face1: 'Display · face 1 (combo)',
  display_face2: 'Display · face 2 (avaliar)',
  placa: 'Placa',
  mapa: 'Mapa',
  outro: 'Outra peça',
  teste: 'Teste',
}
export const rotuloTipo = (tipo) => TIPOS[tipo] || tipo || '—'

export const PERIODOS = [
  ['abertura', 'Desde a abertura'],
  ['hoje', 'Hoje'],
  ['tudo', 'Tudo, com testes'],
]
export const ORDENS = [
  ['total', 'Mais leituras'],
  ['face1', 'Face 1 (combo)'],
  ['face2', 'Face 2 (avaliar)'],
  ['nome', 'Nome (A a Z)'],
]

/** Hoje em Natal, 'AAAA-MM-DD' (o aparelho de quem abre o painel pode estar em outro fuso). */
export function hojeEmNatal(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora)
}

/**
 * Argumentos do get_qr_resumo para o período escolhido. `inicio` é o festival_inicio da edição atual.
 * "Desde a abertura" deixa de fora os testes de antes do festival; "Tudo" mostra tudo, inclusive o ponto `teste`.
 */
export function argumentosDoPeriodo(periodo, inicio, agora = new Date()) {
  if (periodo === 'hoje') { const hoje = hojeEmNatal(agora); return { p_de: hoje, p_ate: hoje, p_testes: false } }
  if (periodo === 'tudo') return { p_de: null, p_ate: null, p_testes: true }
  return { p_de: inicio || null, p_ate: null, p_testes: false }
}

const CHAVE_DA_ORDEM = { total: 'total', face1: 'face1', face2: 'face2' }
const porNome = (a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')

/** Casas na ordem escolhida; empate desempata por nome. */
export function ordenarCasas(casas, ordem = 'total') {
  const lista = [...(casas || [])]
  const chave = CHAVE_DA_ORDEM[ordem]
  if (!chave) return lista.sort(porNome)
  return lista.sort((a, b) => (Number(b[chave]) || 0) - (Number(a[chave]) || 0) || porNome(a, b))
}

/** Acrescenta `posicao`: empate divide a posição (1, 2, 2, 4) e quem tem 0 fica sem posição. Em ordem alfabética não há. */
export function comPosicao(casasOrdenadas, ordem = 'total') {
  const chave = CHAVE_DA_ORDEM[ordem]
  let anterior = null
  let posicao = 0
  return casasOrdenadas.map((c, i) => {
    if (!chave) return { ...c, posicao: null }
    const v = Number(c[chave]) || 0
    if (v !== anterior) { posicao = i + 1; anterior = v }
    return { ...c, posicao: v > 0 ? posicao : null }
  })
}

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** Busca sem acento nem maiúscula nos campos pedidos; busca vazia devolve a lista inteira. */
export function filtrarPorTexto(lista, busca, campos) {
  const q = semAcento(busca).trim()
  if (!q) return lista
  return lista.filter((item) => campos.some((c) => semAcento(item[c]).includes(q)))
}

/** Largura (0–100) da barra de um valor em relação ao maior; quem tem leitura nunca some (mínimo 3). */
export function larguraBarra(valor, maximo) {
  const v = Number(valor) || 0
  const m = Number(maximo) || 0
  if (v <= 0 || m <= 0) return 0
  return Math.max(3, Math.min(100, Math.round((v / m) * 100)))
}
export const maiorValor = (lista, chave) => (lista || []).reduce((m, x) => Math.max(m, Number(x[chave]) || 0), 0)

export const numero = (v) => (Number(v) || 0).toLocaleString('pt-BR')

/** Hora cheia com leitura, no fuso de Natal: '30/10 12h' (ou '30/10/2026 12h' com `completa`). */
export function ultimaLeitura(iso, completa = false) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map((x) => [x.type, x.value]))
  return p.day + '/' + p.month + (completa ? '/' + p.year : '') + ' ' + p.hour + 'h'
}

/** '2026-11-05' → '05/11'. */
export const diaCurto = (dia) => (/^\d{4}-(\d{2})-(\d{2})$/.exec(String(dia || '')) || []).slice(1).reverse().join('/') || '—'

export function rotuloLugar({ cidade, regiao }) {
  return cidade ? cidade + (regiao ? ' · ' + regiao : '') : 'Sem lugar informado'
}
const APARELHOS = { ios: 'iPhone', android: 'Android', outro: 'Outro ou computador' }
export const rotuloAparelho = (a) => APARELHOS[a] || a || '—'

// ── CSV para o cliente: ponto e vírgula e BOM (o Excel brasileiro abre sem estragar acento) ──
const COMECA_FORMULA = /^[=+\-@\t\r]/

/** Uma célula: texto que o Excel leria como fórmula ganha apóstrofo; aspas e quebras vão entre aspas. */
export function celulaCsv(valor) {
  if (valor == null) return ''
  let s = String(valor)
  if (typeof valor === 'string' && COMECA_FORMULA.test(s)) s = "'" + s
  return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/** colunas: [[chave ou função da linha, título], …] */
export function montarCsv(colunas, linhas) {
  const cabecalho = colunas.map(([, titulo]) => celulaCsv(titulo)).join(';')
  const corpo = (linhas || []).map((l) => colunas.map(([k]) => celulaCsv(typeof k === 'function' ? k(l) : l[k])).join(';'))
  return '\ufeff' + [cabecalho, ...corpo].join('\r\n') + '\r\n'
}

export const csvCasas = (casas) => montarCsv([
  ['nome', 'Casa'], ['face1', 'Face 1 (combo)'], ['face2', 'Face 2 (avaliar)'], ['outras', 'Outras peças'], ['total', 'Total'],
  [(c) => ultimaLeitura(c.ultima, true), 'Última hora com leitura'],
], casas)

export const csvPecas = (pontos, nomeDaCasa) => montarCsv([
  ['codigo', 'Código'], [(p) => rotuloTipo(p.tipo), 'Peça'], [(p) => nomeDaCasa[p.participacao_id] || '', 'Casa'],
  ['leituras', 'Leituras'], [(p) => ultimaLeitura(p.ultima, true), 'Última hora com leitura'], [(p) => (p.ativo ? 'sim' : 'não'), 'Ativa'],
], pontos)

export const csvDias = (dias) => montarCsv([['dia', 'Dia'], ['leituras', 'Leituras']], dias)

/** 'qr-casas-2026-10-30.csv' */
export const nomeDoArquivo = (assunto, agora = new Date()) => 'qr-' + assunto + '-' + hojeEmNatal(agora) + '.csv'
