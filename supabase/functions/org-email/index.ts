/*
 * org-email — envia, pelo Brevo e do contato@, os e-mails avulsos que a organização enfileirou em `email_fila`.
 * Migration: supabase/migrations/20270206_email_fila.sql
 *
 * Entrada: POST sem corpo. A function NÃO aceita destinatário nem texto de fora; só a fila (escrita pela organização
 * como postgres) decide o que sai. Chamar à toa só esvazia a fila. Deploy com verify_jwt true (chamar com a chave anon).
 * Saída: { ok, enviados, falhas }. Log só com contagem e status HTTP, nunca endereço nem corpo.
 * Segredos: BREVO_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (do ambiente; nenhum valor no repositório).
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const REMETENTE = { name: 'Sweet & Coffee Week', email: 'contato@sweetcoffeeweek.com.br' }
const json = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, motivo: 'metodo_nao_permitido' }, 405)
  const url = Deno.env.get('SUPABASE_URL'), servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), brevo = Deno.env.get('BREVO_API_KEY')
  if (!url || !servico || !brevo) return json({ ok: false, motivo: 'email_indisponivel' }, 503)
  const h = { apikey: servico, Authorization: `Bearer ${servico}`, 'Content-Type': 'application/json' }

  // Reserva atômica: um UPDATE só, então duas chamadas ao mesmo tempo não pegam a mesma linha.
  const r = await fetch(`${url}/rest/v1/email_fila?estado=eq.pendente&select=id,para,assunto,html,texto`, {
    method: 'PATCH', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify({ estado: 'enviando' }),
  })
  if (!r.ok) return json({ ok: false, motivo: 'falha_temporaria' }, 503)
  const fila: { id: string; para: string; assunto: string; html: string; texto: string }[] = await r.json()

  let enviados = 0, falhas = 0
  for (const e of fila) {
    let fim: Record<string, unknown>
    try {
      const b = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': brevo, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: REMETENTE, replyTo: REMETENTE, to: [{ email: e.para }], subject: e.assunto, htmlContent: e.html, textContent: e.texto }),
        signal: AbortSignal.timeout(10_000),
      })
      const d = await b.json().catch(() => null)
      fim = b.ok
        ? { estado: 'enviado', enviado_em: new Date().toISOString(), provedor_id: d?.messageId ?? null, erro: null }
        : { estado: 'falhou', erro: `http_${b.status}${typeof d?.code === 'string' ? ':' + d.code : ''}` }
    } catch (_e) {
      fim = { estado: 'falhou', erro: 'rede_ou_timeout' }
    }
    fim.estado === 'enviado' ? enviados++ : falhas++
    await fetch(`${url}/rest/v1/email_fila?id=eq.${e.id}`, { method: 'PATCH', headers: h, body: JSON.stringify(fim) })
  }
  console.log('org_email', 'enviados', enviados, 'falhas', falhas)
  return json({ ok: true, enviados, falhas })
})
