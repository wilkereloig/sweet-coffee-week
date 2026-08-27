import React from 'react'
import { api } from '../../lib/marcaApi'
import { minhasSolicitacoes, mapaRespondidas, prazoTexto } from '../../lib/pedidosMarca'
import { VistaCabeca } from '../VistaCabeca'

/*
 * Vista Pedidos (marca) — porta fiel de public/painel/index.html: markup
 * #mvPedidos (~1631-1644) e desenharSolicitacoes (~5112-5144).
 *
 * Só leitura. Quem marca um pedido como respondido é a ORGANIZAÇÃO
 * (marcarRespondido, ~3662, do lado dela) — um pedido pode ser resolvido por
 * telefone, e a fonte não dá nenhum botão de ação pra marca aqui. Esta vista
 * só mostra o quê, pra quem e até quando.
 *
 * ⚠️ Igual à fonte: sem participação aberta, `carregarParticipacao` nunca
 * roda do lado estático — as solicitações não chegam a ser buscadas.
 */
const ICONE_PEDIDOS = (
  <>
    <path d="M16 5.2 28.8 26.8H3.2L16 5.2Z" />
    <path d="M16 13v5.6" />
    <circle cx="16" cy="22.6" r="1.5" fill="currentColor" stroke="none" />
  </>
)

export function Pedidos() {
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState(null)
  const [participacao, setParticipacao] = React.useState(null)
  const [lista, setLista] = React.useState([])
  const [feitos, setFeitos] = React.useState({})

  React.useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)
    api('participacoes?select=*&order=created_at.desc&limit=1')
      .then((pas) => {
        const pa = (pas && pas[0]) || null
        if (!ativo) return null
        setParticipacao(pa)
        if (!pa) return null
        return Promise.all([
          api('solicitacoes?select=*&order=prazo_em.asc.nullslast'),
          api('solicitacao_estado?select=*&participacao_id=eq.' + pa.id),
        ]).then(([s, e]) => {
          if (!ativo) return
          setLista(s || [])
          setFeitos(mapaRespondidas(e || []))
        })
      })
      .catch((e) => {
        if (!ativo || (e && e.message === 'sessao_expirada')) return
        setErro('Não deu para carregar os pedidos agora. Recarregue a página.')
      })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  const minhas = React.useMemo(() => minhasSolicitacoes(lista, participacao), [lista, participacao])

  return (
    <section>
      <VistaCabeca
        acento="laranja" viewBox="0 0 32 32" strokeWidth={2.2}
        icone={ICONE_PEDIDOS} titulo="Pedidos" nota="O que a organização pediu, e até quando"
      />

      {erro && <div className="aviso erro">{erro}</div>}
      {!erro && carregando && <p className="nota">Carregando.</p>}
      {!erro && !carregando && !participacao && (
        <p className="nota">Nenhuma edição aberta para você no momento.</p>
      )}

      {!erro && !carregando && participacao && (
        <div className="card">
          <p className="rotulo">O que a organização pediu</p>
          <h2>Pedidos e prazos</h2>
          {minhas.length === 0 && <p className="nota">Nenhum pedido no momento.</p>}
          {minhas.map((s) => {
            const feita = !!feitos[s.id]
            const p = prazoTexto(s.prazo_em)
            return (
              <div className="linha" key={s.id}>
                <div className="corpo">
                  <b>{s.titulo}</b>
                  <span>{s.texto}</span>
                </div>
                <div className="lado">
                  {feita
                    ? <span className="selo completo">Respondido</span>
                    : (p.texto ? <span className={p.classe ? 'selo ' + p.classe : 'selo'}>{p.texto}</span> : null)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
