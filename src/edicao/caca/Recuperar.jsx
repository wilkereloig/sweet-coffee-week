/*
 * /cartoon/caca/recuperar (spec 15 §4): pede o código por e-mail, valida e guarda a chave NOVA no aparelho. Quem só sabe
 * o e-mail não acessa o mapa sem o código. A recuperação dá ao aparelho uma chave nova e as chaves antigas seguem valendo (migration 20270131, 12/11/2026): os outros aparelhos não precisam recuperar de novo.
 */
import React from 'react'
import { Link } from '../componentes/base.jsx'
import { CodigoPorEmail } from './CodigoPorEmail.jsx'
import { AbrirPeloLink } from './CriarMapa.jsx'
import { GuardarMapa } from './GuardarMapa.jsx'
import { CACA, CACA_CAMINHOS } from './textos.js'

const T = CACA.recuperar

export function Recuperar ({ caca, navigate }) {
  const [feito, setFeito] = React.useState(null) // { apelido }

  if (feito) {
    return (
      <div className="ct-caca__bloco" role="status">
        <p className="ct-sub">{CACA.codigo.recuperado(feito.apelido)}</p>
        <div className="ct-acoes"><Link href={CACA_CAMINHOS.central} navigate={navigate} className="ct-botao">{T.voltar}</Link></div>
      </div>
    )
  }

  const concluir = (r) => { if (caca.entrar(r.chave)) setFeito({ apelido: r.apelido }) }
  const abrirLink = (k) => { if (caca.entrar(k)) navigate(CACA_CAMINHOS.central) }

  return (
    <div className="ct-caca__recuperar">
      {caca.chave && (
        <div className="ct-caca__bloco">
          <p className="ct-sub">{T.jaAberto}</p>
          <GuardarMapa chave={caca.chave} />
          <div className="ct-acoes"><Link href={CACA_CAMINHOS.central} navigate={navigate} className="ct-botao ct-botao--contorno">{T.voltar}</Link></div>
        </div>
      )}
      <div className="ct-caca__bloco">
        <CodigoPorEmail finalidade="recuperar" chave={caca.chave} navigate={navigate} aoConcluir={concluir} aoAbrirLink={abrirLink} />
      </div>
      <details className="ct-carimbar__ja-tenho">
        <summary>{CACA.link.titulo}</summary>
        <AbrirPeloLink aoAbrir={abrirLink} />
      </details>
      <p className="ct-nota">{CACA.aparelho.ios}</p>
    </div>
  )
}
