/*
 * Social media › Participantes (31/10/2026, pedido do Wilker): o texto REVISADO e a marcação "Novo / Alterado" de cada campo.
 * Função pura; testada em tests/painel-app-combos.test.mjs.
 *
 * Entrada: a linha de `editorial_combos` (migration 20261122), com
 *   revisoes   { <campo>: { original, revisado } }  — guardadas à parte (revisoes_texto); o cadastro não muda
 *   alteracoes { <campo>: { antes, removido, em } } — o que a MARCA mudou depois do "visto" de quem lê
 *
 * Campos: tema · instagram · para_viagem · combo.nome|descricao|condicoes · <tipo>.nome|descricao|ingredientes ·
 * <tipo>.alimentar · <tipo>.trocas · <tipo>.troca<k>.original|alternativa|como_solicitar · unidade:<id>.nome|endereco|
 * whatsapp|atendimento|horario. Revisões especiais: `opcao:<onde>:<n>` (opção escrita DENTRO de uma descrição: revisado =
 * JSON { item, texto }, original = a descrição inteira) e `ocultar:<tipo>.troca<k>` (troca repetida em outro item:
 * original = "original → alternativa").
 *
 * ⛔ Uma revisão só vale enquanto o ORIGINAL for o mesmo: a marca mudou o texto, a tela volta a mostrar o que ela escreveu
 * (e o campo aparece "Alterado"). Nada é inventado aqui: o texto revisado foi conferido contra o original na revisão.
 */
import { alimentarDoItem, linhaAlergenicos } from './combosTexto.js'
import { resumoDeLinhas } from './horarioFestival.js'

const plano = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim()
const itemDo = (d, tipo) => ((d && d.combo && d.combo.itens) || []).find((i) => i.tipo === tipo)
const textoDaTroca = (s) => plano(s.original) + ' → ' + plano(s.alternativa)

/** Valor atual de um campo (o que a marca escreveu). */
export function valorDoCampo(d, campo) {
  if (!d) return undefined
  if (campo === 'tema') return d.tema
  if (campo === 'instagram') return d.instagram
  if (campo === 'para_viagem') return d.para_viagem
  const [a, b] = campo.split(/\.(.+)/)
  if (a === 'combo') return (d.combo || {})[b]
  const item = itemDo(d, a)
  if (!item) return undefined
  const m = /^troca(\d+)\.(.+)$/.exec(b || '')
  if (m) { const s = (item.substituicoes || [])[Number(m[1])]; return s ? s[m[2]] : undefined }
  return item[b]
}

function definir(x, campo, valor) {
  if (campo === 'tema') { x.tema = valor; return }
  const [a, b] = campo.split(/\.(.+)/)
  if (a === 'combo') { x.combo = { ...(x.combo || {}), [b]: valor }; return }
  const item = itemDo(x, a)
  const m = /^troca(\d+)\.(.+)$/.exec(b || '')
  if (m) item.substituicoes[Number(m[1])][m[2]] = valor
  else item[b] = valor
}

const copiar = (d) => ({
  ...d,
  combo: d.combo ? { ...d.combo, itens: (d.combo.itens || []).map((i) => ({ ...i, substituicoes: (i.substituicoes || []).map((s) => ({ ...s })) })) } : d.combo,
})

/**
 * O participante com as revisões aplicadas. Devolve { d, revisados, opcoes, ocultas, caducas }:
 * `revisados` = campos com texto revisado na tela; `opcoes` = [{ item, onde, texto }] escritas dentro de uma descrição;
 * `ocultas` = trocas repetidas que não aparecem ("doce.troca0"); `caducas` = revisões cujo original mudou (ignoradas).
 */
export function revisar(d) {
  const x = copiar(d)
  const revisados = new Set(), ocultas = new Set(), opcoes = [], caducas = []
  for (const [campo, r] of Object.entries((d && d.revisoes) || {})) {
    if (!r) continue
    if (campo.startsWith('opcao:')) {
      const onde = campo.split(':')[1]
      const base = valorDoCampo(d, onde === 'combo' ? 'combo.descricao' : onde + '.descricao')
      let o = null
      try { o = JSON.parse(r.revisado) } catch { o = null }
      if (o && o.texto && plano(base) === plano(r.original)) opcoes.push({ item: o.item || onde, onde, texto: plano(o.texto) })
      else caducas.push(campo)
    } else if (campo.startsWith('ocultar:')) {
      const alvo = campo.slice('ocultar:'.length)
      const [tipo, troca] = alvo.split('.')
      const s = ((itemDo(d, tipo) || {}).substituicoes || [])[Number((troca || '').replace('troca', ''))]
      if (s && textoDaTroca(s) === plano(r.original)) ocultas.add(alvo)
      else caducas.push(campo)
    } else {
      const atual = valorDoCampo(d, campo)
      if (atual != null && plano(atual) === plano(r.original) && plano(r.revisado)) { definir(x, campo, plano(r.revisado)); revisados.add(campo) }
      else caducas.push(campo)
    }
  }
  return { d: x, revisados, opcoes, ocultas, caducas }
}

/** O participante pronto para texto, Word e cartão: revisões aplicadas + `_opcoes` e `_ocultas` (lidos por combosTexto). */
export function paraTexto(d) {
  const r = revisar(d)
  return { ...r.d, _opcoes: r.opcoes, _ocultas: [...r.ocultas], _revisados: [...r.revisados] }
}

/* ── Marcação "Novo / Alterado" ─────────────────────────────────────────────── */

export const ROTULO_MARCA = { novo: 'Novo', alterado: 'Alterado', removido: 'Apagado' }

/** { tipo: novo|alterado|removido, em, antes } ou null. */
export function marcaDoCampo(d, campo) {
  const a = d && d.alteracoes && d.alteracoes[campo]
  if (!a) return null
  const tipo = a.removido ? 'removido' : !plano(a.antes) ? 'novo' : 'alterado'
  return { tipo, em: a.em, antes: a.antes }
}

/** Marcações de vários campos (a primeira que existir), para uma linha que mostra mais de um campo. */
export function marcaDeCampos(d, campos) {
  const ms = campos.map((c) => marcaDoCampo(d, c)).filter(Boolean)
  if (!ms.length) return null
  ms.sort((a, b) => String(b.em).localeCompare(String(a.em)))
  return ms.length === 1 ? ms[0] : { ...ms[0], tipo: ms.some((m) => m.tipo !== 'novo') ? 'alterado' : 'novo', antes: null }
}

export const contarAlteracoes = (d) => Object.keys((d && d.alteracoes) || {}).length

/** O "antes" em português (os resumos de alergênicos, trocas e horário vêm do banco em JSON). */
export function textoDoAntes(campo, antes, datas = []) {
  if (antes == null || antes === '') return ''
  try {
    if (campo.endsWith('.alimentar')) {
      const m = JSON.parse(antes)
      const alimentar = Object.entries(m).map(([aspecto, v]) => {
        const [, estado, obs] = /^(\S+)(?: \((.*)\))?$/.exec(String(v)) || [null, String(v), null]
        return { aspecto, estado, observacao: obs || null }
      })
      return linhaAlergenicos(alimentarDoItem({ alimentar })).replace(/^Alergênicos: /, '')
    }
    if (campo.endsWith('.trocas')) return Object.values(JSON.parse(antes)).join('; ')
    if (campo.endsWith('.horario')) return resumoDeLinhas(JSON.parse(antes), datas, '')
  } catch { /* texto antigo fora do formato: sai como veio */ }
  if (campo === 'para_viagem') return antes === 'true' ? 'Sim' : antes === 'false' ? 'Não' : antes
  return antes
}

/** "31/10 às 21:40" (hora local de quem lê). */
export function quandoMudou(em) {
  const x = new Date(em)
  if (Number.isNaN(x.getTime())) return ''
  return x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + x.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
