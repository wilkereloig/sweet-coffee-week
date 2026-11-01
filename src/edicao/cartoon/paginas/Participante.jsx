/*
 * Página do participante (§5.3 do plano; docs/cartoon-2026-2/10 §10.7 e §10.14) — a ficha única da edição.
 * /cartoon/combos/:slug usa a mesma página com foco="combo" (abre no bloco do combo).
 *
 * Topo (canal Elenco + cenário da casa) · O combo (canal Cardápio: o rosa é moldura, o texto pequeno
 * mora no painel creme e nos cartões) · Restrições alimentares · Como pedir · Unidades · Galeria ·
 * Avalie (só com a avaliação aberta). Tudo à vista, sem abas. O que o painel ainda não tem aparece
 * como "não informado" — nunca escondido, nunca deduzido.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { carregarParticipante } from '../../dados/publico.js'
import * as M from '../../dados/modelo.js'
import * as H from '../../dados/horarioFestival.js'
import { Link, Foto, proporcaoDe, Carregando, Falha, AvisoDesatualizado, AvisoDemo, AvisoRetrato } from '../../componentes/base.jsx'
import { TopoCanal } from '../../componentes/sistema/TopoCanal.jsx'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { CenarioTema, CenarioFixo } from '../../componentes/sistema/CenarioTema.jsx'
import ScwIcon from '../../../components/scw-icons/ScwIcon.jsx'
import { precoComboEdicao } from '../../../data/imageLibrary'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { LogoDesenhada } from '../../componentes/sistema/LogoDesenhada.jsx'
import { Etiqueta, Placa, Botao, Quadro } from '../../componentes/sistema/pecas.jsx'
import { PARTICIPANTE as T, FASE_TEXTO, TIPO_ORDEM, ATENDIMENTO, RESTRICAO } from '../textos.js'
import { useRota } from '../contexto.js'
import { QueroIr, QueroIrCasa, JaFui } from '../MarcasLover.jsx'

/** Link http(s) de verdade (o dado já gravado antes da validação do painel não é confiável). */
const linkSeguro = (c) => /^https?:\/\//i.test(String(c.link || '').trim())

function Alimentar ({ item }) {
  if (!item.alimentar?.length) return <p className="ct-alimentar__nada">{T.restricoesNada}</p>
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
      {r.naoContem.length > 0 && <div className="ct-alimentar__linha"><dt>{T.naoContem}</dt><dd>{M.juntar(r.naoContem)}</dd></div>}
      {r.naoInformado.length > 0 && <div className="ct-alimentar__linha ct-alimentar__linha--ni"><dt>{T.naoInformado}</dt><dd>{M.juntar(r.naoInformado)}</dd></div>}
      {extras.length > 0 && <div className="ct-alimentar__linha ct-alimentar__linha--extra"><dt className="ct-sr">Características</dt><dd>{extras.join(' · ')}</dd></div>}
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

/** O horário no festival, dia a dia (5 a 15/11), com o dia de hoje marcado. Sem as datas da edição, em frases. */
function Dias ({ linhas, periodo }) {
  if (!linhas?.length) return <p className="ct-unidade__ni">{T.horarioNi}</p>
  const datas = periodo ? H.datasDoFestival(String(periodo.inicio || '').slice(0, 10), String(periodo.fim || '').slice(0, 10)) : []
  const dias = H.diasDeLinhas(linhas, datas)
  if (!dias.some((d) => d.periodos?.length)) return <ul className="ct-unidade__frases">{M.horarioNoFestival(linhas, periodo).map((h) => <li key={h}>{h}</li>)}</ul>
  const hoje = M.hojeEmNatal()
  return (
    <ul className="ct-dias">
      {dias.map((d) => (
        <li key={d.data} className={`ct-dia${d.data === hoje ? ' is-hoje' : ''}${d.periodos?.length ? '' : ' is-fechado'}`}>
          <span className="ct-dia__nome">{H.rotuloDia(d.data)}{d.data === hoje && <span className="ct-dia__hoje">{T.hoje}</span>}</span>
          <span className="ct-dia__horas">{d.periodos?.length ? H.periodosTexto(d.periodos) : T.naoAbre}</span>
        </li>
      ))}
    </ul>
  )
}

function Unidade ({ u, casa, navigate, comCombo, rota, periodo }) {
  const est = M.estadoAgora(u, undefined, periodo)
  const agora = M.textoEstado(est)
  const titulo = u.nome || u.endereco?.bairro || casa.nome
  const comoChegar = M.linkComoChegar(u)
  return (
    <article className="ct-unidade" aria-labelledby={`un-${u.id}`}>
      <div className="ct-unidade__onde">
        <h3 id={`un-${u.id}`} className="ct-unidade__nome">{titulo}</h3>
        {u.nome && u.endereco?.bairro && <p className="ct-rotulo">{u.endereco.bairro}</p>}
        <p className="ct-unidade__linha"><IconeCartoon nome="endereco" tamanho={32} />
          <span>{M.enderecoEmLinha(u.endereco) || T.unidadesNi}{u.endereco?.referencia ? ` (${u.endereco.referencia})` : ''}</span></p>
        {comCombo && u.combo?.observacao && <p className="ct-unidade__obs">{u.combo.observacao}</p>}
        {(!u.coordenada || u.coordenada.conferir) && <p className="ct-unidade__obs">{T.localizacaoConferencia}</p>}
        <div className="ct-acoes">
          {rota && <QueroIr u={u} nome={M.tituloDaUnidade({ casa }, u)} />}
          {comoChegar && <Botao tipo="secundario" href={comoChegar} target="_blank" rel="noopener noreferrer"><IconeCartoon nome="como-chegar" tamanho={32} />{T.comoChegar}</Botao>}
          {u.whatsapp && <Botao tipo="secundario" href={M.linkWhatsApp(u.whatsapp)} target="_blank" rel="noopener noreferrer"><IconeCartoon nome="conversar" tamanho={32} />{T.whatsapp}</Botao>}
          {u.coordenada && navigate && <Botao tipo="secundario" href={`${EDICAO.caminho}/mapa?unidade=${u.id}`} navigate={navigate}><IconeCartoon nome="mapa" tamanho={32} />{T.verNoMapa}</Botao>}
        </div>
      </div>
      {comCombo && (
        <div className="ct-unidade__horario">
          <p className="ct-unidade__linha ct-rotulo"><IconeCartoon nome="horario" tamanho={32} /><span>{T.horarioFestival}</span></p>
          <Dias linhas={u.combo?.disponibilidade} periodo={periodo} />
          {u.combo?.disponibilidade?.length > 0 && agora && (
            <p className={`ct-agora ct-agora--${est.estado}`}>
              {est.estado === 'aberto' && <IconeCartoon nome="aberto-agora" tamanho={32} />}{agora}
            </p>
          )}
        </div>
      )}
    </article>
  )
}

/** Um modo de atendimento (no local · para viagem · delivery) com o estado e, no delivery, os canais. */
function Modo ({ p, k, nomesUnidades }) {
  const { estado, unidades } = M.estadoModo(p, k)
  const variasUnidades = (p.unidades || []).length > 1
  const texto = estado === 'sim'
    ? (variasUnidades ? T.modo.simEm(nomesUnidades(unidades)) : T.modo.sim)
    : estado === 'nao_informado' && variasUnidades && unidades.length ? `${T.modo.nao_informado}: ${nomesUnidades(unidades)}` : T.modo[estado]
  return (
    <li className={`ct-modo ct-modo--${k}`} data-estado={estado}>
      <IconeCartoon nome={ATENDIMENTO[k].icone} tamanho={48} />
      <div className="ct-modo__texto">
        <h3 className="ct-modo__nome">{ATENDIMENTO[k].rotulo}</h3>
        <p className="ct-modo__estado">{texto}</p>
        {k === 'delivery' && estado === 'sim' && unidades.map((u) => {
          const canais = (u.combo?.canais || []).filter((c) => /^https?:\/\//i.test(String(c.link || '').trim()))
          return (
            <div key={u.id} className="ct-modo__delivery">
              {variasUnidades && <p className="ct-rotulo">{u.nome || u.endereco?.bairro}</p>}
              {canais.length > 0 && (
                <p>{T.pedirPor}:{' '}
                  {canais.map((c, i) => <a key={i} className="ct-link" href={String(c.link).trim()} target="_blank" rel="noopener noreferrer">{T.canais[c.tipo] || c.tipo}</a>)
                    .reduce((acc, el, i) => (i ? [...acc, ' · ', el] : [el]), [])}
                </p>
              )}
              {u.combo?.delivery_regioes && <p>{T.regioes}: {u.combo.delivery_regioes}</p>}
              <p>{T.taxa}: {u.combo?.delivery_taxa || T.taxaNi}</p>
            </div>
          )
        })}
      </div>
    </li>
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
    // /combos/:slug abre no combo; "Quero ir" de casa com várias unidades, vindo do catálogo, abre nas unidades.
    const alvo = foco === 'combo' ? 'combo' : new URLSearchParams(location.search).get('ver') === 'unidades' ? 'unidades' : ''
    if (alvo) requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(alvo)?.scrollIntoView({ block: 'start' })))
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
      navigate={navigate} rota={rota} desatualizado={res.desatualizado} demo={res.demo} retrato={res.retrato} />
  )
}

/**
 * A ficha em si — só apresentação, a partir do JSON público. É a MESMA que a
 * prévia do painel mostra (painel-app importa daqui): o que a marca vê antes de
 * enviar é o que o site mostraria. Sem `navigate`, os links internos somem
 * (prévia); sem `rota` (ou com a edição encerrada), "Quero ir" e "Já fui" somem.
 */
export function FichaParticipante ({ p, fase, avaliacaoAberta: aberta = false, navigate = null, rota: rotaRecebida = null, desatualizado = false, demo = false, retrato = null, periodo = null }) {
  const encerrada = fase === 'encerrada'
  const rota = encerrada ? null : rotaRecebida
  const combo = p.combo
  const unidades = p.unidades || []
  const itens = [...(combo?.itens || [])].sort((a, b) => a.posicao - b.posicao || TIPO_ORDEM.indexOf(a.tipo) - TIPO_ORDEM.indexOf(b.tipo))
  const alerta = M.fraseAlerta(itens)
  const fotos = combo?.fotos || {}
  const galeria = [fotos.principal, ...(fotos.galeria || []), ...unidades.flatMap((u) => u.fotos || [])].filter(Boolean)
  const avaliacaoAberta = aberta && !!combo && !!navigate
  const nomesUnidades = (lista) => M.juntar(lista.map((u) => u.nome || u.endereco?.bairro || p.casa.nome))
  const nomeCombo = combo?.nome ? M.caixaLegivel(combo.nome) : T.comboSemNome(p.casa.nome)
  const nomesItens = itens.map((i) => i.nome).filter(Boolean)
  const selos = M.MODOS.map(([k]) => k).filter((k) => M.estadoModo(p, k).estado === 'sim')
  const instagram = p.casa.instagram && p.casa.instagram.replace(/^@/, '').trim()
  const precoDesenhado = precoComboEdicao(combo?.preco)
  // Atalho de cada modo no topo: no local e para viagem levam ao endereço e ao horário; delivery ao link de pedido.
  const linkDelivery = unidades.flatMap((u) => u.combo?.canais || []).find(linkSeguro)?.link
  const destinoModo = (k) => k !== 'delivery'
    ? { href: '#unidades', dica: T.comoPedirDica[k] }
    : linkDelivery
      ? { href: String(linkDelivery).trim(), target: '_blank', rel: 'noopener noreferrer', dica: T.comoPedirDica.delivery }
      : { href: '#atendimento', dica: T.comoPedirDica.deliveryInfo }

  return (
    <article className="ct-part">
      <AvisoDesatualizado ativo={desatualizado} />
      <AvisoDemo ativo={demo} />
      <AvisoRetrato retrato={retrato} />
      {navigate && <p className="ct-voltar"><Link href={`${EDICAO.caminho}/participantes`} navigate={navigate}>← {T.voltar}</Link></p>}

      {/* 1 · Topo: canal Elenco + cenário da casa (ou o chão de Natal) */}
      <TopoCanal canal="elenco" className="ct-casa ct-ficha__topo" aria-labelledby="casa-nome">
        <CenarioTema slug={p.slug} semKit="natal" faixa={false} />
        <div className="ct-ficha__cabeca">
          <LogoDesenhada casa={p.casa} className="ct-ficha__logo" />
          <div className="ct-ficha__titulo">
            <p className="ct-rotulo">{T.selo}</p>
            <Letreiro nivel={1} id="casa-nome" tamanho="display" cor="chocolate" texto={p.casa.nome} />
            {p.casa.tema && <p className="ct-ficha__tema">{T.tema(p.casa.tema)}</p>}
            {p.casa.apresentacao && <p className="ct-lead ct-ficha__apresentacao">{p.casa.apresentacao}</p>}
            {!encerrada && selos.length > 0 && (
              <nav className="ct-ficha__grupo" aria-labelledby="como-pedir-rotulo">
                <p id="como-pedir-rotulo" className="ct-rotulo">{T.atendimentoTitulo}</p>
                <ul className="ct-ficha__modos">
                  {selos.map((k) => {
                    const { dica, ...link } = destinoModo(k)
                    return (
                      <li key={k}>
                        <a className="ct-atalho" {...link}>
                          <IconeCartoon nome={ATENDIMENTO[k].icone} tamanho={32} />
                          <span className="ct-atalho__texto"><span className="ct-atalho__nome">{ATENDIMENTO[k].rotulo}</span><span className="ct-atalho__dica">{dica}</span></span>
                          <span className="ct-atalho__seta" aria-hidden="true">{link.target ? '↗' : '↓'}</span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            )}
            {rota && unidades.length > 0 && (
              <div className="ct-ficha__grupo ct-ficha__grupo--rota" role="group" aria-labelledby="minha-rota-rotulo">
                <p id="minha-rota-rotulo" className="ct-rotulo">{T.minhaRota}</p>
                <div className="ct-ficha__marcas"><QueroIrCasa p={p} navigate={navigate} naFicha /><JaFui p={p} /></div>
                <p className="ct-ficha__nota">{T.minhaRotaNota}</p>
              </div>
            )}
          </div>
        </div>
      </TopoCanal>
      {encerrada && <p className="ct-aviso">{FASE_TEXTO.encerrada}</p>}

      {/* 2 · O combo: canal Cardápio (rosa = moldura) */}
      {combo ? (
        <TopoCanal canal="cardapio" className="ct-cardapio" id="combo" aria-labelledby="combo-titulo">
          <Etiqueta>{T.comboTitulo}</Etiqueta>
          <Letreiro nivel={2} id="combo-titulo" texto={nomeCombo} cor="amarelo" />
          <div className="ct-cardapio__grade">
            <Quadro className="ct-cardapio__foto">
              <Foto foto={fotos.principal} proporcao={proporcaoDe(fotos.principal, '4 / 3')} prioridade reserva={T.fotoReserva} />
            </Quadro>
            <div className="ct-painel ct-cardapio__painel">
              {!encerrada && (combo.preco
                ? <div className="ct-cardapio__preco">{precoDesenhado
                  ? <img className="ct-cardapio__preco-arte" src={precoDesenhado.src} width={precoDesenhado.largura} height={precoDesenhado.altura} alt={`Combo ${M.formatarPreco(combo.preco)}`} />
                  : <Placa numero={M.formatarPreco(combo.preco)} rotulo={T.precoRotulo} />}</div>
                : <p className="ct-cardapio__preco ct-sub">{T.precoAConfirmar}</p>)}
              <div>
                <p className="ct-rotulo">{T.noCombo}</p>
                {/* Espaço fixo antes do ponto: a linha nunca começa com "·". */}
                <p className="ct-cardapio__composicao">{(nomesItens.length ? nomesItens : itens.map((i) => T.tipos[i.tipo])).join('\u00a0· ')}</p>
              </div>
              {combo.descricao && <p>{combo.descricao}</p>}
              <div>
                <p className="ct-rotulo">{T.condicoes}</p>
                <p className={combo.condicoes ? '' : 'ct-ni'}>{combo.condicoes || T.condicoesNi}</p>
              </div>
              {alerta && <a className="ct-alerta" href="#restricoes">{alerta}</a>}
            </div>
          </div>
          {itens.length > 0 && (
            <ul className="ct-cardapio__itens">
              {itens.map((i) => (
                <li key={i.posicao} className="ct-item">
                  {i.foto && <Foto foto={i.foto} proporcao={proporcaoDe(i.foto, '1 / 1')} />}
                  <Etiqueta>{T.tipos[i.tipo]}</Etiqueta>
                  {i.nome ? <h3 className="ct-item__nome">{i.nome}</h3> : <p className="ct-item__nome ct-ni">{T.nomeNi}</p>}
                  {i.descricao && <p>{i.descricao}</p>}
                  {i.ingredientes && <p className="ct-item__ingr"><span className="ct-rotulo">{T.ingredientes}</span> {i.ingredientes}</p>}
                  <div className="ct-item__restricoes">
                    <p className="ct-rotulo">{T.restricoesTitulo}</p>
                    <Alimentar item={i} />
                  </div>
                  <Trocas lista={i.substituicoes} unidades={unidades} />
                </li>
              ))}
            </ul>
          )}
          {/* Resumo do combo inteiro para quem tem restrição; o detalhe de cada item está no cartão dele. */}
          <div id="restricoes" className="ct-painel ct-cardapio__restricoes">
            <h3 className="ct-cardapio__subtitulo">{T.restricoesTitulo}</h3>
            <p>{T.restricoesLead}</p>
            <ul className="ct-vereditos">
              {M.RESTRICOES.map(({ chave }) => {
                const v = M.veredito(itens, chave)
                return (
                  <li key={chave} className={`ct-veredito ct-veredito--${v}`}>
                    {v === 'sim' ? <IconeCartoon nome={RESTRICAO[chave].icone} tamanho={32} /> : <span className="ct-veredito__marca" aria-hidden="true" />}
                    <span>{RESTRICAO[chave][v]}</span>
                  </li>
                )
              })}
            </ul>
            <p className="ct-confirme">{T.confirme}</p>
          </div>
        </TopoCanal>
      ) : (
        <p className="ct-aviso">{FASE_TEXTO.semCombo}</p>
      )}

      {/* 3 · Como pedir */}
      {combo && !encerrada && (
        <section id="atendimento" className="ct-bloco ct-ficha__secao" aria-labelledby="atendimento-titulo">
          <Letreiro id="atendimento-titulo" texto={T.atendimentoTitulo} />
          <ul className="ct-modos">
            {M.MODOS.map(([k]) => <Modo key={k} p={p} k={k} nomesUnidades={nomesUnidades} />)}
          </ul>
          {(instagram || p.casa.site) && (
            <div className="ct-ficha__fale">
              <p className="ct-rotulo">{T.faleCom}</p>
              <div className="ct-acoes">
                {instagram && <Botao tipo="secundario" href={`https://www.instagram.com/${instagram}/`} target="_blank" rel="noopener noreferrer"><ScwIcon nome="instagram" tamanho={20} />@{instagram}</Botao>}
                {p.casa.site && linkSeguro({ link: p.casa.site }) && <Botao tipo="secundario" href={p.casa.site} target="_blank" rel="noopener noreferrer">{T.site}</Botao>}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4 · Unidades */}
      <section id="unidades" className="ct-bloco ct-ficha__secao" aria-labelledby="un-titulo">
        <Letreiro id="un-titulo" texto={T.unidadesTitulo(unidades.length)} />
        {unidades.length ? (
          <div className={`ct-unidades${unidades.length > 1 ? ' ct-unidades--varias' : ''}`}>
            {unidades.map((u) => <Unidade key={u.id} u={u} casa={p.casa} navigate={navigate} comCombo={!!combo && !encerrada} rota={rota} periodo={periodo} />)}
          </div>
        ) : <p className="ct-ni">{T.unidadesNi}</p>}
      </section>

      {/* 5 · Galeria */}
      <section className="ct-bloco ct-ficha__secao" aria-labelledby="galeria-titulo">
        <Letreiro id="galeria-titulo" texto={T.galeriaTitulo} />
        {galeria.length ? <Galeria fotos={galeria} /> : (
          <Quadro className="ct-galeria-reserva"><p>{T.galeriaReserva}</p></Quadro>
        )}
      </section>

      {/* 6 · Avalie */}
      {avaliacaoAberta && (
        <section className="ct-bloco ct-avalie" aria-labelledby="av-titulo">
          <Letreiro id="av-titulo" texto={T.avaliarTitulo} />
          <p>{T.avaliarTexto}</p>
          <Link className="ct-botao" href={`${EDICAO.caminho}/avaliar?participante=${p.slug}`} navigate={navigate}>{T.avaliar}</Link>
        </section>
      )}
      <CenarioFixo slug={p.slug} />
    </article>
  )
}

/** Fotos em grade; cada uma abre ampliada num <dialog> com anterior/próxima. */
function Galeria ({ fotos }) {
  const ref = React.useRef(null)
  const [i, setI] = React.useState(0)
  const abrir = (n) => { setI(n); ref.current?.showModal() }
  return (
    <>
      <ul className="ct-galeria-grade">
        {fotos.map((f, n) => (
          <li key={n}>
            <button type="button" className="ct-galeria-grade__item" onClick={() => abrir(n)} aria-label={`Ampliar a foto ${n + 1} de ${fotos.length}`}>
              <Foto foto={f} proporcao="1 / 1" />
            </button>
          </li>
        ))}
      </ul>
      <dialog ref={ref} className="ct-galeria" aria-label="Fotos" onClick={(e) => { if (e.target === ref.current) ref.current.close() }}>
        <Foto foto={fotos[i]} proporcao={proporcaoDe(fotos[i], '4 / 3')} />
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
