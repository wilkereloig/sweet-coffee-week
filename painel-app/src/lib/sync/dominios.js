/*
 * Domínios de dados do painel e quais chamadas os alteram (19/10/2026).
 *
 * Um DOMÍNIO é um grupo de dados que uma tela lê junto. É o vocabulário comum
 * entre três coisas que precisam concordar:
 *   · o sinal que o BANCO manda (supabase/migrations/20261022_sincronizacao_tempo_real.sql);
 *   · o aviso local depois de uma gravação confirmada (rpc.js / marcaApi.js);
 *   · a tela, que declara de quais domínios depende (useSincronizar).
 * Um nome que não esteja aqui é descartado — nem o servidor nem uma gravação
 * inventam domínio.
 *
 * Aqui só há NOMES. Nenhum dado, texto ou id de registro passa por este arquivo.
 */
export const DOMINIOS = Object.freeze([
  'participantes',  // marcas e participações: lista, ficha geral, situação, acesso à ficha
  'cadastro',       // itens do combo, declarações alimentares, mídias
  'unidades',       // unidades, atendimento e horários
  'temas',          // temas propostos e decisão
  'logos',          // logo da marca e acervo
  'correcoes',      // alterações pedidas à marca e pendências de revisão
  'pedidos',        // solicitações da organização e respostas
  'fotos',          // sessões de foto e vagas
  'arquivos',       // arquivos publicados e confirmação de leitura
  'materiais',      // materiais entregues
  'edicao',         // edição, cronograma, publicação da edição
  'publicacao',     // publicação da marca (versão pública)
  'mensagens',      // conversa organização × marca
  'avisos',         // central de avisos e contadores
  'vendas',         // vendas diárias
  'vouchers',       // vouchers
  'acessos',        // contas e envios de acesso das marcas
  'redes',          // posts, comentários, arquivos do post
  'biblioteca',     // pastas e biblioteca do social media
  'editorial',      // visão editorial (leitura do social media)
  'perfis',         // equipe: nome, foto, função, permissões
  'contatos',       // contatos e press kit
  'preenchimento',  // links de preenchimento e envios
  'respostas',      // formulários do site
  'atividade',      // histórico de alterações
  'configuracao',   // configurações da organização
])
const CONJUNTO = new Set(DOMINIOS)
export const ehDominio = (d) => CONJUNTO.has(d)

/** Só deixa passar nomes de domínio conhecidos, sem repetição. */
export function limparDominios(lista) {
  if (lista === '*') return [...DOMINIOS]
  return [...new Set((Array.isArray(lista) ? lista : [lista]).filter(ehDominio))]
}

// ── RPCs que NÃO alteram dado de painel ──────────────────────────────────────
// Leituras e efeitos que só valem para este aparelho (push). Nunca avisam.
// Também é a lista que o teste usa para exigir que NENHUMA RPC fique sem
// classificação: chamada nova que não esteja aqui nem em RPC_ESCRITA reprova.
export const RPC_LEITURA = new Set([
  'admin_ping', 'buscar_marcas_acervo', 'editorial_ficha', 'editorial_participantes',
  'equipe_diretorio', 'meu_perfil', 'minhas_permissoes',
  'marca_meus_vouchers', 'marca_minha_historia', 'marca_minha_logo',
  'marca_minha_publicacao', 'marca_previa_publica',
  // org_preenchimento(s) leem (e, na primeira vez, criam o link: o banco avisa por
  // gatilho). Se avisassem daqui, a tela que as chama recarregaria para sempre.
  'org_preenchimento', 'org_preenchimentos',
  'redes_listar', 'redes_opcoes', 'redes_post', 'redes_resumo',
  'social_biblioteca', 'social_pastas_listar',
  // Canais de tempo real que ESTA conta pode ouvir (lista do servidor).
  'sync_meus_canais',
])
export const RPC_SEM_SINAL = new Set([
  // Assinatura de push deste aparelho: não é dado compartilhado.
  'registrar_push_organizacao', 'remover_push_organizacao', 'push_aparelho',
])
const ehLeituraPorNome = (n) => /^get_/.test(n)

// ── RPCs que ALTERAM dado: nome → domínios a reler ──────────────────────────
// Só avisa quando a chamada foi CONFIRMADA (rpc.js nunca avisa recusa, erro,
// 401 nem retorno {ok:false}).
export const RPC_ESCRITA = Object.freeze({
  // pedidos
  criar_solicitacao: ['pedidos', 'atividade'],
  publicar_solicitacao: ['pedidos', 'atividade', 'avisos'],
  marcar_solicitacao: ['pedidos', 'atividade'],
  atualizar_solicitacao: ['pedidos', 'atividade'],
  // fotos
  agendar_sessao_fotos: ['fotos', 'atividade', 'avisos'],
  atualizar_sessao_fotos: ['fotos', 'atividade', 'avisos'],
  abrir_vaga_fotos: ['fotos', 'atividade'],
  fechar_vaga_fotos: ['fotos', 'atividade'],
  // edição
  definir_edicao_atual: ['edicao', 'configuracao', 'participantes'],
  definir_publicacao_edicao: ['edicao', 'publicacao'],
  salvar_edicao: ['edicao'],
  salvar_cronograma_item: ['edicao'],
  remover_cronograma_item: ['edicao'],
  // arquivos e materiais
  publicar_arquivo: ['arquivos', 'atividade', 'avisos'],
  substituir_arquivo: ['arquivos', 'atividade'],
  arquivar_arquivo: ['arquivos', 'atividade'],
  atualizar_arquivo: ['arquivos', 'atividade'],
  salvar_material: ['materiais', 'atividade'],
  remover_material: ['materiais', 'atividade'],
  // publicação da marca
  publicar_participacao: ['publicacao', 'participantes', 'avisos', 'atividade'],
  retirar_publicacao: ['publicacao', 'participantes', 'avisos', 'atividade'],
  org_salvar_dados_publicos: ['participantes', 'publicacao'],
  org_verificar_coordenada: ['unidades', 'publicacao'],
  org_salvar_midia: ['cadastro', 'publicacao', 'editorial'],
  org_decidir_midia: ['cadastro', 'publicacao', 'editorial'],
  // cadastro / ficha da marca (lado organização)
  org_salvar_participante: ['participantes', 'editorial', 'atividade'],
  org_salvar_participacao: ['participantes', 'temas', 'cadastro', 'editorial', 'atividade'],
  org_salvar_item: ['cadastro', 'participantes', 'editorial'],
  org_salvar_unidade: ['unidades', 'participantes'],
  org_remover_unidade: ['unidades', 'participantes'],
  org_arquivar_participante: ['participantes'],
  org_preenchimento_decidir: ['preenchimento', 'participantes', 'cadastro', 'unidades', 'editorial'],
  pedir_correcao_campo: ['correcoes', 'participantes', 'avisos'],
  resolver_correcao: ['correcoes', 'participantes'],
  decidir_tema: ['temas', 'participantes', 'avisos'],
  definir_liberacao_foto: ['participantes', 'fotos', 'avisos'],
  definir_pagamento: ['participantes', 'avisos'],
  revisar_combo: ['participantes', 'publicacao', 'avisos'],
  decidir_vinculo: ['participantes', 'correcoes'],
  marcar_participante_novo: ['participantes', 'correcoes'],
  resolver_revisao: ['correcoes', 'participantes'],
  corrigir_participante: ['correcoes', 'participantes', 'editorial'],
  padronizar_nomes: ['correcoes', 'participantes', 'editorial'], // só com p_aplicar (ver dominiosDeRpc)
  // logos
  definir_logo: ['logos', 'participantes', 'editorial'],
  usar_logo_acervo: ['logos', 'participantes', 'editorial'],
  restaurar_logo: ['logos', 'participantes', 'editorial'],
  remover_logo: ['logos', 'participantes', 'editorial'],
  // mensagens e avisos
  enviar_mensagem: ['mensagens', 'avisos'],
  ler_mensagens_org: ['mensagens', 'avisos'],
  adicionar_observacao: ['atividade'],
  ler_notificacoes_org: ['avisos'],
  marca_ler_notificacoes: ['avisos'],
  // formulários do site, contatos, vouchers, vendas
  organizacao_atualizar_registro: ['respostas', 'atividade', 'avisos'],
  organizacao_apagar_registro: ['respostas', 'atividade'],
  salvar_contato: ['contatos'],
  definir_presskit: ['contatos'],
  gerar_vouchers: ['vouchers'],
  destinar_vouchers: ['vouchers'],
  atualizar_voucher: ['vouchers'],
  registrar_venda_org: ['vendas'],
  // equipe e acessos
  atualizar_conta: ['perfis'],
  definir_funcao_conta: ['perfis'],
  suspender_conta: ['perfis'],
  perfil_foto_definir: ['perfis'],
  perfil_foto_remover: ['perfis'],
  meu_nome_definir: ['perfis'],
  gerir_acesso_marca: ['acessos', 'participantes'],
  registrar_envio_acesso: ['acessos', 'participantes'],
  // social media
  redes_criar: ['redes', 'biblioteca', 'avisos'],
  redes_salvar: ['redes', 'avisos'],
  redes_situacao: ['redes', 'avisos'],
  redes_confirmar: ['redes', 'avisos'],
  redes_desfazer_publicacao: ['redes', 'avisos'],
  redes_comentar: ['redes', 'avisos'],
  redes_duplicar: ['redes'],
  redes_arquivo_alt: ['redes', 'biblioteca'],
  redes_arquivo_associar: ['redes', 'biblioteca', 'avisos'],
  redes_arquivo_registrar: ['redes', 'biblioteca', 'avisos'],
  redes_arquivo_remover: ['redes', 'biblioteca'],
  redes_arquivos_ordenar: ['redes'],
  social_biblioteca_registrar: ['biblioteca', 'redes'],
  social_biblioteca_mover: ['biblioteca'],
  social_pasta_criar: ['biblioteca'],
  social_pasta_editar: ['biblioteca'],
  social_pasta_arquivar: ['biblioteca'],
  social_pasta_mover: ['biblioteca'],
  editorial_salvar: ['editorial', 'participantes', 'cadastro', 'avisos'],
  // lado marca
  marca_concluir_cadastro: ['participantes', 'avisos'],
  marca_definir_logo: ['logos', 'participantes', 'editorial'],
  marca_usar_logo_acervo: ['logos', 'participantes', 'editorial'],
  marca_manter_logo: ['logos', 'participantes'],
  marca_enviar_mensagem: ['mensagens', 'avisos'],
  marca_ler_mensagens: ['mensagens', 'avisos'],
  marca_responder_solicitacao: ['pedidos', 'avisos'],
  marca_usar_voucher: ['vouchers'],
  marcar_senha_trocada: ['perfis'],
})

// ── Edge Functions ──────────────────────────────────────────────────────────
export const FUNCOES_ESCRITA = Object.freeze({
  'criar-acesso-marca': ['acessos', 'participantes', 'perfis'],
  'regerar-senha-conta': ['acessos', 'perfis'],
  'criar-conta-organizacao': ['perfis'],
})
// Assinam URL, mandam push de teste: não gravam dado de painel.
export const FUNCOES_SEM_SINAL = new Set(['arquivo-url', 'enviar-push'])

// ── Gravações diretas em tabela (lado marca, por RLS) ───────────────────────
export const TABELA_ESCRITA = Object.freeze({
  participantes: ['participantes', 'editorial'],
  participacoes: ['participantes', 'temas', 'editorial'],
  participantes_itens: ['cadastro', 'participantes', 'editorial'],
  unidades: ['unidades', 'participantes'],
  participacao_unidades: ['unidades', 'participantes'],
  unidade_disponibilidade: ['unidades'],
  declaracoes_alimentares: ['cadastro'],
  substituicoes: ['cadastro'],
  vendas_diarias: ['vendas'],
  sessoes_fotos: ['fotos', 'avisos'],
  arquivo_leitura: ['arquivos'],
})
export const TABELA_SEM_SINAL = new Set(['push_subscriptions'])

/** Domínios a reler depois de uma RPC CONFIRMADA. [] = nada a avisar. */
export function dominiosDeRpc(nome, corpo) {
  if (!nome || ehLeituraPorNome(nome) || RPC_LEITURA.has(nome) || RPC_SEM_SINAL.has(nome)) return []
  // padronizar_nomes{p_aplicar:false} é só um ensaio: não muda nada.
  if (nome === 'padronizar_nomes' && !(corpo && corpo.p_aplicar === true)) return []
  return RPC_ESCRITA[nome] ? [...RPC_ESCRITA[nome]] : []
}

export function dominiosDeFuncao(nome) {
  return FUNCOES_ESCRITA[nome] ? [...FUNCOES_ESCRITA[nome]] : []
}

/** `api('tabela?x=y', {metodo})` do lado marca. Leitura (GET) não avisa. */
export function dominiosDeApi(caminho, metodo = 'GET') {
  const m = String(metodo || 'GET').toUpperCase()
  if (m === 'GET' || m === 'HEAD') return []
  const alvo = String(caminho || '').split('?')[0]
  if (alvo.startsWith('rpc/')) return dominiosDeRpc(alvo.slice(4))
  if (TABELA_SEM_SINAL.has(alvo)) return []
  return TABELA_ESCRITA[alvo] ? [...TABELA_ESCRITA[alvo]] : []
}

/**
 * Gravação "confirmada"? O servidor pode responder 200 com recusa de negócio
 * ({ok:false}) ou `false` (organizacao_atualizar_registro quando nada mudou).
 * Isso NÃO é alteração confirmada.
 */
export function foiConfirmada(resposta) {
  if (resposta === false) return false
  if (resposta && typeof resposta === 'object' && !Array.isArray(resposta) && resposta.ok === false) return false
  return true
}
