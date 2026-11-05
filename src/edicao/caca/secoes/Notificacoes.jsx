/*
 * Bloco de avisos da central (spec 15 §13): primeiro o centro de avisos (vale para todos, sem depender de push), depois a
 * opção de receber avisos no celular. Só aparece com mapa (a central o renderiza nesse caso). Não tem <h1>.
 */
import React from 'react'
import { CentroDeAvisos } from '../notificacoes/CentroDeAvisos.jsx'
import { AvisosPush } from '../notificacoes/AvisosPush.jsx'

export default function Notificacoes ({ caca, navigate, dados }) {
  if (!caca.chave) return null
  return (
    <>
      <CentroDeAvisos caca={caca} dados={dados} navigate={navigate} />
      <AvisosPush caca={caca} />
    </>
  )
}
