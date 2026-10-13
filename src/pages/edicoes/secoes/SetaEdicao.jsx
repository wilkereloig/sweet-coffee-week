import React from 'react'
import { Seta } from '../../../components/Seta'
import { SetaVolta } from '../icones'

/*
 * Seta de passar EDIÇÃO — a mesma peça no rodapé do desktop e na régua do
 * celular (`seta · anos · seta`, §7.2). Diz para onde vai: o nome da edição de
 * destino é o nome acessível E aparece no hover/foco (.scw-icone-rotulo,
 * §6.11), então ninguém precisa adivinhar o que a seta faz. Sem destino, o
 * botão fica `disabled` de verdade (sai da tabulação) no estado padrão .45.
 */
export function SetaEdicao({ lado, alvo, onClick }) {
  const proxima = lado === 'proxima'
  const rotulo = alvo
    ? `${proxima ? 'Próxima' : 'Anterior'}: ${alvo.tema} · ${alvo.code}`
    : `Esta é a ${proxima ? 'última' : 'primeira'} edição`
  return (
    <button
      type="button"
      className={`scw-edx__seta scw-icone-rotulo${proxima ? ' scw-edx__seta--proxima scw-icone-rotulo--esquerda' : ''}`}
      disabled={!alvo}
      aria-label={rotulo}
      data-rotulo={rotulo}
      onClick={onClick}
    >
      {proxima ? <Seta size={17} /> : <SetaVolta size={17} />}
    </button>
  )
}
