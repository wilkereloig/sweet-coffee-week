/*
 * /cartoon/caca/metas (spec 15 §13): marcos de comemoração pelas casas validadas. Os marcos vêm do servidor (configuráveis);
 * a tela celebra o que acabou de ser alcançado, mostra a próxima meta e lista todos. Não promete prêmio por meta.
 */
import React from 'react'
import { Carregando, Falha, Link } from '../../componentes/base.jsx'
import { CACA_CAMINHOS as RUA } from '../textos.js'
import { EXTRAS } from '../textos-extras.js'
import { IMG_CACA } from '../imagens.js'
import { usarMetas } from '../metas/usarMetas.js'
import { novasConquistas, lerVistas, gravarVistas } from '../metas/logica.js'

const T = EXTRAS.metas

function Celebracao ({ novas }) {
  const maior = novas[novas.length - 1]
  return (
    <section className="ct-caca-festa" role="status" aria-labelledby="meta-festa">
      <img className="ct-caca-meta__medalha" src={IMG_CACA.medalha(maior.medalha)} width={120} height={148} alt="" decoding="async" />
      <div>
        <h2 id="meta-festa" className="ct-sub">{T.celebrarTitulo(maior.titulo)}</h2>
        <p className="ct-nota">{T.celebrarTexto(maior.casas, novas.length - 1)}</p>
      </div>
    </section>
  )
}

function Proxima ({ metas }) {
  const { proxima, validadas, todasAlcancadas } = metas
  if (todasAlcancadas) return <p className="ct-caca__bloco ct-nota"><strong>{T.todas}</strong></p>
  if (!proxima) return null
  return (
    <section className="ct-caca__bloco" aria-labelledby="meta-proxima">
      <p className="ct-rotulo">{T.proximaTitulo}</p>
      <h2 id="meta-proxima" className="ct-sub">{proxima.titulo}</h2>
      <progress className="ct-caca__barra" value={Math.min(validadas, proxima.casas)} max={proxima.casas} aria-label={T.resumo(validadas, proxima.casas)} />
      <p className="ct-nota">{T.proximaTexto(proxima.faltam, proxima.titulo)}</p>
    </section>
  )
}

function ListaDeMarcos ({ marcos }) {
  return (
    <section aria-labelledby="meta-lista">
      <h2 id="meta-lista" className="ct-sub">{T.listaTitulo}</h2>
      <ol className="ct-caca-meta__lista">
        {marcos.map((m) => (
          <li key={m.casas} className={`ct-caca-meta__item${m.alcancada ? ' is-alcancada' : ''}`}>
            <img className="ct-caca-meta__medalha-p" src={IMG_CACA.medalha(m.medalha)} width={56} height={69} alt="" loading="lazy" decoding="async" />
            <span className="ct-caca-meta__texto">
              <strong>{m.titulo}</strong>
              <span>{T.marco(m.casas)}</span>
            </span>
            <span className="ct-caca-meta__estado">{m.alcancada ? T.alcancada : T.faltam(m.faltam)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function Metas ({ caca, navigate }) {
  const { estado, metas, tentar } = usarMetas(caca)
  // O que ainda não foi comemorado, calculado UMA vez ao carregar (depois de gravar "visto", a festa continua na tela).
  const [novas, setNovas] = React.useState([])
  const jaVistas = React.useRef(null) // efeito duplo (StrictMode) ou releitura: a mesma resposta nunca apaga a festa
  React.useEffect(() => {
    if (estado !== 'pronto' || !metas || jaVistas.current === metas) return
    jaVistas.current = metas
    const achadas = novasConquistas(metas.marcos, lerVistas())
    setNovas(achadas)
    if (achadas.length) gravarVistas(achadas[achadas.length - 1].casas)
  }, [estado, metas])

  if (estado === 'carregando') return <Carregando texto={T.carregando} />
  if (estado === 'falha' || !metas) return <Falha titulo={T.falhaTitulo} texto={T.falhaTexto} tentar={tentar} />

  return (
    <div className="ct-caca-metas">
      <p className="ct-caca__grande"><strong>{T.resumo(metas.validadas, metas.total)}</strong> <span>{T.resumoRotulo}</span></p>
      {novas.length > 0 && <Celebracao novas={novas} />}
      {metas.marcos.length === 0
        ? <p className="ct-nota">{metas.emDefinicao ? T.emDefinicao : T.semMetas}</p>
        : (<><Proxima metas={metas} /><ListaDeMarcos marcos={metas.marcos} /></>)}
      <p className="ct-nota">{T.nota}</p>
      <div className="ct-acoes"><Link href={RUA.mapa} navigate={navigate} className="ct-botao ct-botao--contorno">{T.verMapa}</Link></div>
    </div>
  )
}
