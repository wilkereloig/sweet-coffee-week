import React from 'react'
import { Icone, MODULO_ICONE } from '../Icone'
import { urlLogo } from '../../lib/logos'
import { api } from '../../lib/marcaApi'
import { chaveDia } from '../../lib/hoje'
import { tempoRelativo } from '../../lib/central'
import { nivelDoAviso, NIVEIS } from '../../lib/guia'
import { VistaCabeca } from '../VistaCabeca'
import { AvisosAparelho } from '../AvisosAparelho'
import { Carregando, Erro, Secao, Selo, Modulo, MacroSecao, GradeModulos, Botao, LogoMarca } from '../ui'
import { VouchersMarca } from './VouchersMarca'
import { momentoEdicao, resumoTrajetoria, proximosDoCronograma, textoPrazo } from '../../lib/operacao'

const dataBr = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '')

// Estado de etapa e de pendência: ícone + texto, nunca só cor (ícones em components/Icone.jsx).
const ROTULO_ESTADO = { feito: 'concluído', atencao: 'alteração pedida', andamento: 'em andamento', pendente: 'falta' }

/*
 * Início (marca) — guia de entrada (29/09/2026). Nesta ordem: situação (% e
 * etapas), o que precisa de ação (a próxima em destaque), status do combo,
 * avisos recentes, arquivos e atalhos. Depois, o de sempre: venda do dia no
 * festival, vouchers, cronograma e história. Os dados do guia vêm da casca
 * (`resumo`); aqui só se carrega o que é desta tela.
 */
export function Hoje({ irPara, abrirLink, contadores = {}, alvo, consumirAlvo, resumo, dadosMarca, erroResumo, recarregarResumo, avisos = [] }) {
  const [vendas, setVendas] = React.useState([])
  const [edicao, setEdicao] = React.useState(null)
  const [cronograma, setCronograma] = React.useState([])
  const [historia, setHistoria] = React.useState(null)
  const [qtd, setQtd] = React.useState('')
  const [salvando, setSalvando] = React.useState(false)
  const [erro, setErro] = React.useState(null)

  const participante = dadosMarca && dadosMarca.participante
  const participacao = dadosMarca && dadosMarca.participacao
  const estado = !dadosMarca ? 'carregando' : !participante ? 'sem-marca' : !participacao ? 'sem-participacao' : 'pronto'
  const hoje = chaveDia(new Date())
  const deHoje = vendas.find((v) => v.dia === hoje)

  const carregarLocal = React.useCallback(async () => {
    api('rpc/marca_minha_historia', { metodo: 'POST', corpo: {} }).then(setHistoria).catch(() => setHistoria(null))
    if (!participacao) return
    const ed = encodeURIComponent(participacao.edicao_codigo)
    const [eds, crono, v] = await Promise.all([
      api('edicoes?select=*&codigo=eq.' + ed).catch(() => []),
      api('edicao_cronograma?select=*&edicao_codigo=eq.' + ed + '&order=ordem').catch(() => []),
      api('vendas_diarias?select=*&participacao_id=eq.' + participacao.id + '&order=dia.desc').catch(() => []),
    ])
    setEdicao((eds && eds[0]) || null)
    setCronograma(crono || [])
    setVendas(v || [])
  }, [participacao && participacao.id]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { if (dadosMarca) carregarLocal() }, [carregarLocal, !!dadosMarca]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { setQtd(deHoje ? String(deHoje.quantidade) : '') }, [deHoje])
  // Aviso "registre as vendas de hoje": rola até a venda.
  React.useEffect(() => {
    if (!alvo) return
    if ((alvo.id === 'venda' || !alvo.id) && estado === 'pronto') {
      const el = document.getElementById('venda-do-dia')
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const campo = el.querySelector('input'); if (campo) campo.focus({ preventScroll: true }) }
    }
    if (estado !== 'carregando') consumirAlvo && consumirAlvo()
  }, [alvo, estado]) // eslint-disable-line react-hooks/exhaustive-deps

  async function salvar(ev) {
    ev.preventDefault()
    const n = parseInt(qtd, 10)
    if (isNaN(n) || n < 0) { setErro('Informe um número inteiro, zero ou mais.'); return }
    setSalvando(true)
    setErro(null)
    try {
      const r = deHoje
        ? await api('vendas_diarias?id=eq.' + deHoje.id, { metodo: 'PATCH', corpo: { quantidade: n }, prefer: 'return=representation' })
        : await api('vendas_diarias', { metodo: 'POST', corpo: { participacao_id: participacao.id, dia: hoje, quantidade: n }, prefer: 'return=representation' })
      const linha = r && r[0]
      if (!linha) throw new Error('sem_confirmacao')
      setVendas((atual) => (deHoje ? atual.map((v) => (v.id === deHoje.id ? linha : v)) : [linha, ...atual]))
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      if (/duplicate|unique|23505/i.test(e.message || '')) { await carregarLocal(); setErro('Já havia um número lançado hoje em outro aparelho. Confira e atualize.'); return }
      setErro('Não deu para lançar agora. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  const ir = (link, vista) => (link ? abrirLink(link) : irPara(vista))
  const momento = momentoEdicao(edicao, hoje)
  const trajetoria = resumoTrajetoria(historia)
  const proximos = proximosDoCronograma(cronograma, hoje, 5)
  const total = vendas.reduce((s, v) => s + Number(v.quantidade || 0), 0)
  const nomePessoa = participante && String(participante.responsavel || '').trim().split(/\s+/)[0]

  const pendencias = (resumo && resumo.pendencias) || []
  const proxima = resumo && resumo.proxima
  const outras = pendencias.filter((p) => p !== proxima)
  const concluidas = resumo ? resumo.etapas.filter((e) => e.estado === 'feito') : []
  const emAnalise = resumo && resumo.combo && resumo.combo.status === 'em_analise'
  const arquivos = ((dadosMarca && dadosMarca.arquivos) || []).filter((a) => a.categoria !== 'combo')
  const recentes = (avisos || []).slice(0, 3)

  return (
    <section className="ui-vista-marca">
      <VistaCabeca
        acento="amarelo" icone="inicio"
        titulo={nomePessoa ? 'Olá, ' + nomePessoa : participante ? 'Olá, ' + participante.nome_marca : 'Início'}
        nota={participacao ? participante.nome_marca + ' · edição ' + participacao.edicao_codigo : 'O que falta e o que vem agora'}
      />

      {estado === 'carregando' && (erroResumo
        ? <Erro texto={erroResumo} onTentar={recarregarResumo} />
        : <Carregando linhas={3} texto="Carregando o seu painel…" />)}
      {estado === 'sem-marca' && <Erro titulo="Conta sem marca" texto="Sua conta existe, mas ainda não há marca ligada a ela. Fale com a organização pelo WhatsApp." />}

      {participante && (
        <div className="ui-boasvindas">
          {trajetoria.tipo === 'recorrente' && (
            <p className="ui-boasvindas__linha">
              Bem-vindo de volta: {trajetoria.participacoes} participações no Sweet &amp; Coffee Week
              {trajetoria.desde ? ', desde ' + trajetoria.desde + ' (' + trajetoria.desdeCodigo + ')' : ''}
              {trajetoria.premios ? ', ' + trajetoria.premios + (trajetoria.premios === 1 ? ' pódio' : ' pódios') + ' no Sweet Awards' : ''}.
            </p>
          )}
          {trajetoria.tipo === 'primeira' && <p className="ui-boasvindas__linha">Esta é a sua primeira edição no Sweet &amp; Coffee Week. O painel mostra o que fazer, um passo de cada vez.</p>}
          {edicao && momento !== 'indefinido' && (
            <p className="ui-boasvindas__linha">
              {momento === 'antes' && edicao.nome + ': o festival começa em ' + dataBr(edicao.festival_inicio) + '.'}
              {momento === 'durante' && edicao.nome + ': o festival está acontecendo, até ' + dataBr(edicao.festival_fim) + '.'}
              {momento === 'depois' && edicao.nome + ': o festival terminou. Obrigado por fazer parte.'}
            </p>
          )}
        </div>
      )}

      {estado === 'sem-participacao' && (
        <Secao titulo="Sem edição aberta" nota="Sua marca ainda não tem participação aberta na edição atual. Quando a organização abrir, o cadastro aparece aqui.">
          <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => irPara('mensagens')}>Falar com a organização</button>
        </Secao>
      )}

      {estado === 'pronto' && resumo && (
        <div className="gm-inicio">
          {/* 1 · Sua marca: quem é (logo, contato) e quanto do cadastro está pronto */}
          <MacroSecao rotulo="Sua marca" titulo={'Seu cadastro está ' + resumo.progresso.pct + '% concluído'}
            nota={resumo.progresso.feitos + ' de ' + resumo.progresso.total + ' informações obrigatórias preenchidas'}>
            <GradeModulos className="ui-modulos--dois">
              <Modulo icone={MODULO_ICONE.estabelecimento} titulo="Meu estabelecimento" sub={participante.nome_marca}
                status={<Selo dominio="logo" valor={(dadosMarca.logo && dadosMarca.logo.estado) || 'nao_enviada'} />}
                acoes={<>
                  <Botao icone="editar" variante="secundario" onClick={() => irPara('cadastro')}>Editar dados</Botao>
                  {!(dadosMarca.logo && dadosMarca.logo.estado === 'confirmada') && <Botao icone="imagem" onClick={() => abrirLink('cadastro/0/logo')}>Enviar logo</Botao>}
                </>}>
                <div className="gm-estab">
                  <LogoMarca url={urlLogo(dadosMarca.logo && dadosMarca.logo.atual && dadosMarca.logo.atual.path)} nome={participante.nome_marca} tamanho={72} />
                  <dl className="ui-dados">
                    <div className="ui-dado"><dt>Responsável</dt><dd>{participante.responsavel || 'Não informado'}</dd></div>
                    <div className="ui-dado"><dt>WhatsApp</dt><dd>{participante.telefone || 'Não informado'}</dd></div>
                  </dl>
                </div>
              </Modulo>
              <Modulo icone="cadastro" titulo="Etapas do cadastro" className="gm-situacao">
                <div className="gm-progresso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={resumo.progresso.pct} aria-label="Cadastro concluído">
                  <span style={{ width: resumo.progresso.pct + '%' }} />
                </div>
                <ol className="gm-etapas">
                  {resumo.etapas.map((e) => (
                    <li key={e.chave}>
                      <button type="button" className="gm-etapa" data-estado={e.estado} onClick={() => irPara(e.vista)}>
                        <span className="gm-etapa__icone"><Icone nome={e.estado} tamanho={16} /></span>
                        <span className="gm-etapa__rotulo">{e.rotulo}</span>
                        <span className="gm-etapa__estado">{e.faltam ? e.faltam + (e.faltam === 1 ? ' falta' : ' faltam') : ROTULO_ESTADO[e.estado]}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </Modulo>
            </GradeModulos>
          </MacroSecao>

          {/* 2 e 3 · Ação necessária, com a próxima em destaque */}
          <MacroSecao rotulo="Agora" titulo={pendencias.length ? 'Ação necessária' : 'Nada pendente'}
            nota={pendencias.length ? (pendencias.length === 1 ? 'Você tem 1 pendência.' : 'Você tem ' + pendencias.length + ' pendências.') : 'Quando a organização pedir algo, aparece aqui e no sino.'}>
            <Modulo icone={MODULO_ICONE.pendencias} titulo="Pendências" largo
              status={pendencias.length ? <Selo tom="atencao">{pendencias.length === 1 ? '1 aberta' : pendencias.length + ' abertas'}</Selo> : <Selo tom="ok">Em dia</Selo>}>
              {proxima && (
                <button type="button" className="gm-proxima" onClick={() => ir(proxima.link, proxima.vista)}>
                  <span className="gm-proxima__rotulo">{proxima.tipo === 'campo' ? 'Continue de onde parou' : 'Próxima ação'}</span>
                  <span className="gm-proxima__titulo">{proxima.titulo}</span>
                  {proxima.texto && <span className="gm-proxima__texto">{proxima.texto}</span>}
                  <span className="gm-proxima__acao">{proxima.acao || 'Abrir'} →</span>
                </button>
              )}
              {outras.length > 0 && (
                <ul className="gm-pendencias">
                  {outras.map((p, i) => (
                    <li key={i} className="gm-pendencia" data-tipo={p.tipo} data-prioridade={p.prioridade || undefined}>
                      <span className="gm-pendencia__icone"><Icone nome={p.tipo} tamanho={20} /></span>
                      <span className="gm-pendencia__corpo">
                        <b>{p.titulo}{p.prioridade === 'importante' ? ' · importante' : ''}</b>
                        {p.texto && <span>{p.texto}</span>}
                      </span>
                      {p.link
                        ? <button type="button" className="og-btn og-btn--mini og-btn--vazado" onClick={() => ir(p.link, p.vista)}>{p.acao || 'Abrir'}</button>
                        : <button type="button" className="og-btn og-btn--mini og-btn--vazado" onClick={() => irPara('mensagens')}>Escrever</button>}
                    </li>
                  ))}
                </ul>
              )}
              {emAnalise && (
                <p className="gm-aguardando"><Icone nome="andamento" tamanho={20} /> Aguardando a organização: seu cadastro está em análise.</p>
              )}
              {concluidas.length > 0 && (
                <details className="ui-recolhe">
                  <summary>Concluído ({concluidas.length} {concluidas.length === 1 ? 'etapa' : 'etapas'})</summary>
                  <ul className="ui-feitos">{concluidas.map((e) => <li key={e.chave}>{e.rotulo}</li>)}</ul>
                </details>
              )}
            </Modulo>
          </MacroSecao>

          {/* 4 e 5 · Status do combo e avisos recentes, lado a lado */}
          <MacroSecao rotulo="Acompanhamento" titulo="Combo e avisos">
            <GradeModulos className="ui-modulos--dois">
              <Modulo icone={MODULO_ICONE.combo} titulo="Status do combo" status={<Selo dominio="combo" valor={resumo.combo.status} />}
                acoes={<Botao icone="combo" variante="secundario" onClick={() => irPara('combo')}>Abrir meu combo</Botao>}>
                {resumo.combo.status === 'em_analise' && <p className="ui-nota">A organização está conferindo. Você recebe um aviso quando ela responder.</p>}
                {resumo.combo.status === 'correcao_solicitada' && resumo.combo.nota && <p className="ui-nota">{resumo.combo.nota}</p>}
                {resumo.combo.status === 'rascunho' && <p className="ui-nota">Preencha o combo e envie para análise.</p>}
              </Modulo>
              <Modulo icone={MODULO_ICONE.notificacoes} titulo="Avisos recentes" className="gm-avisos">
                {recentes.length === 0 && <p className="ui-nota">Nenhum aviso ainda.</p>}
                {recentes.length > 0 && (
                  <ul className="gm-avisos__lista">
                    {recentes.map((n) => {
                      const nivel = nivelDoAviso(n)
                      return (
                        <li key={n.id}>
                          <button type="button" className="gm-aviso" onClick={() => n.link && abrirLink(n.link, n.tipo)} disabled={!n.link}>
                            <span className="ui-aviso__nivel" data-nivel={nivel}>{NIVEIS[nivel].rotulo}</span>
                            <b>{n.titulo}</b>
                            <span className="ui-nota">{tempoRelativo(n.criada_em)}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Modulo>
            </GradeModulos>
          </MacroSecao>

          {/* 6 e 7 · Atalhos */}
          <MacroSecao rotulo="Atalhos" titulo="Ir direto para">
            <div className="gm-atalhos">
              {[
                ['cadastro', 'Meu cadastro', contadores.cadastro],
                ['combo', 'Meu combo', contadores.combo],
                ['fotos', 'Fotos', contadores.fotos],
                ['arquivos', arquivos.length ? 'Arquivos (' + arquivos.length + ')' : 'Arquivos', contadores.arquivos],
                ['pedidos', 'Pedidos', ((dadosMarca && dadosMarca.pedidos) || []).filter((p) => p.estado !== 'respondido').length],
                ['mensagens', 'Falar com a organização', contadores.mensagens],
              ].map(([v, r, n]) => (
                <button key={v} type="button" className="gm-atalho" onClick={() => irPara(v)}>
                  <Icone nome={v} tamanho={24} />
                  <span>{r}</span>
                  {n > 0 && <span className="pn-badge">{n}</span>}
                </button>
              ))}
            </div>
            <AvisosAparelho
              compacto
              explicacao="Quer saber na hora quando a organização escrever ou pedir algo? Ligue os avisos neste aparelho."
              registrar={async (a) => {
                await api('push_subscriptions?endpoint=eq.' + encodeURIComponent(a.endpoint), { metodo: 'DELETE' }).catch(() => null)
                await api('push_subscriptions', { metodo: 'POST', prefer: 'return=minimal', corpo: { papel: 'marca', participante_id: participante && participante.id, endpoint: a.endpoint, p256dh: a.p256dh, auth_chave: a.auth, user_agent: a.userAgent } })
              }}
              remover={(endpoint) => api('push_subscriptions?endpoint=eq.' + encodeURIComponent(endpoint), { metodo: 'DELETE' })}
            />
          </MacroSecao>

          {momento !== 'antes' && (
            <Secao id="venda-do-dia" titulo="Combos vendidos" nota={deHoje ? 'Lançado. Dá para corrigir quantas vezes precisar.' : 'Lance no fim do expediente. A organização soma tudo para o balanço da edição.'}>
              <form className="mc-venda" onSubmit={salvar}>
                <div className="mc-venda__linha">
                  <label className="mc-venda__rotulo">
                    <span>Hoje</span>
                    <input className="mc-venda__campo" type="number" inputMode="numeric" min="0" step="1" placeholder="0" value={qtd} onChange={(e) => setQtd(e.target.value)} />
                  </label>
                  <button className="acao acao--amarela" type="submit" disabled={salvando}>{deHoje ? 'Atualizar' : 'Salvar'}</button>
                  <span className="mc-venda__total"><b>{total}</b><span>no total da edição</span></span>
                </div>
                {vendas.length > 0 && (
                  <div className="mc-venda__dias" aria-label="Últimos dias lançados">
                    {vendas.slice(0, 14).map((v) => {
                      const d = new Date(v.dia + 'T00:00:00')
                      return (
                        <div className={'mc-venda__dia' + (v.dia === hoje ? ' is-hoje' : '')} key={v.id}>
                          <b>{v.quantidade}</b>
                          <span>{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {erro && <p className="mc-venda__erro" role="alert">{erro}</p>}
              </form>
            </Secao>
          )}

          <VouchersMarca />

          {proximos.length > 0 && (
            <Secao titulo="Cronograma da edição"
              nota={momento === 'antes'
                ? 'O registro diário de combos vendidos abre aqui no primeiro dia do festival. As datas vêm da organização e podem mudar.'
                : 'As datas vêm da organização e podem mudar — o painel acompanha.'}>
              <ul className="ui-lista-simples">
                {proximos.map((i) => (
                  <li key={i.id}>
                    <b>{i.titulo}</b>
                    <span>
                      {i.tipo === 'periodo' ? dataBr(i.inicio) + ' a ' + dataBr(i.fim) : i.tipo === 'prazo' ? 'até ' + dataBr(i.fim) : dataBr(i.inicio)}
                      {' · '}{textoPrazo(i, hoje)}{i.condicao ? ' · ' + i.condicao : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {trajetoria.tipo === 'recorrente' && historia && (historia.edicoes || []).length > 0 && (
            <Secao titulo="Minha história no Sweet & Coffee Week" nota="Registrada pela organização a partir do acervo do festival.">
              <ol className="ui-trajetoria">
                {historia.edicoes.map((e) => {
                  const premios = (historia.premiacoes || []).filter((p) => p.edicao_codigo === e.codigo)
                  return (
                    <li key={e.codigo} className="ui-trajetoria__item">
                      <b>{e.codigo} · {e.nome}</b>
                      {premios.map((p, i) => <span key={i} className="ui-trajetoria__premio" data-pos={p.colocacao}>{p.colocacao}º lugar · {p.categoria}</span>)}
                    </li>
                  )
                })}
              </ol>
            </Secao>
          )}
        </div>
      )}
    </section>
  )
}
