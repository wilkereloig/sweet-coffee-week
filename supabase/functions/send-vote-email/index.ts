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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5B800;font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5B800;">
    <tr><td align="center" style="padding:28px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFF1E6;border-radius:28px;overflow:hidden;border:3px solid #870E2D;">

        <!-- Topo amarelo + stickers + logo -->
        <tr><td style="background:#F5B800;padding:24px 28px 20px;text-align:center;">
          <div style="font-size:24px;line-height:1;letter-spacing:2px;margin-bottom:12px;">☕ 🍩 💛 📸 🏆</div>
          <img src="https://www.sweetcoffeeweek.com.br/images/email-logo-lovers.png" alt="Sweet &amp; Coffee Week Lovers" width="120" height="119" style="display:inline-block;width:120px;height:auto;border:0;" />
        </td></tr>

        <!-- Título grande caixa alta -->
        <tr><td style="padding:30px 28px 8px;text-align:center;">
          <h1 style="margin:0;font-size:34px;line-height:1.05;font-weight:900;text-transform:uppercase;color:#D63648;letter-spacing:-.5px;">
            Seu voto<br>foi recebido! 💛
          </h1>
        </td></tr>

        <!-- Corpo -->
        <tr><td style="padding:14px 30px 6px;color:#3F1A0A;font-size:16px;line-height:1.6;">
          <p style="margin:0 0 14px;font-weight:700;">${ola}</p>
          <p style="margin:0 0 14px;">Recebemos sua avaliação no <strong>Sweet Awards</strong>.</p>
          <p style="margin:0 0 14px;">Obrigado por participar do <strong>Sweet &amp; Coffee Week Lovers</strong> e ajudar a escolher os destaques desta edição. Sua opinião faz parte da história do festival.</p>
          <p style="margin:0 0 14px;">Continue aproveitando os combos, visitando os participantes e compartilhando seus momentos com <a href="https://instagram.com/sweetcoffeeweek" style="color:#D63648;font-weight:700;text-decoration:none;">@sweetcoffeeweek</a>.</p>
          <p style="margin:0 0 14px;">E fica de olho: ainda este ano, uma nova edição do <strong>Sweet &amp; Coffee Week</strong> vem aí. ✨</p>
        </td></tr>

        <!-- Botão CTA -->
        <tr><td style="padding:8px 30px 4px;text-align:center;">
          <a href="https://www.sweetcoffeeweek.com.br/#/lovers/participantes" style="display:inline-block;background:#D63648;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 28px;border-radius:999px;">Ver os participantes →</a>
        </td></tr>

        <!-- Assinatura -->
        <tr><td style="padding:8px 30px 26px;color:#3F1A0A;font-size:16px;line-height:1.5;">
          <p style="margin:0;">Com carinho,</p>
          <p style="margin:4px 0 0;font-weight:800;color:#870E2D;">Eline Eulália e equipe Sweet &amp; Coffee Week</p>
        </td></tr>

        <!-- Rodapé sticker -->
        <tr><td style="background:#D63648;padding:16px 28px;text-align:center;">
          <div style="font-size:20px;letter-spacing:3px;">🍰 ☕ 💛 🏆 📸</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
