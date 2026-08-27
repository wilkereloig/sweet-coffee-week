/*
 * Lógica pura da vista Produção — porta fiel de public/painel/index.html
 * (BLOCOS ~1836, ROTULO_SESSAO ~1842, montarAgenda ~2633, nomeSeguro ~3683,
 * isoDoCampo ~3439). Sem DOM: monta a agenda como DADOS, não como innerHTML
 * — quem decide o markup é o componente.
 */
export const BLOCOS = {
  livre: 'Recado geral', estabelecimento: 'Dados do estabelecimento', combo: 'O combo',
  item_doce: 'O doce', item_salgado: 'O salgado', item_bebida: 'A bebida',
  arquivo: 'Um arquivo', fotos: 'As fotos',
}

// ROTULO_SESSAO já mora em lib/participantes.js (a ficha da marca também
// mostra sessão de fotos) — reexportar em vez de duplicar (CLAUDE.md §5.2).
export { ROTULO_SESSAO } from './participantes.js'

export const HORARIOS_AGENDA = ['09:00', '11:00', '14:00', '16:00']

// 4 dias a partir de `hoje`, 4 horários cada. Vaga casada por PROXIMIDADE de
// horário (60s), não igualdade de string: o banco guarda timestamptz e o
// campo pode ter chegado com fuso escrito de outro jeito.
export function montarAgendaGrade(sessoes, hoje = new Date()) {
  const base = new Date(hoje)
  base.setHours(0, 0, 0, 0)
  const dias = []
  for (let d = 0; d < 4; d++) {
    const dia = new Date(base.getTime() + d * 864e5)
    const slots = HORARIOS_AGENDA.map((hhmm) => {
      const [h, m] = hhmm.split(':').map(Number)
      const quando = new Date(dia)
      quando.setHours(h, m, 0, 0)
      const s = sessoes.find((x) =>
        (x.status === 'aberto' || x.status === 'agendada') &&
        Math.abs(new Date(x.data_hora).getTime() - quando.getTime()) < 60000)
      let estado = 'fechado', quem = ''
      if (s && s.status === 'aberto') { estado = 'aberto'; quem = 'vaga aberta' }
      else if (s && s.status === 'agendada') { estado = 'reservado'; quem = s.nome_marca || 'reservada' }
      return { hhmm, quandoIso: quando.toISOString(), estado, quem, sessaoId: s ? s.id : null }
    })
    dias.push({
      dataLabel: dia.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      slots,
    })
  }
  return dias
}

// O nome em disco é normalizado aqui e conferido DE NOVO na Edge Function —
// o navegador não é fonte de verdade sobre o que vai ser gravado.
export function nomeSeguro(nome) {
  return String(nome || 'arquivo')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[.-]+/, '')
    .slice(0, 100) || 'arquivo'
}

// `datetime-local` devolve "2027-03-04T14:30" SEM fuso; `new Date()` sobre
// essa string lê como hora LOCAL, que é o que a pessoa digitou.
export function isoDoCampo(valor) {
  if (!valor) return null
  const d = new Date(valor)
  return isNaN(d.getTime()) ? null : d.toISOString()
}
