/*
 * Ajuda rápida — o conteúdo, por papel. Só telas e passos que existem: cada
 * `link` passa pelo mesmo interpretador dos avisos (rotaDoLink na
 * organização, interpretarLinkMarca na marca), e tests/painel-app-ajuda
 * reprova link que não abre tela nenhuma.
 */
export const AJUDA = {
  marca: [
    { titulo: 'Início', link: 'inicio', acao: 'Abrir o Início',
      texto: 'Quanto do cadastro está pronto, a próxima ação e as pendências. Comece sempre por aqui.' },
    { titulo: 'Falar com a organização', link: 'mensagens', acao: 'Abrir a conversa',
      texto: 'Botão no topo de qualquer tela. Mensagem nova aparece com um número e vira a primeira ação do Início.' },
    { titulo: 'Meu cadastro', link: 'cadastro', acao: 'Abrir Meu cadastro',
      texto: 'Dados do estabelecimento, logo e onde encontrar a marca. O que você digita é salvo sozinho.' },
    { titulo: 'Meu combo', link: 'combo', acao: 'Abrir Meu combo',
      texto: 'Tema, os três itens (com restrições e substituição) e o preço. Com tudo preenchido, envie para análise.' },
    { titulo: 'Pedido de correção', link: 'combo', acao: 'Ver o combo',
      texto: 'Quando a organização pede um ajuste, o campo aparece marcado com o motivo. Corrija e envie de novo.' },
    { titulo: 'Fotos', link: 'fotos', acao: 'Abrir Fotos',
      texto: 'Depois da liberação para foto, escolha um horário da agenda. As fotos oficiais e o guia de fotos ficam aqui.' },
    { titulo: 'Arquivos', link: 'arquivos', acao: 'Abrir Arquivos',
      texto: 'Materiais da organização. Alguns pedem que você confirme a leitura.' },
    { titulo: 'Avisos', link: null,
      texto: 'O sino no topo junta tudo o que a organização fez: mensagem, pedido, arquivo, fotos. Tocar no aviso abre a tela certa.' },
    { titulo: 'Sua conta', link: null,
      texto: 'No botão de conta: avisos neste aparelho, trocar a senha e sair.' },
  ],
  organizacao: [
    { titulo: 'Visão geral', link: 'visao', acao: 'Abrir a Visão geral',
      texto: 'Candidaturas por etapa, o que precisa de atenção e a atividade recente da equipe.' },
    { titulo: 'Marcas', link: 'participantes/lista', acao: 'Abrir Marcas',
      texto: 'As marcas da edição. A ficha de cada uma tem cadastro, combo, unidades, operação, mensagens, acesso e histórico.' },
    { titulo: 'Mensagens com uma marca', link: 'participantes/lista', acao: 'Escolher a marca',
      texto: 'Abra a ficha da marca e vá em Mensagens. A marca recebe aviso a cada mensagem.' },
    { titulo: 'Candidaturas', link: 'participantes/candidaturas', acao: 'Abrir Candidaturas',
      texto: 'Quem preencheu o pré-cadastro do site, com status para triar.' },
    { titulo: 'Pedidos', link: 'operacao/pedidos', acao: 'Abrir Pedidos',
      texto: 'O que a organização pediu às marcas, com prazo e quem ainda falta responder.' },
    { titulo: 'Fotos', link: 'operacao/fotos', acao: 'Abrir Fotos',
      texto: 'Abra vagas na agenda ou marque a sessão direto. A marca só reserva depois de liberada para foto, na ficha › Operação.' },
    { titulo: 'Arquivos', link: 'arquivos/gerais', acao: 'Abrir Arquivos',
      texto: 'Publique para todas as marcas ou para uma só, e escolha se pede confirmação de leitura.' },
    { titulo: 'Contatos', link: 'contatos/pessoas', acao: 'Abrir Contatos',
      texto: 'Pessoas, Press Kit, vouchers e o que chegou pelos formulários do site.' },
    { titulo: 'Edição', link: 'edicao/configuracao', acao: 'Abrir a Edição',
      texto: 'A edição atual, datas, taxa e regras. As telas da marca leem dali.' },
    { titulo: 'Administração', link: 'admin/revisao', acao: 'Abrir a Administração',
      texto: 'Revisão de dados, importações e, conforme a sua função, equipe e histórico.' },
    { titulo: 'Avisos', link: null,
      texto: 'O sino no topo junta mensagens, respostas e candidaturas novas. Tocar no aviso abre a tela certa.' },
  ],
}
