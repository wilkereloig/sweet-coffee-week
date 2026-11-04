/*
 * Voucher virtual — a página que o link do voucher abre (/cartoon/voucher/<token>).
 * Mostra a casa, o código SCW-XXXXX e o QR que a marca lê para dar baixa; o estado vem do banco
 * (`voucher_virtual_ver`) e a data é conferida aqui. A página não dá baixa: quem valida é a marca, no painel dela.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { Link, Logo, Carregando } from '../../componentes/base.jsx'
import * as V from '../../rota/voucherVirtual.js'

function Qr ({ valor }) {
  const [url, setUrl] = React.useState('')
  React.useEffect(() => {
    let vivo = true
    import('qrcode')
      .then((m) => (m.default || m).toDataURL(valor, { margin: 1, width: 320, color: { dark: '#3A150F', light: '#FDF0DE' } }))
      .then((u) => { if (vivo) setUrl(u) })
      .catch(() => {})
    return () => { vivo = false }
  }, [valor])
  return url
    ? <img className="ct-voucher__qr" src={url} width="160" height="160" alt="QR do voucher, para a casa dar baixa" />
    : <div className="ct-voucher__qr ct-voucher__qr--vazio" aria-hidden="true" />
}

export function VoucherVirtual ({ token, navigate, dados }) {
  const valido = V.FORMATO_TOKEN.test(token || '')
  const [estado, setEstado] = React.useState(valido ? 'carregando' : 'desconhecido') // carregando · ok · desconhecido · rede
  const [r, setR] = React.useState(null)
  const titulo = React.useRef(null)

  const buscar = React.useCallback(() => {
    setEstado('carregando')
    V.consultar(token)
      .then((x) => { setR(x); setEstado(x ? 'ok' : 'desconhecido') })
      .catch(() => setEstado('rede'))
  }, [token])
  React.useEffect(() => { if (valido) buscar() }, [valido, buscar])
  React.useEffect(() => { if (estado !== 'carregando') titulo.current?.focus() }, [estado])

  const casa = (dados?.participantes || []).find((p) => p.slug === r?.slug)?.casa
  const nome = r?.marca || casa?.nome || 'a casa'
  const sit = estado === 'ok' ? V.situacao(r) : 'desconhecido'
  const m = estado === 'rede'
    ? { titulo: 'Sem conexão agora', texto: 'Confira a internet do celular e tente de novo.' }
    : V.mensagem(sit, { casa: nome })

  if (estado === 'carregando') return <Carregando texto="Abrindo seu voucher…" />

  const links = (
    <div className="ct-acoes">
      <Link href={`${EDICAO.caminho}/participantes`} navigate={navigate} className="ct-botao ct-botao--contorno">Ver as casas</Link>
    </div>
  )

  if (estado !== 'ok' || sit !== 'valido') {
    return (
      <section className="ct-bloco ct-voucher">
        <p className="ct-rotulo">Voucher virtual</p>
        <h1 ref={titulo} tabIndex={-1} className="ct-h1">{m.titulo}</h1>
        <p className="ct-lead">{m.texto}</p>
        {estado === 'rede' && <div className="ct-acoes"><button type="button" className="ct-botao" onClick={buscar}>Tentar de novo</button></div>}
        {estado === 'ok' && <p className="ct-nota ct-voucher__codigo-apagado">Código {r.codigo}</p>}
        {links}
      </section>
    )
  }

  const origem = globalThis.location?.origin || ''
  return (
    <section className="ct-bloco ct-voucher ct-voucher--ok">
      <p className="ct-rotulo">Voucher virtual · {V.VALIDADE.texto}</p>
      <h1 ref={titulo} tabIndex={-1} className="ct-h1">{m.titulo}</h1>
      <div className="ct-voucher__casa">
        {casa && <Logo casa={casa} tamanho={88} />}
        <p className="ct-lead">{nome}</p>
      </div>
      <p className="ct-voucher__codigo" aria-label={`Código ${r.codigo}`}>{r.codigo}</p>
      <Qr valor={V.linkDaBaixa(origem, r.codigo)} />
      <p className="ct-lead">{m.texto}</p>
      <p className="ct-nota">Vale 1 combo da edição Cartoon do Sweet &amp; Coffee Week, uma vez só. Uso pessoal e intransferível. Venda proibida. Não inclui taxa de entrega, embalagem ou itens adicionais.</p>
      {links}
    </section>
  )
}
