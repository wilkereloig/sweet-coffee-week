/*
 * CENTRAL DE DÚVIDAS E CONTATO — lógica pura (busca/filtro do FAQ, acordeão,
 * validação, payload e orquestração de envio). SEM import de supabase e SEM
 * import.meta: roda no browser (via Vite, na Contato.jsx) E no node (teste
 * offline com rpc injetado). O RPC é passado por parâmetro
 * (`submitContact(form, rpc)`) — a página injeta
 * `(name, payload) => supabase.rpc(name, payload)`.
 *
 * Segurança: o payload carrega SÓ os campos do formulário público. status,
 * source, reviewed_at e internal_notes são do servidor (RPC security definer) e
 * NUNCA saem daqui. Ver supabase/migrations/20260710_contact_requests.sql.
 */
import { CONTACT_SUBJECTS } from '../data/contactFaq.js'

const t = (v) => (v == null ? '' : String(v)).trim()

// minúsculo + sem acento — base da busca e da comparação de e-mail.
export function normalizeText(v) {
  return t(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// e-mail minimamente válido (mesma regra do banco: submit_pesquisa/submit_vote).
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// ── FAQ: filtro por categoria + busca instantânea ────────────────────────────
/**
 * Filtra o FAQ por `category` (slug; 'todas' = tudo) e `query` (texto livre).
 * A busca é insensível a caixa/acento e casa em pergunta + resposta + rótulo da
 * categoria + termos. Multi-termo exige TODOS os tokens (AND). Retorna um novo
 * array na ordem original.
 */
export function queryFaq(items = [], { category = 'todas', query = '' } = {}) {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean)
  return items.filter((item) => {
    if (category && category !== 'todas' && item.category !== category) return false
    if (tokens.length === 0) return true
    const corpus = normalizeText(
      [item.question, item.answer, item.categoryLabel, ...(item.terms || [])].join(' '),
    )
    return tokens.every((tok) => corpus.includes(tok))
  })
}

// ── Acordeão: uma resposta aberta por vez ────────────────────────────────────
// Clicar no aberto fecha (null); clicar em outro troca. Estado puro, testável.
export function toggleAccordion(openId, id) {
  return openId === id ? null : id
}

// ── Formulário ───────────────────────────────────────────────────────────────
export const CONTACT_REQUIRED = ['name', 'email', 'subject', 'message']

export const EMPTY_CONTACT = { name: '', email: '', whatsapp: '', subject: '', message: '' }

const MSG = {
  name: 'Informe seu nome.',
  email: 'Informe um e-mail para contato.',
  emailInvalido: 'E-mail inválido. Confira e tente de novo.',
  subject: 'Selecione um assunto.',
  subjectInvalido: 'Selecione um assunto da lista.',
  message: 'Escreva sua mensagem.',
}

/**
 * Valida o contato. WhatsApp é opcional (não bloqueia). Retorna { ok, errors }
 * com errors mapeando campo → mensagem clara (feedback junto ao campo).
 */
export function validateContact(form = {}) {
  const errors = {}
  if (!t(form.name)) errors.name = MSG.name
  if (!t(form.email)) errors.email = MSG.email
  else if (!EMAIL_RE.test(t(form.email))) errors.email = MSG.emailInvalido
  if (!t(form.subject)) errors.subject = MSG.subject
  else if (!CONTACT_SUBJECTS.includes(t(form.subject))) errors.subject = MSG.subjectInvalido
  if (!t(form.message)) errors.message = MSG.message
  return { ok: Object.keys(errors).length === 0, errors }
}

/**
 * Monta o payload do RPC. SÓ campos públicos — status/source/reviewed_at/
 * internal_notes ficam a cargo do servidor. WhatsApp vazio vira null.
 */
export function buildContactPayload(form = {}) {
  return {
    p_name: t(form.name),
    p_email: t(form.email).toLowerCase(),
    p_whatsapp: t(form.whatsapp) || null,
    p_subject: t(form.subject),
    p_message: t(form.message),
  }
}

/**
 * Orquestra o envio. Valida; se inválido, NÃO chama o rpc. Grava via rpc
 * injetado; só reporta 'success' quando o rpc devolve error null. Qualquer erro
 * (rpc ou exceção) vira 'error' — nunca afirmar que enviou se a gravação falhar.
 * `rpc(name, payload)` deve resolver `{ error }` no estilo supabase-js.
 */
export async function submitContact(form, rpc) {
  const { ok, errors } = validateContact(form)
  if (!ok) return { ok: false, status: 'invalid', errors }
  try {
    const { error } = await rpc('submit_contact_request', buildContactPayload(form))
    if (error) return { ok: false, status: 'error', error }
    return { ok: true, status: 'success' }
  } catch (error) {
    return { ok: false, status: 'error', error }
  }
}
