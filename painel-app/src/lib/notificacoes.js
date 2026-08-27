/*
 * notificacoesOrg — porta fiel de public/painel/index.html (~2846-2880).
 * Derivadas, nunca escritas à mão: cada linha só existe se o dado que a
 * sustenta existir. Na versão estática lê globais soltas (dados,
 * solicitacoes, sessoes, participantes); aqui é um único parâmetro com
 * default vazio em cada campo — Fase 1 só tem `dados` (Respostas); as
 * outras três chegam quando as vistas que as carregam existirem.
 */
import { dataHoraCurta } from './painelFormat.js'

export function notificacoesOrg({ dados = {}, solicitacoes = [], sessoes = [], participantes = [] } = {}) {
  const fila = []

  const candidaturasNovas = (dados.quero_participar || []).filter((r) => r.status === 'novo').length
  if (candidaturasNovas) {
    fila.push({
      tipo: 'info',
      vista: 'respostas',
      texto: candidaturasNovas + (candidaturasNovas === 1 ? ' candidatura nova' : ' candidaturas novas') + ' em Quero participar.',
    })
  }

  const outrasNovas = ['apoiar', 'contato'].reduce((n, o) => n + (dados[o] || []).filter((r) => r.status === 'novo').length, 0)
  if (outrasNovas) {
    fila.push({
      tipo: 'info',
      vista: 'respostas',
      texto: outrasNovas + (outrasNovas === 1 ? ' resposta nova' : ' respostas novas') + ' sem triagem, fora de Quero participar.',
    })
  }

  solicitacoes.filter((s) => s.publicada_em && Number(s.pendentes || 0) > 0).forEach((s) => {
    const n = Number(s.pendentes)
    fila.push({
      tipo: 'alerta',
      vista: 'producao',
      texto: '"' + s.titulo + '": ' + n + (n === 1 ? ' marca ainda não respondeu.' : ' marcas ainda não responderam.'),
    })
  })

  const vagasAbertas = sessoes.filter((s) => s.status === 'aberto').length
  if (vagasAbertas) {
    fila.push({
      tipo: 'agenda',
      vista: 'producao',
      texto: vagasAbertas + (vagasAbertas === 1 ? ' vaga aberta' : ' vagas abertas') + ' na agenda de fotos, aguardando escolha da marca.',
    })
  }

  // Só as PRÓXIMAS: sessão que já passou não é aviso, é histórico.
  const emSeteDias = Date.now() + 7 * 864e5
  sessoes
    .filter((s) => s.status === 'agendada' && new Date(s.data_hora).getTime() <= emSeteDias && new Date(s.data_hora).getTime() >= Date.now())
    .forEach((s) => {
      fila.push({
        tipo: 'agenda',
        vista: 'producao',
        texto: 'Sessão de fotos de ' + (s.nome_marca || 'uma marca') + ': ' + dataHoraCurta(s.data_hora) + '.',
      })
    })

  const completas = participantes.filter((p) => p.status_cadastro === 'cadastro_completo').length
  if (completas) {
    fila.push({
      tipo: 'ok',
      vista: 'participantes',
      texto: completas + (completas === 1 ? ' marca com cadastro completo, pronta para produção.' : ' marcas com cadastro completo, prontas para produção.'),
    })
  }

  return fila
}
