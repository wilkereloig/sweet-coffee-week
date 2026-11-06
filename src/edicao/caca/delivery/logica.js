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
