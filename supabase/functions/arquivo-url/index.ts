// =============================================================================
// Edge Function: arquivo-url
// Assina o acesso aos dois buckets privados do painel: `arquivos` (documentos
// que a organização publica) e `combos` (as fotos dos itens).
//
// POR QUE ASSINAR EM VEZ DE PASSAR O ARQUIVO POR AQUI:
//   O bucket é privado e só `service_role` escreve — a organização não tem
//   `auth.uid()` enquanto entrar pela senha do painel, então não há policy de
//   escrita que se possa escrever para ela sem ficar frouxa demais. A saída
//   seria mandar o arquivo para dentro desta função e ela regravar. Não é:
//   um PDF de 20 MB atravessaria o isolate inteiro, com limite de corpo, de
//   memória e de tempo. Aqui só a AUTORIZAÇÃO passa pela função; os bytes vão
//   do navegador direto para o Storage, pela URL assinada.
//
// ⚠️ O CAMINHO É VALIDADO AQUI, e essa é a única coisa que separa "subir um
//   arquivo da marca X" de "escrever por cima do arquivo da marca Y". A URL
//   assinada vale para UM caminho, e é este código que decide qual.
//
// Deploy: supabase functions deploy arquivo-url --no-verify-jwt
//   (--no-verify-jwt porque a porta de sempre foi o secret no CORPO, nunca o
//    gateway. Fase 4 do plano de funções da organização, 28/08/2026: sem
//    secret, aceita o JWT da sessão nominal no cabeçalho Authorization.)
//
// Entrada (POST JSON): { secret, acao: 'subir' | 'baixar', bucket, path } —
// ou, sem secret, o JWT da sessão nominal em Authorization: Bearer <token>.
// Saída subir:  { ok, url, path }   → o navegador faz PUT nessa url com o arquivo
// Saída baixar: { ok, url }         → link de vida curta, para abrir
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BUCKETS = ['arquivos', 'combos']

// Uma pasta e um arquivo, nada mais. A pasta é `geral` ou um UUID de
// participação; o arquivo é o que sobra depois de tirar tudo que não seja letra,
// número, ponto, hífen ou sublinhado.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function caminhoValido(path: string): boolean {
  const partes = path.split('/')
  if (partes.length !== 2) return false
  const [pasta, arquivo] = partes
  if (pasta !== 'geral' && !UUID.test(pasta)) return false
  if (!arquivo || arquivo.length > 120) return false
  // `..` nunca aparece porque o nome é filtrado por lista de permitidos — e
  // lista de permitidos é o que se escreve quando o custo de errar é escrever
  // por cima do arquivo de outra pessoa.
  return /^[A-Za-z0-9._-]+$/.test(arquivo) && !arquivo.startsWith('.')
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'method_not_allowed' }, 405)

  let payload: { secret?: string; acao?: string; bucket?: string; path?: string }
  try { payload = await req.json() } catch { return json({ erro: 'invalid_json' }, 400) }

  const secret = (payload.secret || '').trim()
  const acao = (payload.acao || '').trim()
  const bucket = (payload.bucket || 'arquivos').trim()
  const path = (payload.path || '').trim()

  if (acao !== 'subir' && acao !== 'baixar') return json({ erro: 'acao_invalida' }, 400)
  if (!BUCKETS.includes(bucket)) return json({ erro: 'bucket_invalido' }, 400)
  if (!caminhoValido(path)) return json({ erro: 'caminho_invalido' }, 422)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Ler é `dado.ler` (a conta de consulta abre um regulamento); escrever é
  // `producao.gerir`. A diferença é o ponto inteiro de ter funções.
  //
  // Duas portas (Fase 4, 28/08/2026): com `secret`, a senha única; sem, o
  // JWT nominal no cabeçalho, resolvido por `pode_por_user` — mesma ação,
  // mesma tabela perfis/permissões que `pode()` já usa pra sessão nominal.
  const acaoNecessaria = acao === 'subir' ? 'producao.gerir' : 'dado.ler'
  let autorizado = false
  if (secret) {
    const { data, error: authErr } = await admin.rpc('pode', { p_secret: secret, p_acao: acaoNecessaria })
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
      const { data, error: authErr } = await admin.rpc('pode_por_user', { p_user: userRes.user.id, p_acao: acaoNecessaria })
      if (authErr) return json({ erro: 'db_error', detalhe: authErr.message }, 500)
      autorizado = data === true
    }
  }
  if (autorizado !== true) return json({ erro: 'nao_autorizado' }, 401)

  if (acao === 'subir') {
    // `upsert: true` de propósito: publicar a versão 2 de um regulamento é
    // escrever por cima do mesmo caminho. Quem versiona é `arquivos.versao`,
    // que é dado — não o nome do arquivo em disco.
    const { data, error } = await admin.storage.from(bucket)
      .createSignedUploadUrl(path, { upsert: true })
    if (error) return json({ erro: 'assinatura_falhou', detalhe: error.message }, 500)
    return json({ ok: true, url: data.signedUrl, path })
  }

  // 300 s: o link vai para o histórico do navegador e para qualquer captura de
  // tela. Curto o bastante para não virar acesso permanente, longo o bastante
  // para um download começar.
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 300)
  if (error) return json({ erro: 'assinatura_falhou', detalhe: error.message }, 404)
  return json({ ok: true, url: data.signedUrl })
})
