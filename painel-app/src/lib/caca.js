/*
 * Caça aos Carimbos no painel (apuração, prêmios, sorteio, regras, revisão, avisos).
 * Regra: docs/cartoon-2026-2/15-caca-especificacao.md §5, §6, §12 e §13.
 * Contratos: 15-caca-contrato-premiacao.md e 15-caca-contrato-metas-push.md.
 *
 * Duas metades:
 *   · funções PURAS (rótulos, estados, ações permitidas, validação das regras, fila de substituição,
 *     comparação de simulações) — testadas em tests/painel-app-caca.test.mjs;
 *   · `cacaApi`: uma função por RPC, com o mesmo corpo que o contrato descreve. O banco decide (permissão,
 *     transição, corte); a tela só repete a conta para avisar cedo e nunca grava por conta própria.
 *
 * ⚠️ Nada aqui sorteia de verdade nem envia notificação. `sortear` chama SEMPRE `p_simular: true` e
 * `simularPush` manda SEMPRE `dry_run: true`: não há parâmetro que mude isso. O sorteio oficial só existe como
 * `realizarSorteioOficial`, que a tela não liga enquanto `SORTEIO_OFICIAL_LIBERADO` for false.
 */
import { rpc, chamarFuncao } from './rpc.js'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess.js'

const lerSenha = () => { try { return globalThis.sessionStorage?.getItem(CHAVE_SESSAO) || '' } catch { return '' } }

/** Só o Wilker liga, num commit à parte, depois de simular e publicar a lista de concorrentes. */
export const SORTEIO_OFICIAL_LIBERADO = false

// ── Estados do prêmio ────────────────────────────────────────────────────────
export const ESTADOS = Object.freeze({
  selecionado: ['Selecionado', 'andamento'],
  confirmado: ['Confirmado', 'ok'],
  entregue: ['Entregue', 'ok'],
  expirado: ['Expirado', 'atencao'],
  substituido: ['Substituído', 'encerrado'],
  cancelado: ['Cancelado', 'encerrado'],
})
export const ORDEM_ESTADOS = Object.freeze(['selecionado', 'confirmado', 'entregue', 'expirado', 'substituido', 'cancelado'])
export const rotuloEstado = (e) => (ESTADOS[e] ? ESTADOS[e][0] : String(e || ''))
export const tomEstado = (e) => (ESTADOS[e] ? ESTADOS[e][1] : 'neutro')

/**
 * Ações do painel sobre um prêmio. `de` e `soTipo` repetem a tabela de transições do banco
 * (caca_premio_acao) só para esconder o que o servidor recusaria; quem decide é o servidor.
 */
export const ACOES = Object.freeze({
  confirmar: { rotulo: 'Confirmar', de: ['selecionado'], nota: false },
  entregar: { rotulo: 'Marcar entregue', de: ['confirmado'], nota: false },
  expirar: { rotulo: 'Expirar', de: ['selecionado'], nota: true, perigo: true },
  substituir: { rotulo: 'Chamar o próximo', de: ['selecionado', 'confirmado', 'expirado'], soTipo: 'voucher_dia', nota: true, perigo: true },
  cancelar: { rotulo: 'Cancelar', de: ['selecionado', 'confirmado'], nota: true, perigo: true },
})
const ORDEM_ACOES = ['confirmar', 'entregar', 'expirar', 'substituir', 'cancelar']

export function acoesPossiveis(premio) {
  if (!premio) return []
  return ORDEM_ACOES.filter((a) => ACOES[a].de.includes(premio.estado) && (!ACOES[a].soTipo || ACOES[a].soTipo === premio.tipo))
}

/** Prazo da confirmação estourado: o banco não expira sozinho, só sinaliza. */
export function estaVencido(premio, agora = Date.now()) {
  if (!premio || premio.estado !== 'selecionado') return false
  if (premio.vencido === true) return true
  const t = premio.prazo_ate ? Date.parse(premio.prazo_ate) : NaN
  return Number.isFinite(t) && t <= agora
}

/** O que a organização costuma fazer com um prêmio vencido. */
export const acoesSugeridas = (premio, agora) => (estaVencido(premio, agora) ? ['expirar', 'substituir'] : [])

export function contarPorEstado(premios) {
  const n = Object.fromEntries(ORDEM_ESTADOS.map((e) => [e, 0]))
  let vencidos = 0
  for (const p of premios || []) {
    if (n[p.estado] !== undefined) n[p.estado] += 1
    if (estaVencido(p)) vencidos += 1
  }
  return { ...n, vencidos }
}

// ── Datas e fuso ─────────────────────────────────────────────────────────────
const FUSO_PADRAO = 'America/Fortaleza'
const ehData = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false
  const [a, m, d] = s.split('-').map(Number)
  const t = new Date(Date.UTC(a, m - 1, d))
  return t.getUTCFullYear() === a && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}
export const diaBr = (d) => (ehData(d) ? d.split('-').reverse().slice(0, 2).join('/') : String(d || ''))

export function horaNatal(iso, fuso = FUSO_PADRAO) {
  const t = iso ? Date.parse(iso) : NaN
  if (!Number.isFinite(t)) return ''
  return new Date(t).toLocaleString('pt-BR', { timeZone: fuso, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function parede(ms, fuso) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: fuso, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const p = Object.fromEntries(f.formatToParts(ms).map((x) => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
}
/** O instante (ms UTC) em que o relógio do `fuso` marca `dia` `hora`. */
export function instanteLocal(dia, hora, fuso = FUSO_PADRAO) {
  const [y, m, d] = dia.split('-').map(Number)
  const [h, mi] = hora.split(':').map(Number)
  const alvo = Date.UTC(y, m - 1, d, h, mi, 0)
  let ms = alvo
  for (let i = 0; i < 3; i += 1) ms += alvo - parede(ms, fuso)
  return ms
}

const valorDe = (config, chave) => (config && config[chave] ? config[chave].valor : undefined)
export function lerRegras(config) {
  return {
    dias: Array.isArray(valorDe(config, 'voucher_dias')) ? valorDe(config, 'voucher_dias') : [],
    corte: valorDe(config, 'corte_hora_local') || '',
    fuso: valorDe(config, 'fuso') || '',
    segundaChamadaMin: valorDe(config, 'prazo_segunda_chamada_min'),
    segundaChamadaProposta: !!(config && config.prazo_segunda_chamada_min && config.prazo_segunda_chamada_min.proposta),
    validadeAte: valorDe(config, 'voucher_validade_ate') || '',
    pesoBase: valorDe(config, 'peso_base'),
    ganhadoresFinal: valorDe(config, 'ganhadores_final'),
  }
}

/**
 * O dia só se apura depois do corte (o banco recusa antes: a foto do dia é imutável). O minuto do corte conta
 * inteiro, então o limite é o fim dele. Sem corte ou fuso na configuração, não afirma nada.
 * @returns {'sem_regra'|'aberto'|'pronto'|'apurado'} e `liberaEm` (ms) quando aberto.
 */
export function situacaoDoDia(dia, { config, apuracoes, agora = Date.now() } = {}) {
  if ((apuracoes || []).some((a) => a.dia === dia)) return { situacao: 'apurado' }
  const r = lerRegras(config)
  if (!ehData(dia) || !/^\d{2}:\d{2}$/.test(r.corte) || !r.fuso) return { situacao: 'sem_regra' }
  let liberaEm
  try { liberaEm = instanteLocal(dia, r.corte, r.fuso) + 60_000 } catch { return { situacao: 'sem_regra' } }
  return agora >= liberaEm ? { situacao: 'pronto', liberaEm } : { situacao: 'aberto', liberaEm }
}

export function textoLiberaEm(liberaEm, fuso = FUSO_PADRAO) {
  return new Date(liberaEm).toLocaleString('pt-BR', { timeZone: fuso, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(', ', ' às ')
}

// ── Ranking do dia: empates à vista ──────────────────────────────────────────
/** Marca quem empata (mesmas casas e mesmos extras que um vizinho). O desempate é sorteio verificável no banco. */
export function marcarEmpates(ranking) {
  const lista = ranking || []
  const igual = (a, b) => !!a && !!b && a.casas === b.casas && a.extras === b.extras
  return lista.map((r, i) => ({ ...r, empate: igual(r, lista[i - 1]) || igual(r, lista[i + 1]) }))
}

// ── Fila de substituição (prévia) ────────────────────────────────────────────
const normal = (s) => String(s || '').trim().toLowerCase()
const chavePessoa = (x) => (x.email ? 'e:' + normal(x.email) : 'a:' + normal(x.apelido))

/**
 * PRÉVIA de quem seria chamado a seguir: a foto do dia (só os 10 primeiros) sem quem já tem prêmio naquele dia
 * e sem quem está bloqueado em outro dia (confirmado, entregue ou selecionado pendente). Quem decide é o
 * servidor (caca_premio_acao substituir); a lista só ajuda a organização a saber o que esperar.
 */
export function filaDoDia(dia, premios, apuracoes) {
  const ap = (apuracoes || []).find((a) => a.dia === dia)
  if (!ap) return []
  const fora = new Set()
  for (const p of premios || []) {
    if (p.tipo !== 'voucher_dia') continue
    if (p.dia === dia || ['confirmado', 'entregue', 'selecionado'].includes(p.estado)) fora.add(chavePessoa(p))
  }
  return (ap.ranking || []).filter((r) => !fora.has(chavePessoa(r)))
}

/** Dias que têm prêmio que pode ser substituído, com a prévia do próximo. */
export function filaDeSubstituicao(premios, apuracoes) {
  const dias = [...new Set((premios || []).filter((p) => p.tipo === 'voucher_dia' && acoesPossiveis(p).includes('substituir')).map((p) => p.dia))].sort()
  return dias.map((dia) => ({
    dia,
    premios: (premios || []).filter((p) => p.tipo === 'voucher_dia' && p.dia === dia && acoesPossiveis(p).includes('substituir')),
    proximos: filaDoDia(dia, premios, apuracoes),
  }))
}

// ── Regras e prazos (caca_config_ler / caca_config_gravar) ───────────────────
/**
 * Os campos da configuração, na ordem da tela. A faixa de cada um repete a do banco para avisar antes do envio.
 * `informativo`/`inerte` são avisos honestos: valor que ainda não manda em nada.
 */
/** O regulamento público escreve estes valores como fixos (C10). Mudar aqui NÃO muda o texto: o aviso aparece na tela e na confirmação. */
export const AVISO_REGULAMENTO = 'O regulamento publicado cita este valor como fixo. Se mudar aqui, o texto do regulamento fica desatualizado: altere o regulamento no mesmo dia e avise quem já o leu.'
export const CAMPOS_CONFIG = Object.freeze([
  { chave: 'voucher_dias', regulamento: AVISO_REGULAMENTO, rotulo: 'Dias dos vouchers', tipo: 'datas', ajuda: 'Um voucher por dia. Datas no formato AAAA-MM-DD, uma por linha (de 1 a 31).' },
  { chave: 'corte_hora_local', regulamento: AVISO_REGULAMENTO, rotulo: 'Hora do corte', tipo: 'hora', ajuda: 'Vale o minuto inteiro: 23:59 inclui quem validou às 23:59:59.' },
  { chave: 'fuso', rotulo: 'Fuso do corte', tipo: 'texto', ajuda: 'Nome do fuso, como America/Fortaleza.' },
  { chave: 'prazo_confirmacao_proximo_dia_hora', regulamento: AVISO_REGULAMENTO, rotulo: 'Prazo da 1ª chamada (hora do dia seguinte)', tipo: 'inteiro', min: 0, max: 23, ajuda: 'Quem não confirmou o e-mail tem até essa hora, no dia seguinte à apuração.' },
  { chave: 'prazo_segunda_chamada_min', rotulo: 'Prazo da 2ª chamada (minutos)', tipo: 'inteiro', min: 1, max: 1440, ajuda: 'Contado a partir do aviso ao próximo da fila.' },
  { chave: 'voucher_validade_ate', regulamento: AVISO_REGULAMENTO, rotulo: 'Validade do voucher', tipo: 'data', ajuda: 'Último dia de uso.' },
  { chave: 'peso_base', rotulo: 'Peso base do prêmio final', tipo: 'inteiro', min: 1, max: 10000, ajuda: 'Peso = base + carimbos extras. Só vale para sorteios futuros.' },
  { chave: 'ganhadores_final', regulamento: AVISO_REGULAMENTO, rotulo: 'Ganhadores do prêmio final', tipo: 'inteiro', min: 1, max: 20, ajuda: 'Só vale para sorteios futuros.' },
  { chave: 'intervalo_carimbo_h', rotulo: 'Intervalo entre carimbos na mesma casa (horas)', tipo: 'inteiro', min: 0, max: 72, informativo: 'Sem efeito: o carimbo usa 12 horas fixas no servidor (e o regulamento diz 12 horas). Mudar este número não muda a regra.' },
  { chave: 'email_confirmado_se_sem_coluna', rotulo: 'E-mail confirmado (plano B)', tipo: 'booleano', inerte: 'Sem efeito hoje: a coluna de e-mail confirmado já existe.' },
])

const NUMERO = /^\d+$/
/**
 * Valida o que a pessoa digitou contra a faixa do campo e devolve o valor no formato JSON do banco.
 * @param {object} campo item de CAMPOS_CONFIG
 * @param {string|boolean} entrada texto do campo (booleano para `booleano`)
 */
export function validarConfig(campo, entrada) {
  const falha = (erro) => ({ ok: false, erro })
  const t = typeof entrada === 'string' ? entrada.trim() : entrada
  switch (campo.tipo) {
    case 'datas': {
      const itens = String(t || '').split(/[\s,;]+/).filter(Boolean)
      if (itens.length < 1 || itens.length > 31) return falha('Informe de 1 a 31 datas.')
      const ruim = itens.find((d) => !ehData(d))
      if (ruim) return falha(`"${ruim}" não é uma data válida (use AAAA-MM-DD).`)
      if (new Set(itens).size !== itens.length) return falha('Há datas repetidas.')
      return { ok: true, valor: itens }
    }
    case 'hora': {
      const m = /^(\d{2}):(\d{2})$/.exec(String(t || ''))
      if (!m || +m[1] > 23 || +m[2] > 59) return falha('Use a hora no formato HH:MM, de 00:00 a 23:59.')
      return { ok: true, valor: t }
    }
    case 'texto': {
      if (!t) return falha('Informe o fuso.')
      try { new Intl.DateTimeFormat('en-US', { timeZone: t }) } catch { return falha('Fuso desconhecido. Exemplo: America/Fortaleza.') }
      return { ok: true, valor: t }
    }
    case 'data': return ehData(t) ? { ok: true, valor: t } : falha('Use a data no formato AAAA-MM-DD.')
    case 'inteiro': {
      if (!NUMERO.test(String(t || ''))) return falha('Informe um número inteiro.')
      const n = Number(t)
      if (n < campo.min || n > campo.max) return falha(`Informe um valor de ${campo.min} a ${campo.max}.`)
      return { ok: true, valor: n }
    }
    case 'booleano': return { ok: true, valor: t === true }
    default: return falha('Campo desconhecido.')
  }
}

/** O valor do banco como a pessoa vê no campo. */
export function textoDoValor(campo, valor) {
  if (campo.tipo === 'datas') return Array.isArray(valor) ? valor.join('\n') : ''
  if (campo.tipo === 'booleano') return valor === true
  return valor == null ? '' : String(valor)
}

/** True quando o campo digitado difere do que está no banco (habilita "Salvar"). */
export function configMudou(campo, entrada, valorAtual) {
  const v = validarConfig(campo, entrada)
  return !v.ok || JSON.stringify(v.valor) !== JSON.stringify(valorAtual)
}

// ── Prêmio final: simulação verificável ──────────────────────────────────────
export const ROTULO_REGRA = Object.freeze({
  todos_completos_ganham: 'Todos os que completaram ganham',
  sorteio_ponderado: 'Sorteio ponderado (peso = base + extras, sem reposição)',
})
export const ROTULO_MOTIVO = Object.freeze({
  completo: 'Completou todas as casas',
  vaga_restante: 'Vaga restante: mais casas, depois mais extras',
  vaga_restante_sorteio: 'Vaga restante: sorteio entre empatados',
  sorteio_ponderado: 'Sorteio ponderado',
})
export const rotuloMotivo = (m) => ROTULO_MOTIVO[m] || String(m || '')

export function validarSemente(texto) {
  const semente = String(texto || '').trim()
  if (!semente) return { ok: false, erro: 'Escreva uma semente: é ela que torna o sorteio reproduzível por qualquer pessoa.' }
  if (semente.length > 200) return { ok: false, erro: 'Semente longa demais (até 200 caracteres).' }
  return { ok: true, semente }
}

/** sha256 em hexadecimal minúsculo do texto SEM espaços nas pontas: o código que o regulamento promete registrar antes do fim da avaliação. */
export async function hashDaSemente(texto, subtle = globalThis.crypto?.subtle) {
  const v = validarSemente(texto)
  if (!v.ok) throw new Error('semente_obrigatoria')
  if (!subtle) throw new Error('sem_crypto')
  const buf = await subtle.digest('SHA-256', new TextEncoder().encode(v.semente))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const pesoTotal = (concorrentes) => (concorrentes || []).reduce((s, c) => s + (Number(c.peso) || 0), 0)

const assinaturaGanhadores = (r) => JSON.stringify((r?.ganhadores || []).map((g) => [g.posicao, g.apelido, g.casas, g.extras, g.peso, g.motivo]))
/**
 * Duas simulações com a MESMA semente têm que dar o mesmo hash, os mesmos concorrentes e os mesmos
 * ganhadores, na mesma ordem. É a prova, na tela, de que o sorteio é verificável.
 */
export function compararSimulacoes(a, b) {
  if (!a || !b) return { igual: false, motivo: 'faltou uma das simulações' }
  const mesmaSemente = a.semente === b.semente
  const mesmoHash = !!a.hash_verificacao && a.hash_verificacao === b.hash_verificacao
  const mesmosConcorrentes = JSON.stringify((a.concorrentes || []).map((c) => [c.apelido, c.casas, c.extras, c.peso])) === JSON.stringify((b.concorrentes || []).map((c) => [c.apelido, c.casas, c.extras, c.peso]))
  const mesmosGanhadores = assinaturaGanhadores(a) === assinaturaGanhadores(b)
  return { igual: mesmaSemente && mesmoHash && mesmosConcorrentes && mesmosGanhadores, mesmaSemente, mesmoHash, mesmosConcorrentes, mesmosGanhadores }
}

// ── Auditoria ────────────────────────────────────────────────────────────────
export const ROTULO_EVENTO = Object.freeze({
  apurar_dia: 'Dia apurado', selecionar: 'Selecionado', chamar_proximo: 'Próximo chamado', confirmar: 'Confirmado',
  entregar: 'Entregue', expirar: 'Expirado', cancelar: 'Cancelado', substituir: 'Substituído',
  sorteio_final: 'Ganhador sorteado', sorteio_final_realizado: 'Sorteio final realizado', config_gravar: 'Regra alterada',
  excecao_pedida: 'Pedido de presença', excecao_aprovada: 'Presença aprovada', excecao_negada: 'Presença negada',
  visita_anterior_pedida: 'Visita anterior pedida', visita_anterior_aprovada: 'Visita anterior aprovada', visita_anterior_negada: 'Visita anterior negada',
  delivery_pedido: 'Delivery pedido', delivery_confirmado: 'Delivery confirmado pela casa', delivery_imagem_enviada: 'Delivery: imagem enviada',
  delivery_aprovado: 'Delivery aprovado', delivery_negado: 'Delivery negado',
})
export const rotuloEvento = (a) => ROTULO_EVENTO[a] || String(a || '')
const curto = (v) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > 48 ? s.slice(0, 47) + '…' : String(s) }
/** "campo: antes → depois" só do que mudou. Nunca mostra chave de contato, mesmo que um dia ela apareça no log. */
export function resumoMudanca(antes, depois) {
  const objeto = (x) => x && typeof x === 'object' && !Array.isArray(x)
  if (objeto(antes) || objeto(depois)) {
    const a = objeto(antes) ? antes : {}
    const d = objeto(depois) ? depois : {}
    const chaves = [...new Set([...Object.keys(a), ...Object.keys(d)])].filter((k) => !/e-?mail|whatsapp/i.test(k))
    return chaves.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(d[k])).map((k) => `${k}: ${a[k] === undefined ? '—' : curto(a[k])} → ${d[k] === undefined ? '—' : curto(d[k])}`).join(' · ')
  }
  if (antes == null && depois == null) return ''
  return `${antes == null ? '—' : curto(antes)} → ${depois == null ? '—' : curto(depois)}`
}

// ── Revisão dos carimbos sem prova de GPS ───────────────────────────────────
export const ROTULO_ORIGEM = Object.freeze({
  gps: 'Localização conferida',
  unidade_sem_coordenada: 'Unidade sem ponto conferido',
  excecao_painel: 'Exceção feita pelo painel',
  visita_anterior: 'Visita anterior aprovada',
  delivery_casa: 'Delivery confirmado pela casa',
  delivery_organizacao: 'Delivery aprovado pela organização',
})
export const rotuloOrigem = (o) => ROTULO_ORIGEM[o] || String(o || '')

// ── Metas (marcos comemorativos) ─────────────────────────────────────────────
// O banco guarda marcos RELATIVOS ao total de casas (caca_config 'metas', migration 20261213): cada um é
// { titulo, e UM de: casas:int | fracao:0.01..0.99 | casas:'todas' }. Aqui ficam a edição na tela e a conta de prévia, com as
// MESMAS regras de caca_metas_gravar; quem decide, valida e audita é o banco.
export const MARCO_TIPOS = Object.freeze([
  ['casas', 'Número de casas'],
  ['percentual', 'Parte das casas (%)'],
  ['todas', 'Todas as casas (mapa completo)'],
])
export const META_LIMITE = Object.freeze({ marcos: 20, titulo: 40, casas: 200 })

/** Marco gravado no banco → linha editável da tela. */
export function linhaDoMarco(m) {
  const titulo = String(m?.titulo ?? '')
  if (m?.casas === 'todas') return { tipo: 'todas', valor: '', titulo }
  if (m && m.fracao != null) return { tipo: 'percentual', valor: String(Math.round(Number(m.fracao) * 100)), titulo }
  return { tipo: 'casas', valor: String(m?.casas ?? ''), titulo }
}
/** Quantas casas o marco vale hoje (mesma conta do banco: fração arredondada, nunca menos de 1; "todas" = o total). */
export function casasDoMarco(m, total) {
  if (m.casas === 'todas') return total
  if (m.fracao != null) return Math.max(1, Math.round(Math.round(total * m.fracao * 1e6) / 1e6))
  return m.casas
}
/**
 * Linhas da tela → o que o banco recebe (`marcos`) + erros em português + a prévia (quantas casas cada marco vale hoje).
 * `total` = casas da edição agora (se vier 0/vazio, 27 só para conferir a ordem, como o banco).
 * @param {{tipo:string,valor:string,titulo:string}[]} linhas
 */
export function validarMetas(linhas, total) {
  const erros = []
  const avisos = []
  const marcos = []
  const previa = []
  const ref = total > 0 ? total : 27
  let anterior = 0
  let jaTodas = false
  ;(linhas || []).forEach((l, i) => {
    const onde = `Marco ${i + 1}`
    const titulo = String(l.titulo ?? '').trim()
    const v = String(l.valor ?? '').trim()
    if (!titulo) erros.push(`${onde}: escreva o título.`)
    else if (titulo.length > META_LIMITE.titulo) erros.push(`${onde}: título com mais de ${META_LIMITE.titulo} caracteres.`)
    if (jaTodas) { erros.push(`${onde}: o marco "todas as casas" tem de ser o último.`); return }
    let marco
    if (l.tipo === 'todas') { marco = { casas: 'todas', titulo }; jaTodas = true }
    else if (l.tipo === 'percentual') {
      if (!NUMERO.test(v) || Number(v) < 1 || Number(v) > 99) { erros.push(`${onde}: informe a parte das casas de 1 a 99 (%).`); return }
      marco = { fracao: Number(v) / 100, titulo }
    } else {
      if (!NUMERO.test(v) || Number(v) < 1) { erros.push(`${onde}: informe o número de casas (inteiro, 1 ou mais).`); return }
      if (Number(v) > META_LIMITE.casas) { erros.push(`${onde}: no máximo ${META_LIMITE.casas} casas.`); return }
      marco = { casas: Number(v), titulo }
    }
    const casas = casasDoMarco(marco, ref)
    if (casas <= anterior) erros.push(`${onde}: vale ${casas} ${casas === 1 ? 'casa' : 'casas'} hoje, não passa do marco anterior (${anterior}). Mantenha a ordem crescente e sem repetir.`)
    else if (marco.casas !== 'todas' && marco.casas > ref) avisos.push(`${onde}: ${marco.casas} casas é mais do que a edição tem hoje (${ref}). O marco só aparece para o público quando a edição chegar a esse total.`)
    anterior = casas
    marcos.push(marco)
    previa.push(casas)
  })
  if (!marcos.length && !erros.length) erros.push('Informe pelo menos um marco.')
  if ((linhas || []).length > META_LIMITE.marcos) erros.push(`No máximo ${META_LIMITE.marcos} marcos.`)
  return { ok: erros.length === 0, erros, avisos, marcos, previa }
}
export const metasMudaram = (marcos, doBanco) => JSON.stringify(marcos) !== JSON.stringify(
  (doBanco || []).map((m) => (m?.casas === 'todas' ? { casas: 'todas', titulo: m.titulo } : m?.fracao != null ? { fracao: Number(m.fracao), titulo: m.titulo } : { casas: m?.casas, titulo: m?.titulo })))

// ── Avisos: comunicados da organização + push (migration 20261230) ───────────
export const TIPOS_PUSH = Object.freeze([
  ['avaliacao_pendente', 'Avaliação pendente'],
  ['meta', 'Meta alcançada'],
  ['grupo', 'Aviso de grupo'],
  ['edicao', 'Novidade da edição (só quem escolheu receber)'],
  ['voucher', 'Voucher do dia (só quem escolheu receber)'],
  ['imprevisto', 'Imprevisto confirmado em casa da rota'],
])
export const tipoPushValido = (t) => TIPOS_PUSH.some(([k]) => k === t)

/** O que a organização pode criar à mão. Meta e avaliação pendente são automáticas; grupo vem do próprio grupo. */
export const CATEGORIAS_AVISO = Object.freeze([
  ['edicao', 'Novidade da edição'],
  ['voucher', 'Voucher do dia'],
  ['imprevisto', 'Imprevisto confirmado (urgente)'],
])
/** Para onde o toque no aviso leva: só dentro da Caça (o banco confere de novo). */
export const DESTINOS_AVISO = Object.freeze([
  ['/cartoon/caca', 'Central da Caça'],
  ['/cartoon/caca/metas', 'Metas'],
  ['/cartoon/caca/grupos', 'Grupos'],
  ['/cartoon/caca/ranking', 'Ranking'],
])
export const PUBLICOS_AVISO = Object.freeze([
  ['todos', 'Todas as pessoas com mapa nesta edição'],
  ['com_push', 'Só quem ligou as notificações no celular'],
])
export const AVISO_LIMITES = Object.freeze({ titulo: 80, corpo: 240, situacao: 90, unidade: 40 })
export const ROTULO_ESTADO_AVISO = Object.freeze({ rascunho: 'Rascunho', agendado: 'Agendado', enviado: 'Enviado', cancelado: 'Cancelado' })

const diaBrCurto = (iso) => { const [, m, d] = String(iso || '').split('-'); return d && m ? `${d}/${m}` : '' }

/**
 * Texto do imprevisto a partir de FATOS confirmados (casa, unidade, dia, situação). Nunca inventa nem infere: sem casa, dia ou
 * situação não há texto. Cabe em título/corpo do aviso (80/240) e não carrega contato.
 */
export function comporImprevisto({ casa, unidade, dia, situacao }) {
  const c = String(casa || '').trim(); const s = String(situacao || '').trim(); const u = String(unidade || '').trim()
  const d = diaBrCurto(dia)
  if (!c || !s || !d) return null
  const onde = u ? `${c} (${u})` : c
  const titulo = `Aviso sobre ${c}`.slice(0, AVISO_LIMITES.titulo)
  const corpo = `${onde}: ${s} em ${d}. Confirmado pela organização.`.slice(0, AVISO_LIMITES.corpo)
  return { titulo, corpo }
}

/** Valida o formulário no navegador (o banco valida de novo). Devolve a lista de problemas em português. */
export function validarAviso(f) {
  const erros = []
  const titulo = String(f.titulo || '').trim(); const corpo = String(f.corpo || '').trim()
  if (!titulo) erros.push('Escreva o título.')
  else if (titulo.length > AVISO_LIMITES.titulo) erros.push(`O título passa de ${AVISO_LIMITES.titulo} caracteres.`)
  if (!corpo) erros.push('Escreva o texto do aviso.')
  else if (corpo.length > AVISO_LIMITES.corpo) erros.push(`O texto passa de ${AVISO_LIMITES.corpo} caracteres.`)
  if (/@[a-z0-9.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{8,}\d|#mapa=/i.test(`${titulo} ${corpo}`)) erros.push('Não coloque e-mail, telefone nem link pessoal no aviso.')
  if (f.categoria === 'imprevisto') {
    if (!f.casa) erros.push('Escolha a casa afetada.')
    if (!f.dia) erros.push('Informe o dia afetado.')
  }
  if (f.enviar_em && Number.isNaN(new Date(f.enviar_em).getTime())) erros.push('A data de envio não é válida.')
  if (f.vigente_ate && Number.isNaN(new Date(f.vigente_ate).getTime())) erros.push('A data de validade não é válida.')
  return erros
}

/** Corpo da RPC `caca_aviso_criar` a partir do formulário. Imprevisto só vai para quem tem a casa na rota de um grupo. */
export function corpoDoAviso(f) {
  const base = { categoria: f.categoria, titulo: String(f.titulo || '').trim(), corpo: String(f.corpo || '').trim(), destino: f.destino || '/cartoon/caca' }
  if (f.enviar_em) base.enviar_em = new Date(f.enviar_em).toISOString()
  if (f.vigente_ate) base.vigente_ate = new Date(f.vigente_ate).toISOString()
  if (f.categoria === 'imprevisto') return { ...base, publico: { tipo: 'casa_na_rota' }, participacao_id: f.casa, dia: f.dia }
  return { ...base, publico: { tipo: f.publico === 'com_push' ? 'com_push' : 'todos' } }
}

/** Resumo de um aviso enviado, sem dado pessoal: quantas pessoas viram, quantos pushes saíram. */
export function resumoDoEnvio(a) {
  if (!a || a.estado !== 'enviado') return ''
  const partes = [`${a.alvos} na central`, `${a.vistos} ${a.vistos === 1 ? 'viu' : 'viram'}`, `${a.push_enviados} no celular`]
  if (a.push_falhas > 0) partes.push(`${a.push_falhas} ${a.push_falhas === 1 ? 'falha' : 'falhas'}`)
  return partes.join(' · ')
}

// ── CSV ──────────────────────────────────────────────────────────────────────
// Texto livre do visitante (apelido) entra na planilha: célula de texto que começa com = + - @ TAB CR vira fórmula no Excel.
// Apóstrofo na frente neutraliza. Número de verdade (typeof number) segue como número.
const celulaCsv = (v) => {
  let s = String(v ?? '')
  if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s)) s = "'" + s
  return `"${s.replace(/"/g, '""')}"`
}
export const csvDe = (linhas) => linhas.map((l) => l.map(celulaCsv).join(';')).join('\n')

// ── Erros em linguagem de gente ──────────────────────────────────────────────
const MENSAGENS = [
  ['dia_nao_encerrado', 'O corte desse dia ainda não passou. A foto do dia só é criada depois dele, porque depois de criada ela não muda.'],
  ['dia_fora_do_periodo', 'Esse dia não está na lista de dias dos vouchers (aba Regras e prazos).'],
  ['transicao_invalida', 'O prêmio já mudou de estado (talvez alguém tenha mexido agora). Atualize a tela e confira.'],
  ['sem_proximo_elegivel', 'Não há próximo elegível neste dia. Nada foi alterado.'],
  ['email_nao_confirmado', 'O e-mail dessa pessoa ainda não foi confirmado, e o regulamento exige confirmar antes de receber o prêmio. Peça que ela confirme na central da Caça.'],
  ['compromisso_ja_registrado', 'O código da semente já foi registrado nesta edição e não se troca.'],
  ['compromisso_tardio', 'A avaliação já fechou: o código da semente só pode ser registrado antes do fechamento. O sorteio real não poderá rodar.'],
  ['hash_invalido', 'O código da semente precisa ter 64 caracteres (0-9 e a-f).'],
  ['edicao_desconhecida', 'O servidor não conhece essa edição.'],
  ['premio_nao_encontrado', 'Esse prêmio não existe mais. Atualize a lista.'],
  ['acao_invalida', 'Ação não reconhecida pelo servidor. Atualize a página e tente de novo.'],
  ['parametro_invalido', 'Algum dado do pedido está inválido. Atualize a tela e tente de novo.'],
  ['chave_desconhecida', 'O servidor não conhece essa regra. Atualize a página.'],
  ['valor_invalido', 'O servidor recusou o valor: confira o formato e a faixa.'],
  ['metas_invalidas', 'A lista de marcos está fora do formato (de 1 a 20 marcos, só título e casas). Atualize a tela e tente de novo.'],
  ['metas_titulo', 'Cada marco precisa de um título de até 40 caracteres.'],
  ['metas_casas', 'Um dos marcos tem número de casas inválido.'],
  ['metas_fracao', 'Um dos marcos tem parte das casas inválida (use de 1% a 99%).'],
  ['metas_ordem', 'Os marcos precisam vir em ordem crescente e sem repetir, considerando quantas casas cada um vale hoje.'],
  ['metas_todas_so_no_fim', 'O marco "todas as casas" só pode existir uma vez, e tem de ser o último.'],
  ['semente_obrigatoria', 'Escreva uma semente: é ela que torna o sorteio reproduzível.'],
  ['sorteio_final_ja_realizado', 'O sorteio final já foi realizado nesta edição.'],
  ['tipo_invalido', 'Tipo de aviso inválido.'],
  ['vapid_ausente', 'O envio de avisos ainda não está configurado no servidor (isso não afeta a simulação).'],
  ['pedido_nao_encontrado', 'Esse pedido não existe mais. Atualize a lista.'],
  ['nota_obrigatoria', 'Para negar, escreva o motivo: ele fica no histórico.'],
  ['ja_carimbou', 'A pessoa já tem carimbo nessa casa, então não dá para aprovar como visita anterior. Negue o pedido com o motivo.'],
  ['cedo', 'Essa pessoa já tem um carimbo nessa casa há menos de 12 horas, então um novo ainda não pode entrar. Negue o pedido ou espere.'],
  ['nao_aberta', 'A janela dos carimbos não está aberta agora, então não dá para aprovar.'],
  ['encerrada', 'A janela dos carimbos já encerrou, então não dá para aprovar. Dá para negar com o motivo.'],
  ['casa_sem_combo', 'A casa não tem combo publicado para avaliar, então não entra na Caça.'],
  ['qr_invalido', 'A unidade desse pedido não tem adesivo (QR) ativo. Confira em Mapa e adesivos.'],
  ['nao_autorizado', 'Sua função não permite esta ação, ou a sessão não vale mais.'],
  ['conteudo_com_dado_pessoal', 'O aviso parece ter e-mail, telefone ou link pessoal. Tire isso do texto.'],
  ['destino_invalido', 'O destino do aviso precisa ser uma tela da Caça.'],
  ['vigencia_passada', 'A validade já passou. Escolha uma data futura.'],
  ['agendamento_passado', 'A data de envio já passou. Escolha uma data futura ou envie agora.'],
  ['imprevisto_so_para_quem_tem_a_casa', 'Imprevisto só vai para quem tem a casa na rota de um grupo.'],
  ['imprevisto_sem_casa_ou_dia', 'Imprevisto precisa de casa e dia.'],
  ['casa_desconhecida', 'Essa casa não está na edição atual.'],
  ['aviso_ja_enviado', 'Esse aviso já foi enviado. Nada foi reenviado.'],
  ['aviso_ja_cancelado', 'Esse aviso foi cancelado e não pode ser enviado.'],
  ['so_antes_do_envio', 'Só dá para cancelar antes do envio.'],
  ['aviso_nao_enviado', 'O aviso ainda não foi enviado, então não há notificação para processar.'],
  ['Failed to fetch', 'Sem conexão com o servidor. Confira a internet e tente de novo.'],
  ['Load failed', 'Sem conexão com o servidor. Confira a internet e tente de novo.'],
]
export function mensagemCaca(erro) {
  const m = String((erro && erro.message) || erro || '')
  const achada = MENSAGENS.find(([k]) => m.includes(k))
  return achada ? achada[1] : (m || 'Não consegui concluir. Tente de novo.')
}

// ── Chamadas ao banco ────────────────────────────────────────────────────────
// `fetchImpl` só existe para o teste. O corpo de cada chamada é o do contrato (15-caca-contrato-*.md).
export const cacaApi = {
  config: (f) => rpc('caca_config_ler', { p_secret: lerSenha() }, f),
  gravarConfig: (chave, valor, f) => rpc('caca_config_gravar', { p_secret: lerSenha(), p_chave: chave, p_valor: valor }, f),
  premios: (edicao, f) => rpc('caca_premio_listar', { p_secret: lerSenha(), p_edicao: edicao }, f),
  apurarDia: (edicao, dia, f) => rpc('caca_apurar_dia', { p_secret: lerSenha(), p_edicao: edicao, p_dia: dia }, f),
  acaoDoPremio: (premio, acao, nota, f) => rpc('caca_premio_acao', { p_secret: lerSenha(), p_premio: premio, p_acao: acao, p_nota: nota || null }, f),
  /** Compromisso da semente do sorteio real: { registrado, hash, registrado_em, avaliacao_fecha_em, fechada, sem_data_de_fechamento }. */
  sorteioEstado: (edicao, f) => rpc('caca_sorteio_estado', { p_secret: lerSenha(), p_edicao: edicao }, f),
  /** Registra o código (sha256) da semente. Um só por edição, antes de o fechamento da avaliação; a semente em si NÃO sai daqui. */
  comprometerSemente: (edicao, hash, f) => rpc('caca_sorteio_comprometer', { p_secret: lerSenha(), p_edicao: edicao, p_hash: hash }, f),
  /** SIMULAÇÃO. `p_simular` é fixo em true: nada é gravado, nem evento. */
  sortear: (edicao, semente, f) => rpc('caca_sorteio_final', { p_secret: lerSenha(), p_edicao: edicao, p_semente: semente, p_simular: true }, f),
  metas: (edicao, f) => rpc('caca_metas_painel_ler', { p_secret: lerSenha(), p_edicao: edicao }, f),
  gravarMetas: (marcos, f) => rpc('caca_metas_gravar', { p_secret: lerSenha(), p_metas: marcos }, f),
  revisao: (edicao, f) => rpc('caca_carimbo_revisao_listar', { p_secret: lerSenha(), p_edicao: edicao }, f),
  anularCarimbo: (carimbo, motivo, f) => rpc('carimbo_anular', { p_secret: lerSenha(), p_carimbo: carimbo, p_motivo: motivo }, f),
  // Pedidos de revisão de presença (GPS) e o resumo de carimbos sem GPS (15-caca-contrato-gps.md).
  excecoes: (edicao, estado, f) => rpc('caca_excecao_listar', { p_secret: lerSenha(), p_edicao: edicao, p_estado: estado || null }, f),
  decidirExcecao: (id, decisao, nota, f) => rpc('caca_excecao_decidir', { p_secret: lerSenha(), p_id: id, p_decisao: decisao, p_nota: nota || null }, f),
  // Imagem do pedido de delivery (bucket privado caca-delivery): link de 300 s e exclusão manual (sem prazo de retenção aprovado).
  imagemDelivery: (path) => chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'baixar', bucket: 'caca-delivery', path }),
  removerImagemDelivery: (path) => chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'remover', bucket: 'caca-delivery', path }),
  gpsResumo: (edicao, f) => rpc('caca_gps_resumo', { p_secret: lerSenha(), p_edicao: edicao }, f),
  /** SIMULAÇÃO. `dry_run` é fixo em true: a função só conta quem receberia. */
  simularPush: (tipo, f) => chamarFuncao('caca-push', { secret: lerSenha(), tipo, dry_run: true, titulo: 'Simulação', corpo: 'Simulação de alcance: nada é enviado.' }, f),
  // Comunicados (20261230). Criar/enviar/cancelar exigem producao.gerir NO BANCO; listar e estimar, dado.ler.
  avisosListar: (edicao, f) => rpc('caca_aviso_listar', { p_secret: lerSenha(), p_edicao: edicao }, f),
  avisosCasas: (edicao, f) => rpc('caca_avisos_casas', { p_secret: lerSenha(), p_edicao: edicao }, f),
  criarAviso: (formulario, f) => rpc('caca_aviso_criar', { p_secret: lerSenha(), p_dados: corpoDoAviso(formulario) }, f),
  estimarAviso: (id, f) => rpc('caca_aviso_estimar', { p_secret: lerSenha(), p_id: id }, f),
  /** AÇÃO REAL: põe o aviso na central de quem ele atinge. O push sai em seguida, por `enviarPushDoAviso`. */
  enviarAviso: (id, f) => rpc('caca_aviso_enviar', { p_secret: lerSenha(), p_id: id }, f),
  cancelarAviso: (id, f) => rpc('caca_aviso_cancelar', { p_secret: lerSenha(), p_id: id }, f),
  /** Avisos automáticos (meta, avaliação pendente): estado do interruptor e se o agendador existe. */
  avisosAutoEstado: (f) => rpc('caca_avisos_auto_estado', { p_secret: lerSenha() }, f),
  /** Liga/desliga. Ligar grava o instante: só vale o que acontecer DEPOIS (nada do histórico). */
  avisosAutoDefinir: (ligado, f) => rpc('caca_avisos_auto_definir', { p_secret: lerSenha(), p_ligado: !!ligado }, f),
  /** Quantas entregas esperam push (não envia nada). */
  pushDoAvisoSimular: (id, f) => chamarFuncao('caca-push', { secret: lerSenha(), aviso_id: id, dry_run: true }, f),
  /** AÇÃO REAL: processa um lote de até 200 aparelhos de um aviso JÁ enviado; repetir enquanto `restam > 0`. */
  enviarPushDoAviso: (id, f) => chamarFuncao('caca-push', { secret: lerSenha(), aviso_id: id, dry_run: false }, f),
}

/**
 * O sorteio OFICIAL. Fica aqui, travado: a tela só chega nele com `SORTEIO_OFICIAL_LIBERADO` ligado e depois de
 * a simulação com a MESMA semente ter dado o hash que a pessoa conferiu. Grava os prêmios finais, uma vez só.
 */
export async function realizarSorteioOficial(edicao, semente, simulacao, f) {
  if (!SORTEIO_OFICIAL_LIBERADO) throw new Error('sorteio_oficial_bloqueado')
  if (!simulacao || simulacao.simulacao !== true || simulacao.semente !== semente || !simulacao.hash_verificacao) throw new Error('simulacao_nao_confere')
  return rpc('caca_sorteio_final', { p_secret: lerSenha(), p_edicao: edicao, p_semente: semente, p_simular: false }, f)
}
