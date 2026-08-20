import { MobileTabBar } from 'site-sweet-coffee-week'

const semAcao = () => {}

// A casca vira "aplicativo" só ≤900px — o preview força a largura do card
// pra caber a barra sem o resto da página em volta.
const moldura = (children) => (
  <div style={{ width: 390, position: 'relative', height: 100, background: '#FEF0DD' }}>{children}</div>
)

export const Home = () => moldura(<MobileTabBar route="home" navigate={semAcao} onOpenMenu={semAcao} menuOpen={false} />)

export const NaFolhaMais = () =>
  moldura(<MobileTabBar route="apoiar" navigate={semAcao} onOpenMenu={semAcao} menuOpen={false} />)

export const MenuAberto = () =>
  moldura(<MobileTabBar route="home" navigate={semAcao} onOpenMenu={semAcao} menuOpen />)
