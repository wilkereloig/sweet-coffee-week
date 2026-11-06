/*
 * Preparo da imagem do pedido de delivery, no aparelho: lê o arquivo, reduz (lado máximo 1600 px) e regrava em WebP (JPEG quando o
 * navegador não gera WebP), até caber em 3 MB. Nada é enviado daqui. Formatos de entrada: JPEG, PNG, WebP (a câmera e a galeria do
 * celular entregam um desses; HEIC sem conversão vira "formato_invalido" e a pessoa escolhe outro arquivo).
 * Motivos: formato_invalido · imagem_ilegivel · imagem_grande.
 */
import { LIMITES, dimensoesFinais, extensaoDoTipo } from './logica.js'

const toBlob = (canvas, tipo, q) => new Promise((ok) => canvas.toBlob(ok, tipo, q))

export async function prepararImagem (arquivo) {
  if (!arquivo || !extensaoDoTipo(arquivo.type)) return { ok: false, motivo: 'formato_invalido' }
  let bmp
  try { bmp = await createImageBitmap(arquivo) } catch { return { ok: false, motivo: 'imagem_ilegivel' } }
  try {
    for (const [lado, q] of [[LIMITES.imagemLadoMax, 0.82], [1280, 0.7], [1024, 0.6]]) {
      const { largura, altura } = dimensoesFinais(bmp.width, bmp.height, lado)
      const canvas = document.createElement('canvas')
      canvas.width = largura; canvas.height = altura
      canvas.getContext('2d').drawImage(bmp, 0, 0, largura, altura)
      let blob = await toBlob(canvas, 'image/webp', q)
      if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', q)
      if (!blob) return { ok: false, motivo: 'imagem_ilegivel' }
      if (blob.size <= LIMITES.imagemMaxBytes) return { ok: true, blob, ext: extensaoDoTipo(blob.type), tipo: blob.type, largura, altura }
    }
    return { ok: false, motivo: 'imagem_grande' }
  } finally { bmp.close?.() }
}
