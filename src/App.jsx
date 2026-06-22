import React from 'react'
import { useRoute } from './router'
import { applyPalette } from './theme'
import { SiteHeader } from './components/nav'
import { DevViewportSwitcher } from './DevTools'
import { I } from './components/icons'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CookieConsent } from './components/CookieConsent'

import { HomePage }        from './pages/institutional/Home'
import { EdicoesPage }     from './pages/institutional/Edicoes'
import { CuriosidadesPage } from './pages/institutional/Curiosidades'
import { ParticiparPage }  from './pages/institutional/Participar'
import { ApoiarPage }      from './pages/institutional/Apoiar'
import { ContatoPage }     from './pages/institutional/Contato'

import { LoversPage }      from './pages/lovers/Hub'
import { ComboPage }       from './pages/lovers/Combos'
import { ComboDetailPage } from './pages/lovers/ComboDetail'
import { MapaPage }        from './pages/lovers/Mapa'
import { AwardsPage }      from './pages/lovers/Awards'
import { VotarPage }       from './pages/lovers/Votar'
import { PainelPage }      from './pages/lovers/Painel'
import { VivaPage }        from './pages/lovers/Viva'

// Tab bar inferior estilo app — apenas nas rotas operacionais da edição Lovers.
// As rotas antigas continuam preservadas para QR Codes e links já divulgados.
const LOVERS_TABS = [
  { label: 'Sobre',       to: '/lovers',               icon: 'heart', match: ['lovers'] },
  { label: 'Lojas',       to: '/lovers/participantes', icon: 'pin',   match: ['participantes', 'combos', 'combo-detail'] },
  { label: 'Mapa',        to: '/lovers/mapa',          icon: 'map',   match: ['mapa'] },
  { label: 'Premiação',   to: '/lovers/premiacao',     icon: 'star',  match: ['premiacao', 'awards'] },
  { label: 'Viva o Sweet', to: '/lovers/viva',         icon: 'cup',   match: ['viva'] },
]

function LoversTabBar({ route, navigate }) {
  const activeIndex = LOVERS_TABS.findIndex(t => t.match.includes(route))
  if (activeIndex < 0) return null
  return (
    <nav className="lovers-tabbar" aria-label="Navegação Lovers" style={{ '--tab-index': activeIndex }}>
      <span className="lovers-tabbar__pill" aria-hidden="true" />
      {LOVERS_TABS.map(t => {
        const Ic = I[t.icon] || I.map
        const active = t.match.includes(route)
        return (
          <a
            key={t.to}
            href={`#${t.to}`}
            className={`lovers-tabbar__item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); navigate(t.to) }}
          >
            <Ic width={20} height={20} />
            <span>{t.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

export default function App() {
  const [path, navigate] = useRoute()

  React.useEffect(() => { applyPalette() }, [])

  const route = (() => {
    if (path === '/' || path === '') return 'home'

    // Links públicos limpos servidos via rewrites do Vercel.
    if (path === '/mapa' || path === '/rota') return 'mapa'
    if (path === '/participantes') return 'participantes'
    if (path === '/premiacao') return 'premiacao'

    // Institucional permanente.
    if (path.startsWith('/curiosidades')) return 'curiosidades'
    if (path.startsWith('/participar')) return 'participar'
    if (path.startsWith('/apoiar')) return 'apoiar'
    if (path.startsWith('/contato')) return 'contato'
    if (path.startsWith('/edicoes/lovers')) return 'lovers'
    if (path.startsWith('/edicoes')) return 'edicoes'

    // Rotas de QR Codes e links legados da edição Lovers — não remover.
    if (path.startsWith('/lovers/combos/')) return 'combo-detail'
    if (path.startsWith('/lovers/combos')) return 'combos'
    if (path.startsWith('/lovers/participantes')) return 'participantes'
    if (path.startsWith('/lovers/mapa')) return 'mapa'
    if (path.startsWith('/lovers/viva')) return 'viva'
    if (path.startsWith('/lovers/promocoes')) return 'viva'
    if (path.startsWith('/lovers/painel')) return 'painel'
    if (path.startsWith('/lovers/votar')) return 'votar'
    if (path.startsWith('/lovers/awards')) return 'awards'
    if (path.startsWith('/lovers/premiacao')) return 'premiacao'
    if (path.startsWith('/lovers')) return 'lovers'

    return 'home'
  })()

  let page
  switch (route) {
    case 'home':          page = <HomePage navigate={navigate} />; break
    case 'curiosidades':  page = <CuriosidadesPage navigate={navigate} />; break
    case 'participar':    page = <ParticiparPage navigate={navigate} />; break
    case 'apoiar':        page = <ApoiarPage navigate={navigate} />; break
    case 'edicoes':       page = <EdicoesPage navigate={navigate} />; break
    case 'contato':       page = <ContatoPage navigate={navigate} />; break

    case 'lovers':        page = <LoversPage navigate={navigate} />; break
    case 'participantes': page = <ComboPage navigate={navigate} />; break
    case 'combos':        page = <ComboPage navigate={navigate} />; break
    case 'combo-detail':  page = <ComboDetailPage navigate={navigate} slug={path.split('/').pop()} />; break
    case 'mapa':          page = <MapaPage navigate={navigate} variant="fullscreen" />; break
    case 'votar':         page = <VotarPage navigate={navigate} />; break
    case 'painel':        page = <PainelPage navigate={navigate} />; break
    case 'viva':          page = <VivaPage navigate={navigate} />; break
    case 'awards':        page = <AwardsPage navigate={navigate} />; break
    case 'premiacao':     page = <AwardsPage navigate={navigate} />; break
    default:              page = <HomePage navigate={navigate} />
  }

  React.useEffect(() => {
    const cls = `route-${route}`
    document.body.classList.add(cls)
    return () => document.body.classList.remove(cls)
  }, [route])

  return (
    <DevViewportSwitcher>
      <SiteHeader route={route} navigate={navigate} path={path} />
      <main key={route} className={`page-enter${['participantes', 'combos', 'combo-detail'].includes(route) ? ' with-combo-rail' : ''}`}>
        <ErrorBoundary key={route}>{page}</ErrorBoundary>
      </main>
      <LoversTabBar route={route} navigate={navigate} />
      <CookieConsent />
    </DevViewportSwitcher>
  )
}
