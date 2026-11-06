/*
 * Entrada breve do app instalado: selo da edição + "Bem-vindo!" sobre o creme do manifest, ~1 s. Fica POR CIMA do app já montado
 * (não segura carregamento nem toque: pointer-events none) e some sozinha. Ver entrada.js para quando aparece.
 */
import React from 'react'
import { ENTRADA, deveMostrarEntrada } from './entrada.js'

export function EntradaDaCaca () {
  const [ligada, setLigada] = React.useState(() => deveMostrarEntrada())
  React.useEffect(() => {
    if (!ligada) return undefined
    const t = setTimeout(() => setLigada(false), ENTRADA.duracaoMs)
    return () => clearTimeout(t)
  }, [ligada])
  if (!ligada) return null
  return (
    <div className="ct-caca-entrada" aria-hidden="true" style={{ '--entrada-ms': `${ENTRADA.duracaoMs}ms` }}>
      <img className="ct-caca-entrada__logo" src={ENTRADA.logo} alt="" width="240" height="224" decoding="async" />
      <p className="ct-caca-entrada__texto">{ENTRADA.texto}</p>
    </div>
  )
}
