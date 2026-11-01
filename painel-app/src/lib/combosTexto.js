/*
 * Social media › Combos (31/10/2026, pedido do Wilker): os combos preenchidos da edição, por participante, e o texto pronto
 * para colar no WhatsApp (negrito com *…*). Função pura, sem DOM nem rede; testada em tests/painel-app-combos.test.mjs.
 *
 * Entrada: uma linha por participação, a de `editorial_combos` — { marca, instagram, tema, combo_status,
 * alterado_apos_aprovacao, para_viagem, combo: { nome, descricao, condicoes, preco, itens: [{ tipo, nome, descricao,
 * ingredientes, alimentar, substituicoes }] } } (o `combo` é o de `montar_publico(…, 'marca_e_combo')`).
 *
 * Regras do projeto que o texto respeita (as mesmas de edicaoMarca.js e do site):
 *  1. Declaração alimentar AUSENTE = "não respondido": nunca vira "não contém".
 *  2. "Sem lactose" ≠ "sem leite": lactose é característica; leite é alergênico.
 *  3. Nada é inventado nem reescrito: o que a marca escreveu sai como veio.
 */
const t = (v) => String(v == null ? '' : v).trim()

export const TIPOS = [['doce', 'Doce'], ['salgado', 'Salgado'], ['bebida', 'Bebida']]
const ROTULO_TIPO = Object.fromEntries(TIPOS)
const DE = { doce: 'do doce', salgado: 'do salgado', bebida: 'da bebida' }
export const ALERGENICOS = [['gluten', 'glúten'], ['leite', 'leite'], ['ovo', 'ovo'], ['amendoim', 'amendoim'], ['castanhas', 'castanhas'], ['soja', 'soja'], ['peixe', 'peixe'], ['crustaceos', 'crustáceos']]
const DISPONIBILIDADE = { sempre: 'sempre disponível', sob_consulta: 'sob consulta', limitada: 'limitada, até acabar' }
const MODALIDADE = { local: 'no local', retirada: 'retirada', delivery: 'delivery' }
export const MARCADOR_STATUS = {
  aprovado: '✅ aprovado',
  em_analise: '🔎 em análise',
  correcao_solicitada: '↩️ ajuste pedido à marca',
  rascunho: '✏️ em preenchimento (pode mudar)',
}

export const real = (n) => 'R$ ' + Number(n).toFixed(2).replace('.', ',')
const juntar = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1])
/** "@usuario" (o que a marca escreveu, com @; link fica como está). */
export const arroba = (v) => { const s = t(v); return !s ? '' : /^(@|https?:)/i.test(s) ? s : '@' + s }

/* ── Quem aparece ──────────────────────────────────────────────────────────── */

/** Já preencheu ALGO do combo: nome, descrição ou nome/descrição de qualquer item. */
export function preenchido(d) {
  const c = (d && d.combo) || {}
  return !!(t(c.nome) || t(c.descricao) || (c.itens || []).some((i) => t(i.nome) || t(i.descricao)))
}

export const FILTROS_COMBOS = [['preenchidos', 'Preenchidos'], ['aprovados', 'Aprovados'], ['andamento', 'Em análise ou em preenchimento'], ['em_branco', 'Ainda em branco'], ['todos', 'Todos']]

/** `filtro`: um dos de FILTROS_COMBOS (outro valor = 'preenchidos'). `busca`: marca, tema ou nome do combo. */
export function filtrarCombos(lista, filtro, busca = '') {
  const q = t(busca).toLowerCase()
  return (lista || []).filter((d) => {
    const ok = filtro === 'todos' ? true
      : filtro === 'em_branco' ? !preenchido(d)
      : filtro === 'aprovados' ? preenchido(d) && d.combo_status === 'aprovado'
      : filtro === 'andamento' ? preenchido(d) && d.combo_status !== 'aprovado'
      : preenchido(d)
    return ok && (!q || [d.marca, d.tema, d.combo && d.combo.nome].some((x) => t(x).toLowerCase().includes(q)))
  })
}

export function contarCombos(lista) {
  const l = lista || []
  const p = l.filter(preenchido)
  return {
    total: l.length,
    preenchidos: p.length,
    aprovados: p.filter((d) => d.combo_status === 'aprovado').length,
    andamento: p.filter((d) => d.combo_status !== 'aprovado').length,
    em_branco: l.length - p.length,
  }
}

/* ── O que a marca declarou de cada item ───────────────────────────────────── */

/** Selos (vegano, sem glúten…), o que contém, o que pode conter e o que ficou sem resposta. */
export function alimentarDoItem(item) {
  const m = Object.fromEntries(((item && item.alimentar) || []).map((d) => [d.aspecto, d]))
  const estado = (a) => (m[a] ? m[a].estado : null)
  const selos = []
  if (estado('vegano') === 'sim') selos.push('vegano')
  else if (estado('vegetariano') === 'sim') selos.push('vegetariano')
  if (estado('gluten') === 'nao_contem') selos.push('sem glúten')
  if (estado('lactose') === 'nao') selos.push('sem lactose')
  if (estado('acucar_adicionado') === 'nao') selos.push('sem açúcar adicionado')
  const contem = [], pode = [], semResposta = []
  let respondidos = 0
  for (const [a, rotulo] of ALERGENICOS) {
    const e = estado(a)
    if (e === 'contem') { contem.push(rotulo); respondidos++ }
    else if (e === 'pode_conter') { pode.push(rotulo); respondidos++ }
    else if (e === 'nao_contem') respondidos++
    else semResposta.push(rotulo) // ausente ou "não sei"
  }
  const outro = m.outro_alergenico
  if (outro && (outro.estado === 'contem' || outro.estado === 'pode_conter')) {
    // A observação já pode vir como "Contém abacaxi": tira o prefixo para não repetir o verbo.
    (outro.estado === 'contem' ? contem : pode).push(t(outro.observacao).replace(/^cont[eé]m\s+/i, '').toLowerCase() || 'outro alergênico')
  }
  return { selos, contem, pode, semResposta, respondidos }
}

/** "Alergênicos: contém glúten e leite · pode conter ovo." (ausente = "ainda não informados", nunca "não contém"). */
export function linhaAlergenicos(a) {
  if (a.respondidos === 0) return 'Alergênicos: ainda não informados.'
  const partes = []
  if (a.contem.length) partes.push('contém ' + juntar(a.contem))
  if (a.pode.length) partes.push('pode conter ' + juntar(a.pode))
  if (a.semResposta.length) partes.push('sem resposta: ' + juntar(a.semResposta))
  if (!partes.length) return 'Alergênicos: não contém nenhum dos 8 alergênicos principais.'
  return 'Alergênicos: ' + partes.join(' · ') + '.'
}

/** "Bebida: Café Carioca → Café (sempre disponível; sem acréscimo) — como pedir: …" (acréscimo vazio = não informado). */
export function descricaoDaTroca(item, s) {
  const extras = []
  if (s.disponibilidade && DISPONIBILIDADE[s.disponibilidade]) extras.push(DISPONIBILIDADE[s.disponibilidade])
  if (s.acrescimo != null) extras.push(Number(s.acrescimo) > 0 ? '+ ' + real(s.acrescimo) : 'sem acréscimo')
  if (Array.isArray(s.modalidades) && s.modalidades.length) extras.push('só ' + juntar(s.modalidades.map((x) => MODALIDADE[x] || x)))
  let l = (ROTULO_TIPO[item.tipo] || item.tipo) + ': ' + t(s.original) + ' → ' + t(s.alternativa)
  if (extras.length) l += ' (' + extras.join('; ') + ')'
  if (t(s.como_solicitar)) l += ' — como pedir: ' + t(s.como_solicitar)
  return l
}

/** Os itens do combo em ordem (doce, salgado, bebida). */
export const itensOrdenados = (d) => [...((d && d.combo && d.combo.itens) || [])].sort((a, b) => (a.posicao || 0) - (b.posicao || 0))

/** Todas as trocas do combo, já como texto, com o item de origem. */
export const trocasDoCombo = (d) => itensOrdenados(d).flatMap((i) => (i.substituicoes || []).map((s) => descricaoDaTroca(i, s)))

/** O que ainda não está no cadastro (em português), para a pessoa saber que o texto está incompleto. */
export function faltas(d) {
  const c = (d && d.combo) || {}
  const f = []
  if (!t(c.nome)) f.push('nome do combo')
  if (!t(c.descricao)) f.push('descrição do combo')
  for (const [tipo] of TIPOS) {
    const i = (c.itens || []).find((x) => x.tipo === tipo)
    if (!i || !t(i.nome)) f.push('nome ' + DE[tipo])
    if (!i || !t(i.descricao)) f.push('descrição ' + DE[tipo])
    if (i && alimentarDoItem(i).respondidos < ALERGENICOS.length) f.push('alergênicos ' + DE[tipo])
  }
  return f
}

/** Marcador do status do combo para o texto ("✅ aprovado · a marca alterou depois de aprovado"). */
export const marcadorDoStatus = (d) => (MARCADOR_STATUS[d.combo_status] || '') + (d.alterado_apos_aprovacao ? ' · a marca alterou depois de aprovado' : '')

/* ── Campos fixos (31/10/2026) ─────────────────────────────────────────────────
 * Todo participante mostra os MESMOS campos, na MESMA ordem (o Word, o cartão e o texto do WhatsApp). O que a marca ainda
 * não respondeu aparece NO LUGAR do campo como "Aguardando informação"; campo opcional vazio, "Não informado". Acabou a
 * lista "Ainda sem" no fim. */
export const AGUARDANDO = 'Aguardando informação'
export const NAO_INFORMADO = 'Não informado'
const MODOS = { local: 'No local', retirada: 'Retirada', delivery: 'Delivery' }

/** Selos e alergênicos de um item: '' = ainda sem resposta (vira "Aguardando informação"). */
export function selosEAlergenicos(item) {
  const a = alimentarDoItem(item || {})
  return {
    selos: a.selos.length ? a.selos.join(' · ') : a.respondidos ? 'Nenhum declarado' : '',
    alergenicos: a.respondidos ? linhaAlergenicos(a).replace(/^Alergênicos: /, '').replace(/\.$/, '').replace(/^./, (x) => x.toUpperCase()) : '',
  }
}

/** As trocas cadastradas (menos as ocultas) e as opções escritas na descrição: [{ tipo, texto, daDescricao, campo }]. */
export function trocasEOpcoes(d) {
  const ocultas = new Set(d._ocultas || [])
  const out = []
  for (const [tipo] of TIPOS) {
    const i = ((d.combo && d.combo.itens) || []).find((x) => x.tipo === tipo)
    ;((i && i.substituicoes) || []).forEach((s, k) => {
      if (ocultas.has(tipo + '.troca' + k)) return
      out.push({ tipo, texto: descricaoDaTroca(i, s).replace(/^[^:]+: /, ''), daDescricao: false, campo: tipo + '.trocas' })
    })
  }
  for (const o of d._opcoes || []) out.push({ tipo: o.item, texto: o.texto, daDescricao: o.onde, campo: null })
  return out
}

export const ONDE_DESCRICAO = { combo: 'na descrição do combo', doce: 'na descrição do doce', salgado: 'na descrição do salgado', bebida: 'na descrição da bebida' }

/** Endereço numa linha: "Rua, 10 – Bairro, Cidade/UF – CEP 59000-000 (referência)". */
export function enderecoTexto(e) {
  if (!e) return ''
  const rua = [t(e.logradouro), t(e.numero)].filter(Boolean).join(', ')
  const lugar = [t(e.bairro), [t(e.cidade), t(e.uf)].filter(Boolean).join('/')].filter(Boolean).join(', ')
  return [rua, lugar, t(e.cep) && 'CEP ' + t(e.cep)].filter(Boolean).join(' – ') + (t(e.referencia) ? ' (' + t(e.referencia) + ')' : '')
}
export const foneTexto = (n) => { const s = t(n).replace(/\D/g, ''); return s.length === 11 ? `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}` : t(n) }
export const atendimentoTexto = (u) => Object.entries((u && u.combo && u.combo.modos) || {}).filter(([, s]) => s === 'sim').map(([m]) => MODOS[m] || m).join(' · ')

/* ── O texto ───────────────────────────────────────────────────────────────── */

const v = (x, vazio = AGUARDANDO) => t(x) || vazio

/** O bloco de UMA participação (já revisada: `paraTexto` em alteracoesCampo.js). `horario(u)` = frase do horário. */
export function textoDoCombo(d, n = null, { horario = () => '' } = {}) {
  const c = d.combo || {}
  const marcador = preenchido(d) ? marcadorDoStatus(d) : '⚠️ combo ainda não preenchido'
  const L = []
  L.push('*' + (n ? n + '. ' : '') + t(d.marca) + '*' + (marcador ? '  ' + marcador : ''))
  L.push('Instagram: ' + v(arroba(d.instagram), NAO_INFORMADO))
  L.push('Tema: ' + v(d.tema))
  L.push('Combo: ' + (t(c.nome) ? '*' + t(c.nome) + '*' : AGUARDANDO))
  L.push('Descrição: ' + v(c.descricao))
  L.push('Condições: ' + v(c.condicoes, 'nenhuma informada'))
  L.push('Para viagem: ' + (d.para_viagem === true ? 'sim' : d.para_viagem === false ? 'não' : AGUARDANDO))
  for (const [tipo, rotulo] of TIPOS) {
    const i = (c.itens || []).find((x) => x.tipo === tipo) || {}
    const sa = selosEAlergenicos(i)
    L.push('', '*' + rotulo + ':* ' + v(i.nome))
    L.push('  Descrição: ' + v(i.descricao))
    if (t(i.ingredientes)) L.push('  Ingredientes: ' + t(i.ingredientes))
    L.push('  Selos: ' + v(sa.selos))
    L.push('  Alergênicos: ' + v(sa.alergenicos))
  }
  const tr = trocasEOpcoes(d)
  L.push('', '*Trocas e opções:*' + (tr.length ? '' : ' nenhuma informada'))
  for (const x of tr) L.push('• ' + (ROTULO_TIPO[x.tipo] || x.tipo) + ': ' + x.texto + (x.daDescricao ? ' (' + ONDE_DESCRICAO[x.daDescricao] + ')' : ''))
  const us = d.unidades || []
  L.push('', '*Onde encontrar:*' + (us.length ? '' : ' ' + AGUARDANDO))
  for (const u of us) {
    L.push('• ' + v(u.nome, 'unidade sem nome') + ' — ' + v(enderecoTexto(u.endereco)))
    L.push('  Atendimento: ' + v(atendimentoTexto(u)) + ' · Horário: ' + v(horario(u)))
  }
  return L.join('\n')
}

/** O texto de vários (A–Z), todos com os mesmos campos. `edicao` = { codigo, nome, valor_combo }; `data` = "31/10/2026". */
export function textoDeTodos(lista, { edicao = null, data = '', horario } = {}) {
  const itens = [...(lista || [])].sort((a, b) => t(a.marca).localeCompare(t(b.marca), 'pt-BR'))
  const preco = edicao && edicao.valor_combo != null ? edicao.valor_combo : null
  const nomeEdicao = edicao ? ['Sweet & Coffee Week', t(edicao.nome), edicao.codigo ? '(' + edicao.codigo + ')' : ''].filter(Boolean).join(' ') : 'Sweet & Coffee Week'
  const L = []
  L.push('*COMBOS DOS PARTICIPANTES · ' + nomeEdicao + '*')
  L.push(itens.length + (itens.length === 1 ? ' participante' : ' participantes') + (preco != null ? ' · valor do combo ' + real(preco) : '') + (data ? ' · posição de ' + data : ''))
  L.push('✅ aprovado pela organização · 🔎 em análise · ✏️ em preenchimento (a marca ainda pode mudar)')
  L.push('Selos e alergênicos são o que a própria marca declarou. “' + AGUARDANDO + '” = a marca ainda não respondeu.')
  L.push('')
  itens.forEach((d, i) => { L.push(textoDoCombo(d, i + 1, { horario })); L.push('', '—', '') })
  return L.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n—\n*$/, '').trim() + '\n'
}
