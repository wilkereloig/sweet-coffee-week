/*
 * Social media — planejamento das publicações do Instagram (16–17/10/2026).
 * Lógica pura, testada em tests/painel-app-redes.test.mjs. A tela é
 * components/vistas/Redes.jsx + RedesFicha.jsx; o banco é a migration
 * supabase/migrations/20261017_social_media.sql.
 *
 * ⛔ Nada aqui publica no Instagram. "Programado" = está no calendário
 *    interno; "Publicado" só existe depois da confirmação explícita.
 *
 * Fuso operacional: America/Fortaleza, fixo — o dia do calendário e "hoje" são
 * os de Fortaleza mesmo num aparelho configurado em outro fuso. Datas de
 * calendário viajam como "AAAA-MM-DD" e a conta é feita em UTC, sem hora local.
 */

import { iniciarRegistro, reduzirRegistro } from './sync/mesclar.js'

export const FUSO = 'America/Fortaleza'
export const PERFIL_PADRAO = '@sweetcoffeeweek'

// Mesma ordem do CHECK (20261018_social_aprovacao.sql). Fluxo do painel:
// Rascunho → Aguardando aprovação → Aprovado → Publicado. "Em preparação" é
// legado (nenhuma postagem usa; o banco não grava mais): fica só para rótulo.
export const SITUACOES = [
  // `curto`: o cartão estreito da semana (coluna de ~140 px); a ficha e o selo usam o rótulo inteiro.
  { chave: 'rascunho', rotulo: 'Rascunho', curto: 'Rascunho', tom: 'neutro' },
  { chave: 'preparacao', rotulo: 'Em preparação', curto: 'Em preparação', tom: 'neutro', legado: true },
  { chave: 'aprovacao', rotulo: 'Aguardando aprovação', curto: 'Em aprovação', tom: 'atencao' },
  { chave: 'pronto', rotulo: 'Aprovado', curto: 'Aprovado', tom: 'andamento' },
  { chave: 'publicado', rotulo: 'Publicado', curto: 'Publicado', tom: 'ok' },
  { chave: 'cancelado', rotulo: 'Cancelado', curto: 'Cancelado', tom: 'encerrado' },
]
/** As etapas que a pessoa vê (o guia e o filtro de situação). */
export const ETAPAS = SITUACOES.filter((s) => !s.legado)
export const FORMATOS = [
  { chave: 'feed', rotulo: 'Imagem no feed', curto: 'Feed', icone: 'imagem' },
  { chave: 'carrossel', rotulo: 'Carrossel', curto: 'Carrossel', icone: 'pasta' },
  { chave: 'reels', rotulo: 'Reel', curto: 'Reel', icone: 'play' },
  { chave: 'story', rotulo: 'Story', curto: 'Story', icone: 'celular' },
]
// Mesmos códigos de public.redes_pendencias (o banco decide; aqui só antecipa).
export const PENDENCIAS = {
  sem_arte: 'Sem arte',
  arte_incompativel: 'Arte não combina com o formato',
  sem_responsavel: 'Sem responsável',
  sem_legenda: 'Sem legenda',
  sem_horario: 'Sem data e horário',
  atrasada: 'Atrasada',
}
const POR = (lista) => Object.fromEntries(lista.map((x) => [x.chave, x]))
export const SITUACAO = POR(SITUACOES)
export const FORMATO = POR(FORMATOS)
export const FECHADAS = ['publicado', 'cancelado']

// ── Datas no fuso de Fortaleza ──────────────────────────────────────────────
const fmtPartes = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
/** Instante → { data: 'AAAA-MM-DD', hora: 'HH:MM' } em Fortaleza. Nulo/ inválido → null. */
export function partes(instante) {
  if (instante == null || instante === '') return null
  const d = instante instanceof Date ? instante : new Date(instante)
  if (isNaN(d)) return null
  const p = Object.fromEntries(fmtPartes.formatToParts(d).map((x) => [x.type, x.value]))
  return { data: p.year + '-' + p.month + '-' + p.day, hora: p.hour + ':' + p.minute }
}
export const chaveDia = (instante) => (partes(instante) || {}).data || null
export const hoje = (agora = Date.now()) => chaveDia(new Date(agora))

/**
 * "AAAA-MM-DD" + "HH:MM" lidos como hora de Fortaleza → ISO (UTC). Calcula o
 * deslocamento do fuso naquele instante (sem supor −03:00 fixo no código).
 */
export function instanteDe(data, hora = '00:00') {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data || '')
  const h = /^(\d{2}):(\d{2})$/.exec(hora || '')
  if (!m || !h || +h[1] > 23 || +h[2] > 59) return null
  const alvo = Date.UTC(+m[1], +m[2] - 1, +m[3], +h[1], +h[2])
  if (new Date(alvo).toISOString().slice(0, 10) !== data) return null // 31/02, mês 13…
  let t = alvo
  for (let i = 0; i < 2; i++) {
    const p = partes(new Date(t))
    const [y, mo, d] = p.data.split('-').map(Number)
    const [hh, mi] = p.hora.split(':').map(Number)
    t += alvo - Date.UTC(y, mo - 1, d, hh, mi)
  }
  return new Date(t).toISOString()
}

const utc = (chave) => { const [y, m, d] = chave.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }
const chaveUtc = (dt) => dt.toISOString().slice(0, 10)
export function somarDias(chave, n) { const d = utc(chave); d.setUTCDate(d.getUTCDate() + n); return chaveUtc(d) }
export function somarMeses(chave, n) { const d = utc(chave); return chaveUtc(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))) }
/** 0 = domingo … 6 = sábado. */
export const diaDaSemana = (chave) => utc(chave).getUTCDay()
// Semana de SEGUNDA a domingo (pedido de 17/10/2026): o planejamento abre assim.
export const inicioSemana = (chave) => somarDias(chave, -((diaDaSemana(chave) + 6) % 7))
export const inicioMes = (chave) => chave.slice(0, 8) + '01'

/** Semanas (segunda a domingo) que cobrem o mês da data: 4 a 6 linhas de 7 dias. */
export function gradeMes(chave) {
  const primeiro = inicioMes(chave)
  const ultimo = somarDias(somarMeses(primeiro, 1), -1)
  const semanas = []
  for (let d = inicioSemana(primeiro); d <= ultimo; d = somarDias(d, 7)) {
    semanas.push(Array.from({ length: 7 }, (_, i) => somarDias(d, i)))
  }
  return semanas
}
export const diasDaSemana = (chave) => Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana(chave), i))

export const MODOS = ['semana', 'mes', 'dia', 'lista', 'fila']
export const ROTULO_MODO = { mes: 'Mês', semana: 'Semana', dia: 'Dia', lista: 'Lista', fila: 'Fila sem data' }

/** Avança/volta um período do modo. Lista anda de mês em mês, como o mês. */
export function mover(modo, chave, delta) {
  if (modo === 'dia') return somarDias(chave, delta)
  if (modo === 'semana') return somarDias(chave, 7 * delta)
  return somarMeses(chave, delta)
}

/**
 * O que buscar no banco. Uma leitura alimenta mês, semana, dia e lista do mesmo
 * mês (a grade inteira, com as bordas), e as sem data vêm sempre (fila).
 * Atalho (hoje, atrasadas…): janela em volta de agora, dentro do teto do banco
 * (120 dias).
 */
export function intervaloConsulta(chave, atalho = '', agora = Date.now()) {
  if (atalho) {
    const h = hoje(agora)
    return { de: instanteDe(somarDias(h, -90), '00:00'), ate: instanteDe(somarDias(h, 29), '00:00') }
  }
  const g = gradeMes(chave)
  return { de: instanteDe(g[0][0], '00:00'), ate: instanteDe(somarDias(g[g.length - 1][6], 1), '00:00') }
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MES_CURTO = MESES.map((m) => m.slice(0, 3))
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
// Cabeçalho da grade (semana começa na segunda).
export const DIAS_CABECALHO = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
export const DIAS_LONGOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const dm = (chave) => { const [, m, d] = chave.split('-').map(Number); return { d, m } }

/** Título do período na barra: "Outubro de 2026" · "Seg, 19 a dom, 25 de out" · "Sexta, 16 de outubro". */
export function tituloPeriodo(modo, chave) {
  const t = tituloCru(modo, chave)
  return t.charAt(0).toUpperCase() + t.slice(1)
}
function tituloCru(modo, chave) {
  if (modo === 'dia') { const { d, m } = dm(chave); return DIAS_LONGOS[diaDaSemana(chave)] + ', ' + d + ' de ' + MESES[m - 1] }
  if (modo === 'semana') {
    const [a, b] = [inicioSemana(chave), somarDias(inicioSemana(chave), 6)]
    const x = dm(a), y = dm(b)
    // Intervalo explícito, segunda a domingo: "seg, 19 a dom, 25 de out".
    return x.m === y.m ? 'seg, ' + x.d + ' a dom, ' + y.d + ' de ' + MES_CURTO[y.m - 1]
      : 'seg, ' + x.d + ' de ' + MES_CURTO[x.m - 1] + ' a dom, ' + y.d + ' de ' + MES_CURTO[y.m - 1]
  }
  if (modo === 'fila') return 'Sem data'
  return MESES[+chave.slice(5, 7) - 1] + ' de ' + chave.slice(0, 4)
}

/** Rótulo curto do período (celular): "12 a 18 de out" · "28 de set a 4 de out" · "Sex, 16 de out" · "Outubro de 2026". */
export function tituloCurto(modo, chave) {
  if (modo === 'semana') {
    const [a, b] = [inicioSemana(chave), somarDias(inicioSemana(chave), 6)]
    const x = dm(a), y = dm(b)
    return x.m === y.m ? x.d + ' a ' + y.d + ' de ' + MES_CURTO[y.m - 1] : x.d + ' de ' + MES_CURTO[x.m - 1] + ' a ' + y.d + ' de ' + MES_CURTO[y.m - 1]
  }
  if (modo === 'dia') { const { d, m } = dm(chave); return DIAS_CURTOS[diaDaSemana(chave)] + ', ' + d + ' de ' + MES_CURTO[m - 1] }
  return tituloPeriodo(modo, chave)
}
/** Nome dos botões de período: "Semana anterior" · "Próximo mês"… */
export function rotuloMover(modo, delta) {
  const [ant, prox] = { dia: ['Dia anterior', 'Próximo dia'], semana: ['Semana anterior', 'Próxima semana'] }[modo] || ['Mês anterior', 'Próximo mês']
  return delta < 0 ? ant : prox
}

/** "14:30" → "14h30"; "09:00" → "9h". */
export function horaCurta(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':')
  return Number(h) + 'h' + (m === '00' ? '' : m)
}
/** Instante → "sex, 16/10 · 14h30" (Fortaleza). */
export function quandoTexto(instante) {
  const p = partes(instante)
  if (!p) return 'Sem data'
  const { d, m } = dm(p.data)
  return DIAS_CURTOS[diaDaSemana(p.data)].toLowerCase() + ', ' + String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0') + ' · ' + horaCurta(p.hora)
}

// ── Regras da publicação ────────────────────────────────────────────────────
export function atrasada(post, agora = Date.now()) {
  return !!post && !!post.programado_para && !FECHADAS.includes(post.situacao) && new Date(post.programado_para).getTime() < agora
}

/**
 * Pendências da ficha como está na tela (antes de salvar) — mesmo cálculo de
 * public.redes_pendencias. `arquivos` = os ativos (sem removido_em).
 */
export function pendencias(post, arquivos, agora = Date.now()) {
  const r = []
  const ativos = (arquivos || []).filter((a) => !a.removido_em)
  const img = ativos.filter((a) => String(a.mime).startsWith('image/')).length
  const vid = ativos.filter((a) => String(a.mime).startsWith('video/')).length
  if (!ativos.length) r.push('sem_arte')
  else if ((post.formato === 'feed' && !(ativos.length === 1 && img === 1)) ||
    (post.formato === 'carrossel' && ativos.length < 2) ||
    (post.formato === 'reels' && !(ativos.length === 1 && vid === 1))) r.push('arte_incompativel')
  if (!post.responsavel_id) r.push('sem_responsavel')
  if (post.formato !== 'story' && !String(post.legenda || '').trim()) r.push('sem_legenda')
  if (!post.programado_para) r.push('sem_horario')
  if (atrasada(post, agora)) r.push('atrasada')
  return r
}
/** O que impede enviar para aprovação ou aprovar (atraso não impede). */
export const bloqueiosPronto = (post, arquivos, agora) => pendencias(post, arquivos, agora).filter((p) => p !== 'atrasada')

/** O que o formato pede, em uma frase. */
export function requisitoFormato(formato) {
  return {
    feed: 'Uma imagem, legenda, data, horário e responsável.',
    carrossel: 'Duas ou mais imagens ou vídeos na ordem de publicação, legenda, data, horário e responsável.',
    reels: 'Um vídeo, legenda, data, horário e responsável.',
    story: 'Uma ou mais imagens ou vídeos (a sequência), data, horário e responsável. Legenda não é exigida.',
  }[formato] || ''
}

export const JANELA_CONFLITO_MIN = 30
/** id → posts do MESMO perfil a menos de 30 min (aviso; nunca bloqueia). */
export function conflitos(posts) {
  const vivos = (posts || []).filter((p) => p.programado_para && p.situacao !== 'cancelado')
  const m = {}
  for (const a of vivos) {
    const ta = new Date(a.programado_para).getTime()
    const outros = vivos.filter((b) => b.id !== a.id && b.perfil === a.perfil &&
      Math.abs(new Date(b.programado_para).getTime() - ta) < JANELA_CONFLITO_MIN * 60000)
    if (outros.length) m[a.id] = outros
  }
  return m
}

// ── Filtros, atalhos e ordem ────────────────────────────────────────────────
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const ATALHOS = {
  hoje: 'De hoje', proximas: 'Próximos 7 dias', atrasadas: 'Atrasadas', minhas: 'Minhas',
  aprovacao: 'Aguardando aprovação', ajuste: 'Ajuste pedido', aprovadas: 'Aprovadas, a publicar',
  sem_resp: 'Sem responsável', sem_arte: 'Sem arte', sem_legenda: 'Sem legenda',
}
// Chave do atalho → chave da contagem em redes_resumo (o banco conta TODAS as
// abertas, não só o mês aberto na tela).
const CHAVE_RESUMO = { sem_resp: 'sem_responsavel' }
/** Contagem dos atalhos: do servidor quando há; senão, das postagens carregadas. */
export function contagemAtalhos(resumo, posts, ctx = {}) {
  const local = contarAtalhos(posts, ctx)
  if (!resumo) return local
  const o = {}
  for (const k of [...Object.keys(ATALHOS), 'sem_data']) {
    const v = resumo[CHAVE_RESUMO[k] || k]
    o[k] = v == null ? local[k] : Number(v) || 0
  }
  return o
}
/**
 * Alertas à vista no alto do Planejamento: só o que é trabalho DESTE perfil e
 * só com algo (nunca contador zerado). Quem aprova: o que espera por ela, o
 * atraso e o ajuste. Quem publica: o ajuste pedido, o que já pode ir ao ar e o
 * atraso (esperar aprovação não é tarefa dela). Os outros atalhos ficam em Filtros.
 */
export function alertasDoPerfil(contagem, { aprova = false } = {}) {
  const ordem = aprova ? ['aprovacao', 'atrasadas', 'ajuste'] : ['ajuste', 'aprovadas', 'atrasadas']
  return ordem.filter((k) => Number(contagem[k]) > 0)
}
/** Rótulo curto do alerta (cabe três numa linha de celular); o escopo vai no rótulo acessível. */
export function rotuloAlerta(k, n) {
  const um = Number(n) === 1
  return {
    aprovacao: 'para aprovar',
    atrasadas: um ? 'atrasada' : 'atrasadas',
    ajuste: 'com ajuste',
    aprovadas: 'a publicar',
  }[k] || (ATALHOS[k] || k).toLowerCase()
}
/**
 * Escopo de um atalho, em uma frase: atalho NÃO é a semana na tela. Diz de
 * onde vêm as postagens, para ninguém achar que ainda vê só o período escolhido.
 */
export function escopoAtalho(atalho) {
  return {
    hoje: 'as postagens em aberto programadas para hoje',
    proximas: 'as postagens em aberto dos próximos 7 dias',
    atrasadas: 'todas as postagens em aberto com horário vencido, de qualquer data',
    minhas: 'todas as postagens em aberto com você como responsável, de qualquer data',
    aprovacao: 'todas as postagens aguardando aprovação, de qualquer data',
    ajuste: 'todas as postagens com ajuste pedido, de qualquer data',
    aprovadas: 'todas as postagens aprovadas que ainda não foram publicadas, de qualquer data',
    sem_resp: 'todas as postagens em aberto sem responsável, de qualquer data',
    sem_arte: 'todas as postagens em aberto sem arte, de qualquer data',
    sem_legenda: 'todas as postagens em aberto sem legenda, de qualquer data',
  }[atalho] || ''
}
/** Quantos filtros (não período nem visualização) estão ligados. */
export const FILTROS = ['resp', 'sit', 'fmt', 'ed', 'part', 'q']
export const filtrosAtivos = (f = {}) => FILTROS.filter((k) => f[k]).length

/**
 * Como a semana cabe na LARGURA DO CONTEÚDO (não na do aparelho: o menu
 * lateral come espaço). Sete colunas só quando cada uma fica legível (~140 px);
 * no meio, agenda (dias em linhas, postagens ao lado); estreito, linhas que abrem.
 */
export const LARGURA_COLUNAS = 1040
export const LARGURA_AGENDA = 600
export function layoutSemana(largura) {
  if (!largura || largura >= LARGURA_COLUNAS) return 'colunas'
  return largura >= LARGURA_AGENDA ? 'agenda' : 'linhas'
}

/**
 * O alerta que o cartão mostra (um só, o mais urgente); o resto vai no rótulo
 * acessível e na ficha. Postagem fechada não tem alerta.
 */
export function alertaDoCartao(p, { agora = Date.now(), conflito = false } = {}) {
  if (FECHADAS.includes(p.situacao)) return null
  if (atrasada(p, agora)) return { tom: 'atencao', texto: 'Atrasada' }
  if (p.ajuste_aberto) return { tom: 'atencao', texto: 'Ajuste pedido' }
  if (conflito) return { tom: 'atencao', texto: 'Mesmo horário' }
  const n = (p.pendencias || []).filter((x) => x !== 'atrasada').length
  if (n) return { tom: 'neutro', texto: n === 1 ? PENDENCIAS[(p.pendencias || []).find((x) => x !== 'atrasada')] || '1 pendência' : n + ' pendências' }
  return null
}

// ── Ficha: seções editáveis e próxima ação ─────────────────────────────────
/**
 * Cada seção da ficha edita no lugar estes campos. A legenda edita SOZINHA:
 * "Salvar" fica logo embaixo do campo (com o teclado do celular aberto, ao
 * alcance); menções e observações têm a própria edição, menor.
 */
export const SECOES = {
  legenda: ['legenda'],
  extras: ['mencoes', 'observacoes'],
  programacao: ['programado_para', 'responsavel_id'],
  detalhes: ['titulo', 'perfil', 'formato', 'edicao_codigo', 'participante_id', 'referencias'],
}
/** Seções com alteração não salva (ficam abertas até salvar ou desfazer). */
export const secoesSujas = (mudancas) => Object.keys(SECOES).filter((s) => SECOES[s].some((k) => k in mudancas))
/** Pendência → onde se resolve: a seção e o campo. */
export const ONDE_PENDENCIA = {
  sem_arte: { secao: 'arquivos', campo: 'arte' }, arte_incompativel: { secao: 'arquivos', campo: 'arte' },
  sem_responsavel: { secao: 'programacao', campo: 'resp' }, sem_horario: { secao: 'programacao', campo: 'data' },
  sem_legenda: { secao: 'legenda', campo: 'legenda' },
}

/**
 * A ÚNICA ação em destaque da ficha (o rodapé). Salvar, enviar para aprovação,
 * aprovar e confirmar são ações diferentes: com alteração não salva, a ação é
 * salvar — nenhuma etapa anda com a versão antiga. `null` = nada a destacar.
 */
export function proximaAcao({ novo = false, sujo = false, situacao = 'rascunho', bloqueios = 0, pode = () => false, confirmando = false } = {}) {
  if (novo) return { chave: 'criar', rotulo: 'Criar rascunho', icone: 'feito' }
  if (FECHADAS.includes(situacao) && sujo) return null
  if (sujo) return pode('redes.editar') ? { chave: 'salvar', rotulo: 'Salvar alterações', icone: 'feito' } : null
  if ((situacao === 'rascunho' || situacao === 'preparacao') && pode('redes.editar')) {
    return { chave: 'enviar', rotulo: 'Enviar para aprovação', icone: 'enviar', bloqueada: bloqueios > 0 }
  }
  if (situacao === 'aprovacao' && pode('redes.aprovar')) return { chave: 'aprovar', rotulo: 'Aprovar', icone: 'sucesso' }
  if (situacao === 'pronto' && pode('redes.publicar') && !confirmando) return { chave: 'confirmar', rotulo: 'Confirmar publicação…', icone: 'feito' }
  return null
}
function noAtalho(p, atalho, { eu, agora }) {
  if (!atalho) return true
  const aberta = !FECHADAS.includes(p.situacao)
  const t = p.programado_para ? new Date(p.programado_para).getTime() : null
  if (atalho === 'hoje') return aberta && t != null && chaveDia(p.programado_para) === hoje(agora)
  if (atalho === 'proximas') return aberta && t != null && t >= agora && t < agora + 7 * 864e5
  if (atalho === 'atrasadas') return atrasada(p, agora)
  if (atalho === 'minhas') return aberta && !!eu && p.responsavel_id === eu
  if (atalho === 'aprovacao') return p.situacao === 'aprovacao'
  if (atalho === 'aprovadas') return p.situacao === 'pronto'
  if (atalho === 'ajuste') return aberta && !!p.ajuste_aberto
  // Pendências vêm do servidor (redes_pendencias): Story não conta "sem legenda".
  if (atalho === 'sem_arte') return aberta && (p.pendencias || []).includes('sem_arte')
  if (atalho === 'sem_legenda') return aberta && (p.pendencias || []).includes('sem_legenda')
  if (atalho === 'sem_resp') return aberta && !p.responsavel_id
  return true
}

/**
 * Filtros do endereço → lista. `resp`: uuid · 'eu' · 'ninguem'. `sit`: uma
 * situação · 'abertas' · 'atrasada'. Busca no título e no participante.
 */
export function filtrar(posts, f = {}, ctx = {}) {
  const agora = ctx.agora ?? Date.now()
  const q = semAcento(f.q).trim()
  return (posts || []).filter((p) => {
    if (f.resp === 'ninguem' ? p.responsavel_id : f.resp === 'eu' ? p.responsavel_id !== ctx.eu : f.resp && p.responsavel_id !== f.resp) return false
    if (f.sit === 'abertas' ? FECHADAS.includes(p.situacao) : f.sit === 'atrasada' ? !atrasada(p, agora) : f.sit && p.situacao !== f.sit) return false
    if (f.fmt && p.formato !== f.fmt) return false
    if (f.ed && p.edicao_codigo !== f.ed) return false
    if (f.part && p.participante_id !== f.part) return false
    if (q && !semAcento(p.titulo).includes(q) && !semAcento(p.participante_nome).includes(q)) return false
    return noAtalho(p, f.atalho, { eu: ctx.eu, agora })
  })
}

/** Conta dos atalhos (a faixa de avisos da tela). */
export function contarAtalhos(posts, ctx = {}) {
  const agora = ctx.agora ?? Date.now()
  const o = {}
  for (const k of Object.keys(ATALHOS)) o[k] = (posts || []).filter((p) => noAtalho(p, k, { eu: ctx.eu, agora })).length
  o.sem_data = (posts || []).filter((p) => !p.programado_para && !FECHADAS.includes(p.situacao)).length
  return o
}

const ORDEM_SIT = Object.fromEntries(SITUACOES.map((s, i) => [s.chave, i]))
export const ORDENS = { data: 'Data', titulo: 'Título', formato: 'Formato', responsavel: 'Responsável', situacao: 'Situação' }
/** `ord` = 'data' | '-data' | 'titulo' …; sem data vai para o fim. */
export function ordenar(posts, ord = 'data') {
  const desc = ord.startsWith('-')
  const k = desc ? ord.slice(1) : ord
  const val = (p) => k === 'data' ? (p.programado_para ? new Date(p.programado_para).getTime() : Infinity)
    : k === 'situacao' ? ORDEM_SIT[p.situacao] ?? 99
    : k === 'responsavel' ? semAcento(p.responsavel_nome || '~')
    : semAcento(p[k] || '')
  return [...(posts || [])].sort((a, b) => {
    const x = val(a), y = val(b)
    const c = x < y ? -1 : x > y ? 1 : 0
    return (desc ? -c : c) || String(a.id).localeCompare(String(b.id))
  })
}

/** Posts por dia de Fortaleza, cada dia em ordem de horário. */
export function porDia(posts) {
  const m = {}
  for (const p of ordenar((posts || []).filter((x) => x.programado_para), 'data')) (m[chaveDia(p.programado_para)] ||= []).push(p)
  return m
}

/** Legenda + menções, do jeito que vai para o Instagram (um toque para copiar). */
export function textoCompleto(legenda, mencoes) {
  return [String(legenda || '').trim(), String(mencoes || '').trim()].filter(Boolean).join('\n\n')
}
export const LIMITE_LEGENDA_INSTAGRAM = 2200

/** "@jolie.cafe" a partir do que a casa cadastrou (link, @ ou só o nome). Vazio se não der. */
export function arrobaDe(instagram) {
  const s = String(instagram || '').trim()
  const m = /instagram\.com\/([A-Za-z0-9._]{1,30})/i.exec(s) || /^@?([A-Za-z0-9._]{1,30})$/.exec(s)
  return m ? '@' + m[1] : ''
}

/** Filtros que moram no endereço (#operacao/redes?modo=…). */
// `volta`: de onde a postagem nova veio (part:<id> = ficha do participante) — fechar volta para lá.
export const CHAVES_FILTRO = ['modo', 'data', 'dia', 'resp', 'sit', 'fmt', 'ed', 'part', 'q', 'ord', 'atalho', 'volta']

// ── Arquivos ────────────────────────────────────────────────────────────────
export const LIMITE_BYTES = 50 * 1024 * 1024 // teto de upload do projeto, não regra do Instagram
export const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov' }
const POR_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime' }
export const ACEITE = Object.keys(TIPOS).join(',') + ',.jpg,.jpeg,.png,.webp,.mp4,.m4v,.mov'

/** Tipo pela extensão (o navegador às vezes manda `type` vazio para .mov). */
export function mimeDe(nome, tipo) {
  if (TIPOS[tipo]) return tipo
  return POR_EXT[String(nome || '').split('.').pop().toLowerCase()] || null
}

/** Os primeiros bytes batem com o tipo declarado? (arquivo renomeado ou corrompido) */
export function assinaturaConfere(bytes, mime) {
  const b = bytes || []
  const txt = (i, n) => String.fromCharCode(...Array.from(b).slice(i, i + n))
  if (mime === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  if (mime === 'image/png') return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)
  if (mime === 'image/webp') return txt(0, 4) === 'RIFF' && txt(8, 4) === 'WEBP'
  if (mime === 'video/mp4' || mime === 'video/quicktime') return ['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip'].includes(txt(4, 4))
  return false
}

/** Validação antes de subir. `cabecalho` = primeiros 16 bytes. */
export function validarArquivo({ nome, tipo, tamanho, cabecalho }) {
  const mime = mimeDe(nome, tipo)
  if (!mime) return { ok: false, erro: 'Formato não aceito. Use JPG, PNG, WEBP, MP4 ou MOV.' }
  if (!tamanho) return { ok: false, erro: 'Arquivo vazio.' }
  if (tamanho > LIMITE_BYTES) return { ok: false, erro: 'Arquivo acima de 50 MB, o limite do painel. Exporte uma versão menor.' }
  if (cabecalho && !assinaturaConfere(cabecalho, mime)) return { ok: false, erro: 'O conteúdo não corresponde à extensão (arquivo renomeado ou corrompido).' }
  return { ok: true, mime, ext: TIPOS[mime] }
}

/** Caminho no bucket `redes`: <post>/<uuid>.<ext> — mesmo padrão da Edge Function e do CHECK. */
export const caminhoArquivo = (postId, uuid, ext) => postId + '/' + uuid + '.' + ext

/** Campos de conteúdo que redes_salvar aceita (o resto tem ação própria). */
export const CAMPOS = ['titulo', 'perfil', 'edicao_codigo', 'participante_id', 'formato', 'legenda', 'mencoes', 'observacoes', 'referencias', 'programado_para', 'responsavel_id']
const norm = (v) => (v == null ? '' : String(v))
/** Só o que mudou em relação à base (o que vai para o servidor). */
export function diferencas(base, campos) {
  const d = {}
  for (const k of CAMPOS) if (k in campos && norm(campos[k]) !== norm(base[k])) d[k] = campos[k] === '' ? null : campos[k]
  return d
}
/**
 * Conflito de versão: dos campos que EU mudei, quais a outra pessoa também
 * mudou (valor salvo ≠ o que eu tinha lido). Esses pedem decisão; o resto pode
 * ir por cima da versão nova sem apagar o trabalho de ninguém.
 */
export function camposEmConflito(baseLida, salvo, meus) {
  return Object.keys(meus).filter((k) => norm(salvo[k]) !== norm(baseLida[k]) && norm(salvo[k]) !== norm(meus[k]))
}

// ── Sincronização: o que chegou de fora enquanto a pessoa digitava (19/10/2026) ──
/** Os campos de conteúdo de uma postagem, como texto (o que os formulários editam). */
export const camposDoPost = (p) => Object.fromEntries(CAMPOS.map((k) => [k, norm(p ? p[k] : '')]))

/**
 * Chegou uma versão nova da postagem (sinal de outra pessoa, reconexão, depois de uma ação)
 * enquanto a ficha pode ter texto digitado. Mescla campo a campo em três vias:
 *   velha    = a última versão que ESTA tela viu confirmada (a base);
 *   atuais   = o que está digitado agora;
 *   servidor = a postagem como ela está agora.
 *   · campo que a pessoa não tocou           → acompanha o servidor;
 *   · campo que ela mudou e o servidor não   → fica o dela;
 *   · campo que ela mudou e o servidor mudou para OUTRO valor → CONFLITO: fica o dela e a tela
 *     NÃO deixa salvar até ela escolher (a base anda para a versão nova; sem esse bloqueio, o
 *     salvamento seguinte levaria a versão nova e passaria por cima do outro sem ninguém perceber).
 * Devolve: campos (o que a tela mostra), meus (o que ELA mudou, no formato de redes_salvar),
 * conflitos (chaves), adotados (campos que acompanharam o servidor sem ela ter tocado) e
 * mudouFora (a versão andou).
 */
export function mesclarPostExterno(velha, atuais, servidor) {
  const v = velha || {}
  const meus = diferencas(v, atuais || {})
  const conflitos = camposEmConflito(v, servidor, meus)
  const adotados = CAMPOS.filter((k) => !(k in meus) && norm(servidor[k]) !== norm(v[k]))
  const campos = camposDoPost(servidor)
  for (const k of Object.keys(meus)) campos[k] = atuais[k]
  return { campos, meus, conflitos, adotados, mudouFora: servidor.versao !== v.versao }
}
/**
 * Conflitos que seguem valendo: os já avisados mais os novos, só dos campos que a pessoa AINDA tem
 * alterados. A base anda para a versão nova, então um conflito avisado numa releitura precisa
 * sobreviver à seguinte — senão a segunda releitura "esquece" e libera o salvar por cima.
 */
export function conflitosAbertos(anteriores, novos, mudancas) {
  const m = mudancas || {}
  return [...new Set([...(anteriores || []), ...(novos || [])])].filter((k) => k in m)
}

/**
 * O aviso do barramento é sobre OUTRA postagem? Só quando dá para ter certeza: todos os sinais
 * são do servidor ('remota'), só do domínio das postagens e todos trazem o id de outras postagens.
 * Gravação local, reconciliação (sem id) ou qualquer outro domínio → não dá para dizer: relê.
 */
export function avisoDeOutraPostagem(aviso, id) {
  if (!aviso || !id) return false
  const dominios = aviso.dominios || [], refs = aviso.refs || [], origens = aviso.origens || []
  if (!dominios.length || !dominios.every((d) => d === 'redes')) return false
  if (!origens.length || !origens.every((o) => o === 'remota')) return false
  return refs.length > 0 && !refs.includes(String(id))
}

/** O texto alternativo mudou no servidor DEPOIS de a pessoa começar a digitar o dela (e não é o mesmo texto)? */
export const altMudouFora = (rascunho, altAtual) => !!rascunho && norm(altAtual) !== norm(rascunho.base) && norm(altAtual) !== norm(rascunho.v)

/** Seleção que sobrevive à releitura: fica quem ainda existe (já com o objeto novo); quem sumiu sai. */
export function podarSelecao(marcados, lista, chave) {
  if (!marcados || !marcados.size) return marcados
  const novo = new Map()
  for (const x of lista || []) { const k = chave(x); if (marcados.has(k)) novo.set(k, x) }
  return novo
}

// ── Combo editorial (Social media › Participantes) ──
const COMBO_CAMPOS = ['combo_nome', 'combo_descricao', 'combo_proposta']
/** O que mudou no formulário em relação ao lido (só isso vai ao servidor). */
export function mudancasEditoriais(lido, form) {
  const d = {}
  for (const k of COMBO_CAMPOS) if (norm(form[k]).trim() !== norm(lido[k])) d[k] = form[k]
  const itens = []
  for (const it of form.itens || []) {
    const orig = (lido.itens || []).find((x) => x.id === it.id) || {}
    const m = {}
    if (norm(it.nome).trim() !== norm(orig.nome)) m.nome = it.nome
    if (norm(it.descricao).trim() !== norm(orig.descricao)) m.descricao = it.descricao
    if (Object.keys(m).length) itens.push({ id: it.id, ...m })
  }
  if (itens.length) d.itens = itens
  return d
}
/** O combo editável como mapa plano de campo → texto ('item:<id>:nome'…), a forma que a mesclagem entende. */
export function achatarEditavel(ed) {
  const o = {}
  for (const k of COMBO_CAMPOS) o[k] = norm(ed && ed[k])
  for (const it of (ed && ed.itens) || []) { o['item:' + it.id + ':nome'] = norm(it.nome); o['item:' + it.id + ':descricao'] = norm(it.descricao) }
  return o
}
/**
 * Volta do mapa plano para o formato do combo editável; o que o mapa não tem vem do `modelo` (o servidor agora).
 * Texto vazio onde o servidor tem NULO continua nulo: é o que o servidor compara em `p_esperado` (vazio ≠ nulo lá).
 */
export function aEditavel(plano, modelo) {
  const m = modelo || {}, p = plano || {}
  const pega = (k, padrao) => (k in p ? (p[k] === '' && (padrao == null || padrao === '') ? padrao : p[k]) : padrao)
  const o = { ...m }
  for (const k of COMBO_CAMPOS) o[k] = pega(k, m[k])
  o.itens = (m.itens || []).map((it) => ({ ...it, nome: pega('item:' + it.id + ':nome', it.nome), descricao: pega('item:' + it.id + ':descricao', it.descricao) }))
  return o
}
/**
 * Registro do combo em edição (null = ninguém editando). É o reducer genérico de
 * lib/sync/mesclar.js com dois extras: 'iniciar' (abre a edição sobre o combo lido agora) e 'sair'.
 * Chegou o combo novo do servidor ('servidor'): o que a pessoa não tocou acompanha, o que digitou
 * nunca é trocado, o mesmo campo mudado dos dois lados vira conflito e ela escolhe.
 */
export function reduzirEditorial(estado, acao) {
  if (acao.tipo === 'iniciar') { const plano = achatarEditavel(acao.editavel); return iniciarRegistro(plano, Object.keys(plano)) }
  if (acao.tipo === 'sair') return null
  return estado ? reduzirRegistro(estado, acao) : estado
}
