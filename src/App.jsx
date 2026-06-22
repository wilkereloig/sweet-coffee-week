import React from 'react'
import { useRoute } from './router'
import { applyPalette } from './theme'
import { SiteHeader } from './components/nav'
import { DevViewportSwitcher } from './DevTools'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CookieConsent } from './components/CookieConsent'

import { AgradecimentoPage } from './pages/institutional/Agradecimento'
import { HomePage }         from './pages/institutional/Home'
import { CuriosidadesPage } from './pages/institutional/Curiosidades'
import { EdicoesPage }      from './pages/institutional/Edicoes'
import { ParticiparPage }   from './pages/institutional/Participar'
import { ApoiarPage }       from './pages/institutional/Apoiar'
import { ContatoPage }      from './pages/institutional/Contato'

// Rotas antigas da edição Lovers (incluindo QR Codes impressos #/lovers/...).
// A edição foi encerrada: redirecionam para a home (página de vencedores).
const LEGACY_LOVERS_PATHS = ['/mapa', '/rota', '/participantes', '/premiacao']
function isLegacyLoversPath(path) {
  return /^\/lovers(\/|$)/.test(path) || LEGACY_LOVERS_PATHS.includes(path)
}

export default function App() {
  const [path, navigate] = useRoute()

  React.useEffect(() => { applyPalette() }, [])

  // Encaminha rotas antigas da Lovers (e QR Codes impressos) para a home.
  React.useEffect(() => {
    if (isLegacyLoversPath(path)) navigate('/')
  }, [path, navigate])

  const route = (() => {
    if (path === '/' || path === '') return 'home'
    if (path.startsWith('/vencedores')) return 'vencedores'
    if (path.startsWith('/o-sweet'))    return 'o-sweet'
    if (path.startsWith('/curiosidades')) return 'curiosidades'
    if (path.startsWith('/participar'))   return 'participar'
    if (path.startsWith('/apoiar'))       return 'apoiar'
    if (path.startsWith('/edicoes'))      return 'edicoes'
    if (path.startsWith('/contato'))      return 'contato'
    return 'home'
  })()

  let page
  switch (route) {
    case 'home':
    case 'vencedores':   page = <AgradecimentoPage navigate={navigate} />; break
    case 'o-sweet':      page = <HomePage navigate={navigate} />; break
    case 'curiosidades': page = <CuriosidadesPage navigate={navigate} />; break
    case 'edicoes':      page = <EdicoesPage navigate={navigate} />; break
    case 'participar':   page = <ParticiparPage navigate={navigate} />; break
    case 'apoiar':       page = <ApoiarPage navigate={navigate} />; break
    case 'contato':      page = <ContatoPage navigate={navigate} />; break
    default:             page = <AgradecimentoPage navigate={navigate} />
  }

  React.useEffect(() => {
    const cls = `route-${route}`
    document.body.classList.add(cls)
    return () => document.body.classList.remove(cls)
  }, [route])

  return (
    <DevViewportSwitcher>
      <SiteHeader route={route} navigate={navigate} path={path} />
      <main key={route} className="page-enter">
        <ErrorBoundary key={route}>{page}</ErrorBoundary>
      </main>
      <CookieConsent />
    </DevViewportSwitcher>
  )
}
