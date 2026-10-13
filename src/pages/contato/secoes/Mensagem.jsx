/*
 * 03 Falar com a equipe — a triagem e o formulário na MESMA seção.
 *
 * Eram duas seções seguidas: "Cada assunto tem uma porta certa" (três cards) e
 * "Não achou sua resposta? Escreva para a gente" (formulário) — que repetia a
 * chamada "Não encontrou sua dúvida?" da central logo acima. Agora a triagem é
 * a coluna "Antes de escrever", ao lado do formulário (embaixo dele não: no
 * celular ela vem ANTES, que é quando ela evita uma mensagem no lugar errado).
 *
 * Formulário: rótulo real em cada campo, erro junto do campo (aria-invalid +
 * aria-describedby), estado de envio, sucesso e falha. Só diz "enviada" quando
 * a gravação confirma (useFormularioContato → submitContact).
 */
import React from 'react'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../../../config/channels'
import { CONTACT_SUBJECTS } from '../../../data/contactFaq'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import Rotulo from '../../../components/Rotulo'
import Seta from '../../../components/Seta'
import { NotaPrivacidade } from '../../../components/NotaPrivacidade'
import { CAMINHOS, FORMULARIO as F, MENSAGEM } from '../../../data/conteudo/contato'
import { idCampo, useFormularioContato } from '../useFormularioContato'

function Campo({ chave, form, erros, mudarCampo, cheio, children }) {
  const erro = erros[chave]
  const idErro = `${idCampo(chave)}-erro`
  const props = {
    id: idCampo(chave),
    name: chave,
    value: form[chave],
    onChange: mudarCampo(chave),
    required: true,
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': erro ? idErro : undefined,
  }
  return (
    <div className={`scw-campo ctt-campo${cheio ? ' ctt-campo--full' : ''}${erro ? ' is-erro' : ''}`}>
      <label htmlFor={idCampo(chave)}>{F.campos[chave].rotulo}</label>
      {children(props)}
      {erro && (
        <span id={idErro} className="ctt-campo__erro">
          <ScwIcon nome="aviso/erro" tamanho={16} />
          {erro}
        </span>
      )}
    </div>
  )
}

function Formulario() {
  const { form, erros, estado, mudarCampo, enviar, recomecar } = useFormularioContato()
  const okRef = React.useRef(null)
  React.useEffect(() => { if (estado === 'ok' && okRef.current) okRef.current.focus() }, [estado])

  if (estado === 'ok') {
    return (
      <div className="ctt-ok" role="status" tabIndex={-1} ref={okRef}>
        <span className="ctt-ok__selo" aria-hidden="true"><ScwIcon nome="ui/feito" tamanho={24} /></span>
        <strong>{F.okTitulo}</strong>
        <p>{F.okTexto}</p>
        <button type="button" className="scw-btn ctt-ok__acao" onClick={recomecar}>{F.okDeNovo}</button>
      </div>
    )
  }

  const enviando = estado === 'enviando'
  const base = { form, erros, mudarCampo }
  const c = F.campos
  return (
    <form className="ctt-form" onSubmit={enviar} noValidate aria-busy={enviando || undefined} aria-labelledby="ctt-form-titulo">
      <p id="ctt-form-titulo" className="ctt-form__titulo">{F.titulo}</p>
      <p className="ctt-form__obrigatorio">{F.obrigatorio}</p>
      <div className="ctt-form__grade">
        <Campo chave="name" {...base}>
          {(p) => <input {...p} placeholder={c.name.exemplo} autoComplete={c.name.autoComplete} />}
        </Campo>
        <Campo chave="email" {...base}>
          {(p) => <input {...p} type="email" inputMode="email" placeholder={c.email.exemplo} autoComplete={c.email.autoComplete} />}
        </Campo>
        <Campo chave="subject" cheio {...base}>
          {(p) => (
            <select {...p}>
              <option value="">{c.subject.vazio}</option>
              {CONTACT_SUBJECTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </Campo>
        <Campo chave="message" cheio {...base}>
          {(p) => <textarea {...p} rows={5} placeholder={c.message.exemplo} />}
        </Campo>
      </div>

      {estado === 'erro' && (
        <p className="ctt-form__aviso" role="alert">
          <ScwIcon nome="aviso/alerta" tamanho={20} />
          <span>
            {F.erro}{' '}
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">{INSTAGRAM_HANDLE}</a>.
          </span>
        </p>
      )}

      <div className="ctt-form__pe">
        <NotaPrivacidade className="ctt-form__nota" texto={F.nota} />
        <button type="submit" className="scw-btn ctt-btn-choco ctt-enviar" disabled={enviando}>
          {enviando ? F.enviando : F.enviar} <Seta size={17} />
        </button>
      </div>
      <p className="scw-sr" role="status">{enviando ? F.enviandoAviso : ''}</p>
    </form>
  )
}

export function Mensagem({ verAssunto }) {
  return (
    <section id="mensagem" className="ctt-sec ctt-sec--bege ctt-falar" aria-labelledby="ctt-mensagem-titulo">
      <div className="ctt-falar__cabeca">
        <Rotulo icone="topicos/mensagem">{MENSAGEM.rotulo}</Rotulo>
        <h2 id="ctt-mensagem-titulo" className="scw-h2 ctt-cabeca__titulo">
          {MENSAGEM.titulo[0]}
          <span className="ctt-sem-quebra"><em className="ctt-destaque">{MENSAGEM.titulo[1]}</em>{MENSAGEM.titulo[2]}</span>
        </h2>
        <p className="ctt-falar__lead">{MENSAGEM.lead}</p>
      </div>

      <div className="ctt-falar__grade">
        <div className="ctt-caminhos">
          <p id="ctt-caminhos-rotulo" className="ctt-caminhos__rotulo">{MENSAGEM.caminhosRotulo}</p>
          <ul className="ctt-caminhos__lista" aria-labelledby="ctt-caminhos-rotulo">
            {CAMINHOS.map((k) => (
              <li key={k.chave} className="ctt-caminho">
                <span className="scw-disco ctt-caminho__ic" style={{ '--c': k.cor, '--tinta': k.tinta }} aria-hidden="true">
                  <ScwIcon nome={k.icone} tamanho={24} />
                </span>
                <div className="ctt-caminho__texto">
                  <strong>{k.titulo}</strong>
                  <span>{k.texto}</span>
                  {k.rota ? (
                    <a className="ctt-porta__link" href={`#${k.rota}`}>{k.link} <Seta size={16} /></a>
                  ) : (
                    <a
                      className="ctt-porta__link"
                      href="#perguntas"
                      onClick={(e) => { e.preventDefault(); verAssunto(k.assunto) }}
                    >
                      {k.link} <Seta size={16} />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="ctt-direto">
            <span>{MENSAGEM.diretoTexto}</span>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              <ScwIcon nome="redes/instagram" tamanho={24} /> {INSTAGRAM_HANDLE}
            </a>
          </p>
        </div>

        <div className="ctt-falar__form" data-mo-fora>
          <Formulario />
        </div>
      </div>
    </section>
  )
}

export default Mensagem
