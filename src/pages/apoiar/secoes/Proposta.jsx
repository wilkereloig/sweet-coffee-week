import React from 'react'
import { Rotulo } from '../../../components/Rotulo'
import { Seta } from '../../../components/Seta'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { SEGMENTOS, INTERESSES } from '../../../lib/supportInterest'
import { INSTAGRAM_URL, INSTAGRAM_HANDLE } from '../../../config/channels'
import { PROPOSTA as P } from '../../../data/conteudo/apoiar'
import { Destaque } from '../../participar/comum'
import { NotaPrivacidade } from '../../../components/NotaPrivacidade'
import { usePropostaApoio } from '../usePropostaApoio'

const ID_CONTATO = 'pa-apoio-contato-err'

/* 05 Proposta — formulário em destaque. Fica fora do motor de movimento
   (`form` e data-mo-fora): quem chega para preencher não espera animação. */
export function Proposta() {
  const { form, errors, sending, state, onChange, onSubmit, recomecar } = usePropostaApoio()
  const sucessoRef = React.useRef(null)

  React.useEffect(() => {
    if (state === 'success') sucessoRef.current?.focus()
  }, [state])

  // Campo de texto (label + input + erro). Chamado como FUNÇÃO — nunca como
  // <Campo/> — para o React não remontar o input a cada tecla (perderia o foco).
  // E-mail e WhatsApp também ficam inválidos quando falta o contato: o erro é
  // dos dois juntos, e o recado único fica descrito nos dois.
  const campo = ({ name, label, type = 'text', placeholder, opcional, autoComplete, inputMode }) => {
    const err = errors[name]
    const eid = `pa-apoio-${name}-err`
    const doContato = (name === 'email' || name === 'whatsapp') && errors.contato
    const descrito = [err && eid, doContato && ID_CONTATO].filter(Boolean).join(' ') || undefined
    return (
      <label className="scw-campo">
        <span>{label}{opcional ? '' : ' *'}</span>
        <input
          type={type}
          name={name}
          value={form[name]}
          onChange={onChange(name)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={!opcional}
          aria-required={opcional ? undefined : 'true'}
          aria-invalid={err || doContato ? 'true' : undefined}
          aria-describedby={descrito}
        />
        {err && <span className="pa-erro" id={eid} role="alert">{err}</span>}
      </label>
    )
  }

  const seletor = ({ name, label, opcoes }) => {
    const err = errors[name]
    const eid = `pa-apoio-${name}-err`
    return (
      <label className="scw-campo">
        <span>{label} *</span>
        <select
          name={name}
          value={form[name]}
          onChange={onChange(name)}
          required
          aria-required="true"
          aria-invalid={err ? 'true' : undefined}
          aria-describedby={err ? eid : undefined}
        >
          <option value="">Selecione</option>
          {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {err && <span className="pa-erro" id={eid} role="alert">{err}</span>}
      </label>
    )
  }

  return (
    <section id="proposta" className="scw-secao scw-secao--bege" aria-labelledby="pa-proposta-titulo" data-mo-fora>
      <div className="pa-form__intro">
        <Rotulo icone="apoio">{P.rotulo}</Rotulo>
        <h2 className="scw-h2" id="pa-proposta-titulo">
          {P.titulo} <Destaque>{P.destaque}</Destaque>
        </h2>
        <p>{P.texto}</p>
      </div>

      {state === 'success' ? (
        <div className="pa-sucesso" ref={sucessoRef} tabIndex={-1} role="status">
          <span className="pa-sucesso__mark" aria-hidden="true">
            <ScwIcon nome="feito" tamanho={24} />
          </span>
          <strong>{P.sucessoTitulo}</strong>
          <p>{P.sucesso}</p>
          <button type="button" onClick={recomecar}>Enviar outra proposta</button>
        </div>
      ) : (
        <form className="pa-form" onSubmit={onSubmit} noValidate aria-labelledby="pa-proposta-titulo" aria-busy={sending || undefined}>
          <div className="pa-form__grade">
            {campo({ name: 'nome', label: 'Seu nome', placeholder: 'Quem fala com a gente', autoComplete: 'name' })}
            {campo({ name: 'empresa', label: 'Empresa ou marca', placeholder: 'Nome da empresa', autoComplete: 'organization' })}
            {campo({ name: 'email', label: 'E-mail', type: 'email', placeholder: 'voce@empresa.com', autoComplete: 'email', opcional: true })}
            {campo({ name: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: '(84) 90000-0000', autoComplete: 'tel', inputMode: 'tel', opcional: true })}
            <p
              className={`pa-form__consent scw-campo--full${errors.contato ? ' pa-erro' : ''}`}
              id={ID_CONTATO}
              role={errors.contato ? 'alert' : undefined}
            >
              {errors.contato || 'Informe pelo menos um contato: e-mail ou WhatsApp.'}
            </p>
            {seletor({ name: 'segmento', label: 'Segmento', opcoes: SEGMENTOS })}
            {seletor({ name: 'interesse', label: 'Tipo de apoio', opcoes: INTERESSES })}
            <label className="scw-campo scw-campo--full">
              <span>Mensagem <em>(opcional)</em></span>
              <textarea
                name="mensagem"
                value={form.mensagem}
                onChange={onChange('mensagem')}
                rows={3}
                placeholder="Conte o que sua empresa busca com o apoio."
              />
            </label>
          </div>

          <div className="pa-form__pe">
            <p className="pa-form__consent"><NotaPrivacidade texto={P.privacidade} /></p>
            <button type="submit" className="scw-btn pa-form__enviar" disabled={sending}>
              {sending ? 'Enviando…' : <>Enviar proposta <Seta /></>}
            </button>
          </div>
          <p className="pa-form__status" role="status" aria-live="polite">
            {sending && 'Enviando sua proposta…'}
            {!sending && state === 'error' && (
              <>Não conseguimos registrar sua proposta agora. Tente de novo em instantes ou fale
                com a organização no{' '}
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{INSTAGRAM_HANDLE}</a>.</>
            )}
          </p>
        </form>
      )}
    </section>
  )
}
