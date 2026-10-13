import React from 'react'

/*
 * Título com uma palavra destacada ({ antes, destaque, depois }, de
 * src/data/conteudo/home.js). `base` é a tinta REAL do título — senão o
 * destaque começa invisível sobre o próprio fundo (§10.6); `dest` é o acento
 * final. A animação é do hook useDestaqueTitulos.
 */
export function TituloDestaque({ t, base = 'var(--scw-choco)', dest = 'var(--scw-magenta)' }) {
  return (
    <>
      {t.antes}
      <em className="scw-destaque" data-destaque style={{ '--base': base, '--dest': dest }}>{t.destaque}</em>
      {t.depois}
    </>
  )
}

export default TituloDestaque
