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
//   (bucket `redes`: `download` opcional = nome com que o navegador salva)
// baixar_varios (`redes` e `equipe`): { paths: [...até 60] } → { ok, urls: [{path, url}], validade }
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// `logos` (29/09/2026): a logo oficial de cada participante. Bucket público
// (logo é identidade pública), mas ESCREVER continua passando por aqui: pasta
// = UUID do participante, ação `cadastro.editar` (só Administrador), e nunca
// por cima — cada versão é um arquivo novo (quem versiona é logos_marca).
// `edicao-publico` (14/10/2026, Cartoon 2026.2): fotos da edição que o site
// mostra. Bucket público, mas o caminho é <edição>/<participação>/<uuid>.webp —
// impossível de adivinhar — e só a projeção pública (foto APROVADA) entrega o
// caminho. Subir exige `producao.gerir`; nunca por cima (cada foto é um uuid).
// `redes` (16/10/2026): artes do calendário do Instagram (Operação › Redes
// sociais). Bucket PRIVADO e sem policy nenhuma: só esta função assina. Caminho
// <uuid da publicação>/<uuid>.<ext>; subir exige `redes.arquivos`, baixar
// `redes.ver` — a função Redes sociais não tem dado.ler nem producao.gerir.
// Nunca por cima: cada versão de arte é um objeto novo, e uma publicação já
// feita continua apontando para o arquivo que foi ao ar.
// `equipe` (17/10/2026): foto de perfil das contas da organização. PRIVADO e
// sem policy. Caminho <user_id>/<uuid>.(webp|jpg): a pessoa só assina subida
// na PRÓPRIA pasta (o id vem do JWT, não do corpo); outra pasta exige
// `acesso.gerir`. Baixar: qualquer conta que trabalha no painel (dado.ler ou
// redes.ver) — é o que mostra quem fez cada coisa. Nunca por cima.
const BUCKETS = ['arquivos', 'combos', 'logos', 'edicao-publico', 'redes', 'equipe']

// Uma pasta e um arquivo, nada mais. A pasta é `geral` ou um UUID de
// participação; o arquivo é o que sobra depois de tirar tudo que não seja letra,
// número, ponto, hífen ou sublinhado.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const EDICAO = /^\d{4}(\.\d)?$/
const UUID_WEBP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i

const REDES = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|mp4|mov)$/

/** Artes de redes: exatamente <uuid da publicação>/<uuid>.<ext> (mesma regra do CHECK da tabela). */
export function caminhoRedesValido(path: string): boolean {
  return REDES.test(path)
}

const EQUIPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$/

/** Foto de perfil: exatamente <user_id>/<uuid>.(webp|jpg) (mesma regra do CHECK de perfis). */
export function caminhoEquipeValido(path: string): boolean {
  return EQUIPE.test(path)
}

/** Fotos da edição: exatamente <edição>/<uuid da participação>/<uuid>.webp. */
function caminhoEdicaoValido(path: string): boolean {
  const partes = path.split('/')
  return partes.length === 3 && EDICAO.test(partes[0]) && UUID.test(partes[1]) && UUID_WEBP.test(partes[2])
}

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

  let payload: { secret?: string; acao?: string; bucket?: string; path?: string; paths?: string[]; download?: string }
  try { payload = await req.json() } catch { return json({ erro: 'invalid_json' }, 400) }

  const secret = (payload.secret || '').trim()
  const acao = (payload.acao || '').trim()
  const bucket = (payload.bucket || 'arquivos').trim()
  const path = (payload.path || '').trim()

  // `baixar_varios` (redes, equipe): as miniaturas e as fotos de perfil numa chamada só.
  const paths = Array.isArray(payload.paths) ? payload.paths.map((x) => String(x || '').trim()) : []
  if (acao !== 'subir' && acao !== 'baixar' && acao !== 'baixar_varios') return json({ erro: 'acao_invalida' }, 400)
  if (!BUCKETS.includes(bucket)) return json({ erro: 'bucket_invalido' }, 400)
  const validar = bucket === 'redes' ? caminhoRedesValido
    : bucket === 'equipe' ? caminhoEquipeValido
    : bucket === 'edicao-publico' ? caminhoEdicaoValido : caminhoValido
  if (acao === 'baixar_varios') {
    if ((bucket !== 'redes' && bucket !== 'equipe') || !paths.length || paths.length > 60 || !paths.every(validar)) return json({ erro: 'caminho_invalido' }, 422)
  } else if (!validar(path)) return json({ erro: 'caminho_invalido' }, 422)
  if (bucket === 'logos' && path.startsWith('geral/')) return json({ erro: 'caminho_invalido' }, 422)

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
  // Basta UMA das ações da lista.
  //   · `arquivos` em `geral/`: a Social media (redes.ver) baixa os materiais
  //     da campanha pela biblioteca — os da pasta de uma marca, não.
  //   · `equipe`, subir: a própria pasta (conta ativa) ou acesso.gerir.
  const acoes = bucket === 'redes' ? [acao === 'subir' ? 'redes.arquivos' : 'redes.ver']
    : bucket === 'equipe' ? (acao === 'subir' ? ['acesso.gerir'] : ['dado.ler', 'redes.ver'])
    : acao === 'subir' ? [bucket === 'logos' ? 'cadastro.editar' : 'producao.gerir']
    : bucket === 'arquivos' && path.startsWith('geral/') ? ['dado.ler', 'redes.ver']
    : ['dado.ler']
  let autorizado = false
  let porAcao = ''
  if (secret) {
    for (const acaoNecessaria of acoes) {
      const { data, error: authErr } = await admin.rpc('pode', { p_secret: secret, p_acao: acaoNecessaria })
      if (authErr) return json({ erro: 'db_error', detalhe: authErr.message }, 500)
      if (data === true) { autorizado = true; porAcao = acaoNecessaria; break }
    }
  } else {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
    const { data: userRes, error: jwtErr } = jwt ? await admin.auth.getUser(jwt) : { data: null, error: null }
    // gotrue-js não lança em falha de rede — devolve { data: { user: null }, error }.
    // Sem distinguir, um blip do serviço de auth viraria "sessão não vale mais"
    // (401), igual a um token realmente inválido — achado de revisão adversarial.
    if (jwtErr && jwtErr.name === 'AuthRetryableFetchError') {
      return json({ erro: 'auth_indisponivel', detalhe: jwtErr.message }, 503)
    }
    const uid = userRes?.user?.id
    if (uid && bucket === 'equipe' && acao === 'subir' && path.split('/')[0] === uid) {
      // A própria foto: basta a conta da organização estar ativa.
      const { data: pf, error: pfErr } = await admin.from('perfis').select('user_id')
        .eq('user_id', uid).eq('papel', 'organizacao').eq('ativo', true).is('bloqueado_em', null)
        .eq('deve_trocar_senha', false).maybeSingle()
      if (pfErr) return json({ erro: 'db_error', detalhe: pfErr.message }, 500)
      autorizado = !!pf
    } else if (userRes?.user) {
      for (const acaoNecessaria of acoes) {
        const { data, error: authErr } = await admin.rpc('pode_por_user', { p_user: userRes.user.id, p_acao: acaoNecessaria })
        if (authErr) return json({ erro: 'db_error', detalhe: authErr.message }, 500)
        if (data === true) { autorizado = true; porAcao = acaoNecessaria; break }
      }
    }
  }
  if (autorizado !== true) return json({ erro: 'nao_autorizado' }, 401)

  // Só com redes.ver (Social media), `arquivos/geral/` vale apenas para o que a
  // Biblioteca lista: material de campanha PUBLICADO (identidade, combo, guia).
  // Contrato, regulamento e rascunho continuam de dado.ler, mesmo com o caminho na mão.
  if (bucket === 'arquivos' && porAcao === 'redes.ver') {
    const { data: ar, error: arErr } = await admin.from('arquivos').select('id')
      .eq('path', path).eq('escopo', 'geral').eq('arquivado', false).not('publicado_em', 'is', null)
      .in('categoria', ['identidade', 'combo', 'guia']).limit(1).maybeSingle()
    if (arErr) return json({ erro: 'db_error', detalhe: arErr.message }, 500)
    if (!ar) return json({ erro: 'nao_autorizado' }, 401)
  }

  if (acao === 'subir') {
    // `upsert: true` de propósito: publicar a versão 2 de um regulamento é
    // escrever por cima do mesmo caminho. Quem versiona é `arquivos.versao`,
    // que é dado — não o nome do arquivo em disco.
    const { data, error } = await admin.storage.from(bucket)
      .createSignedUploadUrl(path, { upsert: bucket === 'arquivos' || bucket === 'combos' })
    if (error) return json({ erro: 'assinatura_falhou', detalhe: error.message }, 500)
    return json({ ok: true, url: data.signedUrl, path })
  }

  // 300 s: o link vai para o histórico do navegador e para qualquer captura de
  // tela. Curto o bastante para não virar acesso permanente, longo o bastante
  // para um download começar.
  if (acao === 'baixar_varios') {
    const { data, error } = await admin.storage.from(bucket).createSignedUrls(paths, 300)
    if (error) return json({ erro: 'assinatura_falhou', detalhe: error.message }, 500)
    return json({ ok: true, urls: (data || []).map((d) => ({ path: d.path, url: d.signedUrl || null })), validade: 300 })
  }
  // `download` (redes): o navegador salva com o nome original em vez de abrir.
  const nomeDownload = bucket === 'redes' ? String(payload.download || '').replace(/[^\p{L}\p{N}._ -]/gu, '').slice(0, 120) : ''
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 300, nomeDownload ? { download: nomeDownload } : undefined)
  if (error) return json({ erro: 'assinatura_falhou', detalhe: error.message }, 404)
  return json({ ok: true, url: data.signedUrl })
})
