/*
 * RESOLVEDOR DE MARCAS DE EDIÇÃO → ASSETS (regra global de acervo).
 * As marcas/logos por edição AINDA NÃO existem no acervo do projeto
 * (não há /public/images/marcas-edicoes/<id>/logo.png). Então este resolvedor:
 *   - reserva o espaço da marca no layout;
 *   - devolve fallback editorial (tema/label) quando não há logo;
 *   - documenta o caminho esperado do asset para quando as marcas forem criadas;
 *   - NUNCA inventa logo nem usa imagem aleatória.
 * Quando os arquivos chegarem, basta preencher EXISTING_MARKS[code] = caminho.
 */
import { sweetEditions } from './sweetEditionsCompat'

// Selo dos 10 anos — único asset de "marca de edição" que existe hoje (Lovers).
export const TEN_YEARS_SEAL = '/images/selo-10anos.svg'

// code da edição → caminho da logo/marca real (acervo, entregue jun/2026).
// Logos oficiais por edição, mapeadas por tema/período. object-fit: contain no layout.
const EXISTING_MARKS = {
  '2016':   '/images/marcas-edicoes/2016/logo.png',
  '2017.1': '/images/marcas-edicoes/2017.1/logo.png',
  '2017.2': '/images/marcas-edicoes/2017.2/logo.png',
  '2018.1': '/images/marcas-edicoes/2018.1/logo.png',
  '2018.2': '/images/marcas-edicoes/2018.2/logo.png',
  '2019.1': '/images/marcas-edicoes/2019.1/logo.png',
  '2019.2': '/images/marcas-edicoes/2019.2/logo.png',
  '2020.1': '/images/marcas-edicoes/2020.1/logo.png',
  '2020.2': '/images/marcas-edicoes/2020.2/logo.png',
  '2021.1': '/images/marcas-edicoes/2021.1/logo.png',
  '2021.2': '/images/marcas-edicoes/2021.2/logo.png',
  '2022':   '/images/marcas-edicoes/2022/logo.png',
  '2023':   '/images/marcas-edicoes/2023/logo.png',
  '2024':   '/images/marcas-edicoes/2024/logo.png',
  '2025':   '/images/marcas-edicoes/2025/logo.png',
  '2026.1': '/images/marcas-edicoes/2026.1/logo.png',
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
    expectedPath: `/images/marcas-edicoes/${code}/logo.png`,
  }
}
