/*
 * Contas puras da página do mapa compacta (redesign de 06/11/2026; tests/cartoon-caca-mapa.test.mjs).
 * Nada de DOM aqui: o que depende do navegador (folha, tela cheia, trava de rolagem) mora em paginas/mapa/.
 */

/** Filtros avançados ativos, para o contador do botão "Filtros". A busca por texto tem campo próprio e não entra na conta. */
export function contarFiltros (f = {}, { aberto = f.aberto } = {}) {
  return [f.bairro, f.modo, aberto, f.queroIr, f.jaFui, f.estado].filter(Boolean).length
}

/**
 * Casas (participantes que têm endereço publicado) e endereços (unidades). A Caça conta CASAS: uma casa com vários
 * endereços vale um carimbo — é a frase que a tela repete para não confundir uma coisa com a outra.
 */
export function casasEEnderecos (participantes = []) {
  const comEndereco = participantes.filter((p) => (p.unidades || []).length)
  return { casas: comEndereco.length, enderecos: comEndereco.reduce((n, p) => n + p.unidades.length, 0) }
}

/** Outras unidades da MESMA casa (para o cartão trocar de endereço sem sair do mapa). `linhas`: `{ u, p }` de `unidadesDoMapa`. */
export function enderecosDaCasa (linhas = [], slug, idAtual) {
  return linhas.filter((x) => x.p.slug === slug && x.u.id !== idAtual)
}

/** O interruptor "perto de mim" só existe com a permissão por perguntar: sem GPS no aparelho, o botão não aparece. */
export const podeLocalizar = () => typeof navigator !== 'undefined' && 'geolocation' in navigator
