/*
 * caca-email — envia o código de 6 dígitos da Caça aos Carimbos (confirmar e-mail / recuperar mapa).
 * Contrato: docs/cartoon-2026-2/15-caca-contrato-identidade.md
 *
 * Entrada (POST JSON): { edicao, email, finalidade: 'confirmar' | 'recuperar' }
 * Saída: SEMPRE { ok: true } (ou { ok: true, limitado: true }) quando o pedido foi aceito, exista ou não mapa para o e-mail.
 *        { ok: false, motivo: 'email_indisponivel' } se faltar configuração do provedor (nada é gravado nem enviado).
 *        { ok: false, motivo: 'pedido_invalido' } para corpo malformado.
 *
 * Proteção (verify_jwt = false, como enviar-formulario): validação de entrada, limite por e-mail e global DENTRO do banco
 * (mapa_codigo_emitir_interno) e resposta uniforme. O código em claro só existe aqui, em memória, e vai direto ao provedor.
 *
 * Variáveis de ambiente (NUNCA gravadas no repositório): RESEND_API_KEY, CACA_EMAIL_FROM (ou EMAIL_FROM, a mesma da
 * send-vote-email). SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetadas pelo Supabase.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const resp = (corpo: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function montarEmail(finalidade: string, codigo: string, apelido: string) {
  const recuperar = finalidade === 'recuperar'
  const assunto = recuperar
    ? 'Seu código para abrir o mapa da Caça aos Carimbos'
    : 'Confirme seu e-mail na Caça aos Carimbos'
  const acao = recuperar
    ? 'abrir de novo o seu mapa da Caça aos Carimbos neste aparelho'
    : 'confirmar o seu e-mail na Caça aos Carimbos'
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFF4EC;font-family:Helvetica,Arial,sans-serif;color:#3F1A0A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:20px;border:3px solid #4F2092;">
      <tr><td style="padding:28px 28px 8px;font-size:16px;line-height:1.6;">
        <p style="margin:0 0 14px;font-weight:700;font-size:18px;color:#870E2D;">Oi, ${esc(apelido)}!</p>
        <p style="margin:0 0 14px;">Use este código para ${acao}:</p>
        <p style="margin:0 0 14px;text-align:center;font-size:36px;letter-spacing:8px;font-weight:700;color:#4F2092;">${esc(codigo)}</p>
        <p style="margin:0 0 14px;">Ele vale por <strong>10 minutos</strong> e só pode ser usado uma vez.</p>
        ${recuperar ? '<p style="margin:0 0 14px;">Ao abrir o mapa com este código, o link antigo deste mapa deixa de funcionar.</p>' : ''}
        <p style="margin:0 0 14px;color:#6b5a50;font-size:14px;">Se não foi você quem pediu, ignore este e-mail. Ninguém acessa o seu mapa só com o seu e-mail.</p>
      </td></tr>
      <tr><td style="padding:0 28px 24px;font-size:13px;color:#6b5a50;">Sweet &amp; Coffee Week, edição Cartoon</td></tr>
    </table>
  </td></tr></table>
</body></html>`
  const texto = `Oi, ${apelido}!\n\nUse este código para ${acao}: ${codigo}\n\nEle vale por 10 minutos e só pode ser usado uma vez.${recuperar ? '\nAo abrir o mapa com este código, o link antigo deste mapa deixa de funcionar.' : ''}\n\nSe não foi você quem pediu, ignore este e-mail.\n\nSweet & Coffee Week, edição Cartoon`
  return { assunto, html, texto }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return resp({ ok: false, motivo: 'metodo_nao_permitido' }, 405)

  let entrada: Record<string, unknown>
  try { entrada = await req.json() } catch { return resp({ ok: false, motivo: 'pedido_invalido' }, 400) }

  const edicao = String(entrada.edicao ?? '').slice(0, 20)
  const email = String(entrada.email ?? '').trim().toLowerCase()
  const finalidade = String(entrada.finalidade ?? '')
  if (!edicao || (finalidade !== 'confirmar' && finalidade !== 'recuperar') || email.length > 254) {
    return resp({ ok: false, motivo: 'pedido_invalido' }, 400)
  }

  // Configuração antes de tudo: sem provedor, nada é gravado (não queima o limite da pessoa) e a resposta não depende do e-mail.
  const chaveResend = Deno.env.get('RESEND_API_KEY')
  const remetente = Deno.env.get('CACA_EMAIL_FROM') ?? Deno.env.get('EMAIL_FROM')
  const url = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!chaveResend || !remetente || !url || !servico) return resp({ ok: false, motivo: 'email_indisponivel' })

  let emitido: { ok?: boolean; enviar?: boolean; limitado?: boolean; codigo?: string; apelido?: string } = {}
  try {
    const r = await fetch(`${url}/rest/v1/rpc/mapa_codigo_emitir_interno`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: servico, Authorization: `Bearer ${servico}` },
      body: JSON.stringify({ p_edicao: edicao, p_email: email, p_finalidade: finalidade }),
    })
    if (!r.ok) throw new Error('rpc ' + r.status)
    emitido = await r.json()
  } catch (_e) {
    console.error('caca_email_rpc_falhou')
    return resp({ ok: false, motivo: 'email_indisponivel' })
  }

  if (emitido.enviar && emitido.codigo) {
    const { assunto, html, texto } = montarEmail(finalidade, emitido.codigo, emitido.apelido ?? 'Sweet Lover')
    try {
      const e = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${chaveResend}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: remetente, to: [email], subject: assunto, html, text: texto }),
        signal: AbortSignal.timeout(10_000),
      })
      // Falha do provedor NÃO muda a resposta (senão revelaria que o e-mail tem mapa). Fica só no log, sem dados pessoais.
      if (!e.ok) console.error('caca_email_provedor_status', e.status)
    } catch (_e) {
      console.error('caca_email_provedor_falhou')
    }
  }

  return resp(emitido.limitado ? { ok: true, limitado: true } : { ok: true })
})
