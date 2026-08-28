// =============================================================================
// Edge Function: regerar-senha-conta
// D1 do plano de funções da organização (27/08/2026): saída pra quando uma
// conta nominal perde a senha, sem depender de SMTP. Mesmo padrão de
// criar-conta-organizacao — a senha nasce aqui, entregue uma vez, com
// `deve_trocar_senha` religado no fim.
//
// POR QUE Edge Function e não RPC pura:
//   Trocar a senha no Auth exige a chave de serviço (auth.admin.updateUserById),
//   e ⛔ service_role nunca entra em painel-app/ — o navegador de quem abrir o
//   painel não pode ter isso. Manipular auth.users direto por SQL (crypt() em
//   encrypted_password) contornaria o Auth em vez de usá-lo, e este projeto já
//   tem o padrão certo pronto: as três Edge Functions de criação de conta.
//
// Escopo: só CONTA DE ORGANIZAÇÃO. Marca troca a própria senha depois de
// entrar (DefinirSenha.jsx) — não é este caminho.
//
// Deploy: supabase functions deploy regerar-senha-conta --no-verify-jwt
//   (a porta é `pode`, não um JWT)
//
// Entrada (POST JSON): { secret, user_id }
// Saída: { ok, user_id, login, senha, troca_obrigatoria }
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Mesmo alfabeto de criar-conta-organizacao/criar-acesso-marca — sem I, O, 0, 1:
// a senha vai ser lida e digitada à mão.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function gerarSenha(): string {
  const bytes = new Uint32Array(12)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length])
  return 'SCW-' + chars.slice(0, 4).join('') + '-' +
                  chars.slice(4, 8).join('') + '-' +
                  chars.slice(8, 12).join('')
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'method_not_allowed' }, 405)

  let payload: { secret?: string; user_id?: string }
  try { payload = await req.json() } catch { return json({ erro: 'invalid_json' }, 400) }

  const secret = (payload.secret || '').trim()
  const userId = (payload.user_id || '').trim()

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // ── 1. AUTORIZAR ANTES DE QUALQUER COISA ───────────────────────────────────
  // acesso.gerir — a mesma ação de criar-conta-organizacao. Regerar senha de
  // outra pessoa é gestão de acesso, não trabalho do dia a dia.
  const { data: autorizado, error: authErr } = await admin.rpc('pode', {
    p_secret: secret, p_acao: 'acesso.gerir',
  })
  if (authErr) return json({ erro: 'db_error', detalhe: authErr.message }, 500)
  if (autorizado !== true) return json({ erro: 'nao_autorizado' }, 401)

  // ── 2. Validar o alvo ANTES de tocar no Auth ───────────────────────────────
  if (!userId) return json({ erro: 'user_id_ausente' }, 422)

  // Só reseta conta de ORGANIZAÇÃO. Sem este filtro, o mesmo endpoint
  // resetaria senha de marca — escopo errado, e a marca já tem o próprio
  // caminho (DefinirSenha.jsx, depois de entrar).
  const { data: perfil, error: perfilErr } = await admin
    .from('perfis').select('user_id, papel').eq('user_id', userId).maybeSingle()
  if (perfilErr) return json({ erro: 'db_error', detalhe: perfilErr.message }, 500)
  if (!perfil || perfil.papel !== 'organizacao') {
    return json({ erro: 'conta_nao_encontrada' }, 404)
  }

  const { data: usuario, error: usuarioErr } = await admin.auth.admin.getUserById(userId)
  if (usuarioErr || !usuario?.user) return json({ erro: 'conta_nao_encontrada' }, 404)

  // ── 3. Religa a trava de primeiro uso ANTES de trocar a senha ──────────────
  // Ordem importa: se isto falhar, a senha ANTIGA continua válida e repetir a
  // chamada resolve. Na ordem inversa (trocar a senha primeiro), uma falha
  // aqui devolveria erro pro admin com a senha nova já ativa no Auth e nunca
  // mostrada a ninguém — conta com senha que só o gerador conheceu.
  const { error: trocaErr } = await admin.from('perfis')
    .update({ deve_trocar_senha: true }).eq('user_id', userId)
  if (trocaErr) return json({ erro: 'trava_nao_religada', detalhe: trocaErr.message }, 500)

  // ── 4. Nova senha ────────────────────────────────────────────────────────
  const novaSenha = gerarSenha()
  const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password: novaSenha })
  if (updErr) return json({ erro: 'senha_nao_atualizada', detalhe: updErr.message }, 500)

  await admin.from('auditoria').insert({
    acao: 'regerar_senha_conta', alvo_tabela: 'perfis', alvo_id: userId, detalhe: {},
  })

  // ── 5. As credenciais, uma vez só ──────────────────────────────────────────
  // Igual à criação: a senha não fica gravada em lugar nenhum além do hash do
  // Auth. Reabrir a tela depois não a mostra de novo — se sumiu, gera-se outra.
  return json({ ok: true, user_id: userId, login: usuario.user.email, senha: novaSenha, troca_obrigatoria: true })
})
