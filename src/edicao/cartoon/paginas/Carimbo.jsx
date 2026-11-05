/*
 * Caça aos Carimbos — a página que o QR abre (docs/cartoon-2026-2/14 §14.3 e §14.14; 15-caca-especificacao §2, §3, §12):
 *   /cartoon/carimbo/<código da unidade>  QR do balcão (8 caracteres);
 *   /cartoon/carimbo/<slug da casa>        QR do display de mesa (/q/d1-<casa>): mostra "Ver o combo" e "Carimbar",
 *                                          e o banco escolhe a unidade da casa mais perto do celular.
 * Sem mapa no aparelho: começa um (sem senha) ou cola o link pessoal. Com mapa: um toque pede a posição e carimba.
 * Primeira vez na casa = carimbo PENDENTE até avaliar o combo (a ordem entre carimbar e avaliar é livre). Regras e
 * limites são do banco (`mapa_carimbar` / `mapa_carimbar_casa`); aqui só se pede, mostra e explica, e nada é dado como
 * gravado sem a confirmação do servidor. A criação do mapa e o guardar vivem em src/edicao/caca/.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { Link, Logo } from '../../componentes/base.jsx'
import * as C from '../../rota/carimbo.js'
import { api } from '../../caca/api.js'
import { ajudaLocalizacao, resumoProgresso } from '../../caca/regras.js'
import { CACA, CACA_CAMINHOS } from '../../caca/textos.js'
import { CriarMapa } from '../../caca/CriarMapa.jsx'
import { GuardarMapa } from '../../caca/GuardarMapa.jsx'

const SLUG_CASA = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const T = CACA.carimbo

function AjudaDeLocalizacao ({ ajuda }) {
  return (
    <ul className="ct-carimbar__como">
      {ajuda.passos.map(([onde, passos]) => <li key={onde}><strong>{onde}:</strong> {passos}</li>)}
    </ul>
  )
}

/*
 * Depois de avaliar (tela de sucesso do formulário): a avaliação também vale na Caça aos Carimbos. Com mapa no aparelho,
 * avisa que valida o carimbo da casa (e que carimbar é presencial); sem mapa, oferece criar um com os mesmos dados.
 */
export function CacaAposAvaliar ({ casa, navigate }) {
  const [chave, setChave] = React.useState(() => C.lerChave(EDICAO.codigo))
  const [novo, setNovo] = React.useState(false)
  const A = CACA.aposAvaliar
  return (
    <div className="ct-carimbar__avaliar">
      <p className="ct-rotulo">{T.rotulo}</p>
      {chave
        ? (
          <>
            <p className="ct-sub">{novo ? A.mapaCriado : A.titulo}</p>
            <p className="ct-nota">{A.textoComMapa(casa)}</p>
            {novo && <GuardarMapa chave={chave} />}
            <div className="ct-acoes"><Link href={CACA_CAMINHOS.central} navigate={navigate} className="ct-botao ct-botao--contorno">{T.central}</Link></div>
          </>
          )
        : (
          <CriarMapa
            titulo={A.criarTitulo}
            nota={A.criarNota}
            botao={A.criarAcao}
            comLink={false}
            aoAbrir={(k) => { setChave(k); setNovo(true) }}
          />
          )}
    </div>
  )
}

export function Carimbo ({ codigo, navigate, dados }) {
  const porUnidade = C.FORMATO_QR.test(codigo || '')
  const porCasa = !porUnidade && SLUG_CASA.test(codigo || '')
  const valido = porUnidade || porCasa
  const [chave, setChave] = React.useState(() => C.lerChave(EDICAO.codigo))
  const [estado, setEstado] = React.useState('pronto') // pronto · carimbando · ok · recusa
  const [r, setR] = React.useState(null)
  const [novo, setNovo] = React.useState(false)
  const [mapa, setMapa] = React.useState(null)
  const titulo = React.useRef(null)
  const casa = (dados?.participantes || []).find((p) => p.slug === (r?.slug || (porCasa ? codigo : null)))?.casa

  React.useEffect(() => { if (estado === 'ok' || estado === 'recusa') titulo.current?.focus() }, [estado])

  async function carimbar (k = chave) {
    setEstado('carimbando'); setR(null)
    const pos = await C.pedirPosicao()
    try {
      const onde = { p_lat: pos.lat ?? null, p_lng: pos.lng ?? null, p_precisao: pos.precisao ?? null }
      const resp = porCasa
        ? await C.chamar('mapa_carimbar_casa', { p_chave: k, p_slug: codigo, ...onde })
        : await C.chamar('mapa_carimbar', { p_chave: k, p_qr: codigo, ...onde })
      if (resp?.motivo === 'mapa_desconhecido') { C.apagarChave(EDICAO.codigo); setChave(null); setEstado('pronto'); return }
      // `posicao` = erro do navegador (negada · indisponivel · demorou) e `precisao` = margem do GPS, para explicar a recusa.
      setR(resp?.motivo === 'sem_localizacao' ? { ...resp, posicao: pos.erro } : resp?.motivo === 'longe' ? { ...resp, precisao: pos.precisao } : resp)
      setEstado(resp?.ok ? 'ok' : 'recusa')
      if (resp?.ok) {
        api.mapaLer(k).then((m) => {
          if (!m.ok) return
          setMapa(m.mapa)
          C.gravarPerfil(EDICAO.codigo, { nome: m.mapa.apelido, email: m.mapa.email, whatsapp: m.mapa.whatsapp })
        })
      }
    } catch { setR({ motivo: 'rede' }); setEstado('recusa') }
  }
  function abrir (k, criado) { setChave(k); setNovo(criado); carimbar(k) }
  const avaliar = () => navigate(C.prepararAvaliacao({ caminho: EDICAO.caminho, slug: r.slug, unidade: r.unidade, mapa }))

  const links = (
    <div className="ct-acoes">
      <Link href={CACA_CAMINHOS.central} navigate={navigate} className="ct-botao ct-botao--contorno">{T.central}</Link>
      <Link href={CACA_CAMINHOS.casas} navigate={navigate} className="ct-botao ct-botao--contorno">{T.casas}</Link>
    </div>
  )

  if (!valido) {
    const m = C.mensagemRecusa({ motivo: 'qr_invalido' })
    return (
      <section className="ct-bloco ct-carimbar">
        <p className="ct-rotulo">{T.rotulo}</p>
        <h1 className="ct-h1">{m.titulo}</h1>
        <p className="ct-lead">{m.texto}</p>
        {links}
      </section>
    )
  }

  if (estado === 'ok') {
    const nome = casa?.nome || 'a casa'
    const resumo = mapa ? resumoProgresso(mapa) : null
    return (
      <section className="ct-bloco ct-carimbar ct-carimbar--ok">
        <p className="ct-rotulo">{T.rotulo}</p>
        <h1 ref={titulo} tabIndex={-1} className="ct-h1">{r.avaliou ? T.okTitulo : T.pendenteTitulo}</h1>
        <div className="ct-carimbar__casa">
          {casa && <Logo casa={casa} tamanho={88} />}
          <p className="ct-lead">
            {r.primeira ? T.primeira(nome) : T.outra(nome)}
            {r.avaliou ? '' : ` ${T.pendenteLead}`}
            {r.avaliou && resumo?.total > 0 ? ` ${T.validadas(resumo.validadas, resumo.total)}` : ''}
          </p>
        </div>
        {r.avaliou && !r.primeira && <p className="ct-nota">{T.extra}</p>}
        {!r.avaliou && (
          <div className="ct-carimbar__avaliar">
            <p className="ct-sub">{T.pendenteSub}</p>
            <p className="ct-nota">{T.pendenteTexto(nome)}</p>
            <div className="ct-acoes"><button type="button" className="ct-botao" onClick={avaliar}>{T.pendenteAcao}</button></div>
          </div>
        )}
        {novo && <GuardarMapa chave={chave} />}
        {links}
      </section>
    )
  }

  if (estado === 'recusa') {
    const ajuda = ajudaLocalizacao(r)
    const m = ajuda ? { titulo: ajuda.titulo, texto: ajuda.texto }
      : r?.motivo === 'rede' ? T.semConexao
        : C.mensagemRecusa(r, { casa: casa?.nome })
    const deNovo = ['longe', 'sem_localizacao', 'rede'].includes(r?.motivo)
    return (
      <section className="ct-bloco ct-carimbar">
        <p className="ct-rotulo">{T.rotulo}</p>
        <h1 ref={titulo} tabIndex={-1} className="ct-h1">{m.titulo}</h1>
        <p className="ct-lead">{m.texto}</p>
        {ajuda && <AjudaDeLocalizacao ajuda={ajuda} />}
        {deNovo && <div className="ct-acoes"><button type="button" className="ct-botao" onClick={() => carimbar()}>{T.tentar}</button></div>}
        {novo && <GuardarMapa chave={chave} />}
        {links}
      </section>
    )
  }

  return (
    <section className="ct-bloco ct-carimbar">
      <p className="ct-rotulo">{T.rotulo}</p>
      <h1 className="ct-h1">{porCasa && casa ? casa.nome : T.titulo}</h1>
      {porCasa && casa && <div className="ct-carimbar__casa"><Logo casa={casa} tamanho={88} /></div>}
      <p className="ct-lead">{T.lead}</p>
      {porCasa && (
        <div className="ct-acoes">
          <Link href={`${EDICAO.caminho}/participantes/${codigo}`} navigate={navigate} className="ct-botao ct-botao--contorno">Ver o combo</Link>
        </div>
      )}
      {chave
        ? (
          <>
            <div className="ct-acoes">
              <button type="button" className="ct-botao ct-carimbar__principal" onClick={() => carimbar()} disabled={estado === 'carimbando'}>
                {estado === 'carimbando' ? T.conferindo : T.carimbar}
              </button>
            </div>
            <p className="ct-nota">{T.privacidade}</p>
          </>
          )
        : <CriarMapa navigate={navigate} titulo="Primeira vez? Comece seu mapa" botao="Começar e carimbar" aoAbrir={abrir} />}
      <p className="ct-sr" aria-live="polite">{estado === 'carimbando' ? 'Conferindo o carimbo.' : ''}</p>
      <p className="ct-nota"><Link href={CACA_CAMINHOS.regulamento} navigate={navigate}>Regulamento da Caça aos Carimbos</Link></p>
    </section>
  )
}
