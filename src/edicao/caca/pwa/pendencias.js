/*
 * "Tem trabalho pela metade?" — o que impede o app da Caça de recarregar sozinho para trocar de versão (06/11/2026).
 * Três sinais, todos locais; nada aqui lê o que a pessoa digitou, só se há algo digitado:
 *   · envio em curso   — `comEnvio(f)` embrulha a chamada ao banco (rota/carimbo.js › chamar) e o pedido de localização;
 *   · campo preenchido — qualquer campo de texto que recebeu digitação e ainda está na tela com conteúdo;
 *   · campo com foco   — a pessoa está com o cursor num campo de texto.
 * Recarregar com um desses é perder o apelido, o e-mail ou a avaliação que ela está escrevendo; o atualizador espera.
 */
let emCurso = 0

/** Embrulha uma operação assíncrona: enquanto ela não termina, `pendencias()` diz que há um envio. */
export async function comEnvio (operacao) {
  emCurso += 1
  try { return await operacao() } finally { emCurso -= 1 }
}

const TIPOS_DE_TEXTO = /^(text|search|email|tel|url|password|number|date|time|datetime-local|month|week|)$/i
const digitados = new Set() // campos que receberam digitação; os que saíram da tela são podados a cada consulta

const ehCampoDeTexto = (el) => !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && TIPOS_DE_TEXTO.test(el.getAttribute('type') || '')))

/** Começa a observar a digitação. Devolve a função que para. */
export function observarDigitacao (doc = globalThis.document) {
  if (!doc?.addEventListener) return () => {}
  const ao = (e) => { if (ehCampoDeTexto(e.target)) digitados.add(e.target) }
  doc.addEventListener('input', ao, true)
  return () => doc.removeEventListener('input', ao, true)
}

/** Lista do que impede a troca de versão agora: [] = é seguro. Cada item: { tipo: 'envio' | 'campo' | 'foco' }. */
export function pendencias (doc = globalThis.document) {
  const lista = []
  if (emCurso > 0) lista.push({ tipo: 'envio' })
  let comConteudo = false
  for (const el of [...digitados]) {
    if (!el.isConnected) { digitados.delete(el); continue }
    if (String(el.value || '').trim() !== '') comConteudo = true
  }
  if (comConteudo) lista.push({ tipo: 'campo' })
  if (ehCampoDeTexto(doc?.activeElement)) lista.push({ tipo: 'foco' })
  return lista
}

/** Só para testes: zera o estado do módulo. */
export function _zerar () { emCurso = 0; digitados.clear() }
