/*
 * /cartoon/caca/compartilhar (spec 15 §13): arte vertical do progresso para Stories + links públicos de casa, combo e rota.
 * Nunca leva e-mail, WhatsApp, chave pessoal, link de recuperação ou token de convite (ver compartilhar/arte.js).
 */
import React from 'react'
import { CompartilharArte } from '../compartilhar/CompartilharArte.jsx'
import { LinksPublicos } from '../compartilhar/LinksPublicos.jsx'

export default function Compartilhar ({ caca, navigate, dados }) {
  return (
    <div className="ct-caca__central">
      <CompartilharArte caca={caca} dados={dados} />
      <LinksPublicos dados={dados} navigate={navigate} />
    </div>
  )
}
