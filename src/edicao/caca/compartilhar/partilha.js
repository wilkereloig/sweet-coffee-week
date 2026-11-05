/*
 * Partilhar pelo navegador (só navegador): Web Share com arquivo quando o aparelho aceita, link/texto quando não, e baixar/copiar
 * como saídas. Nunca lança: devolve 'compartilhado' | 'cancelado' | 'copiado' | 'falhou'. Cancelar a folha de compartilhar não é erro.
 */
const nav = () => globalThis.navigator

/** Arquivo pode ir no Web Share deste aparelho? */
export function aceitaArquivo (arquivo) {
  try { return !!nav()?.canShare?.({ files: [arquivo] }) } catch { return false }
}

export async function compartilhar ({ titulo, texto, url, arquivo }) {
  const n = nav()
  if (!n?.share) return 'falhou'
  try {
    if (arquivo && aceitaArquivo(arquivo)) await n.share({ title: titulo, text: texto, files: [arquivo] })
    else await n.share({ title: titulo, url }) // o texto já leva o link; mandar os dois duplicaria o endereço
    return 'compartilhado'
  } catch (e) { return e?.name === 'AbortError' ? 'cancelado' : 'falhou' }
}

export async function copiar (texto) {
  try { await nav().clipboard.writeText(texto); return 'copiado' } catch { return 'falhou' }
}

/** Baixa um Blob como arquivo (âncora temporária com `download`). */
export function baixar (blob, nome) {
  const doc = globalThis.document
  const url = URL.createObjectURL(blob)
  const a = doc.createElement('a')
  a.href = url; a.download = nome; a.rel = 'noopener'
  doc.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
