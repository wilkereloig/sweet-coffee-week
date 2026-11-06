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
import { comEnvio } from './pwa/pendencias.js'

const MOTIVO = /^[a-z][a-z0-9_]{1,59}$/
const FINALIDADES = ['confirmar', 'recuperar']
// Mesmo formato que a edge function e o banco aceitam para ENVIAR código (SEC-07): sem vírgula, aspas, <> ou espaço.
const EMAIL_ENTREGAVEL = /^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$/i
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const sem = (motivo) => ({ ok: false, motivo })

/** Mensagem de exceção do PostgREST (ex.: 'email_invalido') → motivo. Qualquer outra coisa (inclusive texto livre) vira 'rede'. */
export const motivoDoErro = (err) => { const m = String(err?.message || ''); return MOTIVO.test(m) ? m : 'rede' }

/** Resposta `{ ok, ... }` do banco → sempre com `ok` booleano e, na falha, `motivo` textual. */
function comOk (r) {
  const obj = r && typeof r === 'object' && !Array.isArray(r)
  if (obj && r.ok === true) return r
  return { ...(obj ? r : {}), ok: false, motivo: typeof r?.motivo === 'string' && MOTIVO.test(r.motivo) ? r.motivo : 'resposta_invalida' }
}

export function criarApi ({ chamar = chamarRpc, buscar = (...a) => comEnvio(() => globalThis.fetch(...a)), edicao = EDICAO.codigo, urlBase = SUPABASE_URL } = {}) {
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

    /** `mapa_criar_v2`: `{ ok:true, chave }` (a chave aparece uma única vez) · motivos: muitos_pedidos · email_ja_tem_mapa · edicao_desconhecida · aceite_obrigatorio · apelido_invalido · email_invalido · whatsapp_invalido. */
    async mapaCriar ({ apelido, email, whatsapp = null, ranking = false, aceite = false }) {
      const r = await rpcDado('mapa_criar_v2', { p_edicao: edicao, p_apelido: apelido, p_email: email, p_whatsapp: whatsapp || null, p_ranking: !!ranking, p_aceite: !!aceite })
      if (!r.ok) return r
      if (r.dado?.motivo === 'email_ja_tem_mapa') return sem('email_ja_tem_mapa') // um mapa por e-mail (20261225): não cria outro
      return chaveValida(r.dado?.chave) ? { ok: true, chave: r.dado.chave } : sem('resposta_invalida')
    },

    /** `mapa_confirmar_email_status`: `{ ok:true, confirmado, valido }` (`valido:false` = chave trocada/desconhecida). */
    emailStatus: (chave) => comChave(chave, async () => {
      const r = await rpcDado('mapa_confirmar_email_status', { p_chave: chave })
      return r.ok ? { ok: true, confirmado: r.dado.confirmado === true, valido: r.dado.valido !== false } : r
    }),

    /**
     * Edge function `caca-email` (POST sem JWT): pede o código de 6 dígitos por e-mail. 'confirmar' leva a `chave` do mapa (o código
     * sai para o mapa de quem pediu); 'recuperar' não (a pessoa perdeu a chave).
     * `{ ok:true }` · `{ ok:true, limitado:true }` (1 pedido por minuto e 5 por hora: ver CACA.codigo.limitado) · `{ ok:false, motivo:'email_indisponivel' }` (provedor não configurado, nada gravado)
     * · `falha_temporaria` (banco lento/fora, nada foi enviado: tentar de novo) · `pedido_invalido` · `email_invalido` · `rede`. A resposta de sucesso é igual exista ou não mapa para o e-mail: não inferir nada dela.
     */
    async pedirCodigo ({ email, finalidade, chave = null }) {
      const e = String(email ?? '').trim()
      if (!FINALIDADES.includes(finalidade)) return sem('pedido_invalido')
      if (!e || e.length > 254 || !EMAIL_ENTREGAVEL.test(e)) return sem('email_invalido')
      try {
        const r = await buscar(`${urlBase}/functions/v1/caca-email`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edicao, email: e, finalidade, ...(finalidade === 'confirmar' && chave ? { chave: String(chave) } : {}) }),
        })
        const d = await r.json().catch(() => null)
        if (d?.ok === true) return d.limitado ? { ok: true, limitado: true } : { ok: true }
        return sem(typeof d?.motivo === 'string' && MOTIVO.test(d.motivo) ? d.motivo : 'rede')
      } catch { return sem('rede') }
    },

    /**
     * Edge function `caca-email`, finalidade 'link': manda o LINK PESSOAL do mapa para o e-mail, SÓ se o e-mail já foi confirmado
     * (o servidor guarda só o hash da chave, então a chave vai no pedido). Mesma resposta exista ou não mapa; a tela nunca promete mais
     * do que "se o e-mail estiver confirmado". `{ ok:true }` · `{ ok:true, limitado:true }` · `email_indisponivel` · `falha_temporaria` · `pedido_invalido` · `email_invalido` · `rede`.
     */
    async enviarLink ({ email, chave }) {
      const e = String(email ?? '').trim()
      if (!e || e.length > 254 || !EMAIL_ENTREGAVEL.test(e)) return sem('email_invalido')
      if (!chaveValida(chave)) return sem('pedido_invalido')
      try {
        const r = await buscar(`${urlBase}/functions/v1/caca-email`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edicao, email: e, finalidade: 'link', chave: String(chave) }),
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
    async codigoValidar ({ email, codigo, finalidade, chave = null }) {
      const c = String(codigo ?? '').replace(/\s+/g, '')
      if (!FINALIDADES.includes(finalidade) || !/^\d{6}$/.test(c)) return sem('codigo_invalido')
      if (finalidade === 'confirmar' && !chave) return sem('codigo_invalido')
      const r = await rpcOk('mapa_codigo_validar', { p_edicao: edicao, p_email: String(email ?? '').trim(), p_codigo: c, p_finalidade: finalidade, p_chave: finalidade === 'confirmar' ? String(chave) : null })
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

    /* ---- pedido de revisão de presença (15-caca-contrato-gps.md) ---- */

    /**
     * `caca_excecao_pedir`: pede à organização que olhe o caso quando o GPS falha de forma persistente. NÃO carimba nem conta nada.
     * `{ ok:true, id, estado:'pendente' }` · motivos: nao_precisa · cedo · ja_pedido · limite_dia · muitos_pendentes · fila_cheia · nao_aberta · encerrada
     * · casa_sem_combo · qr_invalido · motivo_invalido · mapa_desconhecido. A posição segue só para esta RPC, que calcula a distância e não a guarda.
     */
    excecaoPedir: (chave, { slug, motivo, lat = null, lng = null, precisao = null, nota = '' }) => comChave(chave, () => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug || ''))) return Promise.resolve(sem('qr_invalido'))
      const num = (v) => (Number.isFinite(v) ? v : null)
      return rpcOk('caca_excecao_pedir', {
        p_chave: chave, p_slug: slug, p_motivo: motivo, p_lat: num(lat), p_lng: num(lng), p_precisao: num(precisao),
        p_nota: String(nota || '').trim().slice(0, 200) || null,
      })
    }),

    /** `caca_excecao_minhas`: `{ ok:true, pedidos:[{slug, estado:'pendente'|'aprovado'|'negado', criado_em, decidido_em}] }`, do mais novo ao mais antigo. */
    excecaoMinhas: (chave) => comChave(chave, async () => {
      const r = await rpcOk('caca_excecao_minhas', { p_chave: chave })
      return r.ok ? { ok: true, pedidos: Array.isArray(r.pedidos) ? r.pedidos : [] } : r
    }),

    /* ---- carimbo de visita anterior (migration 20261226): pedidos só em 05/11/2026, até 23h59:59 de Natal ---- */

    /** `caca_visita_anterior_prazo` (pública): `{ ok:true, prazo:{ aberto, ate, fuso, agora } }`. O relógio é o do servidor. */
    async visitaAnteriorPrazo () {
      const r = await rpcDado('caca_visita_anterior_prazo', {})
      return r.ok && r.dado && typeof r.dado.aberto === 'boolean' ? { ok: true, prazo: r.dado } : r.ok ? sem('resposta_invalida') : r
    },

    /**
     * `caca_visita_anterior_pedir`: pede à organização que analise uma visita feita antes de conhecer a Caça. NÃO carimba nem conta nada.
     * `{ ok:true, id, estado:'pendente' }` · motivos: prazo_encerrado · email_nao_confirmado · data_invalida · data_futura · unidade_obrigatoria ·
     * unidade_invalida · ja_carimbou · ja_pedido · limite_pedidos · muitos_pendentes · fila_cheia · qr_invalido · casa_sem_combo · encerrada · mapa_desconhecido.
     */
    visitaAnteriorPedir: (chave, { slug, unidade = null, data, nota = '' }) => comChave(chave, () => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug || ''))) return Promise.resolve(sem('qr_invalido'))
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data || ''))) return Promise.resolve(sem('data_invalida'))
      return rpcOk('caca_visita_anterior_pedir', {
        p_chave: chave, p_slug: slug, p_unidade: unidade ? String(unidade).slice(0, 64) : null, p_data: data,
        p_nota: String(nota || '').trim().slice(0, 200) || null,
      })
    }),

    /* ---- carimbo de delivery (migration 20261231): confirmação pela casa (código) ou imagem para a organização ---- */

    /**
     * `caca_delivery_pedir`: abre o pedido e já devolve o código temporário (24 h, uso único) para a CASA confirmar. NÃO carimba nem conta nada.
     * `{ ok:true, id, estado:'pendente', via:'casa', codigo, expira_em, slug }` · motivos: email_nao_confirmado · qr_invalido · casa_sem_combo · encerrada · nao_aberta ·
     * data_invalida · data_futura · sem_delivery · unidade_obrigatoria · unidade_invalida · ja_pedido · limite_pedidos · muitos_pendentes · fila_cheia · mapa_desconhecido.
     */
    deliveryPedir: (chave, { slug, unidade = null, data, ref = '', nota = '', via = 'casa' }) => comChave(chave, () => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug || ''))) return Promise.resolve(sem('qr_invalido'))
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data || ''))) return Promise.resolve(sem('data_invalida'))
      return rpcOk(via === 'imagem' ? 'caca_delivery_pedir_imagem' : 'caca_delivery_pedir', {
        p_chave: chave, p_slug: slug, p_unidade: unidade ? String(unidade).slice(0, 64) : null, p_data: data,
        p_ref: String(ref || '').trim().slice(0, 40) || null, p_nota: String(nota || '').trim().slice(0, 200) || null,
      })
    }),

    /** `caca_delivery_novo_codigo`: código novo quando o anterior venceu (até 3 por pedido). `{ ok:true, id, codigo, expira_em }` · limite_codigos · transicao_invalida · pedido_nao_encontrado. */
    deliveryNovoCodigo: (chave, id) => comChave(chave, () => (FORMATO_UUID.test(String(id || '')) ? rpcOk('caca_delivery_novo_codigo', { p_chave: chave, p_id: id }) : Promise.resolve(sem('pedido_nao_encontrado')))),

    /** `caca_delivery_anexar`: confirma o upload da imagem e põe o pedido em análise pela organização. `{ ok:true, id, estado:'pendente', via:'imagem' }`. */
    deliveryAnexar: (chave, id, path) => comChave(chave, () => (FORMATO_UUID.test(String(id || '')) ? rpcOk('caca_delivery_anexar', { p_chave: chave, p_id: id, p_path: String(path || '') }) : Promise.resolve(sem('pedido_nao_encontrado')))),

    /**
     * Envia UMA imagem (já reduzida no aparelho): pede a URL assinada à edge function `caca-delivery`, faz o PUT direto no armazenamento privado
     * e confirma no banco. Falha em qualquer passo devolve `{ ok:false, motivo }` e NÃO perde o pedido: dá para tentar de novo (até 5 reservas).
     * Motivos: limite_imagem · formato_invalido · upload_falhou · imagem_ausente · imagem_invalida · transicao_invalida · rede · falha_temporaria.
     */
    deliveryEnviarImagem: (chave, id, { blob, ext, tipo }) => comChave(chave, async () => {
      if (!FORMATO_UUID.test(String(id || '')) || !blob) return sem('pedido_nao_encontrado')
      try {
        const r = await buscar(`${urlBase}/functions/v1/caca-delivery`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'subir', chave, pedido: id, ext }),
        })
        const d = await r.json().catch(() => null)
        if (d?.ok !== true || typeof d.url !== 'string') return sem(typeof d?.motivo === 'string' && MOTIVO.test(d.motivo) ? d.motivo : 'rede')
        const up = await buscar(d.url, { method: 'PUT', body: blob, headers: { 'Content-Type': tipo } })
        if (!up.ok) return sem('upload_falhou')
        return await rpcOk('caca_delivery_anexar', { p_chave: chave, p_id: id, p_path: d.path })
      } catch { return sem('rede') }
    }),

    /* ---- ranking geral e metas ---- */

    /** `caca_ranking_publico`: `{ ok:true, ranking:[{posicao, apelido, casas, extras}] }`, só quem optou por aparecer, até `limite` (1 a 50). Pública, sem chave. */
    async ranking (limite = 10) {
      const r = await rpcDado('caca_ranking_publico', { p_edicao: edicao, p_limite: Math.min(Math.max(Math.trunc(limite) || 10, 1), 50) })
      return r.ok && Array.isArray(r.dado) ? { ok: true, ranking: r.dado } : r.ok ? sem('resposta_invalida') : r
    },

    /** `caca_metas_ler`: `{ ok:true, metas:{ total_casas, casas_validadas, metas[], alcancadas[], proxima|null } }`. Os marcos são relativos ao total (`completa:true` = todas as casas): não prometer prêmio por meta. */
    metasLer: (chave) => comChave(chave, async () => {
      const r = await rpcDado('caca_metas_ler', { p_chave: chave })
      return r.ok ? { ok: true, metas: r.dado } : r
    }),

    /** `caca_premios_publico` (migration 20261223): `{ ok:true, premios:{ periodo{inicio,fim,estado: antes|aberta|encerrada}, dias[{dia,corte,estado}], corte_hora_local, voucher_validade_ate, ganhadores_final } }`. Público, sem chave; nunca traz nome nem posição de ninguém. */
    premiosLer: async () => {
      const r = await rpcDado('caca_premios_publico', { p_edicao: edicao })
      return r.ok ? { ok: true, premios: r.dado } : r
    },

    /** `caca_avisos_ler` (migration 20261230): `{ ok:true, avisos:[{ id, categoria, urgente, titulo, corpo, destino, quando, visto }], novos }`. Só os avisos DESTE mapa; sem dado de ninguém. */
    avisosLer: (chave) => comChave(chave, async () => {
      const r = await rpcDado('caca_avisos_ler', { p_chave: chave })
      return r.ok && Array.isArray(r.dado?.avisos) ? { ok: true, avisos: r.dado.avisos, novos: Number(r.dado.novos) || 0 } : r.ok ? sem('resposta_invalida') : r
    }),

    /** `caca_avisos_visto`: marca os avisos como vistos neste mapa. `{ ok:true, marcados }`. */
    avisosVisto: (chave, ids) => comChave(chave, () => rpcOk('caca_avisos_visto', { p_chave: chave, p_ids: Array.isArray(ids) ? ids : [] })),

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
