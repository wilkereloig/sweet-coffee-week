/*
 * Horário NO FESTIVAL (pedido do Wilker, 23/10/2026): uma pergunta só — como a unidade funciona em cada dia do festival.
 * Sem "horário da loja" × "horário do combo", sem horário comercial padrão.
 *
 * O dado mora em participacao_unidades.horario_festival (jsonb): [{ data: '2026-11-05', abre: '10:00', fecha: '22:00' }, …]
 * — até 2 períodos por dia (p.ex. fecha para o almoço), "meia-noite" é '24:00', DIA SEM PERÍODO = NÃO ABRE e array vazio =
 * AINDA NÃO RESPONDIDO. O banco valida tudo (horario_festival_normalizar); este módulo é a mesma regra para a tela.
 *
 * Aqui só existe lógica pura (sem React, sem rede). O seletor (components/HorarioFestival.jsx), a ficha da equipe e a
 * página /preencher (que tem a própria cópia, por ser estática) seguem este modelo:
 *   dias = [{ data, periodos }]   periodos: null = sem resposta · [] = não abre · [[abre, fecha], …] = abre
 */

const NOMES_CURTOS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const NOMES_LONGOS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

/** Horas que se pode escolher: de meia em meia hora, das 5h às 23h30. Fechar também pode ser à meia-noite (24:00). */
export const HORAS_ABRE = (() => {
  const l = []
  for (let h = 5; h <= 23; h++) { l.push(String(h).padStart(2, '0') + ':00'); l.push(String(h).padStart(2, '0') + ':30') }
  return l
})()
export const HORAS_FECHA = [...HORAS_ABRE.slice(1), '24:00']
export const MAX_PERIODOS_POR_DIA = 2

/** Os três grupos do "Muda conforme o dia" (índices de dia da semana, segunda = 0). */
export const GRUPOS = [
  { chave: 'semana', rotulo: 'Segunda a sexta', dias: [0, 1, 2, 3, 4] },
  { chave: 'sab', rotulo: 'Sábado', dias: [5] },
  { chave: 'dom', rotulo: 'Domingo', dias: [6] },
]

const IGUAL = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** 'HH:MM:SS' (PostgREST) ou 'HH:MM' → 'HH:MM'. Entrada ilegível devolve ''. */
export function normalizarHora(x) {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(String(x == null ? '' : x).trim())
  return m ? String(Number(m[1])).padStart(2, '0') + ':' + m[2] : ''
}

/** '10:00' → '10h' · '10:30' → '10h30' · '24:00' → 'meia-noite'. */
export function horaTexto(hhmm) {
  const h = normalizarHora(hhmm)
  if (!h) return ''
  if (h === '24:00') return 'meia-noite'
  const [hh, mm] = h.split(':')
  return Number(hh) + 'h' + (mm === '00' ? '' : mm)
}

/** [abre, fecha] → 'das 10h às 22h' · 'das 18h à meia-noite'. */
export function periodoTexto(p) {
  if (!p || !p[0] || !p[1]) return ''
  return 'das ' + horaTexto(p[0]) + (normalizarHora(p[1]) === '24:00' ? ' à meia-noite' : ' às ' + horaTexto(p[1]))
}

/** [[a, f], [a2, f2]] → 'das 12h às 15h e das 18h às 22h'. */
export function periodosTexto(ps) {
  return (ps || []).map(periodoTexto).filter(Boolean).join(' e ')
}

// ── Datas ────────────────────────────────────────────────────────────────────────────────────────

const partes = (data) => String(data || '').split('-').map(Number)

/** Dia da semana de 'AAAA-MM-DD' com segunda = 0 … domingo = 6 (sem fuso: conta em UTC). */
export function diaDaSemana(data) {
  const [a, m, d] = partes(data)
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7
}

/** 'AAAA-MM-DD' de início a fim, em ordem (no máximo 31). Datas ilegíveis devolvem []. */
export function datasDoFestival(inicio, fim) {
  const [a1, m1, d1] = partes(inicio)
  const [a2, m2, d2] = partes(fim)
  if (![a1, m1, d1, a2, m2, d2].every(Number.isFinite) || !a1 || !a2) return []
  const out = []
  const fimMs = Date.UTC(a2, m2 - 1, d2)
  for (let t = Date.UTC(a1, m1 - 1, d1); t <= fimMs && out.length < 31; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10))
  return out
}

/** 'Qui 5/11'. */
export function rotuloDia(data) {
  const [, m, d] = partes(data)
  return NOMES_CURTOS[diaDaSemana(data)] + ' ' + d + '/' + m
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** 'de 5 a 15 de novembro' · 'de 30 de outubro a 2 de novembro' · 'em 5 de novembro' (um dia só) · '' sem datas. */
export function periodoDoFestivalTexto(datas) {
  const l = datas || []
  if (!l.length) return ''
  const [, m1, d1] = partes(l[0])
  const [, m2, d2] = partes(l[l.length - 1])
  if (l.length === 1) return 'em ' + d1 + ' de ' + MESES[m1 - 1]
  return m1 === m2 ? 'de ' + d1 + ' a ' + d2 + ' de ' + MESES[m2 - 1] : 'de ' + d1 + ' de ' + MESES[m1 - 1] + ' a ' + d2 + ' de ' + MESES[m2 - 1]
}

/** Qual dos grupos (semana · sab · dom) a data pertence. */
export const grupoDaData = (data) => { const g = GRUPOS.find((x) => x.dias.includes(diaDaSemana(data))); return g ? g.chave : '' } // data ilegível: grupo nenhum, nunca erro

// ── Do banco para a tela e de volta ──────────────────────────────────────────────────────────────

/**
 * Linhas do banco → um item por dia do festival. Sem NENHUMA linha = nada respondido ainda (todos `null`); com linhas, o dia
 * sem linha é "não abre" (`[]`). Linhas fora das datas dadas são ignoradas.
 */
export function diasDeLinhas(linhas, datas) {
  const lista = Array.isArray(linhas) ? linhas : []
  if (!lista.length) return (datas || []).map((data) => ({ data, periodos: null }))
  return (datas || []).map((data) => ({
    data,
    periodos: lista
      .filter((l) => l && l.data === data)
      .map((l) => [normalizarHora(l.abre), normalizarHora(l.fecha)])
      .filter((p) => p[0] && p[1])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
  }))
}

/** O que se grava: um objeto por período, só dos dias que abrem, em ordem. Dia sem resposta (`null`) não entra. */
export function linhasDeDias(dias) {
  const out = []
  for (const d of dias || []) {
    if (!Array.isArray(d.periodos)) continue
    for (const p of [...d.periodos].sort((a, b) => (a[0] < b[0] ? -1 : 1))) out.push({ data: d.data, abre: normalizarHora(p[0]), fecha: normalizarHora(p[1]) })
  }
  return out.sort((a, b) => (a.data === b.data ? (a.abre < b.abre ? -1 : 1) : a.data < b.data ? -1 : 1))
}

/**
 * As linhas na forma que se compara: só {data, abre, fecha}, horas 'HH:MM', ordenadas. O jsonb do banco volta com as chaves
 * em outra ordem e com 'HH:MM:SS' vez ou outra — comparar texto cru diria "mudou" quando nada mudou.
 */
export function linhasCanonicas(linhas) {
  return (Array.isArray(linhas) ? linhas : [])
    .map((l) => ({ data: String((l && l.data) || ''), abre: normalizarHora(l && l.abre), fecha: normalizarHora(l && l.fecha) }))
    .filter((l) => l.data && l.abre && l.fecha)
    .sort((a, b) => (a.data === b.data ? (a.abre < b.abre ? -1 : a.abre > b.abre ? 1 : 0) : a.data < b.data ? -1 : 1))
}

/** Duas listas de linhas dizem o mesmo horário? */
export const mesmasLinhas = (a, b) => IGUAL(linhasCanonicas(a), linhasCanonicas(b))

// ── Validação ────────────────────────────────────────────────────────────────────────────────────

export const periodoValido = (p) =>
  Array.isArray(p) && HORAS_ABRE.includes(normalizarHora(p[0])) && HORAS_FECHA.includes(normalizarHora(p[1])) && normalizarHora(p[1]) > normalizarHora(p[0])

/** Um dia está respondido: "não abre" (`[]`) ou 1–2 períodos válidos, em ordem e sem se sobrepor. `null` não está. */
export function diaCompleto(periodos) {
  if (!Array.isArray(periodos)) return false
  if (!periodos.length) return true
  if (periodos.length > MAX_PERIODOS_POR_DIA || !periodos.every(periodoValido)) return false
  const ord = [...periodos].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  return ord.every((p, i) => i === 0 || normalizarHora(p[0]) >= normalizarHora(ord[i - 1][1]))
}

/** Pelo menos um dia abre e todos estão respondidos — o que a casa precisa para ser publicada. */
export function horarioCompleto(dias) {
  return Array.isArray(dias) && dias.length > 0 && dias.every((d) => diaCompleto(d.periodos)) && dias.some((d) => d.periodos.length > 0)
}

/** Datas ainda sem resposta válida. */
export const diasIncompletos = (dias) => (dias || []).filter((d) => !diaCompleto(d.periodos)).map((d) => d.data)

// ── Modos ────────────────────────────────────────────────────────────────────────────────────────

const chaveDia = (periodos) => (periodos === null || periodos === undefined ? 'null' : JSON.stringify([...periodos].sort((a, b) => (a[0] < b[0] ? -1 : 1))))

/**
 * Como os dias se arrumam: 'todos' (todos iguais) · 'semana' (iguais dentro de segunda a sexta, de sábado e de domingo) ·
 * 'dias' (cada dia é de um jeito) · null (nada respondido).
 */
export function modoDeDias(dias) {
  const lista = dias || []
  if (!lista.length || lista.every((d) => d.periodos === null)) return null
  // "Sem resposta" conta como um valor como outro: segunda a sexta respondidas com sábado e domingo ainda em branco é "por semana"
  // (senão a tela saltaria para dia a dia assim que o primeiro grupo fosse respondido).
  const chaves = lista.map((d) => chaveDia(d.periodos))
  if (chaves.every((c) => c === chaves[0])) return 'todos'
  const porGrupo = {}
  for (const d of lista) {
    const g = grupoDaData(d.data)
    if (porGrupo[g] === undefined) porGrupo[g] = chaveDia(d.periodos)
    else if (porGrupo[g] !== chaveDia(d.periodos)) return 'dias'
  }
  return 'semana'
}

/**
 * O arranjo que a tela desenha agora: o que a pessoa escolheu (`modo`), salvo se os dias já não cabem nele (veio de fora um horário
 * diferente). Com tudo em branco vale a escolha, e dias sem resposta não obrigam a trocar de arranjo (ver modoDeDias).
 */
export function modoQueVale(modo, dias) {
  const real = modoDeDias(dias)
  if (!modo || real === null) return modo || real
  if (modo === 'dias') return 'dias'
  if (modo === 'semana') return real === 'dias' ? 'dias' : 'semana'
  return real === 'todos' ? 'todos' : real
}

/** Dá para voltar ao arranjo "Segunda a sexta · Sábado · Domingo" sem perder nada. */
export const podeAgrupar = (dias) => ['todos', 'semana'].includes(modoDeDias(dias))

/** Põe o mesmo horário em todos os dias do grupo ('todos' · 'semana' · 'sab' · 'dom') ou numa data só ('AAAA-MM-DD'). */
export function aplicar(dias, alvo, periodos) {
  const copia = periodos === null ? null : periodos.map((p) => [p[0], p[1]])
  return (dias || []).map((d) => {
    const vale = alvo === 'todos' || alvo === d.data || grupoDaData(d.data) === alvo
    return vale ? { data: d.data, periodos: copia === null ? null : copia.map((p) => [p[0], p[1]]) } : d
  })
}

/** Ao escolher "Igual todos os dias", o primeiro dia respondido vale para todos. Os outros modos mantêm os valores. */
export function trocarModo(dias, novo) {
  if (novo !== 'todos') return dias
  const base = (dias || []).find((d) => d.periodos !== null)
  return aplicar(dias, 'todos', base ? base.periodos : null)
}

/** Linhas da tela para cada modo: o que o seletor desenha (um item por linha editável). */
export function linhasDoModo(dias, modo) {
  if (modo === 'todos') return [{ chave: 'todos', rotulo: 'Todos os dias', alvo: 'todos', periodos: (dias[0] || {}).periodos }]
  if (modo === 'semana') {
    return GRUPOS.filter((g) => dias.some((d) => grupoDaData(d.data) === g.chave)).map((g) => ({
      chave: g.chave, rotulo: g.rotulo, alvo: g.chave, periodos: dias.find((d) => grupoDaData(d.data) === g.chave).periodos,
    }))
  }
  if (modo === 'dias') return dias.map((d) => ({ chave: d.data, rotulo: rotuloDia(d.data), alvo: d.data, periodos: d.periodos }))
  return []
}

/** Rótulos do que falta responder, no arranjo em uso. */
export function rotulosFaltando(dias, modo) {
  return linhasDoModo(dias, modo).filter((l) => !diaCompleto(l.periodos)).map((l) => l.rotulo)
}

/**
 * O que a tela precisa saber do rascunho: dá para gravar (`completo`)? o que falta (`faltando`, nos nomes do arranjo em uso)?
 * `semDiaAberto`: tudo respondido, mas nenhum dia abre — também não é resposta.
 */
export function estadoDoHorario(dias, modo) {
  const completo = horarioCompleto(dias)
  return {
    completo,
    faltando: completo ? [] : rotulosFaltando(dias, modo),
    semDiaAberto: !completo && (dias || []).length > 0 && dias.every((d) => diaCompleto(d.periodos)),
  }
}

// ── O que o seletor faz com os períodos de UMA linha (puras: a tela só liga os botões a elas) ────────

/** "Abre": se ainda não havia período, entra um sem horas (incompleto até escolher início e fim). */
export const abrirDia = (periodos) => (Array.isArray(periodos) && periodos.length ? periodos : [['', '']])

/** "Não abre". */
export const fecharDia = () => []

/** "+ Intervalo" só cabe com UM período já completo (no máximo dois por dia) e que não feche à meia-noite (depois dela não há hora para abrir de novo). */
export const podeAcrescentarIntervalo = (periodos) =>
  Array.isArray(periodos) && periodos.length === 1 && periodoValido(periodos[0]) && normalizarHora(periodos[0][1]) !== '24:00'

export const acrescentarIntervalo = (periodos) => (podeAcrescentarIntervalo(periodos) ? [...periodos, ['', '']] : periodos)

export const tirarIntervalo = (periodos) => (Array.isArray(periodos) ? periodos.slice(0, 1) : periodos)

/**
 * Troca uma hora: `indice` = qual período, `qual` = 0 (abre) ou 1 (fecha). Se o fim deixou de ser depois do início, o fim volta a
 * "sem escolha"; se o 1º período passou a invadir o 2º, o 2º volta a "sem escolha".
 */
export function trocarHora(periodos, indice, qual, hora) {
  const novo = (periodos || []).map((p) => [p[0], p[1]])
  if (!novo[indice]) return novo
  novo[indice][qual] = hora
  const [ini, fim] = novo[indice].map(normalizarHora)
  if (qual === 0 && fim && ini && fim <= ini) novo[indice][1] = ''
  const prox = novo[indice + 1]
  const fimAtual = normalizarHora(novo[indice][1])
  if (prox && fimAtual && normalizarHora(prox[0]) && normalizarHora(prox[0]) < fimAtual) novo[indice + 1] = ['', '']
  return novo
}

/** Horas que se pode escolher em "abre" do período `indice`: a partir do fim do período anterior. */
export function opcoesAbre(periodos, indice) {
  const ant = indice > 0 && periodos && periodos[indice - 1] ? normalizarHora(periodos[indice - 1][1]) : ''
  return HORAS_ABRE.filter((h) => !ant || h >= ant)
}

/** Horas que se pode escolher em "fecha": depois do início do próprio período. */
export function opcoesFecha(periodos, indice) {
  const ini = normalizarHora(((periodos || [])[indice] || [])[0])
  return HORAS_FECHA.filter((h) => !ini || h > ini)
}

// ── Texto ────────────────────────────────────────────────────────────────────────────────────────

const textoDoDia = (periodos) => (periodos && periodos.length ? periodosTexto(periodos) : 'não abre')

function rotuloIntervalo(a, b) {
  if (a === b) return rotuloDia(a)
  const [, ma] = partes(a)
  const [, mb] = partes(b)
  const curto = (data) => NOMES_CURTOS[diaDaSemana(data)] + ' ' + partes(data)[2]
  return ma === mb ? curto(a) + ' a ' + curto(b) + '/' + mb : rotuloDia(a) + ' a ' + rotuloDia(b)
}

/**
 * O horário em frases curtas, uma por arranjo:
 *   todos iguais .... ['Todos os dias, das 10h às 22h']
 *   por semana ...... ['Segunda a sexta, das 10h às 22h', 'Sábado e domingo, das 12h às 20h']
 *   dia a dia ....... ['Qui 5 a Sex 6/11: das 15h às 23h', 'Sáb 7/11: não abre', …] (só dias seguidos com o mesmo horário se juntam)
 * Dia sem resposta (`null`) não entra; sem nenhum dia respondido devolve [].
 */
export function resumoDias(dias) {
  const lista = (dias || []).filter((d) => d.periodos !== null)
  if (!lista.length) return []
  const modo = modoDeDias(dias)
  if (modo === 'todos') return ['Todos os dias, ' + textoDoDia(lista[0].periodos)]
  if (modo === 'semana') {
    const grupos = linhasDoModo(dias, 'semana').filter((g) => g.periodos !== null)   // grupo ainda sem resposta não entra
    const juntos = []
    for (const g of grupos) {
      const ult = juntos[juntos.length - 1]
      if (ult && chaveDia(ult.periodos) === chaveDia(g.periodos)) ult.chaves.push(g.chave)
      else juntos.push({ chaves: [g.chave], periodos: g.periodos })
    }
    const nome = { semana: 'Segunda a sexta', 'semana,sab': 'Segunda a sábado', sab: 'Sábado', 'sab,dom': 'Sábado e domingo', dom: 'Domingo' }
    return juntos.map((j) => (nome[j.chaves.join(',')] || j.chaves.join(' e ')) + ', ' + textoDoDia(j.periodos))
  }
  return resumoDiaADia(dias)
}

/**
 * Só os dias que `dias` cita, um a um — nunca "todos os dias" nem "por semana": ao escrever do primeiro ao último dia que as
 * linhas citam (sem as datas do festival), o que está fora dessas pontas não foi dito e não se afirma. Dias seguidos com o mesmo
 * horário se juntam: ['Qui 5 a Sex 6/11: das 15h às 23h', 'Sáb 7/11: não abre', …]. Dia sem resposta (`null`) não entra.
 */
export function resumoDiaADia(dias) {
  const runs = []
  for (const d of (dias || []).filter((x) => x.periodos !== null)) {
    const ult = runs[runs.length - 1]
    const seguido = ult && IGUAL(ult.chave, chaveDia(d.periodos)) && diasEntre(ult.fim, d.data) === 1
    if (seguido) ult.fim = d.data
    else runs.push({ ini: d.data, fim: d.data, chave: chaveDia(d.periodos), periodos: d.periodos })
  }
  return runs.map((r) => rotuloIntervalo(r.ini, r.fim) + ': ' + textoDoDia(r.periodos))
}

function diasEntre(a, b) {
  const [a1, m1, d1] = partes(a)
  const [a2, m2, d2] = partes(b)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000)
}

/** Resumo numa linha só (telas de leitura). */
export const textoResumo = (dias, sep = ' · ') => resumoDias(dias).join(sep)

/**
 * O horário gravado em frases — a ÚNICA função que transforma linhas {data, abre, fecha} em texto (painel, site e prévia).
 * `datas` = os dias do festival, da edição: com elas e pelo menos uma linha dentro, o resumo completo (todos os dias · por semana ·
 * dia a dia; dia sem linha = não abre). Sem elas (o Social media não lê a edição), ou com linhas que não cabem nelas, só se sabe do
 * primeiro ao último dia que tem linha: aí é dia a dia, sem afirmar o resto. Sem linhas: [] (ainda não respondido).
 */
export function frasesDeLinhas(linhas, datas) {
  const can = linhasCanonicas(linhas)
  if (!can.length) return []
  const dias = diasDeLinhas(can, datas || [])
  if (dias.some((d) => Array.isArray(d.periodos) && d.periodos.length)) return resumoDias(dias)
  return resumoDiaADia(diasDeLinhas(can, datasDoFestival(can[0].data, can[can.length - 1].data)))
}

/** Do que está gravado direto para o texto: 'Não informado' quando não há nada. */
export function resumoDeLinhas(linhas, datas, vazio = 'Não informado') {
  const t = frasesDeLinhas(linhas, datas).join(' · ')
  return t || vazio
}
