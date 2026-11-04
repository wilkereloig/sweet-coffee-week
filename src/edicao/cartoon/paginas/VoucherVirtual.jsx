/*
 * Voucher virtual — a página que o link do voucher abre (/cartoon/voucher/<token>).
 * Mostra o cartão da casa (a mesma arte do impresso, frente e verso), o código SCW-XXXXX e o QR que a marca lê para dar baixa; o estado vem do banco
 * (`voucher_virtual_ver`) e a data é conferida aqui. A página não dá baixa: quem valida é a marca, no painel dela.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { Link, Logo, Carregando } from '../../componentes/base.jsx'
import * as V from '../../rota/voucherVirtual.js'
import { arteDoVoucher, CARTAO, VERSO_QR, VERSO_CODIGO } from '../../../data/voucherArteEdicao.js'

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
// No cartão, só os módulos (margem 0) e fundo transparente: o verso já tem a caixa branca do impresso.
const QR_NO_CARTAO = { margin: 0, width: 480, color: { dark: '#3A150F', light: '#0000' } }

function Qr ({ valor }) {
  const url = useQr(valor, QR_GRANDE)
  return url
    ? <img className="ct-voucher__qr" src={url} width="160" height="160" alt="QR do voucher, para a casa dar baixa" />
    : <div className="ct-voucher__qr ct-voucher__qr--vazio" aria-hidden="true" />
}

/**
 * O cartão do impresso, em tela: a frente é a arte da casa; o verso é a arte da cor dela, sem QR e sem código, e os dois
 * entram aqui por cima, em milímetros (viewBox 84 x 54 = o corte do cartão). O QR do cartão é pequeno de propósito, só
 * para o verso ficar completo: quem lê é o QR grande da página.
 */
function Cartao ({ arte, face, codigo, valorQr, casa }) {
  const id = React.useId()
  const qr = useQr(valorQr, QR_NO_CARTAO)
  const verso = face === 'verso'
  return (
    <svg className="ct-vcard" viewBox={`0 0 ${CARTAO.largura} ${CARTAO.altura}`} role="img"
      aria-label={verso ? `Verso do cartão-voucher, com o código ${codigo}` : `Frente do cartão-voucher da ${casa}`}>
      <defs><clipPath id={id}><rect width={CARTAO.largura} height={CARTAO.altura} rx={CARTAO.raio} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <image href={verso ? arte.verso : arte.frente} width={CARTAO.largura} height={CARTAO.altura} preserveAspectRatio="none" />
        {verso && qr && <image href={qr} x={VERSO_QR.x} y={VERSO_QR.y} width={VERSO_QR.lado} height={VERSO_QR.lado} />}
        {verso && <text className="ct-vcard__codigo" x={VERSO_CODIGO.x} y={VERSO_CODIGO.y} fontSize={VERSO_CODIGO.corpo} textAnchor="middle">{codigo}</text>}
      </g>
      <rect className="ct-vcard__contorno" x=".3" y=".3" width={CARTAO.largura - 0.6} height={CARTAO.altura - 0.6} rx={CARTAO.raio - 0.3} />
    </svg>
  )
}

export function VoucherVirtual ({ token, navigate, dados }) {
  const valido = V.FORMATO_TOKEN.test(token || '')
  const [estado, setEstado] = React.useState(valido ? 'carregando' : 'desconhecido') // carregando · ok · desconhecido · rede
  const [r, setR] = React.useState(null)
  const titulo = React.useRef(null)
  const [face, setFace] = React.useState('frente') // frente · verso do cartão

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
  const arte = arteDoVoucher(r.slug)
  return (
    <section className="ct-bloco ct-voucher ct-voucher--ok">
      <p className="ct-rotulo">Voucher virtual · {V.VALIDADE.texto}</p>
      <h1 ref={titulo} tabIndex={-1} className="ct-h1">{m.titulo}</h1>
      {arte && (
        <div className="ct-voucher__cartao">
          <Cartao arte={arte} face={face} codigo={r.codigo} valorQr={V.linkDaBaixa(origem, r.codigo)} casa={nome} />
          <button type="button" className="ct-botao ct-botao--contorno" onClick={() => setFace(face === 'frente' ? 'verso' : 'frente')}>
            {face === 'frente' ? 'Ver o verso' : 'Ver a frente'}
          </button>
        </div>
      )}
      {!arte && (
        <div className="ct-voucher__casa">
          {casa && <Logo casa={casa} tamanho={88} />}
          <p className="ct-lead">{nome}</p>
        </div>
      )}
      <p className="ct-voucher__codigo" aria-label={`Código ${r.codigo}`}>{r.codigo}</p>
      <Qr valor={V.linkDaBaixa(origem, r.codigo)} />
      <p className="ct-lead">{m.texto}</p>
      <p className="ct-nota">Vale 1 combo da edição Cartoon do Sweet &amp; Coffee Week, uma vez só. Uso pessoal e intransferível. Venda proibida. Não inclui taxa de entrega, embalagem ou itens adicionais.</p>
      {links}
    </section>
  )
}
