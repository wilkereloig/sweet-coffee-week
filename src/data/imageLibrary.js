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
   · `/images/combos/<slug>/main.jpg` + `photo-NN.jpg` — fotos POR PARTICIPANTE
     da edição Lovers (2026.1), 21 marcas.
   · `/images/edicoes/<code>/combos/<slug>.webp` — UMA foto de combo por
     participante das edições 2017.2 a 2025, escolhida nas pastas "combos por
     participante" do acervo bruto (14/10/2026). Manifesto em editionCombos.js.
     2016, 2017.1 e 2018.2 não têm esse vínculo no acervo.
   · `/images/marcas-edicoes/<code>/logo.png` — marca de cada edição.
   · `/logos/participants/<slug>.png` — marca de cada participante da Lovers.
   · `/images/momentos/`, `/images/campanha/`, `/images/lovers-publico/` —
     público e bastidores, sem vínculo com marca.

   Regra dura: onde não há foto confirmada, devolvemos `null` e a interface
   mostra reserva editorial. Nunca a foto de outro participante ou de outra
   edição para preencher espaço.
   ========================================================================= */

import { EDITION_GALLERY } from './editionGallery.js'
import { EDITION_COMBOS } from './editionCombos.js'
import { focalPosition } from './focalPoints.js'
import { BRAND_LIST, resolveParticipant } from './participantAssets.js'
import { SWEET_COFFEE_HISTORY } from './sweetCoffeeHistory.js'
import { VARIANTES } from './imageVariants.js'
import { MUNDO_EDICAO } from './mundoEdicao.js'

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

/**
 * Um combo de cada participante da edição, com a marca: Lovers sai das pastas
 * de /images/combos/, as edições anteriores de editionCombos.js. Vazio quando o
 * acervo não liga foto e marca (2016, 2017.1, 2018.2).
 * @returns {{src:string, alt:string, position:string, marca:string, indice:number}[]}
 */
export function editionCombos(code) {
  const lista = code === COMBO_EDITION
    ? BRAND_LIST.map((b) => ({ marca: b.name, src: comboMain(b.slug)?.src })).filter((c) => c.src)
    : EDITION_COMBOS[code] || []
  const rotulo = editionLabel(code)
  return lista.map((c, i) => ({
    src: c.src,
    marca: c.marca,
    indice: i + 1,
    alt: `Combo da ${c.marca} na edição ${rotulo} do Sweet & Coffee Week`,
    position: focalPosition(c.src),
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
  // Chamado com slug, o alt leva o nome da marca, não o slug.
  const nome = COMBO_COUNT[nomeOuSlug] ? (BRAND_LIST.find((b) => b.slug === slug)?.name ?? slug) : nomeOuSlug
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
  /* Home (28/09/2026): a abertura anuncia a edição de novembro, então as fotos
     são de PESSOAS e todas de uma edição só, a Lovers — a legenda diz isso, e
     nenhuma pode ser lida como KV ou tema da próxima. Ficaram de fora de
     propósito: fantasias (Heróis & Vilões, Harley Quinn), personagens de
     contos (a foto da Padoca do Bosque) e a faixa do Sebrae (§9.6). */
  home: [
    { src: '/images/lovers-publico/08.jpg', alt: 'Sweet Lovers à mesa com combos da edição Lovers do Sweet & Coffee Week', position: 'center 55%', mobilePosition: 'center 55%' },
    { src: '/images/lovers-publico/07.jpg', alt: 'Público à mesa na calçada da Caffè Basilico’s, com o selo do Sweet & Coffee Week na porta', position: 'center 60%', mobilePosition: 'center 60%' },
    { src: '/images/lovers-publico/04.jpg', alt: 'Grupo de Sweet Lovers reunido durante a edição Lovers do Sweet & Coffee Week', position: 'center 45%', mobilePosition: 'center 45%' },
  ],
  /* As 22 fotos das visitas às lojas participantes (acervo, agosto/2026)
     dividem-se entre as duas páginas: nenhuma imagem se repete de um herói
     para o outro. Participar fica com a primeira metade, Apoiar com a
     segunda. As 01 e 03 ficam fora: mostram o painel de apoio do Sebrae, e o
     site não exibe patrocinador (§2.2). */
  participar: [
    { src: '/images/participantes-lojas/02.jpg', alt: 'Visita a uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
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
  /* Sweet Lovers: o público que percorre a rota. As 01 e 02 ficam fora:
     mostram o painel de apoio do Sebrae (§2.2). */
  contato: [
    { src: '/images/sweet-lovers/03.jpg', alt: 'Sweet Lovers durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/sweet-lovers/04.jpg', alt: 'Sweet Lovers durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
    { src: '/images/sweet-lovers/05.jpg', alt: 'Sweet Lovers durante uma edição do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 34%' },
  ],
  /* Entrega dos prêmios, o assunto literal da página (pedido do Wilke,
     21/08/2026). Cinco das seis são retrato de 960px: no herói largo elas
     sobem de escala e mostram só a faixa central, por isso cada `position`
     mira a altura onde estão os rostos e as placas. */
  'historico-awards': [
    { src: '/images/awards-entrega/01.jpg', alt: 'Equipe d’O Maestro Café com os prêmios do Sweet Awards do Sweet & Coffee Week', position: 'center 55%', mobilePosition: 'center 40%' },
    { src: '/images/awards-entrega/02.jpg', alt: 'Equipe d’O Maestro Café reunida com os prêmios do Sweet Awards do Sweet & Coffee Week', position: 'center 60%', mobilePosition: 'center 45%' },
    { src: '/images/awards-entrega/03.jpg', alt: 'Equipe da Jolie Café Pâtisserie na loja com os prêmios do Sweet Awards do Sweet & Coffee Week', position: 'center 65%', mobilePosition: 'center 50%' },
    { src: '/images/awards-entrega/04.jpg', alt: 'Entrega do prêmio de 1º lugar do Sweet Awards do Sweet & Coffee Week à Bocaditos', position: 'center 45%', mobilePosition: 'center 30%' },
    { src: '/images/awards-entrega/05.jpg', alt: 'Entrega de prêmios do Sweet Awards em uma loja participante do Sweet & Coffee Week', position: 'center 40%', mobilePosition: 'center 36%' },
    { src: '/images/awards-entrega/06.jpg', alt: 'Equipe da Jolie Café Pâtisserie recebendo os prêmios do Sweet Awards do Sweet & Coffee Week', position: 'center 62%', mobilePosition: 'center 50%' },
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

/* ----------------------------------------------------------------------------
   Participar 03 — o que a marca ganha (18/09/2026)
   Uma foto por ganho, escolhida pelo assunto e conferida no acervo. O combo
   sai do acervo da Lovers (vínculo marca↔foto confirmado); as outras três
   não atribuem nada a quem o acervo não identifica. Ficaram de fora os
   displays de mesa de `campanha/`: trazem preço e data impressos (§2.2).
   -------------------------------------------------------------------------- */

const GANHOS = {
  imprensa: { src: '/images/imprensa/01.jpg', alt: 'Wow Cookies em estúdio de TV, na cobertura de imprensa do Sweet & Coffee Week', position: 'center 30%' },
  publico: { src: '/images/lovers-publico/08.jpg', alt: 'Sweet Lovers à mesa com combos da edição Lovers do Sweet & Coffee Week', position: 'center 55%' },
  awards: { src: '/images/awards-bastidores/01.jpg', alt: 'Equipe comemorando um prêmio do Sweet Awards em edição anterior', position: 'center 35%' },
}

/** Foto de um ganho da página Participar (`combo` · `imprensa` · `publico` · `awards`), ou `null`. */
export function fotoGanho(chave) {
  return chave === 'combo' ? comboMain('Rollab Confeitaria') : GANHOS[chave] || null
}

/* ----------------------------------------------------------------------------
   Home — as fotos das seções de baixo (28/09/2026; legendas revistas em
   12/10/2026). Critério de cada uma: o sujeito (pessoa, casa, combo, detalhe)
   e a legenda que o acervo SUSTENTA — edição quando a pasta a identifica,
   marca só quando há vínculo confirmado (combos/ da Lovers, sweet-gift/
   curado pelo Wilke, imprensa/01). Registro antigo nunca se apresenta como
   material da próxima edição: a legenda diz de qual edição ele é.
   -------------------------------------------------------------------------- */

/* Foto de edição com legenda "assunto · Tema ano" (editionLabel), e o alt
   dizendo a mesma coisa por extenso. */
const fotoEdicao = (code, n, assunto) => ({
  src: `/images/edicoes/${code}/${n}.webp`,
  alt: `${assunto} da edição ${editionLabel(code)} do Sweet & Coffee Week`,
  position: focalPosition(`/images/edicoes/${code}/${n}.webp`),
  legenda: `${assunto} · ${editionLabel(code)}`,
})

const HOME = {
  /* Combos que acompanham as pessoas do herói, um por foto (mesma edição). */
  heroiCombos: [
    { ...comboMain("Canuto's"), legenda: "Canuto's" },
    { ...comboMain("Caffè Basilico's"), legenda: "Caffè Basilico's" },
    { ...comboMain('O Maestro Café'), legenda: 'O Maestro Café' },
  ],
  /* 02 Como funciona — combos completos de casas diferentes (doce, salgado e
     bebida à vista), em crossfade. Marca na legenda: o vínculo é do acervo
     combos/ da Lovers. Nenhuma repete o herói (Canuto's, Basilico's, Maestro).
     Escolhidas (14/10/2026) por manter o combo inteiro nos DOIS cortes da
     moldura — 4:5 no desktop e 4:3 no celular; as horizontais perdiam itens. */
  combos: ['paneer-patisserie', 'just-food-coffee', 'casa-de-taipa-tapiocaria', 'adocee-doceria', 'wow-cookies']
    .map((slug) => ({
      ...comboMain(slug),
      legenda: `${BRAND_LIST.find((b) => b.slug === slug).name} · ${editionLabel(COMBO_EDITION)}`,
    })),
  /* 03 Em registros — a casa do depoimento, com os prêmios. */
  jolie: { src: '/images/awards-entrega/03.jpg', alt: 'Equipe da Jolie Café Pâtisserie na loja com os prêmios do Sweet Awards do Sweet & Coffee Week', position: 'center 32%' },
  /* 03 Em registros — pessoas, casas, combos e detalhe, alternados. */
  mosaico: [
    { src: '/images/lovers-publico/06.jpg', alt: 'Amigas posando juntas durante a edição Lovers do Sweet & Coffee Week', position: 'center 40%', legenda: 'Sweet Lovers · Lovers 2026.1' },
    { ...fotoEdicao('2025', '03', 'Combo'), position: 'center 72%' },
    { src: '/images/sweet-gift/02.jpg', alt: 'Morango sendo mergulhado no creme de chocolate em um combo do Sweet & Coffee Week', position: 'center 55%', legenda: 'Sweet Gift · Rafaela Fontes Chocolateria · 2020.1' },
    { src: '/images/imprensa/01.jpg', alt: 'Wow Cookies em estúdio de TV, na cobertura de imprensa do Sweet & Coffee Week', position: 'center 30%', legenda: 'Wow Cookies na TV · cobertura de imprensa' },
    { src: '/images/participantes-lojas/22.jpg', alt: 'Equipe de uma casa participante reunida em frente à loja durante o Sweet & Coffee Week', position: 'center 45%', legenda: 'Equipe de uma casa participante' },
    fotoEdicao('2024', '09', 'Combo'),
  ],
  /* 04 Trajetória — capas de quatro edições.
     Nenhuma com personagem de desenho (a 2023/04 tem uma luva do Mickey). */
  edicoes: [
    { ...fotoEdicao('2016', '01', 'Registro'), ano: '2016' },
    { ...fotoEdicao('2021.2', '02', 'Registro'), ano: '2021' },
    { ...fotoEdicao('2023', '08', 'Registro'), ano: '2023' },
    { ...fotoEdicao('2025', '09', 'Registro'), ano: '2025' },
  ],
  /* 05 Sweet Awards — a entrega de um prêmio (edição não identificada no acervo). */
  premio: { src: '/images/awards-entrega/01.jpg', alt: 'Equipe d’O Maestro Café com os prêmios do Sweet Awards do Sweet & Coffee Week', position: 'center 40%', legenda: 'O Maestro Café com os prêmios do Sweet Awards' },
}

/* ----------------------------------------------------------------------------
   Próxima edição — abertura da Home em modo destaque (13/10/2026)
   Peças da EDIÇÃO 2026.2, nenhuma foto de edição anterior:
   · marca: o lettering CARTOON da marca oficial (Dropbox F2,
     01_IDENTIDADE_VISUAL/01_MARCA/PNG — o mesmo do selo aprovado), recortado
     da margem transparente e convertido para WebP. Não redesenhar.
   · fundo: ilustração gerada no Magnific com GPT 2.5, SEM imagem de
     referência (as duas tentativas com referência foram reprovadas pelo
     Wilker em 13/10/2026): amarelo #FAC506 da logo, raios chapados da paleta
     da edição saindo da direita, xícara, bolo, coxinha e donut pequenos na
     borda direita, meio livre para o vídeo. 3:2, 2400×1600. Original em
     05_SITE/02_ASSETS/fundo-heroi-home_gpt25_v3a_USADO.png. Sem texto, sem
     pessoa, sem adereço de animação (decisão de 03/10/2026).
   · video: o vídeo de lançamento (versão sem "Natal e região", a que está no
     Instagram), reduzido para 720×1280; capa = o quadro de 37,5 s.
   -------------------------------------------------------------------------- */
const PROXIMA_EDICAO = {
  marca: { src: '/images/marcas-edicoes/2026.2/tema.webp', alt: 'Cartoon' },
  fundo: { src: '/images/marcas-edicoes/2026.2/fundo-heroi.webp', alt: '' },
  video: {
    src: '/videos/edicao-2026-2/lancamento.mp4',
    capa: '/images/marcas-edicoes/2026.2/video-capa.webp',
  },
}

/** Peça da abertura da próxima edição (`marca` · `fundo` · `video`), ou `null`. */
export function fotoProximaEdicao(chave) {
  return PROXIMA_EDICAO[chave] || null
}

/* Letreiros desenhados da edição 2026.2 no traço do título aprovado (MANUAL-CARTOON 1.0: "TÁ CHEGANDO!" —
   bolha amarela, contorno preto, sombra vermelha), gerados em 31/10 (05_SITE/07_LETREIROS_v02), recortados ao
   conteúdo e convertidos para WebP, fundo transparente. Título fixo de seção:
   <Letreiro imagem={letreiroEdicao('elenco')} texto="…" /> — o texto real vai no HTML.
   Letreiro novo entra aqui, nunca montado na página. */
const LETREIROS_EDICAO = {
  elenco: { src: '/images/marcas-edicoes/2026.2/letreiros/nosso-elenco.webp', largura: 1400, altura: 575 },
  provar: { src: '/images/marcas-edicoes/2026.2/letreiros/hora-de-provar.webp', largura: 1400, altura: 653 },
  onde: { src: '/images/marcas-edicoes/2026.2/letreiros/onde-ficam.webp', largura: 1400, altura: 627 },
  rota: { src: '/images/marcas-edicoes/2026.2/letreiros/minha-rota.webp', largura: 1400, altura: 624 },
  avalie: { src: '/images/marcas-edicoes/2026.2/letreiros/avalie-sua-experiencia.webp', largura: 1400, altura: 654 },
}

/* Preço do combo desenhado (06_MATERIAIS_PDV/02_DISPLAY_MESA/07_ELEMENTOS_PNG/preco-a-letreiro.png, a peça do
   display de mesa), recortado ao conteúdo. O valor vem impresso: só vale para combo com `valor` igual. */
const PRECO_COMBO_EDICAO = { src: '/images/marcas-edicoes/2026.2/letreiros/combo-preco.webp', largura: 900, altura: 477, valor: 38.9 }

/** Letreiro "Combo R$ 38,90" quando o preço do combo é esse; senão `null` (a página mostra o número). */
export function precoComboEdicao(preco) {
  return Number(preco) === PRECO_COMBO_EDICAO.valor ? PRECO_COMBO_EDICAO : null
}

/** Letreiro desenhado da edição (`elenco` · `provar` · `onde` · `rota` · `avalie`), ou `null`. */
export function letreiroEdicao(chave) {
  return LETREIROS_EDICAO[chave] || null
}

/* Selo da edição 2026.2 (manual v03, assets/logo-scw-cartoon.png), arquivo
   oficial convertido para WebP sem recorte. Cabeçalho da camada /cartoon e
   herói da Entrada; nunca centralizado (CLAUDE.md raiz, Marca). */
const SELO_EDICAO = { src: '/images/marcas-edicoes/2026.2/selo/selo-cartoon.webp', largura: 1921, altura: 1898, alt: 'Sweet & Coffee Week Cartoon' }

/** Selo oficial da edição 2026.2. */
export function seloEdicao() {
  return SELO_EDICAO
}

/* Marcas do cabeçalho da edição por página (05/11/2026, pedido do Wilker): o selo da Cartoon nas páginas gerais, o
   letreiro oficial do Mapa da Doçura no mapa e o da Caça aos Carimbos na Caça. Arquivos oficiais de
   06_MATERIAIS_PDV/03_MAPA_IMPRESSO/04_SINALIZACAO (titulo-mapa-da-docura_… e logo-caca-aos-carimbos_…), só recortados
   ao conteúdo e convertidos para WebP (960 no uso; 480 e 1200 ficam ao lado) — nunca redesenhados. */
const MARCAS_TOPO = {
  mapa: { src: '/images/marcas-edicoes/2026.2/logos-topo/mapa-da-docura-960.webp', largura: 960, altura: 497, nome: 'Mapa da Doçura' },
  caca: { src: '/images/marcas-edicoes/2026.2/logos-topo/caca-aos-carimbos-960.webp', largura: 960, altura: 482, nome: 'Caça aos Carimbos' },
}

/** Marca do cabeçalho conforme a página: 'mapa' | 'caca' trazem o letreiro próprio; qualquer outra, o selo da edição. */
export function marcaDoTopo(grupo) {
  const m = MARCAS_TOPO[grupo]
  return m ? { ...m, grupo } : { ...SELO_EDICAO, grupo: 'edicao', nome: SELO_EDICAO.alt }
}

/* Troféu do Sweet Awards v15 (decisões de 22/10: fatia de bolo com colher de sobremesa, base no
   formato do selo; 1º ouro, 2º prata, 3º cobre), de 01_SWEET_AWARDS_MARCA/TROFEU-ARTES/*-frente.png,
   recortado ao conteúdo e convertido para WebP, fundo transparente. O metal só existe nestes arquivos
   (não é token). Premiação; nunca redesenhado (§10.15). */
const TROFEUS_EDICAO = {
  ouro: { src: '/images/marcas-edicoes/2026.2/trofeu/trofeu-ouro.webp', largura: 644, altura: 900 },
  prata: { src: '/images/marcas-edicoes/2026.2/trofeu/trofeu-prata.webp', largura: 633, altura: 900 },
  cobre: { src: '/images/marcas-edicoes/2026.2/trofeu/trofeu-cobre.webp', largura: 648, altura: 900 },
}

/* O mesmo troféu em desenho (traço e cor chapada, brilhos em volta), do manual v02 e do convite do press kit
   (ig-trofeu-dourado / el-trofeu). É o troféu das cenas da edição (palco do Sweet Awards e da Entrada); o de metal
   fica no pódio dos resultados. Pedido do Wilker, 04/11. */
export const TROFEU_DESENHO_EDICAO = { src: '/images/marcas-edicoes/2026.2/trofeu/trofeu-dourado.webp', largura: 781, altura: 977 }

/** Troféu do Sweet Awards: 'ouro' (1º), 'prata' (2º) ou 'cobre' (3º). */
export function trofeuEdicao(metal = 'ouro') {
  return TROFEUS_EDICAO[metal] || TROFEUS_EDICAO.ouro
}

/* Marca permanente do Sweet Awards (22/10: "Sweet" oficial + "AWARDS" em Montserrat Black), sem relação
   com o KV da edição. Versão creme, para fundo escuro. Kit completo em 01_SWEET_AWARDS_MARCA/MARCA-B/. */
export const MARCA_SWEET_AWARDS = { src: '/images/sweet-awards/marca-creme.svg', largura: 404, altura: 260, alt: 'Sweet Awards' }

/** Marca da realizadora (F2 Experience), a mesma da seção de realização da Home. */
export const LOGO_F2 = { src: '/images/logo-f2experience.svg', largura: 694, altura: 89, alt: 'F2 Experience' }

/* Patrocínio e apoio da edição 2026.2. Sicredi = arquivo original, versão preferencial positiva: só sobre branco
   (manual de identidade p. 16-17; em outro fundo é a versão Box de Reserva). Mínimo digital: 80 px de largura. */
export const MARCAS_PARCEIROS = {
  sicredi: { src: '/images/marcas-edicoes/2026.2/parceiros/sicredi.svg', largura: 629, altura: 161, alt: 'Sicredi' },
  senac: { src: '/images/marcas-edicoes/2026.2/parceiros/senac.png', largura: 480, altura: 76, alt: 'Senac' },
  espacoReduzido: { src: '/images/marcas-edicoes/2026.2/parceiros/espaco-reduzido.png', largura: 640, altura: 66, alt: 'Espaço Reduzido' },
}

/* Elementos novos da edição 2026.2 (docs/cartoon-2026-2/10 §10.15), gerados por
   scripts/edicao/elementos-edicao.py a partir das folhas do 05_ELEMENTOS_v01.
   Fundo transparente; largura/altura são as do arquivo (o teste confere).
   Peça nova entra aqui, nunca montada na página. */
const ELEMENTOS_EDICAO = '/images/marcas-edicoes/2026.2/elementos'

/* Lista fechada, na ordem da folha de ícones (6 colunas × 4 linhas). */
const ICONES_EDICAO = new Set(('inicio casas mapa rota avaliar premio no-local para-viagem delivery vegano sem-gluten '
  + 'sem-lactose sem-acucar endereco horario aberto-agora conversar como-chegar quero-ir ja-fui progresso '
  + 'compartilhar vazio erro '
  // 06-07/11/2026, atalhos do mapa: vouchers (Prêmios) e pódio com coroa (Ranking), ilustrados — scripts/edicao/icones-atalhos.py
  + 'vouchers ranking '
  // 06/11/2026, atalho do carimbo de delivery: sacola + selo de check (a moto de `delivery` lê como "pedir delivery")
  + 'carimbo-delivery '
  // 10/11/2026, ponto de retirada dos vouchers (selo do pin do Espaço Reduzido): bilhete + seta + bandeja — scripts/edicao/icones-atalhos.py retirada
  + 'retirada '
  // 10/11/2026, filtro "Vegetariano": cenoura ilustrada pela API de imagem, ajustada por scripts/edicao/icones-atalhos.py
  + 'vegetariano '
  // 11/11/2026, filtro "Menos movimento agora" do mapa: mesinha de café com xícara e uma cadeira vazia (doc 20, parte D)
  + 'movimento-tranquilo').split(' '))

/** Ícone ilustrado da edição (192×192, exibir a 32, 48 ou 64 px), ou `null`. Nunca carrega função sozinho: leva texto ao lado. */
export function iconeEdicao(nome) {
  return ICONES_EDICAO.has(nome) ? { src: `${ELEMENTOS_EDICAO}/icones/${nome}.webp` } : null
}

const CENAS_EDICAO = {
  tv: { src: `${ELEMENTOS_EDICAO}/cena/tv-antiga.webp`, largura: 1133, altura: 1107 },
  natal: { src: `${ELEMENTOS_EDICAO}/cena/natal.webp`, largura: 1536, altura: 266 },
  // 11/11/2026, base do herói da Entrada (com paralaxe): a cidade de Natal em panorama, fundo transparente. Origem: 06_MATERIAIS_PDV/
  // 02_DISPLAY_MESA/07_ELEMENTOS_PNG ("Panorama costeiro de fantasia colorida.png", 2097×750), convertida em WebP + variantes 480/960.
  panorama: { src: `${ELEMENTOS_EDICAO}/cena/panorama-natal.webp`, largura: 2097, altura: 750 },
  // Cenografia dos topos (família 2), 31/10 em 05_SITE/08_CENOGRAFIA_TOPOS: placas de rua (Rota) e prancheta (Serviço).
  placas: { src: `${ELEMENTOS_EDICAO}/cena/placas.webp`, largura: 917, altura: 1021 },
  prancheta: { src: `${ELEMENTOS_EDICAO}/cena/prancheta.webp`, largura: 976, altura: 994 },
}

/** Cenografia da edição (`tv` · `natal` · `panorama` · `placas` · `prancheta`) com a medida do arquivo, ou `null`. */
export function cenaEdicao(chave) {
  return Object.hasOwn(CENAS_EDICAO, chave) ? CENAS_EDICAO[chave] : null
}

/* Elementos de gibi da repaginação de 04/11 (§10.17), no traço das peças aprovadas (carrossel de combos,
   Confirmados, Júri, imprensa): gerados no Codex (05_SITE/11_REPAGINACAO_DESENHO) e recortados por
   scripts/edicao/elementos-gibi.py. Fundo transparente, exceto o palco (cena inteira). */
const GIBI_EDICAO = `${ELEMENTOS_EDICAO}/gibi`
const ELEMENTOS_GIBI = {
  mesa: { src: `${GIBI_EDICAO}/mesa.webp`, largura: 1200, altura: 777 },
  palco: { src: `${GIBI_EDICAO}/palco.webp`, largura: 1536, altura: 864 },
  loja: { src: `${GIBI_EDICAO}/objetos/loja.webp`, largura: 480, altura: 465 },
  bandeja: { src: `${GIBI_EDICAO}/objetos/bandeja.webp`, largura: 480, altura: 448 },
  prancheta: { src: `${GIBI_EDICAO}/objetos/prancheta.webp`, largura: 445, altura: 480 },
  pino: { src: `${GIBI_EDICAO}/objetos/pino.webp`, largura: 378, altura: 473 },
  megafone: { src: `${GIBI_EDICAO}/objetos/megafone.webp`, largura: 480, altura: 444 },
  despertador: { src: `${GIBI_EDICAO}/objetos/despertador.webp`, largura: 480, altura: 471 },
  'luva-aponta': { src: `${GIBI_EDICAO}/luvas/aponta.webp`, largura: 360, altura: 234 },
  'luva-joinha': { src: `${GIBI_EDICAO}/luvas/joinha.webp`, largura: 278, altura: 340 },
  'luva-segura': { src: `${GIBI_EDICAO}/luvas/segura.webp`, largura: 335, altura: 255 },
  'luva-acena': { src: `${GIBI_EDICAO}/luvas/acena.webp`, largura: 360, altura: 320 },
}

/** Elemento de gibi da edição (`mesa` · `palco` · objetos · `luva-*`) com a medida do arquivo, ou `null`. Decorativo. */
export function gibiEdicao(chave) {
  return Object.hasOwn(ELEMENTOS_GIBI, chave) ? ELEMENTOS_GIBI[chave] : null
}

/* Kit de cenário por casa (§10.15, família 3): as 27 casas da edição (piloto + 24 de 31/10). */
const KITS_TEMA_EDICAO = {
  'casa-alice-doceria': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/casa-alice-doceria/cenario.webp`, largura: 1536, altura: 392 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/casa-alice-doceria/objeto-a.webp`, largura: 527, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/casa-alice-doceria/objeto-b.webp`, largura: 478, altura: 700 },
  },
  'boldfood-confeitaria-inclusiva': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/boldfood-confeitaria-inclusiva/cenario.webp`, largura: 1536, altura: 501 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/boldfood-confeitaria-inclusiva/objeto-a.webp`, largura: 482, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/boldfood-confeitaria-inclusiva/objeto-b.webp`, largura: 700, altura: 488 },
  },
  'adocee-doceria': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/adocee-doceria/cenario.webp`, largura: 1536, altura: 455 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/adocee-doceria/objeto-a.webp`, largura: 570, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/adocee-doceria/objeto-b.webp`, largura: 700, altura: 686 },
  },
  // 31/10/2026: os 24 restantes (05_SITE/05_ELEMENTOS_v03, gerados pela API, temas do painel).
  'bolomania': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/bolomania/cenario.webp`, largura: 1536, altura: 413 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/bolomania/objeto-a.webp`, largura: 700, altura: 534 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/bolomania/objeto-b.webp`, largura: 528, altura: 700 },
  },
  'caffe-basilicos': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/caffe-basilicos/cenario.webp`, largura: 1536, altura: 460 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/caffe-basilicos/objeto-a.webp`, largura: 483, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/caffe-basilicos/objeto-b.webp`, largura: 475, altura: 700 },
  },
  'canutos': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/canutos/cenario.webp`, largura: 1536, altura: 412 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/canutos/objeto-a.webp`, largura: 700, altura: 666 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/canutos/objeto-b.webp`, largura: 483, altura: 700 },
  },
  'carcara': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/carcara/cenario.webp`, largura: 1536, altura: 389 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/carcara/objeto-a.webp`, largura: 700, altura: 501 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/carcara/objeto-b.webp`, largura: 659, altura: 700 },
  },
  'caroli-douces': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/caroli-douces/cenario.webp`, largura: 1536, altura: 431 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/caroli-douces/objeto-a.webp`, largura: 607, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/caroli-douces/objeto-b.webp`, largura: 677, altura: 700 },
  },
  'casa-1190-restaurante-e-coffee': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/casa-1190-restaurante-e-coffee/cenario.webp`, largura: 1536, altura: 441 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/casa-1190-restaurante-e-coffee/objeto-a.webp`, largura: 700, altura: 658 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/casa-1190-restaurante-e-coffee/objeto-b.webp`, largura: 700, altura: 573 },
  },
  'cookitos': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/cookitos/cenario.webp`, largura: 1536, altura: 360 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/cookitos/objeto-a.webp`, largura: 700, altura: 608 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/cookitos/objeto-b.webp`, largura: 700, altura: 553 },
  },
  'delicato-bolos': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/delicato-bolos/cenario.webp`, largura: 1536, altura: 458 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/delicato-bolos/objeto-a.webp`, largura: 700, altura: 695 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/delicato-bolos/objeto-b.webp`, largura: 578, altura: 700 },
  },
  'diva-do-cafe': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/diva-do-cafe/cenario.webp`, largura: 1536, altura: 418 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/diva-do-cafe/objeto-a.webp`, largura: 651, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/diva-do-cafe/objeto-b.webp`, largura: 608, altura: 700 },
  },
  'jolie-cafe-patisserie': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/jolie-cafe-patisserie/cenario.webp`, largura: 1536, altura: 467 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/jolie-cafe-patisserie/objeto-a.webp`, largura: 700, altura: 655 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/jolie-cafe-patisserie/objeto-b.webp`, largura: 700, altura: 662 },
  },
  'just-food-e-coffee': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/just-food-e-coffee/cenario.webp`, largura: 1536, altura: 407 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/just-food-e-coffee/objeto-a.webp`, largura: 680, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/just-food-e-coffee/objeto-b.webp`, largura: 452, altura: 700 },
  },
  'maison-julie-douceur': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/maison-julie-douceur/cenario.webp`, largura: 1536, altura: 418 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/maison-julie-douceur/objeto-a.webp`, largura: 700, altura: 672 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/maison-julie-douceur/objeto-b.webp`, largura: 700, altura: 691 },
  },
  'mangai': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/mangai/cenario.webp`, largura: 1536, altura: 417 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/mangai/objeto-a.webp`, largura: 665, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/mangai/objeto-b.webp`, largura: 700, altura: 617 },
  },
  'marianas-confeitaria': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/marianas-confeitaria/cenario.webp`, largura: 1536, altura: 370 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/marianas-confeitaria/objeto-a.webp`, largura: 505, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/marianas-confeitaria/objeto-b.webp`, largura: 688, altura: 700 },
  },
  'marlon-vinicius-confeitaria-e-cafe': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/marlon-vinicius-confeitaria-e-cafe/cenario.webp`, largura: 1536, altura: 478 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/marlon-vinicius-confeitaria-e-cafe/objeto-a.webp`, largura: 700, altura: 601 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/marlon-vinicius-confeitaria-e-cafe/objeto-b.webp`, largura: 383, altura: 700 },
  },
  'mr-cupcake-confeitaria': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/mr-cupcake-confeitaria/cenario.webp`, largura: 1536, altura: 415 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/mr-cupcake-confeitaria/objeto-a.webp`, largura: 465, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/mr-cupcake-confeitaria/objeto-b.webp`, largura: 313, altura: 700 },
  },
  'o-maestro-cafe': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/o-maestro-cafe/cenario.webp`, largura: 1536, altura: 470 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/o-maestro-cafe/objeto-a.webp`, largura: 700, altura: 561 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/o-maestro-cafe/objeto-b.webp`, largura: 700, altura: 599 },
  },
  'padoca-do-bosque': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/padoca-do-bosque/cenario.webp`, largura: 1536, altura: 388 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/padoca-do-bosque/objeto-a.webp`, largura: 408, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/padoca-do-bosque/objeto-b.webp`, largura: 700, altura: 673 },
  },
  'paneer-patisserie': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/paneer-patisserie/cenario.webp`, largura: 1536, altura: 400 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/paneer-patisserie/objeto-a.webp`, largura: 688, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/paneer-patisserie/objeto-b.webp`, largura: 700, altura: 668 },
  },
  'parma-doces': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/parma-doces/cenario.webp`, largura: 1536, altura: 314 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/parma-doces/objeto-a.webp`, largura: 483, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/parma-doces/objeto-b.webp`, largura: 466, altura: 700 },
  },
  'sabor-de-pao': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/sabor-de-pao/cenario.webp`, largura: 1536, altura: 426 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/sabor-de-pao/objeto-a.webp`, largura: 657, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/sabor-de-pao/objeto-b.webp`, largura: 373, altura: 700 },
  },
  'sweet-duo-confeitaria': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/sweet-duo-confeitaria/cenario.webp`, largura: 1536, altura: 495 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/sweet-duo-confeitaria/objeto-a.webp`, largura: 700, altura: 653 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/sweet-duo-confeitaria/objeto-b.webp`, largura: 516, altura: 700 },
  },
  'vivianne-castro-doces': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/vivianne-castro-doces/cenario.webp`, largura: 1536, altura: 377 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/vivianne-castro-doces/objeto-a.webp`, largura: 700, altura: 525 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/vivianne-castro-doces/objeto-b.webp`, largura: 689, altura: 700 },
  },
  'wow-cookies': {
    cenario: { src: `${ELEMENTOS_EDICAO}/temas/wow-cookies/cenario.webp`, largura: 1536, altura: 426 },
    objetoA: { src: `${ELEMENTOS_EDICAO}/temas/wow-cookies/objeto-a.webp`, largura: 563, altura: 700 },
    objetoB: { src: `${ELEMENTOS_EDICAO}/temas/wow-cookies/objeto-b.webp`, largura: 566, altura: 700 },
  },
}

/* Cenário do combo (05_SITE/09_CENARIO_COMBO): a faixa do kit com o combo da casa desenhado dentro do tema.
   Caffè Basilico's pela API (piloto, 31/10); as outras 26 pelo Codex (01/11), recortadas ao desenho.
   Vai fixa no rodapé da ficha; casa sem ele usa a faixa do kit. */
const CENARIOS_COMBO_EDICAO = {
  'adocee-doceria': { src: `${ELEMENTOS_EDICAO}/temas/adocee-doceria/cenario-combo.webp`, largura: 1536, altura: 781 },
  'boldfood-confeitaria-inclusiva': { src: `${ELEMENTOS_EDICAO}/temas/boldfood-confeitaria-inclusiva/cenario-combo.webp`, largura: 1536, altura: 671 },
  'bolomania': { src: `${ELEMENTOS_EDICAO}/temas/bolomania/cenario-combo.webp`, largura: 1535, altura: 625 },
  'caffe-basilicos': { src: `${ELEMENTOS_EDICAO}/temas/caffe-basilicos/cenario-combo.webp`, largura: 1536, altura: 512 },
  'canutos': { src: `${ELEMENTOS_EDICAO}/temas/canutos/cenario-combo.webp`, largura: 1800, altura: 571 },
  'carcara': { src: `${ELEMENTOS_EDICAO}/temas/carcara/cenario-combo.webp`, largura: 1800, altura: 490 },
  'caroli-douces': { src: `${ELEMENTOS_EDICAO}/temas/caroli-douces/cenario-combo.webp`, largura: 1536, altura: 616 },
  'casa-1190-restaurante-e-coffee': { src: `${ELEMENTOS_EDICAO}/temas/casa-1190-restaurante-e-coffee/cenario-combo.webp`, largura: 1536, altura: 569 },
  'casa-alice-doceria': { src: `${ELEMENTOS_EDICAO}/temas/casa-alice-doceria/cenario-combo.webp`, largura: 1536, altura: 696 },
  'cookitos': { src: `${ELEMENTOS_EDICAO}/temas/cookitos/cenario-combo.webp`, largura: 1800, altura: 585 },
  'delicato-bolos': { src: `${ELEMENTOS_EDICAO}/temas/delicato-bolos/cenario-combo.webp`, largura: 1536, altura: 627 },
  'diva-do-cafe': { src: `${ELEMENTOS_EDICAO}/temas/diva-do-cafe/cenario-combo.webp`, largura: 1800, altura: 596 },
  'jolie-cafe-patisserie': { src: `${ELEMENTOS_EDICAO}/temas/jolie-cafe-patisserie/cenario-combo.webp`, largura: 1800, altura: 600 },
  'just-food-e-coffee': { src: `${ELEMENTOS_EDICAO}/temas/just-food-e-coffee/cenario-combo.webp`, largura: 1800, altura: 529 },
  'maison-julie-douceur': { src: `${ELEMENTOS_EDICAO}/temas/maison-julie-douceur/cenario-combo.webp`, largura: 1536, altura: 553 },
  'mangai': { src: `${ELEMENTOS_EDICAO}/temas/mangai/cenario-combo.webp`, largura: 1800, altura: 650 },
  'marianas-confeitaria': { src: `${ELEMENTOS_EDICAO}/temas/marianas-confeitaria/cenario-combo.webp`, largura: 1536, altura: 550 },
  'marlon-vinicius-confeitaria-e-cafe': { src: `${ELEMENTOS_EDICAO}/temas/marlon-vinicius-confeitaria-e-cafe/cenario-combo.webp`, largura: 1800, altura: 554 },
  'mr-cupcake-confeitaria': { src: `${ELEMENTOS_EDICAO}/temas/mr-cupcake-confeitaria/cenario-combo.webp`, largura: 1800, altura: 622 },
  'o-maestro-cafe': { src: `${ELEMENTOS_EDICAO}/temas/o-maestro-cafe/cenario-combo.webp`, largura: 1536, altura: 622 },
  'padoca-do-bosque': { src: `${ELEMENTOS_EDICAO}/temas/padoca-do-bosque/cenario-combo.webp`, largura: 1536, altura: 622 },
  'paneer-patisserie': { src: `${ELEMENTOS_EDICAO}/temas/paneer-patisserie/cenario-combo.webp`, largura: 1536, altura: 626 },
  'parma-doces': { src: `${ELEMENTOS_EDICAO}/temas/parma-doces/cenario-combo.webp`, largura: 1536, altura: 494 },
  'sabor-de-pao': { src: `${ELEMENTOS_EDICAO}/temas/sabor-de-pao/cenario-combo.webp`, largura: 1536, altura: 707 },
  'sweet-duo-confeitaria': { src: `${ELEMENTOS_EDICAO}/temas/sweet-duo-confeitaria/cenario-combo.webp`, largura: 1536, altura: 781 },
  'vivianne-castro-doces': { src: `${ELEMENTOS_EDICAO}/temas/vivianne-castro-doces/cenario-combo.webp`, largura: 1536, altura: 665 },
  'wow-cookies': { src: `${ELEMENTOS_EDICAO}/temas/wow-cookies/cenario-combo.webp`, largura: 1536, altura: 682 },
}

/** Faixa do rodapé fixo da ficha: o cenário com o combo, ou a faixa do kit; `null` sem kit. */
export function cenarioComboEdicao(slug) {
  return (Object.hasOwn(CENARIOS_COMBO_EDICAO, slug) && CENARIOS_COMBO_EDICAO[slug]) || kitTemaEdicao(slug)?.cenario || null
}

/* Pin do mapa por casa, desenhado a partir do tema dela (05_SITE/10_PINS_MAPA).
   Gerados no Codex em 01/11 a partir do pacote; recortados ao desenho, 144 px de largura (3× o tamanho no mapa).
   A ponta do pin fica no centro da base: o marcador ancora embaixo. */
const PINS_EDICAO = {
  'adocee-doceria': { src: `${ELEMENTOS_EDICAO}/pins/adocee-doceria.webp`, largura: 144, altura: 185 },
  'boldfood-confeitaria-inclusiva': { src: `${ELEMENTOS_EDICAO}/pins/boldfood-confeitaria-inclusiva.webp`, largura: 144, altura: 184 },
  'bolomania': { src: `${ELEMENTOS_EDICAO}/pins/bolomania.webp`, largura: 144, altura: 184 },
  'caffe-basilicos': { src: `${ELEMENTOS_EDICAO}/pins/caffe-basilicos.webp`, largura: 144, altura: 185 },
  'canutos': { src: `${ELEMENTOS_EDICAO}/pins/canutos.webp`, largura: 144, altura: 184 },
  'carcara': { src: `${ELEMENTOS_EDICAO}/pins/carcara.webp`, largura: 144, altura: 177 },
  'caroli-douces': { src: `${ELEMENTOS_EDICAO}/pins/caroli-douces.webp`, largura: 144, altura: 185 },
  'casa-1190-restaurante-e-coffee': { src: `${ELEMENTOS_EDICAO}/pins/casa-1190-restaurante-e-coffee.webp`, largura: 144, altura: 184 },
  'casa-alice-doceria': { src: `${ELEMENTOS_EDICAO}/pins/casa-alice-doceria.webp`, largura: 144, altura: 188 },
  'cookitos': { src: `${ELEMENTOS_EDICAO}/pins/cookitos.webp`, largura: 144, altura: 183 },
  'delicato-bolos': { src: `${ELEMENTOS_EDICAO}/pins/delicato-bolos.webp`, largura: 144, altura: 184 },
  'diva-do-cafe': { src: `${ELEMENTOS_EDICAO}/pins/diva-do-cafe.webp`, largura: 144, altura: 187 },
  'jolie-cafe-patisserie': { src: `${ELEMENTOS_EDICAO}/pins/jolie-cafe-patisserie.webp`, largura: 144, altura: 185 },
  'just-food-e-coffee': { src: `${ELEMENTOS_EDICAO}/pins/just-food-e-coffee.webp`, largura: 144, altura: 186 },
  'maison-julie-douceur': { src: `${ELEMENTOS_EDICAO}/pins/maison-julie-douceur.webp`, largura: 144, altura: 185 },
  'mangai': { src: `${ELEMENTOS_EDICAO}/pins/mangai.webp`, largura: 144, altura: 188 },
  'marianas-confeitaria': { src: `${ELEMENTOS_EDICAO}/pins/marianas-confeitaria.webp`, largura: 144, altura: 185 },
  'marlon-vinicius-confeitaria-e-cafe': { src: `${ELEMENTOS_EDICAO}/pins/marlon-vinicius-confeitaria-e-cafe.webp`, largura: 144, altura: 184 },
  'mr-cupcake-confeitaria': { src: `${ELEMENTOS_EDICAO}/pins/mr-cupcake-confeitaria.webp`, largura: 144, altura: 184 },
  'o-maestro-cafe': { src: `${ELEMENTOS_EDICAO}/pins/o-maestro-cafe.webp`, largura: 144, altura: 175 },
  'padoca-do-bosque': { src: `${ELEMENTOS_EDICAO}/pins/padoca-do-bosque.webp`, largura: 144, altura: 184 },
  'paneer-patisserie': { src: `${ELEMENTOS_EDICAO}/pins/paneer-patisserie.webp`, largura: 144, altura: 184 },
  'parma-doces': { src: `${ELEMENTOS_EDICAO}/pins/parma-doces.webp`, largura: 144, altura: 192 },
  'sabor-de-pao': { src: `${ELEMENTOS_EDICAO}/pins/sabor-de-pao.webp`, largura: 144, altura: 185 },
  'sweet-duo-confeitaria': { src: `${ELEMENTOS_EDICAO}/pins/sweet-duo-confeitaria.webp`, largura: 144, altura: 185 },
  'vivianne-castro-doces': { src: `${ELEMENTOS_EDICAO}/pins/vivianne-castro-doces.webp`, largura: 144, altura: 184 },
  'wow-cookies': { src: `${ELEMENTOS_EDICAO}/pins/wow-cookies.webp`, largura: 144, altura: 184 },
}

/**
 * Logo desenhada da casa na Cartoon (P&B + colorida e o pin do mapa) — arte da edição, versionada e gerada por
 * scripts/edicao/logos-desenhadas.py (lista 13, B7). O banco não guarda esse par: a camada de dados completa
 * `casa.logo_desenhada` com isto. `null` se a casa não tem desenho.
 */
export { logoDesenhadaEdicao } from './logosDesenhadasEdicao.js'

/**
 * Mundo da Doçura — o mapa desenhado da Cartoon (docs/cartoon-2026-2/14 §14.13; arte final: 15-caca-mapa-final.md). Dados
 * gerados por scripts/edicao/mapa-mundo-final.py (arte final do Illustrator; a provisória vinha de mapa-mundo.py): posições
 * de 0 a 1 na arte, número da casa, casas por slug, Sicredi, marcos + os caminhos:
 * `base` ({src, srcSet, placeholder}: primeira pintura, escada de larguras e miniatura borrada), `sicrediBandeira`,
 * `bandeira(numero)` (bandeirinha desenhada; `null` com `arteComBandeiras`, porque a arte já traz as bandeiras),
 * `logo(slug)` (a logo oficial reduzida, aparece no zoom) e `doceria(slug)` — `null` quando não há o arquivo.
 */
const MUNDO_PASTA = '/images/marcas-edicoes/2026.2/mundo'
export function mundoEdicao() {
  const m = MUNDO_EDICAO
  const prefixo = m.arte?.arquivo || `base-v${m.versao}`
  const base = (w) => `${MUNDO_PASTA}/${prefixo}-${w}.webp`
  return {
    ...m,
    base: { src: base(m.larguras[0]), srcSet: m.larguras.map((w) => `${base(w)} ${w}w`).join(', '), placeholder: m.arte?.placeholder || null },
    sicrediBandeira: `${MUNDO_PASTA}/sicredi-bandeira.webp`,
    sicrediLogo: `${MUNDO_PASTA}/sicredi-logo.webp`,
    bandeira: (n) => (m.bandeiras.includes(n) ? `${MUNDO_PASTA}/bandeiras/${String(n).padStart(2, '0')}.webp` : null),
    doceria: (slug) => (m.docerias.includes(slug) ? `${MUNDO_PASTA}/docerias/${slug}.webp` : null),
    logo: (slug) => (m.logos.includes(slug) ? `${MUNDO_PASTA}/logos/${slug}.webp` : null),
  }
}

/** Pin desenhado do TEMA da casa (objeto do kit). Desde 03/11 o mapa usa a logo desenhada (lista 13, M1). */

export function pinEdicao(slug) {
  return Object.hasOwn(PINS_EDICAO, slug) ? PINS_EDICAO[slug] : null
}

/** Kit de cenário de uma casa (`cenario` · `objetoA` · `objetoB`), ou `null` se a casa não tem kit. */
export function kitTemaEdicao(slug) {
  // hasOwn: o slug vem do banco, e 'constructor' não pode devolver Object.
  return Object.hasOwn(KITS_TEMA_EDICAO, slug) ? KITS_TEMA_EDICAO[slug] : null
}

/** Fotos das seções da Home (`heroiCombos` · `combo` · `jolie` · `mosaico` · `edicoes` · `premio`). */
export function fotosHome(chave) {
  return HOME[chave]
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

/* ----------------------------------------------------------------------------
   Variantes estreitas (ago/2026)

   O acervo é de desktop: 1000 a 2000px de largura. Servido a um cartão de 340
   CSS px num celular, é peso puro — medido, a Home baixava 8,8 MB antes de
   qualquer rolagem. `scripts/gerar-variantes.mjs` escreve `-480.webp` e
   `-960.webp` ao lado de cada original acima dos pisos, e declara o resultado
   em `imageVariants.js`.

   Por que o manifesto e não uma convenção de nome: `srcset` não perdoa
   candidato inexistente. O navegador escolhe pela largura DECLARADA e só
   descobre o 404 depois de escolher — o quadro fica vazio. Então só entra no
   `srcset` o caminho que o manifesto confirma ter variante em disco; o resto
   sai como sempre saiu, com o original sozinho.
   -------------------------------------------------------------------------- */

/**
 * `srcset` de uma foto, ou `undefined` se ela não tiver variante em disco.
 * O original entra como último candidato, então o desktop continua recebendo
 * exatamente o arquivo de antes.
 */
export function srcSet(src) {
  if (!src) return undefined
  const info = VARIANTES.get(src)
  if (!info || !info.larguras || !info.larguras.length) return undefined
  const base = src.slice(0, src.lastIndexOf('.'))
  const partes = info.larguras.map((w) => `${base}-${w}.webp ${w}w`)
  /* O original é o último candidato, com a largura real dele: é assim que o
     desktop continua recebendo exatamente o arquivo de antes. Sem essa entrada
     a tela grande cairia na variante de 960px. */
  if (info.original) partes.push(`${src} ${info.original}w`)
  return partes.join(', ')
}

/**
 * A variante mais próxima de uma largura alvo, ou o próprio original se a foto
 * não tiver variante. Serve o que `srcset` não alcança: fundo em CSS.
 *
 * Fundo não escolhe por largura — `image-set()` só entende resolução — então
 * quem escolhe é o CSS, por media query, e o componente manda as DUAS urls como
 * propriedade custom. É o mesmo arranjo que `--foco`/`--foco-mobile` já usa
 * (§10.4): estilo inline vence media query, então mandar um valor resolvido
 * cravaria o mesmo arquivo nas duas telas.
 */
export function fotoAte(src, largura) {
  const info = VARIANTES.get(src)
  if (!info || !info.larguras) return src
  const escolhida = info.larguras.find((w) => w >= largura)
  return escolhida ? `${src.slice(0, src.lastIndexOf('.'))}-${escolhida}.webp` : src
}

/** Largura que uma banda de herói ocupa no celular: a tela inteira, a 2x. */
export const LARGURA_HEROI_MOBILE = 960

/**
 * `sizes` — quanto a foto vai ocupar, para o navegador escolher o candidato
 * certo ANTES do layout existir. Errar aqui para mais anula o ganho: sem
 * `sizes`, o padrão é `100vw` e o celular pede sempre o maior arquivo.
 */
export const SIZES = {
  /** Miniatura de fita/galeria: ~1/2 tela no celular, ~1/5 no desktop. */
  miniatura: '(max-width: 900px) 46vw, 20vw',
  /** Cartão de pódio e de grade: quase a tela toda no celular. */
  cartao: '(max-width: 820px) 86vw, 32vw',
  /** Foto que sangra de ponta a ponta. */
  cheia: '100vw',
  /** Área fotográfica do herói institucional: largura cheia até 1000px, 52vw acima
   *  (--scw-heroi-foto-largura em scw-2026.css — os dois mudam juntos). */
  heroi: '(max-width: 1000px) 100vw, 52vw',
}

export { focalPosition }
