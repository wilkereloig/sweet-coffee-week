/*
 * Textos da Caça aos Carimbos (CLAUDE.md §5.6: conteúdo fora do JSX). Tom de Sweet Lovers: direto, sem formalismo.
 * Regras de redação: nunca "voto/votação" (as pessoas "avaliam"); nunca "Sweet" sozinho; a surpresa do prêmio final
 * NUNCA é revelada ("uma surpresa"); nenhum prêmio por meta é prometido; nada de dado inventado.
 * As outras frentes (grupos, ranking, metas, compartilhar, notificações, instalar) acrescentam o bloco delas em
 * `CACA_SECOES` ou em arquivo próprio em src/edicao/caca/, sem mexer no que já existe aqui.
 */
import { EDICAO } from '../config.js'

const C = `${EDICAO.caminho}/caca`

export const CACA_CAMINHOS = {
  central: C,
  recuperar: `${C}/recuperar`,
  mapa: `${C}/mapa`,
  ranking: `${C}/ranking`,
  grupos: `${C}/grupos`,
  grupo: (id) => `${C}/grupo/${id}`,
  convite: (token) => `${C}/convite/${token}`,
  metas: `${C}/metas`,
  compartilhar: `${C}/compartilhar`,
  rota: `${EDICAO.caminho}/minha-rota`,
  casas: `${EDICAO.caminho}/participantes`,
  regulamento: `${EDICAO.caminho}/regulamento`,
}

export const CACA = {
  nome: 'Caça aos Carimbos',
  voltar: 'Voltar à central da Caça',
  titulos: {
    central: 'Caça aos Carimbos',
    recuperar: 'Recuperar meu mapa',
    ranking: 'Ranking',
    grupos: 'Grupos de amigos',
    grupo: 'Seu grupo',
    metas: 'Metas',
    compartilhar: 'Compartilhar meu progresso',
    convite: 'Convite para um grupo',
  },
  leads: {
    central: 'Carimbe a visita, avalie o combo e junte casas diferentes. Cada casa nova validada conta no seu mapa.',
    recuperar: 'Perdeu o acesso ao seu mapa ou abriu em outro celular? Recupere com o e-mail do mapa.',
    ranking: 'Quem mais conheceu casas diferentes na Cartoon.',
    grupos: 'Jogue com amigos: ranking só entre vocês e uma rota para planejar juntos.',
    grupo: 'O ranking entre vocês, as casas que o grupo já validou e a rota para planejar juntos.',
    metas: 'Marcos de comemoração pelas casas que você validou.',
    compartilhar: 'Mostre seu progresso nos Stories, sem dados pessoais.',
    convite: 'Alguém chamou você para jogar junto.',
  },
  precisaDeMapa: {
    grupos: 'Crie seu mapa para montar grupos com amigos.',
    grupo: 'Abra seu mapa para ver este grupo.',
    metas: 'Crie seu mapa para acompanhar suas metas.',
    compartilhar: 'Crie seu mapa para ter um progresso para compartilhar.',
  },
  carregando: 'Abrindo a sua Caça…',
  falha: { titulo: 'Não conseguimos abrir seu mapa agora', texto: 'Seus carimbos estão guardados. Confira a conexão e tente de novo.' },
  chaveTrocada: 'Este aparelho não reconhece mais o mapa que estava salvo aqui. Se você o recuperou em outro celular, recupere de novo por aqui com o seu e-mail.',

  progresso: {
    titulo: (apelido) => (apelido ? `Mapa de ${apelido}` : 'Seu mapa'),
    casas: (x, n) => `${x} de ${n} ${n === 1 ? 'casa' : 'casas'}`,
    casasRotulo: 'casas diferentes validadas',
    faltam: (n) => (n === 1 ? 'falta 1 casa' : `faltam ${n} casas`),
    extras: (n) => (n === 1 ? '1 carimbo extra' : `${n} carimbos extras`),
    posicao: (p) => `${p}º lugar`,
    empate: (n) => (n === 1 ? 'empatado com mais 1 pessoa' : `empatado com mais ${n} pessoas`),
    semPosicao: 'Valide sua primeira casa para entrar no ranking.',
    esperando: (n) => (n === 1 ? '1 esperando avaliação' : `${n} esperando avaliação`),
    completo: 'Você validou todas as casas! Você concorre ao prêmio final, que inclui uma surpresa, conforme o regulamento.',
    // "Como conta?": o que a central não repete a cada visita. Casa × unidade, extra e "Já fui" numa lista curta, fechada por padrão.
    como: {
      titulo: 'Como conta?',
      itens: [
        'Cada casa conta uma vez, mesmo que tenha mais de um endereço (unidade).',
        'O carimbo só vale depois que você avalia o combo, com o mesmo e-mail do mapa.',
        'Voltar a uma casa que você já validou rende um carimbo extra.',
        '"Já fui", na Minha rota, é só uma anotação sua: não vira carimbo.',
      ],
    },
  },

  proxima: {
    titulo: 'Seu próximo passo',
    comecar: { titulo: 'Escolha uma casa para começar', texto: 'Veja as casas da Cartoon, escolha uma e vá até lá. No balcão, leia o QR do display para carimbar.', acao: 'Ver as casas' },
    avaliar: {
      etiqueta: 'Carimbo pendente',
      titulo: (casa) => `Falta avaliar o combo da ${casa}`,
      texto: (mais) => `O carimbo só vale depois da avaliação, com o mesmo e-mail do mapa.${mais > 0 ? ` Mais ${mais} ${mais === 1 ? 'casa espera' : 'casas esperam'} a sua avaliação.` : ''}`,
      acao: 'Avaliar o combo',
    },
    continuar: { titulo: 'Escolha a próxima casa', texto: 'Casa nova é o que mais conta. Abra o mapa para ver onde ainda falta carimbar.', acao: 'Abrir o mapa' },
    completo: { titulo: 'Mapa completo!', texto: 'Seus carimbos extras ainda contam. Aproveite para chamar os amigos e comparar no ranking.', acao: 'Ver o ranking' },
  },

  atalhos: {
    titulo: 'Para onde ir',
    itens: [
      { chave: 'mapa', desenho: 'mapa', rotulo: 'Mapa' },
      { chave: 'ranking', desenho: 'premio', rotulo: 'Ranking' },
      { chave: 'grupos', desenho: 'conversar', rotulo: 'Grupos' },
      { chave: 'rota', desenho: 'rota', rotulo: 'Minha rota' },
      { chave: 'metas', desenho: 'progresso', rotulo: 'Metas' },
      { chave: 'compartilhar', desenho: 'compartilhar', rotulo: 'Compartilhar' },
    ],
  },
  rodape: { regulamento: 'Regulamento' },

  criar: {
    titulo: 'Comece seu mapa',
    nota: 'Sem senha e sem cadastro longo. Crie antes de visitar as casas: leva meio minuto.',
    apelido: 'Apelido (aparece no ranking, se você quiser)',
    email: 'E-mail',
    emailAjuda: 'É com ele que você avalia os combos. Confirme depois para poder receber voucher, se for selecionado.',
    whatsapp: 'WhatsApp (opcional, para avisar se você ganhar)',
    ranking: 'Quero aparecer no ranking',
    aceite: 'Li e aceito o',
    regulamento: 'regulamento',
    acao: 'Criar meu mapa',
    criando: 'Criando…',
    jaTenho: 'Já tenho mapa',
    outroAparelho: 'Abriu em outro celular, ou pelo app instalado? Recupere seu mapa com o e-mail.',
    recuperar: 'Recuperar meu mapa',
  },
  link: {
    titulo: 'Abrir pelo meu link pessoal',
    campo: 'Cole aqui o link pessoal do seu mapa',
    erro: 'Esse não parece o link do seu mapa. Ele termina com #mapa= e uma sequência de letras.',
    acao: 'Abrir meu mapa',
  },
  guardar: {
    titulo: 'Guarde seu mapa',
    texto: 'Seus carimbos ficam neste aparelho. Para abrir o mapa em outro celular, recupere com o e-mail ou use o seu link pessoal.',
    aviso: 'O link pessoal é como uma senha: quem tiver o link abre o seu mapa. Guarde só para você e não poste nem mande para amigos.',
    copiar: 'Copiar meu link pessoal',
    copiado: 'Link copiado',
    anuncio: 'Link pessoal copiado.',
    falhou: 'Não deu para copiar. Selecione e copie o endereço do navegador depois de abrir seu mapa.',
  },

  email: {
    aviso: 'Seu e-mail ainda não foi confirmado.',
    ajuda: 'Confirme para receber o prêmio, se for selecionado, e para pedir revisão de presença.',
    maisDeUmMapa: 'Se você tem mais de um mapa com este e-mail, só o confirmado aparece no ranking e nos grupos.',
    acao: 'Confirmar e-mail',
    fechar: 'Agora não',
    confirmado: 'E-mail confirmado. Obrigado!',
  },
  codigo: {
    pedirRecuperar: 'Digite o e-mail que você usou ao criar o mapa. Enviaremos um código de 6 dígitos.',
    pedirConfirmar: (email) => `Enviaremos um código de 6 dígitos para ${email}.`,
    campoEmail: 'E-mail do mapa',
    enviar: 'Enviar código',
    enviando: 'Enviando…',
    reenviar: 'Enviar outro código',
    reenviarEm: (s) => `Enviar outro código em ${s} s`,
    enviado: 'Se existir um mapa com esse e-mail, o código está a caminho. Ele vale por 10 minutos. Confira também a caixa de spam.',
    limitado: 'Muitos pedidos de código por agora. Espere um pouco, até 1 hora se já pediu várias vezes, ou use o último código que chegou se ele ainda não venceu (vale 10 minutos).',
    campoCodigo: 'Código de 6 dígitos',
    validar: 'Validar código',
    validando: 'Validando…',
    invalido: 'Código inválido ou vencido. Peça um novo.',
    recuperado: (apelido) => `Pronto! O mapa${apelido ? ` de ${apelido}` : ''} foi recuperado neste aparelho. O aparelho antigo precisará recuperar de novo.`,
    emailInvalido: 'Confira o e-mail.',
    rede: 'Sem conexão com o servidor agora. Tente de novo em instantes.',
    tentarDeNovo: 'Tentar de novo',
    naoChegou: 'Não chegou?',
    indisponivelTitulo: 'Não conseguimos enviar o e-mail agora',
    indisponivelTexto: 'O envio de e-mails da Caça não está disponível neste momento, e por isso não vai chegar código nenhum. Enquanto isso:',
    naoChegouTitulo: 'O código não chegou?',
    naoChegouTexto: 'Se já passaram alguns minutos e ele não está nem no spam, você pode pedir outro código daqui a pouco. Enquanto isso:',
    voltarAoCodigo: 'Voltar e digitar o código',
    indisponivelLink: 'Se você ainda tem o mapa aberto em algum celular, copie por lá o link pessoal e cole aqui embaixo.',
    indisponivelOrg: 'Se não tiver mais acesso a nenhum aparelho, fale com a organização.',
    falarOrg: 'Falar com a organização',
  },
  aparelho: {
    ios: 'No iPhone, o app instalado e o Safari guardam o mapa separados. Se abrir vazio, recupere com o e-mail ou cole o seu link pessoal.',
  },
  recuperar: {
    jaAberto: 'Seu mapa já está aberto neste aparelho.',
    voltar: 'Ir para a central',
  },

  // Porta do QR (página /cartoon/carimbo/<código>): carimbar na casa. A avaliação é a outra porta (aposAvaliar).
  carimbo: {
    rotulo: 'Caça aos Carimbos',
    titulo: 'Carimbe sua visita',
    lead: 'Chegou na casa? Carimbe a visita. Na primeira vez em cada casa, avalie o combo para o carimbo valer.',
    carimbar: 'Carimbar aqui',
    conferindo: 'Conferindo…',
    privacidade: 'O celular pede a sua localização só agora, para conferir que você está na casa quando ela já tem o ponto conferido. A posição não é guardada: fica só a distância até a casa, em metros.',
    okTitulo: 'Carimbado!',
    pendenteTitulo: 'Carimbo pendente — falta avaliar',
    primeira: (nome) => `Primeira visita na ${nome}.`,
    outra: (nome) => `Mais uma visita na ${nome}.`,
    pendenteLead: 'Falta um passo para o carimbo valer.',
    pendenteSub: 'Avalie o combo para validar',
    pendenteTexto: (nome) => `O carimbo da ${nome} só vale depois que você avalia o combo, com o mesmo e-mail do seu mapa. Pode ser agora ou depois: a ordem não importa.`,
    pendenteAcao: 'Avaliar o combo e validar',
    validadas: (x, n) => `Você tem ${x} de ${n} ${n === 1 ? 'casa validada' : 'casas validadas'}.`,
    extra: 'Voltar a uma casa que você já validou rende um carimbo extra.',
    central: 'Abrir minha Caça',
    casas: 'Ver as casas',
    tentar: 'Tentar de novo',
    semConexao: { titulo: 'Sem conexão agora', texto: 'Confira a internet do celular e tente de novo.' },
  },
  aposAvaliar: {
    titulo: 'Sua avaliação também vale na Caça aos Carimbos',
    textoComMapa: (casa) => `Ela valida o carimbo ${casa ? `da ${casa}` : 'desta casa'}. Já carimbou lá? Então o carimbo acabou de ficar válido. Ainda não? Avaliar sozinho não cria carimbo: vá até a casa e leia o QR do display, com a localização do celular ligada.`,
    mapaCriado: 'Mapa criado! Falta só carimbar na casa',
    criarTitulo: 'Essa avaliação te coloca na Caça aos Carimbos!',
    criarNota: 'Crie seu mapa com o mesmo e-mail da avaliação, que já vem preenchido, e junte casas diferentes. Depois é preciso carimbar presencialmente: leia o QR do display na casa, com a localização ligada.',
    criarAcao: 'Criar meu mapa',
  },

  stub: (nome) => `${nome}: em construção.`,
  convite: {
    invalido: { titulo: 'Esse convite não é válido', texto: 'O link está incompleto ou foi alterado. Peça um novo link para quem convidou.' },
  },
}

/** Frase para cada `motivo` de falha do banco. Motivo desconhecido cai em `generico`. */
export const MOTIVOS = {
  generico: 'Não deu certo agora. Tente de novo em instantes.',
  rede: 'Sem conexão com o servidor agora. Tente de novo em instantes.',
  mapa_desconhecido: 'Não achamos o seu mapa neste aparelho. Abra pelo seu link pessoal ou recupere com o e-mail.',
  negado: 'Você não tem acesso a esta parte.',
  muitos_pedidos: 'Muitos pedidos agora, tente de novo em alguns minutos.',
  apelido_invalido: 'O apelido precisa ter de 2 a 24 letras.',
  email_invalido: 'Confira o e-mail.',
  whatsapp_invalido: 'Confira o WhatsApp, com DDD.',
  aceite_obrigatorio: 'Para continuar, aceite o regulamento.',
  edicao_desconhecida: 'Não achamos esta edição.',
  codigo_invalido: 'Código inválido ou vencido. Peça um novo.',
  email_indisponivel: 'Não conseguimos enviar o e-mail agora.',
  falha_temporaria: 'Não conseguimos pedir o código agora. Tente de novo em instantes.',
  convite_invalido: 'Esse convite não é válido.',
  convite_revogado: 'Esse convite foi cancelado por quem administra o grupo.',
  convite_expirado: 'Esse convite venceu. Peça um novo.',
  convite_esgotado: 'Esse convite já foi usado o máximo de vezes. Peça um novo.',
  grupo_cheio: 'Esse grupo já está cheio.',
  limite_grupos: 'Você já participa do máximo de grupos.',
  removido_do_grupo: 'Você foi removido deste grupo e não pode voltar a ele, nem por link novo.',
  edicao_diferente: 'Esse convite é de outra edição.',
  conflito: 'Alguém mexeu na rota ao mesmo tempo. Veja a rota atual e tente de novo.',
}

export const mensagemDoMotivo = (motivo) => MOTIVOS[motivo] || MOTIVOS.generico
