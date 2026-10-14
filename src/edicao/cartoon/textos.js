/*
 * Textos da camada Cartoon (CLAUDE.md §5.6: conteúdo fora do JSX).
 * Fase 1: só a casca e as páginas em preparação. Nenhum dado de participante.
 */
import { EDICAO } from '../config.js'

export const PERIODO = '5 a 15 de novembro'

export const NAV = [
  { cena: 'participantes', rotulo: 'Participantes', href: `${EDICAO.caminho}/participantes` },
  { cena: 'mapa', rotulo: 'Mapa', href: `${EDICAO.caminho}/mapa` },
  { cena: 'minha-rota', rotulo: 'Minha rota', href: `${EDICAO.caminho}/minha-rota` },
  { cena: 'premiacao', rotulo: 'Premiação', href: `${EDICAO.caminho}/premiacao` },
]

export const CENA_TEXTO = {
  entrada: { titulo: 'Sweet & Coffee Week Cartoon', apoio: `${PERIODO} · Natal` },
  participantes: { titulo: 'Participantes', apoio: 'O elenco desta edição será revelado em breve.' },
  combos: { titulo: 'Combos', apoio: 'Os combos desta edição serão revelados em breve.' },
  participante: { titulo: 'Participante', apoio: 'As páginas das casas participantes serão publicadas em breve.' },
  mapa: { titulo: 'Mapa', apoio: 'O mapa das casas participantes será publicado em breve.' },
  'minha-rota': { titulo: 'Minha rota', apoio: 'Aqui ficarão as casas que você escolher visitar.' },
  avaliar: { titulo: 'Avaliar', apoio: 'A avaliação abre durante o festival.' },
  premiacao: { titulo: 'Premiação', apoio: 'As categorias e os resultados serão publicados aqui.' },
  inexistente: { titulo: 'Não encontramos essa página da Cartoon', apoio: 'Confira o endereço ou volte para a entrada da edição.' },
}

export const RODAPE = {
  assinatura: 'Sweet & Coffee Week Cartoon é uma edição do Sweet & Coffee Week. Realização F2 Experience.',
  sobre: 'Sobre o festival',
  preferencias: 'Preferências de cookies',
}
