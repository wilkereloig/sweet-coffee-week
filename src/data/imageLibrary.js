/* ============================================================================
   SISTEMA CENTRAL DE IMAGENS — Sweet & Coffee Week
   ----------------------------------------------------------------------------
   Fonte única de fotografia do site. Nenhum componente deve montar caminho de
   imagem na mão: pede aqui e recebe `{ src, alt, position }`.

   O que existe no acervo (public/), e o que NÃO existe:

   · `/images/edicoes/<code>/NN.webp` — 11 a 12 fotos POR EDIÇÃO, das 16 edições.
     São registros da edição (combos, lojas, público) SEM rótulo de participante:
     o acervo não diz qual foto é de qual marca. Por isso a legenda fala da
     edição, nunca de um participante específico — atribuir seria invenção.
   · `/images/combos/<slug>/main.jpg` + `photo-NN.jpg` — fotos POR PARTICIPANTE,
     só da edição Lovers (2026.1), 21 marcas. É o único vínculo
     participante↔combo confirmado no acervo.
   · `/images/marcas-edicoes/<code>/logo.png` — marca de cada edição.
   · `/logos/participants/<slug>.png` — marca de cada participante da Lovers.
   · `/images/momentos/`, `/images/campanha/`, `/images/lovers-publico/` —
     público e bastidores, sem vínculo com marca.

   Regra dura: onde não há foto confirmada, devolvemos `null` e a interface
   mostra reserva editorial. Nunca a foto de outro participante ou de outra
   edição para preencher espaço.
   ========================================================================= */

import { EDITION_GALLERY } from './editionGallery.js'
import { focalPosition } from './focalPoints.js'
import { resolveParticipant } from './participantAssets.js'
import { SWEET_COFFEE_HISTORY } from './sweetCoffeeHistory.js'

/** Texto exibido quando o acervo não tem a foto. Discreto e honesto. */
export const RESERVA = 'Fotografia ainda não disponível.'

const EDICOES = SWEET_COFFEE_HISTORY.edicoes || SWEET_COFFEE_HISTORY
const POR_CODIGO = Object.fromEntries(EDICOES.map((e) => [e.id, e]))

/** Nome de exibição da edição: "Lovers (2026.1)" → usado nos textos alternativos. */
export function editionLabel(code) {
  const e = POR_CODIGO[code]
  if (!e) return code
  return e.tema ? `${e.tema} ${code}` : code
}

/* ----------------------------------------------------------------------------
   Fotos por edição
   -------------------------------------------------------------------------- */

/**
 * Todas as fotos de uma edição, na ordem do acervo.
 * @returns {{src:string, alt:string, position:string, indice:number}[]}
 */
export function editionPhotos(code) {
  const lista = EDITION_GALLERY[code] || []
  const rotulo = editionLabel(code)
  return lista.map((src, i) => ({
    src,
    indice: i + 1,
    // Alt contextual: edição + posição. O acervo não identifica a marca de cada
    // foto, então a legenda não afirma participante (ver cabeçalho).
    alt: `Registro ${i + 1} da edição ${rotulo} do Sweet & Coffee Week`,
    position: focalPosition(src),
  }))
}

/** Primeira foto da edição — capa/cena. `null` se a edição não tiver acervo. */
export function editionCover(code) {
  return editionPhotos(code)[0] || null
}

/** Recorte de N fotos da edição (mosaicos), preservando a ordem do acervo. */
export function editionMosaic(code, n = 3) {
  return editionPhotos(code).slice(0, n)
}

/* ----------------------------------------------------------------------------
   Fotos por participante (só a edição Lovers 2026.1 tem esse vínculo)
   -------------------------------------------------------------------------- */

/* Quantas fotos cada marca tem em /images/combos/<slug>/. Mantido aqui porque
   o navegador não lista diretório — conferido contra o disco pelo teste
   tests/imagens.test.mjs, que quebra se o acervo e esta tabela divergirem. */
const COMBO_COUNT = {
  'adocee-doceria': 10,
  'bolomania': 11,
  'caffe-basilicos': 10,
  'canutos': 16,
  'caroli-douces': 11,
  'casa-1190': 13,
  'casa-de-taipa-tapiocaria': 4,
  'delicato-bolos': 13,
  'douce-di-maria': 13,
  'jolie-cafe-patisserie': 12,
  'just-food-coffee': 10,
  'mangai': 11,
  'mr-cupcake-confeitaria': 10,
  'o-maestro-cafe': 11,
  'oli-gastro': 4,
  'padoca-do-bosque': 8,
  'paneer-patisserie': 13,
  'parma-doces': 12,
  'rollab-confeitaria': 14,
  'sweet-duo-confeitaria': 10,
  'wow-cookies': 13,
}

export const COMBO_SLUGS = Object.keys(COMBO_COUNT)

/** Edição a que as fotos de combo pertencem — todas são da Lovers. */
export const COMBO_EDITION = '2026.1'

const comboPath = (slug, i) =>
  i === 0 ? `/images/combos/${slug}/main.jpg` : `/images/combos/${slug}/photo-${String(i + 1).padStart(2, '0')}.jpg`

/**
 * Fotos do combo de um participante. Aceita nome ou slug.
 * @returns {{src:string, alt:string, position:string, slug:string}[]} vazio se não houver.
 */
export function comboPhotos(nomeOuSlug, { limite } = {}) {
  const slug = COMBO_COUNT[nomeOuSlug] ? nomeOuSlug : resolveParticipant(nomeOuSlug).slug
  const total = slug ? COMBO_COUNT[slug] : 0
  if (!total) return []
  const nome = COMBO_COUNT[nomeOuSlug] ? nomeOuSlug : nomeOuSlug
  const n = limite ? Math.min(limite, total) : total
  return Array.from({ length: n }, (_, i) => {
    const src = comboPath(slug, i)
    return {
      src,
      slug,
      alt: `Combo da ${nome} na edição ${editionLabel(COMBO_EDITION)} do Sweet & Coffee Week`,
      position: focalPosition(src),
    }
  })
}

/** Foto principal do combo de um participante, ou `null`. */
export function comboMain(nomeOuSlug) {
  return comboPhotos(nomeOuSlug, { limite: 1 })[0] || null
}

/**
 * Foto para uma colocação do Sweet Awards. Só devolve imagem quando o
 * participante tem combo no acervo E a edição é a Lovers — para as edições
 * antigas o acervo não liga marca e foto, então a resposta é `null` e o card
 * mostra a ausência.
 * @param {string} nome nome do participante como está no resultado
 * @param {string} code código da edição da premiação
 * @param {number} variacao índice para variar a foto entre categorias
 */
export function awardPhoto(nome, code, variacao = 0) {
  if (code !== COMBO_EDITION) return null
  const fotos = comboPhotos(nome)
  if (!fotos.length) return null
  const f = fotos[variacao % fotos.length]
  return { ...f, alt: `Combo premiado da ${nome} na edição ${editionLabel(code)} do Sweet & Coffee Week` }
}

/* ----------------------------------------------------------------------------
   Heroes — uma foto contextual por página, sem repetir entre páginas
   -------------------------------------------------------------------------- */

/*
 * Cada rota tem foto própria. O overlay usa a cor da página (--scw-pagina), que
 * já vive em body.route-* (src/styles/scw-2026.css) — não se define cor aqui.
 * `position` traz o enquadramento por foto, separado para desktop e mobile,
 * porque o mesmo recorte não serve para uma faixa larga e para uma banda alta.
 */
const HEROES = {
  home: [
    { src: '/images/edicoes/2026.1/04.webp', alt: 'Combo da edição Lovers do Sweet & Coffee Week', position: '68% center', mobilePosition: 'center 32%' },
    { src: '/images/edicoes/2025/09.webp', alt: 'Combo da edição Celebration do Sweet & Coffee Week', position: '68% center', mobilePosition: 'center 32%' },
    { src: '/images/momentos/02.jpg', alt: 'Público percorrendo a rota do Sweet & Coffee Week', position: '62% center', mobilePosition: 'center 38%' },
    { src: '/images/edicoes/2023/04.webp', alt: 'Combo da edição Trip do Sweet & Coffee Week', position: '68% center', mobilePosition: 'center 32%' },
  ],
  /* As 22 fotos das visitas às lojas participantes (acervo, agosto/2026)
     dividem-se entre as duas páginas: nenhuma imagem se repete de um herói
     para o outro. Participar fica com a primeira metade, Apoiar com a
     segunda. */
  participar: [
    { src: '/images/participantes-lojas/01.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/02.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/03.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/04.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/05.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/06.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/07.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/08.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/09.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/10.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/11.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
  ],
  apoiar: [
    { src: '/images/participantes-lojas/12.jpg', alt: 'Marca participante durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/13.jpg', alt: 'Marca participante durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/14.jpg', alt: 'Marca participante durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/15.jpg', alt: 'Marca participante durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/16.jpg', alt: 'Marca participante durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/17.jpg', alt: 'Marca participante durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/18.jpg', alt: 'Marca participante durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/19.jpg', alt: 'Marca participante durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/20.jpg', alt: 'Marca participante durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/21.jpg', alt: 'Marca participante durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/participantes-lojas/22.jpg', alt: 'Marca participante durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
  ],
  /* Sweet Lovers: o público que percorre a rota. */
  contato: [
    { src: '/images/sweet-lovers/01.jpg', alt: 'Sweet Lovers durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/sweet-lovers/02.jpg', alt: 'Sweet Lovers durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/sweet-lovers/03.jpg', alt: 'Sweet Lovers durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/sweet-lovers/04.jpg', alt: 'Sweet Lovers durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/sweet-lovers/05.jpg', alt: 'Sweet Lovers durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
  ],
  /* Entrega dos prêmios, o assunto literal da página (pedido do Wilke,
     21/08/2026). Cinco das seis são retrato de 960px: no herói largo elas
     sobem de escala e mostram só a faixa central, por isso cada `position`
     mira a altura onde estão os rostos e as placas. */
  'historico-awards': [
    { src: '/images/awards-entrega/01.jpg', alt: 'Equipe d’O Maestro Café com os prêmios do Sweet Awards do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 36%' },
    { src: '/images/awards-entrega/02.jpg', alt: 'Equipe d’O Maestro Café reunida com os prêmios do Sweet Awards do Sweet & Coffee Week', position: 'center 42%', mobilePosition: 'center 38%' },
    { src: '/images/awards-entrega/03.jpg', alt: 'Equipe da Jolie Café Pâtisserie na loja com os prêmios do Sweet Awards do Sweet & Coffee Week', position: 'center 44%', mobilePosition: 'center 40%' },
    { src: '/images/awards-entrega/04.jpg', alt: 'Entrega do prêmio de 1º lugar do Sweet Awards do Sweet & Coffee Week à Bocaditos', position: 'center 38%', mobilePosition: 'center 34%' },
    { src: '/images/awards-entrega/05.jpg', alt: 'Entrega de prêmios do Sweet Awards em uma loja participante do Sweet & Coffee Week', position: 'center 30%', mobilePosition: 'center 26%' },
    { src: '/images/awards-entrega/06.jpg', alt: 'Equipe da Jolie Café Pâtisserie recebendo os prêmios do Sweet Awards do Sweet & Coffee Week', position: 'center 44%', mobilePosition: 'center 40%' },
  ],
  edicoes: [
    { src: '/images/edicoes/2016/01.webp', alt: 'Registro da primeira edição do Sweet & Coffee Week', position: 'center', mobilePosition: 'center' },
  ],
}

/* ----------------------------------------------------------------------------
   Sweet Gift — a versão do combo para presentear ou levar (§9.7)
   Até 21/08/2026 esta galeria era feita de reservas honestas, porque o acervo
   não tinha nenhuma foto catalogada da modalidade. Estas quatro vieram da
   edição 2020.1 (No Ritmo da Música), escolhidas pelo Wilke: duas da Rafaela
   Fontes Chocolateria — que entrou na modalidade em 2017.2 — e duas da
   Stephany Santos, estas com o fone de ouvido que era o tema da edição.
   Depois vieram seis do Bolo da Vovó — a casa que ESTREOU a modalidade, na
   Páscoa de 2017 (§9.7) — das edições Doces do Mundo, Namorados, Pâtisserie
   Francesa e Contos de Fadas.
   ⚠️ A legenda é MARCA · EDIÇÃO, não uma descrição da embalagem. As antigas
   ("caixa fechada", "caixa aberta", "doces da caixa", "pronta para viagem")
   descreviam uma sequência que só uma destas fotos tem: as outras mostram o
   doce servido, no prato ou na bandeja. Marca e edição vêm da estrutura do
   acervo por participante, que é dado verificável.
   -------------------------------------------------------------------------- */

const SWEET_GIFT = [
  { src: '/images/sweet-gift/04.jpg',  marca: 'Stephany Santos',            edicao: 'No Ritmo da Música · 2020.1',  alt: 'Caixa de doces com laço, pronta para presentear, na edição No Ritmo da Música do Sweet & Coffee Week' },
  { src: '/images/sweet-gift/05.webp', marca: 'Bolo da Vovó',               edicao: 'Doces do Mundo · 2017.2',      alt: 'Bolo da Vovó ao lado de uma caixinha de docinhos embalada com laço, no Sweet & Coffee Week' },
  { src: '/images/sweet-gift/03.jpg',  marca: 'Stephany Santos',            edicao: 'No Ritmo da Música · 2020.1',  alt: 'Tábua com creme de chocolate, morangos e uvas na edição No Ritmo da Música do Sweet & Coffee Week' },
  { src: '/images/sweet-gift/01.jpg',  marca: 'Rafaela Fontes Chocolateria', edicao: 'No Ritmo da Música · 2020.1', alt: 'Bandeja com creme de chocolate, frutas, brownies e waffles no Sweet & Coffee Week' },
  { src: '/images/sweet-gift/06.webp', marca: 'Bolo da Vovó',               edicao: 'Namorados · 2018.1',           alt: 'Doce do Bolo da Vovó na edição Namorados do Sweet & Coffee Week' },
  { src: '/images/sweet-gift/02.jpg',  marca: 'Rafaela Fontes Chocolateria', edicao: 'No Ritmo da Música · 2020.1', alt: 'Morango sendo mergulhado no creme de chocolate em um combo do Sweet & Coffee Week' },
  { src: '/images/sweet-gift/07.webp', marca: 'Bolo da Vovó',               edicao: 'Pâtisserie Francesa · 2019.1', alt: 'Doce do Bolo da Vovó na edição Pâtisserie Francesa do Sweet & Coffee Week' },
  { src: '/images/sweet-gift/09.webp', marca: 'Bolo da Vovó',               edicao: 'Contos de Fadas · 2019.2',     alt: 'Fatia de bolo com cobertura e doce de leite do Bolo da Vovó, no Sweet & Coffee Week' },
  { src: '/images/sweet-gift/08.webp', marca: 'Bolo da Vovó',               edicao: 'Pâtisserie Francesa · 2019.1', alt: 'Doce do Bolo da Vovó na edição Pâtisserie Francesa do Sweet & Coffee Week' },
  { src: '/images/sweet-gift/10.webp', marca: 'Bolo da Vovó',               edicao: 'Contos de Fadas · 2019.2',     alt: 'Doce do Bolo da Vovó na edição Contos de Fadas do Sweet & Coffee Week' },
]


/** As quatro fotos do Sweet Gift, na ordem em que a galeria da Home as mostra. */
export function sweetGiftPhotos() {
  return SWEET_GIFT
}

/** Fotos do herói de uma rota (podem entrar em crossfade). Vazio = sem foto. */
export function heroPhotos(rota) {
  return HEROES[rota] || []
}

/** Primeira foto do herói da rota, ou `null`. */
export function heroPhoto(rota) {
  return heroPhotos(rota)[0] || null
}

/* ----------------------------------------------------------------------------
   Utilitários
   -------------------------------------------------------------------------- */

/** `style` pronto para um elemento com foto de fundo, já com o ponto focal. */
export function bgStyle(foto, { mobile = false } = {}) {
  if (!foto) return {}
  return {
    backgroundImage: `url("${foto.src}")`,
    backgroundSize: 'cover',
    backgroundPosition: (mobile && foto.mobilePosition) || foto.position || 'center',
    backgroundRepeat: 'no-repeat',
  }
}

export { focalPosition }
