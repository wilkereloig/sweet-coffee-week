/*
 * Textos da Caça aos Carimbos (CLAUDE.md §5.6: conteúdo fora do JSX). Tom de Sweet Lovers: direto, sem formalismo.
 * Regras de redação: nunca "voto/votação" (as pessoas "avaliam"); nunca "Sweet" sozinho; a surpresa do prêmio final
 * NUNCA é revelada ("uma surpresa"); nenhum prêmio por meta é prometido; nada de dado inventado.
 * As outras frentes (grupos, ranking, metas, compartilhar, notificações, instalar) acrescentam o bloco delas em
 * `CACA_SECOES` ou em arquivo próprio em src/edicao/caca/, sem mexer no que já existe aqui.
 */
import { EDICAO } from '../config.js'
import { CAMPANHA } from './campanha/terComQuemContar.js'

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
  delivery: `${C}/delivery`,
  visitaAnterior: `${C}/visita-anterior`,
  sicredi: `${CAMPANHA.caminho}?carimbo=1`,
  rota: `${EDICAO.caminho}/mapa?painel=rota`, // a rota é o painel do Mapa da Doçura
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
    delivery: 'Carimbo do meu delivery',
    'visita-anterior': 'Pedir carimbo de visita',
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
    delivery: 'Recebeu o combo em casa? Peça o carimbo sem sair de onde está.',
    'visita-anterior': 'Foi a uma casa e não conseguiu carimbar? Peça que a organização confira a sua visita.',
    convite: 'Alguém chamou você para jogar junto.',
  },
  precisaDeMapa: {
    grupos: 'Crie seu mapa para montar grupos com amigos.',
    grupo: 'Abra seu mapa para ver este grupo.',
    metas: 'Crie seu mapa para acompanhar suas metas.',
    compartilhar: 'Crie seu mapa para ter um progresso para compartilhar.',
    delivery: 'Crie seu mapa para pedir o carimbo de um delivery.',
    'visita-anterior': 'Crie ou abra o seu mapa para pedir que a organização confira uma visita.',
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
        'O carimbo só vale depois que você avalia o combo daquela mesma casa, a que você provou, com o mesmo e-mail do mapa.',
        'Voltar a uma casa que você já validou rende um carimbo extra.',
        '"Já fui", na Minha rota, é só uma anotação sua: não vira carimbo.',
      ],
    },
  },

  // Como carimbar: três passos, à vista no mapa, na central e no atalho "Progresso" (05/11/2026, pedido do Wilker: "não está claro
  // como faço o carimbo"). Carimbar e avaliar são portas diferentes; o carimbo só vale com as duas, na mesma casa.
  comoCarimbar: {
    titulo: 'Como carimbar',
    passos: [
      { titulo: 'Vá até a casa', texto: 'Peça o combo no balcão.' },
      { titulo: 'Carimbe na casa', texto: 'Leia o QR do display de mesa com a câmera do celular: abre a página da casa. Toque em "Carimbar" e depois em "Carimbar aqui", com a localização ligada. Também dá para tocar em "Carimbar aqui" no cartão da casa, no mapa.' },
      { titulo: 'Avalie o combo da mesma casa', texto: 'Use o mesmo e-mail do mapa. O carimbo só vale depois da avaliação.' },
    ],
    nota: 'O celular confere que você está na casa. A posição não é guardada.',
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
      { chave: 'ranking', desenho: 'ranking', rotulo: 'Ranking' },
      { chave: 'grupos', desenho: 'conversar', rotulo: 'Grupos' },
      { chave: 'rota', desenho: 'rota', rotulo: 'Minha rota' },
      { chave: 'metas', desenho: 'progresso', rotulo: 'Metas' },
      { chave: 'compartilhar', desenho: 'compartilhar', rotulo: 'Compartilhar' },
      { chave: 'delivery', desenho: 'carimbo-delivery', rotulo: 'Carimbo do meu delivery' },
      { chave: 'visitaAnterior', desenho: 'ja-fui', rotulo: 'Pedir carimbo de uma visita' },
      { chave: 'sicredi', desenho: 'ja-fui', rotulo: 'Pedir carimbo Sicredi' },
    ],
  },
  rodape: { regulamento: 'Regulamento' },

  // Atualização do app instalado (pwa/atualizacao.js). Só três situações pedem aviso: nunca se diz "atualizado" sem a versão nova ter chegado.
  atualizacao: {
    aguardando: 'Há uma versão nova da Caça. Termine o que está fazendo: eu atualizo em seguida, e o seu mapa e os seus carimbos continuam aqui.',
    offline: 'Sem conexão. Quando a internet voltar, a Caça confere se há uma versão mais nova.',
    falhou: 'Não consegui carregar a versão nova agora. Feche o app e abra de novo com internet; o seu mapa e os seus carimbos continuam aqui.',
  },

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
    jaTenhoTopo: 'Cada e-mail tem um só mapa. Entre no seu com um código por e-mail, mesmo em outro celular.',
    portasRotulo: 'Como você quer entrar',
    portaNova: 'Primeira vez aqui?',
    portaNovaAcao: 'Começar agora',
    notaCurta: 'Crie agora e comece a carimbar as casas que visitar.',
    tenhoLink: 'Tenho o link pessoal do mapa',
    jaTemNoAparelho: 'Este aparelho já tem um mapa, e cada e-mail tem um só.',
    abrirMeuMapa: 'Abrir meu mapa',
    jaTemMapa: { titulo: 'Esse e-mail já tem um mapa', texto: 'Cada e-mail tem um só mapa, e não dá para criar outro. Para entrar no seu, peça um código de 6 dígitos no e-mail do mapa. Se o mapa não for seu ou estiver com dados errados, entre nele pelo código, use "Apagar meu mapa" em Carimbos e crie o seu.', acao: 'Entrar no meu mapa' },
    outroAparelho: 'Abriu em outro celular, ou pelo app instalado? Recupere seu mapa com o e-mail.',
    recuperar: 'Recuperar meu mapa',
  },
  link: {
    titulo: 'Abrir pelo meu link pessoal',
    campo: 'Cole aqui o link que você copiou ao criar o mapa ou recebeu por e-mail',
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
    falhou: 'Não deu para copiar sozinho. Toque no campo abaixo, selecione tudo e copie.',
    campo: 'Seu link pessoal',
    tituloAqui: 'Meu link pessoal',
    semMapa: 'Sem um mapa aberto neste aparelho não há link pessoal. Crie um mapa ou recupere o seu.',
    recuperar: 'Recuperar meu mapa',
  },

  email: {
    aviso: 'Seu e-mail ainda não foi confirmado.',
    ajuda: 'Confirme para receber o prêmio, se for selecionado, e para pedir revisão de presença.',
    maisDeUmMapa: 'Se você tem mais de um mapa com este e-mail (criados antes da regra de um mapa por e-mail), só o confirmado aparece no ranking e nos grupos.',
    acao: 'Confirmar e-mail',
    fechar: 'Agora não',
    confirmado: 'E-mail confirmado. Obrigado!',
    // "Aceito" não é "entregue": o texto diz que o pedido foi aceito e manda conferir a caixa de entrada e o spam.
    confirmadoLinkPedido: (email) => `E-mail confirmado. Pedimos o envio do link do seu mapa para ${email}; pode levar alguns minutos, confira também o spam. Ele é como uma senha: guarde só para você.`,
    confirmadoLinkFalhou: 'E-mail confirmado, e o seu mapa continua aberto. Não deu para pedir o envio do link agora.',
    linkPedido: (email) => `Pedimos o envio do link para ${email}. Pode levar alguns minutos; confira também o spam.`,
    tentarEnviar: 'Tentar enviar novamente',
    receberLink: 'Receber meu link por e-mail',
    receberLinkAjuda: 'Podemos enviar o link pessoal do seu mapa para o seu e-mail confirmado. Serve para abrir o mapa em outro celular.',
    enviandoLink: 'Enviando…',
    linkLimitado: 'Você já pediu o link há pouco. Espere um minuto e confira a caixa de entrada e o spam.',
    linkRede: 'Sem conexão agora. Tente de novo em instantes.',
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
    lead: 'Chegou na casa? Carimbe a visita. Na primeira vez em cada casa, o carimbo só vale depois que você avalia o combo daquela mesma casa.',
    carimbar: 'Carimbar aqui',
    conferindo: 'Conferindo…',
    privacidade: 'O celular pede a sua localização só agora, para conferir que você está na casa quando ela já tem o ponto conferido. A posição não é guardada: fica só a distância até a casa, em metros.',
    okTitulo: 'Carimbado!',
    pendenteTitulo: 'Carimbo pendente — falta avaliar',
    primeira: (nome) => `Primeira visita na ${nome}.`,
    outra: (nome) => `Mais uma visita na ${nome}.`,
    pendenteLead: 'Falta um passo para o carimbo valer.',
    pendenteSub: 'Avalie o combo para validar',
    pendenteTexto: (nome) => `O carimbo da ${nome} só vale depois que você avalia o combo da ${nome}, a casa onde você provou, com o mesmo e-mail do seu mapa. Pode ser agora ou depois: a ordem não importa.`,
    pendenteAcao: 'Avaliar o combo e validar',
    validadas: (x, n) => `Você tem ${x} de ${n} ${n === 1 ? 'casa validada' : 'casas validadas'}.`,
    extra: 'Voltar a uma casa que você já validou rende um carimbo extra.',
    registrado: (nome) => `Carimbo registrado na ${nome}.`,
    pendenteConta: (x, n) => `Por enquanto você tem ${x} de ${n} ${n === 1 ? 'casa validada' : 'casas validadas'}; esta entra na conta quando você avaliar.`,
    proximoTitulo: 'Próximo passo',
    proximoMapa: 'Escolher a próxima casa no mapa',
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
  email_ja_tem_mapa: 'Esse e-mail já tem um mapa. Cada e-mail tem um só.',
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
