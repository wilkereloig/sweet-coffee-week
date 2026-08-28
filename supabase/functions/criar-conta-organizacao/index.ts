// =============================================================================
// Edge Function: criar-conta-organizacao
// O administrador cria a conta nominal de quem trabalha na organização, já com
// função. Fecha o §1.2 do briefing: "contas por função, criadas por um
// administrador".
//
// POR QUE Edge Function e não RPC:
//   Criar usuário no Auth exige a chave de serviço, e ⛔ `service_role` nunca
//   entra em public/ — arquivo estático roda no navegador de quem abrir a
//   página. A chave vive aqui, em variável de ambiente.
//
// A DIFERENÇA PARA `criar-acesso-marca`, e ela importa:
//   a marca entra pelo NOME do estabelecimento, num endereço sintético que não
//   recebe mensagem. Aqui o e-mail é REAL — é a pessoa da equipe, e ela tem
//   caixa de entrada. Por isso não há slugificação, não há domínio interno, e o
//   e-mail digitado é o login.
//
// O que NÃO muda: a senha é gerada aqui, entregue uma vez, e nasce com
// `deve_trocar_senha`. Mesma trava, mesmo motivo — o que for entregue por
// mensagem vale para um login só.
//
// Deploy: supabase functions deploy criar-conta-organizacao --no-verify-jwt
//   (--no-verify-jwt porque a porta de sempre foi o secret no CORPO, nunca o
//    gateway. Fase 4 do plano de funções da organização, 28/08/2026: sem
//    secret, aceita o JWT da sessão nominal no cabeçalho Authorization —
//    quem valida é este código, via pode()/pode_por_user, não o gateway.)
//
// Entrada (POST JSON): { secret, email, funcao } — ou, sem secret, o JWT da
// sessão nominal em Authorization: Bearer <token>.
// Saída: { ok, user_id, login, senha, troca_obrigatoria }
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Alfabeto sem I, O, 0 e 1: a senha vai ser lida e digitada à mão. Confundir
// zero com O é o jeito mais rápido de gerar um chamado que parece "não funciona".
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

  let payload: { secret?: string; email?: string; funcao?: string }
  try { payload = await req.json() } catch { return json({ erro: 'invalid_json' }, 400) }

  const secret = (payload.secret || '').trim()
  const email = (payload.email || '').trim().toLowerCase()
  const funcao = (payload.funcao || '').trim()

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // ── 1. AUTORIZAR ANTES DE QUALQUER COISA ───────────────────────────────────
  // `acesso.gerir`, que só o administrador tem. Curadoria e produção não criam
  // conta — é a diferença entre "mexe no trabalho" e "mexe em quem trabalha".
  //
  // Duas portas (Fase 4, 28/08/2026): com `secret`, é a senha única de
  // sempre. Sem `secret`, é o JWT da sessão nominal no cabeçalho —
  // `admin.auth.getUser` verifica esse token (roda com service_role, aceita
  // qualquer JWT emitido pelo próprio projeto) e `pode_por_user` decide pela
  // mesma tabela perfis/permissões que `pode()` usa pra sessão nominal.
  let autorizado = false
  if (secret) {
    const { data, error: authErr } = await admin.rpc('pode', { p_secret: secret, p_acao: 'acesso.gerir' })
    if (authErr) return json({ erro: 'db_error', detalhe: authErr.message }, 500)
    autorizado = data === true
  } else {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
    const { data: userRes, error: jwtErr } = jwt ? await admin.auth.getUser(jwt) : { data: null, error: null }
    // gotrue-js não lança em falha de rede — devolve { data: { user: null }, error }.
    // Sem distinguir, um blip do serviço de auth viraria "sessão não vale mais"
    // (401), igual a um token realmente inválido — achado de revisão adversarial.
    if (jwtErr && jwtErr.name === 'AuthRetryableFetchError') {
      return json({ erro: 'auth_indisponivel', detalhe: jwtErr.message }, 503)
    }
    if (userRes?.user) {
      const { data, error: authErr } = await admin.rpc('pode_por_user', { p_user: userRes.user.id, p_acao: 'acesso.gerir' })
      if (authErr) return json({ erro: 'db_error', detalhe: authErr.message }, 500)
      autorizado = data === true
    }
  }
  if (autorizado !== true) return json({ erro: 'nao_autorizado' }, 401)

  // ── 2. Validar antes de tocar no Auth ──────────────────────────────────────
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ erro: 'email_invalido' }, 422)
  }

  // A função vem da TABELA, não de uma lista escrita aqui. Acrescentar uma
  // quinta função amanhã é inserir uma linha; uma lista no código seria a
  // segunda fonte de verdade que o CLAUDE.md §5.2 proíbe.
  const { data: fn, error: fnErr } = await admin
    .from('funcoes').select('codigo').eq('codigo', funcao).maybeSingle()
  if (fnErr) return json({ erro: 'db_error', detalhe: fnErr.message }, 500)
  if (!fn) return json({ erro: 'funcao_invalida', funcao }, 422)

  // ── 3. Usuário ─────────────────────────────────────────────────────────────
  const senhaInicial = gerarSenha()
  const { data: criado, error: criarErr } = await admin.auth.admin.createUser({
    email,
    password: senhaInicial,
    // `email_confirm: true`: quem confirma que a pessoa é da equipe é o
    // administrador, ao criar. Não há fluxo de confirmação por e-mail aqui.
    email_confirm: true,
    user_metadata: { papel: 'organizacao', funcao },
  })
  if (criarErr || !criado?.user) {
    return json({ erro: 'usuario_nao_criado', detalhe: criarErr?.message || '' }, 409)
  }
  const userId = criado.user.id

  // ── 4. Perfil, com a trava de primeiro uso ─────────────────────────────────
  // ⚠️ A senha vai ser entregue por mensagem e vai FICAR no histórico dela.
  // `deve_trocar_senha` é o que transforma isso num bilhete de uso único.
  // ⛔ Desligar reabre o risco inteiro.
  const { error: perfilErr } = await admin.from('perfis').upsert({
    user_id: userId, papel: 'organizacao', funcao, ativo: true, deve_trocar_senha: true,
  }, { onConflict: 'user_id' })

  if (perfilErr) {
    // Conta no Auth sem perfil é conta que autentica e não pode nada — e que
    // ninguém vê na lista para consertar. Desfaz e reporta.
    await admin.auth.admin.deleteUser(userId)
    return json({ erro: 'perfil_falhou', detalhe: perfilErr.message }, 500)
  }

  await admin.from('auditoria').insert({
    acao: 'criar_conta_organizacao', alvo_tabela: 'perfis', alvo_id: userId,
    detalhe: { email, funcao },
  })

  // ── 5. As credenciais, uma vez só ──────────────────────────────────────────
  // A senha não fica gravada em lugar nenhum: o banco só tem o hash do Auth.
  // Reabrir a tela depois não a mostra de novo — se sumiu, gera-se outra.
  return json({ ok: true, user_id: userId, login: email, senha: senhaInicial, troca_obrigatoria: true })
})
