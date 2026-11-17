/*
 * Destaque de edição na abertura da Home — fonte única (12/10/2026).
 *
 * O institucional é permanente. Quando uma edição tem algo a dizer ao público,
 * ela assume a abertura da Home; o resto do site segue igual. Este arquivo é o
 * único ponto de configuração dessa chamada.
 *
 * 13/10/2026: ligado para ANUNCIAR a edição Cartoon (tema e datas vinham de
 * proximaEdicao.js).
 * 16/11/2026 (pedido do Wilker): a edição ENCERROU. O destaque segue ligado,
 * agora dizendo que ela terminou e que os resultados estão em apuração. Tema e
 * período são da edição encerrada, escritos aqui: proximaEdicao.js voltou a
 * null, porque a edição seguinte ainda não foi divulgada. O agradecimento, a
 * expectativa e as marcas moram logo abaixo, na seção Encerramento
 * (conteudo/home.js → ENCERRAMENTO).
 *
 * 16/11/2026, segunda rodada (pedido do Wilker): DESLIGADO. A abertura da Home
 * voltou a ser a do festival — ela não pode continuar parecendo a campanha de
 * lançamento de uma edição encerrada. A Cartoon passou a ter seção própria logo
 * abaixo (conteudo/home.js → CAPITULO_CARTOON, com a cidade ilustrada e o
 * estado do Sweet Awards), e o vídeo de lançamento foi para o acervo da edição
 * (/edicoes/2026.2, `videoLancamento()` em imageLibrary.js), identificado como
 * lançamento. Os campos abaixo ficam como registro e como modelo: na próxima
 * edição, tema e período voltam a vir de proximaEdicao.js e `ativo` volta a
 * `true` (decisão do Wilker, nunca automática).
 *
 * COMO LIGAR/DESLIGAR: `ativo`. Desligado, a Home mostra a abertura
 * institucional completa, sem espaço vazio. Nada aqui liga ou desliga por
 * data, e nada mexe em flag de publicação (src/App.jsx).
 *
 * ⚠️ Nada de dado não confirmado (A4): resultado do Sweet Awards, ranking da
 * Caça aos Carimbos e sorteios só entram depois de divulgados pela organização.
 * Nenhuma foto de edição anterior aqui (pedido do Wilker, 13/10/2026): a
 * abertura usa só peças da própria edição — marca, fundo ilustrado e o vídeo.
 */
import { fotoProximaEdicao } from './imageLibrary.js'

/* Reel oficial do lançamento (@sweetcoffeeweek, 07/10/2026), sem os
   parâmetros de rastreio do link compartilhado. */
const REEL_LANCAMENTO = 'https://www.instagram.com/reel/DeNRdZvBubh/'

const video = fotoProximaEdicao('video')

export const destaqueEdicao = {
  ativo: false,
  rotulo: 'Edição encerrada',
  titulo: 'Sweet & Coffee Week',
  tema: 'Cartoon',
  periodo: '5 a 15 de novembro de 2026',
  /* Lettering oficial do tema. Sem ele, o tema sai em tipografia real. */
  marca: fotoProximaEdicao('marca'),
  texto: 'A edição terminou. As avaliações do público, o ranking da Caça aos Carimbos e os sorteios estão em apuração.',
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
  /* A edição já está no acervo: a ação principal leva ao registro dela. */
  acao: { rotulo: 'Ver a edição no acervo', href: '/edicoes/2026.2' },
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
