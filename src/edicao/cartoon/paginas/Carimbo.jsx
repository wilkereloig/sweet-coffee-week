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
import { ajudaLocalizacao, resumoProgresso, aparelhoDoNavegador, passosParaAparelho } from '../../caca/regras.js'
import { usePermissaoLocalizacao } from '../../caca/usePermissaoLocalizacao.js'
import { CACA, CACA_CAMINHOS } from '../../caca/textos.js'
import { GPS } from '../../caca/textos-gps.js'
import { falhaDeLocalizacao, podePedirPresenca, pedidoDaCasa, precisaDeRevisao } from '../../caca/gps.js'
import { PedidoPresenca } from '../../caca/PedidoPresenca.jsx'
import { CriarMapa } from '../../caca/CriarMapa.jsx'
import { GuardarMapa } from '../../caca/GuardarMapa.jsx'
import { CartaoEmailDoAparelho } from '../../caca/CartaoEmail.jsx'

const SLUG_CASA = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const T = CACA.carimbo

/** Só o caminho do aparelho da pessoa fica à vista (Android não lê o do iPhone); os outros ficam recolhidos. */
function AjudaDeLocalizacao ({ ajuda }) {
  const { principais, outros } = passosParaAparelho(ajuda.passos, aparelhoDoNavegador(globalThis.navigator?.userAgent))
  const lista = (itens) => <ul className="ct-carimbar__como">{itens.map(([onde, passos]) => <li key={onde}><strong>{onde}:</strong> {passos}</li>)}</ul>
  return (
    <>
      {lista(principais)}
      {outros.length > 0 && <details className="ct-carimbar__outros"><summary>{GPS.outroAparelho}</summary>{lista(outros)}</details>}
    </>
  )
}

/** Dicas para o GPS pegar melhor, mostradas em toda falha de localização (inclusive "você está longe"). */
function DicasDeSinal () {
  return (
    <div className="ct-carimbar__dicas">
      <p className="ct-sub">{GPS.dicas.titulo}</p>
      <ul className="ct-carimbar__como">{GPS.dicas.itens.map((d) => <li key={d}>{d}</li>)}</ul>
    </div>
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
            <CartaoEmailDoAparelho navigate={navigate} />
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
  const [lendoMapa, setLendoMapa] = React.useState(false) // mapa_ler_v2 em curso depois do carimbo (E2E-4)
  const [progresso, setProgresso] = React.useState(null) // { i, n }: tentativa de GPS em curso
  const [falhas, setFalhas] = React.useState(0) // falhas de localização seguidas nesta abertura da página
  const [liberou, setLiberou] = React.useState(false) // estava bloqueada e a pessoa liberou nas configurações
  const [pedido, setPedido] = React.useState(null) // pedido de revisão desta casa: 'pendente' · 'aprovado' · 'negado'
  const permissao = usePermissaoLocalizacao() // estado do navegador, lido antes do toque (não pede a posição)
  const posicao = React.useRef(null) // última leitura do GPS: só em memória, só segue para a RPC do pedido
  const titulo = React.useRef(null)
  const casa = (dados?.participantes || []).find((p) => p.slug === (r?.slug || (porCasa ? codigo : null)))?.casa

  React.useEffect(() => { if (estado === 'ok' || estado === 'recusa') titulo.current?.focus() }, [estado])

  // Localização já bloqueada neste navegador: a ajuda (e o pedido de revisão) aparecem de cara, sem gastar o toque da pessoa.
  // Se ela libera nas configurações e volta, o estado muda sozinho e o botão volta; nunca se carimba sem o toque dela.
  const bloqueio = estado === 'recusa' && r?.motivo === 'sem_localizacao' && r?.posicao === 'negada'
  React.useEffect(() => {
    if (permissao === 'denied' && estado === 'pronto' && chave && valido) { setR({ motivo: 'sem_localizacao', posicao: 'negada' }); setEstado('recusa') }
    else if (permissao === 'granted' && bloqueio) { setR(null); setEstado('pronto'); setLiberou(true) }
  }, [permissao, estado, chave, valido, bloqueio])

  // Pedido de revisão já feito para esta casa? Só consulta quando a localização falhou e há mapa neste aparelho.
  const slugDaRecusa = r?.slug || (porCasa ? codigo : null)
  const consultarPedido = estado === 'recusa' && (falhaDeLocalizacao(r) || precisaDeRevisao(r)) && chave && slugDaRecusa
  React.useEffect(() => {
    if (!consultarPedido) return undefined
    let vivo = true
    api.excecaoMinhas(chave).then((m) => { if (vivo && m.ok) setPedido(pedidoDaCasa(m.pedidos, slugDaRecusa)?.estado || null) })
    return () => { vivo = false }
  }, [consultarPedido, chave, slugDaRecusa])

  async function carimbar (k = chave) {
    setEstado('carimbando'); setR(null); setProgresso(null)
    const pos = await C.capturarPosicao({ aoTentar: (i, n) => setProgresso({ i, n }) })
    posicao.current = Number.isFinite(pos.lat) ? { lat: pos.lat, lng: pos.lng, precisao: pos.precisao } : null
    try {
      const onde = { p_lat: pos.lat ?? null, p_lng: pos.lng ?? null, p_precisao: pos.precisao ?? null }
      const resp = porCasa
        ? await C.chamar('mapa_carimbar_casa', { p_chave: k, p_slug: codigo, ...onde })
        : await C.chamar('mapa_carimbar', { p_chave: k, p_qr: codigo, ...onde })
      if (resp?.motivo === 'mapa_desconhecido') { C.apagarChave(EDICAO.codigo); setChave(null); setEstado('pronto'); return }
      // `posicao` = erro do navegador (negada · indisponivel · demorou) e `precisao` = margem do GPS, para explicar a recusa.
      // Só é "carimbado" com `ok: true` do servidor; qualquer outra resposta é recusa.
      const final = resp && typeof resp === 'object' ? resp : { motivo: 'rede' }
      setR(final.motivo === 'sem_localizacao' ? { ...final, posicao: pos.erro } : final.motivo === 'longe' ? { ...final, precisao: pos.precisao } : final)
      const deu = final.ok === true
      setFalhas((n) => (deu ? 0 : falhaDeLocalizacao(final) ? n + 1 : n))
      setEstado(deu ? 'ok' : 'recusa')
      if (deu) {
        C.gravarUnidadeCarimbo(EDICAO.codigo, final.slug, final.unidade) // a avaliação abre já na unidade carimbada
        setLendoMapa(true)
        api.mapaLer(k).then((m) => {
          if (!m.ok) return
          setMapa(m.mapa)
          C.gravarPerfil(EDICAO.codigo, { nome: m.mapa.apelido, email: m.mapa.email, whatsapp: m.mapa.whatsapp })
        }).finally(() => setLendoMapa(false))
      }
    } catch { setR({ motivo: 'rede' }); setEstado('recusa') }
  }
  function abrir (k, criado) { setChave(k); setNovo(criado); carimbar(k) }
  // Apelido e e-mail vêm do mapa lido agora ou, se a leitura ainda não voltou, do perfil guardado no aparelho (E2E-4).
  const perfil = C.lerPerfil(EDICAO.codigo)
  const semDados = lendoMapa && !mapa && !perfil.email
  const avaliar = () => navigate(C.prepararAvaliacao({ caminho: EDICAO.caminho, codigo: EDICAO.codigo, slug: r.slug, unidade: r.unidade, mapa: mapa || { apelido: perfil.nome, email: perfil.email } }))

  const links = (
    <>
      <div className="ct-acoes">
        <Link href={CACA_CAMINHOS.central} navigate={navigate} className="ct-botao ct-botao--contorno">{T.central}</Link>
        <Link href={CACA_CAMINHOS.casas} navigate={navigate} className="ct-botao ct-botao--contorno">{T.casas}</Link>
      </div>
      <CartaoEmailDoAparelho navigate={navigate} />
    </>
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
            <div className="ct-acoes"><button type="button" className="ct-botao" disabled={semDados} aria-busy={semDados || undefined} onClick={avaliar}>{T.pendenteAcao}</button></div>
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
    const podePedir = chave && slugDaRecusa && podePedirPresenca(r, falhas) && !pedido
    const nomeCasa = casa?.nome || 'casa'
    return (
      <section className="ct-bloco ct-carimbar">
        <p className="ct-rotulo">{T.rotulo}</p>
        <h1 ref={titulo} tabIndex={-1} className="ct-h1">{m.titulo}</h1>
        <p className="ct-lead">{m.texto}</p>
        {bloqueio && <p className="ct-nota"><strong>{GPS.jaBloqueada}</strong></p>}
        {ajuda && <AjudaDeLocalizacao ajuda={ajuda} />}
        {falhaDeLocalizacao(r) && <DicasDeSinal />}
        {deNovo && <div className="ct-acoes"><button type="button" className="ct-botao" onClick={() => carimbar()}>{T.tentar}</button></div>}
        {pedido === 'pendente' && <p className="ct-nota" role="status">{GPS.pedido.emAnalise(nomeCasa)}</p>}
        {pedido === 'negado' && <p className="ct-nota" role="status">{GPS.pedido.negadoNota(nomeCasa)}</p>}
        {pedido === 'aprovado' && <p className="ct-nota" role="status">{GPS.pedido.aprovadoNota(nomeCasa)}</p>}
        {podePedir && (
          <div className="ct-carimbar__avaliar">
            <p className="ct-nota">{precisaDeRevisao(r) ? GPS.pedido.leadSemPonto : GPS.pedido.lead}</p>
            <div className="ct-acoes"><button type="button" className="ct-botao ct-botao--contorno" onClick={() => setEstado('pedido')}>{GPS.pedido.abrir}</button></div>
          </div>
        )}
        {novo && <GuardarMapa chave={chave} />}
        {links}
      </section>
    )
  }

  if (estado === 'pedido') {
    return (
      <section className="ct-bloco ct-carimbar">
        <p className="ct-rotulo">{T.rotulo}</p>
        <h1 className="ct-h1">{casa?.nome || T.titulo}</h1>
        <PedidoPresenca
          chave={chave} slug={slugDaRecusa} casa={casa?.nome || 'casa'} recusa={r} posicao={posicao.current}
          aoVoltar={() => setEstado('recusa')} aoEnviar={() => setPedido('pendente')}
        />
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
            {liberou && estado === 'pronto' && <p className="ct-nota" role="status">{GPS.liberada}</p>}
            {permissao === 'prompt' && estado === 'pronto' && <p className="ct-carimbar__antes" role="note"><strong>{GPS.antes.titulo}</strong> {GPS.antes.texto}</p>}
            <div className="ct-acoes">
              <button type="button" className="ct-botao ct-carimbar__principal" onClick={() => carimbar()} disabled={estado === 'carimbando'}>
                {estado === 'carimbando' ? T.conferindo : T.carimbar}
              </button>
            </div>
            <p className="ct-nota">{T.privacidade}</p>
          </>
          )
        : <CriarMapa navigate={navigate} titulo="Primeira vez? Comece seu mapa" botao="Começar e carimbar" aoAbrir={abrir} />}
      {estado === 'carimbando' && progresso && (
        <p className="ct-nota ct-carimbar__buscando">{GPS.buscando(progresso.i, progresso.n)} {GPS.buscandoDica}</p>
      )}
      <p className="ct-sr" aria-live="polite">{estado === 'carimbando' ? (progresso ? GPS.buscando(progresso.i, progresso.n) : 'Conferindo o carimbo.') : ''}</p>
      <p className="ct-nota"><Link className="ct-link-solto" href={CACA_CAMINHOS.regulamento} navigate={navigate}>Regulamento da Caça aos Carimbos</Link></p>
    </section>
  )
}
