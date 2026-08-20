/*
 * PRÉ-CADASTRO DE PARTICIPAÇÃO — lógica pura (validação + payload + orquestração
 * de envio). SEM import de supabase e SEM import.meta: assim roda no browser (via
 * Vite, na Participar.jsx) E no node (teste offline com rpc injetado). O RPC é
 * passado por parâmetro (`submitInterest(form, rpc)`) — a página injeta
 * `(name, payload) => supabase.rpc(name, payload)`.
 *
 * Segurança: o payload carrega SÓ os campos do formulário público. status,
 * reviewed_at e internal_notes são do servidor (RPC security definer) e NUNCA
 * saem daqui. Ver supabase/migrations/20260710_participation_interests.sql.
 */

// Tipos de estabelecimento (select da etapa 1). Não pedimos CNPJ/documento.
export const NEGOCIOS = [
  'Doceria', 'Confeitaria', 'Cafeteria', 'Restaurante',
  'Sorveteria', 'Cafeteria de especialidade', 'Empório', 'Marca autoral', 'Outro',
]

export const DEFAULT_CIDADE = 'Natal/RN'

// Estado inicial do formulário — cidade já vem preenchida (editável).
export const EMPTY_INTEREST = {
  marca: '', tipo: '', bairro: '', cidade: DEFAULT_CIDADE,
  responsavel: '', email: '', whatsapp: '', instagram: '', apresentacao: '',
}

// Campos obrigatórios por etapa. instagram e apresentacao são opcionais.
export const STEP_FIELDS = {
  1: ['marca', 'tipo', 'bairro', 'cidade'],
  2: ['responsavel', 'email', 'whatsapp'],
}

const MSG = {
  marca: 'Informe o nome da marca.',
  tipo: 'Selecione o tipo de negócio.',
  bairro: 'Informe o bairro.',
  cidade: 'Informe a cidade.',
  responsavel: 'Informe o nome do responsável.',
  email: 'Informe um e-mail para contato.',
  emailInvalido: 'E-mail inválido. Confira e tente de novo.',
  whatsapp: 'Informe um WhatsApp.',
  whatsappInvalido: 'WhatsApp incompleto. Inclua DDD e número.',
}

const t = (v) => (v == null ? '' : String(v)).trim()
// e-mail minimamente válido (mesma regra do banco: submit_pesquisa/submit_vote).
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const digits = (v) => t(v).replace(/\D/g, '')

/**
 * Valida o interesse. Com `{ step }`, valida só os obrigatórios daquela etapa
 * (para liberar o botão "Continuar"); sem step, valida o formulário inteiro.
 * Retorna { ok, errors } — errors mapeia campo → mensagem clara.
 */
export function validateInterest(form = {}, { step } = {}) {
  const fields = step ? (STEP_FIELDS[step] || []) : [...STEP_FIELDS[1], ...STEP_FIELDS[2]]
  const errors = {}
  for (const f of fields) {
    if (!t(form[f])) { errors[f] = MSG[f]; continue }
    if (f === 'email' && !EMAIL_RE.test(t(form.email))) errors.email = MSG.emailInvalido
    if (f === 'whatsapp' && digits(form.whatsapp).length < 10) errors.whatsapp = MSG.whatsappInvalido
  }
  return { ok: Object.keys(errors).length === 0, errors }
}

/**
 * Monta o payload do RPC. SÓ campos públicos — status/reviewed_at/internal_notes
 * ficam a cargo do servidor. Opcionais vazios viram null.
 */
export function buildInterestPayload(form = {}) {
  const orNull = (v) => t(v) || null
  return {
    p_marca: t(form.marca),
    p_tipo: t(form.tipo),
    p_bairro: t(form.bairro),
    p_cidade: t(form.cidade),
    p_responsavel: t(form.responsavel),
    p_email: t(form.email).toLowerCase(),
    p_whatsapp: t(form.whatsapp),
    p_instagram: orNull(form.instagram),
    p_apresentacao: orNull(form.apresentacao),
  }
}

/**
 * Orquestra o envio. Valida; se inválido, NÃO chama o rpc. Grava via rpc
 * injetado; só reporta 'success' quando o rpc devolve error null. Qualquer erro
 * (rpc ou exceção) vira 'error' — nunca afirmar que salvou se a gravação falhar.
 * `rpc(name, payload)` deve resolver `{ error }` no estilo supabase-js.
 */
export async function submitInterest(form, rpc) {
  const { ok, errors } = validateInterest(form)
  if (!ok) return { ok: false, status: 'invalid', errors }
  try {
    const { error } = await rpc('submit_participation_interest', buildInterestPayload(form))
    if (error) return { ok: false, status: 'error', error }
    return { ok: true, status: 'success' }
  } catch (error) {
    return { ok: false, status: 'error', error }
  }
}
