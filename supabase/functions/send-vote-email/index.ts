// =============================================================================
// Edge Function: send-vote-email
// Envia o e-mail de agradecimento após o voto no Sweet Awards.
// Garante 1 envio por e-mail (dedup na tabela public.vote_emails).
//
// Deploy:
//   supabase functions deploy send-vote-email
//
// Secrets necessárias (Dashboard → Edge Functions → send-vote-email → Secrets,
// ou: supabase secrets set CHAVE=valor):
//   RESEND_API_KEY   -> chave da API Resend (https://resend.com)
//   EMAIL_FROM       -> remetente verificado, ex: "Sweet & Coffee Week <ola@sweetcoffeeweek.com.br>"
// Já disponíveis no ambiente da função (injetadas pelo Supabase):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const emailOk = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((e || '').trim())

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let payload: { email?: string; nome?: string }
  try { payload = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

  const email = (payload.email || '').trim().toLowerCase()
  const nome = (payload.nome || '').trim()
  if (!emailOk(email)) return json({ error: 'email_invalido' }, 400)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const EMAIL_FROM = Deno.env.get('EMAIL_FROM')

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Dedup: tenta marcar como enviado. Se já existe, não reenvia.
  const { error: insErr } = await supabase
    .from('vote_emails')
    .insert({ email })
  if (insErr) {
    // 23505 = unique_violation → já recebeu e-mail antes. Sucesso silencioso.
    if ((insErr as { code?: string }).code === '23505') return json({ skipped: 'already_sent' })
    return json({ error: 'db_error', detail: insErr.message }, 500)
  }

  // Sem provedor configurado ainda → marca como "pronto" sem enviar.
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    return json({ queued: true, note: 'email_provider_nao_configurado' })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email],
      subject: 'Seu voto foi recebido, Sweet Lover 💛',
      html: renderEmail(nome),
    }),
  })

  if (!res.ok) {
    // Falhou no envio → libera o e-mail pra nova tentativa futura.
    await supabase.from('vote_emails').delete().eq('email', email)
    return json({ error: 'resend_error', detail: await res.text() }, 502)
  }

  return json({ sent: true })
})

// ── Template HTML — identidade Sweet & Coffee Week Lovers ────────────────────
function renderEmail(nome: string): string {
  const ola = nome ? `Oi, ${nome.split(' ')[0]}!` : 'Oi, Sweet Lover!'
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=JetBrains+Mono:wght@500&display=swap');
</style>
</head>
<body style="margin:0;padding:0;background:#FFF4EC;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF4EC;">
    <tr><td align="center" style="padding:28px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFF4EC;border-radius:26px;overflow:hidden;border:3px solid #4F2092;">

        <!-- Hero roxo: logo + eyebrow + título sofia/Baloo -->
        <tr><td style="background:#4F2092;padding:34px 30px 32px;text-align:center;">
          <img src="https://www.sweetcoffeeweek.com.br/images/email-logo-lovers.png" alt="Sweet &amp; Coffee Week Lovers" width="118" height="117" style="display:inline-block;width:118px;height:auto;border:0;" />
          <div style="margin:16px 0 14px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:#F5B800;">Sweet Awards · 16ª edição</div>
          <h1 style="margin:0;font-family:'Baloo 2','DM Sans',sans-serif;font-weight:800;font-size:38px;line-height:1.02;text-transform:uppercase;color:#FFFFFF;">Seu voto foi recebido</h1>
        </td></tr>

        <!-- Divisória rosa -->
        <tr><td style="height:6px;background:#F20567;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Corpo creme -->
        <tr><td style="padding:30px 32px 6px;color:#3F1A0A;font-size:16px;line-height:1.65;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
          <p style="margin:0 0 15px;font-family:'Baloo 2','DM Sans',sans-serif;font-weight:700;font-size:20px;color:#870E2D;">${ola}</p>
          <p style="margin:0 0 15px;">Recebemos sua avaliação no <strong>Sweet Awards</strong>.</p>
          <p style="margin:0 0 15px;">Obrigado por participar do <strong>Sweet &amp; Coffee Week Lovers</strong> e ajudar a escolher os destaques desta edição. Sua opinião faz parte da história do festival.</p>
          <p style="margin:0 0 15px;">Continue aproveitando os combos, visitando os participantes e compartilhando seus momentos com <a href="https://instagram.com/sweetcoffeeweek" style="color:#D63648;font-weight:700;text-decoration:none;">@sweetcoffeeweek</a>.</p>
          <p style="margin:0 0 15px;">E fica de olho: ainda este ano, uma nova edição do <strong>Sweet &amp; Coffee Week</strong> vem aí.</p>
        </td></tr>

        <!-- Botão CTA -->
        <tr><td style="padding:16px 30px 6px;text-align:center;">
          <a href="https://www.sweetcoffeeweek.com.br/#/lovers/participantes" style="display:inline-block;font-family:'Baloo 2','DM Sans',sans-serif;background:#D63648;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:15px 32px;border-radius:999px;">Ver os participantes →</a>
        </td></tr>

        <!-- Assinatura -->
        <tr><td style="padding:20px 32px 30px;color:#3F1A0A;font-size:16px;line-height:1.5;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
          <p style="margin:0;">Com carinho,</p>
          <p style="margin:4px 0 0;font-family:'Baloo 2','DM Sans',sans-serif;font-weight:700;color:#870E2D;">Eline Eulália e equipe Sweet &amp; Coffee Week</p>
        </td></tr>

        <!-- Rodapé roxo -->
        <tr><td style="background:#4F2092;padding:20px 28px;text-align:center;">
          <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:1px;color:#FFFFFF;">@sweetcoffeeweek</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#F5B800;margin-top:6px;">sweetcoffeeweek.com.br</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
