/*
 * Documentos legais do site institucional — FONTE ÚNICA do texto (13/10/2026).
 *
 * Política de Privacidade, Política de Cookies e Termos de Uso. A página
 * (src/pages/legal/) só monta; o texto mora aqui (§5.6).
 *
 * Marcação mínima dentro das strings: [texto](endereço) vira link e
 * **texto** vira negrito. `#id` (sem barra) rola até a seção da página. Blocos:
 *   'texto'                         parágrafo
 *   { lista: ['…', '…'] }           lista
 *   { tabela: { colunas, linhas } } tabela (inventário de cookies)
 *   { acao: 'preferencias' }        botão que abre as preferências de cookies
 *
 * ⚠️ Escrito só com o que o código faz e o que o Wilker confirmou em
 * 13/10/2026 (responsável, CNPJ, canal). O que ainda não está confirmado —
 * encarregado, prazos de guarda, base legal de cada finalidade, onde ficam os
 * servidores, contratos com fornecedores — NÃO entra como afirmação: está na
 * lista de pendências em src/pages/CLAUDE.md §7.9. Não completar com
 * suposição.
 */
import { RESPONSAVEL, CONTATO_EMAIL, PRIVACIDADE_MAILTO, IMAGEM_MAILTO } from '../../config/channels'
import { VALIDADE_DIAS } from '../../lib/consentimento'
import { GA_ID } from '../../lib/analytics'

export const ATUALIZADO_EM = '13 de outubro de 2026'

const CANAL = `[${CONTATO_EMAIL}](${PRIVACIDADE_MAILTO})`
const CANAL_IMAGEM = `[${CONTATO_EMAIL}](${IMAGEM_MAILTO})`
const RESP = `${RESPONSAVEL.razaoSocial} (${RESPONSAVEL.nome}), CNPJ ${RESPONSAVEL.cnpj}`

/* Cookies do Google Analytics: validade CONFIGURADA em src/lib/analytics.js
   (`cookie_expires`) igual à da escolha, e conferida no navegador por
   tests/privacidade-navegador.mjs. */
const DURACAO_GA = `${VALIDADE_DIAS} dias`

export const DOCUMENTOS = {
  privacidade: {
    titulo: 'Política de Privacidade',
    resumo: [
      `Quem cuida dos dados é a ${RESP}, que realiza o Sweet & Coffee Week.`,
      'Para visitar o site você não precisa se cadastrar. Tratamos os dados que você envia nos formulários e dados de navegação para medir o acesso — dá para recusar a medição com um clique.',
      `Para pedir acesso, correção, exclusão ou tirar dúvidas sobre seus dados, escreva para ${CANAL}.`,
    ],
    secoes: [
      {
        id: 'responsavel',
        titulo: 'Quem é responsável',
        blocos: [
          `O Sweet & Coffee Week é realizado pela ${RESP}. É ela quem decide como os dados pessoais tratados neste site são usados.`,
          `Pedidos e dúvidas sobre dados pessoais vão para ${CANAL}, com o assunto “Privacidade — Sweet & Coffee Week”.`,
        ],
      },
      {
        id: 'alcance',
        titulo: 'Onde esta política vale',
        blocos: [
          'Vale para o site institucional do festival (sweetcoffeeweek.com.br), incluindo o formulário de pré-cadastro em [/quero-participar](/quero-participar/).',
          'O Painel SCW é uma área restrita, usada pela organização e pelas marcas participantes que receberam acesso. O que acontece lá está na seção [Painel SCW](#painel). Para visitar o site, nada do painel é pedido.',
        ],
      },
      {
        id: 'dados',
        titulo: 'Quais dados tratamos e para quê',
        blocos: [
          '**Ao navegar.** Não pedimos cadastro. Como em qualquer site, o seu navegador envia dados técnicos (endereço IP, tipo de navegador e a página pedida) aos serviços que entregam o site e as fontes de texto — ver [Fornecedores](#fornecedores).',
          '**Formulário de Contato.** Nome, e-mail, assunto e mensagem, usados para responder o que você escreveu.',
          '**Formulário de Apoio.** Nome, empresa ou marca, e-mail e/ou WhatsApp, segmento, tipo de apoio e mensagem, usados para analisar a proposta e falar com você sobre ela.',
          '**Pré-cadastro (/quero-participar).** Nome, WhatsApp, e-mail, nome do estabelecimento, tipo de negócio, Instagram e cidade, usados para analisar o interesse em participar e falar com você sobre as próximas edições. O pré-cadastro não garante vaga.',
          '**Análise de acesso.** Para saber quantas pessoas visitam o site e quais páginas funcionam melhor, usamos o Google Analytics, com base no legítimo interesse do festival em medir a própria audiência. Ele registra as páginas visitadas, o título da página e dados técnicos do navegador e do dispositivo, com um identificador guardado em cookie. Mandamos o endereço reduzido à página (sem parâmetros que possam conter dados digitados) e nenhum conteúdo de formulário. Os recursos de anúncios e de personalização ficam desligados. Você pode recusar no aviso ou em “Preferências de cookies”, no rodapé; navegadores com o sinal Global Privacy Control ligado já chegam com a medição recusada.',
          '**Proteção contra abuso.** Os formulários passam por verificações automáticas antes de gravar: um campo escondido que só robôs preenchem e um tempo mínimo de preenchimento. No pré-cadastro, a página também carrega a verificação Turnstile, da Cloudflare. Tentativas bloqueadas podem gerar um registro técnico com o endereço IP no serviço que recebe os envios.',
        ],
      },
      {
        id: 'painel',
        titulo: 'Painel SCW',
        blocos: [
          'O painel é usado pela equipe da organização e pelas marcas participantes, com acesso criado pela organização. Ao entrar, o login fica guardado no navegador só enquanto a aba estiver aberta. Os dados de cadastro e de operação de cada marca são usados para organizar a participação na edição.',
        ],
      },
      {
        id: 'fornecedores',
        titulo: 'Fornecedores e compartilhamento',
        blocos: [
          'Os dados enviados pelos formulários ficam no banco de dados do festival e são lidos pela equipe da organização. Para o site funcionar, usamos estes serviços:',
          {
            lista: [
              '**Vercel** — hospedagem do site.',
              '**Supabase** — banco de dados, recebimento dos formulários e login do painel.',
              '**Adobe Fonts** e **Google Fonts** — fontes de texto, carregadas em todas as páginas. Esses serviços recebem os dados técnicos da requisição.',
              '**Google Analytics** — análise de acesso, enquanto você não recusar.',
              '**Cloudflare Turnstile** — verificação contra envio automatizado no pré-cadastro.',
            ],
          },
        ],
      },
      {
        id: 'imagens',
        titulo: 'Fotos de pessoas',
        blocos: [
          'O site mostra fotos das edições do festival, e algumas mostram pessoas. Se você aparece em uma e não quer que ela fique no site, peça a retirada — como fazer está em [Uso de imagem](#/uso-de-imagem).',
        ],
      },
      {
        id: 'links',
        titulo: 'Links para outros sites',
        blocos: [
          'O site leva a páginas de terceiros: Instagram, Google Maps, YouTube, WhatsApp e matérias de imprensa. Ao abrir esses links você sai do site do festival, e passam a valer as regras de privacidade de cada serviço.',
        ],
      },
      {
        id: 'guarda',
        titulo: 'Por quanto tempo guardamos',
        blocos: [
          'Os dados dos formulários ficam guardados enquanto forem necessários para responder, analisar a proposta ou acompanhar o interesse de participação nas próximas edições, e pelo tempo que alguma obrigação legal exigir.',
          `A sua escolha sobre cookies vale por ${VALIDADE_DIAS} dias; depois disso o aviso volta a perguntar.`,
        ],
      },
      {
        id: 'seguranca',
        titulo: 'Segurança',
        blocos: [
          'O site funciona só por conexão criptografada (HTTPS), e os envios dos formulários passam por verificações contra robôs antes de gravar. Nenhum sistema está livre de falhas.',
        ],
      },
      {
        id: 'direitos',
        titulo: 'Seus direitos',
        blocos: [
          'Pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode pedir:',
          {
            lista: [
              'confirmação de que tratamos dados seus e acesso a eles;',
              'correção de dados incompletos, errados ou desatualizados;',
              'anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;',
              'portabilidade dos dados;',
              'informação sobre com quem os dados foram compartilhados;',
              'eliminação dos dados tratados com o seu consentimento, e revogação desse consentimento;',
              'oposição a um tratamento, quando cabível.',
            ],
          },
          `Para pedir, escreva para ${CANAL} com o assunto “Privacidade — Sweet & Coffee Week”. Podemos pedir alguma informação para confirmar que o pedido é seu. Você também pode procurar a Autoridade Nacional de Proteção de Dados (ANPD).`,
        ],
      },
      {
        id: 'cookies',
        titulo: 'Cookies',
        blocos: [
          'A [Política de Cookies](#/cookies) lista o que o site guarda no seu navegador e explica como mudar a sua escolha.',
          { acao: 'preferencias' },
        ],
      },
      {
        id: 'mudancas',
        titulo: 'Mudanças nesta política',
        blocos: [
          'Quando esta política mudar, a data no topo muda junto. Se a mudança trouxer uma finalidade nova que dependa da sua permissão, o aviso de cookies volta a perguntar.',
        ],
      },
    ],
  },

  cookies: {
    titulo: 'Política de Cookies',
    resumo: [
      'O site guarda poucas coisas no seu navegador: a sua escolha sobre cookies, o login do Painel SCW (só para quem entra nele) e os cookies do Google Analytics, que medem as visitas.',
      'A medição vem ligada e não é usada para anúncios. Você pode recusar com um clique e mudar de ideia quando quiser.',
    ],
    secoes: [
      {
        id: 'o-que-sao',
        titulo: 'Cookies e tecnologias parecidas',
        blocos: [
          '**Cookies** são pequenos arquivos que um site grava no navegador. O site também usa duas tecnologias parecidas, que não são cookies: **localStorage**, que guarda informação no navegador até ser apagada ou vencer, e **sessionStorage**, que some quando a aba é fechada.',
        ],
      },
      {
        id: 'categorias',
        titulo: 'As duas categorias',
        blocos: [
          '**Funcionamento e segurança — sempre ativo.** Guarda a sua escolha sobre cookies e, se você entrar no Painel SCW, mantém o login enquanto a aba estiver aberta. No pré-cadastro, a verificação da Cloudflare protege o formulário contra envio automatizado. Nada disso mede audiência.',
          '**Análise de acesso — ligada, com recusa a um clique.** O Google Analytics conta visitas e mostra quais páginas são mais acessadas. Depois de recusar, o site não carrega a ferramenta nem envia nada ao Google Analytics. Navegadores com o sinal Global Privacy Control ligado já chegam com a medição recusada.',
          'Não há cookies de publicidade, de personalização ou de marketing no site.',
        ],
      },
      {
        id: 'inventario',
        titulo: 'O que fica no seu navegador',
        blocos: [
          {
            tabela: {
              colunas: ['Nome', 'Tecnologia', 'Fornecedor', 'Para que serve', 'Categoria', 'Quando é criado', 'Duração'],
              linhas: [
                ['scw_privacidade', 'localStorage', 'Sweet & Coffee Week', 'Lembrar a sua escolha sobre cookies', 'Funcionamento', 'Quando você responde ao aviso ou salva as preferências', `${VALIDADE_DIAS} dias`],
                ['scw_org, scw_org_conta', 'sessionStorage', 'Sweet & Coffee Week', 'Manter o login da organização no Painel SCW', 'Funcionamento', 'Só ao entrar no painel', 'Até fechar a aba'],
                ['scw_marca', 'sessionStorage', 'Sweet & Coffee Week', 'Manter o login da marca participante no Painel SCW', 'Funcionamento', 'Só ao entrar no painel', 'Até fechar a aba'],
                ['_ga', 'Cookie', 'Google (Google Analytics)', 'Distinguir visitantes para contar visitas', 'Análise', 'Na visita, se a análise não foi recusada', DURACAO_GA],
                [`_ga_${GA_ID.replace(/^G-/, '')}`, 'Cookie', 'Google (Google Analytics)', 'Manter a sessão de medição', 'Análise', 'Na visita, se a análise não foi recusada', DURACAO_GA],
              ],
            },
          },
          'O pré-cadastro carrega a verificação Turnstile num quadro da Cloudflare; ela funciona dentro desse quadro e não é usada para medir audiência. As fontes de texto vêm da Adobe e do Google em todas as páginas e não dependem da sua escolha — ver a [Política de Privacidade](#/privacidade).',
        ],
      },
      {
        id: 'escolha',
        titulo: 'Como recusar ou mudar',
        blocos: [
          'Na primeira visita, um aviso curto explica que o site mede as visitas e oferece **Ok, entendi** e **Recusar**.',
          'Para mudar depois, use **Preferências de cookies** no rodapé de qualquer página, no menu “mais” do celular ou o botão abaixo.',
          { acao: 'preferencias' },
        ],
      },
      {
        id: 'revogar',
        titulo: 'O que acontece ao revogar',
        blocos: [
          'Ao desligar a análise, o site para de enviar dados ao Google Analytics na hora e apaga os cookies _ga deste site no seu navegador. A sua preferência e o login do painel continuam.',
          `Revogar não apaga o que já foi enviado antes. Para pedir isso, escreva para ${CANAL}.`,
          'Se você limpar os dados do navegador, a sua escolha também é apagada e o aviso aparece de novo.',
        ],
      },
      {
        id: 'validade',
        titulo: 'Validade da escolha',
        blocos: [
          `A escolha vale por ${VALIDADE_DIAS} dias. Depois disso, ou se o aviso mudar por causa de uma finalidade nova, o aviso aparece outra vez. Se o navegador não permitir guardar a escolha, ela vale só até a aba fechar.`,
        ],
      },
    ],
  },

  termos: {
    titulo: 'Termos de Uso',
    resumo: [
      'Este site apresenta o Sweet & Coffee Week: a história, as edições, o Sweet Awards e os caminhos para participar ou apoiar.',
      'Ele não é contrato de participação. Cada edição tem regras próprias, divulgadas pela organização.',
    ],
    secoes: [
      {
        id: 'site',
        titulo: 'Para que serve o site',
        blocos: [
          `O site é informativo e é mantido pela ${RESP}, realizadora do festival. Usar o site significa concordar com estes termos.`,
        ],
      },
      {
        id: 'acervo',
        titulo: 'Acervo histórico',
        blocos: [
          'Fotos, temas, participantes, resultados e números de edições passadas formam um registro histórico. Ele pode ter lacunas: quando o acervo não registra uma informação, o site diz isso em vez de completar. Se encontrar um erro, avise pelo [Contato](#/contato).',
        ],
      },
      {
        id: 'atualizacao',
        titulo: 'Informações que mudam',
        blocos: [
          'Datas, temas, participantes e condições de cada edição são divulgados pela organização e podem mudar. Quando houver regulamento de edição, de participação ou de premiação, vale o que ele disser.',
        ],
      },
      {
        id: 'marcas',
        titulo: 'Marcas e materiais',
        blocos: [
          'Os textos, as fotos e a identidade visual do festival podem ser vistos e compartilhados por link para uso pessoal. Outros usos, em especial comerciais ou que sugiram parceria com o festival, precisam de autorização da organização.',
          'Marcas, logos, fotos e produtos de participantes, parceiros e veículos de imprensa pertencem aos seus titulares e aparecem aqui para registrar a participação de cada um.',
          'Fotos de pessoas e o pedido de retirada da sua imagem: ver [Uso de imagem](#/uso-de-imagem).',
        ],
      },
      {
        id: 'terceiros',
        titulo: 'Links para terceiros',
        blocos: [
          'O site leva a páginas de outros serviços (Instagram, Google Maps, YouTube, WhatsApp, imprensa). O festival não controla o conteúdo nem as regras desses serviços.',
        ],
      },
      {
        id: 'conduta',
        titulo: 'Uso adequado',
        blocos: [
          'Não é permitido:',
          {
            lista: [
              'tentar burlar as proteções do site, do painel ou dos formulários;',
              'enviar formulários de forma automatizada ou em massa;',
              'enviar dados de outra pessoa sem autorização dela;',
              'enviar conteúdo ilegal, ofensivo ou enganoso;',
              'atrapalhar o funcionamento do site.',
            ],
          },
        ],
      },
      {
        id: 'formularios',
        titulo: 'Formulários',
        blocos: [
          'Informe dados verdadeiros. Enviar um formulário não cria contrato nem obrigação de resposta em prazo determinado.',
          {
            lista: [
              '**Contato** — a mensagem chega à equipe da organização.',
              '**Apoio** — a proposta é analisada pela organização; enviar não garante patrocínio nem parceria.',
              '**Pré-cadastro** — registra o interesse em participar. Não garante vaga: a participação em cada edição é confirmada pela organização, com regras próprias.',
            ],
          },
          'Como os dados enviados são tratados está na [Política de Privacidade](#/privacidade).',
        ],
      },
      {
        id: 'painel',
        titulo: 'Painel SCW',
        blocos: [
          'O painel é de uso restrito de quem recebeu acesso da organização. Guarde a sua senha e não a compartilhe.',
        ],
      },
      {
        id: 'disponibilidade',
        titulo: 'Disponibilidade',
        blocos: [
          'O site pode passar por manutenção, mudar de conteúdo ou ficar fora do ar por algum tempo.',
        ],
      },
      {
        id: 'contato',
        titulo: 'Contato',
        blocos: [
          `Dúvidas sobre estes termos: ${CANAL} ou a página de [Contato](#/contato).`,
        ],
      },
      {
        id: 'mudancas',
        titulo: 'Mudanças nestes termos',
        blocos: [
          'Quando estes termos mudarem, a data no topo muda junto.',
        ],
      },
    ],
  },

  'uso-de-imagem': {
    titulo: 'Uso de imagem',
    resumo: [
      'O site mostra fotos das edições do Sweet & Coffee Week, e algumas mostram pessoas: público, equipes das casas participantes, premiados.',
      `Se você aparece em uma foto e não quer que ela fique no site, escreva para ${CANAL_IMAGEM} e a foto sai.`,
    ],
    secoes: [
      {
        id: 'fotos',
        titulo: 'De onde vêm as fotos',
        blocos: [
          'São registros das edições do festival: o público nas casas participantes, as equipes, os combos e as entregas do Sweet Awards. Elas aparecem para contar a história do festival, não para identificar quem está nelas.',
        ],
      },
      {
        id: 'retirada',
        titulo: 'Como pedir a retirada',
        blocos: [
          `Escreva para ${CANAL_IMAGEM}, com o assunto “Retirada de imagem — Sweet & Coffee Week”. Para a equipe achar a foto, mande:`,
          {
            lista: [
              'o endereço da página onde a foto aparece;',
              'uma descrição curta da foto ou uma captura de tela;',
              'como você aparece nela (por exemplo, “de camisa azul, à esquerda”).',
            ],
          },
          'Não precisa explicar o motivo. A equipe confirma pelo mesmo e-mail quando a foto sair do site.',
        ],
      },
      {
        id: 'outros',
        titulo: 'Fotos em outros lugares',
        blocos: [
          'Este pedido vale para o site. Fotos publicadas no Instagram do festival ou por veículos de imprensa seguem as regras de cada lugar; para o Instagram do festival, use o mesmo e-mail.',
        ],
      },
      {
        id: 'dados',
        titulo: 'Seus dados',
        blocos: [
          'A sua imagem é um dado pessoal. Os outros direitos que você tem estão na [Política de Privacidade](#/privacidade).',
        ],
      },
    ],
  },
}
