import React from 'react'
import { Icone } from '../../Icone'
import { MacroSecao, Modulo, Botao } from '../../ui'
import { PDF_PARTICIPANTES } from '../../vistas/GuiaFotos'
import { fraseDaSessao } from '../../../lib/fotosMarca'

/*
 * Bloco 2 da aba Fotos — PREPARAÇÃO. O conteúdo é o Guia de fotos que já existe (tela `guia` + PDF): aqui só o
 * caminho até ele, para o texto não morar em dois lugares. Com a sessão marcada e por vir, a frase diz para quando
 * é; sessão já realizada (ou com data passada) não vira frase no presente (`fraseDaSessao`).
 */
export function Preparacao({ irPara, estado }) {
  const frase = fraseDaSessao(estado)
  const quando = frase ? ' ' + frase : ''
  return (
    <MacroSecao id="fm-preparacao" rotulo="Preparação" titulo="Antes da sessão" nota="O que levar e como deixar o combo pronto para a foto.">
      <Modulo icone="guia" titulo="Guia de fotos"
        acoes={(
          <>
            <Botao icone="guia" onClick={() => irPara('guia')}>Abrir o guia de fotos</Botao>
            <a className="og-btn og-btn--mini og-btn--vazado" href={PDF_PARTICIPANTES} download><Icone nome="baixar" tamanho={16} />Baixar o guia (PDF)</a>
          </>
        )}>
        <p className="ui-nota">O guia mostra como a sua foto vira arte, o que fazer e o que evitar, e o que levar no dia da sessão.{quando}</p>
      </Modulo>
    </MacroSecao>
  )
}
