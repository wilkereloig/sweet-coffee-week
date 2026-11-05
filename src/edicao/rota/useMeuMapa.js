import { useCaca } from '../caca/useCaca.js'

/**
 * O Mapa da Doçura do visitante (docs/cartoon-2026-2/14 §14.3), como o Mundo, o álbum e o mapa o leem: a chave, a
 * leitura (agora `mapa_ler_v2`, com casas validadas/pendentes, extras e posição) e o apagar. Um por página.
 * A chave, a recuperação e o resto da Caça moram em `caca/useCaca.js`; este é só o recorte antigo, sem quebrar quem já o usa.
 * `estado`: 'sem-mapa' | 'carregando' | 'pronto' | 'falha'. Chave que o banco não reconhece sai do aparelho.
 */
export function useMeuMapa () {
  const { chave, mapa, estado, apagar } = useCaca({ comEmail: false })
  return { chave, mapa, estado, apagar }
}
