import React from 'react'
import { Folha } from './Folha'
import { notificacoesOrg } from '../lib/notificacoes'

/*
 * Sino de notificação do cabeçalho + gaveta com a lista — porta de
 * notificacoesOrg/atualizarBadgeNotif/abrirNotificacoes
 * (public/painel/index.html ~2838-2938). Usa Folha (§Folha.jsx) para o
 * corpo, em vez de reimplementar a mesma gaveta.
 *
 * `notifLidas` era módulo-global na versão estática (por sessão de aba);
 * aqui é estado do componente — mesmo efeito, sem variável solta.
 *
 * `estado` são os dados que notificacoesOrg() deriva (dados/solicitacoes/
 * sessoes/participantes). Nenhuma vista além de Respostas existe ainda
 * (Fase 1), então quem monta este componente hoje não tem o que passar
 * além de `dados` — o sino funciona, só a lista fica mais curta até as
 * vistas de produção/marcas existirem e alimentarem o resto.
 */
const NOTIF_ICONE = {
  alerta: ['#FF4810', '#3D1308', <><path d="M12 4.2 21 20H3Z" /><path d="M12 10.2v4" /><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" /></>],
  ok: ['#3D1308', '#FEF0DD', <><circle cx="12" cy="12" r="8.8" /><path d="M7.8 12.3l3 3 5.4-6.4" /></>],
  info: ['#01AFCC', '#3D1308', <><circle cx="12" cy="12" r="8.8" /><path d="M12 11.1V16.6" /><circle cx="12" cy="7.6" r="1.1" fill="currentColor" stroke="none" /></>],
  agenda: ['#FDBB1A', '#3D1308', <><path d="M4.2 7h15.6A1.8 1.8 0 0 1 21.6 8.8v10.4a1.8 1.8 0 0 1-1.8 1.8H4.2a1.8 1.8 0 0 1-1.8-1.8V8.8A1.8 1.8 0 0 1 4.2 7Z" /><path d="M2.4 11.4h19.2" /><path d="M7.6 3.8v4.6M16.4 3.8v4.6" /></>],
}

export function NotificacoesOrg({ estado, onNavegar }) {
  const [aberto, setAberto] = React.useState(false)
  const [lidas, setLidas] = React.useState({})

  const fila = notificacoesOrg(estado)
  const naoLidas = fila.filter((n) => !lidas[n.texto])

  function marcarLidas() {
    const novo = { ...lidas }
    fila.forEach((n) => { novo[n.texto] = true })
    setLidas(novo)
  }

  function clicar(n) {
    setLidas((l) => ({ ...l, [n.texto]: true }))
    setAberto(false)
    if (onNavegar) onNavegar(n.vista)
  }

  return (
    <>
      <button className="pn-cabeca__btn" type="button" aria-label="Notificações" onClick={() => setAberto(true)}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4.4c-3 0-5.4 2.4-5.4 5.6v3.3L5 16.6h14l-1.6-3.3v-3.3c0-3.2-2.4-5.6-5.4-5.6Z" /><path d="M10 19.2a2 2 0 0 0 4 0" />
        </svg>
        {naoLidas.length > 0 && <span className="pn-badge is-novo">{naoLidas.length}</span>}
      </button>

      <Folha
        aberto={aberto}
        titulo="Notificações"
        sub={naoLidas.length ? naoLidas.length + (naoLidas.length === 1 ? ' não lida' : ' não lidas') : 'Tudo lido'}
        onFechar={() => setAberto(false)}
      >
        {naoLidas.length > 0 && (
          <button className="og-btn og-btn--vazado og-btn--mini" type="button" style={{ marginBottom: 16 }} onClick={marcarLidas}>
            Marcar lidas
          </button>
        )}
        {fila.length === 0 && <p className="og-forms__nota">Nada por aqui agora.</p>}
        {fila.length > 0 && (
          <ul className="pn-lista" style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0, listStyle: 'none' }}>
            {fila.map((n, i) => {
              const [bg, tinta, path] = NOTIF_ICONE[n.tipo] || NOTIF_ICONE.info
              const lida = !!lidas[n.texto]
              return (
                <li key={i}>
                  <button type="button" className={'pn-notif' + (lida ? '' : ' is-naolida')} onClick={() => clicar(n)}>
                    <span className="pn-notif__disco" style={{ background: bg, color: tinta }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {path}
                      </svg>
                    </span>
                    <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <span className="pn-notif__texto">{n.texto}</span>
                    </span>
                    {!lida && <span className="pn-notif__ponto" aria-label="Não lida" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Folha>
    </>
  )
}
