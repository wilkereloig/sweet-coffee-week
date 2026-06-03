// =============================================================================
// Edge Function: resend-webhook
// Recebe eventos da Resend (https://resend.com → Webhooks) e marca e-mails que
// voltaram (bounce) ou foram denunciados como spam. Esses e-mails aparecem na
// aba "Suspeitos" do painel (categoria e-mail voltou).
//
// Deploy:
//   supabase functions deploy resend-webhook --no-verify-jwt
//   (ou no Dashboard: Edge Functions → resend-webhook → desligar "Verify JWT")
//
// Secret necessária:
//   RESEND_WEBHOOK_SECRET  -> "Signing Secret" do webhook na Resend (começa com whsec_)
// Já injetadas pelo Supabase:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Configurar na Resend: Webhooks → Add Endpoint → URL desta função →
//   eventos: email.bounced, email.complained.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// Verifica a assinatura svix (padrão usado pela Resend).
async function verifySvix(secret: string, id: string, ts: string, body: string, sigHeader: string): Promise<boolean> {
  if (!secret || !id || !ts || !sigHeader) return false
  const key = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const keyBytes = Uint8Array.from(atob(key), (c) => c.charCodeAt(0))
  const signedContent = `${id}.${ts}.${body}`
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(signedContent))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
  // svix-signature: "v1,<base64> v1,<base64> ..." — basta uma bater
  return sigHeader.split(' ').some((part) => part.split(',')[1] === expected)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const body = await req.text()
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET') || ''
  const ok = await verifySvix(
    secret,
    req.headers.get('svix-id') || '',
    req.headers.get('svix-timestamp') || '',
    body,
    req.headers.get('svix-signature') || '',
  )
  if (!ok) return json({ error: 'assinatura_invalida' }, 401)

  let evt: { type?: string; data?: { to?: string[] | string; email?: string } }
  try { evt = JSON.parse(body) } catch { return json({ error: 'invalid_json' }, 400) }

  // Só nos importam bounce e denúncia de spam.
  if (evt.type !== 'email.bounced' && evt.type !== 'email.complained') {
    return json({ ignored: evt.type })
  }

  // Resend manda data.to (array) — normaliza para lista de e-mails.
  const raw = evt.data?.to ?? evt.data?.email ?? []
  const emails = (Array.isArray(raw) ? raw : [raw]).map((e) => String(e).trim().toLowerCase()).filter(Boolean)
  if (!emails.length) return json({ ignored: 'sem_email' })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // upsert: garante a linha mesmo se o e-mail ainda não estiver registrada.
  const rows = emails.map((email) => ({ email, status: 'bounced', bounced_at: new Date().toISOString() }))
  const { error } = await supabase.from('vote_emails').upsert(rows, { onConflict: 'email' })
  if (error) return json({ error: 'db_error', detail: error.message }, 500)

  return json({ marked: emails.length })
})
