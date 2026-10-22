import React from 'react'
import { Icone } from '../Icone'
import { agruparTemas, textoPrazo, diasAte, dataDoItem } from '../../lib/operacao'
import { chaveDia } from '../../lib/hoje'
import { rpc } from '../../lib/rpc'
import { ORIGENS } from '../../lib/respostas'
import { ETAPAS, colunasMesa, resumoDaEdicao } from '../../lib/mesa'
import { notificacoesOrg } from '../../lib/notificacoes'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Atividade } from '../Atividade'
import { Carregando, Erro, Secao, Selo, LogoMarca } from '../ui'
import { urlLogo } from '../../lib/logos'
import { ResumoRedes } from './Redes'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { DOMINIOS_VISTAS } from '../../lib/syncFichas'

/*
 * A mesa — o painel inicial da organização. Responde "o que precisa de mim
 * agora?": números do dia, a lista do que pede ação (cada item leva ao lugar
 * certo), a esteira por etapa e o que a equipe fez por último.
 *
 * Só LEITURA e navegação: nenhum cartão escreve nada. Quem muda status é a
 * ficha (Respostas/Marcas), com a permissão de cada ação.
 */
const ICONE_COMBO = ['item-doce', 'item-salgado', 'item-bebida']
const ROTULO_COMBO = ['doce', 'salgado', 'bebida']

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

export function Mesa({ abrirLink, navegar, pode, avisos = [] }) {
  const guarda = useGuarda()
  const [candidaturas, setCandidaturas] = React.useState(null) // null = carregando
  const [participantes, setParticipantes] = React.useState([])
  const [extra, setExtra] = React.useState({ dados: {}, solicitacoes: [], sessoes: [], conversas: [], atividade: null, revisao: [], temas: [], edicao: null, falhas: [] })
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
    const part = await pegar('get_participantes', {}, 'as marcas')
    if (!vale()) return true
    if (part.ok) setParticipantes(part.v || [])
    const [apoiar, contato, solicitacoes, sessoes, conversas, atividade, revisao, temas, edicoes, logos] = await Promise.all([
      pegar(ORIGENS.apoiar.rpc, {}, 'as respostas do Apoiar'), pegar(ORIGENS.contato.rpc, {}, 'as mensagens do Contato'),
      pegar('get_solicitacoes_admin', {}, 'os pedidos'), pegar('get_sessoes_fotos', {}, 'as sessões de fotos'),
      pegar('get_conversas', {}, 'as mensagens das marcas'), pegar('get_atividade', { p_limite: 12 }, 'a atividade recente'),
      pegar('get_revisao', { p_status: 'aberta' }, 'a revisão de dados'), pegar('get_temas', {}, 'os temas'), pegar('get_edicoes', {}, 'a edição atual'),
      // Logo é enfeite do cartão: falhou, ficam as iniciais (e o que já estava) — não entra em `falhas`.
      pegar('get_logos', {}, null),
    ])
    if (!vale()) return true
    if (logos.ok) setLogos(Object.fromEntries((logos.v || []).map((l) => [l.participante_id, l])))
    // Leitura que falhou deixa o que já estava (a primeira vez, a lista vazia de sempre).
    const ou = (r, anterior, tratar = (v) => v || []) => (r.ok ? tratar(r.v) : anterior)
    setExtra((x) => ({
      falhas,
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

  // O que pede ação: derivado dos dados (pendências), mais mensagens não lidas.
  const pendencias = notificacoesOrg({
    dados: { quero_participar: candidaturas || [], ...extra.dados },
    solicitacoes: extra.solicitacoes, sessoes: extra.sessoes, participantes,
  })
  const conversasNovas = extra.conversas.filter((c) => Number(c.nao_lidas || 0) > 0)
  const avisosNaoLidos = avisos.filter((n) => !n.lida).length
  // Da edição como configuração: prazos que estão chegando e temas em conflito.
  const hoje = chaveDia(new Date())
  const prazosProximos = ((extra.edicao && extra.edicao.cronograma) || [])
    .filter((i) => i.tipo === 'prazo' && diasAte(dataDoItem(i), hoje) >= 0 && diasAte(dataDoItem(i), hoje) <= 5)
  const conflitosTema = agruparTemas(extra.temas).filter((g) => g.conflito && !g.aprovado)
  const { naEdicao, comAcesso, semAcesso, completos } = resumoDaEdicao(participantes, extra.edicao && extra.edicao.codigo)

  // Cada número abre a lista JÁ FILTRADA pelo que ele conta (o filtro vai no
  // endereço — reestruturação 29/09/2026).
  const edCodigo = extra.edicao ? extra.edicao.codigo : undefined
  const lista = (filtros) => () => navegar({ vista: 'participantes', aba: 'lista', filtros })
  // A edição em frações do total; o resto só pede atenção quando passa de zero.
  const progresso = [
    { rotulo: 'com acesso ao painel', n: comAcesso, ir: lista({ edicao: edCodigo, situacao: 'com_conta' }) },
    { rotulo: 'cadastros completos', n: completos, ir: lista({ edicao: edCodigo, situacao: 'cadastro_completo' }) },
  ]
  const acoes = [
    { rotulo: 'candidaturas novas', um: 'candidatura nova', n: (candidaturas || []).filter((r) => r.status === 'novo').length, ir: () => navegar({ vista: 'participantes', aba: 'candidaturas', filtros: { status: 'novo' } }) },
    { rotulo: 'mensagens não lidas', um: 'mensagem não lida', n: conversasNovas.reduce((s, c) => s + Number(c.nao_lidas || 0), 0), ir: lista({ situacao: 'mensagens' }) },
    { rotulo: 'marcas sem acesso ao painel', um: 'marca sem acesso ao painel', n: semAcesso, ir: lista({ edicao: edCodigo, situacao: 'sem_conta' }) },
    { rotulo: 'dados para revisar', um: 'dado para revisar', n: extra.revisao.length, ir: () => navegar({ vista: 'admin', aba: 'revisao' }) },
    { rotulo: 'respostas de pedido faltando', um: 'resposta de pedido faltando', n: extra.solicitacoes.filter((s) => s.publicada_em && !s.arquivada).reduce((s, x) => s + Number(x.pendentes || 0), 0), ir: () => navegar({ vista: 'operacao', aba: 'pedidos' }) },
  ]
  const abertas = acoes.filter((a) => a.n > 0)
  const emDia = acoes.filter((a) => a.n === 0)

  return (
    <div className="og-embutida">

      {erro && <Erro texto={erro} onTentar={tentarDeNovo} />}
      {!erro && candidaturas === null && <Carregando linhas={3} />}

      {!erro && candidaturas && (
        <div className="ui-grade-painel">
          <div className="ui-resumo">
            <section className="ui-resumo__bloco" aria-labelledby="resumo-edicao">
              <h2 className="ui-resumo__rotulo" id="resumo-edicao">{extra.edicao ? 'Edição ' + extra.edicao.codigo : 'A edição'}</h2>
              <button type="button" className="ui-resumo__total" onClick={lista({ edicao: edCodigo })}>
                <span className="ui-resumo__n">{naEdicao.length}</span>
                <span className="ui-resumo__texto">{naEdicao.length === 1 ? 'marca na edição' : 'marcas na edição'}</span>
              </button>
              <ul className="ui-resumo__barras">
                {progresso.map((x) => {
                  const pct = naEdicao.length ? Math.round((x.n / naEdicao.length) * 100) : 0
                  return (
                    <li key={x.rotulo}>
                      <button type="button" className="ui-resumo__barra" onClick={x.ir}>
                        <span className="ui-resumo__linha"><span>{x.rotulo}</span><b>{x.n} de {naEdicao.length}</b></span>
                        <span className="ui-resumo__trilho" role="progressbar" aria-label={x.rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                          <span style={{ width: pct + '%' }} />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="ui-resumo__bloco" aria-labelledby="resumo-acoes">
              <h2 className="ui-resumo__rotulo" id="resumo-acoes">Para resolver</h2>
              {abertas.length === 0
                ? <p className="ui-resumo__ok"><Icone nome="ok-circulo" tamanho={20} /> Tudo em dia.</p>
                : (
                  <ul className="ui-resumo__acoes">
                    {abertas.map((x) => (
                      <li key={x.rotulo}>
                        <button type="button" className="ui-resumo__acao" onClick={x.ir}>
                          <span className="ui-resumo__n ui-resumo__n--acao">{x.n}</span>
                          <span className="ui-resumo__texto">{x.n === 1 ? x.um : x.rotulo}</span>
                          <Icone nome="avancar" tamanho={16} className="ui-resumo__ir" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              {abertas.length > 0 && emDia.length > 0 && (
                <p className="ui-resumo__emdia"><b>Em dia:</b> {emDia.map((x) => x.rotulo).join(' · ')}</p>
              )}
            </section>
          </div>

          <Secao titulo="Precisa de atenção" nota={avisosNaoLidos ? avisosNaoLidos + (avisosNaoLidos === 1 ? ' aviso não lido no sino' : ' avisos não lidos no sino') : 'Pendências tiradas dos dados de agora'} className="ui-area-atencao">
            {extra.falhas.length > 0 && <Erro texto={'Faltou ler ' + extra.falhas.join(', ') + '. O que aparece aqui pode estar incompleto.'} onTentar={tentarDeNovo} />}
            {pendencias.length === 0 && conversasNovas.length === 0 && prazosProximos.length === 0 && conflitosTema.length === 0
              ? (extra.falhas.length ? null : <p className="ui-nota">Nada pendente agora.</p>)
              : (
                <ul className="ui-atencao">
                  {prazosProximos.map((i) => (
                    <li key={'prazo:' + i.id}>
                      <button type="button" className="ui-atencao__item" data-tipo="agenda" onClick={() => navegar({ vista: 'edicao', aba: 'configuracao' })}>
                        <b>{i.titulo}</b>: {textoPrazo(i, hoje)}
                      </button>
                    </li>
                  ))}
                  {conflitosTema.map((g) => (
                    <li key={'tema:' + g.chave}>
                      <button type="button" className="ui-atencao__item" data-tipo="alerta" onClick={() => navegar({ vista: 'participantes', aba: 'temas' })}>
                        Tema <b>{g.tema}</b> pedido por {g.itens.length} marcas: decidir
                      </button>
                    </li>
                  ))}
                  {conversasNovas.map((c) => (
                    <li key={'msg:' + c.participante_id}>
                      <button type="button" className="ui-atencao__item" data-tipo="mensagem" onClick={() => abrirLink('marcas/' + c.participante_id + '/mensagens')}>
                        <b>{c.nome_marca}</b> enviou {Number(c.nao_lidas) === 1 ? 'uma mensagem' : c.nao_lidas + ' mensagens'}: "{c.ultima_trecho}"
                      </button>
                    </li>
                  ))}
                  {pendencias.map((p, i) => (
                    <li key={i}>
                      <button type="button" className="ui-atencao__item" data-tipo={p.tipo} onClick={() => navegar(p.rota)}>{p.texto}</button>
                    </li>
                  ))}
                </ul>
              )}
          </Secao>

          {pode && <ResumoRedes navegar={navegar} pode={pode} className="ui-area-redes" />}

          <Secao titulo="Atividade recente" nota="Quem fez o quê, por último" className="ui-area-atividade">
            {extra.atividade === null && <Carregando linhas={3} />}
            {extra.atividade && extra.atividade.length === 0 && (extra.falhas.includes('a atividade recente')
              ? <Erro texto="A atividade recente não carregou." onTentar={tentarDeNovo} />
              : <p className="ui-nota">Nenhuma ação registrada ainda.</p>)}
            {extra.atividade && extra.atividade.length > 0 && (
              <Atividade linhas={extra.atividade} onAbrirMarca={(id) => abrirLink('marcas/' + id)} />
            )}
          </Secao>

          <Secao titulo="A esteira" nota="Do formulário do site até o combo fechado" className="ui-area-esteira">
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
          </Secao>

        </div>
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
                const url = publico ? window.location.origin + o.form : ''
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
