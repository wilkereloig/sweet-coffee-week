// =============================================================================
// Edge Function: sync-brevo-contacts
// Importa para uma lista do Brevo os e-mails de quem votou no Sweet Awards
// E consentiu comunicação (votos.aceita_comunicacao = true). Dedup por e-mail.
// Usado para disparar a Pesquisa Sweet Lovers por e-mail/campanha.
//
// Deploy:
//   supabase functions deploy sync-brevo-contacts
//
// Secrets (Dashboard → Edge Functions → sync-brevo-contacts → Secrets,
// ou: supabase secrets set CHAVE=valor):
//   BREVO_API_KEY   -> chave da API Brevo (NUNCA no frontend)
//   BREVO_LIST_ID   -> ID numérico da lista (ex.: 3)
//   SYNC_SECRET     -> segredo p/ autorizar a chamada (escolha um valor forte)
// Já injetadas pelo Supabase:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Chamada (POST), com o segredo no header:
//   curl -X POST "{SUPA_URL}/functions/v1/sync-brevo-contacts" \
//        -H "x-sync-secret: SEU_SYNC_SECRET"
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const emailOk = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((e || '').trim())

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const SYNC_SECRET = Deno.env.get('SYNC_SECRET')
  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
  const BREVO_LIST_ID = Number(Deno.env.get('BREVO_LIST_ID') || '')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // ── auth: segredo obrigatório ──
  const provided = req.headers.get('x-sync-secret') || ''
  if (!SYNC_SECRET || provided !== SYNC_SECRET) return json({ error: 'unauthorized' }, 401)

  if (!BREVO_API_KEY || !BREVO_LIST_ID) {
    return json({ error: 'config_incompleta', need: ['BREVO_API_KEY', 'BREVO_LIST_ID'] }, 500)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // ── e-mails consentidos (LGPD: só aceita_comunicacao = true) ──
  const { data, error } = await supabase
    .from('votos')
    .select('email, nome')
    .eq('aceita_comunicacao', true)
    .not('email', 'is', null)
  if (error) return json({ error: 'db_error', detail: error.message }, 500)

  // dedup por e-mail; guarda o 1º nome não-vazio encontrado
  const byEmail = new Map<string, string>()
  for (const row of data || []) {
    const email = (row.email || '').trim().toLowerCase()
    if (!emailOk(email)) continue
    const nome = (row.nome || '').trim()
    if (!byEmail.has(email)) byEmail.set(email, nome)
    else if (!byEmail.get(email) && nome) byEmail.set(email, nome)
  }

  const contatos = [...byEmail.entries()].map(([email, nome]) => ({
    email,
    attributes: nome ? { FIRSTNAME: nome.split(' ')[0] } : {},
  }))

  if (contatos.length === 0) return json({ imported: 0, note: 'nenhum_email_consentido' })

  // ── importa no Brevo (cria/atualiza, adiciona à lista) ──
  const res = await fetch('https://api.brevo.com/v3/contacts/import', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listIds: [BREVO_LIST_ID],
      updateExistingContacts: true,
      emptyContactsAttributes: false,
      jsonBody: contatos,
    }),
  })

  if (!res.ok) {
    return json({ error: 'brevo_error', status: res.status, detail: await res.text() }, 502)
  }

  // Brevo retorna { processId } — a importação roda async do lado deles.
  const out = await res.json().catch(() => ({}))
  return json({ ok: true, enviados: contatos.length, listId: BREVO_LIST_ID, brevo: out })
})
