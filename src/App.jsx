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

// Internal Lovers pages stay locked in production unless VITE_ENABLE_LOVERS_INTERNAL_PAGES=true.
const ENABLE_LOVERS_INTERNAL_PAGES =
  import.meta.env.VITE_ENABLE_LOVERS_INTERNAL_PAGES === 'true'

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
    case 'combos':       page = ENABLE_LOVERS_INTERNAL_PAGES ? <ComboPage navigate={navigate} /> : <ComingSoonPage />; break
    case 'combo-detail': page = ENABLE_LOVERS_INTERNAL_PAGES ? <ComboDetailPage navigate={navigate} slug={path.split('/').pop()} /> : <ComingSoonPage />; break
    case 'mapa':         page = ENABLE_LOVERS_INTERNAL_PAGES ? <MapaPage navigate={navigate} /> : <ComingSoonPage />; break
    case 'awards':       page = ENABLE_LOVERS_INTERNAL_PAGES ? <AwardsPage navigate={navigate} /> : <ComingSoonPage />; break
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
      <main key={route} className="page-enter">{page}</main>
    </DevViewportSwitcher>
  )
}
