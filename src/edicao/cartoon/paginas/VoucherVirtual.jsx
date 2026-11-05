/*
 * Voucher virtual — a página que o link do voucher abre (/cartoon/voucher/<token>).
 * Um vale no KV da edição (pedido do Wilker, 04/11; substitui o cartão em tela): a pessoa vê a casa e o combo e toca em
 * "Abrir voucher"; o vale abre no picote e mostra o QR que a marca lê e o código SCW-XXXXX. O estado vem do banco
 * (`voucher_virtual_ver`) e a data é conferida aqui. A página não dá baixa: quem valida é a marca, no painel dela.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { Link, Logo, Foto, Carregando } from '../../componentes/base.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import * as V from '../../rota/voucherVirtual.js'
import { MARCAS_PARCEIROS } from '../../../data/imageLibrary'
import { MARCAS } from '../textos.js'

/** QR como imagem (data URL). `opcoes` do pacote `qrcode`; o pacote só é baixado quando a página precisa dele. */
function useQr (valor, opcoes) {
  const [url, setUrl] = React.useState('')
  React.useEffect(() => {
    let vivo = true
    import('qrcode')
      .then((m) => (m.default || m).toDataURL(valor, opcoes))
      .then((u) => { if (vivo) setUrl(u) })
      .catch(() => {})
    return () => { vivo = false }
  }, [valor, opcoes])
  return url
}

const QR_GRANDE = { margin: 1, width: 320, color: { dark: '#3A150F', light: '#FDF0DE' } }

function Qr ({ valor }) {
  const url = useQr(valor, QR_GRANDE)
  return url
    ? <img className="ct-voucher__qr" src={url} width="160" height="160" alt="QR do voucher, para a casa dar baixa" />
    : <div className="ct-voucher__qr ct-voucher__qr--vazio" aria-hidden="true" />
}

/** O vale: fechado mostra a casa e o combo; "Abrir voucher" solta a parte de baixo do picote, com o QR e o código. */
function Vale ({ r, p, nome, m, titulo, origem }) {
  const [aberto, setAberto] = React.useState(false)
  const codigo = React.useRef(null)
  const foto = p?.combo?.fotos?.principal
  const abrir = () => { setAberto(true); requestAnimationFrame(() => codigo.current?.focus()) }
  const sicredi = MARCAS_PARCEIROS.sicredi
  return (
    <article className={`ct-vale${aberto ? ' is-aberto' : ''}`}>
      <div className="ct-vale__topo ct-reticula">
        <p className="ct-etiqueta">Voucher digital</p>
        <div ref={titulo} tabIndex={-1} className="ct-vale__titulo"><Letreiro nivel={1} id="vale-titulo" tamanho="display" texto="Vale 1 combo" /></div>
        <div className="ct-vale__casa">
          {p?.casa && <Logo casa={p.casa} tamanho={64} />}
          <p>{nome}</p>
        </div>
        {foto && <div className="ct-vale__foto"><Foto foto={foto} proporcao="4 / 3" alt={foto.alt || ''} prioridade /></div>}
        <p className="ct-vale__validade">Válido de {V.VALIDADE.texto}</p>
        {!aberto && <button type="button" className="ct-botao ct-botao--acao" onClick={abrir}>Abrir voucher</button>}
      </div>
      <div className="ct-vale__picote" aria-hidden="true" />
      <div className="ct-vale__dobra">
        <div className="ct-vale__miolo">
          <p className="ct-lead">{m.titulo}</p>
          <Qr valor={V.linkDaBaixa(origem, r.codigo)} />
          <p ref={codigo} tabIndex={-1} className="ct-voucher__codigo" aria-label={`Código ${r.codigo}`}>{r.codigo}</p>
          <p>{m.texto}</p>
          <p className="ct-nota">Vale 1 combo da edição Cartoon do Sweet &amp; Coffee Week, uma vez só. Uso pessoal e intransferível. Venda proibida. Não inclui taxa de entrega, embalagem ou itens adicionais.</p>
        </div>
      </div>
      <div className="ct-vale__patrocinio">
        <p className="ct-marcas__rotulo">{MARCAS.patrocinio}</p>
        <img src={sicredi.src} alt={sicredi.alt} width={sicredi.largura} height={sicredi.altura} loading="lazy" decoding="async" />
      </div>
    </article>
  )
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

  const p = (dados?.participantes || []).find((x) => x.slug === r?.slug)
  const nome = r?.marca || p?.casa?.nome || 'a casa'
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

  return (
    <section className="ct-bloco ct-voucher">
      <Vale r={r} p={p} nome={nome} m={m} titulo={titulo} origem={globalThis.location?.origin || ''} />
      {links}
    </section>
  )
}
