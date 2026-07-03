/*
 * RESOLVEDOR DE MARCAS DE EDIÇÃO → ASSETS (regra global de acervo).
 * Todos os 16 logos/marcas de edição já existem no acervo
 * (/public/images/editions/<code>/logo.png, entregues jun/2026).
 * Este resolvedor mapeia cada edição ao seu logo real via EXISTING_MARKS.
 * Inclui fallback `is-fallback` como rede de segurança (arquivo ausente/quebrado):
 *   - quando logo existe: retorna caminho real;
 *   - fallback: devolve tema/label editorial (nunca inventa logo nem usa imagem aleatória).
 */
import { sweetEditions } from './sweetEditionsCompat'

// Selo dos 10 anos — único asset de "marca de edição" que existe hoje (Lovers).
export const TEN_YEARS_SEAL = '/images/selo-10anos.svg'

// code da edição → caminho da logo/marca real (acervo, entregue jun/2026).
// Logos oficiais por edição, mapeadas por tema/período. object-fit: contain no layout.
const EXISTING_MARKS = {
  '2016':   '/images/editions/2016/logo.png',
  '2017.1': '/images/editions/2017.1/logo.png',
  '2017.2': '/images/editions/2017.2/logo.png',
  '2018.1': '/images/editions/2018.1/logo.png',
  '2018.2': '/images/editions/2018.2/logo.png',
  '2019.1': '/images/editions/2019.1/logo.png',
  '2019.2': '/images/editions/2019.2/logo.png',
  '2020.1': '/images/editions/2020.1/logo.png',
  '2020.2': '/images/editions/2020.2/logo.png',
  '2021.1': '/images/editions/2021.1/logo.png',
  '2021.2': '/images/editions/2021.2/logo.png',
  '2022':   '/images/editions/2022/logo.png',
  '2023':   '/images/editions/2023/logo.png',
  '2024':   '/images/editions/2024/logo.png',
  '2025':   '/images/editions/2025/logo.png',
  '2026.1': '/images/editions/2026.1/logo.png',
}

const BY_CODE = Object.fromEntries(sweetEditions.map((e) => [e.code, e]))

export function editionMark(code) {
  const e = BY_CODE[code]
  return {
    code,
    title: e ? e.label : code,
    theme: e ? e.theme : code,
    logo: EXISTING_MARKS[code] || null,
    fallback: e ? e.theme : code,
    expectedPath: `/images/editions/${code}/logo.png`,
  }
}
