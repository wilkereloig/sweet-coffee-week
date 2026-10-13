import React from 'react'

/*
 * Nota de finalidade dos formulários (13/10/2026): diz para que servem os
 * dados e leva à Política de Privacidade. É ciência, não consentimento —
 * nenhum checkbox, e o envio nunca depende do aviso de cookies.
 */
export function NotaPrivacidade({ texto, className }) {
  return (
    <span className={className}>
      {texto}{' '}
      Saiba mais na <a href="#/privacidade">Política de Privacidade</a>.
    </span>
  )
}
