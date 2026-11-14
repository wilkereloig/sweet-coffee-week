/*
 * Preparo da imagem do pedido de delivery, no aparelho: lê o arquivo, reduz (lado máximo 1600 px) e regrava em WebP (JPEG quando o
 * navegador não gera WebP), até caber em 3 MB. Nada é enviado daqui. Formatos de entrada: JPEG, PNG, WebP (a câmera e a galeria do
 * celular entregam um desses; HEIC sem conversão vira "formato_invalido" e a pessoa escolhe outro arquivo).
 * Motivos: formato_invalido · imagem_ilegivel · imagem_grande.
 */
import { LIMITES, dimensoesFinais, exifDoJpeg, extensaoDoTipo } from './logica.js'

const toBlob = (canvas, tipo, q) => new Promise((ok) => canvas.toBlob(ok, tipo, q))

/** Metadados do arquivo ORIGINAL (a regravação apaga o EXIF). Pista para a organização; falha aqui nunca impede o envio. */
async function metadadosDoArquivo (arquivo, bmp) {
  let exif = null
  if (arquivo.type === 'image/jpeg') { try { exif = exifDoJpeg(await arquivo.slice(0, 262144).arrayBuffer()) } catch { exif = null } }
  const mod = Number(arquivo.lastModified)
  return {
    v: 1, nome: String(arquivo.name || '').slice(0, 80), tipo: arquivo.type, bytes: arquivo.size,
    modificado: Number.isFinite(mod) && mod > 0 ? new Date(mod).toISOString() : null, largura: bmp.width, altura: bmp.height, exif,
  }
}

export async function prepararImagem (arquivo) {
  if (!arquivo || !extensaoDoTipo(arquivo.type)) return { ok: false, motivo: 'formato_invalido' }
  let bmp
  try { bmp = await createImageBitmap(arquivo) } catch { return { ok: false, motivo: 'imagem_ilegivel' } }
  const meta = await metadadosDoArquivo(arquivo, bmp).catch(() => null)
  try {
    for (const [lado, q] of [[LIMITES.imagemLadoMax, 0.82], [1280, 0.7], [1024, 0.6]]) {
      const { largura, altura } = dimensoesFinais(bmp.width, bmp.height, lado)
      const canvas = document.createElement('canvas')
      canvas.width = largura; canvas.height = altura
      canvas.getContext('2d').drawImage(bmp, 0, 0, largura, altura)
      let blob = await toBlob(canvas, 'image/webp', q)
      if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', q)
      if (!blob) return { ok: false, motivo: 'imagem_ilegivel' }
      if (blob.size <= LIMITES.imagemMaxBytes) return { ok: true, blob, ext: extensaoDoTipo(blob.type), tipo: blob.type, largura, altura, meta }
    }
    return { ok: false, motivo: 'imagem_grande' }
  } finally { bmp.close?.() }
}
