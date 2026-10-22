/*
 * Checklist por postagem (21/10/2026) — lógica pura. O checklist AVISA, não trava: é a conferência da equipe antes de enviar
 * (arte, legenda, marcas, data…), não conteúdo aprovado. O banco decide (texto, limite de itens, postagem fechada — migration
 * 20261101_social_checklist.sql); aqui a tela antecipa e escreve os textos.
 */
import { FORMATOS, FECHADAS } from './redes.js'

export const LIMITE_TEXTO = 80
export const LIMITE_ITENS = 30

const n = (v) => Number(v || 0)

/** { total, feitos, abertos } — `abertos` são os itens ainda não marcados, na ordem em que vieram. */
export function contagem(itens) {
  const l = Array.isArray(itens) ? itens : []
  const abertos = l.filter((i) => !i.feito)
  return { total: l.length, feitos: l.length - abertos.length, abertos }
}

/** "3/5"; sem itens, vazio. */
export function rotuloContagem(itens) {
  const c = contagem(itens)
  return c.total ? c.feitos + '/' + c.total : ''
}

/** O que o cartão mostra: as contagens que o banco devolve em cada postagem, só em postagem aberta e que tenha checklist. */
export function contagemDoCartao(post) {
  if (!post || FECHADAS.includes(post.situacao)) return null
  const total = n(post.checklist_total)
  if (!total) return null
  const feitos = n(post.checklist_feitos)
  return { total, feitos, texto: feitos + '/' + total, completo: feitos >= total }
}

const MAX_NOMEADOS = 4
/** Pergunta de "Enviar para aprovação" com itens abertos; null quando não há nada aberto (não pergunta). */
export function textoConfirmacaoEnvio(itens) {
  const { abertos } = contagem(itens)
  if (!abertos.length) return null
  const nomes = abertos.slice(0, MAX_NOMEADOS).map((i) => i.texto)
  const resto = abertos.length - nomes.length
  const lista = nomes.join(', ') + (resto > 0 ? ' e mais ' + resto : '')
  const quantos = abertos.length === 1 ? 'Falta 1 item' : 'Faltam ' + abertos.length + ' itens'
  return quantos + ' do checklist: ' + lista + '. Enviar para aprovação mesmo assim?'
}

/** { ok, erro, texto } — texto aparado, 1 a 80 caracteres, e a lista não pode passar de 30 itens. */
export function validarItem(texto, itens = []) {
  const t = String(texto || '').trim()
  if (!t) return { ok: false, erro: 'Escreva o item.', texto: t }
  if (t.length > LIMITE_TEXTO) return { ok: false, erro: 'O item pode ter no máximo ' + LIMITE_TEXTO + ' caracteres.', texto: t }
  if ((itens || []).length >= LIMITE_ITENS) return { ok: false, erro: 'O checklist já tem ' + LIMITE_ITENS + ' itens.', texto: t }
  return { ok: true, erro: '', texto: t }
}

/** "Micka · hoje 12h00" para item marcado; vazio para item aberto. `formatar` escreve o instante (R.quandoTexto na tela). */
export function rotuloFeito(item, formatar) {
  if (!item || !item.feito) return ''
  const quando = item.feito_em ? formatar(item.feito_em) : ''
  return [item.feito_por_rotulo, quando].filter(Boolean).join(' · ')
}

/** Modelos por formato (um grupo para cada formato do painel, mesmo vazio), na ordem; item removido não aparece. */
export function agruparModelos(lista) {
  const g = Object.fromEntries(FORMATOS.map((f) => [f.chave, []]))
  for (const m of lista || []) if (!m.removido_em && g[m.formato]) g[m.formato].push(m)
  for (const k of Object.keys(g)) g[k].sort((a, b) => a.ordem - b.ordem)
  return g
}

/** Linhas do editor de modelo → o que `redes_checklist_modelo_salvar` recebe (a ordem é a da lista). */
export const modelosParaSalvar = (linhas) => (linhas || []).map((l) => ({ texto: String(l.texto || '').trim(), ativo: l.ativo !== false }))

const ERROS = {
  texto_vazio: 'Escreva o item.',
  texto_longo: 'O item pode ter no máximo ' + LIMITE_TEXTO + ' caracteres.',
  checklist_cheio: 'O checklist chegou ao limite de itens.',
  item_nao_encontrado: 'Esse item não existe mais. Atualize a ficha.',
  formato_invalido: 'Formato desconhecido.',
  post_fechado: 'Esta publicação já foi publicada ou cancelada: o checklist não muda mais.',
}
/** Mensagem do banco (traz o código) → frase; desconhecido → null (quem chama cai no tradutor geral). */
export function traduzirErroChecklist(msg) {
  const m = String(msg || '')
  for (const [codigo, frase] of Object.entries(ERROS)) if (m.includes(codigo)) return frase
  return null
}
