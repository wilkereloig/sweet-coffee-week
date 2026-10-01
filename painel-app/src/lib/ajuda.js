/*
 * Tour guiado — as etapas, por papel, e a lógica pura que decide quais entram.
 * O desenho e o teclado moram em components/Tour.jsx; aqui não há DOM.
 *
 * Cada etapa:
 *   alvos  — valores de `data-tour`, em ordem de preferência. Vale o primeiro
 *            que estiver NA TELA (a rail some no celular, a barra de abas no
 *            computador). Sem `alvos` = balão centralizado, sem destaque.
 *   exige  — ação de `pode()` sem a qual a etapa nem aparece.
 *   tela   — módulo que precisa estar no menu (quando o alvo pode cair num
 *            botão genérico, como o "mais" do celular).
 *   texto  — string, ou função (pode) → string para mudar pela função.
 *   link   — tela que "Abrir esta tela" abre (mesmo interpretador dos avisos:
 *            rotaDoLink na organização, interpretarLinkMarca na marca;
 *            tests/painel-app-ajuda reprova link que não abre nada).
 *   aparelho — mostra instalar + avisos dentro do balão (só por clique).
 */
const bloqueado = (pode, acao, texto) => (pode(acao) ? '' : ' ' + texto)

export const TOUR = {
  organizacao: [
    { id: 'menu', alvos: ['menu'], titulo: 'O menu do painel',
      texto: 'Cada botão é um assunto: operação do dia, relacionamento, conteúdo e administração. Neste tour, cada um aparece no lugar onde fica.' },
    { id: 'visao', alvos: ['menu-visao'], link: 'visao', titulo: 'Visão geral',
      texto: 'Comece por aqui. Candidaturas por etapa, o que precisa de atenção hoje e o que a equipe fez por último. Tocar num número abre a lista já filtrada.' },
    { id: 'participantes', alvos: ['menu-participantes'], link: 'participantes/lista', titulo: 'Participantes',
      texto: (pode) => 'Marcas, candidaturas, temas e vendas. Na ficha de cada marca: cadastro, combo, unidades, operação, mensagens, acesso e histórico.'
        + bloqueado(pode, 'triagem.editar', 'Sua função vê as candidaturas, mas não muda a triagem.') },
    { id: 'acoes', alvos: ['menu-participantes'], link: 'participantes/lista', titulo: 'Ver, revisar, aprovar, corrigir, editar',
      texto: (pode) => 'Visualizar não muda nada. Revisar é triar a candidatura. Aprovar aceita o combo ou o tema. Solicitar correção devolve um campo à marca com o motivo, e ela corrige. Editar é a organização mudar o dado da marca, com antes e depois no histórico.'
        + (pode('curadoria.decidir') ? '' : ' Sua função não aprova nem pede correção.')
        + (pode('cadastro.editar') ? '' : ' Editar o cadastro é só do Administrador.') },
    { id: 'conversa', alvos: ['menu-participantes'], link: 'participantes/lista', exige: 'mensagem.enviar', titulo: 'Conversa com a marca',
      texto: 'Abra a ficha da marca e vá em Mensagens. A marca recebe aviso a cada mensagem, e a resposta dela chega no sino.' },
    { id: 'contatos', alvos: ['menu-contatos'], link: 'contatos/pessoas', titulo: 'Contatos',
      texto: (pode) => 'Pessoas, Press Kit, vouchers e o que chegou pelos formulários do site.'
        + bloqueado(pode, 'relacionamento.gerir', 'Sua função consulta, mas não altera contatos.') },
    { id: 'operacao', alvos: ['menu-operacao'], link: 'operacao/pedidos', titulo: 'Operação',
      texto: (pode) => 'Pedidos às marcas com prazo, a agenda de fotos e os materiais. A marca só reserva foto depois de liberada, na ficha › Operação.'
        + bloqueado(pode, 'producao.gerir', 'Sua função acompanha, mas não abre vaga nem marca sessão.') },
    { id: 'arquivos', tela: 'arquivos', alvos: ['menu-arquivos', 'menu-mais'], link: 'arquivos/gerais', titulo: 'Arquivos',
      texto: 'Publique para todas as marcas ou para uma só, e escolha se pede confirmação de leitura. No celular, fica em "mais".' },
    { id: 'edicao', tela: 'edicao', alvos: ['menu-edicao', 'menu-mais'], link: 'edicao/configuracao', titulo: 'Edição',
      texto: (pode) => 'A edição atual, datas, taxa e regras. As telas da marca leem daqui, então mudar uma data muda o que todas veem.'
        + bloqueado(pode, 'edicao.gerir', 'Sua função só consulta a configuração.') },
    { id: 'admin', tela: 'admin', alvos: ['menu-admin', 'menu-mais'], link: 'admin/revisao', titulo: 'Administração',
      texto: (pode) => 'Revisão de dados'
        + (pode('importacao.gerir') ? ', importações' : '')
        + (pode('acesso.gerir') ? ', equipe e histórico de quem fez o quê' : '')
        + '.' + (pode('acesso.gerir') ? '' : ' Equipe e histórico são do Administrador.') },
    { id: 'sino', alvos: ['sino'], titulo: 'Central de avisos',
      texto: 'Mensagens, respostas e candidaturas novas. O número é o que você ainda não leu. Tocar no aviso abre a tela certa.' },
    { id: 'atualizar', alvos: ['atualizar'], titulo: 'Atualizar os dados',
      texto: 'Busca de novo o que está na tela e os avisos. O painel também atualiza sozinho a cada minuto.' },
    { id: 'aparelho', alvos: ['ver-tour'], aparelho: true, titulo: 'Este aparelho e o tour',
      texto: 'Instale o painel e ligue os avisos aqui, se quiser. Nada é pedido sem você tocar. Este botão abre o tour de novo quando precisar.' },
  ],
  marca: [
    { id: 'inicio', alvos: ['menu-inicio'], link: 'inicio', titulo: 'Início',
      texto: 'Quanto do cadastro está pronto, a próxima ação e as pendências. O número no botão é o que falta. Comece sempre por aqui.' },
    { id: 'cadastro', alvos: ['menu-cadastro'], link: 'cadastro', titulo: 'Meu cadastro',
      texto: 'Dados do estabelecimento, contato e onde encontrar a marca. O que você digita é salvo sozinho.' },
    { id: 'logo', alvos: ['menu-cadastro'], link: 'cadastro', titulo: 'Sua logo',
      texto: 'Também em Meu cadastro. Envie ou troque a logo: ela vale na hora, a organização é avisada e as versões anteriores ficam guardadas.' },
    { id: 'combo', alvos: ['menu-combo'], link: 'combo', titulo: 'Meu combo',
      texto: 'O tema, os três itens (doce, salgado e bebida) e o preço. Em cada item, conte se existe substituição. Com tudo pronto, envie para análise.' },
    { id: 'correcao', alvos: ['menu-combo'], link: 'combo', titulo: 'Quando pedirem correção',
      texto: 'O campo aparece marcado com o motivo e vira pendência no Início. Corrija e envie de novo. A ✓ no botão indica que a parte está pronta.' },
    { id: 'fotos', alvos: ['menu-fotos'], link: 'fotos', titulo: 'Fotos e agenda',
      texto: 'Depois da liberação para foto, escolha um horário livre na agenda. O guia de como preparar o combo e as fotos oficiais ficam aqui.' },
    { id: 'arquivos', alvos: ['menu-arquivos'], link: 'arquivos', titulo: 'Arquivos',
      texto: 'Materiais da organização. Alguns pedem que você confirme a leitura.' },
    { id: 'conversa', alvos: ['conversa'], link: 'mensagens', titulo: 'Falar com a organização',
      texto: 'De qualquer tela. Mensagem nova aparece com um número e vira a primeira ação do Início.' },
    { id: 'sino', alvos: ['sino'], titulo: 'Central de avisos',
      texto: 'Tudo o que a organização fez: mensagem, pedido, arquivo, fotos. Tocar no aviso abre a tela certa.' },
    { id: 'conta', alvos: ['conta'], aparelho: true, titulo: 'Conta, avisos e app',
      texto: 'Na conta: trocar a senha, sair e os avisos deste aparelho. Instalar o painel e ligar os avisos só acontece quando você tocar.' },
    { id: 'fim', alvos: ['ver-tour'], titulo: 'Rever o tour',
      texto: 'Este botão abre o tour de novo quando precisar.' },
  ],
}

/**
 * As etapas que valem agora: some a que exige ação que a função não tem e a
 * cujo alvo não está na tela. `achar(alvos)` devolve o elemento ou null
 * (no DOM: o primeiro `[data-tour]` visível); `telas`, os módulos do menu.
 * Texto já resolvido.
 */
export function etapasDoTour(etapas, { pode = () => true, achar = () => true, telas = null } = {}) {
  return (etapas || [])
    .filter((e) => !e.exige || pode(e.exige))
    .filter((e) => !e.tela || !telas || telas.includes(e.tela))
    .filter((e) => !e.alvos || achar(e.alvos))
    .map((e) => ({ ...e, texto: typeof e.texto === 'function' ? e.texto(pode) : e.texto }))
}

// Visto por papel E por usuário, neste aparelho. localStorage pode faltar
// (aba privada, node) — aí o tour só não lembra; nunca quebra.
const chave = (papel, usuario) => 'scw_tour_' + papel + '_' + (usuario || 'anonimo')
export function tourVisto(papel, usuario) {
  try { return !!localStorage.getItem(chave(papel, usuario)) } catch { return false }
}
export function marcarTour(papel, usuario, como) {
  try { localStorage.setItem(chave(papel, usuario), como) } catch { /* segue sem lembrar */ }
}
