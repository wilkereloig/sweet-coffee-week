import React from 'react'
import { Icone } from '../Icone'
import { chaveDia } from '../../lib/hoje'
import { rpc } from '../../lib/rpc'
import { ORIGENS } from '../../lib/respostas'
import { ETAPAS, colunasMesa, resumoDaEdicao, encerradasNaEdicao } from '../../lib/mesa'
import { notificacoesOrg } from '../../lib/notificacoes'
import { acoesDaEquipe, agendaDaEquipe, avisoDeLeitura, estadoDaEdicao, estadoDasAcoes, LEITURA, ROTA_AGENDA_FOTOS } from '../../lib/visaoGeral'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Erro, Secao, Selo, LogoMarca, MacroSecao, GradeModulos, Modulo, NivelTitulo } from '../ui'
import { urlLogo } from '../../lib/logos'
import { ResumoRedes } from './Redes'
import { CartaoAcao } from './mesa/CartaoAcao'
import { ResumoEdicao } from './mesa/ResumoEdicao'
import { AtividadeRecente } from './mesa/AtividadeRecente'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { DOMINIOS_VISTAS } from '../../lib/syncFichas'
import { ORIGEM_PUBLICA } from '../../lib/origem'
import '../../styles/mesa-org.css'

/*
 * A Visão geral (módulo Visão geral › "A mesa") — três assuntos, nesta ordem:
 *   1. AÇÕES DA EQUIPE — o que pede decisão ou ação agora. Cartões por urgência; cada número é o tamanho da
 *      lista que o cartão abre. Só aparece o que a função da pessoa pode resolver.
 *   2. SITUAÇÃO DAS MARCAS — a edição em números e a esteira por etapa (quantas marcas há em cada).
 *   3. ATIVIDADE RECENTE — o que a equipe fez por último, em formato compacto.
 * As decisões (o que conta, ordem, permissão, texto de vazio e de erro) moram em lib/visaoGeral.js, com teste.
 *
 * Só LEITURA e navegação: nenhum cartão escreve nada. Quem muda status é a
 * ficha (Respostas/Marcas), com a permissão de cada ação.
 */
const ICONE_COMBO = ['item-doce', 'item-salgado', 'item-bebida']
const ROTULO_COMBO = ['doce', 'salgado', 'bebida']

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

export function Mesa({ abrirLink, navegar, pode }) {
  const guarda = useGuarda()
  const [candidaturas, setCandidaturas] = React.useState(null) // null = carregando
  const [participantes, setParticipantes] = React.useState([])
  // `marcasLidas` / `edicaoLida`: a leitura funcionou ao menos uma vez (sem isso, lista vazia e "sem edição" são só o valor inicial, não um fato).
  const [extra, setExtra] = React.useState({ dados: {}, solicitacoes: [], sessoes: [], conversas: [], atividade: null, revisao: [], temas: [], edicao: null, falhas: [], lidas: false, marcasLidas: false, edicaoLida: false })
  const [erro, setErro] = React.useState(null)
  const [etapaSel, setEtapaSel] = React.useState(null) // null = a primeira com gente
  const [logos, setLogos] = React.useState({}) // participante_id → logo oficial

  /*
   * Duas fases, como sempre: a conferência da sessão + as candidaturas (a mesa só aparece com elas) e,
   * depois, as leituras extras, cada uma com o PRÓPRIO destino — uma que cai não derruba nem apaga as outras.
   * Releitura SILENCIOSA (sinal de outra pessoa, reconexão, volta ao app): sem esqueleto e sem trocar a mesa
   * por erro; uma leitura que falha deixa na tela o que já estava lá, e a falha é dita ("Faltou ler…").
   * Resposta velha e tela desmontada não gravam nada (useGuarda). true = tudo foi lido.
   */
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guarda()
    if (!silencioso) setErro(null)
    const senha = lerSenha()
    try {
      const [valida, lista] = await Promise.all([
        rpc('admin_ping', { p_secret: senha }),
        rpc(ORIGENS.quero_participar.rpc, { p_secret: senha }),
      ])
      if (!vale()) return true
      if (valida !== true) { if (!silencioso) setErro('A senha desta sessão não vale mais. Saia e entre de novo.'); return false }
      setCandidaturas(lista || [])
      setErro(null)
    } catch (e) {
      if (!vale()) return true
      if (!silencioso) setErro(e.message)
      return false
    }
    // Carga apartada e que NÃO derruba a mesa (CLAUDE.md §10.4-b): cada
    // leitura extra tem o próprio catch — mas a falha é DITA, não vira lista
    // vazia: "Nada pendente agora" com metade das leituras caídas é mentira.
    const falhas = []
    const pegar = (nome, corpo, oQue) => rpc(nome, { p_secret: senha, ...corpo }).then((v) => ({ ok: true, v }), () => { if (oQue) falhas.push(oQue); return { ok: false, v: null } })
    const part = await pegar('get_participantes', {}, LEITURA.marcas)
    if (!vale()) return true
    if (part.ok) setParticipantes(part.v || [])
    const [apoiar, contato, solicitacoes, sessoes, conversas, atividade, revisao, temas, edicoes, logos] = await Promise.all([
      pegar(ORIGENS.apoiar.rpc, {}, LEITURA.apoiar), pegar(ORIGENS.contato.rpc, {}, LEITURA.contato),
      pegar('get_solicitacoes_admin', {}, LEITURA.pedidos), pegar('get_sessoes_fotos', {}, LEITURA.sessoes),
      pegar('get_conversas', {}, LEITURA.conversas), pegar('get_atividade', { p_limite: 12 }, LEITURA.atividade),
      pegar('get_revisao', { p_status: 'aberta' }, LEITURA.revisao), pegar('get_temas', {}, LEITURA.temas), pegar('get_edicoes', {}, LEITURA.edicao),
      // Logo é enfeite do cartão: falhou, ficam as iniciais (e o que já estava) — não entra em `falhas`.
      pegar('get_logos', {}, null),
    ])
    if (!vale()) return true
    if (logos.ok) setLogos(Object.fromEntries((logos.v || []).map((l) => [l.participante_id, l])))
    // Leitura que falhou deixa o que já estava (a primeira vez, a lista vazia de sempre).
    const ou = (r, anterior, tratar = (v) => v || []) => (r.ok ? tratar(r.v) : anterior)
    setExtra((x) => ({
      falhas, lidas: true, marcasLidas: x.marcasLidas || part.ok, edicaoLida: x.edicaoLida || edicoes.ok,
      dados: { apoiar: ou(apoiar, x.dados.apoiar || []), contato: ou(contato, x.dados.contato || []) },
      solicitacoes: ou(solicitacoes, x.solicitacoes), sessoes: ou(sessoes, x.sessoes), conversas: ou(conversas, x.conversas),
      atividade: ou(atividade, x.atividade || []), revisao: ou(revisao, x.revisao), temas: ou(temas, x.temas),
      edicao: ou(edicoes, x.edicao, (v) => (v || []).find((e) => e.atual) || null),
    }))
    return falhas.length === 0 && logos.ok && part.ok
  }, [guarda])

  React.useEffect(() => { carregar() }, [carregar])
  // Qualquer coisa que a mesa resume (candidatura, marca, pedido, sessão, mensagem, revisão, tema, edição, atividade)
  // mudou — aqui ou em outra sessão: relê em silêncio. Sem poll e sem botão que só esta tela conheça.
  useSincronizar(DOMINIOS_VISTAS.mesa, async () => { if (!(await carregar({ silencioso: true }))) throw new Error('mesa') })
  const tentarDeNovo = React.useCallback(() => carregar(), [carregar])

  const colunas = candidaturas ? colunasMesa({ candidaturas, participantes }) : ETAPAS.map((e) => ({ ...e, itens: [] }))
  const etapa = colunas.find((c) => c.chave === etapaSel) || colunas.find((c) => c.itens.length) || colunas[0]

  const edCodigo = extra.edicao ? extra.edicao.codigo : undefined
  const hoje = chaveDia(new Date())

  // 1 · Ações da equipe. Sem `pode` (a vista foi montada sem permissões) ninguém age: nada que exija ação aparece.
  // Pedido que o cartão conta = o que a tela de pedidos mostra e já foi publicado às marcas (rascunho e arquivado ficam de fora).
  const pedidosPublicados = extra.solicitacoes.filter((s) => s.publicada_em && !s.arquivada)
  const agenda = agendaDaEquipe({
    cronograma: extra.edicao && extra.edicao.cronograma, hoje,
    avisosAgenda: notificacoesOrg({ sessoes: extra.sessoes }).filter((p) => p.tipo === 'agenda'),
  })
  const { cartoes, ocultas } = acoesDaEquipe({
    candidaturas: candidaturas || [], participantes, conversas: extra.conversas, revisao: extra.revisao, pedidos: pedidosPublicados,
    temas: extra.temas, respostasSite: extra.dados, edicaoCodigo: edCodigo, agenda, pode: pode || (() => false),
  })
  const nContagens = cartoes.filter((c) => c.tipo === 'contagem').length
  const estado = estadoDasAcoes({ lidas: extra.lidas, falhas: extra.falhas, contagens: nContagens, ocultas, agendaUrgente: agenda.urgente })
  // Leitura que caiu é dita NO BLOCO que ela alimenta (a falha de uma não condena as outras áreas).
  const avisosDeLeitura = { acoes: avisoDeLeitura(extra.falhas, 'acoes'), marcas: avisoDeLeitura(extra.falhas, 'marcas'), atividade: avisoDeLeitura(extra.falhas, 'atividade') }

  // 2 · Situação das marcas. Cada número abre a lista JÁ FILTRADA pelo que ele conta (o filtro vai no endereço).
  const { naEdicao, comAcesso, completos } = resumoDaEdicao(participantes, edCodigo)
  // Edição ou marcas que NUNCA foram lidas não viram "nenhuma edição" nem "0 marcas" (nem uma esteira de zeros).
  const estadoEdicao = estadoDaEdicao({ codigo: edCodigo, lidas: extra.lidas, edicaoLida: extra.edicaoLida, marcasLidas: extra.marcasLidas })
  const esteiraSemMarcas = extra.lidas && !extra.marcasLidas // a esteira mistura candidatura e conta: sem as marcas, nenhuma etapa fecha
  const lista = (filtros) => () => navegar({ vista: 'participantes', aba: 'lista', filtros })

  return (
    <div className="og-embutida ms-visao">

      {erro && <Erro texto={erro} onTentar={tentarDeNovo} />}
      {!erro && candidaturas === null && <Carregando linhas={3} />}

      {!erro && candidaturas && (
        <>
          <MacroSecao rotulo="Ações da equipe" titulo="O que precisa de decisão agora" id="visao-acoes"
            nota="Cada cartão abre a lista do que ele conta. Os mais urgentes vêm primeiro.">
            <div className="ui-pilha">
              {avisosDeLeitura.acoes && <Erro texto={avisosDeLeitura.acoes} onTentar={tentarDeNovo} />}
              {nContagens === 0 && (
                // "Nada precisa da equipe" só depois de LER tudo: antes das leituras (ou com alguma caída) não se sabe — dizer que está em dia seria mentira.
                !extra.lidas ? <p className="ui-nota">Conferindo o que está pendente…</p>
                : extra.falhas.length ? <p className="ui-nota">Não consegui ler tudo, então não dá para dizer que está em dia.</p>
                : estado.texto ? <p className="ui-resumo__ok"><Icone nome="ok-circulo" tamanho={20} /> {estado.texto}</p>
                : null // prazo vencendo: o cartão da agenda (o primeiro, abaixo) já diz o que fazer — "nada precisa" ao lado dele seria falso
              )}
              <GradeModulos>
                {cartoes.map((c) => (c.tipo === 'agenda' ? (
                  <Modulo key="agenda" icone="calendario" titulo="Prazos e agenda" sub="Prazos da edição e sessões de fotos dos próximos dias"
                    status={agenda.urgente ? <Selo tom="atencao">{agenda.urgenteTexto}</Selo> : null}>
                    {agenda.itens.length > 0 ? (
                      <ul className="ui-atencao">
                        {agenda.itens.map((i) => (
                          <li key={i.chave}>
                            <button type="button" className="ui-atencao__item" data-tipo="agenda" onClick={() => navegar(i.rota)}>
                              {i.titulo ? <><b>{i.titulo}</b>: {i.texto}</> : i.texto}
                            </button>
                          </li>
                        ))}
                        {agenda.mais > 0 && (
                          <li>
                            <button type="button" className="ui-atencao__item" data-tipo="agenda" onClick={() => navegar(ROTA_AGENDA_FOTOS)}>
                              Mais {agenda.mais} {agenda.mais === 1 ? 'item' : 'itens'} na agenda de fotos
                            </button>
                          </li>
                        )}
                      </ul>
                    ) : (extra.falhas.length ? <p className="ui-nota">Não consegui conferir tudo.</p> : !extra.lidas ? <p className="ui-nota">Conferindo…</p> : <p className="ui-nota">Nada pendente agora.</p>)}
                  </Modulo>
                ) : <CartaoAcao key={c.chave} acao={c} navegar={navegar} />))}
              </GradeModulos>
              {/* Social media: o resumo cuida da própria leitura e da própria permissão (redes.ver); sem ela, não renderiza nada. */}
              {pode && (
                <NivelTitulo.Provider value={3}>
                  <ResumoRedes navegar={navegar} pode={pode} />
                </NivelTitulo.Provider>
              )}
            </div>
          </MacroSecao>

          <MacroSecao rotulo="Situação das marcas" titulo="Onde cada marca está" id="visao-marcas"
            nota="Da candidatura ao combo fechado. O número de cada etapa é o número de marcas que ela mostra.">
            <div className="ui-pilha">
              {avisosDeLeitura.marcas && <Erro texto={avisosDeLeitura.marcas} onTentar={tentarDeNovo} />}
              <GradeModulos>
                <Modulo largo icone="edicao" titulo={edCodigo ? 'Edição ' + edCodigo : 'A edição'}
                  sub={edCodigo ? 'As marcas que participam, com acesso e com cadastro completo' : undefined}>
                  <ResumoEdicao estado={estadoEdicao} codigo={edCodigo} total={naEdicao.length} comAcesso={comAcesso} completos={completos}
                    encerradas={encerradasNaEdicao(participantes, edCodigo).length} ir={lista} />
                </Modulo>
              </GradeModulos>
              {/* A esteira é um quadro de cartões: sem card em volta (card dentro de card), com título de seção como o do Social media. */}
              <NivelTitulo.Provider value={3}>
                <Secao titulo="A esteira" nota="Do formulário do site até o combo fechado">
                  {esteiraSemMarcas ? (
                    <p className="ui-nota">Não consegui ler as marcas agora, então a esteira não aparece: ela ficaria incompleta.</p>
                  ) : (
                    <>
                      {/* Trilha das seis etapas, todas à vista (sem rolagem lateral), e
                          abaixo só os cartões da etapa escolhida. Abre na primeira com gente. */}
                      <div className="og-esteira" role="group" aria-label="Etapas da esteira">
                        {colunas.map((e) => (
                          <button type="button" key={e.chave}
                            className={'og-esteira__etapa' + (e === etapa ? ' is-ativa' : '') + (e.itens.length ? '' : ' is-vazia')}
                            aria-pressed={e === etapa}
                            aria-label={e.nome + ': ' + e.itens.length + ' — ' + e.legenda}
                            onClick={() => setEtapaSel(e.chave)}>
                            <span className="og-mesa__disco" style={{ background: e.cor, color: e.tinta }} aria-hidden="true">
                              <Icone nome={'etapa-' + e.chave} tamanho={20} />
                            </span>
                            <span className="og-esteira__texto" aria-hidden="true">
                              <span className="og-mesa__nome">{e.nome}</span>
                              <span className="og-mesa__legenda">{e.legenda}</span>
                            </span>
                            <span className="og-mesa__n" aria-hidden="true">{e.itens.length}</span>
                          </button>
                        ))}
                      </div>
                      <div className="og-esteira__painel">
                        <p className="og-esteira__titulo" aria-live="polite"><b>{etapa.nome}</b> · {etapa.itens.length === 1 ? '1 marca' : etapa.itens.length + ' marcas'}</p>
                        {etapa.itens.length === 0 ? (
                          <p className="og-mesa__vazio">{candidaturas ? 'Nenhuma marca nesta etapa.' : 'Carregando…'}</p>
                        ) : (
                          <div className="og-esteira__cartoes">
                            {etapa.itens.map((it) => {
                              const chave = it.tipo === 'marca' ? 'marca:' + it.participacaoId + ':' + it.participanteId : 'cand:' + it.id
                              // Navegação, não escrita: abre a ficha certa (candidatura
                              // em Respostas, conta em Marcas).
                              const destino = it.tipo === 'marca' ? 'marcas/' + it.participanteId : 'respostas/quero_participar/' + it.id
                              return (
                                <button type="button" className="og-cartao" key={chave} onClick={() => abrirLink(destino)}>
                                  <span className="og-cartao__topo">
                                    <LogoMarca url={it.tipo === 'marca' ? urlLogo(logos[it.participanteId] && logos[it.participanteId].path) : null} nome={it.nome} tamanho={40} />
                                    <b className="og-cartao__nome">{it.nome || '(sem nome)'}</b>
                                    {it.novo && <Selo tom="atencao">Nova</Selo>}
                                  </span>
                                  <span className="og-cartao__meta">{it.meta || ''}</span>
                                  {it.tipo === 'marca' && (
                                    <span className="og-cartao__combo">
                                      <span className="ui-oculto">{it.itensProntos} de 3 itens do combo prontos</span>
                                      {[0, 1, 2].map((i) => (
                                        <span key={i} title={ROTULO_COMBO[i]} className={i < it.itensProntos ? 'is-pronto' : ''}>
                                          <Icone nome={ICONE_COMBO[i]} tamanho={16} />
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </Secao>
              </NivelTitulo.Provider>
            </div>
          </MacroSecao>

          <MacroSecao rotulo="Atividade recente" titulo="O que a equipe fez por último" id="visao-atividade"
            nota="Os registros mais novos, do mais recente para o mais antigo.">
            <div className="ui-pilha">
              {avisosDeLeitura.atividade && <Erro texto={avisosDeLeitura.atividade} onTentar={tentarDeNovo} />}
              <GradeModulos>
                <AtividadeRecente linhas={extra.atividade} falhou={!!avisosDeLeitura.atividade} abrirLink={abrirLink} navegar={navegar} verHistorico={!!pode && pode('acesso.gerir')} />
              </GradeModulos>
            </div>
          </MacroSecao>
        </>
      )}
    </div>
  )
}

/*
 * Os formulários do site — onde cada resposta nasce. Saiu da mesa na
 * reestruturação (29/09/2026): é referência, não pendência. Mora em
 * Administração › Formulários.
 */
export function Formularios() {
  const [copiado, setCopiado] = React.useState(null)
  async function copiarLink(chave, url) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(chave)
    } catch {
      // Sem clipboard: a URL já está na tela — não fingir que copiou.
      setCopiado(chave + ':manual')
    }
    setTimeout(() => setCopiado(null), 2400)
  }
  return (
    <Secao titulo="Os formulários do site" nota="Onde cada resposta nasce">
            <ul className="og-forms__lista">
              {Object.entries(ORIGENS).map(([chave, o]) => {
                const publico = !!o.form
                const url = publico ? ORIGEM_PUBLICA + o.form : ''
                return (
                  <li className="og-forms__item" key={chave}>
                    <p className="og-forms__nome"><span className="og-forms__ponto" style={{ background: o.cor }} aria-hidden="true" />{o.rotulo}</p>
                    {publico ? (
                      <>
                        <p className="og-forms__url">{url}</p>
                        <div className="ui-linha-acoes">
                          <a className="og-btn og-btn--mini" href={o.form} target="_blank" rel="noopener noreferrer">Abrir</a>
                          <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={() => copiarLink(chave, url)}>
                            {copiado === chave ? 'Link copiado' : copiado === chave + ':manual' ? 'Copie da linha acima' : 'Copiar link'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="ui-nota">Ainda não está público. Vive na {o.formNota} e vai ao ar junto com o site institucional.</p>
                    )}
                  </li>
                )
              })}
            </ul>
    </Secao>
  )
}
