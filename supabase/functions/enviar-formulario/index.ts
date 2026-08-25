/*
 * enviar-formulario — a porta única dos formulários públicos do site.
 *
 * POR QUE ELA EXISTE, e não um captcha na tela: Postgres não consegue validar
 * um token do Turnstile — não há como chamar a Cloudflare de dentro de uma RPC.
 * E captcha conferido só no navegador não vale nada: o robô não executa o
 * JavaScript, ele chama /rest/v1/rpc/submit_* direto e ignora a tela inteira.
 * Por isso a verificação mora aqui, no servidor, e o passo final desta função é
 * chamar a mesma RPC de sempre com a chave de serviço.
 *
 * ⚠️ ENQUANTO AS RPCs AINDA TIVEREM `execute` PARA `anon`, esta função é um
 * caminho alternativo, não uma trava. A trava só fecha com
 * `revoke execute on function public.submit_* from anon` — que é migration, e
 * migration depende do backup (docs/COMANDO-claude-code.md, item 1).
 *
 * A FUNÇÃO NÃO CONHECE A ASSINATURA DE NENHUMA RPC. Ela recebe `corpo` já no
 * formato que a RPC espera e repassa verbatim. Copiar as assinaturas para cá
 * criaria a segunda fonte de verdade que o CLAUDE.md §5.2 proíbe — e seria ela
 * que ficaria para trás na primeira vez que um formulário ganhasse um campo.
 *
 * DESCARTE SILENCIOSO vale só para robô. Falha real (banco fora, RPC recusando)
 * devolve erro de verdade, senão o formulário afirmaria ter gravado sem gravar —
 * que é a regra dos três formulários do site e do §7.8 do briefing. As duas
 * coisas parecem contraditórias e não são: mentir para o robô é defesa, mentir
 * para a pessoa é bug.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

// Allowlist. Nome de formulário → nome de RPC. Nada fora daqui é chamável.
const RPC_PERMITIDA: Record<string, string> = {
  quero_participar: 'submit_quero_participar',
  contato: 'submit_contact_request',
  apoio: 'submit_support_interest',
  pesquisa: 'submit_pesquisa',
}

// Pessoa nenhuma preenche um formulário de vários passos em menos que isto.
const TEMPO_MINIMO_MS = 3000

// Teto de sanidade: `aberto_em` vem do cliente, então é dado de fora. Uma aba
// aberta ontem é legítima; um carimbo de 1970 ou do futuro é adulteração.
const TEMPO_MAXIMO_MS = 24 * 60 * 60 * 1000

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * A ÚNICA resposta de 200 desta função. Bloqueio de robô e gravação bem
 * sucedida saem por aqui, byte a byte iguais.
 *
 * ⚠️ Isto já falhou uma vez, em 25/08/2026: o bloqueio devolvia `{ok:true}` e o
 * sucesso devolvia `{ok:true,"dados":null}`. Um campo a mais é o bastante — o
 * robô lê a diferença, conclui que foi barrado e tenta outra tática, que é
 * exatamente o que o descarte silencioso existe para impedir.
 *
 * Por isso o retorno da RPC NÃO é repassado. Nenhum dos formulários usa esse
 * valor (todos olham só se deu certo), e repassá-lo devolveria a diferença de
 * formato pela porta dos fundos no dia em que uma RPC passasse a retornar algo.
 */
function sucesso(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...JSON_HEADERS, ...CORS },
  })
}

function erro(mensagem: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, message: mensagem }), {
    status,
    headers: { ...JSON_HEADERS, ...CORS },
  })
}

/**
 * Confere o token do Turnstile na Cloudflare.
 * Sem `TURNSTILE_SECRET_KEY` configurada, devolve `null` = "não avaliado", e a
 * função deixa passar. É o modo desligado por bandeira que o comando pede
 * (item 3.5): o código fica pronto e inerte até a chave existir.
 */
async function conferirTurnstile(token: string, ip: string): Promise<boolean | null> {
  const segredo = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!segredo) return null

  const corpo = new FormData()
  corpo.append('secret', segredo)
  corpo.append('response', token ?? '')
  if (ip) corpo.append('remoteip', ip)

  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: corpo,
    })
    const j = await r.json()
    return j?.success === true
  } catch (_e) {
    // Cloudflare fora do ar não pode derrubar o formulário do festival. Deixa
    // passar e registra — as outras barreiras continuam de pé.
    console.error('turnstile_indisponivel')
    return null
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return erro('metodo_nao_permitido', 405)

  let entrada: Record<string, unknown>
  try {
    entrada = await req.json()
  } catch (_e) {
    return erro('json_invalido', 400)
  }

  const formulario = String(entrada.formulario ?? '')
  const rpc = RPC_PERMITIDA[formulario]
  if (!rpc) return erro('formulario_desconhecido', 400)

  const corpo = entrada.corpo
  if (corpo === null || typeof corpo !== 'object') return erro('corpo_invalido', 400)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''

  // ── Barreira 1 · campo-armadilha ────────────────────────────────────────
  // Invisível para gente, preenchível por robô que varre o formulário inteiro.
  if (String(entrada.armadilha ?? '') !== '') {
    console.log(JSON.stringify({ bloqueio: 'armadilha', formulario, ip }))
    return sucesso()
  }

  // ── Barreira 2 · tempo mínimo de preenchimento ──────────────────────────
  const abertoEm = Number(entrada.aberto_em ?? 0)
  if (Number.isFinite(abertoEm) && abertoEm > 0) {
    const decorrido = Date.now() - abertoEm
    if (decorrido < TEMPO_MINIMO_MS || decorrido > TEMPO_MAXIMO_MS) {
      console.log(JSON.stringify({ bloqueio: 'tempo', formulario, ip, decorrido }))
      return sucesso()
    }
  }

  // ── Barreira 3 · Turnstile, conferido no servidor ───────────────────────
  const humano = await conferirTurnstile(String(entrada.token ?? ''), ip)
  if (humano === false) {
    console.log(JSON.stringify({ bloqueio: 'turnstile', formulario, ip }))
    return sucesso()
  }

  // ── Barreira 4 · limite por origem ──────────────────────────────────────
  // NÃO IMPLEMENTADA, e é decisão declarada, não esquecimento. Contar envios
  // por origem exige guardar as tentativas em algum lugar — uma tabela — e
  // tabela é migration, que está travada pelo backup (item 1 do comando).
  // Uma contagem em memória do isolate não serve: cada requisição pode cair num
  // isolate diferente, então o teto seria contornado sem ninguém tentar.

  // ── Passa a bola para a RPC de sempre ───────────────────────────────────
  const url = Deno.env.get('SUPABASE_URL')
  const chave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !chave) return erro('ambiente_incompleto', 500)

  try {
    const r = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: chave,
        Authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify(corpo),
    })

    if (!r.ok) {
      // A RPC recusou por motivo dela (e-mail inválido, campo faltando). Isso é
      // recado para a pessoa, não bloqueio de robô — devolve honesto.
      let motivo = `HTTP ${r.status}`
      try {
        motivo = (await r.json())?.message ?? motivo
      } catch (_e) { /* mantém o HTTP */ }
      return erro(String(motivo), r.status)
    }

    // O corpo da resposta da RPC e lido e DESCARTADO de proposito. Ver sucesso().
    await r.text().catch(() => '')
    return sucesso()
  } catch (e) {
    console.error('falha_ao_chamar_rpc', String(e))
    return erro('falha_no_envio', 502)
  }
})
