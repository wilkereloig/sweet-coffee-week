/*
 * Google Analytics 4 — carregado SÓ depois do aceite (13/10/2026).
 *
 * Antes desta revisão o gtag.js vinha no index.html para todo visitante e, com
 * o Consent Mode em "denied", ainda mandava pings sem cookie para
 * google-analytics.com/g/collect na primeira visita. Agora:
 *
 *   sem escolha válida ou recusa → nenhum script do Google Analytics, nenhum
 *     dataLayer, nenhum evento guardado para depois, cookies _ga removidos;
 *   aceite → o script entra uma vez, o consentimento é declarado ANTES do
 *     config (análise sim; anúncio, dados de anúncio e personalização não),
 *     e a página atual é registrada uma vez;
 *   revogação → `ga-disable-<ID>` (opt-out oficial do gtag) corta qualquer envio
 *     na hora, o script pendente é descartado e os cookies _ga saem. Preferência
 *     e sessões do painel ficam intactas.
 *
 * O que vai ao Google: endereço da página reduzido à rota conhecida (sem
 * consulta, sem fragmento livre) + utm_* de campanha, e o título da página.
 * O endereço limpo é fixado com `gtag('set')` a cada troca, então vale também
 * para os eventos automáticos da ferramenta (rolagem, clique de saída), que
 * sem isso levariam o endereço cru. Nenhum evento próprio com dado de
 * formulário, nome, e-mail, telefone ou token.
 *
 * Os cookies _ga duram o mesmo que a escolha (VALIDADE_DIAS): nunca
 * sobrevivem a ela. Escolha vencida → `desativar()` apaga os que sobraram.
 */
import { analisePermitida, aoMudar, VALIDADE_DIAS } from './consentimento.js'

export const GA_ID = 'G-FM5ZJXL3MV'
const SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
const DESLIGA = `ga-disable-${GA_ID}`

/* Rotas que existem. Qualquer outra coisa vira "/" — um caminho estranho pode
   carregar texto digitado por alguém, e não vai para relatório nenhum. */
const ROTAS = ['edicoes', 'sweet-awards', 'historico-sweet-awards', 'participar', 'apoiar', 'contato', 'privacidade', 'cookies', 'termos']
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

let ativo = false
let script = null
let ultimaRota = null

function gtag () {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag(...arguments)
}

/** Rota limpa a partir do hash ou do caminho. Pura, testada. */
export function rotaLimpa (hash = '', pathname = '/') {
  const bruto = (hash.replace(/^#/, '') || pathname || '/').split(/[?#]/)[0]
  const primeiro = bruto.split('/').filter(Boolean)[0] || ''
  return ROTAS.includes(primeiro) ? `/${primeiro}` : '/'
}

/** page_location só com origem, rota conhecida e utm_* permitidos. Pura. */
export function enderecoLimpo (origem, rota, search = '') {
  const q = new URLSearchParams(search)
  const fica = new URLSearchParams()
  for (const k of UTM) {
    const v = q.get(k)
    if (v && /^[\w.\- ]{1,60}$/.test(v)) fica.set(k, v)
  }
  const qs = fica.toString()
  return `${origem}${rota}${qs ? `?${qs}` : ''}`
}

function rotaAtual () {
  return rotaLimpa(window.location.hash, window.location.pathname)
}

function enderecoAtual () {
  return {
    page_location: enderecoLimpo(window.location.origin, rotaAtual(), window.location.search),
    page_title: document.title,
  }
}

function ativar () {
  if (typeof window === 'undefined' || !analisePermitida()) return
  window[DESLIGA] = false
  if (ativo) return
  ativo = true

  if (typeof window.gtag !== 'function') {
    window.dataLayer = window.dataLayer || []
    window.gtag = function () { window.dataLayer.push(arguments) }
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    })
    gtag('js', new Date())
    gtag('set', enderecoAtual())
    gtag('config', GA_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: VALIDADE_DIAS * 24 * 60 * 60,
    })
  } else {
    gtag('consent', 'update', { analytics_storage: 'granted' })
  }

  if (!script && !document.querySelector(`script[src="${SRC}"]`)) {
    const el = document.createElement('script')
    el.async = true
    el.src = SRC
    el.onload = () => { el.dataset.carregado = '1' }
    document.head.appendChild(el)
    script = el
  }

  ultimaRota = null
  trackPageView()
}

function desativar () {
  if (typeof window === 'undefined') return
  window[DESLIGA] = true
  if (ativo) gtag('consent', 'update', { analytics_storage: 'denied' })
  ativo = false
  // Script pedido e ainda não executado: sai da página antes de rodar.
  if (script && !script.dataset.carregado) {
    script.remove()
    script = null
    // A fila também sai: o próximo aceite começa limpo, sem nada acumulado.
    delete window.gtag
    window.dataLayer = []
  }
  removerCookiesAnalise()
}

/** Apaga só os cookies do Google Analytics (_ga, _ga_<contêiner>, _gid, _gat*). */
export function removerCookiesAnalise () {
  if (typeof document === 'undefined') return
  const nomes = document.cookie.split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((n) => /^(_ga(_[A-Z0-9]+)?|_gid|_gat(_.*)?)$/.test(n))
  if (!nomes.length) return
  const partes = window.location.hostname.split('.')
  const dominios = ['']
  for (let i = 0; i < partes.length - 1; i++) dominios.push(`; domain=.${partes.slice(i).join('.')}`)
  for (const n of nomes) {
    for (const d of dominios) document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`
  }
}

export function trackPageView () {
  if (!ativo || !analisePermitida()) return
  const rota = rotaAtual()
  if (rota === ultimaRota) return // hashchange + popstate na mesma troca
  ultimaRota = rota
  const endereco = enderecoAtual()
  gtag('set', endereco)
  gtag('event', 'page_view', endereco)
}

/** Chamado uma vez pelo App: liga se já houver aceite válido e segue a escolha. */
let iniciado = false
export function iniciarAnalytics () {
  if (iniciado || typeof window === 'undefined') return
  iniciado = true
  if (analisePermitida()) ativar()
  else desativar()
  aoMudar((p) => (p && p.analise ? ativar() : desativar()))
}
