/*
 * Fotos (marca) — lógica pura da tela (22/10/2026, "§8 Fotos" do pedido do Wilker). Sem DOM, sem rede;
 * testada em tests/painel-app-fotos-marca.test.mjs.
 *
 * A tela tem três blocos: Agendamento da sessão, Preparação (o guia, que já existe) e Fotos oficiais.
 * Aqui moram as decisões que não dependem de React:
 *   · datas por extenso e hora NO FUSO DE QUEM ABRE (sem `fuso`, o do navegador);
 *   · vagas agrupadas por dia, em ordem;
 *   · o estado da sessão (aguardando liberação · sem horários · escolher · agendada · remarcada · realizada);
 *   · o que o banco responde a uma reserva, em português;
 *   · o que dizer enquanto a leitura não existe: falha NUNCA vira "lista vazia".
 *
 * Nada aqui inventa dado: o que falta numa sessão (dia, hora, local) volta como `null` e a tela escreve
 * "a organização ainda vai confirmar".
 */
import { tipoLegivel, tamanhoLegivel } from './arquivos.js'
import { dataCurta } from './respostas.js'
import { leituraVale } from './arquivosMarca.js'

export const A_CONFIRMAR = 'A organização ainda vai confirmar'
export const TEXTO_CONCORRENCIA = 'Esse horário acabou de ser escolhido por outra marca. Escolha outro.'

/* ── Datas e horas ─────────────────────────────────────────────────────── */

const valida = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}
const com = (opcoes, fuso) => (fuso ? { ...opcoes, timeZone: fuso } : opcoes)

export const capitalizar = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '')
/** Para encaixar o dia no meio de uma frase: "Sábado, 24…" → "sábado, 24…". */
export const minuscula = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : '')

/** Dia do calendário no fuso, "AAAA-MM-DD" (chave de agrupamento; nunca o dia em UTC). */
export function diaChave(iso, { fuso } = {}) {
  const d = valida(iso)
  if (!d) return null
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', com({ year: 'numeric', month: '2-digit', day: '2-digit' }, fuso))
    .formatToParts(d).map((x) => [x.type, x.value]))
  return p.year + '-' + p.month + '-' + p.day
}

/** "sábado, 24 de outubro de 2026" (dia da semana + data). `comAno: false` tira o ano. */
export function dataCompleta(iso, { fuso, comAno = true } = {}) {
  const d = valida(iso)
  if (!d) return null
  return new Intl.DateTimeFormat('pt-BR', com({ weekday: 'long', day: 'numeric', month: 'long', ...(comAno ? { year: 'numeric' } : {}) }, fuso)).format(d)
}

/** "14:00" — sempre 24 h, com minutos; meia-noite é 00:00 (nunca 24:00). */
export function horaCurta(iso, { fuso } = {}) {
  const d = valida(iso)
  if (!d) return null
  return new Intl.DateTimeFormat('pt-BR', com({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, fuso)).format(d)
}

const anoDe = (d, fuso) => new Intl.DateTimeFormat('en-US', com({ year: 'numeric' }, fuso)).format(d)

/* ── Vagas por dia ─────────────────────────────────────────────────────── */

/**
 * Vagas (sessoes_fotos abertas) → um grupo por dia, dias em ordem e horas em ordem dentro do dia.
 *   { chave, rotulo, local, localPorVaga, vagas:[{ id, data_hora, hora, local }] }
 * `local` = o local comum ao dia (todas as vagas dizem o mesmo); `localPorVaga` = os locais divergem, então cada
 * vaga mostra o seu. Sem local em nenhuma: `local` nulo e `localPorVaga` falso — a tela diz que a organização confirma.
 * Vaga sem data válida não entra: não dá para escolher o que não tem dia nem hora. O ano só aparece quando não é o atual.
 */
export function agruparVagasPorDia(vagas, { fuso, agora = new Date() } = {}) {
  const ordenadas = (vagas || [])
    .filter((v) => valida(v && v.data_hora))
    .slice()
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora) || String(a.id).localeCompare(String(b.id)))
  const grupos = []
  for (const v of ordenadas) {
    const chave = diaChave(v.data_hora, { fuso })
    let g = grupos[grupos.length - 1]
    if (!g || g.chave !== chave) {
      const comAno = anoDe(new Date(v.data_hora), fuso) !== anoDe(agora, fuso)
      g = { chave, rotulo: capitalizar(dataCompleta(v.data_hora, { fuso, comAno })), local: null, localPorVaga: false, vagas: [] }
      grupos.push(g)
    }
    g.vagas.push({ id: v.id, data_hora: v.data_hora, hora: horaCurta(v.data_hora, { fuso }), local: String(v.local || '').trim() || null })
  }
  for (const g of grupos) {
    const locais = [...new Set(g.vagas.map((v) => v.local || ''))]
    if (locais.length === 1) g.local = locais[0] || null
    else g.localPorVaga = true
  }
  return grupos
}

/* ── A sessão da marca ─────────────────────────────────────────────────── */

/**
 * Dia, hora e local de UMA sessão. Cada campo é texto ou `null` (= a organização ainda vai confirmar).
 * `faltando` lista o que não veio ("o dia", "a hora", "o local").
 */
export function detalhesDaSessao(s, { fuso } = {}) {
  const iso = s && s.data_hora
  const dia = dataCompleta(iso, { fuso })
  const hora = horaCurta(iso, { fuso })
  const local = String((s && s.local) || '').trim() || null
  const faltando = []
  if (!dia) faltando.push('o dia')
  if (!hora) faltando.push('a hora')
  if (!local) faltando.push('o local')
  return {
    dia: dia && capitalizar(dia), hora, local,
    observacoes: String((s && s.observacoes) || '').trim() || null,
    faltando,
  }
}

export const ESTADOS_SESSAO = {
  aguardando_liberacao: { rotulo: 'Aguardando liberação', tom: 'neutro' },
  sem_horarios: { rotulo: 'Sem horários disponíveis', tom: 'neutro' },
  escolher: { rotulo: 'Escolha um horário', tom: 'atencao' },
  agendada: { rotulo: 'Sessão agendada', tom: 'andamento' },
  remarcada: { rotulo: 'Sessão remarcada', tom: 'andamento' },
  realizada: { rotulo: 'Sessão realizada', tom: 'ok' },
}

const TEXTO_ESTADO = {
  aguardando_liberacao: 'A organização ainda não liberou a sessão de fotos da sua marca. Os horários aparecem aqui quando ela liberar.',
  sem_horarios: 'A sessão está liberada, mas a organização ainda não abriu horários. Eles aparecem aqui assim que ela abrir.',
  escolher: 'Escolha o dia e a hora que melhor servem para a sua casa. Cada marca tem uma sessão.',
  agendada: 'Sua sessão está marcada. Confira o dia, a hora e o local.',
  remarcada: 'A organização mudou o horário da sua sessão. Confira o novo dia, a nova hora e o local.',
  realizada: 'A sessão já aconteceu. As fotos oficiais chegam aqui, no bloco de fotos oficiais, quando a organização as enviar.',
}

const ativa = (s) => s.status === 'agendada' || s.status === 'remarcada'
const maisRecente = (lista) => lista.slice().sort((a, b) => new Date(b.data_hora || 0) - new Date(a.data_hora || 0))[0] || null

/**
 * O estado da sessão desta participação, em palavras. Precisa do que `fotosDaParticipacao` (guia.js) já separa:
 * `minhas` (sessões da participação) e `vagas` (horários livres da edição). Ordem:
 *   sessão marcada/remarcada > sessão realizada > ainda não liberada > liberada sem horários > liberada com horários.
 * "Liberada" é só `foto_liberacao === 'liberado'` (o mesmo critério do guia e da policy do banco).
 */
export function estadoDaSessao({ participacao, minhas = [], vagas = [] } = {}) {
  const marcada = maisRecente(minhas.filter(ativa))
  const feita = maisRecente(minhas.filter((s) => s.status === 'realizada'))
  const liberado = !!participacao && participacao.foto_liberacao === 'liberado'
  let chave
  let sessao = null
  if (marcada) { chave = marcada.status === 'remarcada' ? 'remarcada' : 'agendada'; sessao = marcada }
  else if (feita) { chave = 'realizada'; sessao = feita }
  else if (!liberado) chave = 'aguardando_liberacao'
  else chave = vagas.length === 0 ? 'sem_horarios' : 'escolher'
  return { chave, ...ESTADOS_SESSAO[chave], texto: TEXTO_ESTADO[chave], sessao }
}

/**
 * A frase sob o título do bloco de agendamento. Segue o ESTADO, não a existência de uma sessão: marca já liberada,
 * com horários à vista, não pode ler "quando a organização liberar" no subtítulo do mesmo bloco que mostra as vagas.
 * `estado` = o que `estadoDaSessao` devolve; sem ele (carregando, erro) vale a frase de quem ainda espera.
 */
const NOTA_SECAO = {
  aguardando_liberacao: 'Quando a organização liberar, você escolhe aqui o dia e a hora.',
  sem_horarios: 'A sessão está liberada: os horários aparecem aqui quando a organização abrir.',
  escolher: 'Escolha aqui o dia e a hora da sua sessão.',
  agendada: 'O dia, a hora e o local da sua sessão.',
  remarcada: 'O dia, a hora e o local da sua sessão.',
  realizada: 'O dia, a hora e o local da sua sessão.',
}
export const notaDoAgendamento = (estado) => NOTA_SECAO[estado && estado.chave] || NOTA_SECAO.aguardando_liberacao

/**
 * "Sua sessão é sábado, 24 de outubro de 2026, às 14:00." — só para sessão por vir (agendada ou remarcada). Sessão
 * realizada, ou marcada para uma data que já passou sem a organização dar baixa, não vira frase no presente:
 * o bloco ao lado diz que ela já aconteceu. Sem dia válido, nada (a tela não inventa).
 */
export function fraseDaSessao(estado, { fuso, agora = new Date() } = {}) {
  if (!estado || !estado.sessao || (estado.chave !== 'agendada' && estado.chave !== 'remarcada')) return ''
  const quando = valida(estado.sessao.data_hora)
  if (!quando || quando <= agora) return ''
  const d = detalhesDaSessao(estado.sessao, { fuso })
  return d.dia ? 'Sua sessão é ' + minuscula(d.dia) + (d.hora ? ', às ' + d.hora : '') + '.' : ''
}

/** A sessão cancelada mais recente (para dizer "a anterior foi cancelada"), se a marca não tem outra em andamento. */
export function sessaoCancelada(minhas = []) {
  return maisRecente(minhas.filter((s) => s.status === 'cancelada'))
}

/* ── Reservar ──────────────────────────────────────────────────────────── */

/** O texto da confirmação antes de reservar: o que a pessoa está escolhendo, por extenso. */
export function textoDeConfirmarReserva(vaga, { fuso } = {}) {
  const d = detalhesDaSessao(vaga, { fuso })
  const quando = d.dia ? minuscula(d.dia) + (d.hora ? ', às ' + d.hora : '') : 'este horário'
  return 'Reservar ' + quando + '?\n\nLocal: ' + (d.local || A_CONFIRMAR.toLowerCase() + '.') + '\n\nPara mudar depois, é preciso falar com a organização.'
}

const REDE = /Failed to fetch|Load failed|NetworkError|TimeoutError|AbortError|aborted|timed out/i

/**
 * O que a reserva respondeu → o aviso da tela.
 *   { tom:'ok'|'erro', texto, reservou?, tirarVaga? }
 * `linhas` é o que o PATCH devolveu (`return=representation`): lista vazia = a vaga já não estava aberta (outra marca
 * pegou antes, ou o horário passou) — o banco não dá erro nesse caso, só não grava nada. `tirarVaga` pede à tela que
 * tire a vaga da lista ao lado da releitura, para uma releitura que falhe não deixar à vista o horário que já se foi.
 */
export function interpretarReserva({ linhas, erro, vaga, agora = new Date() } = {}) {
  if (!erro) {
    if (Array.isArray(linhas) && linhas.length > 0) return { tom: 'ok', texto: 'Horário reservado. A organização é avisada.', reservou: true }
    const passou = !!(vaga && valida(vaga.data_hora) && new Date(vaga.data_hora) <= agora)
    return { tom: 'erro', texto: passou ? 'Esse horário já passou. Escolha outro.' : TEXTO_CONCORRENCIA, tirarVaga: true }
  }
  const m = String((erro && (erro.message || erro.codigo)) || erro)
  const cod = String((erro && erro.codigo) || '')
  if (/modo_visualizacao/.test(m)) return { tom: 'erro', texto: 'Modo visualização: você está vendo como a marca, e nada é gravado.' }
  // Índice "uma sessão ativa por participação" (23505): já há sessão marcada (outra aba, outro aparelho).
  if (/23505|duplicate|unique/i.test(m + ' ' + cod)) return { tom: 'erro', texto: 'Sua marca já tem uma sessão marcada.' }
  if (/42501|row-level security|permission denied/i.test(m + ' ' + cod) || (erro && erro.status === 403)) {
    return { tom: 'erro', texto: 'A organização ainda não liberou a sessão de fotos da sua marca. Os horários podem ser escolhidos quando ela liberar.' }
  }
  if (REDE.test(m)) return { tom: 'erro', texto: 'Sem conexão com o servidor. Confira a internet e tente de novo.' }
  return { tom: 'erro', texto: 'Não deu para reservar agora. Tente de novo.' }
}

/* ── Leitura que falha não vira "nada" ─────────────────────────────────── */

/**
 * Em que pé está uma leitura: 'pronto' (há dado, mesmo que uma releitura tenha falhado depois — o dado anterior
 * fica na tela), 'erro' (nunca houve dado e a leitura falhou) ou 'carregando'. "Vazio" não é um destes: só se decide
 * que a lista está vazia DENTRO de 'pronto'.
 */
export function situacaoDaLeitura({ dados, erro } = {}) {
  if (dados !== null && dados !== undefined) return 'pronto'
  return erro ? 'erro' : 'carregando'
}

/* ── O que o guia já sabe ─────────────────────────────────────────────── */

/**
 * As pendências da aba Fotos que `resumoMarca` (guia.js) já produz: marcar a sessão, conferir fotos oficiais e as
 * solicitações da organização sobre as fotos (`bloco: 'fotos'`). É a MESMA regra que dá o número do selo da aba
 * (guia.js › `contagem`: toda pendência da vista): lista e selo não podem divergir.
 */
export function pendenciasDeFotos(resumo) {
  if (!resumo || !Array.isArray(resumo.pendencias)) return []
  return resumo.pendencias.filter((p) => p.vista === 'fotos')
}

/* ── Fotos oficiais ────────────────────────────────────────────────────── */

export const ehImagem = (a) => /^image\//.test((a && a.mime) || '') || /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test((a && a.path) || '')

/** "Imagem JPG · 2,3 MB · versão 2 · 21/10/2026" — só o que o dado tem. */
export function detalheDaFoto(a) {
  return [tipoLegivel(a.mime, a.path), tamanhoLegivel(a.tamanho), a.versao ? 'versão ' + a.versao : '', dataCurta(a.publicado_em || a.created_at)]
    .filter(Boolean).join(' · ')
}

/**
 * A conferência de uma foto: 'nao_exige' · 'lido' · 'pendente' · 'desconhecida'.
 * `leituraOk` = a leitura de `arquivo_leitura` chegou. Sem ela NÃO se sabe se a pessoa já conferiu: dizer "pendente"
 * seria afirmar o que não se sabe (e oferecer o botão de novo para quem já conferiu).
 * Conferência anterior à versão atual (a foto foi substituída) não vale: volta a ser pedida (`leituraVale`).
 */
export function situacaoDaConferencia(a, lidos, leituraOk) {
  if (!a || !a.exige_leitura) return 'nao_exige'
  if (leituraVale(a, lidos && lidos[a.id])) return 'lido'
  return leituraOk ? 'pendente' : 'desconhecida'
}
