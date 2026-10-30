/*
 * /q/<código> — leitura de QR impresso (plano docs/cartoon-2026-2/12-plano-qr-leituras.md).
 *
 * Soma 1 no contador da peça (RPC registrar_leitura_qr) e redireciona 302 na hora.
 * ⛔ NUNCA deixa o QR impresso quebrar: banco fora, lento ou código estranho → redireciona do
 * mesmo jeito, pela regra do próprio código (src/edicao/qrPontos.js).
 *
 * Privacidade: não guarda IP nem cookie. Só país/região/cidade aproximados (cabeçalhos
 * x-vercel-ip-*, que a Vercel já manda), tipo de aparelho e se parece robô — somados por hora.
 *
 * A Vercel entrega /q/:codigo aqui pelo rewrite do vercel.json (/api/q?c=:codigo).
 */
import { SUPABASE_URL, SUPABASE_KEY } from '../src/lib/supabaseConfig.js'
import { EDICAO } from '../src/edicao/config.js'
import { normalizarCodigo, destinoDoCodigo } from '../src/edicao/qrPontos.js'

export const config = { runtime: 'edge' }

const LIMITE_MS = 1000
// Robôs de pré-visualização e verificadores de link. Lista curta de propósito: robô novo conta como
// pessoa até alguém acrescentar o nome aqui.
const ROBO = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|slack|discord|preview|embedly|curl|wget|python-requests|httpclient|headless|lighthouse/i
// Destino vindo do banco: só caminho do próprio site ("/x"). Nunca "//host", "https://…" nem barra invertida.
const CAMINHO = /^\/(?!\/)[^\s\\]*$/

const aparelho = (ua) => (/iphone|ipad|ipod/i.test(ua) ? 'ios' : /android/i.test(ua) ? 'android' : 'outro')

// A Vercel manda a cidade com percent-encoding ("S%C3%A3o%20Gon%C3%A7alo").
function cabecalho (request, nome) {
  const v = request.headers.get(nome) ?? ''
  try { return decodeURIComponent(v) } catch { return v }
}

function codigoDoPedido (url) {
  const p = url.searchParams
  return normalizarCodigo(p.get('c') ?? p.get('codigo') ?? url.pathname.split('/').filter(Boolean).pop())
}

// Devolve o destino manual do ponto (um caminho) ou null. Nunca lança.
async function registrar (fetchImpl, limiteMs, corpo) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), limiteMs)
  try {
    const r = await fetchImpl(`${SUPABASE_URL}/rest/v1/rpc/registrar_leitura_qr`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: ctl.signal,
    })
    if (!r.ok) return null
    const manual = await r.json()
    return typeof manual === 'string' && CAMINHO.test(manual) ? manual : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function redirecionar (request, destino, codigo) {
  const origem = new URL(request.url).origin
  const alvo = new URL(destino, origem)
  const url = alvo.origin === origem ? alvo : new URL(EDICAO.caminho, origem) // cinto e suspensório
  url.searchParams.set('utm_source', 'qr')
  url.searchParams.set('utm_medium', 'impresso')
  url.searchParams.set('utm_campaign', EDICAO.tema.toLowerCase())
  if (codigo) url.searchParams.set('utm_content', codigo)
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString(), 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })
}

// `fetchImpl` e `limiteMs` existem para o teste; em produção ninguém passa o segundo argumento.
export async function responder (request, { fetchImpl = fetch, limiteMs = LIMITE_MS } = {}) {
  const codigo = codigoDoPedido(new URL(request.url))
  let destino = destinoDoCodigo(codigo)
  if (codigo) {
    const ua = request.headers.get('user-agent') ?? ''
    const robo = request.method === 'HEAD' || !ua || ROBO.test(ua) || /prefetch/i.test(request.headers.get('sec-purpose') ?? '')
    const manual = await registrar(fetchImpl, limiteMs, {
      p_codigo: codigo,
      p_pais: cabecalho(request, 'x-vercel-ip-country'),
      p_regiao: cabecalho(request, 'x-vercel-ip-country-region'),
      p_cidade: cabecalho(request, 'x-vercel-ip-city'),
      p_aparelho: aparelho(ua),
      p_robo: robo,
    })
    if (manual) destino = manual
  }
  return redirecionar(request, destino, codigo)
}

export default (request) => responder(request)
