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
  ['Quanto custa o combo?', 'O valor do combo é o mesmo em todas as casas e aparece na página de cada uma.'],
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
  tema: (t) => `Inspirado em ${t}`,
}

export const PARTICIPANTE = {
  voltar: 'Voltar para as casas',
  selo: 'Casa participante da Sweet & Coffee Week Cartoon',
  tema: (t) => `Inspirado em ${t}`,
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
  inexistente: { titulo: 'Não encontramos essa página da Cartoon', apoio: 'Confira o endereço ou volte para a entrada da edição.' },
}

/* Painel do Sweet Lover (§10.14): "quero ir" é da UNIDADE (vira parada da Minha rota); "já fui" é da CASA
   (vira progresso). Rótulo fixo: o estado vai no aria-pressed e na cor, não troca o nome do botão. */
export const LOVER = {
  queroIr: 'Quero ir',
  jaFui: 'Já fui',
  escolher: (n) => `escolha entre ${n} unidades`,
  naLista: (n) => (n === 1 ? '1 unidade na lista' : `${n} unidades na lista`),
}

export const MAPA = {
  titulo: 'Mapa',
  lead: 'Todas as casas da Cartoon num mapa só. Marque onde quer ir e onde já foi: fica salvo neste aparelho.',
  busca: 'Buscar casa ou bairro',
  bairro: 'Bairro',
  todos: 'Todos os bairros',
  mostrar: 'Mostrar',
  aberto: 'Aberto agora',
  pertoDeMim: 'Perto de mim',
  pedindo: 'Pedindo sua localização…',
  ordenado: 'Ordenado pela distância em linha reta até você. Sua posição não sai deste aparelho.',
  negada: 'Sem acesso à sua localização. A lista segue por bairro.',
  contagem: (n) => (n === 1 ? '1 unidade' : `${n} unidades`),
  limpar: 'Limpar filtros',
  nenhuma: 'Nenhuma unidade com esses filtros.',
  verMapa: (n) => `Ver no mapa (${n})`,
  carregando: 'Carregando o mapa…',
  semMapa: 'As localizações no mapa estão em conferência. Use a lista.',
  falhou: 'O mapa não carregou. A lista tem todas as unidades.',
  semCoordenada: 'Localização no mapa em conferência.',
  aproximada: 'Ponto aproximado no mapa, em conferência.',
  aproximadaRua: 'Ponto aproximado no mapa: a rua confere, o número ainda não.',
  legenda: { conferida: 'Localização conferida', aproximada: 'Ponto aproximado, em conferência', quero: 'Quero ir', foi: 'Já fui', voce: 'Você' },
  distancia: (d, aproximada) => `${aproximada ? 'cerca de ' : ''}${d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1).replace('.', ',')} km`} em linha reta`,
  verCasa: 'Ver a casa',
  comoChegar: 'Como chegar',
  encerrada: 'A edição terminou. As casas seguem no catálogo como registro.',
  verCasas: 'Ver as casas',
}

export const ROTA = {
  titulo: 'Minha rota',
  lead: 'Sua lista de casas para provar e as que você já visitou. Fica salva neste aparelho, sem conta.',
  progresso: (x, n) => `${x} de ${n} ${n === 1 ? 'casa' : 'casas'}`,
  progressoRotulo: 'visitadas',
  queroIrTitulo: 'Quero ir',
  queroIrVazio: 'Sua lista está vazia. No mapa, no catálogo ou na página de cada casa, toque em "Quero ir".',
  tudoVisitado: 'Você já visitou todas as casas da sua lista.',
  parada: 'parada',
  subir: 'Subir', descer: 'Descer', remover: 'Remover',
  saiu: 'Esta unidade saiu da edição.',
  abrirRota: 'Abrir a rota no Google Maps',
  abrirTrecho: (i) => `Abrir trecho ${i} no Google Maps`,
  compartilhar: 'Compartilhar a rota',
  copiado: 'Link copiado.',
  copie: (url) => `Copie o link: ${url}`,
  ordem: 'A ordem é a que você escolheu. O Google Maps calcula o trajeto entre as paradas.',
  jaFuiTitulo: 'Já fui',
  jaFuiVazio: 'Provou um combo? Toque em "Já fui" na casa: ela entra aqui e conta no seu progresso.',
  desfazer: 'Desfazer',
  aparelho: 'Salvo só neste aparelho e neste navegador, sem conta. Limpar os dados do navegador apaga a lista.',
  compartilhada: 'Esta é uma rota compartilhada com você.',
  salvar: 'Salvar como minha rota',
  verCasas: 'Ver as casas',
  abrirMapa: 'Abrir o mapa',
  semElenco: 'O elenco desta edição será revelado em breve.',
  encerrada: 'A edição terminou. As casas seguem no catálogo como registro.',
}

/* Avaliar (§10.7, canal Serviço). Os passos descrevem o formulário que existe: casa, notas, nome e e-mail. */
export const AVALIAR = {
  titulo: 'Avalie sua experiência',
  lead: 'Provou o combo? Conte como foi: as avaliações do público ajudam a escolher os destaques do Sweet Awards.',
  passosTitulo: 'Como avaliar',
  passos: [
    { titulo: 'Prove o combo', texto: 'Numa casa participante: no local, para levar ou por delivery, conforme a casa.', icone: 'no-local' },
    { titulo: 'Dê as notas', texto: 'Escolha a casa e dê uma nota para cada item do combo.', icone: 'avaliar' },
    { titulo: 'Envie', texto: 'Com seu nome e e-mail. Uma avaliação por casa: se avaliar de novo, vale a mais recente.', icone: 'compartilhar' },
  ],
  abre: (quando) => `A avaliação abre ${quando}.`,
  abreLead: 'Enquanto isso, escolha as casas que quer provar.',
  formTitulo: 'Sua avaliação',
  verCasas: 'Ver as casas',
  abrirMapa: 'Abrir o mapa',
  premiacao: 'Ver a premiação',
}

/* Premiação (§10.7, canal Gala). Nada de data de resultado além do fim do festival (D-15). */
export const PREMIACAO = {
  titulo: 'Sweet Awards',
  rotulo: 'Premiação da Cartoon',
  lead: 'As casas da Cartoon concorrem ao Sweet Awards. O público avalia durante o festival, e as categorias e o resultado são publicados aqui.',
  depois: (dia) => (dia ? `Resultados depois de ${dia}.` : 'Resultados depois do festival.'),
  trofeuAlt: 'Troféu dourado do Sweet Awards: uma fatia de bolo com colher sobre o prato',
  avaliar: 'Avaliar',
  comoAvaliar: 'Ver como avaliar',
  resultadosTitulo: 'Os premiados',
  trilha: { sweet_lovers: 'Sweet Lovers (avaliação do público)', juri_tecnico: 'Júri técnico' },
  lugar: { 1: '1º lugar', 2: '2º lugar', 3: '3º lugar' },
  empate: ' (empate)',
  falha: 'Não conseguimos carregar os resultados agora.',
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
