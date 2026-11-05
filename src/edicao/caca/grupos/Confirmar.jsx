/*
 * Confirmação em linha para ação que não se desfaz (sair, remover, cancelar links). Sem window.confirm: o foco vai
 * para "Voltar" (a opção segura) e Escape cancela. A pergunta fica num grupo nomeado para o leitor de tela.
 */
import React from 'react'

export function Confirmar ({ pergunta, confirma, voltar = 'Voltar', aoConfirmar, aoVoltar, ocupado = false }) {
  const voltarRef = React.useRef(null)
  React.useEffect(() => { voltarRef.current?.focus() }, [])
  return (
    <div className="ct-grupos__confirmar" role="group" aria-label={pergunta} onKeyDown={(e) => { if (e.key === 'Escape') aoVoltar() }}>
      <p className="ct-nota">{pergunta}</p>
      <div className="ct-acoes">
        <button type="button" ref={voltarRef} className="ct-botao ct-botao--contorno" onClick={aoVoltar} disabled={ocupado}>{voltar}</button>
        <button type="button" className="ct-botao" onClick={aoConfirmar} disabled={ocupado}>{confirma}</button>
      </div>
    </div>
  )
}
