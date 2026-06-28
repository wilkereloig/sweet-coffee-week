/*
 * RESOLVEDOR DE MARCAS DE EDIÇÃO → ASSETS (regra global de acervo).
 * As marcas/logos por edição AINDA NÃO existem no acervo do projeto
 * (não há /public/images/editions/<id>/logo.png). Então este resolvedor:
 *   - reserva o espaço da marca no layout;
 *   - devolve fallback editorial (tema/label) quando não há logo;
 *   - documenta o caminho esperado do asset para quando as marcas forem criadas;
 *   - NUNCA inventa logo nem usa imagem aleatória.
 * Quando os arquivos chegarem, basta preencher EXISTING_MARKS[code] = caminho.
 */
import { sweetEditions } from './sweetHistory'

// Selo dos 10 anos — único asset de "marca de edição" que existe hoje (Lovers).
export const TEN_YEARS_SEAL = '/images/selo-10anos.svg'

// code da edição → caminho da logo/marca (preencher quando existir no acervo).
const EXISTING_MARKS = {
  // '2024': '/images/editions/2024-books/logo.png',
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
