/*
 * Artes das redes sociais: assinar, conferir, enviar e baixar (16/10/2026).
 * Bucket PRIVADO `redes`; quem assina é a Edge Function arquivo-url (subir =
 * redes.arquivos, baixar = redes.ver). Os bytes vão do navegador direto para o
 * Storage pela URL assinada; o registro (`redes_arquivo_registrar`) só existe
 * depois de o banco ver o objeto inteiro lá.
 *
 * ⚠️ URL assinada vence em 5 min. As miniaturas renovam antes de vencer e,
 *    se uma falhar ao carregar, pedem assinatura nova uma vez.
 */
import React from 'react'
import { comEnvio } from './pendencias.js'
import { rpc, chamarFuncao, SUPABASE_URL } from './rpc.js'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess.js'
import { validarArquivo, caminhoArquivo } from './redes.js'
import { entregar, nomeArquivo } from './entrega.js'

const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }
const LOTE = 60
const cache = new Map() // "bucket:path" → { url, ate }

/*
 * Fonte de um arquivo = { bucket, path }. Um texto solto é caminho do bucket
 * `redes` (o formato de antes). A biblioteca referencia material de outros
 * buckets sem copiar: `logos` e `edicao-publico` são públicos (endereço
 * direto); `redes` e `equipe` assinam em lote; `arquivos` (materiais gerais)
 * assina um a um.
 */
const PUBLICOS = new Set(['logos', 'edicao-publico'])
const EM_LOTE = new Set(['redes', 'equipe'])
export function fonteDe(x, bucket = 'redes') {
  if (!x) return null
  if (typeof x === 'string') return { bucket, path: x }
  return x.path ? { bucket: x.bucket || bucket, path: x.path } : null
}
export const chaveFonte = (f) => (f ? f.bucket + ':' + f.path : '')
export const urlDe = (urls, x, bucket) => { const f = fonteDe(x, bucket); return f && urls ? urls[chaveFonte(f)] || null : null }
// Logo do acervo mora no próprio site ("/logos/participants/x.png"), não no bucket.
const urlDireta = (f) => (f.path.startsWith('/') ? f.path
  : SUPABASE_URL + '/storage/v1/object/public/' + f.bucket + '/' + f.path.split('/').map(encodeURIComponent).join('/'))

export async function urlsAssinadas(lista, { forcar = false, bucket = 'redes' } = {}) {
  const fontes = []
  const vistas = new Set()
  for (const x of lista || []) {
    const f = fonteDe(x, bucket)
    if (f && !vistas.has(chaveFonte(f))) { vistas.add(chaveFonte(f)); fontes.push(f) }
  }
  const agora = Date.now()
  const faltam = fontes.filter((f) => !PUBLICOS.has(f.bucket) && (forcar || !((cache.get(chaveFonte(f)) || {}).ate > agora)))
  for (const b of EM_LOTE) {
    const doBucket = faltam.filter((f) => f.bucket === b).map((f) => f.path)
    for (let i = 0; i < doBucket.length; i += LOTE) {
      const r = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'baixar_varios', bucket: b, paths: doBucket.slice(i, i + LOTE) })
      const validade = Number(r.validade || 300) * 1000
      // Margem de 60 s: a imagem pedida perto do fim ainda carrega.
      for (const u of r.urls || []) if (u && u.url) cache.set(b + ':' + u.path, { url: u.url, ate: Date.now() + validade - 60000 })
    }
  }
  for (const f of faltam.filter((x) => !EM_LOTE.has(x.bucket))) {
    try {
      const r = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'baixar', bucket: f.bucket, path: f.path })
      if (r && r.url) cache.set(chaveFonte(f), { url: r.url, ate: Date.now() + 240000 })
    } catch { /* sem prévia: quem mostra cai no ícone do tipo */ }
  }
  return Object.fromEntries(fontes.map((f) => [chaveFonte(f),
    PUBLICOS.has(f.bucket) ? urlDireta(f) : (cache.get(chaveFonte(f)) || {}).url || null]))
}

/** URLs (assinadas quando o bucket é privado) de uma lista de fontes, renovadas antes de vencer. */
export function useUrlsAssinadas(lista, bucket = 'redes') {
  const chave = [...new Set((lista || []).map((x) => chaveFonte(fonteDe(x, bucket))).filter(Boolean))].sort().join('|')
  const [urls, setUrls] = React.useState({})
  const [erro, setErro] = React.useState(null)
  React.useEffect(() => {
    if (!chave) return undefined
    let vivo = true
    const fontes = chave.split('|').map((k) => { const i = k.indexOf(':'); return { bucket: k.slice(0, i), path: k.slice(i + 1) } })
    const pedir = () => urlsAssinadas(fontes)
      .then((u) => { if (vivo) { setUrls((x) => ({ ...x, ...u })); setErro(null) } })
      .catch((e) => { if (vivo) setErro(e.message) })
    pedir()
    const t = setInterval(pedir, 120000)
    return () => { vivo = false; clearInterval(t) }
  }, [chave])
  const renovar = React.useCallback((x) => urlsAssinadas([fonteDe(x, bucket)], { forcar: true })
    .then((u) => { setUrls((y) => ({ ...y, ...u })); setErro(null) }).catch((e) => setErro(e.message)), [bucket])
  return React.useMemo(() => ({ urls, erro, renovar }), [urls, erro, renovar])
}

/*
 * Download do ORIGINAL (17/10/2026): nunca a miniatura, com nome, formato,
 * resolução e transparência intactos (os bytes vêm como estão no Storage).
 * Privado: assinatura NOVA a cada pedido (arquivo-url confere a permissão de
 * novo); se a URL vencer ou for recusada no caminho, uma assinatura nova, uma
 * vez. Público (logos, fotos da edição): endereço direto. Antes, buckets que não
 * eram `redes` abriam numa aba nova; agora o arquivo vem para a página e é
 * entregue por download direto (lib/entrega.js) — sem aba, sem tornar nada público.
 */
async function urlOriginal(f) {
  if (PUBLICOS.has(f.bucket) || f.path.startsWith('/')) return urlDireta(f)
  const r = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'baixar', bucket: f.bucket, path: f.path })
  if (!r || !r.url) throw new Error('url_indisponivel')
  return r.url
}
export async function obterArquivo(x, nome, { mime = '', sinal } = {}) {
  const f = fonteDe(x)
  const buscar = async () => {
    const url = await urlOriginal(f) // permissão/servidor: o erro segue como veio (não é "conexão")
    try { return await fetch(url, { signal: sinal, cache: 'no-store' }) }
    catch (e) { if (e && e.name === 'AbortError') throw e; throw new Error('rede') } // fetch só rejeita por rede
  }
  let r = await buscar()
  if (!r.ok && !PUBLICOS.has(f.bucket) && [400, 401, 403].includes(r.status)) r = await buscar() // URL vencida: renova uma vez
  if (!r.ok) throw new Error('download_' + r.status)
  const blob = await r.blob()
  const tipo = (blob.type && blob.type !== 'application/octet-stream' ? blob.type : '') || mime || 'application/octet-stream'
  return new File([blob], nomeArquivo(nome, tipo, f.path), { type: tipo })
}
/** Baixa um arquivo (original) direto, na mesma aba. Não é publicação. Devolve o File entregue. */
export async function baixarArquivo(x, nome, opcoes = {}) {
  const arq = await obterArquivo(x, nome, opcoes)
  entregar(arq)
  return arq
}

function esperar(el, evento, ms) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => { limpar(); falha(new Error('tempo')) }, ms)
    const fim = () => { limpar(); ok() }
    const erro = () => { limpar(); falha(new Error('erro')) }
    function limpar() { clearTimeout(t); el.removeEventListener(evento, fim); el.removeEventListener('error', erro) }
    el.addEventListener(evento, fim, { once: true })
    el.addEventListener('error', erro, { once: true })
  })
}

// Miniatura própria para o calendário: lado maior 480 px, sem recorte.
async function desenharMiniatura(fonte, w, h) {
  if (!w || !h) return null
  const k = Math.min(1, 480 / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * k))
  c.height = Math.max(1, Math.round(h * k))
  c.getContext('2d').drawImage(fonte, 0, 0, c.width, c.height)
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/webp', 0.82))
  if (blob && blob.type === 'image/webp') return blob
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82)) // Safari antigo não gera webp
}

/**
 * Confere e lê o arquivo antes de subir: tipo, tamanho, assinatura dos
 * primeiros bytes e — para imagem — se ela de fato abre (arquivo corrompido
 * não abre). Vídeo que este navegador não decodifica sobe sem prévia.
 */
export async function prepararArquivo(file) {
  const cabecalho = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const v = validarArquivo({ nome: file.name, tipo: file.type, tamanho: file.size, cabecalho })
  if (!v.ok) throw new Error(v.erro)
  if (v.mime.startsWith('image/')) {
    let bmp
    try { bmp = await createImageBitmap(file) } catch { throw new Error('A imagem não abriu: o arquivo parece corrompido.') }
    const r = { ...v, largura: bmp.width, altura: bmp.height, duracao: null, miniatura: await desenharMiniatura(bmp, bmp.width, bmp.height) }
    if (bmp.close) bmp.close()
    return r
  }
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.preload = 'metadata'
  video.src = url
  try {
    await esperar(video, 'loadedmetadata', 10000)
    const r = { ...v, largura: video.videoWidth || null, altura: video.videoHeight || null, duracao: isFinite(video.duration) ? Math.round(video.duration * 10) / 10 : null, miniatura: null }
    try {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2)
      await esperar(video, 'seeked', 6000)
      r.miniatura = await desenharMiniatura(video, video.videoWidth, video.videoHeight)
    } catch { /* sem quadro: o calendário mostra o ícone do formato */ }
    return r
  } catch {
    return { ...v, largura: null, altura: null, duracao: null, miniatura: null, semPrevia: true }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function enviarPut(url, corpo, aoProgredir) {
  return new Promise((ok, falha) => {
    const x = new XMLHttpRequest()
    x.open('PUT', url)
    x.upload.onprogress = (e) => { if (e.lengthComputable && aoProgredir) aoProgredir(e.loaded / e.total) }
    x.onload = () => (x.status >= 200 && x.status < 300 ? ok() : falha(new Error('O envio falhou (HTTP ' + x.status + '). Tente de novo.')))
    x.onerror = () => falha(new Error('Sem conexão durante o envio. Tente de novo.'))
    x.send(corpo)
  })
}

/**
 * Sobe o arquivo (e a miniatura) e registra na publicação. `substitui` = id
 * do arquivo que esta versão substitui (a anterior fica guardada).
 * Falha em qualquer passo = nada registrado; tentar de novo recomeça com
 * caminhos novos (objeto órfão no bucket privado não aparece em lugar nenhum).
 */
// Envio em andamento fica declarado (lib/pendencias): atualizar o painel no meio interromperia.
export const enviarArquivo = (postId, file, prep, opcoes) => comEnvio('Envio de “' + ((file && file.name) || 'arquivo') + '”', () => enviarArquivoAgora(postId, file, prep, opcoes))
async function enviarArquivoAgora(postId, file, prep, { substitui = null, aoProgredir, biblioteca = null } = {}) {
  // Biblioteca (designer): a "pasta" é um lote novo; o registro é outro.
  if (biblioteca) postId = crypto.randomUUID()
  const path = caminhoArquivo(postId, crypto.randomUUID(), prep.ext)
  const assinatura = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'subir', bucket: 'redes', path })
  await enviarPut(assinatura.url, new Blob([file], { type: prep.mime }), aoProgredir)
  let miniatura = null
  if (prep.miniatura) {
    try {
      const mp = caminhoArquivo(postId, crypto.randomUUID(), prep.miniatura.type === 'image/webp' ? 'webp' : 'jpg')
      const a2 = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'subir', bucket: 'redes', path: mp })
      await enviarPut(a2.url, prep.miniatura)
      miniatura = mp
    } catch { miniatura = null } // sem miniatura o calendário usa o ícone do formato
  }
  const dados = { path, miniatura_path: miniatura, nome: file.name, mime: prep.mime, tamanho: file.size, largura: prep.largura, altura: prep.altura, duracao: prep.duracao }
  if (biblioteca) return rpc('social_biblioteca_registrar', { p_secret: lerSenha(), p_dados: { ...dados, ...biblioteca } })
  return rpc('redes_arquivo_registrar', { p_secret: lerSenha(), p_post: postId, p_substitui: substitui, p_dados: dados })
}
