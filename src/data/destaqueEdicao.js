/*
 * Destaque de edição na abertura da Home — fonte única (12/10/2026).
 *
 * O institucional é permanente. Quando uma edição for lançada e o conteúdo
 * estiver APROVADO para o público, ela assume o protagonismo da abertura da
 * Home; o resto do site segue igual. Este arquivo é o único ponto de
 * configuração dessa chamada.
 *
 * LIGADO em 13/10/2026: o Wilker autorizou mostrar o tema Cartoon e as datas
 * 5 a 15 de novembro de 2026. Tema, período e ano NÃO se escrevem aqui — vêm
 * de `proximaEdicao.js`, a fonte do que já é público sobre a próxima edição.
 * A ação principal também: só existe enquanto o pré-cadastro estiver aberto.
 *
 * COMO DESLIGAR: `ativo: false`. A Home volta à abertura institucional
 * completa, sem espaço vazio. Nada aqui liga ou desliga por data, e nada mexe
 * em flag de publicação (src/App.jsx) — sob o gate atual a Home nem aparece.
 *
 * ⚠️ Nada de dado não confirmado: participantes, combos, preço e duração ficam
 * fora até a organização divulgar (A4). Não usar "em cartaz" antes do início.
 * Nenhuma foto de edição anterior aqui (pedido do Wilker, 13/10/2026): a
 * abertura usa só peças da edição nova — marca, fundo ilustrado e o vídeo.
 */
import { proximaEdicao as PROX } from './proximaEdicao.js'
import { fotoProximaEdicao } from './imageLibrary.js'

/* Reel oficial do lançamento (@sweetcoffeeweek, 07/10/2026), sem os
   parâmetros de rastreio do link compartilhado. */
const REEL_LANCAMENTO = 'https://www.instagram.com/reel/DeNRdZvBubh/'

const video = fotoProximaEdicao('video')

export const destaqueEdicao = {
  ativo: true,
  rotulo: PROX.ano ? `Próxima edição · ${PROX.ano}` : 'Próxima edição',
  titulo: 'Sweet & Coffee Week',
  tema: PROX.tema,          // obrigatório — de proximaEdicao.js
  periodo: PROX.periodo,    // obrigatório — de proximaEdicao.js
  /* Lettering oficial do tema. Sem ele, o tema sai em tipografia real. */
  marca: fotoProximaEdicao('marca'),
  texto: 'Combos criados pelas casas participantes a partir do universo da animação.',
  /* Fundo ilustrado da edição (imageLibrary.js). Sem ele, a chapa amarela. */
  fundo: fotoProximaEdicao('fundo'),
  /* Opcional: o vídeo de lançamento, com o botão para o reel no Instagram.
     Só entra inteiro — arquivo, capa e link. */
  video: video && {
    ...video,
    titulo: 'Vídeo de lançamento da edição Cartoon',
    instagram: REEL_LANCAMENTO,
    rotulo: 'Ver no Instagram',
  },
  /* Opcional: sem pré-cadastro aberto, a abertura fica só com "Conhecer o
     festival". href externo ou com barra final (§10.4-b). */
  acao: PROX.status === 'pre-cadastro' && PROX.preCadastro
    ? { rotulo: 'Fazer pré-cadastro', href: PROX.preCadastro }
    : null,
}

/**
 * O destaque só vale com o que o torna honesto: título, tema, período e texto
 * para dizer o que é. Vídeo, marca e ação são opcionais, mas nunca pela
 * metade. Faltou um → abertura institucional, nunca um bloco incompleto.
 */
export function destaqueValido(d = destaqueEdicao) {
  if (!d || d.ativo !== true) return false
  const texto = (v) => typeof v === 'string' && v.trim().length > 0
  const acaoOk = d.acao == null || (texto(d.acao.rotulo) && texto(d.acao.href))
  const marcaOk = d.marca == null || (texto(d.marca.src) && texto(d.marca.alt))
  const videoOk = d.video == null ||
    (texto(d.video.src) && texto(d.video.capa) && texto(d.video.titulo) && texto(d.video.instagram) && texto(d.video.rotulo))
  return (
    texto(d.titulo) &&
    texto(d.tema) &&
    texto(d.periodo) &&
    texto(d.texto) &&
    acaoOk && marcaOk && videoOk
  )
}

export default destaqueEdicao
