/*
 * Textos da camada Cartoon (CLAUDE.md §5.6: conteúdo fora do JSX).
 * Nenhum dado de participante aqui — esses vêm da projeção pública do banco.
 * Datas de lançamento dos combos e do resultado NÃO aparecem até a organização
 * confirmar (D-15); vale só o período do festival.
 */
import { EDICAO } from '../config.js'

export const PERIODO = '5 a 15 de novembro'
const C = EDICAO.caminho

export const NAV = [
  { cena: 'participantes', rotulo: 'Participantes', href: `${C}/participantes` },
  { cena: 'mapa', rotulo: 'Mapa', href: `${C}/mapa` },
  { cena: 'minha-rota', rotulo: 'Minha rota', href: `${C}/minha-rota` },
  { cena: 'avaliar', rotulo: 'Avaliar', href: `${C}/avaliar`, soComAvaliacao: true },
  { cena: 'premiacao', rotulo: 'Premiação', href: `${C}/premiacao` },
]

export const ENTRADA = {
  rotulo: 'Sweet & Coffee Week',
  titulo: 'Cartoon',
  periodo: `${PERIODO} · Natal`,
  frase: 'Casas de Natal transformam desenhos em sabor: um doce, um salgado e uma bebida em cada combo.',
  acaoParticipantes: 'Ver participantes',
  acaoMapa: 'Abrir o mapa',
  comoTitulo: 'Como experimentar',
  passos: [
    { titulo: 'Escolha a casa', texto: 'Veja os combos e onde cada casa fica.' },
    { titulo: 'Prove o combo', texto: 'No local, para levar ou por delivery, conforme a casa.' },
    { titulo: 'Avalie', texto: 'Sua avaliação ajuda a escolher os destaques do Sweet Awards.' },
  ],
  elencoTitulo: 'O elenco',
  verTodas: 'Ver todas as casas',
  ondeTitulo: 'Onde ficam',
  avaliacaoTitulo: 'Avaliação e premiação',
  duvidasTitulo: 'Antes de sair',
}

export const DUVIDAS = [
  ['Quanto custa o combo?', 'O preço aparece na página de cada casa quando a organização confirma.'],
  ['Tem delivery?', 'Depende da casa e da unidade. Cada página diz onde o combo sai por delivery e por qual canal.'],
  ['Tenho alergia ou restrição. O que faço?', 'Cada componente traz o que a casa informou sobre alergênicos e trocas. Confirme sempre com a loja antes de pedir: a informação é da casa, e "não informado" quer dizer que ela não declarou.'],
  ['Como avalio?', 'A avaliação abre durante o festival, na página Avaliar e no fim da página de cada casa.'],
]

export const FASE_TEXTO = {
  semElenco: 'O elenco desta edição será revelado em breve.',
  semCombo: 'O combo desta casa será revelado em breve.',
  encerrada: 'A Sweet & Coffee Week Cartoon terminou. As casas e os combos ficam aqui como registro da edição.',
  avaliacaoFechada: 'A avaliação abre durante o festival.',
  avaliacaoEncerrada: 'A avaliação desta edição foi encerrada.',
  resultadosEmBreve: 'Os resultados serão publicados aqui.',
}

export const CATALOGO = {
  titulo: 'O elenco da Cartoon',
  tituloCombos: 'Os combos da Cartoon',
  busca: 'Buscar casa, combo ou bairro',
  filtros: 'Filtros',
  bairro: 'Bairro',
  todos: 'Todos',
  aberto: 'Combo disponível agora',
  semGluten: 'Sem glúten declarado',
  semLactose: 'Sem lactose declarada',
  limpar: 'Limpar filtros',
  ver: (n) => (n === 1 ? 'Ver 1 casa' : `Ver ${n} casas`),
  contagem: (n) => (n === 1 ? '1 casa' : `${n} casas`),
  nenhum: (q) => (q ? `Nenhuma casa encontrada para "${q}".` : 'Nenhuma casa com esses filtros.'),
  verTodas: 'Ver todas as casas',
  declarado: 'Declarado pela casa.',
  comboEmBreve: 'Combo em breve',
}

export const PARTICIPANTE = {
  voltar: 'Voltar para as casas',
  selo: 'Participa da Sweet & Coffee Week Cartoon',
  comboTitulo: 'O combo',
  comboSemNome: (casa) => `Combo da ${casa}`,
  precoAConfirmar: 'Preço a confirmar',
  galeria: (n) => `Ver as ${n} fotos`,
  componentesTitulo: 'Doce, salgado e bebida',
  tipos: { doce: 'Doce', salgado: 'Salgado', bebida: 'Bebida' },
  ingredientes: 'Ingredientes informados pela casa',
  contem: 'Contém',
  podeConter: 'Pode conter',
  naoContem: 'Não contém, segundo a casa',
  naoInformado: 'Não informado pela casa',
  lactose: { sim: 'Contém lactose', nao: 'A casa informa que não contém lactose' },
  vegano: { sim: 'Vegano, segundo a casa', nao: 'Não é vegano' },
  vegetariano: { sim: 'Vegetariano, segundo a casa', nao: 'Não é vegetariano' },
  acucar: { sim: 'Tem açúcar adicionado', nao: 'Sem açúcar adicionado, segundo a casa' },
  trocas: 'Trocas possíveis',
  troca: {
    sempre: 'Sempre disponível', sob_consulta: 'Sob consulta', limitada: 'Disponibilidade limitada',
    semCusto: 'sem custo', consulte: 'acréscimo: consulte a loja', acrescimo: (v) => `acréscimo de ${v}`,
  },
  antesTitulo: 'Antes de pedir',
  antesNada: 'A casa não declarou alergênicos nos componentes.',
  confirme: 'Tem alergia ou restrição? Confirme com a loja antes de pedir. As informações acima foram dadas pela casa.',
  comoTitulo: 'Como experimentar',
  modoEm: 'Em',
  nenhumModo: 'A casa ainda não informou como o combo pode ser pedido.',
  pedirPor: 'Pedir por',
  canais: { aplicativo: 'Aplicativo', whatsapp: 'WhatsApp', site: 'Site' },
  taxa: 'Taxa',
  regioes: 'Entrega em',
  unidadesTitulo: (n) => (n === 1 ? 'Onde encontrar' : 'As unidades'),
  horarioFestival: 'Horário no festival',
  comoChegar: 'Como chegar',
  whatsapp: 'WhatsApp',
  localizacaoConferencia: 'Localização no mapa em conferência.',
  rotaAdicionar: 'Adicionar à Minha rota',
  rotaNaRota: 'Na sua rota',
  avaliarTitulo: 'Avalie sua experiência',
  avaliarTexto: 'Provou o combo? Conte como foi. As avaliações do público ajudam a escolher os destaques do Sweet Awards.',
  avaliar: 'Avaliar esta casa',
  inexistente: 'Não encontramos essa casa na Cartoon.',
  retirado: 'Esta página saiu do ar.',
  naoDivulgado: 'O elenco desta edição será revelado em breve.',
}

export const CENA_TEXTO = {
  mapa: { titulo: 'Mapa', apoio: 'As casas e unidades da Cartoon.' },
  'minha-rota': { titulo: 'Minha rota', apoio: 'As paradas que você escolheu, na ordem que você quiser.' },
  avaliar: { titulo: 'Avaliar', apoio: 'Conte como foi o combo que você provou.' },
  premiacao: { titulo: 'Premiação', apoio: 'O Sweet Awards da Cartoon.' },
  inexistente: { titulo: 'Não encontramos essa página da Cartoon', apoio: 'Confira o endereço ou volte para a entrada da edição.' },
}

export const RODAPE = {
  assinatura: 'Sweet & Coffee Week Cartoon é uma edição do Sweet & Coffee Week. Realização F2 Experience.',
  sobre: 'Sobre o festival',
  preferencias: 'Preferências de cookies',
}

export const TIPO_ORDEM = ['doce', 'salgado', 'bebida']
