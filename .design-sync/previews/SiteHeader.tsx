import { SiteHeader } from 'site-sweet-coffee-week'

const semAcao = () => {}

// O véu do cabeçalho é pensado para ficar sobre uma foto escura — o preview
// dá esse fundo pra logo e menu não ficarem sobre branco puro.
const moldura = (children) => (
  <div style={{ background: '#3D1308', minHeight: 220, position: 'relative' }}>{children}</div>
)

export const OFestival = () =>
  moldura(<SiteHeader route="home" navigate={semAcao} onOpenAccess={semAcao} accessOpen={false} />)

export const SweetAwards = () =>
  moldura(<SiteHeader route="historico-awards" navigate={semAcao} onOpenAccess={semAcao} accessOpen={false} />)
