/*
 * caca-email — envia o código de 6 dígitos da Caça aos Carimbos (confirmar e-mail / recuperar mapa).
 * Contrato: docs/cartoon-2026-2/15-caca-contrato-identidade.md
 *
 * Entrada (POST JSON): { edicao, email, finalidade: 'confirmar' | 'recuperar' | 'link', chave? }
 *   'link' (05/11/2026): manda o LINK PESSOAL do mapa (texto puro, sem <a>) para o e-mail do mapa, SÓ se o e-mail já foi confirmado; exige `chave`
 *   (32 caracteres) porque o banco guarda só o hash. Mesma resposta uniforme e mesmos limites (migration 20261222).
 *   `chave` (a do mapa deste aparelho) é OBRIGATÓRIA para 'confirmar': o código sai para o mapa de quem pediu e só ele o valida;
 *   sem chave (ou de outro e-mail) nada é enviado e a resposta é a mesma. 'recuperar' não usa chave (a pessoa a perdeu).
 *   Limites: 1/min e 5/h por mapa (confirmar) ou por e-mail (recuperar), 40/10 min por IP (hash no banco), teto de 600/h por finalidade.
 * Saída (uniforme: não revela se o e-mail tem mapa, nem pelo conteúdo nem pelo tempo da resposta):
 *   { ok: true }                                  pedido aceito (o envio roda em segundo plano, com 1 nova tentativa)
 *   { ok: true, limitado: true }                  limite por e-mail (1/min, 5/h) atingido
 *   { ok: false, motivo: 'email_indisponivel' }   provedor não configurado (nada é gravado nem enviado)
 *   { ok: false, motivo: 'falha_temporaria' }     banco indisponível/lento (nada foi enviado; tente de novo)
 *   { ok: false, motivo: 'pedido_invalido' }      corpo malformado (400)
 *   { ok: false, motivo: 'email_invalido' }       endereço fora do formato entregável (400): letras/dígitos/._%+- e domínio; nunca vírgula, aspas ou <>
 *
 * Canal lateral (SEC-07): toda resposta aceita ({ ok:true }, { ok:true, limitado:true }) espera um piso de tempo fixo mais um acréscimo
 * aleatório (ver esperaParaPiso em montar.js), então a diferença de milissegundos da RPC entre "há mapa" e "não há" não aparece. O banco ainda
 * faz um trabalho de enchimento quando não há nada a enviar (migration 20261220).
 *
 * Provedor: Resend (RESEND_API_KEY + CACA_EMAIL_FROM ou EMAIL_FROM, as mesmas da send-vote-email; sem remetente definido usa REMETENTE_PADRAO). Brevo só entra se
 * RESEND_API_KEY não existir e houver BREVO_API_KEY (a que a sync-brevo-contacts já usa) — o remetente precisa estar
 * verificado no provedor. Nenhum valor mora no repositório; o log guarda só NOMES de variáveis e status HTTP.
 * O e-mail não leva apelido nem dado do mapa (ver montar.js).
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { montarEmail, montarEmailLink, chaveDoMapaValida, provedorEscolhido, politicaFalha, mensagemParaLog, emailEntregavel, esperaParaPiso } from './montar.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const resp = (corpo: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Config = ReturnType<typeof provedorEscolhido> & { chaves: Record<string, string | undefined> }
type Email = { assunto: string; html: string; texto: string }

/** Uma chamada ao provedor. Devolve o status HTTP (0 = rede/timeout) e, se o provedor disse, o nome do erro (não o texto). */
async function chamarProvedor(cfg: Config, para: string, email: Email, chaveIdem: string): Promise<{ status: number; erro?: string; msg?: string }> {
  try {
    const r = cfg.provedor === 'resend'
      ? await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.chaves.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': chaveIdem },
        body: JSON.stringify({ from: cfg.bruto, to: [para], subject: email.assunto, html: email.html, text: email.texto }),
        signal: AbortSignal.timeout(8_000),
      })
      : await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': String(cfg.chaves.BREVO_API_KEY), 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: cfg.remetente!.nome || undefined, email: cfg.remetente!.email },
          to: [{ email: para }], subject: email.assunto, htmlContent: email.html, textContent: email.texto,
        }),
        signal: AbortSignal.timeout(8_000),
      })
    if (r.ok) return { status: r.status }
    const d = await r.json().catch(() => null)
    const nome = typeof d?.name === 'string' ? d.name : typeof d?.code === 'string' ? d.code : undefined
    return { status: r.status, erro: nome && /^[a-z_]{3,60}$/i.test(nome) ? nome : undefined, msg: mensagemParaLog(d?.message) }
  } catch (_e) {
    return { status: 0 }
  }
}

/** Envia com UMA nova tentativa em rede/timeout/429/5xx. Só loga status e nome do erro, nunca endereço, código ou corpo. */
async function enviar(cfg: Config, para: string, email: Email) {
  const chaveIdem = `caca-${crypto.randomUUID()}`
  let t = await chamarProvedor(cfg, para, email, chaveIdem)
  if (t.status !== 0 && t.status < 300) { console.log('caca_email_enviado', cfg.provedor, t.status); return }
  const pol = politicaFalha(t.status)
  if (pol.repetir) {
    await dormir(pol.espera)
    t = await chamarProvedor(cfg, para, email, chaveIdem)
    if (t.status !== 0 && t.status < 300) { console.log('caca_email_enviado', cfg.provedor, t.status, 'apos_nova_tentativa'); return }
  }
  console.error('caca_email_provedor_falhou', cfg.provedor, 'status', t.status, t.erro ?? '', t.msg ?? '')
}

Deno.serve(async (req: Request) => {
  const t0 = Date.now()
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return resp({ ok: false, motivo: 'metodo_nao_permitido' }, 405)

  let entrada: Record<string, unknown>
  try { entrada = await req.json() } catch { return resp({ ok: false, motivo: 'pedido_invalido' }, 400) }

  const edicao = String(entrada?.edicao ?? '').slice(0, 20)
  const email = String(entrada?.email ?? '').trim().toLowerCase()
  const finalidade = String(entrada?.finalidade ?? '')
  const chave = String(entrada?.chave ?? '').slice(0, 200)
  // IP só viaja ao banco para virar hash e contar o limite; nunca é logado.
  const ip = (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? '').trim().slice(0, 64)
  if (!edicao || (finalidade !== 'confirmar' && finalidade !== 'recuperar' && finalidade !== 'link')) return resp({ ok: false, motivo: 'pedido_invalido' }, 400)
  // 'link' manda o link pessoal do mapa (credencial) para o e-mail JÁ confirmado: sem chave de formato válido nem chega ao banco.
  if (finalidade === 'link' && !chaveDoMapaValida(chave)) return resp({ ok: false, motivo: 'pedido_invalido' }, 400)
  // O valor vai direto ao campo "to" do provedor: só endereço de formato seguro passa (SEC-07).
  if (!emailEntregavel(email)) return resp({ ok: false, motivo: 'email_invalido' }, 400)

  // Configuração antes de tudo: sem provedor, nada é gravado (não queima o limite da pessoa) e a resposta não depende do e-mail.
  const chaves = {
    RESEND_API_KEY: Deno.env.get('RESEND_API_KEY'),
    BREVO_API_KEY: Deno.env.get('BREVO_API_KEY'),
    CACA_EMAIL_FROM: Deno.env.get('CACA_EMAIL_FROM'),
    EMAIL_FROM: Deno.env.get('EMAIL_FROM'),
  }
  const url = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const escolha = provedorEscolhido(chaves)
  if (!escolha.provedor || !url || !servico) {
    console.error('caca_email_sem_configuracao faltam:', escolha.faltam.join(', '), url && servico ? '' : 'SUPABASE_*')
    return resp({ ok: false, motivo: 'email_indisponivel' })
  }
  const cfg: Config = { ...escolha, chaves }

  let emitido: { ok?: boolean; enviar?: boolean; limitado?: boolean; teto?: boolean; codigo?: string } = {}
  try {
    const eLink = finalidade === 'link'
    const r = await fetch(`${url}/rest/v1/rpc/${eLink ? 'mapa_link_validar_interno' : 'mapa_codigo_emitir_interno'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: servico, Authorization: `Bearer ${servico}` },
      body: JSON.stringify(eLink
        ? { p_edicao: edicao, p_email: email, p_chave: chave, p_ip: ip || null }
        : { p_edicao: edicao, p_email: email, p_finalidade: finalidade, p_chave: chave || null, p_ip: ip || null }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!r.ok) throw new Error('rpc ' + r.status)
    emitido = await r.json()
  } catch (_e) {
    // Falha do banco não depende de o e-mail ter mapa, então pode ser dita sem revelar nada.
    console.error('caca_email_rpc_falhou')
    return resp({ ok: false, motivo: 'falha_temporaria' })
  }

  // Teto de envios da hora atingido: ninguém recebe até a janela andar. Só o nome da finalidade vai ao log.
  if (emitido.teto) console.error('caca_codigo_teto_atingido', finalidade)

  if (emitido.enviar && (emitido.codigo || finalidade === 'link')) {
    const montado = finalidade === 'link' ? montarEmailLink(chave) : montarEmail(finalidade, emitido.codigo as string)
    if (montado) {
      // Responde já e envia em segundo plano: o tempo da resposta é o mesmo exista ou não mapa. Falha do provedor vai só ao log.
      const tarefa = enviar(cfg, email, montado)
      const rt = (globalThis as unknown as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime
      if (rt?.waitUntil) rt.waitUntil(tarefa)
      else await tarefa
    }
  }

  // Piso de tempo igual para todo pedido aceito (com ou sem mapa, com ou sem envio).
  await dormir(esperaParaPiso(Date.now() - t0))
  return resp(emitido.limitado ? { ok: true, limitado: true } : { ok: true })
})
