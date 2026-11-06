// =============================================================================
// Edge Function: caca-delivery
// Assina o ENVIO da imagem de um pedido de carimbo de delivery (print ou foto do pedido). (06/11/2026)
//
// O bucket `caca-delivery` é PRIVADO e sem policy: só service_role escreve. O visitante não tem login; o que o autoriza é a chave do
// mapa dele, conferida pelo banco em `caca_delivery_imagem_reservar` (dono do pedido, pedido pendente, sem imagem anterior, até 5
// reservas). O NOME do arquivo nasce no banco (<edição>/<pedido>/<uuid>.<ext>): o navegador nunca escolhe caminho. Os bytes vão direto
// do navegador ao Storage pela URL assinada; depois o navegador confirma com `caca_delivery_anexar`, que confere o objeto e o tamanho.
//
// Entrada (POST JSON): { acao: 'subir', chave, pedido (uuid), ext: 'jpg' | 'png' | 'webp' }
// Saída:  { ok: true, url, path }   → o navegador faz PUT nessa url com o arquivo (Content-Type da imagem)
//         { ok: false, motivo }     → mapa_desconhecido · pedido_nao_encontrado · transicao_invalida · limite_imagem · formato_invalido ·
//                                     pedido_invalido · falha_temporaria
// Nada daqui grava chave, caminho ou dado da pessoa em log.
//
// Deploy: supabase functions deploy caca-delivery --no-verify-jwt   (auth própria: a chave do mapa, no corpo)
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MOTIVO = /^[a-z][a-z0-9_]{1,59}$/

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, motivo: 'pedido_invalido' }, 405)

  let p: { acao?: string; chave?: string; pedido?: string; ext?: string }
  try { p = await req.json() } catch { return json({ ok: false, motivo: 'pedido_invalido' }, 400) }
  const chave = String(p.chave || '')
  const pedido = String(p.pedido || '')
  const ext = String(p.ext || '').toLowerCase()
  if (p.acao !== 'subir' || chave.length < 16 || chave.length > 128 || !UUID.test(pedido) || !['jpg', 'png', 'webp'].includes(ext)) {
    return json({ ok: false, motivo: 'pedido_invalido' }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data, error } = await admin.rpc('caca_delivery_imagem_reservar', { p_chave: chave, p_id: pedido, p_ext: ext })
  if (error) return json({ ok: false, motivo: 'falha_temporaria' }, 503)
  if (!data || data.ok !== true || typeof data.path !== 'string') {
    return json({ ok: false, motivo: typeof data?.motivo === 'string' && MOTIVO.test(data.motivo) ? data.motivo : 'falha_temporaria' }, 200)
  }

  const { data: ass, error: assErr } = await admin.storage.from('caca-delivery').createSignedUploadUrl(data.path)
  if (assErr || !ass?.signedUrl) return json({ ok: false, motivo: 'falha_temporaria' }, 503)
  return json({ ok: true, url: ass.signedUrl, path: data.path })
})
