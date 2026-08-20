import { CookieConsent } from 'site-sweet-coffee-week'

// Lê localStorage internamente — numa aba nova (sem escolha prévia) mostra
// o aviso. Composição real, sem mock: é assim que aparece na primeira visita.
export const PrimeiraVisita = () => <CookieConsent />
