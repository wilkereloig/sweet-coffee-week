/*
 * Minha rota (§6.2): paradas na ordem do visitante, com subir/descer por
 * teclado, remover, unidades que saíram da edição sinalizadas (nunca somem
 * caladas), rota externa em trechos e link para compartilhar. Sem "melhor
 * caminho": não há cálculo de percurso no projeto.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import * as M from '../../dados/modelo.js'
import { resolverParadas, linksDeRota, idsDaBusca } from '../../rota/minhaRota.js'
import { Link, AvisoDesatualizado, AvisoDemo } from '../../componentes/base.jsx'
import { useRota } from '../contexto.js'
import { CENA_TEXTO } from '../textos.js'

export function MinhaRota ({ navigate, dados }) {
  const rota = useRota()
  const compartilhada = React.useMemo(() => idsDaBusca(location.search), [])
  const vendoCompartilhada = compartilhada.length > 0 && compartilhada.join() !== rota.ids.join()
  const ids = vendoCompartilhada ? compartilhada : rota.ids
  const paradas = resolverParadas(ids, dados?.participantes || [])
  const links = linksDeRota(paradas)
  const [copiado, setCopiado] = React.useState('')
  const encerrada = dados?.fase === 'encerrada'

  const compartilhar = async () => {
    const url = `${location.origin}${EDICAO.caminho}/minha-rota?u=${rota.ids.join(',')}`
    try {
      if (navigator.share) await navigator.share({ title: 'Minha rota na Sweet & Coffee Week Cartoon', url })
      else { await navigator.clipboard.writeText(url); setCopiado('Link copiado.') }
    } catch { setCopiado(`Copie o link: ${url}`) }
  }

  if (encerrada) {
    return (
      <section className="ct-bloco">
        <h1 className="ct-h1">{CENA_TEXTO['minha-rota'].titulo}</h1>
        <p className="ct-lead">A edição terminou. As casas seguem no catálogo como registro.</p>
        <Link className="ct-botao" href={`${EDICAO.caminho}/participantes`} navigate={navigate}>Ver as casas</Link>
      </section>
    )
  }

  return (
    <section className="ct-bloco ct-rota" aria-labelledby="rota-titulo">
      <AvisoDesatualizado ativo={dados?.desatualizado} />
      <AvisoDemo ativo={dados?.demo} />
      <h1 id="rota-titulo" className="ct-h1">{CENA_TEXTO['minha-rota'].titulo}</h1>
      <p className="ct-lead">{CENA_TEXTO['minha-rota'].apoio}</p>
      {vendoCompartilhada && (
        <div className="ct-aviso">
          <p>Esta é uma rota compartilhada com você.</p>
          <button type="button" className="ct-botao" onClick={() => { rota.substituir(compartilhada); navigate(`${EDICAO.caminho}/minha-rota`) }}>Salvar como minha rota</button>
        </div>
      )}
      {!paradas.length ? (
        <div className="ct-estado">
          <p>Você ainda não escolheu nenhuma parada. Na página de cada casa, toque em "Adicionar à Minha rota".</p>
          <Link className="ct-botao" href={`${EDICAO.caminho}/participantes`} navigate={navigate}>Ver as casas</Link>
        </div>
      ) : (
        <>
          <ol className="ct-paradas">
            {paradas.map((pa, i) => (
              <li key={pa.id} className={`ct-parada${pa.ativa ? '' : ' ct-parada--saiu'}`}>
                <span className="ct-parada__n" aria-hidden="true">{i + 1}</span>
                <div className="ct-parada__info">
                  {pa.ativa ? (
                    <>
                      <p className="ct-parada__nome"><Link href={`${EDICAO.caminho}/participantes/${pa.participante.slug}`} navigate={navigate}>{pa.participante.casa.nome}</Link>
                        {pa.unidade.nome ? ` · ${pa.unidade.nome}` : ''}</p>
                      <p>{M.enderecoEmLinha(pa.unidade.endereco)}</p>
                      {pa.unidade.combo && M.textoEstado(M.estadoAgora(pa.unidade)) && <p className="ct-nota">{M.textoEstado(M.estadoAgora(pa.unidade))}</p>}
                    </>
                  ) : <p className="ct-parada__nome">Esta unidade saiu da edição.</p>}
                </div>
                {!vendoCompartilhada && (
                  <div className="ct-parada__acoes">
                    <button type="button" className="ct-botao ct-botao--contorno" disabled={i === 0} aria-label={`Subir parada ${i + 1}`} onClick={() => rota.mover(pa.id, -1)}>Subir</button>
                    <button type="button" className="ct-botao ct-botao--contorno" disabled={i === paradas.length - 1} aria-label={`Descer parada ${i + 1}`} onClick={() => rota.mover(pa.id, 1)}>Descer</button>
                    <button type="button" className="ct-botao ct-botao--contorno" onClick={() => rota.remover(pa.id, pa.ativa ? pa.participante.casa.nome : 'Parada')}>Remover</button>
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div className="ct-acoes">
            {links.map((href, i) => (
              <a key={href} className="ct-botao" href={href} target="_blank" rel="noopener noreferrer">
                {links.length > 1 ? `Abrir trecho ${i + 1} no Google Maps` : 'Abrir a rota no Google Maps'}
              </a>
            ))}
            {!vendoCompartilhada && <button type="button" className="ct-botao ct-botao--contorno" onClick={compartilhar}>Compartilhar a rota</button>}
          </div>
          <p className="ct-nota">A ordem é a que você escolheu. O Google Maps calcula o trajeto entre as paradas.</p>
          {copiado && <p className="ct-nota" role="status">{copiado}</p>}
        </>
      )}
    </section>
  )
}
