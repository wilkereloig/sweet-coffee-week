import React from 'react'
import { useRoute } from './router'
import { applyPalette } from './theme'
import { SiteHeader } from './components/nav'
import { SiteFooter } from './components/footer'

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

const SITE_COMING_SOON = import.meta.env.VITE_COMING_SOON === 'true'

export default function App() {
  const [path, navigate] = useRoute()
  const [bypass, setBypass] = React.useState(false)

  React.useEffect(() => { applyPalette() }, [])

  if (SITE_COMING_SOON && !bypass) return <ComingSoonPage onAdminAccess={() => setBypass(true)} />

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
    case 'home':         page = <HomePage navigate={navigate} />; break
    case 'lovers':       page = <LoversPage navigate={navigate} />; break
    case 'combos':       page = <ComingSoonPage onAdminAccess={() => setBypass(true)} />; break
    case 'combo-detail': page = <ComingSoonPage onAdminAccess={() => setBypass(true)} />; break
    case 'mapa':         page = <ComingSoonPage onAdminAccess={() => setBypass(true)} />; break
    case 'awards':       page = <ComingSoonPage onAdminAccess={() => setBypass(true)} />; break
    case 'curiosidades': page = <CuriosidadesPage navigate={navigate} />; break
    case 'participar':   page = <ParticiparPage navigate={navigate} />; break
    case 'apoiar':       page = <ApoiarPage navigate={navigate} />; break
    case 'edicoes':      page = <EdicoesPage navigate={navigate} />; break
    case 'contato':      page = <ContatoPage navigate={navigate} />; break
    default:             page = <HomePage navigate={navigate} />
  }

  return (
    <>
      <SiteHeader route={route} navigate={navigate} />
      <main key={route} className="page-enter">{page}</main>
      <SiteFooter navigate={navigate} />
    </>
  )
}
