/*
 * APOIAR — texto e listas editoriais da página (§5.6). Os números vêm de
 * festivalFacts.js com o que medem e quando foram apurados (§9.5); nenhum é
 * copiado para cá. Patrocinadores não são exibidos (§9.6): a página mostra
 * formatos de ativação que já aconteceram, sem nomear a marca.
 *
 * Reorganizada em 12/10/2026: saíram os seis "motivos" em card (cada um
 * repetia o público, o alcance ou um ponto de contato) e entraram os formatos
 * reais do §9.6, que a página nunca tinha mostrado. Nada de cota, preço,
 * contrapartida ou garantia de retorno — isso é conversa com a organização.
 */
import { festivalFacts as F } from '../festivalFacts.js'
import { semRepetir } from './participar.js'

// Cada dado: número, nome curto e o que mede (festivalFacts), sem eco do nome.
const dado = (fato, t, i) => ({ n: fato.curto, t, d: semRepetir(t, fato.mede), i })

export const ABERTURA = {
  titulo: 'Apoie o',
  // Espaço inseparável (\u00a0) entre "Sweet" e "&" e entre "Coffee" e "Week.":
  // o "&" nunca fica sozinho no fim da linha e a quebra cai entre os pares (§10.5).
  destaque: 'Sweet\u00a0& Coffee\u00a0Week.',
  lead: `Associe sua marca a ${F.years.value} anos de gastronomia autoral, pequenos negócios e um público que circula pela cidade para provar.`,
  acao: 'Conversar sobre apoio',
  secundaria: 'Ver alcance e formatos',
}

/* 02 Alcance — dois grupos, porque são duas fontes: o histórico comercial das
   edições e o painel do Instagram oficial. ⚠️ Visualizações, alcance e
   interações são métricas DISTINTAS: nunca somar, nunca chamar visualização
   de alcance. Cada grupo declara quando foi apurado — é retrato histórico,
   não projeção para a próxima edição. As comparações com a população de Natal
   saíram: visualização não é pessoa, e conta alcançada não é morador. */
export const ALCANCE = {
  rotulo: 'O que já foi medido',
  titulo: 'Dez anos de',
  destaque: 'audiência e consumo',
  depois: ' na cidade.',
  apoio: 'Números históricos, arredondados para baixo. Mostram o que o festival já construiu, não uma projeção para a próxima edição.',
  grupos: [
    {
      titulo: 'Nas casas participantes',
      fonte: `Histórico comercial das ${F.editions.value} edições`,
      apurado: F.revenue.apurado,
      itens: [
        dado(F.revenue, 'movimentação direta', 'mecanica/promocao'),
        dado(F.combosSold, 'combos vendidos', 'combos/doce-cafe'),
      ],
    },
    {
      titulo: 'No Instagram oficial',
      fonte: 'Painel do perfil oficial do festival',
      apurado: F.igViews.apurado,
      nota: 'Visualizações, alcance e interações medem coisas diferentes e não se somam.',
      itens: [
        dado(F.igViews, 'visualizações', 'topicos/video'),
        dado(F.igReach, 'alcance', 'mecanica/publico'),
        dado(F.igInteractions, 'interações', 'mecanica/avaliar'),
        dado(F.igFollowers, 'seguidores', 'simbolos/sweet-lovers'),
      ],
    },
  ],
}

/* 03 Quem vive o festival — perfil qualitativo (sem número de público inventado). */
export const QUEM_VIVE = {
  rotulo: 'Quem vive o festival',
  titulo: 'Um público que',
  destaque: 'sai de casa para provar.',
  apoio: 'É com essa gente que a sua marca conversa: quem circula pelas casas, acompanha o Instagram oficial e espera o resultado do Sweet Awards.',
  publico: [
    'Público urbano e conectado',
    'Consumidores de experiência gastronômica',
    'Comunidade ativa no Instagram do festival',
    'Pessoas que circulam por cafeterias, docerias e restaurantes',
    'Gente que monta roteiro e divide combos com os amigos pra provar mais sabores',
    'Quem acompanha combos, participantes e resultados de cada edição',
  ],
  imprensaRotulo: 'Já noticiaram o festival',
  // Só nomes (sem logo inventada).
  veiculos: [
    'Agora RN', 'NOVO Notícias', 'Diário do RN', '96 FM',
    '98 FM', 'Tribuna do Norte', 'Agência Sebrae de Notícias', 'UFRN',
  ],
}

/* 04 Onde a marca aparece — quatro canais de cada edição. A foto e a legenda
   de cada um saem de imageLibrary.js (ver OndeAparece.jsx). Itens curtos, de
   CANAL — o que é formato de ação (sorteio, prêmio) mora em FORMATOS.
   ⛔ Saíram em 12/10/2026 as fotos de campanha/03, 17 e 18 (display, adesivo e
   press kit): são montagens com preço e data impressos e texto deformado —
   dado volátil (§2.2) e peça que não é registro real (§6.12). E momentos/05,
   cuja legenda afirmava uma "ação de marca" que o acervo não confirma. */
export const ONDE = {
  rotulo: 'Onde a marca aparece',
  titulo: 'Do feed ao',
  destaque: 'balcão das casas.',
  apoio: 'Os pontos de contato de cada edição. Como a sua marca entra em cada um é combinado com a organização.',
  canais: [
    { chave: 'digital', t: 'No digital', c: 'var(--scw-roxo)', tinta: 'var(--scw-creme)', itens: 'Posts e stories · reels · site oficial · página de participantes' },
    { chave: 'casas', t: 'Nas casas', c: 'var(--scw-marrom)', tinta: 'var(--scw-creme)', itens: 'Display de mesa · adesivo de vitrine · mapa do festival · materiais impressos' },
    { chave: 'imprensa', t: 'Relacionamento', c: 'var(--scw-cyan)', tinta: 'var(--scw-choco)', itens: 'Press kit · vouchers e brindes · ações com Sweet Lovers' },
    { chave: 'awards', t: 'Sweet Awards', c: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)', itens: 'Premiação · cards de resultado · conteúdo dos vencedores' },
  ],
}

/* Formatos de ativação que JÁ aconteceram (§9.6). Exemplo real, marca não
   nomeada: os nomes ficam no acervo, não no site. */
export const FORMATOS = {
  titulo: 'Formatos que já aconteceram',
  nota: 'Exemplos reais de edições anteriores. As marcas parceiras não são nomeadas aqui.',
  itens: [
    { t: 'Benefício cruzado', d: 'O cupom fiscal do combo dava 50% de desconto num cinema parceiro.' },
    { t: 'Sorteio para o público', d: 'Curtir a publicação de um participante valia a chance de ganhar uma máquina de café.' },
    { t: 'Prêmio de avaliação', d: 'Quem avaliava os combos concorria a uma mesa de jantar.' },
    { t: 'Ativação temática', d: 'Uma distribuidora de ingredientes assinou “os ingredientes mais mágicos” da edição.' },
    { t: 'Título oficial da edição', d: 'Um parceiro foi apresentado como o “Cinema Oficial” da edição.' },
    { t: 'Parceria de origem', d: 'Na edição Terras Potiguares, o apoio veio de uma instituição de fomento ao pequeno negócio e de fornecedores locais.' },
  ],
}

/* 05 Proposta — o formulário (contrato em src/lib/supportInterest.js). */
export const PROPOSTA = {
  rotulo: 'Conversar com a organização',
  titulo: 'Conte como sua marca quer',
  destaque: 'entrar na edição.',
  texto: 'A organização responde pelo contato informado para conversar sobre formatos, disponibilidade e condições.',
  sucessoTitulo: 'Proposta registrada.',
  sucesso: 'A organização do Sweet & Coffee Week recebeu sua proposta e retorna pelo contato informado para conversar sobre formato e disponibilidade.',
  privacidade: 'Usamos estes dados só para analisar a proposta e falar com você sobre ela.',
  barra: 'Apoio para a próxima edição: fale com a organização.',
  barraAcao: 'Falar sobre apoio',
}
