import React from 'react'
import { useRoute } from './router'
import { applyPalette } from './theme'
import { SiteHeader } from './components/nav'
import { DevViewportSwitcher } from './DevTools'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CookieConsent } from './components/CookieConsent'

import { HomePage }         from './pages/institutional/Home'
import { EdicoesPage }      from './pages/institutional/Edicoes'
import { CuriosidadesPage } from './pages/institutional/Curiosidades'
import { ParticiparPage }   from './pages/institutional/Participar'
import { ApoiarPage }       from './pages/institutional/Apoiar'
import { ContatoPage }      from './pages/institutional/Contato'
import { AgradecimentoPage } from './pages/institutional/Agradecimento'
import { PainelPage }       from './pages/lovers/Painel'

// A edição Lovers foi encerrada e suas páginas públicas removidas. As rotas antigas
// (incluindo QR Codes impressos: /lovers/combos/:slug, /lovers/awards, e os aliases
// limpos /mapa, /premiacao, /participantes) são encaminhadas para a home.
// EXCEÇÃO: o painel admin do Sweet Awards segue acessível em #/lovers/painel
// para consultar e exportar a votação (dados preservados no Supabase).
// Publicação temporária focada em Awards: enquanto true, todo o site público
// renderiza só a página de vencedores (/vencedores e alias /premiacao). O painel
// interno (/lovers/painel) continua acessível, mas fora de qualquer menu/header.
const AWARDS_ONLY_PUBLICATION = false

const LEGACY_LOVERS_PATHS = ['/mapa', '/rota', '/participantes']
function isLegacyLoversPath(path) {
  if (path.startsWith('/lovers/painel')) return false
  return /^\/lovers(\/|$)/.test(path) || LEGACY_LOVERS_PATHS.includes(path)
}

export default function App() {
  const [path, navigate] = useRoute()

  React.useEffect(() => { applyPalette() }, [])

  React.useEffect(() => {
    if (isLegacyLoversPath(path)) navigate('/')
  }, [path, navigate])

  const route = (() => {
    // Painel interno segue acessível mesmo em modo Awards-only (não aparece em menu).
    if (path.startsWith('/lovers/painel')) return 'painel'
    // Modo Awards-only: qualquer rota pública renderiza a página de vencedores.
    if (AWARDS_ONLY_PUBLICATION) return 'vencedores'
    if (path === '/' || path === '') return 'home'
    if (path.startsWith('/vencedores'))   return 'vencedores'
    if (path.startsWith('/premiacao'))    return 'vencedores'
    if (path.startsWith('/edicoes'))      return 'edicoes'
    if (path.startsWith('/curiosidades')) return 'curiosidades'
    if (path.startsWith('/participar'))   return 'participar'
    if (path.startsWith('/apoiar'))       return 'apoiar'
    if (path.startsWith('/contato'))      return 'contato'
    if (path.startsWith('/lovers/painel')) return 'painel'
    return 'home'
  })()

  let page
  switch (route) {
    case 'home':         page = <HomePage navigate={navigate} />; break
    case 'edicoes':      page = <EdicoesPage navigate={navigate} />; break
    case 'curiosidades': page = <CuriosidadesPage navigate={navigate} />; break
    case 'participar':   page = <ParticiparPage navigate={navigate} />; break
    case 'apoiar':       page = <ApoiarPage navigate={navigate} />; break
    case 'contato':      page = <ContatoPage navigate={navigate} />; break
    case 'vencedores':   page = <AgradecimentoPage navigate={navigate} />; break
    case 'painel':       page = <PainelPage navigate={navigate} />; break
    default:             page = <HomePage navigate={navigate} />
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
