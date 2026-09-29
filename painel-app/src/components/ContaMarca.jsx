import React from 'react'
import { api } from '../lib/marcaApi'
import { Folha } from './Folha'
import { AvisosAparelho } from './AvisosAparelho'
import { Secao } from './ui'

/*
 * Conta da marca (reestruturação 29/09/2026, etapa 7): o que é da PESSOA no
 * aparelho, não do festival — avisos neste aparelho e sair. Morava dentro de
 * Arquivos, onde ninguém procuraria.
 *
 * A assinatura do push grava pela tabela, sob RLS. O endpoint é UNIQUE e
 * `update` está revogado de propósito — não dá upsert: apaga a linha antiga
 * deste endpoint (a RLS só deixa apagar o que é desta marca) e insere.
 */
export function ContaMarca({ aberto, onFechar, onSair }) {
  const [marca, setMarca] = React.useState(null)
  React.useEffect(() => {
    if (!aberto || marca) return
    api('participantes?select=id,nome_marca&order=created_at.desc&limit=1')
      .then((l) => setMarca((l && l[0]) || null)).catch(() => setMarca(null))
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  async function registrar(a) {
    if (!marca) throw new Error('Sua conta ainda não está ligada a uma marca.')
    await api('push_subscriptions?endpoint=eq.' + encodeURIComponent(a.endpoint), { metodo: 'DELETE' }).catch(() => null)
    await api('push_subscriptions', {
      metodo: 'POST',
      prefer: 'return=minimal',
      corpo: { papel: 'marca', participante_id: marca.id, endpoint: a.endpoint, p256dh: a.p256dh, auth_chave: a.auth, user_agent: a.userAgent },
    })
  }
  const remover = (endpoint) => api('push_subscriptions?endpoint=eq.' + encodeURIComponent(endpoint), { metodo: 'DELETE' })

  return (
    <Folha aberto={aberto} titulo="Sua conta" sub={marca ? marca.nome_marca : 'Painel SCW · Participante'} onFechar={onFechar}>
      <div className="ui-pilha">
        <Secao titulo="Avisos neste aparelho" nota="Aviso é por aparelho: ligue em cada celular ou computador que você usa.">
          <AvisosAparelho
            explicacao="Ligue para saber na hora quando a organização mandar mensagem, fizer um pedido, publicar um arquivo ou marcar as fotos — mesmo com o painel fechado."
            registrar={registrar}
            remover={remover}
          />
        </Secao>
        <Secao titulo="Sair" nota="Neste aparelho. Para entrar de novo, use o nome do estabelecimento e a sua senha.">
          <button className="og-btn og-btn--vazado" type="button" onClick={onSair}>Sair do painel</button>
        </Secao>
      </div>
    </Folha>
  )
}
