/*
 * Textos da camada Cartoon (CLAUDE.md §5.6: conteúdo fora do JSX).
 * Nenhum dado de participante aqui — esses vêm da projeção pública do banco.
 * Datas de lançamento dos combos e do resultado NÃO aparecem até a organização
 * confirmar (D-15); vale só o período do festival.
 */
import { EDICAO } from '../config.js'

export const PERIODO = '5 a 15 de novembro'
const C = EDICAO.caminho

/* Páginas da edição (§10.6). `aba` = rótulo curto da barra do celular; `icone` = ícone ilustrado (nunca sozinho).
   Cabeçalho e menu do celular listam todas; a barra de abas mostra Início · Casas · Mapa · Rota · Avaliar, e
   Avaliar dá lugar a Prêmio quando os resultados saem (index.jsx). */
export const NAV = [
  { cena: 'entrada', rotulo: 'Início', aba: 'Início', icone: 'inicio', href: C },
  { cena: 'participantes', rotulo: 'Casas', aba: 'Casas', icone: 'casas', href: `${C}/participantes` },
  { cena: 'mapa', rotulo: 'Mapa', aba: 'Mapa', icone: 'mapa', href: `${C}/mapa` },
  { cena: 'minha-rota', rotulo: 'Minha rota', aba: 'Rota', icone: 'rota', href: `${C}/minha-rota` },
  { cena: 'avaliar', rotulo: 'Avaliar', aba: 'Avaliar', icone: 'avaliar', href: `${C}/avaliar` },
  { cena: 'premiacao', rotulo: 'Premiação', aba: 'Prêmio', icone: 'premio', href: `${C}/premiacao` },
]

export const MENU = { abrir: 'Menu', titulo: 'Páginas da Cartoon', fechar: 'Fechar' }

export const ENTRADA = {
  titulo: 'Agora é hora de provar!',
  frase: 'Casas de Natal transformam desenhos em sabor: um doce, um salgado e uma bebida em cada combo.',
  acaoParticipantes: 'Ver as casas',
  acaoMapa: 'Abrir o mapa',
  comoTitulo: 'Como funciona',
  passos: [
    { titulo: 'Escolha a casa', texto: 'Veja os combos e onde cada casa fica.', icone: 'casas' },
    { titulo: 'Prove o combo', texto: 'No local, para levar ou por delivery, conforme a casa.', icone: 'no-local' },
    { titulo: 'Avalie', texto: 'Sua avaliação ajuda a escolher os destaques do Sweet Awards.', icone: 'avaliar' },
  ],
  elencoTitulo: 'Estrelando: nosso elenco!',
  verTodas: (n) => (n === 1 ? 'Ver a casa' : `Ver as ${n} casas`),
  ondeTitulo: 'Onde ficam',
  ondeLead: 'Escolha um bairro para ver as casas dele no mapa.',
  bairroCasas: (n) => (n === 1 ? '1 casa' : `${n} casas`),
  avalieTitulo: 'Avalie sua experiência',
  avalieAbre: (quando) => `A avaliação abre ${quando}.`,
  avalieAberta: 'Provou o combo? Conte como foi: as avaliações do público ajudam a escolher os destaques do Sweet Awards.',
  avaliar: 'Avaliar',
  comoAvaliar: 'Ver como avaliar',
  premiacao: 'Ver a premiação',
  duvidasTitulo: 'Dúvidas',
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

/** Atendimento e restrições: rótulo + ícone da edição. O ícone nunca vai sozinho (§10.15, família 1). */
export const ATENDIMENTO = {
  local: { rotulo: 'No local', icone: 'no-local' },
  retirada: { rotulo: 'Para viagem', icone: 'para-viagem' },
  delivery: { rotulo: 'Delivery', icone: 'delivery' },
}
export const RESTRICAO = {
  vegano: { rotulo: 'Vegano', icone: 'vegano', sim: 'Vegano, segundo a casa', nao: 'Não é vegano', nao_informado: 'Vegano: não informado' },
  acucar: { rotulo: 'Sem açúcar', icone: 'sem-acucar', sim: 'Sem açúcar adicionado, segundo a casa', nao: 'Tem açúcar adicionado', nao_informado: 'Açúcar adicionado: não informado' },
  gluten: { rotulo: 'Sem glúten', icone: 'sem-gluten', sim: 'Sem glúten, segundo a casa', nao: 'Contém ou pode conter glúten', nao_informado: 'Glúten: não informado' },
  lactose: { rotulo: 'Sem lactose', icone: 'sem-lactose', sim: 'Sem lactose, segundo a casa', nao: 'Contém lactose', nao_informado: 'Lactose: não informado' },
}

export const CATALOGO = {
  titulo: 'Estrelando: nosso elenco!',
  tituloCombos: 'Os combos da Cartoon',
  lead: 'Escolha a casa, veja o combo e onde provar.',
  placa: (n) => (n === 1 ? 'casa no elenco' : 'casas no elenco'),
  busca: 'Buscar casa, combo ou bairro',
  filtros: 'Filtros',
  bairro: 'Bairro',
  todos: 'Todos os bairros',
  comoPedir: 'Como pedir',
  quando: 'Quando',
  hoje: 'Com combo hoje',
  restricoes: 'Restrições',
  limpar: 'Limpar filtros',
  contagem: (n, total) => (n === total ? (total === 1 ? '1 casa' : `${total} casas`) : `${n} de ${total} casas`),
  nenhum: (q) => (q ? `Nenhuma casa encontrada para "${q}".` : 'Nenhuma casa com esses filtros.'),
  verTodas: 'Ver todas as casas',
  declarado: 'Restrição só vale quando a casa declarou para todos os itens do combo.',
  comboEmBreve: 'Combo em breve',
  fotoEmProducao: 'Foto em produção',
  unidades: (n) => `${n} unidades`,
}

export const PARTICIPANTE = {
  voltar: 'Voltar para as casas',
  selo: 'Casa participante da Sweet & Coffee Week Cartoon',
  comboTitulo: 'O combo',
  comboSemNome: (casa) => `Combo da ${casa}`,
  precoAConfirmar: 'Preço a confirmar',
  precoRotulo: 'valor do combo',
  precoNota: 'Valor da edição: o mesmo em todas as casas.',
  noCombo: 'No combo',
  condicoes: 'Condições',
  condicoesNi: 'Não informadas pela casa.',
  nomeNi: 'Nome não informado pela casa',
  fotoReserva: 'Foto do combo em produção',
  tipos: { doce: 'Doce', salgado: 'Salgado', bebida: 'Bebida' },
  ingredientes: 'Ingredientes informados pela casa',
  restricoesTitulo: 'Restrições alimentares',
  restricoesLead: 'O que a casa declarou para cada item. "Não informado" quer dizer que a casa não declarou, nunca que o item não contém.',
  restricoesNada: 'A casa ainda não informou as restrições deste item.',
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
  confirme: 'Tem alergia ou restrição? Confirme com a loja antes de pedir. As informações acima foram dadas pela casa.',
  atendimentoTitulo: 'Como pedir',
  modo: { sim: 'Disponível', simEm: (nomes) => `Em ${nomes}`, nao: 'A casa não oferece', nao_informado: 'Não informado pela casa' },
  pedirPor: 'Pedir por',
  canais: { aplicativo: 'Aplicativo', whatsapp: 'WhatsApp', site: 'Site' },
  taxa: 'Taxa',
  taxaNi: 'não informada',
  regioes: 'Entrega em',
  faleCom: 'Fale com a casa',
  site: 'Site da casa',
  unidadesTitulo: (n) => (n === 1 ? 'Onde encontrar' : 'As unidades'),
  unidadesNi: 'A casa ainda não informou onde o combo é vendido.',
  horarioFestival: 'Horário no festival',
  horarioNi: 'Não informado pela casa.',
  naoAbre: 'não abre',
  hoje: 'hoje',
  comoChegar: 'Como chegar',
  whatsapp: 'Conversar no WhatsApp',
  verNoMapa: 'Ver no mapa',
  localizacaoConferencia: 'Localização no mapa em conferência.',
  rotaAdicionar: 'Adicionar à Minha rota',
  rotaNaRota: 'Na sua rota',
  galeriaTitulo: 'Galeria',
  galeriaReserva: 'Galeria em produção',
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
  assinatura: 'Sweet & Coffee Week Cartoon é uma edição do Sweet & Coffee Week.',
  realizacao: 'Realização',
  paginas: 'A edição',
  festival: 'O festival',
  legais: 'Documentos',
  sobre: 'Sobre o festival',
  preferencias: 'Preferências de cookies',
}

export const TIPO_ORDEM = ['doce', 'salgado', 'bebida']
