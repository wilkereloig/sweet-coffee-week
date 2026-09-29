/*
 * Dicionário único de status do painel (reestruturação 29/09/2026) — lógica
 * pura, testada em tests/painel-app-status.test.mjs.
 *
 * Antes eram 11 mapas de rótulo em 6 arquivos, com o mesmo estado escrito de
 * jeitos diferentes. Agora cada valor que o banco aceita (CHECK) tem UM rótulo
 * e UM tom aqui; os `ROTULO_*` antigos derivam deste arquivo via `rotulos()`.
 *
 * ⚠️ Status novo num CHECK do banco ganha entrada aqui NO MESMO COMMIT — o
 * teste compara com a lista dos CHECKs.
 *
 * Tons (a cor do selo em painel.css, `.og-selo[data-tom]`):
 *   neutro    — nada começou / sem informação (contorno)
 *   andamento — em curso, ninguém travado (cyan)
 *   atencao   — alguém precisa agir, ou deu problema (laranja)
 *   ok        — resolvido, aprovado, concluído (chocolate)
 *   encerrado — fora do fluxo: arquivado, cancelado, substituído (bege)
 */

export const TONS = ['neutro', 'andamento', 'atencao', 'ok', 'encerrado']

const s = (rotulo, tom) => ({ rotulo, tom })

export const STATUS = {
  // quero_participar · support_interests · contact_requests · participation_interests
  candidatura: {
    novo: s('Novo', 'atencao'),
    em_analise: s('Em análise', 'andamento'),
    contatado: s('Contatado', 'andamento'),
    em_negociacao: s('Em negociação', 'andamento'),
    aprovado: s('Aprovado', 'ok'),
    nao_selecionado: s('Não selecionado', 'encerrado'),
    aguardando_cadastro: s('Aguardando cadastro', 'andamento'),
    cadastro_completo: s('Cadastro completo', 'ok'),
    respondido: s('Respondido', 'ok'),
    fechado: s('Fechado', 'ok'),
    encerrado: s('Encerrado', 'encerrado'),
    arquivado: s('Arquivado', 'encerrado'),
  },
  // participacoes.status_cadastro (+ 'sem_participacao', que get_participantes deriva)
  cadastro: {
    sem_participacao: s('Sem participação', 'neutro'),
    aguardando_cadastro: s('Aguardando cadastro', 'neutro'),
    em_preenchimento: s('Em preenchimento', 'andamento'),
    cadastro_completo: s('Cadastro completo', 'ok'),
    encerrado: s('Encerrado', 'encerrado'),
  },
  combo: {
    rascunho: s('Combo em preenchimento', 'neutro'),
    em_analise: s('Combo em análise', 'andamento'),
    correcao_solicitada: s('Ajuste pedido no combo', 'atencao'),
    aprovado: s('Combo aprovado', 'ok'),
  },
  tema: {
    proposto: s('Tema em análise', 'andamento'),
    aprovado: s('Tema aprovado', 'ok'),
    recusado: s('Outro tema pedido', 'atencao'),
    substituido: s('Tema substituído', 'encerrado'),
  },
  pagamento: {
    nao_informado: s('Pagamento não informado', 'neutro'),
    pendente: s('Pagamento pendente', 'atencao'),
    parcial: s('Pagamento parcial', 'andamento'),
    quitado: s('Taxa quitada', 'ok'),
    isento: s('Isento', 'ok'),
  },
  foto: {
    pendente: s('Liberação pendente', 'neutro'),
    liberado: s('Liberado para foto', 'ok'),
    nao_liberado: s('Não liberado para foto', 'atencao'),
  },
  sessao: {
    aberto: s('Vaga aberta', 'neutro'),
    agendada: s('Agendada', 'andamento'),
    remarcada: s('Remarcada', 'andamento'),
    realizada: s('Realizada', 'ok'),
    cancelada: s('Cancelada', 'encerrado'),
  },
  // solicitacao_estado.estado
  pedido: {
    pendente: s('Pendente', 'atencao'),
    respondido: s('Respondido', 'ok'),
  },
  historico: {
    nao_avaliado: s('Trajetória não avaliada', 'neutro'),
    recorrente_confirmado: s('Participante recorrente', 'ok'),
    novo_confirmado: s('Primeira edição (confirmado)', 'ok'),
    possivel_correspondencia: s('Possível participação anterior', 'atencao'),
    sem_correspondencia_no_acervo: s('Sem registro no acervo', 'neutro'),
    revisar: s('Trajetória em revisão', 'atencao'),
  },
  vinculo: {
    possivel: s('Possível', 'atencao'),
    confirmado: s('Confirmado', 'ok'),
    rejeitado: s('Não é a mesma marca', 'encerrado'),
  },
  material: {
    mesas: s('Mesas', 'neutro'), adesivo_prisma: s('Adesivo de prisma', 'neutro'),
    prisma_mesa: s('Prisma de mesa', 'neutro'), placa_externa: s('Placa externa', 'neutro'),
    display_balcao: s('Display de balcão', 'neutro'), voucher: s('Vouchers', 'neutro'),
    outro: s('Outro', 'neutro'),
  },
  material_status: {
    previsto: s('Previsto', 'neutro'),
    separado: s('Separado', 'andamento'),
    entregue: s('Entregue', 'ok'),
    cancelado: s('Cancelado', 'encerrado'),
  },
  // presskit_envios.status — rótulos da reestruturação (pedido do Wilker):
  // "constou na lista" é a sugestão; "endereço confirmado" é a preparação.
  presskit: {
    constou_na_lista: s('Sugerido', 'neutro'),
    selecionado: s('Selecionado', 'andamento'),
    confirmado: s('Preparando', 'andamento'),
    enviado: s('Enviado', 'andamento'),
    entregue: s('Entregue', 'ok'),
    nao_entregue: s('Não entregue', 'atencao'),
    cancelado: s('Cancelado', 'encerrado'),
  },
  tipo_contato: {
    influenciador: s('Influenciador', 'neutro'), imprensa: s('Imprensa', 'neutro'),
    parceiro: s('Parceiro', 'neutro'), convidado: s('Convidado', 'neutro'),
    outro: s('Outro', 'neutro'),
  },
  // vouchers.status (etapa 6)
  voucher: {
    disponivel: s('Disponível', 'neutro'),
    destinado: s('Destinado', 'andamento'),
    enviado: s('Enviado', 'andamento'),
    utilizado: s('Utilizado', 'ok'),
    cancelado: s('Cancelado', 'encerrado'),
  },
  pendencia: {
    dado_inconsistente: s('Dado inconsistente', 'atencao'),
    possivel_correspondencia: s('Possível correspondência', 'atencao'),
    possivel_duplicidade: s('Possível duplicidade', 'atencao'),
    conflito_tema: s('Conflito de tema', 'atencao'),
    dado_ausente: s('Dado ausente', 'atencao'),
    outro: s('Outro', 'atencao'),
  },
  revisao: {
    aberta: s('Aberta', 'atencao'),
    resolvida: s('Resolvida', 'ok'),
    descartada: s('Descartada', 'encerrado'),
  },
  importacao_lote: {
    staging: s('Em preparação', 'neutro'),
    validado: s('Validado', 'andamento'),
    promovido: s('Promovido', 'ok'),
    revertido: s('Revertido', 'encerrado'),
    cancelado: s('Cancelado', 'encerrado'),
  },
  // Acesso da marca ao painel (status_acesso_marca no banco, 29/09/2026).
  acesso: {
    nao_criado: s('Sem acesso', 'neutro'),
    aguardando_envio: s('Aguardando envio', 'atencao'),
    aguardando_primeiro_acesso: s('Aguardando primeiro acesso', 'andamento'),
    ativo: s('Ativo', 'ok'),
    bloqueado: s('Bloqueado', 'atencao'),
    desativado: s('Desativado', 'encerrado'),
  },
  // acesso_envios.canal (+ nao_enviado). Abrir o WhatsApp NÃO é "enviado".
  envio: {
    nao_enviado: s('Não enviado', 'neutro'),
    copiado: s('Copiado', 'andamento'),
    whatsapp_aberto: s('WhatsApp aberto', 'andamento'),
    enviado_manual: s('Enviado', 'ok'),
  },
  correcao: {
    aberta: s('Alteração solicitada', 'atencao'),
    corrigida: s('Corrigida, em análise', 'andamento'),
    resolvida: s('Resolvida', 'ok'),
  },
  // Logo do estabelecimento (logo_info no banco, 29/09/2026) — derivado, não CHECK.
  logo: {
    confirmada: s('Logo confirmada', 'ok'),
    anterior: s('Logo de edição anterior', 'andamento'),
    acervo: s('Logo do acervo disponível', 'andamento'),
    nao_enviada: s('Logo pendente', 'atencao'),
  },
  prioridade: {
    normal: s('Normal', 'neutro'),
    importante: s('Importante', 'atencao'),
  },
  importacao_linha: {
    pendente: s('Pendente', 'atencao'),
    importado: s('Importado', 'ok'),
    ignorado: s('Ignorado', 'encerrado'),
    rejeitado: s('Rejeitado', 'atencao'),
  },
}

/** Rótulo de um valor; sem entrada, o valor sem sublinhado (nunca some). */
export function rotulo(dominio, valor) {
  const e = STATUS[dominio] && STATUS[dominio][valor]
  if (e) return e.rotulo
  return valor ? String(valor).replace(/_/g, ' ') : '—'
}

/** Tom do selo; valor desconhecido é neutro. */
export function tom(dominio, valor) {
  const e = STATUS[dominio] && STATUS[dominio][valor]
  return e ? e.tom : 'neutro'
}

/** Mapa valor → rótulo de um domínio (para quem ainda lê `ROTULO_X[v]`). */
export function rotulos(...dominios) {
  const m = {}
  for (const d of dominios) for (const [v, e] of Object.entries(STATUS[d] || {})) if (!(v in m)) m[v] = e.rotulo
  return m
}
