/*
 * /cartoon/caca/compartilhar (spec 15 §13): três blocos que não se misturam —
 *   1. progresso público (arte vertical para Stories), 2. links públicos de casa, combo e rota,
 *   3. o link PESSOAL do mapa: credencial só da pessoa, sempre à mão aqui e nunca na arte, no texto ou nos links públicos.
 * Nunca leva e-mail, WhatsApp, chave pessoal, link de recuperação ou token de convite na arte (ver compartilhar/arte.js).
 */
import React from 'react'
import { CompartilharArte } from '../compartilhar/CompartilharArte.jsx'
import { LinksPublicos } from '../compartilhar/LinksPublicos.jsx'
import { GuardarMapa } from '../GuardarMapa.jsx'
import { Link } from '../../componentes/base.jsx'
import * as C from '../../rota/carimbo.js'
import { CACA, CACA_CAMINHOS as RUA } from '../textos.js'

const T = CACA.guardar

export default function Compartilhar ({ caca, navigate, dados }) {
  // Só com mapa reconhecido pelo banco (estado 'pronto') e chave válida: o link é sempre o do mapa aberto agora.
  const reconhecido = caca.estado === 'pronto' && C.chaveValida(caca.chave)
  return (
    <div className="ct-caca__central">
      <CompartilharArte caca={caca} dados={dados} />
      <LinksPublicos dados={dados} navigate={navigate} />
      {reconhecido && !caca.recemCriado
        ? <GuardarMapa chave={caca.chave} titulo={T.tituloAqui} />
        : !reconhecido && (
          <div className="ct-caca__bloco">
            <p className="ct-nota">{T.semMapa} <Link className="ct-link-frase" href={RUA.recuperar} navigate={navigate}>{T.recuperar}</Link></p>
          </div>
        )}
    </div>
  )
}
