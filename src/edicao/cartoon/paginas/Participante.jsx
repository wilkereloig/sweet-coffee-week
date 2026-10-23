/*
 * Página do participante (§5.3 do plano) — a ficha única da edição.
 * /cartoon/combos/:slug usa a mesma página com foco="combo" (abre no bloco B).
 *
 * A Conheça a casa · B O combo · C Doce, salgado e bebida · D Antes de pedir ·
 * E Como experimentar · F As unidades · G Avalie (só com a avaliação aberta).
 * Preço, composição, alergênicos e modos ficam à vista, sem abas.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { carregarParticipante } from '../../dados/publico.js'
import * as M from '../../dados/modelo.js'
import { Link, Foto, Logo, Carregando, Falha, AvisoDesatualizado, AvisoDemo } from '../../componentes/base.jsx'
import { PARTICIPANTE as T, FASE_TEXTO, TIPO_ORDEM } from '../textos.js'
import { useRota } from '../contexto.js'

function Alimentar ({ item }) {
  const r = M.resumoItem(item)
  const c = r.caracteristicas
  const extras = [
    c.lactose !== 'nao_informado' && T.lactose[c.lactose],
    c.vegano === 'sim' && T.vegano.sim,
    c.vegetariano === 'sim' && c.vegano !== 'sim' && T.vegetariano.sim,
    c.acucar_adicionado !== 'nao_informado' && T.acucar[c.acucar_adicionado],
  ].filter(Boolean)
  return (
    <dl className="ct-alimentar">
      {r.contem.length > 0 && <div className="ct-alimentar__linha ct-alimentar__linha--contem"><dt>{T.contem}</dt><dd>{M.juntar(r.contem)}</dd></div>}
      {r.podeConter.length > 0 && <div className="ct-alimentar__linha ct-alimentar__linha--pode"><dt>{T.podeConter}</dt><dd>{M.juntar(r.podeConter)}</dd></div>}
      {r.naoInformado.length > 0 && <div className="ct-alimentar__linha ct-alimentar__linha--ni"><dt>{T.naoInformado}</dt><dd>{M.juntar(r.naoInformado)}</dd></div>}
      {r.naoContem.length > 0 && <div className="ct-alimentar__linha"><dt>{T.naoContem}</dt><dd>{M.juntar(r.naoContem)}</dd></div>}
      {extras.length > 0 && <div className="ct-alimentar__linha"><dt className="ct-sr">Características</dt><dd>{extras.join(' · ')}</dd></div>}
    </dl>
  )
}

function Trocas ({ lista, unidades }) {
  if (!lista?.length) return null
  const nomeUnidade = (id) => unidades.find((u) => u.id === id)?.nome || unidades.find((u) => u.id === id)?.endereco?.bairro || id
  return (
    <details className="ct-trocas">
      <summary>{T.trocas} ({lista.length})</summary>
      <ul>
        {lista.map((s, i) => (
          <li key={i}>
            <p>Troca <strong>{s.original}</strong> por <strong>{s.alternativa}</strong></p>
            <p className="ct-trocas__meta">
              {[T.troca[s.disponibilidade],
                s.acrescimo === 0 ? T.troca.semCusto : s.acrescimo ? T.troca.acrescimo(M.formatarPreco(s.acrescimo)) : T.troca.consulte,
                s.como_solicitar,
                s.unidades?.length ? `só em ${M.juntar(s.unidades.map(nomeUnidade))}` : null,
              ].filter(Boolean).join(' · ')}
            </p>
            {s.alimentar?.some((d) => d.estado === 'contem') && (
              <p className="ct-trocas__meta">{T.contem}: {M.juntar(s.alimentar.filter((d) => d.estado === 'contem').map((d) => M.rotuloAspecto(d.aspecto)))}</p>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}

function Unidade ({ u, casa, navigate, comCombo, rota, periodo }) {
  const est = M.estadoAgora(u, undefined, periodo)
  const horario = comCombo ? M.horarioNoFestival(u.combo?.disponibilidade, periodo) : []
  const naRota = !!rota && rota.tem(u.id)
  const titulo = u.nome || u.endereco?.bairro || casa.nome
  return (
    <article className="ct-unidade" aria-labelledby={`un-${u.id}`}>
      <h3 id={`un-${u.id}`} className="ct-unidade__nome">{titulo}</h3>
      <p className="ct-unidade__endereco">{M.enderecoEmLinha(u.endereco)}{u.endereco?.referencia ? ` (${u.endereco.referencia})` : ''}</p>
      {comCombo && (
        <div className="ct-unidade__horario">
          <p className="ct-rotulo">{T.horarioFestival}</p>
          {horario.length
            ? <ul>{horario.map((h) => <li key={h}>{h}</li>)}</ul>
            : <p>{M.textoEstado({ estado: 'sem_horario' })}</p>}
          {horario.length > 0 && M.textoEstado(est) && <p className={`ct-agora ct-agora--${est.estado}`}>{M.textoEstado(est)}</p>}
        </div>
      )}
      {comCombo && u.combo?.observacao && <p className="ct-unidade__obs">{u.combo.observacao}</p>}
      {!u.coordenada && <p className="ct-unidade__obs">{T.localizacaoConferencia}</p>}
      <div className="ct-acoes">
        {M.linkComoChegar(u) && <a className="ct-botao ct-botao--contorno" href={M.linkComoChegar(u)} target="_blank" rel="noopener noreferrer">{T.comoChegar}</a>}
        {u.whatsapp && <a className="ct-botao ct-botao--contorno" href={M.linkWhatsApp(u.whatsapp)} target="_blank" rel="noopener noreferrer">{T.whatsapp}</a>}
        {u.coordenada && navigate && <Link className="ct-botao ct-botao--contorno" href={`${EDICAO.caminho}/mapa?unidade=${u.id}`} navigate={navigate}>Ver no mapa</Link>}
        {rota && (
          <button type="button" className={`ct-botao${naRota ? ' ct-botao--feito' : ''}`} aria-pressed={naRota}
            onClick={() => (naRota ? rota.remover(u.id, titulo) : rota.adicionar(u.id, titulo))}>
            {naRota ? T.rotaNaRota : T.rotaAdicionar}
          </button>
        )}
      </div>
    </article>
  )
}

export function Participante ({ slug, foco, navigate, edicao }) {
  const [res, setRes] = React.useState({ estado: 'carregando' })
  const [tentativa, setTentativa] = React.useState(0)
  const rota = useRota()
  React.useEffect(() => {
    let vivo = true
    const ctl = new AbortController()
    setRes({ estado: 'carregando' })
    carregarParticipante(EDICAO.codigo, slug, { sinal: ctl.signal })
      .then((r) => { if (vivo) setRes(r) })
      .catch(() => { if (vivo) setRes({ estado: 'falha' }) })
    return () => { vivo = false; ctl.abort() }
  }, [slug, tentativa])

  const p = res.participante
  React.useEffect(() => {
    if (res.estado !== 'publicado') return
    document.title = `${foco === 'combo' ? 'Combo da ' : ''}${p.casa.nome} · Sweet & Coffee Week Cartoon`
    if (foco === 'combo') requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('combo')?.scrollIntoView({ block: 'start' })))
  }, [res.estado, p, foco])

  if (res.estado === 'carregando') return <Carregando texto="Carregando a casa…" />
  if (res.estado === 'falha') return <Falha principal titulo="Não conseguimos carregar esta casa agora" texto="Confira a conexão e tente de novo." tentar={() => setTentativa((n) => n + 1)} />
  if (res.estado !== 'publicado') {
    const texto = res.estado === 'retirado' ? T.retirado : res.estado === 'nao_divulgado' ? T.naoDivulgado : T.inexistente
    return (
      <Falha principal titulo={texto}>
        <p><Link className="ct-botao" href={`${EDICAO.caminho}/participantes`} navigate={navigate}>Ver as casas</Link></p>
      </Falha>
    )
  }

  return (
    <FichaParticipante p={p} fase={res.fase || edicao?.fase} avaliacaoAberta={!!edicao?.avaliacao?.aberta} periodo={edicao?.edicao}
      navigate={navigate} rota={rota} desatualizado={res.desatualizado} demo={res.demo} />
  )
}

/**
 * A ficha em si — só apresentação, a partir do JSON público. É a MESMA que a
 * prévia do painel mostra (painel-app importa daqui): o que a marca vê antes de
 * enviar é o que o site mostraria. Sem `navigate`, os links internos somem
 * (prévia); sem `rota`, o botão da Minha rota some.
 */
export function FichaParticipante ({ p, fase, avaliacaoAberta: aberta = false, navigate = null, rota = null, desatualizado = false, demo = false, periodo = null }) {
  const encerrada = fase === 'encerrada'
  const combo = p.combo
  const itens = [...(combo?.itens || [])].sort((a, b) => a.posicao - b.posicao || TIPO_ORDEM.indexOf(a.tipo) - TIPO_ORDEM.indexOf(b.tipo))
  const modos = M.modosDoParticipante(p)
  const alerta = M.fraseAlerta(itens)
  const resumo = M.resumoCombo(itens)
  const fotos = combo?.fotos || {}
  const galeria = [fotos.principal, ...(fotos.galeria || [])].filter(Boolean)
  const avaliacaoAberta = aberta && !!combo && !!navigate
  const nomesUnidades = (lista) => M.juntar(lista.map((u) => u.nome || u.endereco?.bairro || p.casa.nome))

  return (
    <article className="ct-part">
      <AvisoDesatualizado ativo={desatualizado} />
      <AvisoDemo ativo={demo} />
      {navigate && <p className="ct-voltar"><Link href={`${EDICAO.caminho}/participantes`} navigate={navigate}>{T.voltar}</Link></p>}

      {/* A · Conheça a casa */}
      <header className="ct-bloco ct-casa">
        <Logo casa={p.casa} tamanho={88} />
        <div>
          <p className="ct-rotulo">{T.selo}</p>
          <h1 className="ct-casa__nome">{p.casa.nome}</h1>
          {p.casa.apresentacao && <p className="ct-casa__texto">{p.casa.apresentacao}</p>}
          {p.casa.instagram && <p className="ct-casa__canal"><a href={`https://www.instagram.com/${p.casa.instagram.replace(/^@/, '')}/`} target="_blank" rel="noopener noreferrer">{p.casa.instagram}</a></p>}
        </div>
      </header>
      {encerrada && <p className="ct-aviso">{FASE_TEXTO.encerrada}</p>}

      {/* B · O combo */}
      {combo ? (
        <section id="combo" className="ct-bloco ct-combo" aria-labelledby="combo-titulo">
          <Foto foto={fotos.principal} proporcao="4 / 3" className="ct-combo__foto" prioridade reserva="Foto do combo em produção" />
          <div className="ct-combo__info">
            <p className="ct-rotulo">{T.comboTitulo}</p>
            <h2 id="combo-titulo" className="ct-combo__nome">{combo.nome || T.comboSemNome(p.casa.nome)}</h2>
            {combo.descricao && <p>{combo.descricao}</p>}
            {!encerrada && <p className="ct-combo__preco">{combo.preco ? M.formatarPreco(combo.preco) : T.precoAConfirmar}</p>}
            {combo.condicoes && <p className="ct-combo__condicoes">{combo.condicoes}</p>}
            <p className="ct-combo__composicao">{itens.map((i) => i.nome).filter(Boolean).join(' · ')}</p>
            {!encerrada && (
              <p className="ct-combo__modos">{M.MODOS.filter(([k]) => modos[k].length).map(([, r]) => r).join(' · ') || T.nenhumModo}</p>
            )}
            {alerta && <p className="ct-combo__alerta"><a href="#antes-de-pedir">{alerta}</a></p>}
            {galeria.length > 1 && <Galeria fotos={galeria} rotulo={T.galeria(galeria.length)} />}
          </div>
        </section>
      ) : (
        <p className="ct-bloco ct-aviso">{FASE_TEXTO.semCombo}</p>
      )}

      {/* C · Componentes */}
      {combo && itens.length > 0 && (
        <section className="ct-bloco" aria-labelledby="comp-titulo">
          <h2 id="comp-titulo" className="ct-h2">{T.componentesTitulo}</h2>
          <div className="ct-componentes">
            {itens.map((i) => (
              <article key={i.posicao} className="ct-componente" aria-labelledby={`it-${i.posicao}`}>
                {i.foto && <Foto foto={i.foto} proporcao="1 / 1" />}
                <p className="ct-rotulo">{T.tipos[i.tipo]}</p>
                <h3 id={`it-${i.posicao}`} className="ct-componente__nome">{i.nome}</h3>
                {i.descricao && <p>{i.descricao}</p>}
                {i.ingredientes && <p className="ct-componente__ingr"><span className="ct-rotulo">{T.ingredientes}</span> {i.ingredientes}</p>}
                <Alimentar item={i} />
                <Trocas lista={i.substituicoes} unidades={p.unidades} />
              </article>
            ))}
          </div>
        </section>
      )}

      {/* D · Antes de pedir */}
      {combo && (
        <section id="antes-de-pedir" className="ct-bloco ct-antes" aria-labelledby="antes-titulo">
          <h2 id="antes-titulo" className="ct-h2">{T.antesTitulo}</h2>
          {resumo.length ? (
            <ul className="ct-antes__lista">
              {resumo.map((l) => (
                <li key={l.aspecto}>
                  <strong>{l.rotulo}</strong>:{' '}
                  {[l.contem.length && `contém (${M.juntar(l.contem)})`, l.podeConter.length && `pode conter (${M.juntar(l.podeConter)})`,
                    l.naoInformado.length && `não informado (${M.juntar(l.naoInformado)})`].filter(Boolean).join('; ')}
                </li>
              ))}
            </ul>
          ) : <p>{T.antesNada}</p>}
          <p className="ct-antes__confirme">{T.confirme}</p>
        </section>
      )}

      {/* E · Como experimentar */}
      {combo && !encerrada && (
        <section className="ct-bloco" aria-labelledby="como-titulo">
          <h2 id="como-titulo" className="ct-h2">{T.comoTitulo}</h2>
          {M.MODOS.some(([k]) => modos[k].length) ? (
            <ul className="ct-modos">
              {M.MODOS.filter(([k]) => modos[k].length).map(([k, r]) => (
                <li key={k}>
                  <strong>{r}</strong>{p.unidades.length > 1 ? ` · ${T.modoEm} ${nomesUnidades(modos[k])}` : ''}
                  {k === 'delivery' && modos.delivery.map((u) => (
                    <div key={u.id} className="ct-modos__delivery">
                      {(u.combo?.canais || []).some((c) => /^https?:\/\//i.test(String(c.link || '').trim())) && (
                        <p>{T.pedirPor}:{' '}
                          {u.combo.canais.filter((c) => /^https?:\/\//i.test(String(c.link || '').trim())).map((c, i) => <a key={i} className="ct-link" href={String(c.link).trim()} target="_blank" rel="noopener noreferrer">{T.canais[c.tipo] || c.tipo}</a>)
                            .reduce((acc, el, i) => (i ? [...acc, ' · ', el] : [el]), [])}
                        </p>
                      )}
                      {u.combo?.delivery_regioes && <p>{T.regioes}: {u.combo.delivery_regioes}</p>}
                      <p>{T.taxa}: {u.combo?.delivery_taxa || 'conforme a plataforma ou a loja'}</p>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          ) : <p>{T.nenhumModo}</p>}
        </section>
      )}

      {/* F · Unidades */}
      <section className="ct-bloco" aria-labelledby="un-titulo">
        <h2 id="un-titulo" className="ct-h2">{T.unidadesTitulo(p.unidades.length)}</h2>
        <div className="ct-unidades">
          {p.unidades.map((u) => <Unidade key={u.id} u={u} casa={p.casa} navigate={navigate} comCombo={!!combo && !encerrada} rota={rota} periodo={periodo} />)}
        </div>
      </section>

      {/* G · Avalie */}
      {avaliacaoAberta && (
        <section className="ct-bloco ct-avalie" aria-labelledby="av-titulo">
          <h2 id="av-titulo" className="ct-h2">{T.avaliarTitulo}</h2>
          <p>{T.avaliarTexto}</p>
          <Link className="ct-botao" href={`${EDICAO.caminho}/avaliar?participante=${p.slug}`} navigate={navigate}>{T.avaliar}</Link>
        </section>
      )}
    </article>
  )
}

function Galeria ({ fotos, rotulo }) {
  const ref = React.useRef(null)
  const [i, setI] = React.useState(0)
  const abrir = () => { setI(0); ref.current?.showModal() }
  return (
    <>
      <button type="button" className="ct-link" onClick={abrir}>{rotulo}</button>
      <dialog ref={ref} className="ct-galeria" aria-label="Fotos do combo" onClick={(e) => { if (e.target === ref.current) ref.current.close() }}>
        <Foto foto={fotos[i]} proporcao="4 / 3" />
        <div className="ct-acoes">
          <button type="button" className="ct-botao ct-botao--contorno" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</button>
          <span aria-live="polite">{i + 1} de {fotos.length}</span>
          <button type="button" className="ct-botao ct-botao--contorno" disabled={i === fotos.length - 1} onClick={() => setI(i + 1)}>Próxima</button>
          <button type="button" className="ct-botao" onClick={() => ref.current.close()}>Fechar</button>
        </div>
      </dialog>
    </>
  )
}
