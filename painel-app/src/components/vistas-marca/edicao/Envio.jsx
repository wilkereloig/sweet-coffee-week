import React from 'react'
import { Icone } from '../../Icone'
import { textoPublicacao } from '../../../lib/edicaoMarca'

/* Estado da publicação (marca_minha_publicacao): o que está no ar, à parte da conferência da organização. */
export function EstadoPublicacao({ pub }) {
  const t = textoPublicacao(pub)
  if (!t) return null
  return (
    <>
      <p className="em-publicacao" data-tom={t.tom} role="status">
        <Icone nome={t.tom === 'ok' ? 'sucesso' : t.tom === 'erro' ? 'alerta' : 'informacao'} tamanho={16} />
        <span>{t.texto}{t.link && <> <a href={t.link} target="_blank" rel="noopener noreferrer">Ver a página no site<Icone nome="link-externo" tamanho={16} /></a></>}</span>
      </p>
      {pub.alterado_apos_aprovacao && (
        <div className="aviso" role="note">
          Você alterou dados já aprovados. As alterações estão salvas e chegaram à organização; a versão publicada continua
          no ar até ela conferir e atualizar o site.
        </div>
      )}
    </>
  )
}
