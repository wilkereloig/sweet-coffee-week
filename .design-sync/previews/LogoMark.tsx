import { LogoMark } from 'site-sweet-coffee-week'

export const Padrao = () => <LogoMark />

export const Grande = () => <LogoMark size={64} />

export const CorDaPagina = () => (
  <div style={{ background: '#3D1308', padding: 16, display: 'inline-block' }}>
    <LogoMark size={48} color="#FEF0DD" />
  </div>
)
