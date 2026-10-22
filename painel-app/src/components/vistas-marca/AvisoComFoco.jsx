import React from 'react'

/*
 * O resultado de uma ação da marca (reservar horário, confirmar leitura, enviar resposta, baixar), dito NO LUGAR
 * em que a pessoa agiu e com o foco nele. O botão que ela tocou costuma sumir (a vaga some, o "Li e confirmo"
 * vira "Leitura confirmada", a resposta muda de lista): sem isto o foco cai no <body>, o leitor de tela não
 * anuncia o que nasceu junto com o texto e quem enxerga pode ter o resultado fora da tela.
 *
 * `aviso` = { tom: 'ok' | 'erro', texto } ou null. O foco entra uma vez por aviso (por identidade do objeto):
 * a releitura que refaz a tela não o rouba de novo. `focus()` já leva o elemento para dentro da tela.
 */
const jaFocados = new WeakSet()

export function AvisoComFoco({ aviso, className = '' }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (!aviso || jaFocados.has(aviso) || !ref.current) return
    jaFocados.add(aviso)
    ref.current.focus()
  }, [aviso])
  if (!aviso) return null
  const erro = aviso.tom === 'erro'
  return (
    <p ref={ref} tabIndex={-1} className={'ui-nota ' + (erro ? 'ui-nota--erro' : 'ui-nota--ok') + (className ? ' ' + className : '')} role={erro ? 'alert' : 'status'}>
      {aviso.texto}
    </p>
  )
}
