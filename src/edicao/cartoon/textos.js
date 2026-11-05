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
   Cabeçalho, menu do celular e barra de abas mostram as mesmas cinco. Avaliar e Premiação são UMA página
   (Sweet Awards, lista 13 N1): /avaliar e /premiacao abrem nela; depois dos resultados a aba vira "Prêmios". */
export const NAV = [
  { cena: 'entrada', rotulo: 'Início', aba: 'Início', icone: 'inicio', href: C },
  { cena: 'participantes', rotulo: 'Casas', aba: 'Casas', icone: 'casas', href: `${C}/participantes` },
  { cena: 'mapa', rotulo: 'Mapa', aba: 'Mapa', icone: 'mapa', href: `${C}/mapa` },
  { cena: 'minha-rota', rotulo: 'Minha rota', aba: 'Rota', icone: 'rota', href: `${C}/minha-rota` },
  { cena: 'avaliar', rotulo: 'Sweet Awards', aba: 'Avaliar', abaResultados: 'Prêmios', icone: 'avaliar', iconeResultados: 'premio', href: `${C}/avaliar` },
]

export const MENU = { abrir: 'Menu', titulo: 'Páginas da Cartoon', fechar: 'Fechar' }

export const ENTRADA = {
  titulo: 'Agora é hora de provar!',
  tituloApoio: 'Agora é hora de',
  tituloDestaque: 'provar!',
  itensCombo: 'Doce + salgado + bebida',
  frase: 'Casas de Natal transformam desenhos em sabor: um doce, um salgado e uma bebida em cada combo.',
  acaoParticipantes: 'Ver as casas',
  acaoCombos: 'Ver os combos',
  acaoMapa: 'Abrir o mapa',
  precoRotulo: 'Combo',
  fatoCasas: (n) => (n === 1 ? '1 casa' : `${n} casas`),
  comoTitulo: 'Como funciona',
  passos: [
    { titulo: 'Escolha a casa', texto: 'Veja os combos e onde cada casa fica.', icone: 'casas' },
    { titulo: 'Prove o combo', texto: 'No local, para levar ou por delivery, conforme a casa.', icone: 'no-local' },
    { titulo: 'Avalie', texto: 'Sua avaliação ajuda a escolher os destaques do Sweet Awards.', icone: 'avaliar' },
  ],
  elencoTitulo: 'Estrelando: nosso elenco!',
  verTodas: (n) => (n === 1 ? 'Ver a casa' : `Ver as ${n} casas`),
  verCombos: (n) => (n === 1 ? 'Ver o combo' : `Ver os ${n} combos`),
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
  tituloCombos: 'Escolha seu combo',
  lead: 'Escolha a casa, veja o combo e onde provar.',
  leadCombos: (n) => `${n === 1 ? 'Um combo' : `${n} combos`} com doce, salgado e bebida, cada um inspirado no tema da casa.`,
  placa: (n) => (n === 1 ? 'casa no elenco' : 'casas no elenco'),
  placaCombos: (n) => (n === 1 ? 'combo' : 'combos'),
  precoRotulo: 'Combo',
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
  contagemCombos: (n, total) => (n === total ? (total === 1 ? '1 combo' : `${total} combos`) : `${n} de ${total} combos`),
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
  verCombo: 'Ver o combo: itens, condições e alergênicos',
  precoRotulo: 'Combo',
  comboSemNome: (casa) => `Combo da ${casa}`,
  precoAConfirmar: 'Preço a confirmar',
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
  // A troca é um item alternativo, pelo mesmo valor do combo; o acréscimo só aparece no registro antigo que tinha um.
  trocas: 'Opções de troca',
  troca: {
    sempre: 'Sempre disponível', sob_consulta: 'Sob consulta', limitada: 'Disponibilidade limitada',
    acrescimo: (v) => `acréscimo de ${v}`, de: 'Troca', por: 'por',
  },
  confirme: 'Tem alergia ou restrição? Confirme com a loja antes de pedir. As informações acima foram dadas pela casa.',
  atendimentoTitulo: 'Como pedir',
  comoPedirDica: { local: 'Endereço e horário', retirada: 'Retirar na loja', delivery: 'Pedir agora', deliveryInfo: 'Ver como pedir' },
  minhaRota: 'Minha rota',
  minhaRotaNota: 'Marque aqui; fica salvo neste aparelho.',
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
  fotoRotulo: { cortado: 'Detalhe', opcao: 'Outra opção' },
  fotosDaCasa: 'Fotos da casa',
  avaliarTitulo: 'Avalie sua experiência',
  avaliarTexto: 'Provou o combo? Conte como foi. As avaliações do público ajudam a escolher os destaques do Sweet Awards.',
  avaliar: 'Avaliar esta casa',
  inexistente: 'Não encontramos essa casa na Cartoon.',
  retirado: 'Esta página saiu do ar.',
  naoDivulgado: 'O elenco desta edição será revelado em breve.',
}

/**
 * Ícones de CONTORNO (icones/interface, 20 px) por assunto — lista 13, P2: o mesmo assunto tem o mesmo ícone em
 * todas as páginas. A ilustração da edição (IconeCartoon) fica para navegação e modos de atendimento.
 */
export const ICONE = {
  tipo: { doce: 'cupcake', salgado: 'coxinha', bebida: 'xicara' },
  restricoes: 'alerta', contem: 'atencao', podeConter: 'duvida', naoContem: 'sucesso', naoInformado: 'pendente',
  caracteristicas: 'informacao', ingredientes: 'ficha', trocas: 'ciclo', condicoes: 'documento', noCombo: 'combo',
  endereco: 'local', horario: 'horario', comoChegar: 'trajeto', whatsapp: 'mensagem', mapa: 'local', instagram: 'instagram',
  site: 'link-externo', fotos: 'imagem', avaliar: 'estrela',
}

/* Faixa de marcas (rodapé e telas da ativação); marca aprovada pela Sicredi antes de mudar. */
export const MARCAS = {
  realizacao: 'Realização', patrocinio: 'Patrocinador', apoio: 'Apoio',
}

/* Página do patrocinador (/cartoon/patrocinador) — o QR do verso do mapa A5 leva aqui (Wilker 04/11).
   As agências vêm do mundo da edição (src/data/mundoEdicao.js), a mesma fonte das bandeiras do mapa. */
export const PATROCINADOR = {
  rotulo: 'Patrocinador',
  titulo: 'O Sicredi no Sweet & Coffee Week',
  sobre: 'O Sicredi é uma instituição financeira cooperativa comprometida com a vida financeira dos seus associados e com as regiões onde atua.',
  edicao: 'É o patrocinador da edição Cartoon do Sweet & Coffee Week, de 5 a 15 de novembro, em Natal.',
  agencias: 'Agências em Natal e região',
  verNoMapa: 'Ver no mapa',
  verNoMapaRotulo: (nome) => `Ver ${nome} no Google Maps (abre em nova aba)`,
  site: 'Conhecer o Sicredi RN',
  siteUrl: 'https://www.sicredi.com.br/coop/riograndedonorte/',
  voltar: 'Voltar ao mapa',
}

export const CENA_TEXTO = {
  mapaEmBreve: { titulo: 'O mapa chega em breve', apoio: 'Enquanto isso, veja todas as casas e os combos da Cartoon.' },
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
  lead: 'Todas as casas da Cartoon num mapa só. Escolha onde quer ir, monte sua rota e siga pelo Google Maps. Fica salvo neste aparelho.',
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
  legendaPins: 'Cada pin traz a logo desenhada da casa.',
  comoPedir: 'Como pedir',
  dica: 'Escolha uma casa na lista ou toque num pin para ver endereço, horário de hoje e como chegar.',
  cartaoTitulo: 'Casa escolhida',
  fechar: 'Fechar',
  hojeNoFestival: 'Hoje no festival',
  legenda: { conferida: 'Localização conferida', aproximada: 'Ponto aproximado, em conferência', quero: 'Quero ir', foi: 'Já fui', voce: 'Você' },
  distancia: (d, aproximada) => `${aproximada ? 'cerca de ' : ''}${d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1).replace('.', ',')} km`} em linha reta`,
  verCasa: 'Ver a casa',
  comoChegar: 'Como chegar',
  encerrada: 'A edição terminou. As casas seguem no catálogo como registro.',
  verCasas: 'Ver as casas',
  // Página única: mapa + Minha rota + Mapa da Doçura (docs/cartoon-2026-2/14 §14.13).
  vistas: 'Ver as casas como',
  vista: { mundo: 'Mundo', real: 'Mapa real', lista: 'Lista' },
  painel: 'Sua rota e seus carimbos',
  abas: { rota: 'Minha rota', album: 'Carimbos' },
  mundoRegiao: 'Mundo da Doçura: Natal desenhada com as casas da Cartoon. A lista tem as mesmas casas.',
  mundoNota: 'O desenho mostra o bairro e a ordem das casas, não a rua exata. Para chegar, use "Como chegar" ou a rota no Google Maps.',
  previa: 'Prévia com a arte provisória: só aparece no ambiente de desenvolvimento.',
  aproximar: 'Aproximar', afastar: 'Afastar', zoom: 'Zoom do desenho',
  credito: 'Base geográfica © colaboradores do OpenStreetMap',
  casaNoMundo: ({ numero, titulo, tema, parada, carimbos, avaliou }) => [
    `${numero}. ${titulo}`,
    tema && `tema ${tema}`,
    parada && `parada ${parada} da sua rota`,
    carimbos > 0 && (carimbos === 1 ? 'carimbada' : `carimbada ${carimbos} vezes`),
    avaliou && 'avaliada',
  ].filter(Boolean).join(', '),
  sicredi: (nome, endereco) => `${nome}, agência do patrocinador${endereco ? `: ${endereco}` : ''}`,
  parada: (n) => `Parada ${n} da sua rota`,
  carimbada: (n) => (n === 1 ? 'Carimbada' : `Carimbada ${n} vezes`),
  avaliarMais2: 'Avaliar e validar o carimbo',
  avaliada: 'Avaliada',
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
  ordenarCaminho: 'Ordenar pelo caminho do mapa',
  ordenadoCaminho: 'Paradas na ordem do caminho do mapa',
  ordenarNota: 'O caminho do mapa vai do Potengi a Ponta Negra. Não é o trajeto mais curto: é a ordem dos bairros no desenho.',
  carimbadaRotulo: 'Carimbada',
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

/*
 * Sweet Awards (lista 13, N1): avaliar + premiação numa página só (canal Gala). Durante o festival: como funciona,
 * o que se avalia e o formulário em 3 passos; depois, os premiados no lugar do formulário. Nada de data de
 * resultado além do fim do festival (D-15); categorias de prêmio não aparecem como definitivas (D-06).
 * Perguntas e ajudas por critério: as da Lovers 2026.1 (src/data/_arquivo/sweetAwards.js), adaptadas à Cartoon.
 */
export const AWARDS = {
  titulo: 'Sweet Awards',
  rotulo: 'Avaliação e premiação da Cartoon',
  lead: 'Aqui você é o jurado. Provou o combo de uma casa? Dê as suas notas: a avaliação do público escolhe os destaques do Sweet Awards.',
  trofeuAlt: 'Troféu de ouro do Sweet Awards: uma fatia de bolo provada, com a colher de sobremesa cravada, sobre a base no formato do selo',
  irAvaliar: 'Avaliar agora',
  verPremiados: 'Ver os premiados',
  comoTitulo: 'Como funciona',
  passos: [
    { titulo: 'Prove o combo', texto: 'Numa casa participante: no local, para levar ou por delivery, conforme a casa.', icone: 'no-local' },
    { titulo: 'Dê as notas', texto: 'Escolha a casa e dê uma nota de 5 a 10 para cada item. Leva uns dois minutos.', icone: 'avaliar' },
    { titulo: 'Acompanhe o resultado', texto: 'Os destaques saem depois do festival, aqui nesta página.', icone: 'premio' },
  ],
  oQueTitulo: 'O que você avalia',
  escala: 'Notas de 5 (menor) a 10 (maior).',
  criterios: {
    doce: { pergunta: 'Que nota você dá para o doce?', ajuda: 'Sabor e qualidade do item doce.' },
    salgado: { pergunta: 'Que nota você dá para o salgado?', ajuda: 'Sabor e qualidade do item salgado.' },
    bebida: { pergunta: 'Que nota você dá para a bebida?', ajuda: 'Sabor e harmonia da bebida com o combo.' },
    apresentacao: { pergunta: 'Que nota você dá para a apresentação?', ajuda: 'Capricho e beleza na montagem do combo.' },
    criatividade: { pergunta: 'Que nota você dá para a criatividade?', ajuda: 'Originalidade e ousadia do combo dentro do tema da casa.' },
    atendimento: { pergunta: 'Que nota você dá para o atendimento?', ajuda: 'Simpatia, agilidade e cuidado da equipe.' },
    encantamento: { pergunta: 'Que nota você dá para o encantamento em loja?', ajuda: 'Como a casa viveu o tema: ambientação, ações, vestimenta, cantinho para fotos. Pediu por delivery? Avalie o que chegou até você.' },
  },
  pergunta: (rotulo) => `Que nota você dá para ${rotulo.toLowerCase()}?`,
  formTitulo: 'Sua avaliação',
  passosForm: ['A casa', 'Suas notas', 'Seus dados'],
  passoDe: (n, total) => `Passo ${n} de ${total}`,
  casaTitulo: 'Qual casa você quer avaliar?',
  casaBusca: 'Buscar casa',
  casaNenhuma: 'Nenhuma casa com esse nome.',
  unidade: 'Em qual unidade?',
  unidadeEscolha: 'Escolha a unidade',
  notasTitulo: (casa) => `Suas notas para ${casa}`,
  dadosTitulo: 'Quase lá: quem está avaliando?',
  comentario: 'Quer contar algo para a casa? (opcional)',
  nome: 'Seu nome',
  email: 'Seu e-mail',
  emailAjuda: 'Só para evitar avaliação repetida: uma por e-mail em cada casa, e vale a mais recente.',
  novidades: 'Quero receber novidades do Sweet & Coffee Week (opcional)',
  privacidade: 'Ao enviar, você concorda com o uso dos dados descrito na',
  privacidadeLink: 'Política de Privacidade',
  continuar: 'Continuar',
  voltar: 'Voltar',
  enviar: 'Enviar avaliação',
  enviando: 'Enviando…',
  verificando: 'Confirmando que você não é um robô…',
  faltaCasa: 'Escolha a casa (e a unidade, se houver mais de uma).',
  faltaNotas: (n) => (n === 1 ? 'Falta 1 nota.' : `Faltam ${n} notas.`),
  faltaDados: 'Preencha nome e e-mail.',
  okTitulo: 'Avaliação registrada',
  okTexto: (casa) => `Obrigado por avaliar ${casa}. Se avaliar a mesma casa de novo com este e-mail, vale a avaliação mais recente.`,
  avaliarOutra: 'Avaliar outra casa',
  verCasas: 'Ver as casas',
  abrirMapa: 'Abrir o mapa',
  abre: (quando) => `A avaliação abre ${quando}.`,
  abreLead: 'Enquanto isso, escolha as casas que quer provar.',
  depois: (dia) => (dia ? `Resultados depois de ${dia}.` : 'Resultados depois do festival.'),
  resultadosTitulo: 'Os premiados',
  trilha: { sweet_lovers: 'Sweet Lovers (avaliação do público)', juri_tecnico: 'Júri técnico' },
  lugar: { 1: '1º lugar', 2: '2º lugar', 3: '3º lugar' },
  empate: ' (empate)',
  falha: 'Não conseguimos carregar os resultados agora.',
  recado: {
    avaliacao_fechada: 'A avaliação não está aberta agora.',
    avaliacao_nao_aberta: 'A avaliação ainda não abriu.',
    avaliacao_encerrada: 'A avaliação desta edição foi encerrada.',
    participante_inelegivel: 'Esta casa não está disponível para avaliação.',
    unidade_inelegivel: 'Esta unidade não está disponível para avaliação.',
    email_invalido: 'Confira o e-mail.',
    nome_invalido: 'Confira o nome.',
    notas_incompletas: 'Dê uma nota para cada item.',
    nota_invalida: 'Alguma nota ficou fora da escala.',
    padrao: 'Não enviamos ainda. Confira a conexão e tente de novo: suas notas continuam aqui.',
  },
}

export const RODAPE = {
  assinatura: 'Sweet & Coffee Week Cartoon é uma edição do Sweet & Coffee Week.',
  paginas: 'A edição',
  festival: 'O festival',
  legais: 'Documentos',
  sobre: 'Sobre o festival',
  preferencias: 'Preferências de cookies',
}

export const TIPO_ORDEM = ['doce', 'salgado', 'bebida']
