/*
 * INTERESSE EM APOIAR — lógica pura (validação + payload + orquestração de
 * envio). SEM import de supabase e SEM import.meta: roda no browser (via Vite,
 * na Apoiar.jsx) E no node (teste offline com rpc injetado). O RPC é passado
 * por parâmetro (`submitSupport(form, rpc)`) — a página injeta
 * `(name, payload) => supabase.rpc(name, payload)`.
 *
 * Segurança: o payload carrega SÓ os campos do formulário público. status,
 * reviewed_at e internal_notes são do servidor (RPC security definer) e NUNCA
 * saem daqui. Ver supabase/migrations/20260711_support_interests.sql.
 *
 * Regra de contato: nome + empresa obrigatórios; email OU whatsapp obrigatório
 * (pelo menos um). Formato de email só é checado se preenchido; whatsapp idem.
 */

// Selects do formulário (antes inline em Apoiar.jsx).
export const SEGMENTOS = [
  'Alimentos e bebidas', 'Varejo', 'Serviços', 'Mídia / comunicação',
  'Instituição / entidade', 'Indústria', 'Outro',
]
export const INTERESSES = [
  'Apoio institucional', 'Patrocínio', 'Ativação de marca',
  'Brinde / produto', 'Mídia / parceria', 'Outra possibilidade',
]

// Estado inicial do formulário.
export const EMPTY_SUPPORT = {
  nome: '', empresa: '', email: '', whatsapp: '', segmento: '', interesse: '', mensagem: '',
}

const MSG = {
  nome: 'Informe seu nome.',
  empresa: 'Informe o nome da empresa/marca.',
  contato: 'Informe e-mail ou WhatsApp para contato.',
  emailInvalido: 'E-mail inválido. Confira e tente de novo.',
  whatsappInvalido: 'WhatsApp incompleto. Inclua DDD e número.',
}

const t = (v) => (v == null ? '' : String(v)).trim()
// e-mail minimamente válido (mesma regra do banco: submit_pesquisa/submit_vote).
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const digits = (v) => t(v).replace(/\D/g, '')

/**
 * Valida o interesse. nome + empresa obrigatórios; pelo menos um contato
 * (email OU whatsapp); formato de email só se preenchido; whatsapp idem.
 * Retorna { ok, errors } — errors mapeia campo → mensagem clara (a chave
 * `contato` marca "faltam os dois contatos").
 */
export function validateSupport(form = {}) {
  const errors = {}
  if (!t(form.nome)) errors.nome = MSG.nome
  if (!t(form.empresa)) errors.empresa = MSG.empresa

  const hasEmail = !!t(form.email)
  const hasPhone = digits(form.whatsapp).length >= 10
  if (!hasEmail && !hasPhone) errors.contato = MSG.contato

  // formato só quando preenchido (campo em branco não é erro de formato)
  if (hasEmail && !EMAIL_RE.test(t(form.email))) errors.email = MSG.emailInvalido
  if (t(form.whatsapp) && digits(form.whatsapp).length < 10) errors.whatsapp = MSG.whatsappInvalido

  return { ok: Object.keys(errors).length === 0, errors }
}

/**
 * Monta o payload do RPC. SÓ campos públicos — status/reviewed_at/internal_notes
 * ficam a cargo do servidor. Opcionais vazios viram null.
 */
export function buildSupportPayload(form = {}) {
  const orNull = (v) => t(v) || null
  return {
    p_nome: t(form.nome),
    p_empresa: t(form.empresa),
    p_email: t(form.email) ? t(form.email).toLowerCase() : null,
    p_whatsapp: orNull(form.whatsapp),
    p_segmento: orNull(form.segmento),
    p_interesse: orNull(form.interesse),
    p_mensagem: orNull(form.mensagem),
  }
}

/**
 * Orquestra o envio. Valida; se inválido, NÃO chama o rpc. Grava via rpc
 * injetado; só reporta 'success' quando o rpc devolve error null. Qualquer erro
 * (rpc ou exceção) vira 'error' — nunca afirmar que salvou se a gravação falhar.
 * `rpc(name, payload)` deve resolver `{ error }` no estilo supabase-js.
 */
export async function submitSupport(form, rpc) {
  const { ok, errors } = validateSupport(form)
  if (!ok) return { ok: false, status: 'invalid', errors }
  try {
    const { error } = await rpc('submit_support_interest', buildSupportPayload(form))
    if (error) return { ok: false, status: 'error', error }
    return { ok: true, status: 'success' }
  } catch (error) {
    return { ok: false, status: 'error', error }
  }
}
