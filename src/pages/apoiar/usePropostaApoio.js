/*
 * Estado do formulário de proposta de apoio. O CONTRATO de envio não mudou:
 * validação e gravação em src/lib/supportInterest.js (lógica pura, `rpc`
 * injetada), porta anti-robô em src/lib/enviarFormulario.js. Sucesso só quando
 * a gravação confirma; qualquer erro vira estado 'error', nunca "enviado".
 */
import React from 'react'
import { criarEnvioProtegido } from '../../lib/enviarFormulario'
import { EMPTY_SUPPORT, validateSupport, submitSupport } from '../../lib/supportInterest'

// Uma porta por página montada: o carimbo de abertura (aberto_em) é dela.
const rpc = criarEnvioProtegido()

export function usePropostaApoio() {
  const [form, setForm] = React.useState(EMPTY_SUPPORT)
  const [errors, setErrors] = React.useState({})
  const [sending, setSending] = React.useState(false)
  const [state, setState] = React.useState('idle') // idle | success | error

  const onChange = (campo) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [campo]: value }))
    // limpa o erro do campo (e o de contato, que depende de e-mail + WhatsApp)
    if (errors[campo] || errors.contato) {
      setErrors(({ [campo]: _drop, contato: _c, ...resto }) => resto)
    }
    if (state === 'error') setState('idle')
  }

  const recomecar = () => {
    setForm(EMPTY_SUPPORT)
    setErrors({})
    setState('idle')
  }

  // Com erro, o foco vai ao primeiro campo marcado — quem usa teclado ou leitor
  // de tela não precisa procurar o que faltou.
  const mostrarErros = (el, novos) => {
    setErrors(novos)
    requestAnimationFrame(() => el?.querySelector('[aria-invalid="true"]')?.focus())
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const el = e.currentTarget
    if (sending) return
    const check = validateSupport(form)
    if (!check.ok) { mostrarErros(el, check.errors); return }
    setSending(true)
    const res = await submitSupport(form, rpc)
    setSending(false)
    if (res.status === 'invalid') { mostrarErros(el, res.errors); return }
    if (res.status === 'success') { setErrors({}); setState('success'); return }
    setState('error')
  }

  return { form, errors, sending, state, onChange, onSubmit, recomecar }
}
