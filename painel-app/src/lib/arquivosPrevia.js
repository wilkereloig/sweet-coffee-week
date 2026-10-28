/*
 * Prévia das imagens em Arquivos (27/10/2026) — migration supabase/migrations/20261116_arquivos_previa.sql,
 * teste tests/painel-app-arquivos-previa.test.mjs.
 *
 * A logo Cartoon em alta tem 16 MB: como miniatura, o original travaria o celular. Cada imagem ganha uma PRÉVIA
 * WEBP de até LADO_PREVIA px, na mesma pasta do bucket privado `arquivos` (a pasta decide quem lê), apontada por
 * `arquivos.previa_path`. Ela serve à miniatura da lista e à imagem ampliada; baixar continua sendo o original.
 * Quem gera é o painel da equipe (producao.gerir): ao publicar/substituir, do arquivo na mão; o que já estava
 * publicado, uma vez, ao abrir Arquivos num navegador que codifica WEBP.
 */
import React from 'react'
import { rpc, chamarFuncao } from './rpc.js'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess.js'
import { enviarPut } from './redesArquivos.js'

const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }

export const LADO_PREVIA = 960
// Sem prévia, o original só serve de miniatura até este tamanho (acima, ícone até a prévia existir).
export const ORIGINAL_COMO_PREVIA_MAX = 3 * 1024 * 1024
// Acima disto nem se tenta gerar no navegador (memória do celular/computador).
export const GERAR_ENTRADA_MAX = 60 * 1024 * 1024
const RASTER_MIME = /^image\/(png|jpe?g|webp|gif|avif)$/i
const RASTER_EXT = /\.(png|jpe?g|webp|gif|avif)$/i

/** Imagem que dá prévia (SVG, PDF e vídeo não). */
export function ehImagemRaster(a) {
  if (!a) return false
  if (a.mime) return RASTER_MIME.test(a.mime)
  return RASTER_EXT.test(a.path || a.nome || '')
}

/** O caminho que a miniatura mostra: a prévia; sem ela, o original pequeno; senão nada (ícone). */
export function caminhoDaMiniatura(a) {
  if (!ehImagemRaster(a)) return null
  if (a.previa_path) return a.previa_path
  const t = Number(a.tamanho)
  return t && t <= ORIGINAL_COMO_PREVIA_MAX ? a.path : null
}

/** Prévia na MESMA pasta do arquivo (geral/ ou a da participação), nome novo a cada geração. */
export function caminhoPrevia(path, uuid) {
  const pasta = String(path || '').split('/')[0]
  return pasta + '/' + uuid + '.previa.webp'
}

/** Medida da prévia: cabe em LADO_PREVIA, nunca aumenta. */
export function medidaPrevia(w, h, lado = LADO_PREVIA) {
  if (!w || !h) return null
  const k = Math.min(1, lado / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

/** Arquivos (linhas de get_arquivos_admin + prévias) que ainda pedem prévia. */
export const semPrevia = (lista) => (lista || []).filter((a) => !a.arquivado && ehImagemRaster(a) && !a.previa_path
  && (!Number(a.tamanho) || Number(a.tamanho) <= GERAR_ENTRADA_MAX))

// ── Navegador ─────────────────────────────────────────────────────────────
let webp = null
/** Este navegador gera WEBP no canvas? (Safari não.) Economia de dados ligada: não gera. */
export function podeGerarPrevia() {
  if (typeof document === 'undefined') return false
  if (typeof navigator !== 'undefined' && navigator.connection && navigator.connection.saveData) return false
  if (webp === null) {
    try { const c = document.createElement('canvas'); c.width = c.height = 1; webp = c.toDataURL('image/webp').startsWith('data:image/webp') } catch { webp = false }
  }
  return webp
}

/** Desenha a prévia de uma imagem (File/Blob). null quando não dá (não abre, navegador sem WEBP). */
export async function desenharPrevia(blob) {
  if (!podeGerarPrevia()) return null
  let bmp
  try { bmp = await createImageBitmap(blob) } catch { return null }
  try {
    const m = medidaPrevia(bmp.width, bmp.height)
    if (!m) return null
    const c = document.createElement('canvas')
    c.width = m.w
    c.height = m.h
    const ctx = c.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bmp, 0, 0, m.w, m.h)
    const saida = await new Promise((ok) => c.toBlob(ok, 'image/webp', 0.82))
    return saida && saida.type === 'image/webp' ? saida : null
  } finally {
    if (bmp && bmp.close) bmp.close()
  }
}

/** Sobe a prévia e aponta o arquivo para ela. Devolve o caminho, ou null se não deu para gerar. */
export async function enviarPrevia(arquivo, blobOriginal) {
  const previa = await desenharPrevia(blobOriginal)
  if (!previa) return null
  const path = caminhoPrevia(arquivo.path, crypto.randomUUID())
  const a = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'subir', bucket: 'arquivos', path })
  await enviarPut(a.url, previa)
  await rpc('arquivo_definir_previa', { p_secret: lerSenha(), p_arquivo: arquivo.id, p_path: path })
  return path
}

/** Assina um caminho do bucket `arquivos` pela organização (5 min). */
export async function assinarArquivoOrg(path) {
  const r = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'baixar', bucket: 'arquivos', path })
  return r && r.url
}

/**
 * Gera, uma de cada vez, as prévias que faltam (o que já estava publicado antes desta versão). Só com
 * `ativo` (quem publica arquivos) e num navegador que codifica WEBP; falha não tenta de novo nesta sessão.
 * `aoGerar(id, path)` avisa a tela para mostrar a prévia sem esperar a releitura.
 */
export function useGerarPreviasFaltando(lista, { ativo, aoGerar }) {
  const tentados = React.useRef(new Set())
  const [passo, setPasso] = React.useState(0)
  const ref = React.useRef(aoGerar)
  ref.current = aoGerar
  const fila = ativo ? semPrevia(lista).filter((a) => !tentados.current.has(a.id)) : []
  const proximo = fila[0] ? fila[0].id : ''
  React.useEffect(() => {
    if (!proximo || !podeGerarPrevia()) return undefined
    const a = fila[0]
    let vivo = true
    const t = setTimeout(async () => {
      tentados.current.add(a.id)
      try {
        const url = await assinarArquivoOrg(a.path)
        const r = await fetch(url)
        if (!r.ok) throw new Error('download_' + r.status)
        const path = await enviarPrevia(a, await r.blob())
        if (vivo && path && ref.current) ref.current(a.id, path)
      } catch { /* fica com o ícone; outra sessão tenta */ }
      if (vivo) setPasso((n) => n + 1)
    }, tentados.current.size ? 800 : 3000)
    return () => { vivo = false; clearTimeout(t) }
  }, [proximo, passo]) // eslint-disable-line react-hooks/exhaustive-deps
  return fila.length
}
