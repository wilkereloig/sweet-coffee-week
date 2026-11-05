/*
 * Compartilhar uma casa, um combo ou a própria rota por link público que a edição já tem (spec 15 §13). Nenhum desses links
 * leva chave, e-mail, grupo ou convite: são os endereços que qualquer visitante abre.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { lerRota } from '../../rota/minhaRota.js'
import { Link } from '../../componentes/base.jsx'
import { CACA_CAMINHOS as RUA } from '../textos.js'
import { EXTRAS } from '../textos-extras.js'
import { linkDaCasa, linkDoCombo, linkDaRota } from './arte.js'
import { compartilhar, copiar } from './partilha.js'

const T = EXTRAS.compartilhar

export function LinksPublicos ({ dados, navigate }) {
  const casas = React.useMemo(() => (dados?.participantes || []).filter((p) => p?.slug && p?.casa?.nome).sort((a, b) => a.casa.nome.localeCompare(b.casa.nome, 'pt-BR')), [dados])
  const [slug, setSlug] = React.useState('')
  const [aviso, setAviso] = React.useState('')
  const origem = globalThis.location?.origin || ''
  const atual = casas.find((p) => p.slug === slug)
  const rota = linkDaRota(origem, lerRota(EDICAO.codigo))

  const enviar = async (titulo, url) => {
    const r = await compartilhar({ titulo, url })
    if (r === 'compartilhado' || r === 'cancelado') return setAviso('')
    setAviso((await copiar(url)) === 'copiado' ? T.linkCopiado : url) // sem Web Share nem área de transferência: mostra o link para copiar à mão
  }

  return (
    <section className="ct-caca__bloco ct-caca-links" aria-labelledby="caca-links">
      <h2 id="caca-links" className="ct-sub">{T.tituloLinks}</h2>
      <p className="ct-nota">{T.leadLinks}</p>
      {casas.length > 0 && (
        <>
          <label className="ct-campo"><span>{T.escolherCasa}</span>
            <select value={slug} onChange={(e) => setSlug(e.target.value)}>
              <option value="">—</option>
              {casas.map((p) => <option key={p.slug} value={p.slug}>{p.casa.nome}</option>)}
            </select>
          </label>
          <div className="ct-acoes">
            <button type="button" className="ct-botao ct-botao--contorno" disabled={!atual} onClick={() => enviar(T.tituloCasa(atual.casa.nome), linkDaCasa(origem, atual.slug))}>{T.casaCompartilhar}</button>
            <button type="button" className="ct-botao ct-botao--contorno" disabled={!atual} onClick={() => enviar(T.tituloCombo(atual.casa.nome), linkDoCombo(origem, atual.slug))}>{T.comboCompartilhar}</button>
          </div>
        </>
      )}
      <div className="ct-acoes">
        {rota
          ? <button type="button" className="ct-botao ct-botao--contorno" onClick={() => enviar(T.tituloRota, rota)}>{T.rotaCompartilhar}</button>
          : <p className="ct-nota">{T.rotaVazia} <Link className="ct-link-frase" href={RUA.rota} navigate={navigate}>{T.verRota}</Link></p>}
      </div>
      <p className="ct-nota" role="status">{aviso}</p>
    </section>
  )
}
