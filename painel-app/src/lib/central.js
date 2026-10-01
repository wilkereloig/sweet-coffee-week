/*
 * Lógica pura da central de avisos, das mensagens e do histórico — sem DOM,
 * testada em tests/painel-app-central.test.mjs.
 *
 * O banco grava em cada notificação um `link` curto ("pedidos/<id>",
 * "marcas/<id>/mensagens"…) e NUNCA uma URL: quem decide para onde ir é o
 * painel. `interpretarLink` traduz esse caminho para a vista e o item.
 */

import { rotulos, rotulo } from './status.js'

// Segmento do link → chave da vista no painel (DESTINOS dos dois shells).
const VISTA_DO_SEGMENTO = { marcas: 'participantes' }

/**
 * @param {string} link  ex.: "marcas/<uuid>/mensagens", "respostas/contato/<uuid>",
 *                       "producao/pedido/<uuid>", "pedidos/<uuid>", "mensagens"
 * @returns {{vista: string, id?: string, sub?: string, origem?: string} | null}
 */
export function interpretarLink(link) {
  if (!link || typeof link !== 'string') return null
  const partes = link.split('/').filter(Boolean)
  if (!partes.length) return null
  const [seg, a, b] = partes
  const vista = (Object.hasOwn(VISTA_DO_SEGMENTO, seg) && VISTA_DO_SEGMENTO[seg]) || seg
  if (seg === 'respostas') return { vista, origem: a, id: b }
  if (seg === 'producao') return { vista, sub: a, id: b }
  if (seg === 'marcas') return { vista, id: a, sub: b }
  if (seg === 'cadastro') return b ? { vista, sub: a, campo: b } : { vista, sub: a }
  return a ? { vista, id: a } : { vista }
}

/** `?ir=` da URL (vindo do clique numa notificação push), ou null. */
export function lerIrDaUrl(search) {
  try {
    const v = new URLSearchParams(search || '').get('ir')
    return v && /^[a-z_]+(\/[A-Za-z0-9_-]+){0,2}$/.test(v) ? v : null
  } catch {
    return null
  }
}

const MIN = 60e3
const HORA = 60 * MIN
const DIA = 24 * HORA

/** "agora", "há 5 min", "há 3 h", "ontem 14:10", "28/09 14:10". */
export function tempoRelativo(iso, agora = Date.now()) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const d = agora - t
  const hora = new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d < MIN) return 'agora'
  if (d < HORA) return 'há ' + Math.floor(d / MIN) + ' min'
  const hoje0 = new Date(agora); hoje0.setHours(0, 0, 0, 0)
  if (t >= hoje0.getTime()) return 'há ' + Math.floor(d / HORA) + ' h'
  if (t >= hoje0.getTime() - DIA) return 'ontem ' + hora
  return new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hora
}

/** "28/09/2026 às 15:42" — para o "registrado por" do histórico. */
export function dataHoraExtensa(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Fonte única em ./status.js; a central lê de candidatura, cadastro e pedido.
const ROTULO_STATUS = { ...rotulos('candidatura', 'cadastro', 'pedido', 'sessao'), lido: 'Lido', respondida: 'Respondida' }
export function rotuloStatus(s) { return ROTULO_STATUS[s] || (s ? String(s).replace(/_/g, ' ') : '—') }

// Filtro do histórico: grupos de ação que fazem sentido para quem administra.
export const GRUPOS_ACAO = [
  { valor: '', rotulo: 'Todas as ações' },
  { valor: 'mensagem', rotulo: 'Mensagens' },
  { valor: 'observacao', rotulo: 'Observações internas' },
  { valor: 'candidatura', rotulo: 'Candidaturas (status e nota)' },
  { valor: 'cadastro', rotulo: 'Cadastro da marca' },
  { valor: 'pedido', rotulo: 'Pedidos (editados e respondidos)' },
  { valor: 'criar_solicitacao', rotulo: 'Pedidos criados' },
  { valor: 'publicar_solicitacao', rotulo: 'Pedidos publicados' },
  { valor: 'publicar_arquivo', rotulo: 'Arquivos publicados' },
  { valor: 'vaga', rotulo: 'Vagas de foto reservadas' },
  { valor: 'agendar_sessao_fotos', rotulo: 'Sessões de fotos agendadas' },
  { valor: 'atualizar_sessao_fotos', rotulo: 'Sessões de fotos alteradas' },
  { valor: 'criar_acesso_marca', rotulo: 'Acessos de marca criados' },
  { valor: 'regerar_senha_conta', rotulo: 'Senhas geradas de novo' },
  { valor: 'conta', rotulo: 'Contas da equipe (nome)' },
  { valor: 'criar_conta_organizacao', rotulo: 'Contas da equipe criadas' },
  { valor: 'definir_funcao', rotulo: 'Funções alteradas' },
  { valor: 'suspender_conta', rotulo: 'Contas suspensas' },
  { valor: 'registro', rotulo: 'Registros apagados' },
]

/**
 * Frase do histórico para uma linha de `get_atividade`. Sem o nome do autor
 * (a tela mostra "por Fulano" à parte) e sem a marca quando o histórico já é
 * de uma marca só (`comMarca = false`).
 */
export function descreverAtividade(a, { comMarca = true } = {}) {
  const d = a.detalhe || {}
  const marca = comMarca && a.marca ? ' · ' + a.marca : ''
  const de = rotuloStatus(d.de)
  const para = rotuloStatus(d.para)
  switch (a.acao) {
    case 'mensagem.enviada':
      return (d.de === 'marca' ? 'Mensagem da marca' : 'Mensagem enviada à marca') + marca + (d.trecho ? ': "' + d.trecho + '"' : '')
    case 'observacao':
      return 'Observação interna' + marca + ': ' + (d.texto || '')
    case 'candidatura.status':
      return 'Status de ' + (d.quem || 'uma resposta') + ' mudou de "' + de + '" para "' + para + '"'
    case 'candidatura.nota':
      return 'Nota interna de ' + (d.quem || 'uma resposta') + ' atualizada' + (d.texto ? ': "' + d.texto + '"' : '')
    case 'cadastro.status':
      return 'Cadastro' + marca + ' passou de "' + de + '" para "' + para + '"'
    case 'pedido.estado':
      return 'Pedido "' + (d.titulo || '') + '"' + marca + ': ' + de.toLowerCase() + ' → ' + para.toLowerCase() +
        (d.resposta ? ' · resposta: "' + d.resposta + '"' : '')
    case 'pedido.editado':
      return 'Pedido "' + (d.titulo || '') + '" editado' + (d.arquivada ? ' (arquivado)' : '') + marca
    case 'criar_solicitacao':
      return 'Pedido criado como rascunho' + marca
    case 'publicar_solicitacao':
      return 'Pedido publicado para ' + Number(d.alcancadas || 0) + (Number(d.alcancadas) === 1 ? ' marca' : ' marcas') + marca
    case 'publicar_arquivo':
      return 'Arquivo "' + (d.nome || '') + '" publicado' + (d.escopo === 'geral' ? ' para todas' : marca)
    case 'vaga.reservada':
      return 'Vaga de fotos reservada' + marca
    case 'abrir_vaga_fotos':
      return 'Vaga de fotos aberta'
    case 'fechar_vaga_fotos':
      return 'Vaga de fotos fechada'
    case 'agendar_sessao_fotos':
      return 'Sessão de fotos agendada' + marca
    case 'atualizar_sessao_fotos':
      return 'Sessão de fotos alterada' + (d.status ? ' (' + rotuloStatus(d.status).toLowerCase() + ')' : '') + marca
    case 'criar_acesso_marca':
      return 'Acesso da marca criado' + marca
    case 'regerar_senha_conta':
      return (a.alvo_tabela === 'participantes' ? 'Senha temporária nova gerada' + marca : 'Senha gerada de novo para uma conta da equipe')
    // Acesso da marca (29/09/2026). Nunca a senha: só a ação.
    case 'acesso.copiado':
      return 'Credenciais copiadas' + marca
    case 'acesso.whatsapp_aberto':
      return 'WhatsApp aberto com as credenciais' + marca
    case 'acesso.enviado_manual':
      return 'Credenciais marcadas como enviadas' + marca
    case 'acesso.bloquear':
      return 'Acesso bloqueado' + marca + (d.motivo ? ': ' + d.motivo : '')
    case 'acesso.desbloquear':
      return 'Acesso desbloqueado' + marca
    case 'acesso.desativar':
      return 'Conta desativada' + marca
    case 'acesso.reativar':
      return 'Conta reativada' + marca
    case 'acesso.encerrar_sessoes':
      return 'Sessões encerradas' + marca
    case 'acesso.forcar_troca':
      return 'Troca de senha exigida no próximo acesso' + marca
    case 'acesso.login_alterado':
      return 'Login alterado de "' + (d.de || '') + '" para "' + (d.para || '') + '"' + marca
    case 'senha.trocada':
      return 'Senha definida pela marca' + marca
    case 'correcao.pedida':
      return 'Alteração solicitada' + marca + (d.motivo ? ': "' + d.motivo + '"' : '')
    case 'correcao.resolvida':
      return 'Pedido de alteração resolvido' + marca
    case 'criar_conta_organizacao':
      return 'Conta da equipe criada: ' + (d.nome || d.email || '')
    case 'definir_funcao':
      return 'Função de uma conta alterada para "' + (d.funcao || '') + '"'
    case 'suspender_conta':
      return 'Conta da equipe suspensa'
    case 'reativar_conta':
      return 'Conta da equipe reativada'
    case 'conta.nome':
      return 'Nome de uma conta da equipe: "' + (d.de || '—') + '" → "' + (d.para || '—') + '"'
    case 'senha_unica':
      return 'Acesso compartilhado ' + (d.ativa ? 'ligado' : 'desligado')
    case 'cadastro.editado': {
      // Etapa 3: o administrador editou um bloco do cadastro.
      const BLOCO = { marca: 'dados da marca', participacao: 'dados da participação', item: 'item do combo', unidade: 'unidade' }
      const campos = d.campos ? Object.keys(d.campos).join(', ').replace(/_/g, ' ') : ''
      const nome = d.bloco === 'item' && d.nome_para ? ' "' + d.nome_para + '"' : d.bloco === 'unidade' && d.endereco ? ' ' + d.endereco : ''
      return 'Cadastro editado pela organização' + marca + ' · ' + (BLOCO[d.bloco] || 'cadastro') + nome + (campos ? ' (' + campos + ')' : '')
    }
    case 'cadastro.unidade_removida':
      return 'Unidade removida' + marca + (d.endereco ? ': ' + d.endereco : '')
    case 'participante.arquivado':
      return 'Marca arquivada' + marca
    case 'participante.restaurado':
      return 'Marca restaurada' + marca
    case 'vouchers.gerados':
      return Number(d.quantidade || 0) + ' vouchers gerados para a edição ' + (d.edicao || '')
    case 'vouchers.destinados':
      return Number(d.quantidade || 0) + (Number(d.quantidade) === 1 ? ' voucher destinado' : ' vouchers destinados') + ' a ' + (d.contato || 'um contato') + marca
    case 'voucher.enviado': case 'voucher.cancelado': case 'voucher.disponivel': case 'voucher.destinado': case 'voucher.utilizado':
      return 'Voucher ' + (d.codigo || '') + ' · ' + rotulo('voucher', a.acao.split('.')[1]).toLowerCase() + (d.contato ? ' (' + d.contato + ')' : '') + marca
    case 'contato.salvo':
      return 'Contato ' + (d.nome || '') + ' salvo'
    case 'arquivo.editado': case 'arquivo.substituido': case 'arquivo.arquivado': case 'arquivo.restaurado':
      return 'Arquivo "' + (d.nome || '') + '" ' + { editado: 'editado', substituido: 'substituído' + (d.versao_para ? ' (versão ' + d.versao_para + ')' : ''), arquivado: 'arquivado', restaurado: 'restaurado' }[a.acao.split('.')[1]] + marca
    case 'registro.apagado':
      return 'Registro apagado' + (d.origem ? ' (' + d.origem + ')' : '')
    default:
      if (String(a.acao).startsWith('presskit.')) return 'Press Kit · ' + rotulo('presskit', a.acao.slice(9)).toLowerCase() + marca
      return String(a.acao || 'Ação').replace(/[._]/g, ' ') + marca
  }
}

/** Mensagens: agrupa por dia para os separadores da conversa. */
export function agruparPorDia(mensagens, agora = Date.now()) {
  const grupos = []
  const hoje = new Date(agora); hoje.setHours(0, 0, 0, 0)
  for (const m of mensagens || []) {
    const d = new Date(m.criada_em); d.setHours(0, 0, 0, 0)
    const rotulo = d.getTime() === hoje.getTime() ? 'Hoje'
      : d.getTime() === hoje.getTime() - DIA ? 'Ontem'
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.rotulo === rotulo) ultimo.itens.push(m)
    else grupos.push({ rotulo, itens: [m] })
  }
  return grupos
}

/** Contagem de não lidas para o selo do sino. */
export function contarNaoLidas(lista) {
  return (lista || []).filter((n) => !n.lida && !n.lida_em).length
}
