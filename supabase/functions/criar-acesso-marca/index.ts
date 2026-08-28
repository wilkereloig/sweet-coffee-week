// =============================================================================
// Edge Function: criar-acesso-marca
// O passo seguinte a "aprovado" no painel da organização: cria a conta da marca
// no Supabase Auth, vincula à candidatura e devolve as credenciais UMA VEZ para
// a organização entregar. Fase 1 de docs/PLANO-painel-contas-participantes.md.
//
// POR QUE Edge Function e não o painel:
//   Criar usuário exige a chave de serviço. O repositório tem regra dura e
//   testada — ⛔ nada de `service_role` dentro de public/ — porque um arquivo
//   estático roda no navegador de quem abrir a página. A chave vive AQUI, em
//   variável de ambiente, como nas outras quatro funções do projeto.
//
// O MODELO DE ACESSO MUDOU EM 22/08/2026 (decisão do Eloi):
//   login = nome do estabelecimento · senha = gerada aqui, forte, entregue pela
//   organização por WhatsApp ou copiada da tela. O plano §5 recomendava o
//   contrário — convite por e-mail, marca define a própria senha — porque senha
//   que passa pelo admin fica no WhatsApp e no print. A objeção continua VÁLIDA
//   e o que a responde é `deve_trocar_senha`: a senha entregue vale para UM
//   login. Depois disso, o que ficou na conversa não abre mais nada.
//   ⛔ Desligar essa flag reabre exatamente o risco que o plano descrevia.
//
// Deploy:
//   supabase functions deploy criar-acesso-marca --no-verify-jwt
//   (--no-verify-jwt porque a porta de sempre foi o secret no CORPO, nunca o
//    gateway. Fase 4 do plano de funções da organização, 28/08/2026: a
//    autorização deixou de ser só `admin_ok` — virou `pode`/`pode_por_user`,
//    ação `marca.liberar`, a mesma que a UI já usa pra mostrar ou esconder
//    "Criar acesso"/"Cadastrar marca". Sem isso, uma sessão nominal de
//    Curadoria via essa ação liberada na tela e recebia 401 aqui — a única
//    escrita que justifica a função existir ficava permanentemente fora do
//    alcance de quem a UI dizia poder usá-la.)
//
// Secrets: nenhum próprio. Esta função não envia e-mail — o endereço de login
// é sintético e não recebe nada; quem entrega o acesso é a organização.
// Injetadas pelo Supabase:
//   SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
//
//
// Depende de: public.pode, public.pode_por_user, public.vincular_conta_marca,
//             tabelas public.participantes e public.perfis.
//
// Entrada (POST JSON): { secret, origem_id } — ou, sem secret, o JWT da
// sessão nominal em Authorization: Bearer <token>.
// Saída: { ok, participante_id, login, senha, email_contato, troca_obrigatoria }
//        A senha aparece SÓ nesta resposta. Não fica gravada em lugar nenhum.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Login pelo nome do estabelecimento ───────────────────────────────────────
// Decisão do Eloi, 22/08/2026: a marca entra com o NOME dela, não com e-mail. É
// o que ela sabe de cor, e a organização entrega o acesso por WhatsApp, não por
// caixa de entrada.
//
// O Supabase Auth identifica por e-mail, então o nome vira um endereço interno
// determinístico: "ELOI Doces" → eloi-doces@DOMINIO_LOGIN. Esse endereço NÃO
// recebe mensagem e não é o e-mail da marca — o de verdade continua guardado em
// `participantes.email`, que é para onde a organização escreve.
const DOMINIO_LOGIN = 'marcas.sweetcoffeeweek.com.br'

function slugificar(nome: string): string {
  return (nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // tira acento
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

// Alfabeto sem I, O, 0 e 1: a senha vai ser LIDA em voz alta e digitada à mão
// no celular. Confundir zero com O é o jeito mais rápido de gerar um chamado de
// suporte que parece "não funciona".
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// 12 caracteres de um alfabeto de 32 = 60 bits de entropia, em três blocos de
// quatro para caber num WhatsApp sem virar borrão. `crypto.getRandomValues`, não
// `Math.random`: gerador previsível não é senha, é número de série.
function gerarSenha(): string {
  const bytes = new Uint32Array(12)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length])
  return 'SCW-' + chars.slice(0, 4).join('') + '-' +
                  chars.slice(4, 8).join('') + '-' +
                  chars.slice(8, 12).join('')
}

// O slug é o login, e `participantes.slug` é `unique`. Duas marcas com nomes que
// colapsam no mesmo slug ("Café Central" e "Cafe Central") ganhariam o mesmo
// endereço de login — e a segunda seria tratada como "marca que já participou",
// entrando na conta da primeira. Por isso o sufixo numérico.
/* Recebe uma PERGUNTA, não o cliente do banco: "esse slug está ocupado?".
   Anotar o cliente aqui reprovava no `deno check` — os genéricos do supabase-js
   resolvem diferente na criação e no uso, e o `PostgrestBuilder` é thenable sem
   ser Promise. Passar a consulta como função resolve o tipo e, de quebra, deixa
   a regra de colisão testável sem banco. */
async function slugLivre(base: string, ocupado: (s: string) => Promise<boolean>): Promise<string> {
  const raiz = base || 'marca'
  for (let i = 0; i < 50; i++) {
    const tentativa = i === 0 ? raiz : `${raiz}-${i + 1}`
    if (!(await ocupado(tentativa))) return tentativa
  }
  /* 50 marcas com o mesmo nome é cenário que não existe; se existir, o carimbo
     de tempo garante que ninguém entra na conta de outro. */
  return `${raiz}-${Date.now()}`
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'method_not_allowed' }, 405)

  let payload: {
    secret?: string
    origem_id?: string
    marca?: { nome?: string; responsavel?: string; telefone?: string; email?: string }
  }
  try { payload = await req.json() } catch { return json({ erro: 'invalid_json' }, 400) }

  const secret = (payload.secret || '').trim()
  const origemId = (payload.origem_id || '').trim()
  const manual = payload.marca || null

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // ── 1. AUTORIZAR ANTES DE QUALQUER COISA ───────────────────────────────────
  // Nada de ler a candidatura, resolver e-mail ou tocar no Auth antes daqui.
  // `marca.liberar` — a mesma ação que Respostas.jsx e Marcas.jsx checam pra
  // mostrar "Criar acesso"/"Cadastrar marca" (Fase 3 do plano de funções).
  //
  // Duas portas (Fase 4, 28/08/2026): sem `secret`, o JWT da sessão nominal
  // no cabeçalho, resolvido por `pode_por_user`.
  //
  // Com `secret`, `pode()` — NÃO é o mesmo comportamento de `admin_ok`, é
  // mais estrito: `pode()` acrescenta duas condições que `admin_ok` sozinho
  // não tinha (ver 20260825_contas_organizacao_por_funcao.sql) —
  // `senha_unica_ativa` (a organização pode desligar a senha compartilhada)
  // e `acesso_travado()` (o limite de tentativas). Antes deste diff,
  // criar-acesso-marca era a ÚNICA das cinco funções de conta que continuava
  // aceitando a senha única mesmo depois de desligada — um buraco que esta
  // troca fecha, não um rename.
  let autorizado = false
  if (secret) {
    const { data, error: authErr } = await admin.rpc('pode', { p_secret: secret, p_acao: 'marca.liberar' })
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
      const { data, error: authErr } = await admin.rpc('pode_por_user', { p_user: userRes.user.id, p_acao: 'marca.liberar' })
      if (authErr) return json({ erro: 'db_error', detalhe: authErr.message }, 500)
      autorizado = data === true
    }
  }
  if (autorizado !== true) return json({ erro: 'nao_autorizado' }, 401)

  /* ── 2. QUAL DOS DOIS PONTOS DE ENTRADA ────────────────────────────────────
     Candidatura aprovada (`origem_id`) OU cadastro manual (`marca`), nunca os
     dois. Aceitar os dois exigiria decidir qual vence — e "decidir qual vence"
     entre dois nomes de marca diferentes é exatamente como se cria conta com o
     nome errado, que é o erro que não tem conserto (o login não se troca).
     Recusar é a resposta honesta. */
  if (origemId && manual) return json({ erro: 'entrada_ambigua' }, 400)
  if (!origemId && !manual) return json({ erro: 'origem_obrigatoria' }, 400)

  let email = ''
  let nomeMarca = ''
  let responsavel = ''
  let telefone = ''

  if (origemId) {
    const { data: candidatura, error: candErr } = await admin
      .from('quero_participar')
      .select('id, status, email, empresa, nome, telefone')
      .eq('id', origemId)
      .maybeSingle()
    if (candErr) return json({ erro: 'db_error', detalhe: candErr.message }, 500)
    if (!candidatura) return json({ erro: 'candidatura_nao_encontrada' }, 404)

    // Na `quero_participar`, `empresa` é a marca e `nome` é a pessoa.
    email = (candidatura.email || '').trim().toLowerCase()
    nomeMarca = (candidatura.empresa || '').trim()
    responsavel = (candidatura.nome || '').trim()
    telefone = (candidatura.telefone || '').trim()

    /* IDEMPOTÊNCIA. Quem garante é o `unique` de participantes.origem_id; este
       select só produz mensagem melhor que uma violação de constraint. */
    const { data: jaTem } = await admin
      .from('participantes').select('id').eq('origem_id', origemId).maybeSingle()
    if (jaTem) return json({ erro: 'conta_ja_existe', participante_id: jaTem.id }, 409)
  } else {
    nomeMarca = (manual!.nome || '').trim()
    responsavel = (manual!.responsavel || '').trim()
    telefone = (manual!.telefone || '').trim()
    email = (manual!.email || '').trim().toLowerCase()
  }

  if (!nomeMarca) return json({ erro: 'sem_nome_de_marca' }, 422)

  /* ── 3. COLISÃO, ANTES DE TOCAR NO AUTH ────────────────────────────────────
     Só no caminho manual: pelo `origem_id` a idempotência acima já resolveu.
     As duas recusas existem para não produzir estado torto — conta duplicada
     para a mesma casa, ou candidatura órfã sem vínculo com a conta. */
  if (manual) {
    const slugPretendido = slugificar(nomeMarca)

    const { data: mesmoNome } = await admin
      .from('participantes').select('id, nome_marca').eq('slug', slugPretendido).maybeSingle()
    if (mesmoNome) {
      return json({ erro: 'marca_ja_tem_acesso', participante_id: mesmoNome.id,
                    nome: mesmoNome.nome_marca }, 409)
    }

    /* Candidatura com o mesmo nome: devolve o ID DELA para a tela poder mandar
       usar o "Criar acesso" da ficha. Sem esse id a mensagem seria uma queixa
       sem saída, e a organização criaria a conta à mão mesmo assim — deixando
       a candidatura para sempre sem vínculo com a conta que a representa.
       Compara por SLUG, não por texto: "Café Central" e "cafe central" são a
       mesma casa, e é o slug que vira o login de qualquer forma. */
    const { data: candidatas } = await admin
      .from('quero_participar').select('id, empresa').limit(500)
    const conflito = (candidatas || []).find((c: { id: string; empresa: string | null }) =>
      slugificar(c.empresa || '') === slugPretendido)
    if (conflito) {
      return json({ erro: 'existe_candidatura', candidatura_id: conflito.id,
                    nome: conflito.empresa }, 409)
    }
  }

  // ── 4. USUÁRIO — LOGIN PELO NOME, SENHA GERADA ─────────────────────────────
  // A senha nasce AQUI, no servidor, e é devolvida UMA VEZ para a tela. Ela não
  // fica guardada em lugar nenhum: o banco só tem o hash do Auth, e nem a
  // auditoria nem `participantes` a registram. Reabrir a ficha depois não a
  // mostra de novo — se sumiu, gera-se outra.
  const login = await slugLivre(slugificar(nomeMarca), async (s) => {
    const { data } = await admin.from('participantes').select('id').eq('slug', s).maybeSingle()
    return !!data
  })
  const emailLogin = `${login}@${DOMINIO_LOGIN}`
  const senhaInicial = gerarSenha()

  let userId: string | null = null

  const { data: criado, error: criarErr } = await admin.auth.admin.createUser({
    email: emailLogin,
    password: senhaInicial,
    // `email_confirm: true` porque este endereço não existe para receber nada —
    // quem confirma que a marca é a marca é a organização, ao aprovar.
    email_confirm: true,
    user_metadata: { nome_marca: nomeMarca, login, email_contato: email },
  })

  if (criado?.user) {
    userId = criado.user.id
  } else if (criarErr) {
    // Com login derivado do nome e sufixo de colisão, `email_exists` deixou de
    // ser o caso benigno de antes ("marca de outra edição"): aqui significa que
    // o endereço sintético já existe sem uma linha em `participantes` — estado
    // inconsistente, que é melhor reportar do que reaproveitar às cegas.
    return json({ erro: 'login_ja_existe', login, detalhe: criarErr.message }, 409)
  }

  if (!userId) return json({ erro: 'usuario_nao_criado' }, 500)

  /* ── 5. PERFIL + PARTICIPANTE + OPERAÇÃO + AUDITORIA ───────────────────────
     Numa RPC só, para não sobrar meio-registro. Duas irmãs, uma por entrada: a
     da candidatura lê os dados de lá; a manual recebe por argumento e deixa
     `origem_id` nulo. Daqui para baixo o caminho volta a ser um só — e é isso
     que impede o cadastro manual de escapar da trava de primeiro uso. */
  const vinculo = origemId
    ? await admin.rpc('vincular_conta_marca', { p_user: userId, p_origem: origemId })
    : await admin.rpc('vincular_marca_manual', {
        p_user: userId,
        p_nome: nomeMarca,
        p_responsavel: responsavel || null,
        p_telefone: telefone || null,
        p_email: email || null,
      })
  if (vinculo.error) return json({ erro: 'vinculo_falhou', detalhe: vinculo.error.message }, 500)
  const participanteId = vinculo.data

  // ── 6. TRAVA DE PRIMEIRO USO ───────────────────────────────────────────────
  // ⚠️ ESTA FLAG É O QUE TORNA ACEITÁVEL MANDAR SENHA POR WHATSAPP.
  // A senha vai viajar em texto e vai FICAR no histórico da conversa — no
  // aparelho da marca, no da organização e nos backups dos dois. Não há como
  // retirá-la depois. Com `deve_trocar_senha`, o que ficou lá é um bilhete de
  // entrada de uso único: no primeiro login a marca troca, e a senha do
  // WhatsApp deixa de abrir qualquer coisa.
  // ⛔ Desligar isto transforma a mensagem num segredo permanente vazado.
  const { error: flagErr } = await admin
    .from('perfis')
    .update({ deve_trocar_senha: true })
    .eq('user_id', userId)
  if (flagErr) {
    // Conta criada sem a trava seria pior que conta nenhuma: a senha
    // compartilhada viraria permanente sem ninguém saber. Desfaz e reporta.
    await admin.auth.admin.deleteUser(userId)
    return json({ erro: 'trava_falhou', detalhe: flagErr.message }, 500)
  }

  // O login também é o slug do participante, e é por ele que a marca entra.
  await admin.from('participantes').update({ slug: login }).eq('id', participanteId)

  // ── 7. AS CREDENCIAIS, UMA VEZ SÓ ──────────────────────────────────────────
  // Não há e-mail de convite: o endereço de login é sintético e não recebe
  // nada. Quem entrega é a organização, por WhatsApp ou copiando da tela.
  return json({
    ok: true,
    participante_id: participanteId,
    login,
    senha: senhaInicial,
    email_contato: email,
    troca_obrigatoria: true,
    origem: origemId ? 'candidatura' : 'manual',
  })
})
