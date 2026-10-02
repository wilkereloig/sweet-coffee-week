/*
 * Lógica pura da operação da edição (docs/EVOLUCAO-PAINEL-2026-09.md): rótulos
 * de status, momento da edição, cronograma, trajetória do participante e
 * filtros de relacionamento. Sem DOM nem rede — testada em
 * tests/painel-app-operacao.test.mjs.
 *
 * As DATAS nunca moram aqui: chegam da edição e do cronograma (banco). O que
 * mora aqui é como ler essas datas.
 */

import { rotulos } from './status.js'

// Rótulos: fonte única em ./status.js (reestruturação 29/09/2026).
export const ROTULO_FOTO = rotulos('foto')
export const ROTULO_PAGAMENTO = rotulos('pagamento')
export const ROTULO_COMBO = rotulos('combo')
export const ROTULO_TEMA = rotulos('tema')
export const ROTULO_HISTORICO = rotulos('historico')
export const ROTULO_MATERIAL = rotulos('material')
export const ROTULO_MATERIAL_STATUS = rotulos('material_status')
export const ROTULO_PRESSKIT = rotulos('presskit')
export const ROTULO_TIPO_CONTATO = rotulos('tipo_contato')
export const ROTULO_PENDENCIA = rotulos('pendencia')

// "AAAA-MM-DD" → número de dias entre duas datas de calendário (sem fuso).
function dias(iso) {
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return Date.UTC(a, m - 1, d) / 864e5
}
export function diasAte(data, hoje) {
  if (!data || !hoje) return null
  return dias(data) - dias(hoje)
}

// Antes, durante ou depois do festival — pelas datas da edição, nunca por
// constante no código. Sem datas, não afirma nada.
export function momentoEdicao(edicao, hoje) {
  if (!edicao || !edicao.festival_inicio || !edicao.festival_fim || !hoje) return 'indefinido'
  if (diasAte(edicao.festival_inicio, hoje) > 0) return 'antes'
  if (diasAte(edicao.festival_fim, hoje) >= 0) return 'durante'
  return 'depois'
}

// Data que conta de um item do cronograma: prazo = fim; período/marco = início.
export function dataDoItem(item) {
  if (!item) return null
  return item.tipo === 'prazo' ? (item.fim || item.inicio) : (item.inicio || item.fim)
}

// Primeiro item com a chave pedida que ainda não passou (ou o último, se todos passaram).
export function itemDoCronograma(cronograma, chave, hoje) {
  const itens = (cronograma || []).filter((i) => i.chave === chave)
    .sort((a, b) => String(dataDoItem(a)).localeCompare(String(dataDoItem(b))))
  const vivo = itens.find((i) => diasAte(i.fim || i.inicio, hoje) >= 0)
  return vivo || itens[itens.length - 1] || null
}

// O que vem a seguir no cronograma (só o que a marca pode ver).
export function proximosDoCronograma(cronograma, hoje, n = 4) {
  return (cronograma || [])
    .filter((i) => i.visivel_participante !== false && diasAte(i.fim || i.inicio, hoje) >= 0)
    .sort((a, b) => String(dataDoItem(a)).localeCompare(String(dataDoItem(b))) || (a.ordem || 0) - (b.ordem || 0))
    .slice(0, n)
}

export function textoPrazo(item, hoje) {
  const d = diasAte(dataDoItem(item), hoje)
  if (d === null) return ''
  if (item.tipo === 'periodo' && diasAte(item.inicio, hoje) <= 0 && diasAte(item.fim, hoje) >= 0) return 'acontecendo agora'
  if (d < 0) return 'já passou'
  if (d === 0) return item.tipo === 'prazo' ? 'vence hoje' : 'hoje'
  if (d === 1) return item.tipo === 'prazo' ? 'vence amanhã' : 'amanhã'
  return (item.tipo === 'prazo' ? 'vence em ' : 'em ') + d + ' dias'
}

/*
 * Trajetória: o que dá para AFIRMAR à marca. Recorrente e "primeira edição"
 * só quando uma pessoa da organização confirmou — ausência no acervo não é
 * primeira vez (o acervo pode estar incompleto).
 */
export function resumoTrajetoria(historia) {
  if (!historia) return { tipo: 'neutro' }
  const status = historia.status
  const n = Number(historia.participacoes || 0)
  const premios = Number(historia.podios || 0)
  if (status === 'recorrente_confirmado' && n > 1) {
    return {
      tipo: 'recorrente', participacoes: n,
      desde: historia.primeira ? historia.primeira.nome : null,
      desdeCodigo: historia.primeira ? historia.primeira.codigo : null,
      premios, primeiros: Number(historia.primeiros_lugares || 0),
    }
  }
  if (status === 'novo_confirmado') return { tipo: 'primeira' }
  return { tipo: 'neutro' }
}

/*
 * Relacionamento: filtros de apoio à escolha do Press Kit. Mostram contexto;
 * não ordenam por "mérito" nem escolhem ninguém.
 */
// Categorias de relacionamento (contatos_relacionamento.categorias — uma
// pessoa pode ter várias). Press Kit e Voucher não são categoria digitada:
// saem dos envios e dos vouchers da edição (etapa 5, 29/09/2026).
export const CATEGORIAS_CONTATO = [
  ['influenciador', 'Influenciadores'], ['imprensa', 'Imprensa'], ['parceiro', 'Parceiros'],
  ['convidado', 'Convidados'], ['outro', 'Outros'],
]
export const FILTROS_CONTATO = [
  ['todos', 'Todos'],
  ...CATEGORIAS_CONTATO,
  ['presskit', 'Press Kit nesta edição'],
  ['voucher', 'Voucher nesta edição'],
  ['ja_receberam', 'Já receberam Press Kit'],
  ['nunca_receberam', 'Nunca receberam'],
  ['receberam_ultima', 'Receberam na última'],
  ['incompleto', 'Cadastro incompleto'],
  ['arquivados', 'Apagados (arquivo)'],
]
const categoriasDe = (c) => (Array.isArray(c.categorias) && c.categorias.length ? c.categorias : [c.tipo].filter(Boolean))
export function filtrarContatos(lista, filtro, busca = '') {
  const t = String(busca || '').trim().toLowerCase()
  return (lista || []).filter((c) => {
    if (t && ![c.nome, c.instagram, c.bairro, c.cidade, c.email].filter(Boolean).join(' ').toLowerCase().includes(t)) return false
    // "Apagar" arquiva (ativo = false): some de toda lista, menos da do arquivo.
    if ((filtro === 'arquivados') !== (c.ativo === false)) return false
    if (CATEGORIAS_CONTATO.some(([k]) => k === filtro)) return categoriasDe(c).includes(filtro)
    switch (filtro) {
      case 'ja_receberam': return Number(c.recebimentos) > 0
      case 'nunca_receberam': return Number(c.recebimentos) === 0
      case 'receberam_ultima': return !!c.recebeu_ultima
      case 'incompleto': return !!c.incompleto
      case 'presskit': case 'selecionados': return !!(c.atual && c.atual.status !== 'cancelado')
      case 'voucher': return Number(c.vouchers_edicao) > 0
      default: return true
    }
  })
}

// Temas da edição agrupados pelo tema (normalizado): um grupo com mais de uma
// marca é conflito; a ordem dentro do grupo é a prioridade calculada no banco.
export function agruparTemas(temas) {
  const grupos = new Map()
  for (const t of temas || []) {
    const k = t.tema_norm || String(t.tema || '').toLowerCase()
    if (!grupos.has(k)) grupos.set(k, { chave: k, tema: t.tema, itens: [] })
    grupos.get(k).itens.push(t)
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, itens: g.itens.sort((a, b) => Number(a.prioridade) - Number(b.prioridade)), conflito: g.itens.length > 1,
                   aprovado: g.itens.find((i) => i.status === 'aprovado') || null }))
    .sort((a, b) => (b.conflito - a.conflito) || String(a.tema).localeCompare(String(b.tema), 'pt-BR'))
}

// Resumo das vendas da edição para a organização.
export function resumoVendas(dados) {
  const marcas = (dados && dados.marcas) || []
  const comConta = marcas.filter((m) => m.tem_conta)
  return {
    total: marcas.reduce((s, m) => s + Number(m.total || 0), 0),
    registraramHoje: comConta.filter((m) => m.registrou_hoje).length,
    faltamHoje: comConta.filter((m) => !m.registrou_hoje).length,
    totalHoje: marcas.reduce((s, m) => s + Number((m.dias || {})[dados.hoje] || 0), 0),
  }
}

// Dias do festival (AAAA-MM-DD), para a tabela de vendas.
export function diasDoFestival(inicio, fim) {
  if (!inicio || !fim) return []
  const out = []
  const a = dias(inicio); const b = dias(fim)
  for (let x = a; x <= b && out.length < 60; x++) out.push(new Date(x * 864e5).toISOString().slice(0, 10))
  return out
}
