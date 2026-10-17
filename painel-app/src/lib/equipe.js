/*
 * Equipe no painel (17/10/2026): quem é cada conta, a foto de perfil e quem
 * está usando o painel agora. A parte pura (autor, iniciais, recorte, foto)
 * é testada em tests/painel-app-equipe.test.mjs; o banco é a migration
 * supabase/migrations/20261017_equipe_perfis_avisos.sql.
 *
 * ⚠️ Autoria é do SERVIDOR: cada registro guarda o id da sessão + o nome do
 *    momento. Aqui só se DESENHA — o id encontra a foto atual no diretório; o
 *    nome mostrado é o gravado (renomear depois não reescreve o histórico).
 * ⚠️ Avatar da equipe ≠ logo do participante (LogoMarca, lib/logos.js).
 */
import React from 'react'
import { rpc, chamarFuncao } from './rpc.js'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess.js'
import { iniciais } from './logos.js'
import { assinaturaConfere } from './redes.js'
import { enviarPut, useUrlsAssinadas } from './redesArquivos.js'

export { iniciais }
const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }

export const ROTULO_COMPARTILHADO = 'Acesso compartilhado'
const COMPARTILHADOS = new Set(['', ROTULO_COMPARTILHADO, 'senha-compartilhada', 'senha da organização', 'organização'])

/**
 * Que tipo de autor é este registro? `pessoa` (conta nominal, com id),
 * `marca` (o próprio participante), `compartilhado` (senha do painel, sem
 * pessoa) ou `sistema` (importação, rotina) — nunca se atribui um registro
 * antigo sem id a uma pessoa.
 */
export function tipoAutor(id, rotulo) {
  const r = String(rotulo || '').trim()
  if (r.startsWith('Marca ·')) return 'marca'
  if (id) return 'pessoa'
  if (COMPARTILHADOS.has(r)) return 'compartilhado'
  return 'sistema'
}

/** Nome a mostrar: o gravado no registro; sem ele, o do diretório; sem os dois, honesto. */
export function nomeAutor(id, rotulo, pessoa) {
  const r = String(rotulo || '').trim()
  const t = tipoAutor(id, r)
  if (t === 'compartilhado') return ROTULO_COMPARTILHADO
  if (r && r !== 'senha-compartilhada') return r
  if (pessoa && pessoa.nome) return pessoa.nome
  return t === 'sistema' ? 'Sistema' : 'Conta removida'
}

// ── Foto de perfil ──────────────────────────────────────────────────────────
export const FOTO_ENTRADA_MAX = 15 * 1024 * 1024 // o que a pessoa pode escolher
export const FOTO_SAIDA_MAX = 2 * 1024 * 1024 // o que o bucket `equipe` aceita
export const FOTO_LADO = 512
const TIPOS_FOTO = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** Antes de abrir: tipo, tamanho e os primeiros bytes (arquivo renomeado não passa). */
export function validarFoto({ tipo, tamanho, cabecalho }) {
  if (!TIPOS_FOTO[tipo]) return { ok: false, erro: 'Use uma foto JPG, PNG ou WEBP.' }
  if (!tamanho) return { ok: false, erro: 'Arquivo vazio.' }
  if (tamanho > FOTO_ENTRADA_MAX) return { ok: false, erro: 'Foto acima de 15 MB. Escolha uma menor.' }
  if (cabecalho && !assinaturaConfere(cabecalho, tipo)) return { ok: false, erro: 'O conteúdo não é a imagem que a extensão diz (arquivo renomeado ou corrompido).' }
  return { ok: true }
}

/**
 * Enquadramento: um quadrado dentro da foto, sem esticar. `zoom` ≥ 1 (1 = o
 * maior quadrado que cabe); `x`/`y` de −1 a 1 movem o quadrado até a borda.
 * Devolve o recorte em pixels da foto original.
 */
export function areaRecorte(largura, altura, { zoom = 1, x = 0, y = 0 } = {}) {
  const z = Math.min(4, Math.max(1, Number(zoom) || 1))
  const lado = Math.min(largura, altura) / z
  const lim = (v) => Math.min(1, Math.max(-1, Number(v) || 0))
  const sx = (largura - lado) / 2 * (1 + lim(x))
  const sy = (altura - lado) / 2 * (1 + lim(y))
  return { sx: Math.round(sx), sy: Math.round(sy), lado: Math.round(lado) }
}

/** Caminho no bucket `equipe`: <user_id>/<uuid>.<ext> — mesma regra do CHECK e da Edge Function. */
export const caminhoFoto = (userId, uuid, ext) => userId + '/' + uuid + '.' + ext

/** Recorta e reduz para FOTO_LADO px (webp; jpg onde o navegador não gera webp). */
export async function gerarFoto(bitmap, enquadramento) {
  const { sx, sy, lado } = areaRecorte(bitmap.width, bitmap.height, enquadramento)
  const saida = Math.min(FOTO_LADO, lado)
  const c = document.createElement('canvas')
  c.width = saida
  c.height = saida
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, saida, saida)
  let blob = await new Promise((ok) => c.toBlob(ok, 'image/webp', 0.9))
  if (!blob || blob.type !== 'image/webp') blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9))
  if (!blob) throw new Error('Não deu para gerar a foto neste navegador.')
  if (blob.size > FOTO_SAIDA_MAX) throw new Error('A foto recortada ficou grande demais. Tente outra imagem.')
  return blob
}

/** Abre a foto escolhida (imagem que não decodifica = corrompida). */
export async function abrirFoto(file) {
  const cabecalho = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const v = validarFoto({ tipo: file.type, tamanho: file.size, cabecalho })
  if (!v.ok) throw new Error(v.erro)
  try { return await createImageBitmap(file) } catch { throw new Error('A imagem não abriu: o arquivo parece corrompido.') }
}

/**
 * Sobe a foto e grava no perfil. `alvo` = id da conta (a própria ou, com
 * acesso.gerir, a de outra pessoa). A Edge Function só assina a pasta do
 * próprio JWT — a não ser para quem gere a equipe —, e o banco confere o
 * objeto antes de apontar o perfil para ele. A foto anterior não é apagada.
 */
export async function enviarFoto(alvo, blob, { proprio = false } = {}) {
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = caminhoFoto(alvo, crypto.randomUUID(), ext)
  const a = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'subir', bucket: 'equipe', path })
  await enviarPut(a.url, blob)
  return rpc('perfil_foto_definir', { p_secret: lerSenha(), p_user: proprio ? null : alvo, p_path: path })
}

export function removerFoto(alvo, { proprio = false } = {}) {
  return rpc('perfil_foto_remover', { p_secret: lerSenha(), p_user: proprio ? null : alvo })
}

// ── Diretório e "eu" ────────────────────────────────────────────────────────
export const EquipeContexto = React.createContext({ pessoas: {}, eu: null, carregado: false, recarregar: () => {}, fotos: null })
export const useEquipe = () => React.useContext(EquipeContexto)

/**
 * Carrega o diretório (toda conta da organização, inclusive desativada — é o
 * que identifica o histórico antigo) e o próprio perfil (só conta nominal).
 * Uma leitura por painel aberto; recarrega ao trocar a própria foto/nome.
 */
export function useCarregarEquipe(nominal) {
  const [estado, setEstado] = React.useState({ pessoas: {}, eu: null, carregado: false })
  const recarregar = React.useCallback(async () => {
    const [dir, eu] = await Promise.all([
      rpc('equipe_diretorio', { p_secret: lerSenha() }).catch(() => null),
      nominal ? rpc('meu_perfil', {}).catch(() => null) : Promise.resolve(null),
    ])
    setEstado({
      pessoas: Object.fromEntries((Array.isArray(dir) ? dir : []).map((p) => [p.user_id, p])),
      eu: eu && eu.user_id ? eu : null,
      carregado: true,
    })
  }, [nominal])
  React.useEffect(() => { recarregar() }, [recarregar])
  // Todas as fotos do diretório numa assinatura só (bucket privado `equipe`).
  const fotos = useUrlsAssinadas(Object.values(estado.pessoas).map((p) => p.avatar_path).filter(Boolean)
    .map((path) => ({ bucket: 'equipe', path })), 'equipe')
  return React.useMemo(() => ({ ...estado, recarregar, fotos }), [estado, recarregar, fotos])
}
