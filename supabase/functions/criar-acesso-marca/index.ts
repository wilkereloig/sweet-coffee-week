// =============================================================================
// Edge Function: criar-acesso-marca
// O passo seguinte a "aprovado" no painel da organização: cria a conta da marca
// no Supabase Auth, vincula à candidatura e manda o convite para ela definir a
// própria senha. Fase 1 de docs/PLANO-painel-contas-participantes.md.
//
// POR QUE Edge Function e não o painel:
//   Criar usuário exige a chave de serviço. O repositório tem regra dura e
//   testada — ⛔ nada de `service_role` dentro de public/ — porque um arquivo
//   estático roda no navegador de quem abrir a página. A chave vive AQUI, em
//   variável de ambiente, como nas outras quatro funções do projeto.
//
// POR QUE a senha nunca passa pelo admin (plano §5):
//   Se o admin digitasse a senha, ela existiria em texto na tela dele, no
//   WhatsApp do grupo e no print. E ele passaria a saber a senha da marca.
//   Aqui o usuário nasce SEM senha e a marca define a dela pelo link. O
//   caminho de resgate — senha provisória com troca obrigatória — é outro
//   botão, para quando o convite não chega.
//
// Deploy:
//   supabase functions deploy criar-acesso-marca --no-verify-jwt
//   (--no-verify-jwt porque a porta desta função é a senha do painel, via
//    admin_ok, não um JWT — enquanto durar a Fase 1. Ver AUTORIZAÇÃO abaixo.)
//
// Secrets (Dashboard → Edge Functions → criar-acesso-marca → Secrets):
//   RESEND_API_KEY   -> chave da API Resend
//   EMAIL_FROM       -> remetente verificado, ex: "Sweet & Coffee Week <ola@sweetcoffeeweek.com.br>"
// Injetadas pelo Supabase:
//   SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
//
// ⚠️ Authentication → URL Configuration: a URL de redirect precisa estar na
//    allowlist, senão o link do convite cai silenciosamente na Site URL e
//    ninguém entende o que houve. E a BARRA FINAL não é opcional: /marca cai no
//    fallback do SPA, /marca/ abre a página (CLAUDE.md §10.4-b).
//
// Depende de: public.admin_ok, public.vincular_conta_marca,
//             public.user_id_por_email, tabela public.participantes.
//
// Entrada (POST JSON): { secret, origem_id }
// Saída: { ok, participante_id, usuario: "novo"|"existente", convite: "enviado"|... }
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const emailOk = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((e || '').trim())

// `/marca/` e não `/marca/definir-senha/`, como o plano previa: a área da marca
// é UMA página que troca de view conforme o estado. O link de recuperação chega
// com os tokens no #hash, e a página reconhece `type=recovery` e abre direto em
// "definir senha". Duas páginas exigiriam duplicar o cliente de autenticação
// inteiro — e a segunda cópia é onde as duas começam a divergir.
const DESTINO_CONVITE = 'https://www.sweetcoffeeweek.com.br/marca/'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'method_not_allowed' }, 405)

  let payload: { secret?: string; origem_id?: string }
  try { payload = await req.json() } catch { return json({ erro: 'invalid_json' }, 400) }

  const secret = (payload.secret || '').trim()
  const origemId = (payload.origem_id || '').trim()

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // ── 1. AUTORIZAR ANTES DE QUALQUER COISA ───────────────────────────────────
  // Nada de ler a candidatura, resolver e-mail ou tocar no Auth antes daqui.
  // Enquanto durar a Fase 1 a porta é a senha do painel; na Fase 2 vira
  // `pode_organizacao`, e esta é a única linha que muda.
  const { data: autorizado, error: authErr } = await admin.rpc('admin_ok', { p_secret: secret })
  if (authErr) return json({ erro: 'db_error', detalhe: authErr.message }, 500)
  if (autorizado !== true) return json({ erro: 'nao_autorizado' }, 401)

  if (!origemId) return json({ erro: 'origem_obrigatoria' }, 400)

  // ── 2. A CANDIDATURA ───────────────────────────────────────────────────────
  const { data: candidatura, error: candErr } = await admin
    .from('quero_participar')
    .select('id, status, email, empresa')
    .eq('id', origemId)
    .maybeSingle()
  if (candErr) return json({ erro: 'db_error', detalhe: candErr.message }, 500)
  if (!candidatura) return json({ erro: 'candidatura_nao_encontrada' }, 404)

  const email = (candidatura.email || '').trim().toLowerCase()
  const nomeMarca = (candidatura.empresa || '').trim()
  if (!emailOk(email)) return json({ erro: 'email_invalido', email }, 422)

  // ── 3. IDEMPOTÊNCIA ────────────────────────────────────────────────────────
  // Quem garante é o `unique` de participantes.origem_id — este select só
  // produz mensagem melhor que uma violação de constraint. Duas requisições
  // simultâneas passam as duas por aqui; só uma sobrevive ao INSERT.
  const { data: jaTem } = await admin
    .from('participantes')
    .select('id')
    .eq('origem_id', origemId)
    .maybeSingle()
  if (jaTem) {
    return json({ erro: 'conta_ja_existe', participante_id: jaTem.id }, 409)
  }

  // ── 4. USUÁRIO — SEM SENHA ─────────────────────────────────────────────────
  // `email_confirm: true` porque quem confirma o endereço é a organização, ao
  // aprovar: a marca não se cadastrou sozinha, foi convidada.
  let userId: string | null = null
  let origemUsuario: 'novo' | 'existente' = 'novo'

  const { data: criado, error: criarErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome_marca: nomeMarca },
  })

  if (criado?.user) {
    userId = criado.user.id
  } else if (criarErr) {
    // 422 email_exists NÃO é erro: é a marca que já participou de outra edição.
    // Participação é marca + edição, então ela ganha uma linha nova em
    // `participantes` reusando a mesma conta.
    const jaExiste = (criarErr as { code?: string; status?: number }).code === 'email_exists'
      || (criarErr as { status?: number }).status === 422
    if (!jaExiste) return json({ erro: 'auth_error', detalhe: criarErr.message }, 500)

    const { data: achado, error: acharErr } = await admin.rpc('user_id_por_email', { p_email: email })
    if (acharErr) return json({ erro: 'db_error', detalhe: acharErr.message }, 500)
    if (!achado) return json({ erro: 'usuario_existe_mas_nao_resolvido', email }, 500)
    userId = achado as string
    origemUsuario = 'existente'
  }

  if (!userId) return json({ erro: 'usuario_nao_criado' }, 500)

  // ── 5. PERFIL + PARTICIPANTE + OPERAÇÃO + STATUS + AUDITORIA ───────────────
  // Numa RPC só. Se o convite falhar depois, o pior cenário é "conta existe,
  // e-mail não chegou" — resolve reenviando. Meio-registro não se resolve.
  const { data: participanteId, error: vincErr } = await admin
    .rpc('vincular_conta_marca', { p_user: userId, p_origem: origemId })
  if (vincErr) return json({ erro: 'vinculo_falhou', detalhe: vincErr.message }, 500)

  // ── 6. CONVITE ─────────────────────────────────────────────────────────────
  // `generateLink` devolve a URL SEM enviar nada. O SMTP embutido do Supabase
  // entrega 2 e-mails por hora no projeto inteiro — inviável para aprovar 30
  // marcas numa tarde. A entrega vai pelo Resend, que o projeto já usa e que
  // tem log de entrega de verdade.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: DESTINO_CONVITE },
  })
  if (linkErr || !link?.properties?.action_link) {
    // A conta existe e está vinculada — só o convite falhou. Reportar como
    // parcial, não como erro: repetir a chamada devolveria 409 e a organização
    // acharia que nada funcionou. O botão certo daqui é "reenviar convite".
    return json({
      ok: true,
      participante_id: participanteId,
      usuario: origemUsuario,
      convite: 'falhou',
      detalhe: linkErr?.message ?? 'sem_action_link',
    }, 207)
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const EMAIL_FROM = Deno.env.get('EMAIL_FROM')
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    return json({
      ok: true,
      participante_id: participanteId,
      usuario: origemUsuario,
      convite: 'provedor_nao_configurado',
    }, 207)
  }

  const envio = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [email],
      subject: 'Seu acesso ao Sweet & Coffee Week',
      html: renderConvite(nomeMarca, link.properties.action_link),
    }),
  })

  if (!envio.ok) {
    return json({
      ok: true,
      participante_id: participanteId,
      usuario: origemUsuario,
      convite: 'falhou',
      detalhe: await envio.text(),
    }, 207)
  }

  return json({
    ok: true,
    participante_id: participanteId,
    usuario: origemUsuario,
    convite: 'enviado',
  })
})

// ── Template do convite ──────────────────────────────────────────────────────
// Paleta institucional (CLAUDE.md §6.1), sem KV de edição e sem fonte externa:
// @import de fonte é ignorado pela maioria dos clientes de e-mail, e a face
// mono está proibida no projeto. Cyan #01AFCC sobre chocolate #3D1308 dá 4,9:1;
// chocolate sobre cyan, 5,6:1 — o botão passa nos dois sentidos.
function renderConvite(nomeMarca: string, linkAcesso: string): string {
  const saudacao = nomeMarca ? `Oi, ${escapeHtml(nomeMarca)}!` : 'Oi!'
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FEF0DD;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FEF0DD;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FEF0DD;border-radius:20px;overflow:hidden;border:2px solid #3D1308;">

        <tr><td style="background:#3D1308;padding:32px 30px;">
          <div style="font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#01AFCC;">Sweet &amp; Coffee Week</div>
          <h1 style="margin:12px 0 0;font-size:32px;line-height:1.05;color:#FEF0DD;">Sua marca foi aprovada</h1>
        </td></tr>

        <tr><td style="padding:30px 32px 8px;color:#3D1308;font-size:16px;line-height:1.6;">
          <p style="margin:0 0 14px;font-weight:bold;font-size:19px;color:#6A2C15;">${saudacao}</p>
          <p style="margin:0 0 14px;">Sua inscrição foi aprovada e o acesso da sua marca já está criado.</p>
          <p style="margin:0 0 14px;">O próximo passo é <strong>definir sua senha</strong> e completar o cadastro da edição — combo, fotos e informações de atendimento.</p>
          <p style="margin:0 0 14px;">O link abaixo é pessoal e tem prazo. Se expirar, é só pedir um novo para a organização.</p>
        </td></tr>

        <tr><td style="padding:14px 32px 8px;text-align:center;">
          <a href="${escapeHtml(linkAcesso)}" style="display:inline-block;background:#01AFCC;color:#3D1308;text-decoration:none;font-weight:bold;font-size:16px;padding:16px 34px;border-radius:999px;">Definir minha senha →</a>
        </td></tr>

        <tr><td style="padding:18px 32px 28px;color:#6A2C15;font-size:13px;line-height:1.5;">
          <p style="margin:0;">Se o botão não abrir, copie este endereço no navegador:</p>
          <p style="margin:6px 0 0;word-break:break-all;color:#3D1308;">${escapeHtml(linkAcesso)}</p>
        </td></tr>

        <tr><td style="background:#3D1308;padding:18px 28px;text-align:center;">
          <div style="font-size:13px;font-weight:bold;letter-spacing:1px;color:#FEF0DD;">sweetcoffeeweek.com.br</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// O nome da marca vem do formulário público. Escapar não é zelo: é o mesmo
// motivo pelo qual tests/organizacao.test.mjs exige escape de tudo que sai do
// banco — só que aqui o destino é a caixa de e-mail de outra pessoa.
function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
