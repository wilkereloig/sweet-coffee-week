/*
 * Mesclagem do Cadastro da marca com o que mudou no servidor (19/10/2026). Puro:
 * sem rede, sem DOM, sem React. Testado em tests/painel-app-sync-cadastro.test.mjs.
 *
 * O cadastro (Cadastro.jsx) guarda, para cada coluna que a marca pode gravar, a
 * "foto" do que o servidor confirmou (baseRef, no espaço do CORPO do PATCH). Quando a
 * organização (ou outro aparelho da marca) muda o dado com a tela aberta, esta lib
 * compara, campo a campo, BASE × TELA × SERVIDOR (mesclarExterno, lib/sync/mesclar.js):
 *
 *   tela == base            → a pessoa não mexeu: adota o do servidor (tela E base)
 *   servidor == base        → ninguém mexeu fora: fica o da tela
 *   tela == servidor        → coincidiram: só a base acompanha
 *   os três diferentes      → CONFLITO: fica o da tela, a base NÃO anda (o salvamento
 *                             automático pula a coluna até a pessoa escolher)
 *
 * Linhas: nova no servidor (que a tela e a base não conheciam) → aparece; sumiu do
 * servidor → some da tela, a menos que a pessoa esteja editando (então fica, vira
 * "órfã" — não é mais gravada — e é avisada). Nada aqui escreve: o planejamento só devolve
 * o que a tela deve aplicar; quem grava é o salvamento da pessoa, nunca a releitura.
 */
import { mesclarExterno, igualValor } from './sync/mesclar.js'
import * as E from './edicaoMarca.js'
import { ROTULO_POSICAO } from './cadastro.js'

export { igualValor }

const texto = (v) => String(v == null ? '' : v).trim()
const ehObjeto = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

/** Une fragmentos de tela: objetos se fundem, listas se concatenam, nos demais o último vence. */
export function juntar(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b]
  if (ehObjeto(a) && ehObjeto(b)) {
    const r = { ...a }
    for (const k of Object.keys(b)) r[k] = k in a ? juntar(a[k], b[k]) : b[k]
    return r
  }
  return b
}

/* ── 1. Uma linha, no espaço do corpo do PATCH ────────────────────────────── */
/**
 * `espelho` = colunas derivadas de outras (endereço da participação, `ordem`, `faz_delivery`):
 * não se mesclam, a base só acompanha o servidor — a tela as recalcula a partir dos campos de origem.
 */
export function mesclarCorpo({ base, local, servidor, chaves, espelho = [] }) {
  const lista = (chaves || Object.keys(servidor || {})).filter((k) => !espelho.includes(k))
  const m = mesclarExterno({ base: base || {}, local: local || {}, servidor: servidor || {}, campos: lista })
  const novaBase = { ...m.base }
  for (const k of espelho) if (servidor && k in servidor) novaBase[k] = servidor[k]
  return { base: novaBase, adotados: m.adotados, conflitos: m.conflitos, mudouExterno: m.mudouExterno }
}

/* ── 2. Uma coleção de linhas (itens, unidades, horários, trocas, declarações) ── */
/**
 * base:     { [id]: corpo }                                  o que baseRef guarda
 * locais:   [{ chave, id|null, corpo }]                      linhas da tela (id nulo = ainda não gravada)
 * servidor: [{ chave, id, corpo }]
 * esquecidas: ids que a PESSOA removeu e cujo DELETE pode estar em voo (nunca ressuscitam)
 * A `chave` casa tela e servidor (para a maioria é o id; declaração usa item|aspecto).
 */
export function mesclarColecao({ base = {}, locais, servidor, esquecidas = new Set(), espelho = [], chaves, sujoExtra }) {
  const srv = new Map(servidor.map((s) => [s.chave, s]))
  const loc = new Map(locais.map((l) => [l.chave, l]))
  const novaBase = { ...base }
  const existentes = {}
  const novas = []
  const removidas = []
  const removidasEditando = []
  for (const [chave, l] of loc) {
    const s = srv.get(chave)
    const b = l.id != null ? base[l.id] : undefined
    if (!s) {
      if (l.id == null) continue                         // ainda não foi gravada: não é do servidor
      const sujo = !b || Object.keys(b).some((k) => !igualValor(l.corpo[k], b[k])) || !!(sujoExtra && sujoExtra(l))
      if (sujo) removidasEditando.push(chave)
      else { removidas.push(chave); delete novaBase[l.id] }
      continue
    }
    const m = mesclarCorpo({ base: b, local: l.corpo, servidor: s.corpo, chaves, espelho })
    existentes[chave] = { ...m, id: s.id }
    if (l.id != null && String(l.id) !== String(s.id)) delete novaBase[l.id]
    novaBase[s.id] = m.base
  }
  for (const [chave, s] of srv) {
    // base conhece, tela não: a pessoa removeu (o DELETE pode estar em voo) — não ressuscitar
    if (loc.has(chave) || esquecidas.has(String(s.id)) || String(s.id) in base) continue
    novas.push(chave)
    novaBase[s.id] = s.corpo
  }
  return { base: novaBase, existentes, novas, removidas, removidasEditando }
}

/* ── 3. Base e conflitos ──────────────────────────────────────────────────── */
const FATIA = { marca: 'marca', participacao: 'participacao', item: 'itens', un: 'un', pu: 'pu', disp: 'disp', decl: 'decl', sub: 'sub' }
const FATIAS_LINHA = ['itens', 'un', 'pu', 'disp', 'decl', 'sub']

export function clonarBase(base) {
  const b = base || {}
  const r = { marca: b.marca ? { ...b.marca } : null, participacao: b.participacao ? { ...b.participacao } : null }
  for (const f of FATIAS_LINHA) r[f] = { ...(b[f] || {}) }
  return r
}

/** Colunas em conflito aberto de uma linha: o salvamento automático NÃO as grava. */
export function bloqueadasDe(conflitos, ent, id = '') {
  const s = new Set()
  for (const c of Object.values(conflitos || {})) {
    if (c.ent === ent && c.chave !== '__removida' && String(c.id == null ? '' : c.id) === String(id == null ? '' : id)) s.add(c.chave)
  }
  return s
}

/** Escreve um valor na base (muda `base` no lugar). */
export function definirNaBase(base, c, valor) {
  const f = FATIA[c.ent]
  if (c.ent === 'marca' || c.ent === 'participacao') { base[f] = { ...(base[f] || {}), [c.chave]: valor }; return }
  base[f] = base[f] || {}
  base[f][c.id] = { ...(base[f][c.id] || {}), [c.chave]: valor }
}

/** Tira a linha da base (a organização a removeu e a pessoa escolheu seguir sem ela ou regravá-la como nova). */
export function apagarDaBase(base, c) {
  const f = FATIA[c.ent]
  if (base[f] && c.id != null) delete base[f][c.id]
}

/**
 * Um salvamento troca a base pelo que o servidor devolveu — inclusive a coluna em conflito,
 * que ele não enviou. Sem isto a base igualaria o servidor e o PRÓXIMO salvamento mandaria o
 * valor da tela por cima, em silêncio. Depois de gravar, devolve ao conflito a base de antes.
 */
export function reimporConflitos(base, conflitos) {
  for (const c of Object.values(conflitos || {})) if (c.chave !== '__removida') definirNaBase(base, c, c.baseKept)
}

/* ── 4. Aplicar um fragmento de tela no estado (todas puras e idempotentes) ───── */
const mesmaLista = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

export const aplicarCampos = (prev, patch) => (patch && Object.keys(patch).length ? { ...prev, ...patch } : prev)

export function aplicarItens(prev, p) {
  if (!p) return prev
  const fora = new Set((p.remover || []).map(String))
  let r = prev.filter((i) => !fora.has(String(i.id)))
  r = r.map((i) => (p.porId && p.porId[i.id] ? { ...i, ...p.porId[i.id] } : i))
  const novos = (p.novos || []).filter((n) => !r.some((i) => String(i.id) === String(n.id)))
  if (novos.length) r = [...r, ...novos]
  return mesmaLista(r, prev) ? prev : r
}

function aplicarDisp(prev, d) {
  const fora = new Set((d.remover || []).map(String))
  let r = prev.filter((x) => !fora.has(String(x.id))).map((x) => (d.porId && d.porId[x.id] ? { ...x, ...d.porId[x.id] } : x))
  const novos = (d.novos || []).filter((n) => !r.some((x) => String(x.id) === String(n.id)))
  if (novos.length) r = [...r, ...novos].sort((a, b) => (a.data + a.abre).localeCompare(b.data + b.abre))
  return mesmaLista(r, prev) ? prev : r
}

// A unidade em branco que a tela mostra enquanto não há nenhuma: some quando chega uma de verdade.
const forma = (u) => JSON.stringify([E.corpoUnidade(u), E.corpoParticipacaoUnidade(u, 0)])
const FORMA_VAZIA = forma(E.unidadeDeLinhas(null, null))
const unidadeIntocada = (u) => !u.unId && !u.puId && forma(u) === FORMA_VAZIA

export function aplicarUnidades(prev, p) {
  if (!p) return prev
  const fora = new Set(p.remover || [])
  let r = prev.filter((u) => !fora.has(u._key))
  r = r.map((u) => {
    const campos = p.porChave && p.porChave[u._key]
    const d = p.disp && p.disp[u._key]
    if (!campos && !d) return u
    return { ...u, ...(campos || {}), ...(d ? { disponibilidade: aplicarDisp(u.disponibilidade || [], d) } : {}) }
  })
  const novas = (p.novas || []).filter((n) => !r.some((u) => u._key === n.u._key || (n.u.puId && u.puId === n.u.puId)))
  if (novas.length) {
    r = r.filter((u) => !unidadeIntocada(u))
    for (const n of novas) r.splice(Math.min(Math.max(Number(n.em) || 0, 0), r.length), 0, n.u)
  }
  return mesmaLista(r, prev) ? prev : r
}

export function aplicarDeclaracoes(prev, p) {
  if (!p) return prev
  const r = { ...prev }
  for (const { itemId, aspecto } of p.remover || []) {
    if (!r[itemId]) continue
    const { [aspecto]: _fora, ...resto } = r[itemId]
    r[itemId] = resto
  }
  for (const [nk, campos] of Object.entries(p.porNk || {})) {
    const [itemId, aspecto] = nk.split('|')
    const atual = (r[itemId] || {})[aspecto] || {}
    r[itemId] = { ...(r[itemId] || {}), [aspecto]: { observacao: '', ...atual, ...campos } }
  }
  return r
}

export function aplicarSubstituicoes(prev, p) {
  if (!p) return prev
  const fora = new Set(p.remover || [])
  let r = prev.filter((s) => !fora.has(s._key))
  r = r.map((s) => (p.porKey && p.porKey[s._key] ? { ...s, ...p.porKey[s._key] } : s))
  const novas = (p.novas || []).filter((n) => !r.some((s) => s._key === n._key || (s.id != null && String(s.id) === String(n.id))))
  if (novas.length) r = [...r, ...novas]
  return mesmaLista(r, prev) ? prev : r
}

/** Aplica um fragmento inteiro num "vivo" (usado pelos testes; a tela aplica fatia a fatia nos setters). */
export function aplicarNoVivo(vivo, t = {}) {
  return {
    ...vivo,
    marca: aplicarCampos(vivo.marca, t.marca),
    tema: aplicarCampos(vivo.tema, t.tema),
    combo: aplicarCampos(vivo.combo, t.combo),
    custosStr: aplicarCampos(vivo.custosStr, t.custosStr),
    extras: aplicarCampos(vivo.extras, t.extras),
    itens: aplicarItens(vivo.itens, t.itens),
    unidades: aplicarUnidades(vivo.unidades, t.unidades),
    declaracoes: aplicarDeclaracoes(vivo.declaracoes, t.declaracoes),
    substituicoes: aplicarSubstituicoes(vivo.substituicoes, t.substituicoes),
  }
}

/* ── 5. Rótulos e valores para a pessoa (nada de nome de coluna na tela) ──────── */
const ROT_MARCA = {
  nome_marca: 'Nome da marca', responsavel: 'Responsável pelo festival', telefone: 'WhatsApp do responsável', email: 'E-mail de contato',
  instagram: 'Instagram', site: 'Site', cnpj: 'CNPJ', razao_social: 'Razão social', apresentacao_publica: 'Apresentação da casa',
}
const ROT_PA = {
  tema_combo: 'Tema escolhido pela marca', tema_justificativa: 'Justificativa do tema', combo_nome: 'Nome do combo',
  combo_descricao: 'Descrição do combo', combo_condicoes: 'Condições do combo', custo_embalagem: 'Custo da embalagem para viagem',
  custo_delivery: 'Custo do delivery', combo_para_viagem: 'Pode ser para viagem?', combo_proposta: 'Proposta criativa do combo',
}
const ROT_ITEM = { nome: 'Nome', descricao: 'Descrição', tipo: 'Doce ou salgado' }
const ROT_UN = {
  nome_unidade: 'Nome da unidade', logradouro: 'Rua ou avenida', numero: 'Número', complemento: 'Complemento', referencia: 'Referência',
  bairro: 'Bairro', cidade: 'Cidade', uf: 'Estado (UF)', cep: 'CEP', whatsapp_publico: 'WhatsApp da unidade',
  whatsapp_autorizado: 'Autorização do WhatsApp no site', horario_loja_texto: 'Horário da loja',
}
const ROT_PU = {
  participa: 'Participa da edição', consumo_local: 'Consumo no local', retirada: 'Retirada', delivery_combo: 'Delivery do combo',
  canais_delivery: 'Onde pedir o delivery', delivery_regioes: 'Regiões atendidas', delivery_taxa: 'Taxa de entrega',
  observacao_combo: 'O que muda no combo nesta unidade',
}
const ROT_DISP = { abre: 'abre', fecha: 'fecha', observacao: 'observação' }
const ROT_SUB = {
  original: 'o que sai', alternativa: 'o que entra', disponibilidade: 'disponibilidade', acrescimo: 'acréscimo',
  como_solicitar: 'como pedir', modalidades: 'vale para', unidades: 'unidades',
}
const ROT_ASPECTO = {
  ...Object.fromEntries(E.ALERGENICOS_PAINEL), outro_alergenico: 'Outro alergênico',
  lactose: 'Lactose', vegano: 'Vegano', vegetariano: 'Vegetariano', acucar_adicionado: 'Açúcar adicionado',
}

const ENUM_POR_CHAVE = {
  consumo_local: new Map(E.ESTADOS_TRES), retirada: new Map(E.ESTADOS_TRES), delivery_combo: new Map(E.ESTADOS_TRES),
  estado: new Map([...E.ESTADOS_ALERGENICO, ...E.ESTADOS_CARACTERISTICA]), disponibilidade: new Map(E.DISPONIBILIDADES),
}
const MODALIDADE = new Map(E.MODALIDADES)

/** O valor de um campo como a pessoa lê ("Sim", "Retirada"…), nunca o código do banco. */
export function valorLegivel(chave, v) {
  if (v === true) return 'Sim'
  if (v === false) return 'Não'
  if (chave === 'canais_delivery' && Array.isArray(v)) return v.map((c) => (c && c.tipo ? c.tipo + ': ' + c.link : String(c))).join(' · ')
  if (chave === 'modalidades' && Array.isArray(v)) return v.map((m) => MODALIDADE.get(m) || m).join(', ')
  if (chave === 'unidades' && Array.isArray(v)) return v.length === 1 ? '1 unidade' : v.length + ' unidades'
  const enumeracao = ENUM_POR_CHAVE[chave]
  if (enumeracao && typeof v === 'string' && enumeracao.has(v)) return enumeracao.get(v)
  return v
}

const nomeItem = (i) => (i && ROTULO_POSICAO[i.posicao] ? ROTULO_POSICAO[i.posicao].split(' · ')[0] : 'Item')

/* ── 6. O planejamento ─────────────────────────────────────────────────────── */
const ESPELHO_PU = ['ordem', 'endereco', 'bairro', 'faz_delivery']
const CAMPO_PU = { canais_delivery: 'canais' }
const ONDE_PA = {
  tema_combo: ['tema', 'tema_combo', 1], tema_justificativa: ['tema', 'tema_justificativa', 1],
  combo_nome: ['combo', 'combo_nome', 3], combo_descricao: ['combo', 'combo_descricao', 3], combo_condicoes: ['combo', 'combo_condicoes', 3],
  custo_embalagem: ['custosStr', 'embalagem', 3], custo_delivery: ['custosStr', 'delivery', 3],
  combo_para_viagem: ['extras', 'combo_para_viagem', 3], combo_proposta: ['extras', 'combo_proposta', 3],
}

// Unidade na tela → corpo para comparar. Valor inválido (CEP pela metade) FICA no corpo: é o que a pessoa digitou.
function corpoUnidadeVivo(u) {
  const c = E.corpoUnidade(u)
  if (!('cep' in c)) c.cep = texto(u.cep)
  if (!('uf' in c)) c.uf = texto(u.uf)
  if (!('whatsapp_publico' in c)) c.whatsapp_publico = texto(u.whatsapp_publico)
  return c
}

/**
 * @param {object} p
 *   vivo:  { marca, tema, combo, custosStr, extras, itens, unidades, declaracoes, substituicoes } — a tela agora
 *   base:  baseRef.current
 *   snap:  { p, pa, edicao, tema, novo, itensRows, puRows, unRows, dispRows, declRows, subRows } — o servidor agora
 *   mapas: { marcaDeLinha, corpoMarca, participacaoDeLinha, corpoParticipacao, pedidoItem } — as do Cadastro.jsx (donas do contrato do grant)
 *   ids:   { unId(u), puId(u), declId(itemId, aspecto, d), subId(s) } — ids já devolvidos pelo servidor e ainda fora do estado
 *   esquecidas: Set de ids que a pessoa removeu
 * @returns {{ base, tela, conflitos, adotados, orfas, exibicao, servidorIds }}
 */
export function planejarMesclagem({ vivo, base, snap, mapas, ids = {}, esquecidas = new Set() }) {
  const idDe = {
    unId: ids.unId || ((u) => u.unId || null),
    puId: ids.puId || ((u) => u.puId || null),
    declId: ids.declId || ((_i, _a, d) => d.id || null),
    subId: ids.subId || ((s) => s.id || null),
  }
  const b = clonarBase(base)
  let tela = {}
  const conflitos = {}
  const adotados = {}
  const orfas = []
  const servidorIds = new Set()
  const poe = (f) => { tela = juntar(tela, f) }
  const ui = (ent, id, chave) => ent + ':' + (id == null ? '' : id) + ':' + chave

  const colher = (r, { ent, id, bloco, blocoDe, rotulo, telaDe }) => {
    for (const k of r.adotados) {
      adotados[ui(ent, id, k)] = { rotulo: rotulo(k), bloco: blocoDe ? blocoDe(k) : bloco }
      poe(telaDe(k))
    }
    for (const [k, c] of Object.entries(r.conflitos)) {
      conflitos[ui(ent, id, k)] = {
        ent, id, chave: k, bloco: blocoDe ? blocoDe(k) : bloco, rotulo: rotulo(k),
        meu: c.meu, deles: c.deles, baseKept: r.base[k], tela: telaDe(k),
      }
    }
  }
  const removida = ({ ent, id, bloco, rotulo, meu, tela: t, manterTela, limparIds }) => {
    orfas.push(ent + ':' + id)
    conflitos[ui(ent, id, '__removida')] = { ent, id, chave: '__removida', bloco, rotulo, meu, deles: 'Removido pela organização', tela: t, manterTela, limparIds }
  }
  const aviso = (ent, id, marca, bloco, rotulo) => { adotados[ui(ent, id, marca)] = { rotulo, bloco } }

  /* ── marca (bloco 0) ── */
  const marcaSrv = mapas.marcaDeLinha(snap.p)
  const rMarca = mesclarCorpo({ base: b.marca, local: mapas.corpoMarca(vivo.marca), servidor: mapas.corpoMarca(marcaSrv) })
  b.marca = rMarca.base
  colher(rMarca, { ent: 'marca', id: '', bloco: 0, rotulo: (k) => ROT_MARCA[k] || k, telaDe: (k) => ({ marca: { [k]: marcaSrv[k] } }) })
  // O nome é o login e só a organização o muda: a tela só lê, então acompanha sempre.
  if (marcaSrv.nome_marca !== vivo.marca.nome_marca) {
    poe({ marca: { nome_marca: marcaSrv.nome_marca } })
    aviso('marca', '', 'nome_marca', 0, ROT_MARCA.nome_marca)
  }

  /* ── participação: tema (1), combo, custos e extras (3) ── */
  const paSrv = mapas.participacaoDeLinha(snap.pa)
  const rPa = mesclarCorpo({
    base: b.participacao,
    local: mapas.corpoParticipacao({ tema: vivo.tema, combo: vivo.combo, custosStr: vivo.custosStr, extras: vivo.extras }),
    servidor: mapas.corpoParticipacao(paSrv),
  })
  b.participacao = rPa.base
  colher(rPa, {
    ent: 'participacao', id: '', blocoDe: (k) => ONDE_PA[k][2], rotulo: (k) => ROT_PA[k] || k,
    telaDe: (k) => { const [fatia, campo] = ONDE_PA[k]; return { [fatia]: { [campo]: paSrv[fatia][campo] } } },
  })

  /* ── itens (2) ── */
  const itemVivo = new Map(vivo.itens.map((i) => [String(i.id), i]))
  const itemRow = new Map(snap.itensRows.map((r) => [String(r.id), r]))
  const rItens = mesclarColecao({
    base: b.itens,
    locais: vivo.itens.map((i) => ({ chave: String(i.id), id: i.id, corpo: mapas.pedidoItem(i).corpo })),
    servidor: snap.itensRows.map((r) => ({ chave: String(r.id), id: r.id, corpo: mapas.pedidoItem(r).corpo })),
    esquecidas,
  })
  b.itens = rItens.base
  for (const [chave, e] of Object.entries(rItens.existentes)) {
    const r = itemRow.get(chave)
    const vi = itemVivo.get(chave)
    colher(e, { ent: 'item', id: e.id, bloco: 2, rotulo: (k) => nomeItem(vi) + ' · ' + (ROT_ITEM[k] || k), telaDe: (k) => ({ itens: { porId: { [e.id]: { [k]: r[k] } } } }) })
    // colunas que a tela mostra e a pessoa não edita
    const extras = {}
    for (const k of r.posicao === 2 ? ['posicao'] : ['posicao', 'tipo']) if (!igualValor(vi[k], r[k])) extras[k] = r[k]
    if (Object.keys(extras).length) poe({ itens: { porId: { [e.id]: extras } } })
  }
  for (const chave of rItens.novas) { const r = itemRow.get(chave); poe({ itens: { novos: [r] } }); aviso('item', r.id, '__nova', 2, 'Novo item no combo') }
  for (const chave of rItens.removidas) { poe({ itens: { remover: [itemVivo.get(chave).id] } }); aviso('item', chave, '__saiu', 2, 'Item removido pela organização') }
  for (const chave of rItens.removidasEditando) {
    const vi = itemVivo.get(chave)
    removida({ ent: 'item', id: vi.id, bloco: 2, rotulo: nomeItem(vi) + ' · removido', meu: vi.nome || nomeItem(vi), tela: { itens: { remover: [vi.id] } } })
  }

  /* ── unidades (4 e 6), horários do combo (6), declarações e trocas (5): só no modelo novo ── */
  if (snap.novo) {
    const unRow = new Map(snap.unRows.map((r) => [String(r.id), r]))
    const puRow = new Map(snap.puRows.map((r) => [String(r.id), r]))
    for (const r of snap.puRows) servidorIds.add(String(r.id))
    for (const r of snap.dispRows) servidorIds.add(String(r.id))
    for (const r of snap.subRows) servidorIds.add(String(r.id))
    const locais = vivo.unidades.map((u, idx) => ({ u, idx, unId: idDe.unId(u), puId: idDe.puId(u) }))
    const porPu = new Map(locais.filter((x) => x.puId).map((x) => [String(x.puId), x]))
    const nome = (x) => E.nomeDaUnidade(x.u, x.idx)
    const sujoUn = (x) => !!(x.unId && b.un[x.unId]) && Object.entries(corpoUnidadeVivo(x.u)).some(([k, v]) => !igualValor(v, b.un[x.unId][k]))

    // 1. a unidade permanente (endereço, WhatsApp, horário da loja)
    for (const x of locais) {
      if (!x.unId) continue
      const ur = unRow.get(String(x.unId))
      if (!ur) continue
      const su = E.unidadeDeLinhas(null, ur)
      const ch = x.u._key
      if (b.un[x.unId]) {
        const m = mesclarCorpo({ base: b.un[x.unId], local: corpoUnidadeVivo(x.u), servidor: E.corpoUnidade(su) })
        b.un[x.unId] = m.base
        colher(m, { ent: 'un', id: x.unId, bloco: 4, rotulo: (k) => (ROT_UN[k] || k) + ' · ' + nome(x), telaDe: (k) => ({ unidades: { porChave: { [ch]: { [k]: su[k] } } } }) })
      }
      const verificada = !!ur.coordenada_verificada_em
      if (verificada !== !!x.u.verificada) poe({ unidades: { porChave: { [ch]: { verificada } } } })
      if (String(x.u.unId) !== String(x.unId)) poe({ unidades: { porChave: { [ch]: { unId: x.unId } } } })
    }
    // as permanentes que a tela não tem (sugestões): a base acompanha
    for (const ur of snap.unRows) if (!locais.some((x) => String(x.unId) === String(ur.id))) b.un[ur.id] = E.corpoUnidade(E.unidadeDeLinhas(null, ur))

    // 2. a unidade NESTA edição (participacao_unidades)
    const rPu = mesclarColecao({
      base: b.pu,
      locais: locais.filter((x) => x.puId).map((x) => ({ chave: String(x.puId), id: x.puId, corpo: E.corpoParticipacaoUnidade(x.u, x.idx), x })),
      servidor: snap.puRows.map((r) => ({ chave: String(r.id), id: r.id, corpo: E.corpoParticipacaoUnidadeDeLinha(r) })),
      esquecidas, espelho: ESPELHO_PU, sujoExtra: (l) => sujoUn(l.x),
    })
    b.pu = rPu.base
    for (const [chave, e] of Object.entries(rPu.existentes)) {
      const x = porPu.get(chave)
      const r = puRow.get(chave)
      const su = E.unidadeDeLinhas(r, unRow.get(String(r.unidade_id)), snap.dispRows)
      const ch = x.u._key
      colher(e, {
        ent: 'pu', id: e.id, blocoDe: (k) => (k === 'participa' ? 4 : 6), rotulo: (k) => (ROT_PU[k] || k) + ' · ' + nome(x),
        telaDe: (k) => { const c = CAMPO_PU[k] || k; return { unidades: { porChave: { [ch]: { [c]: su[c] } } } } },
      })
      if (String(x.u.puId) !== String(r.id) || x.u.id_publico !== r.id_publico) poe({ unidades: { porChave: { [ch]: { puId: r.id, id_publico: r.id_publico } } } })

      // 3. horários do combo desta unidade
      const rDisp = mesclarColecao({
        base: b.disp,
        locais: (x.u.disponibilidade || []).map((d) => ({ chave: String(d.id), id: d.id, corpo: E.corpoDisponibilidade(d) })),
        servidor: snap.dispRows.filter((d) => String(d.participacao_unidade_id) === chave)
          .map((d) => ({ chave: String(d.id), id: d.id, corpo: E.corpoDisponibilidade(E.disponibilidadeDeLinha(d)) })),
        esquecidas,
      })
      b.disp = rDisp.base
      const dispTela = new Map(snap.dispRows.map((d) => [String(d.id), E.disponibilidadeDeLinha(d)]))
      const dispVivo = new Map((x.u.disponibilidade || []).map((d) => [String(d.id), d]))
      const rotDia = (id) => 'Horário do combo · ' + nome(x) + ' · ' + E.rotuloDia((dispVivo.get(String(id)) || dispTela.get(String(id)) || {}).data)
      for (const [dchave, de] of Object.entries(rDisp.existentes)) {
        colher(de, {
          ent: 'disp', id: de.id, bloco: 6, rotulo: (k) => rotDia(dchave) + ' · ' + (ROT_DISP[k] || k),
          telaDe: (k) => ({ unidades: { disp: { [ch]: { porId: { [de.id]: { [k]: dispTela.get(dchave)[k] } } } } } }),
        })
      }
      for (const dchave of rDisp.novas) { poe({ unidades: { disp: { [ch]: { novos: [dispTela.get(dchave)] } } } }); aviso('disp', dchave, '__nova', 6, 'Novo dia de horário do combo · ' + nome(x)) }
      for (const dchave of rDisp.removidas) { poe({ unidades: { disp: { [ch]: { remover: [dchave] } } } }); aviso('disp', dchave, '__saiu', 6, 'Dia de horário do combo removido · ' + nome(x)) }
      for (const dchave of rDisp.removidasEditando) {
        removida({ ent: 'disp', id: dchave, bloco: 6, rotulo: rotDia(dchave) + ' · removido', meu: 'Horário que você está editando', tela: { unidades: { disp: { [ch]: { remover: [dchave] } } } } })
      }
    }
    for (const chave of rPu.novas) {
      const r = puRow.get(chave)
      const ur = unRow.get(String(r.unidade_id))
      const su = E.unidadeDeLinhas(r, ur, snap.dispRows)
      su.disponibilidade.forEach((d) => { b.disp[d.id] = E.corpoDisponibilidade(d) })
      poe({ unidades: { novas: [{ u: su, em: r.ordem }] } })
      aviso('pu', r.id, '__nova', 4, 'Nova unidade · ' + E.nomeDaUnidade(su, locais.length))
    }
    for (const chave of rPu.removidas) {
      const x = porPu.get(chave)
      poe({ unidades: { remover: [x.u._key] } })
      aviso('pu', chave, '__saiu', 4, 'Unidade fora desta edição · ' + nome(x))
    }
    for (const chave of rPu.removidasEditando) {
      const x = porPu.get(chave)
      const temPerm = !!(x.unId && unRow.has(String(x.unId)))
      // "manter a minha" = a unidade volta a ser gravada: sem o vínculo com a edição (e, se a permanente também sumiu, sem ela)
      const soltar = temPerm ? { puId: null, id_publico: null } : { puId: null, id_publico: null, unId: null }
      removida({
        ent: 'pu', id: x.puId, bloco: 4, rotulo: nome(x) + ' · removida', meu: nome(x),
        tela: { unidades: { remover: [x.u._key] } }, manterTela: { unidades: { porChave: { [x.u._key]: soltar } } },
        limparIds: { pu: [x.u._key], un: temPerm ? [] : [x.u._key] },
      })
    }

    /* ── declarações alimentares (5): a linha é achada por item|aspecto ── */
    const itemDeNk = (nk) => itemVivo.get(nk.split('|')[0])
    const locaisD = []
    for (const [itemId, porAsp] of Object.entries(vivo.declaracoes || {})) {
      for (const [aspecto, d] of Object.entries(porAsp)) {
        locaisD.push({ chave: itemId + '|' + aspecto, id: idDe.declId(itemId, aspecto, d), corpo: E.corpoDeclaracao(d), itemId, aspecto })
      }
    }
    const declRow = new Map(snap.declRows.map((r) => [r.item_id + '|' + r.aspecto, r]))
    const rDecl = mesclarColecao({
      base: b.decl,
      locais: locaisD,
      servidor: snap.declRows.map((r) => ({ chave: r.item_id + '|' + r.aspecto, id: r.id, corpo: E.corpoDeclaracao({ estado: r.estado, observacao: r.observacao || '' }) })),
      esquecidas,
    })
    b.decl = rDecl.base
    const rotDecl = (nk) => (ROT_ASPECTO[nk.split('|')[1]] || nk.split('|')[1]) + ' (' + nomeItem(itemDeNk(nk)) + ')'
    const valorDecl = (r, k) => (k === 'observacao' ? r.observacao || '' : r[k])
    for (const [nk, e] of Object.entries(rDecl.existentes)) {
      const r = declRow.get(nk)
      const antes = locaisD.find((l) => l.chave === nk)
      colher(e, { ent: 'decl', id: e.id, bloco: 5, rotulo: (k) => rotDecl(nk) + (k === 'observacao' ? ' · qual' : ''), telaDe: (k) => ({ declaracoes: { porNk: { [nk]: { id: r.id, [k]: valorDecl(r, k) } } } }) })
      if (antes && String(antes.id) !== String(r.id)) poe({ declaracoes: { porNk: { [nk]: { id: r.id } } } })
    }
    for (const nk of rDecl.novas) {
      const r = declRow.get(nk)
      poe({ declaracoes: { porNk: { [nk]: { id: r.id, estado: r.estado, observacao: r.observacao || '' } } } })
      aviso('decl', r.id, '__nova', 5, rotDecl(nk))
    }
    for (const nk of rDecl.removidas) {
      const [itemId, aspecto] = nk.split('|')
      poe({ declaracoes: { remover: [{ itemId, aspecto }] } })
      aviso('decl', nk, '__saiu', 5, rotDecl(nk) + ' · resposta removida')
    }
    for (const nk of rDecl.removidasEditando) {
      const l = locaisD.find((x) => x.chave === nk)
      const [itemId, aspecto] = nk.split('|')
      removida({
        ent: 'decl', id: l.id, bloco: 5, rotulo: rotDecl(nk) + ' · removida', meu: valorLegivel('estado', vivo.declaracoes[itemId][aspecto].estado),
        tela: { declaracoes: { remover: [{ itemId, aspecto }] } }, manterTela: { declaracoes: { porNk: { [nk]: { id: null } } } },
        limparIds: { ids: ['dec-' + itemId + '-' + aspecto] },
      })
    }

    /* ── trocas (5) ── */
    const subVivo = vivo.substituicoes.map((s) => ({ s, id: idDe.subId(s) })).filter((x) => x.id != null)
    const subPorChave = new Map(subVivo.map((x) => [String(x.id), x.s]))
    const subRow = new Map(snap.subRows.map((r) => [String(r.id), r]))
    const rSub = mesclarColecao({
      base: b.sub,
      locais: subVivo.map((x) => ({ chave: String(x.id), id: x.id, corpo: E.corpoSubstituicao(x.s) })),
      servidor: snap.subRows.map((r) => ({ chave: String(r.id), id: r.id, corpo: E.corpoSubstituicao(E.substituicaoDeLinha(r)) })),
      esquecidas,
    })
    b.sub = rSub.base
    const rotSub = (s, k) => 'Troca · ' + (texto(s.original) || 'sem nome') + ' · ' + (ROT_SUB[k] || k)
    for (const [chave, e] of Object.entries(rSub.existentes)) {
      const s = subPorChave.get(chave)
      const st = E.substituicaoDeLinha(subRow.get(chave))
      colher(e, { ent: 'sub', id: e.id, bloco: 5, rotulo: (k) => rotSub(s, k), telaDe: (k) => ({ substituicoes: { porKey: { [s._key]: { id: e.id, [k]: st[k] } } } }) })
      if (s.id == null || String(s.id) !== String(e.id)) poe({ substituicoes: { porKey: { [s._key]: { id: e.id } } } })
    }
    for (const chave of rSub.novas) { poe({ substituicoes: { novas: [E.substituicaoDeLinha(subRow.get(chave))] } }); aviso('sub', chave, '__nova', 5, 'Nova troca · ' + texto(subRow.get(chave).original)) }
    for (const chave of rSub.removidas) { const s = subPorChave.get(chave); poe({ substituicoes: { remover: [s._key] } }); aviso('sub', chave, '__saiu', 5, 'Troca removida · ' + texto(s.original)) }
    for (const chave of rSub.removidasEditando) {
      const s = subPorChave.get(chave)
      removida({
        ent: 'sub', id: chave, bloco: 5, rotulo: 'Troca · ' + (texto(s.original) || 'sem nome') + ' · removida', meu: texto(s.original) + ' → ' + texto(s.alternativa),
        tela: { substituicoes: { remover: [s._key] } }, manterTela: { substituicoes: { porKey: { [s._key]: { id: null } } } },
        limparIds: { ids: [s._key] },
      })
    }
  }

  /* ── o que a tela só mostra ── */
  const exibicao = { edicaoCodigo: snap.pa.edicao_codigo || '', statusCadastro: snap.pa.status_cadastro || '' }
  if (snap.edicao !== undefined) {
    const ed = snap.edicao || {}
    exibicao.valorCombo = ed.valor_combo ?? null
    exibicao.festival = { inicio: ed.festival_inicio || null, fim: ed.festival_fim || null }
  }
  if (snap.tema !== undefined) exibicao.revisaoTema = snap.tema || null
  if (snap.novo) exibicao.permanentes = snap.unRows

  return { base: b, tela, conflitos, adotados, orfas, exibicao, servidorIds }
}
