import React from 'react'
import { useRoute } from './router'
import { applyPalette } from './theme'
import { SiteHeader } from './components/nav'
import { DevViewportSwitcher } from './DevTools'


import { HomePage }        from './pages/institutional/Home'
import { EdicoesPage }     from './pages/institutional/Edicoes'
import { CuriosidadesPage } from './pages/institutional/Curiosidades'
import { ParticiparPage }  from './pages/institutional/Participar'
import { ApoiarPage }      from './pages/institutional/Apoiar'
import { ContatoPage }     from './pages/institutional/Contato'

import { ComingSoonPage } from './pages/ComingSoon'
import { LoversPage }     from './pages/lovers/Hub'
import { ComboPage }      from './pages/lovers/Combos'
import { ComboDetailPage } from './pages/lovers/ComboDetail'
import { MapaPage }       from './pages/lovers/Mapa'
import { AwardsPage }     from './pages/lovers/Awards'

// Internal Lovers pages stay locked in production unless VITE_ENABLE_LOVERS_INTERNAL_PAGES=true or localhost uses devLovers=true.
const isLocalHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname)

const hasDevLoversParam =
  typeof window !== 'undefined' &&
  (
    window.location.search.includes('devLovers=true') ||
    window.location.hash.includes('devLovers=true')
  )

const ENABLE_LOVERS_INTERNAL_PAGES =
  import.meta.env.VITE_ENABLE_LOVERS_INTERNAL_PAGES === 'true' ||
  (isLocalHost && hasDevLoversParam)

function LoversDevNav({ navigate, route }) {
  if (!ENABLE_LOVERS_INTERNAL_PAGES) return null

  const items = [
    { label: 'Sobre',   path: '/lovers',                               match: 'lovers'       },
    { label: 'Combos',  path: '/lovers/combos',                        match: 'combos'       },
    { label: 'Mapa',    path: '/lovers/mapa',                          match: 'mapa'         },
    { label: 'Awards',  path: '/lovers/awards',                        match: 'awards'       },
    { label: 'Detalhe', path: '/lovers/combos/preview-combo-memorias', match: 'combo-detail' },
  ]

  return (
    <nav className="lovers-dev-nav" aria-label="Navegação interna de desenvolvimento Lovers">
      <span className="lovers-dev-nav__label">DEV LOVERS</span>
      {items.map(item => (
        <button
          key={item.path}
          type="button"
          className={'lovers-dev-nav__item' + (route === item.match ? ' is-active' : '')}
          onClick={() => navigate(item.path)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

export default function App() {
  const [path, navigate] = useRoute()

  React.useEffect(() => { applyPalette() }, [])

  const route = (() => {
    if (path === '/' || path === '') return 'home'
    if (path.startsWith('/lovers/combos/')) return 'combo-detail'
    if (path.startsWith('/lovers/combos'))  return 'combos'
    if (path.startsWith('/lovers/mapa'))    return 'mapa'
    if (path.startsWith('/lovers/awards'))  return 'awards'
    if (path.startsWith('/lovers'))         return 'lovers'
    if (path.startsWith('/curiosidades'))   return 'curiosidades'
    if (path.startsWith('/participar'))     return 'participar'
    if (path.startsWith('/apoiar'))         return 'apoiar'
    if (path.startsWith('/edicoes'))        return 'edicoes'
    if (path.startsWith('/contato'))        return 'contato'
    return 'home'
  })()

  let page
  switch (route) {
    case 'home':         page = <LoversPage navigate={navigate} />; break
    case 'lovers':       page = <LoversPage navigate={navigate} />; break
    // Public fallback: QR Code URLs for Lovers internal pages must resolve to the published Lovers page until the internal pages are released.
    case 'combos':       page = ENABLE_LOVERS_INTERNAL_PAGES ? <ComboPage navigate={navigate} /> : <LoversPage navigate={navigate} />; break
    case 'combo-detail': page = ENABLE_LOVERS_INTERNAL_PAGES ? <ComboDetailPage navigate={navigate} slug={path.split('/').pop()} /> : <LoversPage navigate={navigate} />; break
    case 'mapa':         page = ENABLE_LOVERS_INTERNAL_PAGES ? <MapaPage navigate={navigate} /> : <LoversPage navigate={navigate} />; break
    case 'awards':       page = ENABLE_LOVERS_INTERNAL_PAGES ? <AwardsPage navigate={navigate} /> : <LoversPage navigate={navigate} />; break
    case 'curiosidades': page = <ComingSoonPage />; break
    case 'participar':   page = <ComingSoonPage />; break
    case 'apoiar':       page = <ComingSoonPage />; break
    case 'edicoes':      page = <ComingSoonPage />; break
    case 'contato':      page = <ComingSoonPage />; break
    default:             page = <HomePage navigate={navigate} />
  }

  return (
    <DevViewportSwitcher>
      <SiteHeader route={route} navigate={navigate} />
      <LoversDevNav navigate={navigate} route={route} />
      <main key={route} className="page-enter">{page}</main>
    </DevViewportSwitcher>
  )
}
