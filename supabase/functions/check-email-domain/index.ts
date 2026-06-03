// =============================================================================
// Edge Function: check-email-domain
// Verifica se o DOMÍNIO do e-mail existe e recebe e-mail (registro MX, ou A/AAAA
// como fallback). Usada pelo formulário de votação para avisar quando a pessoa
// digita um domínio inexistente (ex.: @gmaill.xyz). NÃO prova posse do e-mail.
//
// Deploy:
//   supabase functions deploy check-email-domain --no-verify-jwt
//
// Entrada (POST JSON): { "email": "alguem@dominio.com" }  (ou { "domain": "..." })
// Saída: { "valid": true|false, "domain": "dominio.com" }
// =============================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

async function domainResolves(domain: string): Promise<boolean> {
  // MX é o sinal mais forte (domínio recebe e-mail). Sem MX, tenta A/AAAA.
  try {
    const mx = await Deno.resolveDns(domain, 'MX')
    if (mx && mx.length > 0) return true
  } catch { /* sem MX — tenta A */ }
  try {
    const a = await Deno.resolveDns(domain, 'A')
    if (a && a.length > 0) return true
  } catch { /* sem A — tenta AAAA */ }
  try {
    const aaaa = await Deno.resolveDns(domain, 'AAAA')
    if (aaaa && aaaa.length > 0) return true
  } catch { /* nada */ }
  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let payload: { email?: string; domain?: string }
  try { payload = await req.json() } catch { return json({ error: 'invalid_json' }, 400) }

  const domain = (payload.domain || (payload.email || '').split('@')[1] || '').trim().toLowerCase()
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return json({ valid: false, domain })
  }

  const valid = await domainResolves(domain)
  return json({ valid, domain })
})
