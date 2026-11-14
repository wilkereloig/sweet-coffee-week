/*
 * Carimbo de delivery — lógica pura (testada em tests/cartoon-caca-delivery.test.mjs).
 * O servidor decide tudo (código, validade, limites, 12 h, avaliação); aqui só se escolhe o que mostrar.
 * Nada é escrito como "conquistado" antes da validação: o carimbo só vale depois da avaliação do combo.
 */
import { enderecoEmLinha } from '../../dados/modelo.js'

export const LIMITES = Object.freeze({ refMax: 40, notaMax: 200, imagemMaxBytes: 3 * 1024 * 1024, imagemLadoMax: 1600 })

/** Pedidos de delivery da lista de `caca_excecao_minhas` (os de GPS e de visita anterior ficam de fora). */
export const pedidosDelivery = (lista) => (Array.isArray(lista) ? lista.filter((p) => p?.motivo === 'delivery') : [])

/**
 * Estado do pedido para a pessoa:
 *  'codigo' (código válido, aguardando a casa) · 'expirado' (código venceu, sem imagem) · 'analise' (imagem com a organização) ·
 *  'aprovadoAvaliar' (carimbo registrado, falta avaliar) · 'aprovadoValido' · 'negado'.
 */
export function estadoDoDelivery (pedido, mapa) {
  if (pedido?.estado === 'negado') return 'negado'
  if (pedido?.estado === 'aprovado') {
    const casa = (mapa?.casas || []).find((c) => c?.slug === pedido.slug)
    return casa?.estado === 'validada' ? 'aprovadoValido' : 'aprovadoAvaliar'
  }
  if (pedido?.via === 'imagem' || pedido?.tem_imagem) return 'analise'
  if (pedido?.via_pretendida === 'imagem') return 'imagemPendente'
  return pedido?.expirado === true || !pedido?.codigo ? 'expirado' : 'codigo'
}

/** 'ABC123' → 'ABC-123' (a casa digita com ou sem hífen; o banco ignora o hífen). */
export const codigoLegivel = (c) => { const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return s.length === 6 ? `${s.slice(0, 3)}-${s.slice(3)}` : s }

/** Quanto falta para o código vencer, em português ("23 h", "40 min", "menos de 1 min"); '' se já venceu ou sem data. */
export function validadeDoCodigo (expiraEm, agora = new Date()) {
  const t = new Date(expiraEm).getTime()
  if (!Number.isFinite(t)) return ''
  const min = Math.floor((t - new Date(agora).getTime()) / 60000)
  if (min <= 0) return ''
  if (min < 1) return 'menos de 1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return `${h} h${min % 60 ? ` ${min % 60} min` : ''}`
}

/**
 * Casas que oferecem delivery para o combo: só unidades com delivery declarado "sim" entram — "não informado" NÃO é delivery.
 * Cada opção: { slug, nome, unidades:[{ id, rotulo }] } (id = id público da unidade). Ordem alfabética.
 */
export function casasComDelivery (dados) {
  return (dados?.participantes || [])
    .map((p) => ({ p, us: (p?.unidades || []).filter((u) => u?.combo?.modos?.delivery === 'sim') }))
    .filter(({ p, us }) => p?.slug && us.length)
    .map(({ p, us }) => ({
      slug: p.slug,
      nome: p.casa?.nome || p.slug,
      unidades: us.map((u) => ({ id: u.id, rotulo: [u.nome, enderecoEmLinha(u.endereco)].filter(Boolean).join(' · ') || 'Endereço' })),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Casa pedida no endereço (`?casa=<slug>`), só se existir na lista; senão ''. */
export function casaDaConsulta (search, casas) {
  const q = new URLSearchParams(String(search || '')).get('casa') || ''
  return (casas || []).some((c) => c.slug === q) ? q : ''
}

/** Lado final da imagem comprimida: nunca amplia, nunca passa do máximo. */
export function dimensoesFinais (largura, altura, max = LIMITES.imagemLadoMax) {
  const w = Math.max(1, Math.trunc(Number(largura) || 0)); const h = Math.max(1, Math.trunc(Number(altura) || 0))
  const f = Math.min(1, max / Math.max(w, h))
  return { largura: Math.max(1, Math.round(w * f)), altura: Math.max(1, Math.round(h * f)) }
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
/** Formatos aceitos: JPEG, PNG e WebP. Devolve a extensão ou '' (HEIC e o resto pedem outro arquivo). */
export const extensaoDoTipo = (tipo) => EXT[String(tipo || '').toLowerCase()] || ''

/**
 * EXIF da foto ORIGINAL (14/11/2026, pedido do Wilker). A foto é regravada em WebP no aparelho e perde o EXIF, então lemos antes de
 * reduzir e mandamos à organização como pista (print, imagem baixada, foto antiga). Só JPEG; arquivo estranho ou cortado = `null`.
 * GPS: só se existia (sim/não). A localização não é lida nem guardada.
 */
export function exifDoJpeg (buffer) {
  try {
    const v = new DataView(buffer)
    if (v.getUint16(0) !== 0xFFD8) return null
    for (let o = 2; o + 10 <= v.byteLength;) {
      const marca = v.getUint16(o)
      if (marca === 0xFFDA || (marca & 0xFF00) !== 0xFF00) return null
      if (marca === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) return lerTiff(v, o + 10) // APP1 "Exif"
      o += 2 + v.getUint16(o + 2)
    }
  } catch { /* fora dos limites: sem EXIF */ }
  return null
}

function lerTiff (v, t) {
  const le = v.getUint16(t) === 0x4949
  const u16 = (p) => v.getUint16(p, le); const u32 = (p) => v.getUint32(p, le)
  const ifd = (p) => { const tags = new Map(); for (let i = 0, n = u16(p); i < n; i++) tags.set(u16(p + 2 + i * 12), p + 2 + i * 12); return tags }
  const sub = (tags, tag) => (tags.has(tag) ? ifd(t + u32(tags.get(tag) + 8)) : new Map())
  const texto = (tags, tag) => {
    const e = tags.get(tag)
    if (e === undefined || u16(e + 2) !== 2) return null
    const n = u32(e + 4); const ini = n <= 4 ? e + 8 : t + u32(e + 8)
    let s = ''
    for (let i = 0; i < Math.min(n, 64); i++) { const c = v.getUint8(ini + i); if (!c) break; s += String.fromCharCode(c) }
    return s.trim() || null
  }
  const ifd0 = ifd(t + u32(t + 4))
  return {
    marca: texto(ifd0, 0x010F), modelo: texto(ifd0, 0x0110), software: texto(ifd0, 0x0131), data: texto(ifd0, 0x0132),
    data_original: texto(sub(ifd0, 0x8769), 0x9003), gps: sub(ifd0, 0x8825).has(0x0002),
  }
}
