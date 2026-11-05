/*
 * Caça aos Carimbos — chamadas ao banco e à edge function de e-mail (docs/cartoon-2026-2/15-caca-contrato-*.md).
 *
 * Uma fábrica (`criarApi`) recebe o cliente de RPC e o `fetch`, então os testes injetam mocks. Toda função devolve
 * SEMPRE `{ ok: true, ... }` ou `{ ok: false, motivo }` e nunca lança: erro de rede, exceção do PostgREST e resposta
 * estranha viram um `motivo` em snake_case. Nada aqui escreve em console, storage ou URL: chave pessoal, código de
 * e-mail e token de convite só viajam no corpo da requisição (nunca em log, analytics ou endereço).
 */
import { SUPABASE_URL } from '../../lib/supabaseConfig.js'
import { chamar as chamarRpc, chaveValida } from '../rota/carimbo.js'
import { EDICAO } from '../config.js'
import { tokenValido, grupoIdValido } from './regras.js'

const MOTIVO = /^[a-z][a-z0-9_]{1,59}$/
const FINALIDADES = ['confirmar', 'recuperar']
const sem = (motivo) => ({ ok: false, motivo })

/** Mensagem de exceção do PostgREST (ex.: 'email_invalido') → motivo. Qualquer outra coisa (inclusive texto livre) vira 'rede'. */
export const motivoDoErro = (err) => { const m = String(err?.message || ''); return MOTIVO.test(m) ? m : 'rede' }

/** Resposta `{ ok, ... }` do banco → sempre com `ok` booleano e, na falha, `motivo` textual. */
function comOk (r) {
  const obj = r && typeof r === 'object' && !Array.isArray(r)
  if (obj && r.ok === true) return r
  return { ...(obj ? r : {}), ok: false, motivo: typeof r?.motivo === 'string' && MOTIVO.test(r.motivo) ? r.motivo : 'resposta_invalida' }
}

export function criarApi ({ chamar = chamarRpc, buscar = (...a) => globalThis.fetch(...a), edicao = EDICAO.codigo, urlBase = SUPABASE_URL } = {}) {
  /** RPC cujo retorno já é `{ ok, ... }`. */
  async function rpcOk (nome, corpo) {
    try { return comOk(await chamar(nome, corpo)) } catch (e) { return sem(motivoDoErro(e)) }
  }
  /** RPC cujo retorno é um dado sem `ok` (mapa_ler_v2, ranking, metas): `null` = chave desconhecida. */
  async function rpcDado (nome, corpo) {
    try {
      const r = await chamar(nome, corpo)
      return r === null || r === undefined ? sem('mapa_desconhecido') : { ok: true, dado: r }
    } catch (e) { return sem(motivoDoErro(e)) }
  }
  const comChave = (chave, fn) => (chaveValida(chave) ? fn() : Promise.resolve(sem('mapa_desconhecido')))
  const comGrupo = (chave, grupo, fn) => (!chaveValida(chave) ? Promise.resolve(sem('mapa_desconhecido')) : !grupoIdValido(grupo) ? Promise.resolve(sem('negado')) : fn())

  return {
    /* ---- identidade e recuperação (15-caca-contrato-identidade.md) ---- */

    /** `mapa_criar_v2`: `{ ok:true, chave }` (a chave aparece uma única vez) · motivos: muitos_pedidos · edicao_desconhecida · aceite_obrigatorio · apelido_invalido · email_invalido · whatsapp_invalido. */
    async mapaCriar ({ apelido, email, whatsapp = null, ranking = false, aceite = false }) {
      const r = await rpcDado('mapa_criar_v2', { p_edicao: edicao, p_apelido: apelido, p_email: email, p_whatsapp: whatsapp || null, p_ranking: !!ranking, p_aceite: !!aceite })
      if (!r.ok) return r
      return chaveValida(r.dado?.chave) ? { ok: true, chave: r.dado.chave } : sem('resposta_invalida')
    },

    /** `mapa_confirmar_email_status`: `{ ok:true, confirmado, valido }` (`valido:false` = chave trocada/desconhecida). */
    emailStatus: (chave) => comChave(chave, async () => {
      const r = await rpcDado('mapa_confirmar_email_status', { p_chave: chave })
      return r.ok ? { ok: true, confirmado: r.dado.confirmado === true, valido: r.dado.valido !== false } : r
    }),

    /**
     * Edge function `caca-email` (POST sem JWT): pede o código de 6 dígitos por e-mail.
     * `{ ok:true }` · `{ ok:true, limitado:true }` (espere 1 min) · `{ ok:false, motivo:'email_indisponivel' }` (provedor não configurado, nada gravado)
     * · `pedido_invalido` · `email_invalido` · `rede`. A resposta de sucesso é igual exista ou não mapa para o e-mail: não inferir nada dela.
     */
    async pedirCodigo ({ email, finalidade }) {
      const e = String(email ?? '').trim()
      if (!FINALIDADES.includes(finalidade)) return sem('pedido_invalido')
      if (!e || e.length > 254 || !e.includes('@')) return sem('email_invalido')
      try {
        const r = await buscar(`${urlBase}/functions/v1/caca-email`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edicao, email: e, finalidade }),
        })
        const d = await r.json().catch(() => null)
        if (d?.ok === true) return d.limitado ? { ok: true, limitado: true } : { ok: true }
        return sem(typeof d?.motivo === 'string' && MOTIVO.test(d.motivo) ? d.motivo : 'rede')
      } catch { return sem('rede') }
    },

    /**
     * `mapa_codigo_validar`: `{ ok:true, finalidade:'confirmar' }` ou `{ ok:true, finalidade:'recuperar', chave, apelido }`
     * (a chave nova vem uma única vez). Toda falha do banco é `codigo_invalido` (errado, vencido, usado, sem pedido); o código malformado nem sai daqui.
     */
    async codigoValidar ({ email, codigo, finalidade }) {
      const c = String(codigo ?? '').replace(/\s+/g, '')
      if (!FINALIDADES.includes(finalidade) || !/^\d{6}$/.test(c)) return sem('codigo_invalido')
      const r = await rpcOk('mapa_codigo_validar', { p_edicao: edicao, p_email: String(email ?? '').trim(), p_codigo: c, p_finalidade: finalidade })
      if (!r.ok) return sem(r.motivo === 'rede' ? 'rede' : 'codigo_invalido')
      if (finalidade === 'recuperar' && !chaveValida(r.chave)) return sem('resposta_invalida')
      return finalidade === 'recuperar' ? { ok: true, finalidade, chave: r.chave, apelido: String(r.apelido || '') } : { ok: true, finalidade }
    },

    /** `mapa_ler_v2`: `{ ok:true, mapa }` com edicao, apelido, email, whatsapp, no_ranking, total_casas, casas_validadas, extras, faltam, posicao, empatados, casas[{slug, carimbos, ultimo, liberado_em, avaliou, estado:'validada'|'pendente', extras}]. Chave desconhecida = `mapa_desconhecido`. */
    mapaLer: (chave) => comChave(chave, async () => {
      const r = await rpcDado('mapa_ler_v2', { p_chave: chave })
      return r.ok ? { ok: true, mapa: r.dado } : r
    }),

    /** `mapa_apagar` (existente): apaga o mapa no banco. */
    mapaApagar: (chave) => comChave(chave, async () => {
      try { await chamar('mapa_apagar', { p_chave: chave }); return { ok: true } } catch (e) { return sem(motivoDoErro(e)) }
    }),

    /* ---- ranking geral e metas ---- */

    /** `caca_ranking_publico`: `{ ok:true, ranking:[{posicao, apelido, casas, extras}] }`, só quem optou por aparecer, até `limite` (1 a 50). Pública, sem chave. */
    async ranking (limite = 10) {
      const r = await rpcDado('caca_ranking_publico', { p_edicao: edicao, p_limite: Math.min(Math.max(Math.trunc(limite) || 10, 1), 50) })
      return r.ok && Array.isArray(r.dado) ? { ok: true, ranking: r.dado } : r.ok ? sem('resposta_invalida') : r
    },

    /** `caca_metas_ler`: `{ ok:true, metas:{ total_casas, casas_validadas, metas[], alcancadas[], proxima|null } }`. Os marcos são exemplo (`exemplo:true`): não prometer prêmio por meta. */
    metasLer: (chave) => comChave(chave, async () => {
      const r = await rpcDado('caca_metas_ler', { p_chave: chave })
      return r.ok ? { ok: true, metas: r.dado } : r
    }),

    /* ---- grupos e rota colaborativa (15-caca-contrato-grupos.md) ---- */

    /** `caca_grupo_criar`: `{ ok:true, grupo_id, nome, convite_token, convite_expira_em }` · nome_invalido · aceite_obrigatorio · limite_grupos. O token só aparece aqui. */
    grupoCriar: (chave, nome, aceite = false) => comChave(chave, () => rpcOk('caca_grupo_criar', { p_chave: chave, p_nome: nome, p_aceite_visibilidade: aceite === true })),

    /** `caca_grupo_convite_ver` (sem chave): `{ ok:true, valido, nome_do_grupo, membros_qtd, motivo? }`, só 3 dados, nada mais vaza. Token fora do formato = `valido:false`. */
    async grupoConviteVer (token) {
      if (!tokenValido(token)) return { ok: true, valido: false, nome_do_grupo: null, membros_qtd: null, motivo: 'convite_invalido' }
      const r = await rpcDado('caca_grupo_convite_ver', { p_token: token })
      if (!r.ok) return r
      const d = r.dado
      return d?.valido === true
        ? { ok: true, valido: true, nome_do_grupo: String(d.nome_do_grupo ?? ''), membros_qtd: Number(d.membros_qtd) || 0 }
        : { ok: true, valido: false, nome_do_grupo: null, membros_qtd: null, motivo: typeof d?.motivo === 'string' ? d.motivo : 'convite_invalido' }
    },

    /** `caca_grupo_entrar`: `{ ok:true, grupo_id, nome, ja_membro }` · convite_invalido|revogado|expirado|esgotado · edicao_diferente · removido_do_grupo · aceite_obrigatorio · grupo_cheio · limite_grupos. */
    grupoEntrar: (chave, token, aceite = false) => (!tokenValido(token) ? Promise.resolve(sem('convite_invalido'))
      : comChave(chave, () => rpcOk('caca_grupo_entrar', { p_chave: chave, p_token: token, p_aceite_visibilidade: aceite === true }))),

    /** `caca_grupo_convite_novo`: `{ ok:true, convite_token, convite_expira_em }` · negado · so_dono (convites travados) · limite_convites. */
    grupoConviteNovo: (chave, grupo) => comGrupo(chave, grupo, () => rpcOk('caca_grupo_convite_novo', { p_chave: chave, p_grupo: grupo })),

    /** `caca_grupo_convite_revogar` (só dono): `{ ok:true, revogados }`. */
    grupoConviteRevogar: (chave, grupo) => comGrupo(chave, grupo, () => rpcOk('caca_grupo_convite_revogar', { p_chave: chave, p_grupo: grupo })),

    /** `caca_grupo_sair`: `{ ok:true }` · negado. */
    grupoSair: (chave, grupo) => comGrupo(chave, grupo, () => rpcOk('caca_grupo_sair', { p_chave: chave, p_grupo: grupo })),

    /** `caca_grupo_remover_membro` (só dono; `membro` = membro_id): `{ ok:true }` · so_dono · membro_desconhecido · use_sair. */
    grupoRemoverMembro: (chave, grupo, membro) => (!grupoIdValido(membro) ? Promise.resolve(sem('membro_desconhecido'))
      : comGrupo(chave, grupo, () => rpcOk('caca_grupo_remover_membro', { p_chave: chave, p_grupo: grupo, p_membro: membro }))),

    /** `caca_grupo_listar`: `{ ok:true, total_casas, grupos:[{grupo_id, nome, papel, entrou_em, membros_qtd, casas_coletivas, total_casas}] }`. */
    grupoListar: (chave) => comChave(chave, () => rpcOk('caca_grupo_listar', { p_chave: chave })),

    /** `caca_grupo_ler`: `{ ok:true, grupo, eu, membros[], total_casas, casas_coletivas, faltam_coletivo, casas_coletivas_slugs[], rota_versao, rota[] }` · negado. */
    grupoLer: (chave, grupo) => comGrupo(chave, grupo, () => rpcOk('caca_grupo_ler', { p_chave: chave, p_grupo: grupo })),

    /** `caca_grupo_rota_adicionar`: `{ ok:true, mudou, versao, rota[] }` · conflito (volta a rota atual) · casa_desconhecida. `versao` opcional = a que a tela viu. */
    grupoRotaAdicionar: (chave, grupo, slug, versao = null) => comGrupo(chave, grupo, () => rpcOk('caca_grupo_rota_adicionar', { p_chave: chave, p_grupo: grupo, p_slug: slug, p_versao: versao })),

    /** `caca_grupo_rota_remover`: mesmo formato de adicionar. */
    grupoRotaRemover: (chave, grupo, slug, versao = null) => comGrupo(chave, grupo, () => rpcOk('caca_grupo_rota_remover', { p_chave: chave, p_grupo: grupo, p_slug: slug, p_versao: versao })),

    /** `caca_grupo_rota_mover` (`posicao` 1-based): mesmo formato · nao_esta_na_rota · posicao_invalida. */
    grupoRotaMover: (chave, grupo, slug, posicao, versao = null) => comGrupo(chave, grupo, () => rpcOk('caca_grupo_rota_mover', { p_chave: chave, p_grupo: grupo, p_slug: slug, p_posicao: posicao, p_versao: versao })),

    /* ---- push do visitante (15-caca-contrato-metas-push.md §4): só depois do "Permitir" do navegador ---- */

    /** `caca_push_registrar` (`subscription` = PushSubscription.toJSON()): `{ ok:true, prefs, dispositivos }` · assinatura_invalida · limite_dispositivos. */
    pushRegistrar: (chave, subscription, prefs = null) => comChave(chave, () => rpcOk('caca_push_registrar', { p_chave: chave, p_subscription: subscription, p_prefs: prefs })),

    /** `caca_push_prefs` (chaves booleanas: avaliacao_pendente, meta, grupo, edicao): `{ ok:true, prefs, dispositivos }` · sem_assinatura. */
    pushPrefs: (chave, prefs) => comChave(chave, () => rpcOk('caca_push_prefs', { p_chave: chave, p_prefs: prefs })),

    /** `caca_push_remover` (`endpoint` null = todos os aparelhos do mapa): `{ ok:true, removidos }`. */
    pushRemover: (chave, endpoint = null) => comChave(chave, () => rpcOk('caca_push_remover', { p_chave: chave, p_endpoint: endpoint })),
  }
}

export const api = criarApi()
