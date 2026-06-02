// GA4 + Consent Mode (LGPD). O gtag é inicializado em index.html.
// Nada é enviado ao Google enquanto o usuário não aceitar no banner de cookies.

const CONSENT_KEY = 'scw_consent'

function gtag(...args) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag(...args)
}

export function getConsent() {
  try { return localStorage.getItem(CONSENT_KEY) } catch (e) { return null }
}

export function hasConsent() {
  return getConsent() === 'granted'
}

export function grantConsent() {
  try { localStorage.setItem(CONSENT_KEY, 'granted') } catch (e) {}
  gtag('consent', 'update', { analytics_storage: 'granted' })
  // Registra o page_view da rota atual imediatamente após o aceite.
  trackPageView()
}

export function denyConsent() {
  try { localStorage.setItem(CONSENT_KEY, 'denied') } catch (e) {}
  gtag('consent', 'update', { analytics_storage: 'denied' })
}

function currentPath() {
  const hash = window.location.hash.replace(/^#/, '')
  return hash || window.location.pathname || '/'
}

let lastPath = null

export function trackPageView(path) {
  if (!hasConsent()) return
  const p = path || currentPath()
  if (p === lastPath) return // evita page_view duplicado (hashchange + popstate, remount)
  lastPath = p
  gtag('event', 'page_view', {
    page_path: p,
    page_location: window.location.href,
    page_title: document.title,
  })
}

export function trackEvent(name, params = {}) {
  if (!hasConsent()) return
  gtag('event', name, params)
}
