/*
 * Logo oficial do participante (29/09/2026) — lógica pura, testada em
 * tests/painel-app-logos.test.mjs. Quem sobe e grava são as telas; aqui só se
 * decide tipo, tamanho, nome do arquivo, URL de exibição e iniciais.
 */
import { SUPABASE_URL } from './rpc.js'

// Exibição (vai para <img>) e versão vetorial (guardada, não exibida).
export const TIPOS_EXIBICAO = { svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg' }
export const TIPOS_VETOR = { pdf: 'application/pdf', eps: 'application/postscript', ai: 'application/illustrator', svg: 'image/svg+xml' }
export const ACEITA_EXIBICAO = '.svg,.png,.webp,.jpg,.jpeg,image/svg+xml,image/png,image/webp,image/jpeg'
export const ACEITA_VETOR = '.pdf,.eps,.ai,.svg'
export const LIMITE_BYTES = 10 * 1024 * 1024
// Abaixo disso a logo não serve para peça gráfica (print de rede social, foto).
export const LADO_MINIMO = 500

export function extensao(nome) {
  const m = /\.([a-z0-9]+)$/i.exec(String(nome || ''))
  return m ? m[1].toLowerCase() : ''
}

/**
 * Valida o arquivo de EXIBIÇÃO. `largura`/`altura` só existem para raster
 * (lidas pela tela); `textoSvg` é o conteúdo do SVG.
 * @returns {string|null} a frase de erro, ou null se serve
 */
export function validarLogo({ nome, tamanho, largura, altura, textoSvg } = {}) {
  const ext = extensao(nome)
  if (!TIPOS_EXIBICAO[ext]) return 'Formato não aceito. Envie SVG, PNG, WEBP ou JPG (PDF, EPS e AI vão no campo da versão vetorial).'
  if (Number(tamanho) > LIMITE_BYTES) return 'Arquivo maior que 10 MB.'
  if (ext === 'svg') {
    // SVG com código embutido não entra: a logo é exibida para todo mundo.
    if (/<script|\son[a-z]+\s*=|javascript:/i.test(String(textoSvg || ''))) return 'Esse SVG tem código embutido. Exporte de novo, só com o desenho.'
    return null
  }
  const lado = Math.max(Number(largura) || 0, Number(altura) || 0)
  if (lado && lado < LADO_MINIMO) return 'Imagem pequena demais (' + lado + 'px). Envie em alta resolução: pelo menos ' + LADO_MINIMO + 'px no lado maior, ou SVG.'
  return null
}

export function validarVetor({ nome, tamanho } = {}) {
  if (!TIPOS_VETOR[extensao(nome)]) return 'A versão vetorial precisa ser PDF, EPS, AI ou SVG.'
  if (Number(tamanho) > LIMITE_BYTES) return 'Arquivo maior que 10 MB.'
  return null
}

/** Caminho no bucket `logos`: `<participante>/<carimbo>-<sufixo>.<ext>` (nunca por cima de outro). */
export function caminhoLogo(participanteId, nome, sufixo = 'logo', agora = Date.now()) {
  return participanteId + '/' + agora.toString(36) + '-' + sufixo + '.' + extensao(nome)
}

export function mimeDe(nome, vetor = false) {
  const ext = extensao(nome)
  return (vetor ? TIPOS_VETOR[ext] : TIPOS_EXIBICAO[ext]) || 'application/octet-stream'
}

/** URL de exibição: acervo do site (caminho que começa com /) ou bucket público. */
export function urlLogo(path) {
  if (!path) return null
  if (path.startsWith('/')) return path
  return SUPABASE_URL + '/storage/v1/object/public/logos/' + path.split('/').map(encodeURIComponent).join('/')
}

// Iniciais para quando não há logo: as duas primeiras palavras que contam.
const MIUDAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'o', 'a', '&', '-'])
export function iniciais(nome) {
  const palavras = String(nome || '').trim().split(/\s+/).filter((p) => p && !MIUDAS.has(p.toLowerCase()))
  const i = palavras.slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  return i || '?'
}

// Estado vindo do banco (logo_info) → rótulo e tom (lib/status.js, domínio `logo`).
export const ESTADOS_LOGO = ['confirmada', 'anterior', 'acervo', 'nao_enviada']

/** Estado da logo a partir de uma linha de get_logos ({ path, confirmada, sugestao }). */
export function estadoLogoLista(l) {
  if (!l) return 'nao_enviada'
  if (l.confirmada) return 'confirmada'
  if (l.path) return 'anterior'
  if (l.sugestao) return 'acervo'
  return 'nao_enviada'
}
