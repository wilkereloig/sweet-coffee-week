/*
 * Montado uma vez em toda página /cartoon/caca*: troca manifest/ícone/nome do <head> pelos da Caça, registra o service worker
 * próprio (escopo /cartoon/caca) e começa a guardar o convite de instalação. Ao sair, o <head> volta ao que era. Não renderiza nada.
 */
import React from 'react'
import { trocarHead, registrarSw } from './manifesto.js'
import { escutarInstalacao } from './instalacao.js'

export function ManifestoDaCaca () {
  React.useEffect(() => {
    const desligar = escutarInstalacao() // antes da troca: o navegador reavalia a instalação quando o manifest muda
    const restaurar = trocarHead()
    registrarSw()
    return () => { restaurar(); desligar() }
  }, [])
  return null
}
