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


export default function App() {
  const [path, navigate] = useRoute()

  React.useEffect(() => { applyPalette() }, [])

  const route = (() => {
    if (path === '/' || path === '') return 'home'
    // Rotas limpas (sem hash) — aliases públicos servidos via rewrites do vercel.json.
    // Não substituem os links de QR (com hash); apenas adicionam entradas amigáveis.
    if (path === '/mapa' || path === '/rota') return 'mapa'
    if (path === '/participantes') return 'participantes'
    if (path === '/premiacao') return 'premiacao'
    // ATENÇÃO: rotas de QR Codes já impressos — não alterar #/lovers/combos/:slug
    // nem #/lovers/awards. Não remover essas linhas sem validar materiais físicos.
    if (path.startsWith('/lovers/combos/')) return 'combo-detail'
    if (path.startsWith('/lovers/combos'))  return 'combos'
    if (path.startsWith('/lovers/participantes')) return 'participantes'
    if (path.startsWith('/lovers/mapa'))    return 'mapa'
    if (path.startsWith('/lovers/awards'))  return 'awards'
    if (path.startsWith('/lovers/premiacao')) return 'premiacao'
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
    case 'participantes': page = <ComboPage navigate={navigate} />; break
    case 'combos':       page = <ComboPage navigate={navigate} />; break
    case 'combo-detail': page = <ComboDetailPage navigate={navigate} slug={path.split('/').pop()} />; break
    case 'mapa':         page = <MapaPage navigate={navigate} variant="fullscreen" />; break
    case 'awards':       page = <AwardsPage navigate={navigate} />; break
    case 'premiacao':    page = <AwardsPage navigate={navigate} />; break
    case 'curiosidades': page = <ComingSoonPage />; break
    case 'participar':   page = <ComingSoonPage />; break
    case 'apoiar':       page = <ComingSoonPage />; break
    case 'edicoes':      page = <ComingSoonPage />; break
    case 'contato':      page = <ComingSoonPage />; break
    default:             page = <HomePage navigate={navigate} />
  }

  return (
    <DevViewportSwitcher>
      <SiteHeader route={route} navigate={navigate} path={path} />
      <main key={route} className={`page-enter${['participantes', 'combos', 'combo-detail'].includes(route) ? ' with-combo-rail' : ''}`}>{page}</main>
    </DevViewportSwitcher>
  )
}
