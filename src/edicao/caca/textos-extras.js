/*
 * Textos das telas extras da Caça: metas, compartilhar, avisos (notificações) e app instalável.
 * Regras de redação (iguais às de textos.js): nunca "voto/votação" (as pessoas "avaliam"); nunca "Sweet" sozinho; a surpresa do
 * prêmio final NUNCA é revelada ("uma surpresa"); nenhum prêmio por meta é prometido; nenhuma entrega de aviso é prometida.
 */
import { EDICAO } from '../config.js'
import { mensagemDoMotivo } from './textos.js'

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`

export const EXTRAS = {
  metas: {
    resumo: (v, n) => `${v} de ${n} ${n === 1 ? 'casa' : 'casas'}`,
    resumoRotulo: 'casas diferentes validadas',
    celebrarTitulo: (titulo) => `Meta alcançada: ${titulo}!`,
    celebrarTexto: (casas, mais) => `Você já validou ${plural(casas, 'casa diferente', 'casas diferentes')}.${mais > 0 ? ` E ainda destravou mais ${plural(mais, 'meta', 'metas')} no caminho.` : ''} Parabéns!`,
    proximaTitulo: 'Próxima meta',
    proximaTexto: (faltam, titulo) => (faltam === 1 ? `Falta 1 casa para "${titulo}".` : `Faltam ${faltam} casas para "${titulo}".`),
    todas: 'Você alcançou todas as metas. Seus carimbos extras continuam contando!',
    listaTitulo: 'Todos os marcos',
    marco: (casas) => `${casas} ${casas === 1 ? 'casa' : 'casas'}`,
    marcoCompleto: (casas) => `Todas as casas (${casas})`,
    alcancada: 'Alcançada',
    faltam: (n) => (n === 1 ? 'Falta 1 casa' : `Faltam ${n} casas`),
    semMetas: 'Ainda não há marcos definidos para esta edição. Enquanto isso, siga carimbando casas diferentes.',
    nota: 'Os marcos são para comemorar o seu caminho. O que vale como benefício (vouchers e uma surpresa no prêmio final) está no regulamento.',
    carregando: 'Buscando suas metas…',
    falhaTitulo: 'Não conseguimos abrir suas metas agora',
    falhaTexto: 'Seus carimbos estão guardados. Confira a conexão e tente de novo.',
    verMapa: 'Abrir o mapa',
  },

  avisos: {
    titulo: 'Avisos',
    lead: 'O que pede a sua atenção aparece aqui, com ou sem notificação no celular.',
    vazio: 'Tudo em dia. Quando algo precisar de você, aparece aqui.',
    avaliacao: (casa, mais) => `Falta avaliar o combo da ${casa} para o carimbo valer.${mais > 0 ? ` Mais ${plural(mais, 'casa espera', 'casas esperam')} a sua avaliação.` : ''}`,
    avaliacaoAcao: 'Avaliar o combo',
    meta: (titulo, mais) => `Meta alcançada: ${titulo}.${mais > 0 ? ` E mais ${plural(mais, 'meta', 'metas')}.` : ''}`,
    metaAcao: 'Ver minhas metas',
  },

  push: {
    titulo: 'Avisos no celular',
    lead: 'Opcional: a organização pode mandar avisos para o seu navegador. A avaliação pendente e as metas também aparecem aqui na central.',
    situacao: { ligado: 'ligados', desligado: 'desligados' },
    escolha: 'O que você quer receber',
    categorias: {
      avaliacao_pendente: { rotulo: 'Avaliação pendente', texto: 'Um carimbo que só espera você avaliar o combo.' },
      meta: { rotulo: 'Metas', texto: 'Novidades sobre os marcos da Caça.' },
      grupo: { rotulo: 'Grupos', texto: 'Avisos sobre os grupos de amigos de que você participa.' },
      edicao: { rotulo: 'Novidades da edição', texto: 'Divulgação da Cartoon. Vem desligado: só chega se você escolher.' },
    },
    honestidade: 'Os avisos são enviados pela organização quando há o que dizer: não chegam na hora de cada carimbo ou de cada meta, e podem atrasar ou não chegar, dependendo do aparelho e do navegador. Você pode desligar quando quiser.',
    ligar: 'Ativar avisos neste aparelho',
    ligando: 'Ativando…',
    ligadoEm: (n) => (n > 1 ? `Avisos ativados em ${n} aparelhos deste mapa.` : 'Avisos ativados neste aparelho.'),
    desligar: 'Desligar neste aparelho',
    desligarTodos: 'Desligar em todos os aparelhos do mapa',
    desligando: 'Desligando…',
    desligado: 'Avisos desligados.',
    salvo: 'Preferência salva.',
    estados: {
      'nao-suportado': 'Este navegador não recebe avisos de sites. Tudo bem: o que importa aparece aqui na central.',
      'ios-instalar': 'No iPhone, os avisos só funcionam com o app instalado na Tela de Início. Toque em Compartilhar, depois em "Adicionar à Tela de Início", e abra a Caça por esse ícone.',
      bloqueada: 'As notificações deste site estão bloqueadas no navegador. Para ativar, libere nas configurações do site e volte aqui. Enquanto isso, os avisos aparecem na central.',
    },
    semResposta: 'O navegador não confirmou a permissão. Tente de novo quando quiser.',
    falha: 'Não deu para ativar os avisos agora. Tente de novo em instantes.',
    falhaPreferencia: 'Não deu para salvar a preferência. Tente de novo.',
    falhaDesligar: 'Não deu para desligar agora. Tente de novo.',
  },

  instalar: {
    titulo: 'Instalar o app da Caça',
    lead: 'Abre direto na sua central, com ícone na tela inicial. É opcional: continua tudo funcionando pelo navegador.',
    botao: 'Instalar o app',
    agoraNao: 'Agora não',
    feito: 'App instalado! Procure o ícone da Caça na sua tela inicial.',
    recusou: 'Tudo bem. Você pode instalar depois, quando quiser.',
    jaInstalado: 'Você está usando o app instalado.',
    ios: 'No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início".',
    manual: 'No menu do navegador, procure "Instalar app" ou "Adicionar à tela inicial".',
    honestidade: 'O app precisa de internet para abrir e atualizar o mapa.',
    recuperar: 'No app instalado do iPhone, o mapa pode abrir vazio, porque o app guarda os dados separados do Safari. Se acontecer, recupere o mapa com o seu e-mail.',
    recuperarAcao: 'Recuperar meu mapa',
  },

  compartilhar: {
    previa: 'Prévia da sua arte',
    previaAlt: (apelido, v, n) => `Arte para Stories: ${apelido} validou ${v} de ${n} casas na Caça aos Carimbos.`,
    gerando: 'Montando a sua arte…',
    falhaArte: 'Não deu para montar a arte agora. Você ainda pode compartilhar o link.',
    semCasas: 'Valide a sua primeira casa para ter um progresso para compartilhar. Enquanto isso, chame os amigos.',
    privacidade: 'A arte leva só o seu apelido, as casas validadas e o convite. Nunca vai e-mail, WhatsApp nem o link do seu mapa.',
    compartilhar: 'Compartilhar',
    baixar: 'Baixar a imagem',
    copiarTexto: 'Copiar o texto e o link',
    copiado: 'Texto copiado.',
    falhouCopiar: 'Não deu para copiar. Selecione o texto abaixo e copie.',
    baixou: 'Imagem baixada. Agora é só postar nos Stories.',
    convidar: 'Chamar os amigos',
    tituloLinks: 'Compartilhar uma casa ou a sua rota',
    leadLinks: 'Links públicos da edição, sem nenhum dado seu.',
    escolherCasa: 'Casa',
    casaCompartilhar: 'Compartilhar a casa',
    comboCompartilhar: 'Compartilhar o combo',
    rotaCompartilhar: 'Compartilhar minha rota',
    rotaVazia: 'Sua rota está vazia. Adicione casas em "Minha rota" para compartilhar.',
    verRota: 'Abrir Minha rota',
    arteConvite: 'Chama a turma e venha jogar também!',
    arteTitulo: 'Estou na Caça aos Carimbos',
    arteCasas: 'casas diferentes validadas',
    texto: (v, n, link) => `Já validei ${v} de ${n} ${n === 1 ? 'casa' : 'casas'} na Caça aos Carimbos da ${EDICAO.nome}. Vem jogar também: ${link}`,
    textoSemProgresso: (link) => `Vem jogar a Caça aos Carimbos da ${EDICAO.nome}: ${link}`,
    tituloCompartilhamento: `Caça aos Carimbos · ${EDICAO.nome}`,
    tituloCasa: (nome) => `${nome} na ${EDICAO.nome}`,
    tituloCombo: (nome) => `Combo da ${nome} na ${EDICAO.nome}`,
    tituloRota: `Minha rota na ${EDICAO.nome}`,
    linkCopiado: 'Link copiado.',
  },
}

/** Motivos que só as telas extras conhecem; o resto cai nos motivos gerais da Caça. */
const MOTIVOS_EXTRAS = {
  assinatura_invalida: 'O navegador não gerou uma assinatura de aviso válida. Tente de novo.',
  limite_dispositivos: 'Este mapa já recebe avisos em 5 aparelhos. Desligue em algum para ativar aqui.',
  sem_assinatura: 'Ative os avisos neste aparelho antes de mudar as preferências.',
}
export const mensagemDoMotivoExtras = (motivo) => MOTIVOS_EXTRAS[motivo] || mensagemDoMotivo(motivo)
