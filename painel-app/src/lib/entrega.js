/*
 * Entregar arquivo à pessoa (17/10/2026): baixar, compactar, compartilhar.
 * Peças puras ou só de navegador — quem busca o ORIGINAL no Storage é
 * redesArquivos.js (obterArquivo, equipe) ou marcaApi.js (obterArquivoMarca,
 * a marca, com a própria sessão). Nenhuma dependência nova.
 *
 * Web Share (MDN, consultado em 17/10/2026): navigator.share exige gesto da
 * pessoa (sem ele, NotAllowedError), contexto seguro e `canShare({ files })`
 * verdadeiro; cancelar (ou nenhum destino) = AbortError; arquivo sem suporte =
 * TypeError. Disponibilidade limitada — sempre por detecção, nunca por
 * navegador. ⛔ O site não escolhe o destino nem sabe se a imagem foi para
 * Fotos: quem escolhe é o sistema do aparelho.
 */

export const LIMITES = {
  compartilharArquivos: 10, // por vez: o próprio sistema costuma recusar listas grandes
  compartilharBytes: 60 * 1024 * 1024,
  zipArquivos: 60, // nada de dezenas de downloads soltos: vira um ZIP
  zipBytes: 300 * 1024 * 1024,
  zipBytesMovel: 100 * 1024 * 1024, // memória do celular
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'application/pdf': 'pdf', 'application/zip': 'zip' }
export const extensaoDe = (mime) => EXT[String(mime || '').split(';')[0]] || ''

/** Nome com que o arquivo chega: o original, sem barra nem controle, com a extensão do tipo real. */
export function nomeArquivo(nome, mime = '', path = '') {
  let n = String(nome || '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim()
  if (!n) n = String(path || '').split('/').pop() || 'arquivo'
  const ext = extensaoDe(mime) || (String(path).match(/\.([a-z0-9]{2,4})$/i) || [])[1] || ''
  if (ext && !new RegExp('\\.' + ext + '$', 'i').test(n) && !(ext === 'jpg' && /\.jpe?g$/i.test(n))) n += '.' + ext
  return n.slice(-150)
}

/** Ordem do carrossel no nome: "01-capa.jpg", "02-…". */
export function nomeNumerado(i, n, nome) {
  return String(i + 1).padStart(Math.max(2, String(n).length), '0') + '-' + nome
}

/**
 * Nome livre no conjunto (sem olhar caixa): repetido ganha " (2)", " (3)"… antes da extensão. `usados` é um Set de nomes em
 * minúsculas, que a função preenche. O nome FINAL de cada arquivo só existe depois do download (a extensão vem do tipo real e
 * `nomeArquivo` troca caracteres): quem monta o ZIP repete a checagem sobre `arquivo.name`, não sobre o nome pedido.
 */
export function nomeLivre(nome, usados) {
  const m = nome.match(/^(.*?)(\.[^.]+)?$/)
  let n = nome
  for (let c = 2; usados.has(n.toLowerCase()); c++) n = m[1] + ' (' + c + ')' + (m[2] || '')
  usados.add(n.toLowerCase())
  return n
}

/** Nomes repetidos ganham " (2)", " (3)"… antes da extensão. */
export function nomesUnicos(nomes) {
  const usados = new Set()
  return nomes.map((n) => nomeLivre(n, usados))
}

/**
 * Cabe? `tamanho` desconhecido não barra aqui — quem busca confere ao chegar.
 * `modo`: 'compartilhar' | 'zip'. Devolve { ok } ou { ok:false, motivo }.
 */
export function planejarLote(itens, { modo = 'zip', movel = false, escolhe = true } = {}) {
  const n = itens.length
  const bytes = itens.reduce((s, x) => s + (Number(x.tamanho) || 0), 0)
  const mb = (b) => Math.round(b / 1048576) + ' MB'
  // Quem não escolhe o conjunto (a marca baixa "todas" as fotos oficiais) não tem o que "escolher menos": baixa uma de cada vez.
  const saida = escolhe ? 'Escolha menos arquivos' : 'Baixe uma de cada vez'
  if (!n) return { ok: false, motivo: 'Nada selecionado.' }
  if (modo === 'compartilhar') {
    if (n > LIMITES.compartilharArquivos) return { ok: false, motivo: escolhe ? 'Para salvar ou compartilhar, escolha até ' + LIMITES.compartilharArquivos + ' arquivos de cada vez.' : 'Para salvar ou compartilhar, são até ' + LIMITES.compartilharArquivos + ' arquivos de cada vez. Baixe uma de cada vez.' }
    if (bytes > LIMITES.compartilharBytes) return { ok: false, motivo: 'São ' + mb(bytes) + ': passa do limite de ' + mb(LIMITES.compartilharBytes) + ' para compartilhar de uma vez. ' + saida + '.' }
    return { ok: true }
  }
  const teto = movel ? LIMITES.zipBytesMovel : LIMITES.zipBytes
  if (n > LIMITES.zipArquivos) return { ok: false, motivo: escolhe ? 'Escolha até ' + LIMITES.zipArquivos + ' arquivos por arquivo compactado.' : 'São ' + n + ' arquivos, mais do que cabe num ZIP (' + LIMITES.zipArquivos + '). Baixe uma de cada vez.' }
  if (bytes > teto) return { ok: false, motivo: 'São ' + mb(bytes) + ': passa do limite de ' + mb(teto) + (movel ? ' no celular' : '') + '. ' + saida + (escolhe ? ' (vídeos pesam mais).' : '.') }
  return { ok: true, teto }
}

// ── ZIP sem compressão (imagem e vídeo já vêm comprimidos) ─────────────────────
const TABELA = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
/** CRC-32 encadeável: crc32(b, crc32(a)) === crc32(a + b). */
export function crc32(bytes, anterior = 0) {
  let c = (anterior ^ 0xffffffff) >>> 0
  for (let i = 0; i < bytes.length; i++) c = TABELA[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
// Lê em pedaços: o arquivo inteiro nunca vira um único ArrayBuffer na memória.
async function crcDoArquivo(blob) {
  let c = 0
  const leitor = blob.stream().getReader()
  for (;;) { const { done, value } = await leitor.read(); if (done) return c; c = crc32(value, c) }
}
function dataDos(d = new Date()) {
  return { hora: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dia: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }
}
/**
 * ZIP "armazenado" (método 0, nomes em UTF-8). As partes do Blob apontam para
 * os próprios arquivos — o navegador não precisa juntar tudo num buffer só.
 * Sem ZIP64: o teto do painel (300 MB) fica longe dos 4 GB do formato.
 */
export async function zipArmazenado(arquivos, agora = new Date()) {
  const enc = new TextEncoder()
  const { hora, dia } = dataDos(agora)
  const partes = []
  const central = []
  let pos = 0
  for (const arq of arquivos) {
    const nome = enc.encode(arq.name)
    const crc = await crcDoArquivo(arq)
    const tam = arq.size
    const loc = new DataView(new ArrayBuffer(30))
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true); loc.setUint16(8, 0, true)
    loc.setUint16(10, hora, true); loc.setUint16(12, dia, true); loc.setUint32(14, crc, true)
    loc.setUint32(18, tam, true); loc.setUint32(22, tam, true); loc.setUint16(26, nome.length, true); loc.setUint16(28, 0, true)
    partes.push(loc.buffer, nome, arq)
    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true)
    cen.setUint16(10, 0, true); cen.setUint16(12, hora, true); cen.setUint16(14, dia, true); cen.setUint32(16, crc, true)
    cen.setUint32(20, tam, true); cen.setUint32(24, tam, true); cen.setUint16(28, nome.length, true)
    cen.setUint32(42, pos, true)
    central.push(cen.buffer, nome)
    pos += 30 + nome.length + tam
  }
  const tamCentral = central.reduce((s, p) => s + p.byteLength, 0)
  const fim = new DataView(new ArrayBuffer(22))
  fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true)
  fim.setUint32(12, tamCentral, true); fim.setUint32(16, pos, true)
  return new Blob([...partes, ...central, fim.buffer], { type: 'application/zip' })
}

// ── Entregar e compartilhar (navegador) ───────────────────────────────────────
/**
 * Download direto, na mesma aba (link com `download` para um Blob local —
 * nada de abrir aba nova). O navegador decide onde guarda: a tela diz
 * "download iniciado", nunca "salvo no aparelho".
 */
export function entregar(arquivo) {
  const url = URL.createObjectURL(arquivo)
  const a = document.createElement('a')
  a.href = url
  a.download = arquivo.name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

/** O aparelho aceita compartilhar ARQUIVO deste tipo? (detecção, nunca lista de navegadores) */
export function suportaCompartilhar(mime = 'image/jpeg') {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false
    return !!navigator.canShare({ files: [new File([new Uint8Array([0])], 'teste.' + (extensaoDe(mime) || 'jpg'), { type: mime })] })
  } catch { return false }
}

/** Ainda dá para abrir as opções sem novo toque? (desconhecido = tentar) */
export const temGestoAtivo = () => !(typeof navigator !== 'undefined' && navigator.userActivation && navigator.userActivation.isActive === false)

/**
 * Abre as opções do aparelho com os arquivos de verdade (nunca uma URL privada).
 * 'ok' · 'cancelado' (AbortError: a pessoa fechou, ou não há destino) ·
 * 'sem_gesto' (NotAllowedError: o toque expirou — pedir um toque novo) ·
 * 'indisponivel' (TypeError / canShare falso) · 'falhou'.
 */
export async function compartilhar(arquivos, titulo = '') {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return 'indisponivel'
  try { if (!navigator.canShare({ files: arquivos })) return 'indisponivel' } catch { return 'indisponivel' }
  try {
    await navigator.share(titulo ? { files: arquivos, title: titulo } : { files: arquivos })
    return 'ok'
  } catch (e) {
    const n = e && e.name
    return n === 'AbortError' ? 'cancelado' : n === 'NotAllowedError' ? 'sem_gesto' : n === 'TypeError' ? 'indisponivel' : 'falhou'
  }
}
