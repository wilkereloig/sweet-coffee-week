/*
 * Funções puras de formatação — porta fiel de public/painel/index.html
 * (campo ~2220, acessoDe ~2353, seloAcesso ~2358, preco ~2523,
 * prazoSelo ~2531, dataHoraCurta ~2772).
 *
 * ⚠️ Sem escapar(). A versão estática monta HTML por string e precisa
 * escapar; aqui não há innerHTML — prazoSelo/seloAcesso devolvem um
 * descritor de dados ({ tom, texto } / { status, rotulo }), e é o
 * componente que vira JSX (<span className="og-selo" data-acesso={tom}>).
 */
import { dataCurta, campo } from './respostas.js'

export { campo }

export function dataHoraCurta(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function preco(v) {
  return v == null ? '' : 'R$ ' + Number(v).toFixed(2).replace('.', ',')
}

// Dias de CALENDÁRIO entre hoje e a data (local). O prazo é gravado às 23h59
// do dia marcado: contar por milissegundos dizia "falta 1 dia" no próprio dia
// do vencimento. O Math.round absorve um dia de 23h ou 25h, se voltar o
// horário de verão.
export function diasCalendario(iso, agora = Date.now()) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const meiaNoite = (t) => { const x = new Date(t); return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() }
  return Math.round((meiaNoite(d) - meiaNoite(agora)) / 864e5)
}

export function prazoSelo(iso, agora = Date.now()) {
  const n = diasCalendario(iso, agora)
  if (n === null) return null
  if (n < 0) return { tom: 'aguardando_cadastro', texto: 'venceu ' + dataCurta(iso) }
  if (n === 0) return { tom: 'aguardando_cadastro', texto: 'vence hoje' }
  if (n <= 7) return { tom: 'em_preenchimento', texto: 'faltam ' + n + ' dias' }
  return { tom: null, texto: 'até ' + dataCurta(iso) }
}

// A ponte entre candidatura e conta é `participantes.origem_id`. Só o
// /quero-participar tem essa ponte hoje.
export function acessoDe(origem, reg, participantes) {
  if (origem !== 'quero_participar') return null
  return participantes.find((p) => p.origem_id === reg.id) || null
}

export function seloAcesso(origem, reg, participantes, rotuloStatus = {}) {
  const p = acessoDe(origem, reg, participantes)
  if (!p) return null
  return { status: p.status_cadastro, rotulo: rotuloStatus[p.status_cadastro] || p.status_cadastro }
}
