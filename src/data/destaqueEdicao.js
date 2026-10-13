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
 */
import { proximaEdicao as PROX } from './proximaEdicao.js'
import { fotoProximaEdicao } from './imageLibrary.js'

const foto = fotoProximaEdicao('foto')

export const destaqueEdicao = {
  ativo: true,
  rotulo: PROX.ano ? `Próxima edição · ${PROX.ano}` : 'Próxima edição',
  titulo: 'Sweet & Coffee Week',
  tema: PROX.tema,          // obrigatório — de proximaEdicao.js
  periodo: PROX.periodo,    // obrigatório — de proximaEdicao.js
  /* Lettering oficial do tema. Sem ele, o tema sai em tipografia real. */
  marca: fotoProximaEdicao('marca'),
  texto: 'Uma nova edição para descobrir sabores e celebrar o universo da animação.',
  imagem: foto,             // obrigatório — objeto de imageLibrary.js: { src, alt, position }
  legenda: foto?.legenda,   // obrigatório — diz que a foto é registro de edição anterior
  /* Opcional: sem pré-cadastro aberto, a abertura fica só com "Conhecer o
     festival". href externo ou com barra final (§10.4-b). */
  acao: PROX.status === 'pre-cadastro' && PROX.preCadastro
    ? { rotulo: 'Quero participar', href: PROX.preCadastro }
    : null,
}

/**
 * O destaque só vale com tudo que o torna honesto: título, tema, período e
 * texto para dizer o que é; foto COM alt e legenda para não parecer peça da
 * edição nova. Ação e marca são opcionais, mas não pela metade. Faltou um →
 * abertura institucional, nunca um bloco incompleto.
 */
export function destaqueValido(d = destaqueEdicao) {
  if (!d || d.ativo !== true) return false
  const texto = (v) => typeof v === 'string' && v.trim().length > 0
  const acaoOk = d.acao == null || (texto(d.acao.rotulo) && texto(d.acao.href))
  const marcaOk = d.marca == null || (texto(d.marca.src) && texto(d.marca.alt))
  return (
    texto(d.titulo) &&
    texto(d.tema) &&
    texto(d.periodo) &&
    texto(d.texto) &&
    texto(d.legenda) &&
    !!d.imagem && texto(d.imagem.src) && texto(d.imagem.alt) &&
    acaoOk && marcaOk
  )
}

export default destaqueEdicao
