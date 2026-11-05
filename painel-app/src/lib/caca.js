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
export const CAMPOS_CONFIG = Object.freeze([
  { chave: 'voucher_dias', rotulo: 'Dias dos vouchers', tipo: 'datas', ajuda: 'Um voucher por dia. Datas no formato AAAA-MM-DD, uma por linha (de 1 a 31).' },
  { chave: 'corte_hora_local', rotulo: 'Hora do corte', tipo: 'hora', ajuda: 'Vale o minuto inteiro: 23:59 inclui quem validou às 23:59:59.' },
  { chave: 'fuso', rotulo: 'Fuso do corte', tipo: 'texto', ajuda: 'Nome do fuso, como America/Fortaleza.' },
  { chave: 'prazo_confirmacao_proximo_dia_hora', rotulo: 'Prazo da 1ª chamada (hora do dia seguinte)', tipo: 'inteiro', min: 0, max: 23, ajuda: 'Quem não confirmou o e-mail tem até essa hora, no dia seguinte à apuração.' },
  { chave: 'prazo_segunda_chamada_min', rotulo: 'Prazo da 2ª chamada (minutos)', tipo: 'inteiro', min: 1, max: 1440, ajuda: 'Contado a partir do aviso ao próximo da fila.' },
  { chave: 'voucher_validade_ate', rotulo: 'Validade do voucher', tipo: 'data', ajuda: 'Último dia de uso.' },
  { chave: 'peso_base', rotulo: 'Peso base do prêmio final', tipo: 'inteiro', min: 1, max: 10000, ajuda: 'Peso = base + carimbos extras. Só vale para sorteios futuros.' },
  { chave: 'ganhadores_final', rotulo: 'Ganhadores do prêmio final', tipo: 'inteiro', min: 1, max: 20, ajuda: 'Só vale para sorteios futuros.' },
  { chave: 'intervalo_carimbo_h', rotulo: 'Intervalo entre carimbos na mesma casa (horas)', tipo: 'inteiro', min: 0, max: 72, informativo: 'Informativo: o carimbo ainda usa 12 horas fixas; mudar aqui não muda a regra.' },
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
  sorteio_final: 'Sorteio final (simulação)', sorteio_final_realizado: 'Sorteio final realizado', config_gravar: 'Regra alterada',
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
})
export const rotuloOrigem = (o) => ROTULO_ORIGEM[o] || String(o || '')

// ── Metas (marcos comemorativos) ─────────────────────────────────────────────
/** Os marcos que o banco traz de partida. São EXEMPLO: o Wilker ainda não decidiu os números. */
export const METAS_EXEMPLO = Object.freeze([
  { casas: 5, titulo: 'Primeiros passos' },
  { casas: 10, titulo: 'Já pegou o jeito' },
  { casas: 20, titulo: 'Quase lá' },
  { casas: 27, titulo: 'Todas as casas' },
])
/**
 * Mesmas regras do banco (caca_metas_ler ignora o que não cabe): casas inteiras de 1 até o total da edição, sem
 * repetir, com título. `totalCasas` vem do servidor; sem ele só o piso é conferido.
 * @param {{casas:string|number,titulo:string}[]} linhas
 */
export function validarMetas(linhas, totalCasas) {
  const erros = []
  const vistas = new Set()
  const metas = []
  ;(linhas || []).forEach((l, i) => {
    const n = String(l.casas ?? '').trim()
    const titulo = String(l.titulo ?? '').trim()
    const onde = `Marco ${i + 1}`
    if (!NUMERO.test(n) || Number(n) < 1) { erros.push(`${onde}: informe o número de casas (inteiro, 1 ou mais).`); return }
    const casas = Number(n)
    if (totalCasas && casas > totalCasas) erros.push(`${onde}: ${casas} casas é mais do que a edição tem (${totalCasas}); esse marco nunca seria alcançado.`)
    if (vistas.has(casas)) erros.push(`${onde}: já existe um marco de ${casas} casas.`)
    if (!titulo) erros.push(`${onde}: escreva o título.`)
    else if (titulo.length > 60) erros.push(`${onde}: título com mais de 60 caracteres.`)
    vistas.add(casas)
    metas.push({ casas, titulo })
  })
  if (!metas.length && !erros.length) erros.push('Informe pelo menos um marco.')
  metas.sort((a, b) => a.casas - b.casas)
  return { ok: erros.length === 0, erros, metas }
}
/** O comando que grava os marcos. Roda por quem tem acesso ao banco: o painel ainda não tem função para isso. */
export function sqlDasMetas(metas) {
  const json = JSON.stringify(metas.map((m) => ({ casas: m.casas, titulo: m.titulo })))
  return `update public.caca_config set valor = '${json.replace(/'/g, "''")}'::jsonb, atualizado_em = now() where chave = 'metas';`
}

// ── Avisos (push): só simulação ──────────────────────────────────────────────
export const TIPOS_PUSH = Object.freeze([
  ['avaliacao_pendente', 'Avaliação pendente'],
  ['meta', 'Meta alcançada'],
  ['grupo', 'Aviso de grupo'],
  ['edicao', 'Novidade da edição (só quem escolheu receber)'],
])
export const tipoPushValido = (t) => TIPOS_PUSH.some(([k]) => k === t)

// ── CSV ──────────────────────────────────────────────────────────────────────
export const csvDe = (linhas) => linhas.map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')

// ── Erros em linguagem de gente ──────────────────────────────────────────────
const MENSAGENS = [
  ['dia_nao_encerrado', 'O corte desse dia ainda não passou. A foto do dia só é criada depois dele, porque depois de criada ela não muda.'],
  ['dia_fora_do_periodo', 'Esse dia não está na lista de dias dos vouchers (aba Regras e prazos).'],
  ['transicao_invalida', 'O prêmio já mudou de estado (talvez alguém tenha mexido agora). Atualize a tela e confira.'],
  ['sem_proximo_elegivel', 'Não há próximo elegível neste dia. Nada foi alterado.'],
  ['premio_nao_encontrado', 'Esse prêmio não existe mais. Atualize a lista.'],
  ['acao_invalida', 'Ação não reconhecida pelo servidor. Atualize a página e tente de novo.'],
  ['parametro_invalido', 'Algum dado do pedido está inválido. Atualize a tela e tente de novo.'],
  ['chave_desconhecida', 'O servidor não conhece essa regra. Atualize a página.'],
  ['valor_invalido', 'O servidor recusou o valor: confira o formato e a faixa.'],
  ['semente_obrigatoria', 'Escreva uma semente: é ela que torna o sorteio reproduzível.'],
  ['sorteio_final_ja_realizado', 'O sorteio final já foi realizado nesta edição.'],
  ['tipo_invalido', 'Tipo de aviso inválido.'],
  ['vapid_ausente', 'O envio de avisos ainda não está configurado no servidor (isso não afeta a simulação).'],
  ['nao_autorizado', 'Sua função não permite esta ação, ou a sessão não vale mais.'],
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
  /** SIMULAÇÃO. `p_simular` é fixo em true: nada é gravado, nem evento. */
  sortear: (edicao, semente, f) => rpc('caca_sorteio_final', { p_secret: lerSenha(), p_edicao: edicao, p_semente: semente, p_simular: true }, f),
  revisao: (edicao, f) => rpc('caca_carimbo_revisao_listar', { p_secret: lerSenha(), p_edicao: edicao }, f),
  anularCarimbo: (carimbo, motivo, f) => rpc('carimbo_anular', { p_secret: lerSenha(), p_carimbo: carimbo, p_motivo: motivo }, f),
  /** SIMULAÇÃO. `dry_run` é fixo em true: a função só conta quem receberia. */
  simularPush: (tipo, f) => chamarFuncao('caca-push', { secret: lerSenha(), tipo, dry_run: true, titulo: 'Simulação', corpo: 'Simulação de alcance: nada é enviado.' }, f),
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
