/*
 * Medida (largura × altura) de uma imagem a partir dos PRIMEIROS bytes do arquivo (14/11/2026), para o painel analisar centenas
 * de fotos de pedido sem baixar cada uma inteira. Lê o cabeçalho de JPEG (marcador SOF), WebP (VP8, VP8L, VP8X) e PNG (IHDR).
 * Devolve null quando o cabeçalho não está nos bytes recebidos ou o formato é outro: quem chama cai para a imagem inteira.
 */
export function medidaDosBytes(entrada) {
  const b = entrada instanceof Uint8Array ? entrada : new Uint8Array(entrada || [])
  const u16be = (i) => (b[i] << 8) | b[i + 1]
  const u16le = (i) => b[i] | (b[i + 1] << 8)
  const u24le = (i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)
  const txt = (i, n) => String.fromCharCode(...b.subarray(i, i + n))
  if (b.length < 30) return null

  // PNG: assinatura de 8 bytes, depois o IHDR com largura e altura em 32 bits big-endian.
  if (b[0] === 0x89 && txt(1, 3) === 'PNG') {
    const w = (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0
    const h = (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0
    return w && h ? { largura: w, altura: h } : null
  }

  // WebP: RIFF....WEBP e um dos três tipos de bloco.
  if (txt(0, 4) === 'RIFF' && txt(8, 4) === 'WEBP') {
    const tipo = txt(12, 4)
    if (tipo === 'VP8 ' && b.length >= 30) return { largura: u16le(26) & 0x3fff, altura: u16le(28) & 0x3fff }
    if (tipo === 'VP8L' && b.length >= 25) {
      const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)
      return { largura: (v & 0x3fff) + 1, altura: ((v >>> 14) & 0x3fff) + 1 }
    }
    if (tipo === 'VP8X' && b.length >= 30) return { largura: u24le(24) + 1, altura: u24le(27) + 1 }
    return null
  }

  // JPEG: percorre os segmentos até um SOF (C0–CF, menos C4 DHT, C8 JPG e CC DAC).
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue }
      const m = b[i + 1]
      if (m === 0xff) { i++; continue }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        const h = u16be(i + 5); const w = u16be(i + 7)
        return w && h ? { largura: w, altura: h } : null
      }
      if (m === 0xda || m === 0xd9) return null // começou a imagem sem SOF antes: não é um JPEG que dê para medir aqui
      i += 2 + u16be(i + 2)
    }
  }
  return null
}

/**
 * Medida de uma imagem por URL: tenta os primeiros 64 KB (Range) e, se não der (servidor ignora Range, CORS, cabeçalho grande),
 * carrega a imagem inteira e lê a medida natural. Rejeita se nada funcionar.
 */
export async function medirImagemPorUrl(url, { fetchImpl = globalThis.fetch, ImageImpl = globalThis.Image } = {}) {
  try {
    const r = await fetchImpl(url, { headers: { Range: 'bytes=0-65535' } })
    if (r.ok) {
      const m = medidaDosBytes(new Uint8Array(await r.arrayBuffer()))
      if (m) return m
    }
  } catch { /* cai para a imagem inteira */ }
  return new Promise((ok, falha) => {
    const img = new ImageImpl()
    img.onload = () => (img.naturalWidth ? ok({ largura: img.naturalWidth, altura: img.naturalHeight }) : falha(new Error('imagem_vazia')))
    img.onerror = () => falha(new Error('imagem_ilegivel'))
    img.src = url
  })
}

/** Roda `tarefa` em cada item, `simultaneas` por vez, avisando o andamento. Falha num item não para os outros. */
export async function emLotes(itens, tarefa, { simultaneas = 4, aoAvancar = () => {} } = {}) {
  const lista = [...itens]
  const saida = new Array(lista.length)
  let proximo = 0; let feitos = 0
  async function trabalhador() {
    while (proximo < lista.length) {
      const i = proximo++
      try { saida[i] = { ok: true, valor: await tarefa(lista[i], i) } } catch (e) { saida[i] = { ok: false, erro: e } }
      feitos += 1
      aoAvancar(feitos, lista.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(simultaneas, lista.length) }, trabalhador))
  return saida
}
