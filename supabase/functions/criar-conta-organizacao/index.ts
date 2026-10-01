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
//   a marca entra pelo NOME do estabelecimento, slugificado. Aqui o login é um
//   USUÁRIO escolhido pelo administrador e VALIDADO, não convertido (ver
//   "SEM E-MAIL" abaixo); contas antigas com e-mail real seguem valendo.
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
// SEM E-MAIL (01/10/2026, pedido do Wilker): o normal agora é `usuario`
// (ex.: ana.producao). A conta nasce em <usuario>@DOMINIO_EQUIPE, endereço
// interno que não recebe mensagem — mesmo arranjo da marca. `email` real
// segue aceito para quem preferir. ⚠️ DOMINIO_EQUIPE e a regra do usuário têm
// cópia em src/lib/orgAccess.js (o login monta o mesmo endereço);
// tests/orgAccess.test.mjs compara as duas.
//
// Entrada (POST JSON): { secret, usuario | email, funcao, nome } — ou, sem
// secret, o JWT da sessão nominal em Authorization: Bearer <token>.
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

const DOMINIO_EQUIPE = 'equipe.sweetcoffeeweek.com.br'
const USUARIO_VALIDO = /^[a-z0-9]+([._-][a-z0-9]+)*$/

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'method_not_allowed' }, 405)

  let payload: { secret?: string; usuario?: string; email?: string; funcao?: string; nome?: string }
  try { payload = await req.json() } catch { return json({ erro: 'invalid_json' }, 400) }

  const secret = (payload.secret || '').trim()
  const usuario = (payload.usuario || '').trim().toLowerCase()
  const email = usuario ? usuario + '@' + DOMINIO_EQUIPE : (payload.email || '').trim().toLowerCase()
  const funcao = (payload.funcao || '').trim()
  // Nome de exibição (histórico, "Enviado por"). Opcional: sem ele, o e-mail.
  const nome = (payload.nome || '').trim().slice(0, 80) || null

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
  // Quem criou, para a autoria. Senha única = null = "Acesso compartilhado".
  let atorId: string | null = null
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
      atorId = userRes.user.id
    }
  }
  if (autorizado !== true) return json({ erro: 'nao_autorizado' }, 401)

  // ── 2. Validar antes de tocar no Auth ──────────────────────────────────────
  if (usuario && (usuario.length < 3 || usuario.length > 30 || !USUARIO_VALIDO.test(usuario))) {
    return json({ erro: 'usuario_invalido' }, 422)
  }
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
    // Endereço repetido é o caso comum (usuário já em uso): erro próprio,
    // para a tela dizer "escolha outro" em vez de um genérico.
    // Qualquer outra falha (limite, Auth fora) é 502, não 409: não é "já existe".
    const repetido = (criarErr as { code?: string } | null)?.code === 'email_exists' ||
      /already|registered|exists/i.test(criarErr?.message || '')
    return json({ erro: repetido ? 'usuario_ja_existe' : 'usuario_nao_criado', detalhe: criarErr?.message || '' }, repetido ? 409 : 502)
  }
  const userId = criado.user.id

  // ── 4. Perfil, com a trava de primeiro uso ─────────────────────────────────
  // ⚠️ A senha vai ser entregue por mensagem e vai FICAR no histórico dela.
  // `deve_trocar_senha` é o que transforma isso num bilhete de uso único.
  // ⛔ Desligar reabre o risco inteiro.
  const { error: perfilErr } = await admin.from('perfis').upsert({
    user_id: userId, papel: 'organizacao', funcao, nome, ativo: true, deve_trocar_senha: true,
  }, { onConflict: 'user_id' })

  if (perfilErr) {
    // Conta no Auth sem perfil é conta que autentica e não pode nada — e que
    // ninguém vê na lista para consertar. Desfaz e reporta.
    await admin.auth.admin.deleteUser(userId)
    return json({ erro: 'perfil_falhou', detalhe: perfilErr.message }, 500)
  }

  await admin.from('auditoria').insert({
    ator_user_id: atorId,
    acao: 'criar_conta_organizacao', alvo_tabela: 'perfis', alvo_id: userId,
    detalhe: { email, usuario: usuario || null, funcao, nome },
  })

  // ── 5. As credenciais, uma vez só ──────────────────────────────────────────
  // A senha não fica gravada em lugar nenhum: o banco só tem o hash do Auth.
  // Reabrir a tela depois não a mostra de novo — se sumiu, gera-se outra.
  return json({ ok: true, user_id: userId, login: usuario || email, senha: senhaInicial, troca_obrigatoria: true })
})
