/*
 * Avisos no celular da central (spec 15 §13): escolha de categorias e ativar/desligar push. A lista dos avisos mora no sino do
 * cabeçalho da central (SinoDeAvisos) e funciona com ou sem push. Só aparece com mapa. Não tem <h1>.
 */
import React from 'react'
import { AvisosPush } from '../notificacoes/AvisosPush.jsx'

export default function Notificacoes ({ caca }) {
  if (!caca.chave) return null
  return <AvisosPush caca={caca} />
}
