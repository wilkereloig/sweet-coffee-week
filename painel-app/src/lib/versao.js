/*
 * Versão do painel = o arquivo de entrada com hash que o HTML carrega
 * (/assets/painel-XXXX.js). Muda a cada publicação; o sw.js não muda, então
 * ele não serve para dizer que há versão nova (02/10/2026: o app instalado
 * no celular ficava dias na versão antiga, sem aviso nenhum).
 */
const ENTRADA = /<script\b[^>]*\btype="module"[^>]*\bsrc="(\/assets\/[^"]+\.js)"/

export function entradaDoHtml(html) {
  const m = ENTRADA.exec(String(html || ''))
  return m ? m[1] : null
}

export function entradaAtual(doc) {
  const s = doc.querySelector('script[type="module"][src*="/assets/"]')
  if (!s) return null // dev server: não há arquivo com hash, nada a comparar
  try { return new URL(s.getAttribute('src'), 'https://x.invalid').pathname } catch { return null }
}

/* Recarregar sozinho só quando não há nada pela metade na tela: janela
   aberta (folha, confirmação) ou campo com o cursor. Senão, só a faixa. */
export function podeRecarregarSozinho(doc) {
  if (doc.querySelector('.og-detalhe, dialog[open], .ui-tour__balao')) return false
  const ativo = doc.activeElement
  return !(ativo && /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName))
}
