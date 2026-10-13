/*
 * Página Contato — texto EDITORIAL e configuração da consulta.
 *
 * O que NÃO mora aqui, de propósito:
 *  · as 93 perguntas e respostas → src/data/faqCentral.js (fonte única; também
 *    gera o schema FAQPage). Nenhuma resposta é copiada para cá;
 *  · os assuntos do formulário → CONTACT_SUBJECTS em src/data/contactFaq.js
 *    (são os que o banco aceita — validateContact recusa qualquer outro);
 *  · o @ do Instagram → src/config/channels.js.
 */

export const ABERTURA = {
  rotulo: 'Contato',
  titulo: 'Sua dúvida, respondida aqui.',
  // `{total}` vira a contagem real de perguntas da central (não é digitada).
  lead: 'Público, marcas, imprensa e parceiros: busque entre {total} respostas ou escreva para a equipe.',
  buscaRotulo: 'Buscar nas perguntas frequentes',
  buscaExemplo: 'Ex.: ingresso, lactose, patrocínio',
  buscar: 'Buscar',
  escrever: 'Escrever para a organização',
}

export const CENTRAL = {
  rotulo: 'Central de dúvidas',
  titulo: ['O que a gente ', 'mais responde', '.'],
  buscaRotulo: 'Buscar uma dúvida',
  buscaExemplo: 'Palavra ou assunto',
  assuntos: 'Assuntos',
  tituloBusca: 'Resultado da busca',
  tituloTodas: 'Todas as perguntas',
  vazioTitulo: 'Nenhuma pergunta encontrada',
  vazioTexto: 'Tente outra palavra (pagamento, lactose, carimbo, patrocínio) ou escolha um assunto.',
  limpar: 'Limpar busca',
  ponteTitulo: 'Não encontrou sua dúvida?',
  ponteLink: 'Escrever para a organização',
}

/* Visão de entrada da central: uma pergunta-chave de cada público, em vez de
   abrir direto num assunto só. É seleção editorial — NÃO é "as mais buscadas"
   (não há medição disso; dizer que é seria dado inventado, A4). Os ids têm de
   existir em faqCentral.js — id desconhecido some da lista (useCentralDuvidas). */
export const COMECE = {
  id: 'inicio',
  rotulo: 'Comece por aqui',
  perguntas: [
    'preciso-comprar-ingresso',
    'quando-acontece-a-proxima-edicao',
    'qual-e-o-valor-do-combo',
    'como-encontro-participantes-e-horarios',
    'opcoes-sem-lactose-gluten-veganas',
    'problema-com-meu-pedido',
    'como-demonstrar-interesse-em-participar',
    'como-patrocinar-ou-apoiar',
  ],
}

/* "Todas" e o resultado da busca podem passar de 90 itens: entram de 10 em 10.
   Um assunto escolhido (7 a 13 perguntas) aparece inteiro. */
export const LISTA = { inicial: 10, passo: 10 }

export const MENSAGEM = {
  rotulo: 'Falar com a equipe',
  titulo: ['Escreva para a ', 'organização', '.'],
  lead: 'A equipe responde em dias úteis. Antes de escrever, veja se o seu assunto tem um caminho mais rápido.',
  caminhosRotulo: 'Antes de escrever',
  diretoTexto: 'Prefere mensagem direta?',
}

/* Triagem: cada assunto na porta certa. A cor do disco é a do DESTINO (§6.2):
   Participar = cyan, Apoiar = marrom. Suporte fica nesta página, então leva uma
   terceira cor do ciclo — nunca a mesma de um irmão (§6.3). */
export const CAMINHOS = [
  {
    chave: 'estabelecimento',
    icone: 'mecanica/loja',
    cor: 'var(--scw-cyan)',
    tinta: 'var(--scw-choco)',
    titulo: 'Quero levar minha marca para a rota.',
    texto: 'Doçarias, cafeterias, confeitarias e restaurantes fazem o pré-cadastro na página Participar. A participação passa por curadoria.',
    link: 'Ir para Participar',
    rota: '/participar',
  },
  {
    chave: 'empresa',
    icone: 'topicos/proposta',
    cor: 'var(--scw-marrom)',
    tinta: 'var(--scw-creme)',
    titulo: 'Quero apoiar ou patrocinar o festival.',
    texto: 'Patrocínio, ativação de marca, mídia e brindes: a proposta entra pela página Apoiar.',
    link: 'Ir para Apoiar',
    rota: '/apoiar',
  },
  {
    chave: 'pedido',
    icone: 'mecanica/entrega',
    cor: 'var(--scw-amarelo)',
    tinta: 'var(--scw-choco)',
    titulo: 'Tive um problema com um pedido.',
    texto: 'Pagamento, entrega, troca e produto são tratados pelo estabelecimento que fez a venda. Fale primeiro com ele.',
    link: 'Ver dúvidas de suporte',
    assunto: 'suporte',
  },
]

export const FORMULARIO = {
  titulo: 'Imprensa, correções, sugestões e demais assuntos',
  campos: {
    name: { rotulo: 'Seu nome', exemplo: 'Como te chamamos', autoComplete: 'name' },
    email: { rotulo: 'E-mail', exemplo: 'voce@email.com', autoComplete: 'email' },
    subject: { rotulo: 'Assunto', vazio: 'Selecione o assunto' },
    message: { rotulo: 'Mensagem', exemplo: 'Escreva sua dúvida ou mensagem.' },
  },
  obrigatorio: 'Todos os campos são obrigatórios.',
  nota: 'Seus dados são usados apenas para responder esta mensagem.',
  enviar: 'Enviar mensagem',
  enviando: 'Enviando…',
  enviandoAviso: 'Enviando sua mensagem…',
  erro: 'Não foi possível enviar agora. Sua mensagem continua aqui: tente de novo em alguns minutos ou fale com a gente no',
  okTitulo: 'Mensagem enviada.',
  okTexto: 'A organização do Sweet & Coffee Week recebeu sua mensagem e responde pelo e-mail informado, em dias úteis.',
  okDeNovo: 'Enviar outra mensagem',
}
