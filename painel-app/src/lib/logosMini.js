/*
 * Miniatura da logo do participante (26/10/2026) — migration
 * supabase/migrations/20261113_logos_mini.sql, teste tests/painel-app-logos-mini.test.mjs.
 *
 * A logo original pesa de 200 KB a 4 MB. Em avatar e lista (até TAMANHO_MINI px)
 * o painel usa `logos_marca.mini`: WEBP 96 × 96 (recorte central, o mesmo `cover`
 * de .ui-logo) em data URI, ~1 KB, todas numa leitura só (`get_logos_mini`).
 * Logo sem miniatura (recém-enviada) ganha a sua no painel da equipe: o navegador
 * gera e grava uma vez (`logo_definir_mini` só grava onde está vazio).
 */
import React from 'react'
import { rpc } from './rpc.js'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess.js'
import { urlLogo } from './logos.js'
import { areaRecorte } from './equipe.js'
import { useGuarda, useSincronizar } from './sync/react.js'

const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }

export const LADO_MINI = 96
// Até este tamanho de exibição a miniatura basta (96 px = 48 px em tela 2×).
export const TAMANHO_MINI = 48
export const MINI_MAX = 12000 // o CHECK do banco
const FORMATO = /^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/
// Gerar custa baixar a original: no máximo isto por sessão, uma de cada vez. Cada logo
// é gerada UMA vez na vida (depois o banco já tem), então o teto só segura sessão ruim.
export const GERAR_POR_SESSAO = 60

export const miniValida = (s) => typeof s === 'string' && s.length <= MINI_MAX && FORMATO.test(s)

/** Linhas de get_logos_mini → busca por participante e por conta da marca. */
export function mapaMinis(linhas) {
  const porParticipante = {}
  const porConta = {}
  for (const l of Array.isArray(linhas) ? linhas : []) {
    if (!l || !l.participante_id) continue
    const reg = { logoId: l.logo_id, path: l.path || null, mini: miniValida(l.mini) ? l.mini : null }
    porParticipante[l.participante_id] = reg
    if (l.user_id) porConta[l.user_id] = reg
  }
  return { porParticipante, porConta }
}

/** Logos que ainda não têm miniatura (e têm de onde gerar). */
export const semMini = (mapa) => Object.values(mapa.porParticipante).filter((r) => !r.mini && r.path && r.logoId)

/**
 * O que mostrar num slot de `tamanho` px: miniatura (se cabe), senão a original.
 * `url` explícita de quem chama vence a original do mapa.
 */
export function fonteDaLogo(reg, tamanho, url) {
  const original = url || (reg && reg.path ? urlLogo(reg.path) : null)
  const mini = reg && reg.mini && tamanho <= TAMANHO_MINI ? reg.mini : null
  return { mini, original }
}

// ── Navegador ─────────────────────────────────────────────────────────────
// Safari não codifica WEBP no canvas: lá nem se baixa a original (deixa para o computador).
// Economia de dados ligada no aparelho: também não.
let webp = null
export function podeGerar() {
  if (typeof document === 'undefined') return false
  if (typeof navigator !== 'undefined' && navigator.connection && navigator.connection.saveData) return false
  if (webp === null) {
    try { const c = document.createElement('canvas'); c.width = c.height = 1; webp = c.toDataURL('image/webp').startsWith('data:image/webp') } catch { webp = false }
  }
  return webp
}

/** Baixa a original, recorta o quadrado central e devolve o data URI WEBP (ou null se o navegador não gera WEBP). */
export async function gerarMini(url) {
  const r = await fetch(url, { mode: 'cors' })
  if (!r.ok) throw new Error('download_' + r.status)
  const blob = await r.blob()
  const endereco = URL.createObjectURL(blob)
  try {
    const img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error('imagem')); i.src = endereco })
    const w = img.naturalWidth || LADO_MINI
    const h = img.naturalHeight || LADO_MINI
    const { sx, sy, lado } = areaRecorte(w, h)
    const c = document.createElement('canvas')
    c.width = LADO_MINI
    c.height = LADO_MINI
    const ctx = c.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO_MINI, LADO_MINI)
    const saida = await new Promise((ok) => c.toBlob(ok, 'image/webp', 0.75))
    // Safari não gera WEBP (devolve PNG): deixa para uma sessão que gere.
    if (!saida || saida.type !== 'image/webp') return null
    const dado = await new Promise((ok, falha) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = () => falha(f.error); f.readAsDataURL(saida) })
    return miniValida(dado) ? dado : null
  } finally {
    URL.revokeObjectURL(endereco)
  }
}

// ── Contexto ──────────────────────────────────────────────────────────────
const VAZIO = { porParticipante: {}, porConta: {} }
export const LogosMiniContexto = React.createContext(VAZIO)
export const useLogosMini = () => React.useContext(LogosMiniContexto)

/** Painel da equipe: carrega as miniaturas, relê quando uma logo muda e gera as que faltam. */
export function useCarregarLogosMini() {
  const [mapa, setMapa] = React.useState(VAZIO)
  const guarda = useGuarda()
  const tentadas = React.useRef(new Set())
  const [passo, setPasso] = React.useState(0) // falha não muda o mapa: isto puxa a próxima da fila
  const recarregar = React.useCallback(async () => {
    const vale = guarda()
    const linhas = await rpc('get_logos_mini', { p_secret: lerSenha() })
    if (vale()) setMapa(mapaMinis(linhas))
  }, [guarda])
  React.useEffect(() => { recarregar().catch(() => {}) }, [recarregar])
  useSincronizar(['logos'], recarregar)

  // Uma de cada vez, depois que o painel assentou; falha não tenta de novo nesta sessão.
  React.useEffect(() => {
    const fila = semMini(mapa).filter((r) => !tentadas.current.has(r.logoId))
    if (!fila.length || tentadas.current.size >= GERAR_POR_SESSAO || !podeGerar()) return
    let vivo = true
    const t = setTimeout(async () => {
      const reg = fila[0]
      tentadas.current.add(reg.logoId)
      try {
        const mini = await gerarMini(urlLogo(reg.path))
        if (!vivo || !mini) return
        await rpc('logo_definir_mini', { p_secret: lerSenha(), p_logo: reg.logoId, p_mini: mini })
        if (vivo) setMapa((m) => ({
          porParticipante: Object.fromEntries(Object.entries(m.porParticipante).map(([k, v]) => [k, v.logoId === reg.logoId ? { ...v, mini } : v])),
          porConta: Object.fromEntries(Object.entries(m.porConta).map(([k, v]) => [k, v.logoId === reg.logoId ? { ...v, mini } : v])),
        }))
      } catch { /* fica com a original; outra sessão tenta */ }
      if (vivo) setPasso((n) => n + 1)
    }, tentadas.current.size ? 1500 : 4000) // a 1ª espera o painel assentar
    return () => { vivo = false; clearTimeout(t) }
  }, [mapa, passo])
  return mapa
}
