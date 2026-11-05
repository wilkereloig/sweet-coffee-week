/*
 * Código de 6 dígitos por e-mail (spec 15 §4; contrato de identidade): serve à recuperação do mapa ('recuperar', pede o
 * e-mail) e à confirmação do e-mail ('confirmar', e-mail fixo, o do mapa). A resposta do pedido é a mesma exista ou não
 * mapa para o e-mail, então a tela nunca diz se o e-mail tem mapa. Se a edge responder `email_indisponivel`, mostra a
 * alternativa honesta em vez de prometer um e-mail que não sai. Chave, código e e-mail nunca vão para URL, log ou analytics.
 */
import React from 'react'
import { EDICAO } from '../config.js'
import * as C from '../rota/carimbo.js'
import { Link } from '../componentes/base.jsx'
import { api as apiPadrao } from './api.js'
import { emailMascarado } from './regras.js'
import { CACA, mensagemDoMotivo } from './textos.js'
import { AbrirPeloLink } from './CriarMapa.jsx'
import { GuardarMapa } from './GuardarMapa.jsx'

const T = CACA.codigo
const ESPERA = 60

function useContagem () {
  const [fim, setFim] = React.useState(0)
  const [agora, setAgora] = React.useState(0)
  React.useEffect(() => {
    if (!fim) return undefined
    const id = setInterval(() => { const n = Date.now(); setAgora(n); if (n >= fim) setFim(0) }, 500)
    return () => clearInterval(id)
  }, [fim])
  return [fim ? Math.max(Math.ceil((fim - agora) / 1000), 0) : 0, () => { setAgora(Date.now()); setFim(Date.now() + ESPERA * 1000) }]
}

/** Quando o e-mail não sai: o que a pessoa pode fazer de verdade. */
function Alternativa ({ chave, navigate, aoAbrirLink }) {
  return (
    <div className="ct-caca__alternativa" role="alert">
      <p className="ct-sub">{T.indisponivelTitulo}</p>
      <p className="ct-nota">{T.indisponivelTexto}</p>
      <ul className="ct-carimbar__como">
        <li>{T.indisponivelLink}</li>
        <li>{T.indisponivelOrg}</li>
      </ul>
      {chave && <GuardarMapa chave={chave} />}
      {aoAbrirLink && <AbrirPeloLink aoAbrir={(k) => aoAbrirLink(k)} />}
      {navigate && <div className="ct-acoes"><Link href="/contato" navigate={navigate} className="ct-botao ct-botao--contorno">{T.falarOrg}</Link></div>}
    </div>
  )
}

/**
 * `finalidade`: 'recuperar' | 'confirmar'. `emailFixo`: o e-mail do mapa (só em 'confirmar'). `chave`: a chave deste aparelho,
 * se houver (para a alternativa de copiar o link). `aoConcluir(resultado)`: recebe `{ finalidade, chave?, apelido? }`.
 * `aoAbrirLink(chave)`: se vier, a alternativa também deixa colar o link pessoal.
 */
export function CodigoPorEmail ({ finalidade, emailFixo = '', chave = null, navigate, aoConcluir, aoAbrirLink, api = apiPadrao }) {
  const [email, setEmail] = React.useState(() => emailFixo || C.lerPerfil(EDICAO.codigo).email)
  const [etapa, setEtapa] = React.useState('pedir') // pedir · codigo · indisponivel
  const [codigo, setCodigo] = React.useState('')
  const [ocupado, setOcupado] = React.useState(false)
  const [aviso, setAviso] = React.useState(null) // { tipo: 'ok' | 'erro', texto }
  const [espera, comecarEspera] = useContagem()
  const alvo = emailFixo || email

  async function pedir (e) {
    e?.preventDefault()
    setOcupado(true); setAviso(null)
    const r = await api.pedirCodigo({ email: alvo, finalidade })
    setOcupado(false)
    if (r.ok && r.limitado) { setEtapa('codigo'); setAviso({ tipo: 'ok', texto: T.limitado }); return }
    if (r.ok) { setEtapa('codigo'); comecarEspera(); setAviso({ tipo: 'ok', texto: T.enviado }); return }
    if (r.motivo === 'email_indisponivel') { setEtapa('indisponivel'); return }
    setAviso({ tipo: 'erro', texto: r.motivo === 'email_invalido' ? T.emailInvalido : r.motivo === 'rede' ? T.rede : mensagemDoMotivo(r.motivo) })
  }

  async function validar (e) {
    e.preventDefault()
    setOcupado(true); setAviso(null)
    const r = await api.codigoValidar({ email: alvo, codigo, finalidade })
    setOcupado(false)
    if (!r.ok) { setAviso({ tipo: 'erro', texto: r.motivo === 'rede' ? T.rede : T.invalido }); setCodigo(''); return }
    setCodigo('')
    aoConcluir?.(r)
  }

  if (etapa === 'indisponivel') return <Alternativa chave={chave} navigate={navigate} aoAbrirLink={aoAbrirLink} />

  return (
    <div className="ct-caca__codigo">
      {etapa === 'pedir' && (
        <form className="ct-form" onSubmit={pedir} noValidate>
          <p className="ct-nota">{emailFixo ? T.pedirConfirmar(emailMascarado(emailFixo) || 'o seu e-mail') : T.pedirRecuperar}</p>
          {!emailFixo && (
            <label className="ct-campo"><span>{T.campoEmail}</span>
              <input type="email" autoComplete="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} required />
            </label>
          )}
          <div className="ct-acoes"><button type="submit" className="ct-botao" disabled={ocupado}>{ocupado ? T.enviando : T.enviar}</button></div>
        </form>
      )}
      {etapa === 'codigo' && (
        <>
          <form className="ct-form" onSubmit={validar} noValidate>
            <label className="ct-campo"><span>{T.campoCodigo}</span>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={7} value={codigo} spellCheck={false}
                onChange={(e) => setCodigo(e.target.value.replace(/[^\d ]/g, ''))} required />
            </label>
            <div className="ct-acoes">
              <button type="submit" className="ct-botao" disabled={ocupado || codigo.replace(/\s/g, '').length !== 6}>{ocupado ? T.validando : T.validar}</button>
              <button type="button" className="ct-botao ct-botao--contorno" onClick={pedir} disabled={ocupado || espera > 0}>{espera > 0 ? T.reenviarEm(espera) : T.reenviar}</button>
            </div>
          </form>
        </>
      )}
      <div aria-live="polite">
        {aviso && <p className={aviso.tipo === 'erro' ? 'ct-aviso' : 'ct-nota'} role={aviso.tipo === 'erro' ? 'alert' : undefined}>{aviso.texto}</p>}
      </div>
    </div>
  )
}
