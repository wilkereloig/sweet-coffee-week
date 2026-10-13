/*
 * Formulário de contato — estado, erro por campo e envio.
 *
 * O contrato de envio NÃO mudou: `submitContact` (src/lib/contactRequest.js)
 * valida, monta o payload público e grava pela porta protegida. Ele só devolve
 * sucesso quando a gravação confirma — e esta tela só diz "enviada" nesse caso.
 *
 * Estados: idle · enviando · ok · erro. Erro de preenchimento não é estado da
 * tela: fica por campo (`erros`), junto de cada um, e o foco vai para o
 * primeiro campo com problema. A validação é a da lib (a mesma que o teste
 * cobre), não a bolha nativa do navegador — por isso o form é `noValidate`.
 */
import React from 'react'
import { EMPTY_CONTACT, submitContact } from '../../lib/contactRequest'
import { criarEnvioProtegido } from '../../lib/enviarFormulario'

// Ordem dos campos na tela — é a ordem em que o foco procura o primeiro erro.
const ORDEM = ['name', 'email', 'subject', 'message']

export const idCampo = (chave) => `ctt-campo-${chave}`

export function useFormularioContato() {
  // A porta guarda o momento em que a tela abriu (o servidor recusa envio em
  // menos de 3s); uma por montagem da página.
  const rpc = React.useMemo(() => criarEnvioProtegido(), [])
  const [form, setForm] = React.useState(EMPTY_CONTACT)
  const [erros, setErros] = React.useState({})
  const [estado, setEstado] = React.useState('idle')

  const mudarCampo = (chave) => (e) => {
    const valor = e.target.value
    setForm((f) => ({ ...f, [chave]: valor }))
    // Corrigiu o campo → some o aviso dele; os outros continuam.
    setErros((atual) => {
      if (!atual[chave]) return atual
      const { [chave]: _, ...resto } = atual
      return resto
    })
    if (estado === 'erro') setEstado('idle')
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (estado === 'enviando') return
    setEstado('enviando')
    const res = await submitContact(form, rpc)
    if (res.ok) {
      setErros({})
      setForm(EMPTY_CONTACT)
      setEstado('ok')
      return
    }
    if (res.status === 'invalid') {
      setErros(res.errors || {})
      setEstado('idle')
      const primeiro = ORDEM.find((k) => res.errors && res.errors[k])
      if (primeiro) requestAnimationFrame(() => document.getElementById(idCampo(primeiro))?.focus())
      return
    }
    // Falha de gravação: o que a pessoa escreveu fica no formulário.
    setEstado('erro')
  }

  const recomecar = () => {
    setEstado('idle')
    requestAnimationFrame(() => document.getElementById(idCampo('name'))?.focus())
  }

  return { form, erros, estado, mudarCampo, enviar, recomecar }
}
