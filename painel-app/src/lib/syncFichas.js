/*
 * Sincronização das vistas da organização (19/10/2026) — lógica PURA, testada em
 * tests/painel-app-sync-fichas.test.mjs.
 *
 * Aqui moram as decisões que não dependem de React:
 *   · de quais DOMÍNIOS cada leitura depende (o vocabulário é o fechado de
 *     lib/sync/dominios.js; nenhum nome novo nasce aqui);
 *   · como uma releitura SILENCIOSA que falhou preserva o que já está na tela;
 *   · como a edição (registro editável) vira campos de formulário e volta;
 *   · o que enviar de uma triagem sem reenviar um valor velho.
 */

/*
 * Domínios que cada leitura lê. Cada lista é a UNIÃO dos domínios das RPCs que a
 * tela chama: errar para MAIS só custa uma releitura a mais; errar para MENOS
 * deixa a tela velha, então na dúvida entra.
 */
const FICHA_360 = ['participantes', 'cadastro', 'unidades', 'temas', 'correcoes', 'pedidos', 'fotos', 'arquivos', 'materiais', 'vendas']
const LISTA_MARCAS = ['participantes', 'cadastro', 'unidades', 'correcoes', 'pedidos', 'fotos', 'logos', 'acessos', 'mensagens']
export const DOMINIOS_VISTAS = Object.freeze({
  // Marcas: get_participantes (contadores de cadastro, correção, pedido), get_conversas, get_logos.
  listaMarcas: LISTA_MARCAS,
  // get_ficha_360 / get_ficha_participacao (a ficha lida pelas abas e pelo editor).
  ficha360: FICHA_360,
  fichaParticipacao: ['participantes', 'cadastro', 'unidades', 'temas', 'pedidos', 'fotos', 'arquivos'],
  // Visão do participante: ficha 360 + get_publicacao + get_correcoes + get_edicoes.
  fichaGeral: [...FICHA_360, 'publicacao', 'edicao'],
  correcoesCampo: ['correcoes', 'participantes'],
  // get_historia: vínculo com o acervo (decidir_vinculo anuncia participantes e correcoes).
  trajetoria: ['participantes', 'correcoes'],
  mensagens: ['mensagens'],
  atividade: ['atividade'],
  // get_acessos_marcas + o histórico do acesso (get_atividade).
  acessoMarca: ['acessos', 'participantes', 'atividade'],
  // org_preenchimento(s): link, envio pendente e o cadastro atual que ele é comparado.
  preenchimentoMarca: ['preenchimento', 'participantes', 'cadastro', 'unidades', 'temas'],
  listaPreenchimento: ['preenchimento', 'participantes', 'acessos'],
  contatos: ['contatos', 'vouchers'],
  // Ficha do contato: get_contato + get_vouchers (marcas e cotas) + get_edicoes (Press Kit da edição).
  fichaContato: ['contatos', 'vouchers', 'participantes', 'edicao'],
  vouchers: ['vouchers', 'contatos', 'participantes', 'logos', 'edicao'],
  respostas: ['respostas'],
  edicoes: ['edicao', 'configuracao'],
  edicaoAtual: ['edicao'],
  temas: ['temas', 'participantes'],
  vendas: ['vendas', 'edicao', 'participantes'],
  revisao: ['correcoes', 'participantes'],
  // Não existe domínio de "importação": o lote entra por script, sem sinal. Fica ligado ao que ele promove
  // (participantes) e à reconciliação; a lacuna está dita no relatório da sincronização.
  importacoes: ['participantes'],
  equipe: ['perfis', 'configuracao'],
  historicoEquipe: ['atividade', 'perfis'],
  // Mesa: candidaturas, marcas, pedidos, sessões de foto, conversas, atividade, revisão, temas e edição.
  mesa: [...new Set([...LISTA_MARCAS, 'respostas', 'atividade', 'edicao', 'temas'])],
})

// ── Releitura silenciosa que falhou ─────────────────────────────────────────

/**
 * Estado de UMA fonte da ficha depois de uma leitura. Releitura silenciosa
 * (`manter`) que falhou por erro de rede mantém o que já estava na tela: dado
 * antigo ainda é melhor que um bloco de erro no lugar do cadastro. Perda de
 * permissão NÃO é mantida (o dado some, como deve), e a primeira leitura nunca
 * é mantida (não há o que manter).
 */
export function mesclarFonte(anterior, novo, { manter = false } = {}) {
  if (manter && anterior && anterior.estado === 'ok' && novo && novo.estado === 'erro') return anterior
  return novo
}

/**
 * Resultado de Promise.allSettled → valor novo, ou o anterior quando a leitura falhou.
 * `{ valor, falhou }`: quem chama decide o que dizer ("faltou ler X"). Nunca troca
 * o que está na tela por vazio só porque uma perna caiu.
 */
export function valorOuAnterior(resultado, anterior, transformar = (v) => v) {
  if (resultado && resultado.status === 'fulfilled') return { valor: transformar(resultado.value), falhou: false }
  return { valor: anterior, falhou: true }
}

// ── Edição da edição (Configuração) ─────────────────────────────────────────
export const CAMPOS_EDICAO = Object.freeze(['nome', 'tema', 'festival_inicio', 'festival_fim', 'taxa_inscricao', 'valor_combo', 'foto_exige_pagamento', 'lembrete_vendas_hora'])
const CAMPOS_NUMERO = ['taxa_inscricao', 'valor_combo']

/** Número em texto canônico: '' = vazio; "35.50" e 35.5 viram '35.5' (o servidor devolve número). */
export function numeroEmTexto(v) {
  if (v == null || v === '') return ''
  const n = Number(v)
  return Number.isFinite(n) ? String(n) : String(v)
}

/** A edição do servidor → os campos do formulário (texto onde o input é texto). */
export function registroDaEdicao(e) {
  const x = e || {}
  return {
    nome: x.nome || '', tema: x.tema || '',
    festival_inicio: x.festival_inicio || '', festival_fim: x.festival_fim || '',
    taxa_inscricao: numeroEmTexto(x.taxa_inscricao), valor_combo: numeroEmTexto(x.valor_combo),
    foto_exige_pagamento: !!x.foto_exige_pagamento,
    lembrete_vendas_hora: String(x.lembrete_vendas_hora || '').slice(0, 5),
  }
}

/** Campos do formulário → o que `salvar_edicao` recebe (a edição inteira, como sempre). */
export function dadosParaSalvarEdicao(codigo, f) {
  return {
    codigo, nome: f.nome, tema: f.tema,
    festival_inicio: f.festival_inicio || null, festival_fim: f.festival_fim || null,
    taxa_inscricao: f.taxa_inscricao === '' ? null : Number(f.taxa_inscricao),
    valor_combo: f.valor_combo === '' ? null : Number(f.valor_combo),
    foto_exige_pagamento: !!f.foto_exige_pagamento,
    lembrete_vendas_hora: f.lembrete_vendas_hora || null,
  }
}

/**
 * Registro confirmado depois de salvar: o que foi enviado, na forma canônica que a
 * releitura vai devolver (senão "35.50" digitado viraria "atualizado por outra pessoa").
 */
export function registroSalvoDaEdicao(enviado) {
  const r = { ...enviado }
  for (const c of CAMPOS_NUMERO) r[c] = numeroEmTexto(enviado[c])
  return r
}

// ── Triagem de respostas ────────────────────────────────────────────────────
/**
 * Status a enviar: só se a PESSOA mudou o select. `registro` é o de
 * useRegistroEditavel ({ local, base }): base acompanha o servidor nos campos que
 * ela não tocou, então um status que mudou por fora nunca é reenviado velho.
 */
export function statusAEnviar(registro) {
  return registro.local.status !== registro.base.status ? registro.local.status : null
}

// ── Mensagens lidas ─────────────────────────────────────────────────────────
/**
 * Mensagens da marca ainda não lidas e que esta tela ainda não pediu para marcar.
 * `ler_mensagens_org` é uma GRAVAÇÃO disparada de dentro da leitura e anuncia
 * "mensagens" — o que reler a conversa. Sem este filtro, uma mensagem que o
 * servidor não marcasse como lida reiniciaria o ciclo para sempre.
 */
export function mensagensAMarcar(mensagens, jaPedidas) {
  const ja = jaPedidas || new Set()
  return (mensagens || []).filter((m) => m.de === 'marca' && !m.lida_em && !ja.has(m.id))
}
