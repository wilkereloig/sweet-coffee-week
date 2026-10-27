import { tempoRelativo } from './central.js'

/*
 * Combos esperando a decisão da curadoria (27/10/2026, pedido do Wilker: "no card aparece exatamente o que eu preciso
 * saber, e não achei onde aprovo"). Banco: `get_combos_em_analise` (supabase/migrations/20261117_combos_em_analise.sql,
 * só leitura, `curadoria.decidir`); a decisão é `revisar_combo`, a mesma da ficha › Operação › Combo.
 * Aqui só a lógica pura: que combos entram no cartão, a frase de cada um e a regra da nota de ajuste.
 */

export const NOTA_MAX = 1000

/** Os combos que o cartão conta: da edição aberta e de marcas que o cartão conta (`marcas` = as que a Visão geral conta). */
export function combosDoCartao(combos, marcas) {
  const ids = new Set((marcas || []).map((p) => p.participacao_id).filter(Boolean))
  return (combos || []).filter((c) => ids.has(c.participacao_id))
}

/** O cartão só mostra o combo quando leu TODOS os que ele conta; senão, volta ao texto simples (nunca meia lista). */
export const cobreAsMarcas = (combos, marcas) => combos.length > 0 && combos.length === (marcas || []).length

const comAspas = (t) => '“' + t + '”'

/** "Jolie Café Pâtisserie · “Era uma vez na Jolie” · tema Cinderela · enviado há 2 h" */
export function linhaDoCombo(c, agora = Date.now()) {
  const partes = [c.nome_marca]
  partes.push(c.combo_nome ? comAspas(c.combo_nome) : 'combo sem nome')
  if (c.tema_combo) partes.push('tema ' + c.tema_combo)
  const quando = tempoRelativo(c.desde, agora)
  if (quando) partes.push('enviado ' + quando)
  return partes.join(' · ')
}

/** O detalhe do cartão: um combo = a linha inteira; vários = marca e combo dos dois mais antigos e "mais N". */
export function detalheDosCombos(combos, agora = Date.now()) {
  if (!combos.length) return ''
  if (combos.length === 1) return linhaDoCombo(combos[0], agora)
  const dois = combos.slice(0, 2).map((c) => c.nome_marca + (c.combo_nome ? ' · ' + comAspas(c.combo_nome) : ''))
  const resto = combos.length - dois.length
  return dois.join(' | ') + (resto > 0 ? ' | mais ' + resto : '')
}

/** Custo da marca: vazio = não informado; 0 = sem custo (a mesma leitura da ficha). */
export function textoCusto(valor) {
  if (valor === null || valor === undefined || valor === '') return 'não informado'
  const n = Number(valor)
  if (!Number.isFinite(n)) return 'não informado'
  return n === 0 ? 'sem custo' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Pedir ajuste exige dizer o quê (o banco recusa nota vazia); aprovar não pede nota. */
export const notaValida = (nota) => String(nota || '').trim().length > 0 && String(nota).length <= NOTA_MAX

/** Texto que o participante recebe ao ser aprovado quando a nota vem vazia está no banco; aqui só o erro, em português. */
export function erroDaDecisao(msg) {
  const m = String(msg || '')
  if (/nota_obrigatoria/.test(m)) return 'Escreva o que a marca precisa ajustar.'
  if (/participacao_nao_encontrada/.test(m)) return 'Esse combo não existe mais. Feche e abra de novo.'
  if (/status_invalido/.test(m)) return 'Decisão inválida.'
  return null
}
