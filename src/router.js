import React from 'react'
import { trackPageView } from './lib/analytics'
import { applyPageMeta } from './lib/pageMeta'

export function useRoute() {
  // Hash-first: preserva TODAS as rotas de QR Codes impressos (#/lovers/...).
  // Sem hash, usa o pathname — habilita links limpos como /mapa (ver rewrites em vercel.json).
  const parse = () => {
    const hash = window.location.hash.replace(/^#/, '')
    if (hash) return hash
    return window.location.pathname || '/'
  }
  const [path, setPath] = React.useState(parse)
  React.useEffect(() => {
    applyPageMeta(parse())
    trackPageView() // page_view da carga inicial (só envia se já houver consentimento)
    const onChange = () => {
      const next = parse()
      setPath(next); window.scrollTo({ top: 0 })
      applyPageMeta(next) // título correto ANTES do page_view
      trackPageView()
    }
    window.addEventListener('hashchange', onChange)
    window.addEventListener('popstate', onChange)
    return () => {
      window.removeEventListener('hashchange', onChange)
      window.removeEventListener('popstate', onChange)
    }
  }, [])
  const navigate = React.useCallback((to) => {
    window.location.hash = '#' + (to.startsWith('/') ? to : '/' + to)
  }, [])
  return [path, navigate]
}
