/*
 * Entrada da edição (§5.1): abertura com o lettering aprovado, como
 * experimentar, o elenco, onde ficam, avaliação/premiação e dúvidas.
 * O mapa interativo NÃO carrega aqui — só a contagem por bairro.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { fotoProximaEdicao } from '../../../data/imageLibrary'
import { Link, Foto, Logo, AvisoDesatualizado, AvisoDemo, Falha, Carregando } from '../../componentes/base.jsx'
import { ENTRADA as T, DUVIDAS, FASE_TEXTO } from '../textos.js'

export function Entrada ({ navigate, dados, carregando, erro, tentar }) {
  const lettering = fotoProximaEdicao('marca')
  const fundo = fotoProximaEdicao('fundo')
  const lista = dados?.participantes || []
  const elenco = lista.slice(0, 8)
  const porBairro = new Map()
  for (const p of lista) for (const u of p.unidades || []) {
    const b = u.endereco?.bairro
    if (b) porBairro.set(b, (porBairro.get(b) || 0) + 1)
  }
  const bairros = [...porBairro.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
  const encerrada = dados?.fase === 'encerrada'
  const passos = dados?.avaliacao?.aberta || dados?.fase === 'em_andamento' ? T.passos : T.passos.slice(0, 2)
  const textoAvaliacao = dados?.avaliacao?.aberta ? null
    : encerrada ? (dados?.resultados_publicos ? null : FASE_TEXTO.avaliacaoEncerrada) : FASE_TEXTO.avaliacaoFechada

  return (
    <>
      <section className="ct-abre" aria-labelledby="ct-abre-titulo" style={fundo ? { '--ct-fundo': `url(${fundo.src})` } : undefined}>
        <div className="ct-abre__texto">
          <p className="ct-rotulo">{T.rotulo}</p>
          <h1 id="ct-abre-titulo" className="ct-abre__titulo">
            {lettering
              ? <img className="ct-abre__lettering" src={lettering.src} alt={T.titulo} width="1400" height="717" fetchpriority="high" />
              : T.titulo}
          </h1>
          <p className="ct-abre__periodo">{T.periodo}</p>
          <p className="ct-abre__frase">{encerrada ? FASE_TEXTO.encerrada : T.frase}</p>
          <div className="ct-acoes">
            <Link className="ct-botao" href={`${EDICAO.caminho}/participantes`} navigate={navigate}>{T.acaoParticipantes}</Link>
            {!encerrada && <Link className="ct-botao ct-botao--contorno" href={`${EDICAO.caminho}/mapa`} navigate={navigate}>{T.acaoMapa}</Link>}
          </div>
        </div>
      </section>
      <AvisoDesatualizado ativo={dados?.desatualizado} />
      <AvisoDemo ativo={dados?.demo} />

      {!encerrada && (
        <section className="ct-bloco" aria-labelledby="ct-como">
          <h2 id="ct-como" className="ct-h2">{T.comoTitulo}</h2>
          <ol className="ct-passos">
            {passos.map((p, i) => (
              <li key={p.titulo}><span className="ct-passos__n" aria-hidden="true">{i + 1}</span><strong>{p.titulo}</strong><span>{p.texto}</span></li>
            ))}
          </ol>
        </section>
      )}

      <section className="ct-bloco" aria-labelledby="ct-elenco">
        <div className="ct-bloco__cabeca">
          <h2 id="ct-elenco" className="ct-h2">{T.elencoTitulo}</h2>
          {lista.length > elenco.length && <Link className="ct-link" href={`${EDICAO.caminho}/participantes`} navigate={navigate}>{T.verTodas}</Link>}
        </div>
        {erro ? <Falha titulo="Não conseguimos carregar as casas agora" texto="Confira a conexão e tente de novo." tentar={tentar} />
          : carregando ? <Carregando texto="Carregando as casas…" />
          : dados?.participantes_publicos && lista.length ? (
          <ul className="ct-grade ct-grade--participantes">
            {elenco.map((p) => (
              <li key={p.slug} className="ct-cartao">
                <Link className="ct-cartao__link" href={`${EDICAO.caminho}/participantes/${p.slug}`} navigate={navigate}>
                  {p.combo ? <Foto foto={p.combo.fotos?.principal} proporcao="1 / 1" reserva="Foto do combo em produção" />
                    : <div className="ct-foto ct-foto--reserva" style={{ '--ct-proporcao': '1 / 1' }}><span>Combo em breve</span></div>}
                  <div className="ct-cartao__corpo"><div className="ct-cartao__casa"><Logo casa={p.casa} tamanho={40} /><h3 className="ct-cartao__nome">{p.casa.nome}</h3></div></div>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="ct-lead">{FASE_TEXTO.semElenco}</p>}
      </section>

      {bairros.length > 0 && !encerrada && (
        <section className="ct-bloco" aria-labelledby="ct-onde">
          <h2 id="ct-onde" className="ct-h2">{T.ondeTitulo}</h2>
          <ul className="ct-bairros">{bairros.map(([b, n]) => <li key={b}>{b} <span>{n}</span></li>)}</ul>
          <Link className="ct-botao ct-botao--contorno" href={`${EDICAO.caminho}/mapa`} navigate={navigate}>{T.acaoMapa}</Link>
        </section>
      )}

      <section className="ct-bloco" aria-labelledby="ct-av">
        <h2 id="ct-av" className="ct-h2">{T.avaliacaoTitulo}</h2>
        {textoAvaliacao && <p>{textoAvaliacao}</p>}
        <div className="ct-acoes">
          {dados?.avaliacao?.aberta && <Link className="ct-botao" href={`${EDICAO.caminho}/avaliar`} navigate={navigate}>Avaliar</Link>}
          <Link className="ct-botao ct-botao--contorno" href={`${EDICAO.caminho}/premiacao`} navigate={navigate}>Ver a premiação</Link>
        </div>
      </section>

      <section className="ct-bloco" aria-labelledby="ct-duvidas">
        <h2 id="ct-duvidas" className="ct-h2">{T.duvidasTitulo}</h2>
        <div className="ct-duvidas">
          {DUVIDAS.map(([q, r]) => <details key={q}><summary>{q}</summary><p>{r}</p></details>)}
        </div>
      </section>
    </>
  )
}
