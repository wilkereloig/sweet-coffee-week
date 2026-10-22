/*
 * Os três "publicar" do painel da equipe — nome curto (aba), frase (título ou
 * nota da página) e onde ficam. FONTE ÚNICA: as abas (Modulos.jsx), as páginas
 * (vistas/Publicacao.jsx, vistas/PublicacaoEdicao.jsx) e o tour (ajuda.js) leem
 * daqui; tests/painel-app-nomes-publicacao.test.mjs confere contra as abas reais.
 *
 *   marcas    Participantes › Páginas das marcas   a página de CADA marca no site
 *   edicao    Edição › Liberação no site           fase e chaves da edição INTEIRA
 *   instagram Social media › Planejamento          agenda de posts do Instagram
 *
 * Só os NOMES mudam. As chaves de rota (`publicacao`, `planejamento`), o `sub` da
 * ficha e os links gravados no banco, em avisos e em push continuam valendo
 * (lib/rota.js). Rótulo de aba é curto de propósito (cabe no celular); a frase
 * longa vai na nota da página.
 */
export const NOMES_PUBLICACAO = {
  marcas: {
    modulo: 'Participantes',
    rotulo: 'Páginas das marcas',
    frase: 'Revisar e publicar as páginas das marcas',
    pagina: 'Página da marca no site', // título da seção dentro da ficha (uma marca só)
  },
  edicao: {
    modulo: 'Edição',
    rotulo: 'Liberação no site',
    frase: 'Liberar a edição no site (chaves e fase)',
  },
  instagram: {
    modulo: 'Social media',
    rotulo: 'Planejamento',
    frase: 'Planejar posts do Instagram',
  },
}

/** "Participantes › Páginas das marcas" — como o texto cita onde a tela fica. */
export const ondeFica = (assunto) => NOMES_PUBLICACAO[assunto].modulo + ' › ' + NOMES_PUBLICACAO[assunto].rotulo
