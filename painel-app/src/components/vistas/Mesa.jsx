import React from 'react'
import { agruparTemas, textoPrazo, diasAte, dataDoItem } from '../../lib/operacao'
import { chaveDia } from '../../lib/hoje'
import { rpc } from '../../lib/rpc'
import { ORIGENS } from '../../lib/respostas'
import { ETAPAS, colunasMesa } from '../../lib/mesa'
import { notificacoesOrg } from '../../lib/notificacoes'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { VistaCabeca } from '../VistaCabeca'
import { Atividade } from '../Atividade'
import { AvisosAparelho } from '../AvisosAparelho'
import { Carregando, Erro, Secao } from '../ui'
import { ICONE } from '../PainelShell'

/*
 * A mesa — o painel inicial da organização. Responde "o que precisa de mim
 * agora?": números do dia, a lista do que pede ação (cada item leva ao lugar
 * certo), a esteira por etapa e o que a equipe fez por último.
 *
 * Só LEITURA e navegação: nenhum cartão escreve nada. Quem muda status é a
 * ficha (Respostas/Marcas), com a permissão de cada ação.
 */
const ICONE_ETAPA = {
  novas: <><path d="M7.4 4.6h17.2a2 2 0 0 1 2 2v18.8a2 2 0 0 1-2 2H7.4a2 2 0 0 1-2-2V6.6a2 2 0 0 1 2-2Z" /><path d="M10.6 11.4h10.8M10.6 16h10.8M10.6 20.6h5.4" strokeWidth="2.4" /></>,
  analise: <><path d="M4.6 8.6h22.8a2 2 0 0 1 2 2v10.8a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2V10.6a2 2 0 0 1 2-2Z" /><circle cx="10" cy="16" r="2.2" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="2.2" fill="currentColor" stroke="none" /><circle cx="22" cy="16" r="2.2" fill="currentColor" stroke="none" /></>,
  contatadas: <><path d="M28.4 4.6 3.6 14.4l9.2 3.6 3.6 9.2Z" /><path d="M28.4 4.6 12.8 18" strokeWidth="2.4" /></>,
  aprovadas: <><circle cx="16" cy="16" r="12.2" strokeDasharray="0.1 6.2" /><path d="M10.8 16.4l4.2 4.2 6.6-8" /></>,
  acesso: <><path d="M6.6 11.4h18.8l-1.4 14a2.2 2.2 0 0 1-2.2 2H10.2a2.2 2.2 0 0 1-2.2-2Z" /><path d="M11.8 11.4V9a4.2 4.2 0 0 1 8.4 0v2.4" /></>,
  completas: <><circle cx="16" cy="16" r="11.8" /><path fill="currentColor" stroke="none" d="M16 8.2c1.4 4 3.6 6.2 7.6 7.6-4 1.4-6.2 3.6-7.6 7.6-1.4-4-3.6-6.2-7.6-7.6 4-1.4 6.2-3.6 7.6-7.6Z" /></>,
}
const ICONE_COMBO = [
  <><path d="M7 13.4a9 9 0 0 1 18 0Z" /><path d="M7.8 13.4h16.4l-2 11.6a2.2 2.2 0 0 1-2.2 1.8h-8a2.2 2.2 0 0 1-2.2-1.8Z" /></>,
  <><circle cx="11.4" cy="18.4" r="7.6" /><circle cx="22.4" cy="12" r="6.4" /></>,
  <><path d="M6 12h13.6v4.4a6.8 6.8 0 0 1-13.6 0Z" /><path d="M19.6 13.8h2.2a2.8 2.8 0 0 1 0 5.6h-2.2" /><path d="M4.4 27.8h17.2" /></>,
]
const ROTULO_COMBO = ['doce', 'salgado', 'bebida']

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

export function Mesa({ registrarAtualizar, abrirLink, irPara, avisos = [] }) {
  const [candidaturas, setCandidaturas] = React.useState(null) // null = carregando
  const [participantes, setParticipantes] = React.useState([])
  const [extra, setExtra] = React.useState({ dados: {}, solicitacoes: [], sessoes: [], conversas: [], atividade: null, revisao: [], temas: [], edicao: null })
  const [erro, setErro] = React.useState(null)
  const [copiado, setCopiado] = React.useState(null)

  const carregar = React.useCallback(async () => {
    setErro(null)
    const senha = lerSenha()
    try {
      const [valida, lista] = await Promise.all([
        rpc('admin_ping', { p_secret: senha }),
        rpc(ORIGENS.quero_participar.rpc, { p_secret: senha }),
      ])
      if (valida !== true) { setErro('A senha desta sessão não vale mais. Saia e entre de novo.'); return }
      setCandidaturas(lista || [])
    } catch (e) {
      setErro(e.message)
      return
    }
    // Carga apartada e que NÃO derruba a mesa (CLAUDE.md §10.4-b): cada
    // leitura extra tem o próprio catch.
    try {
      setParticipantes((await rpc('get_participantes', { p_secret: senha })) || [])
    } catch {
      setParticipantes([])
    }
    const pegar = (nome, corpo) => rpc(nome, { p_secret: senha, ...corpo }).catch(() => null)
    const [apoiar, contato, solicitacoes, sessoes, conversas, atividade, revisao, temas, edicoes] = await Promise.all([
      pegar(ORIGENS.apoiar.rpc), pegar(ORIGENS.contato.rpc),
      pegar('get_solicitacoes_admin'), pegar('get_sessoes_fotos'),
      pegar('get_conversas'), pegar('get_atividade', { p_limite: 12 }),
      pegar('get_revisao', { p_status: 'aberta' }), pegar('get_temas'), pegar('get_edicoes'),
    ])
    setExtra({
      dados: { apoiar: apoiar || [], contato: contato || [] },
      solicitacoes: solicitacoes || [], sessoes: sessoes || [], conversas: conversas || [],
      atividade: atividade || [], revisao: revisao || [], temas: temas || [],
      edicao: (edicoes || []).find((e) => e.atual) || null,
    })
  }, [])

  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])

  const colunas = candidaturas ? colunasMesa({ candidaturas, participantes }) : ETAPAS.map((e) => ({ ...e, itens: [] }))

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
  const naEdicao = participantes.filter((p) => extra.edicao && p.edicao_codigo === extra.edicao.codigo)

  const numeros = [
    { rotulo: 'candidaturas novas', n: (candidaturas || []).filter((r) => r.status === 'novo').length, ir: () => irPara('respostas') },
    { rotulo: 'marcas na edição', n: naEdicao.length, ir: () => irPara('participantes') },
    { rotulo: 'com acesso ao painel', n: naEdicao.filter((p) => p.user_id).length, ir: () => irPara('participantes') },
    { rotulo: 'dados para revisar', n: extra.revisao.length, ir: () => irPara('edicao', { vista: 'edicao', sub: 'revisao' }) },
    { rotulo: 'cadastros completos', n: participantes.filter((p) => p.status_cadastro === 'cadastro_completo').length, ir: () => irPara('participantes') },
    { rotulo: 'mensagens não lidas', n: conversasNovas.reduce((s, c) => s + Number(c.nao_lidas || 0), 0), ir: () => irPara('participantes') },
    { rotulo: 'respostas de pedido faltando', n: extra.solicitacoes.filter((s) => s.publicada_em).reduce((s, x) => s + Number(x.pendentes || 0), 0), ir: () => irPara('producao') },
  ]

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
    <section className="og-vista">
      <VistaCabeca acento="amarelo" icone={ICONE.mesa} titulo="A mesa" nota="O que precisa de atenção, e onde cada marca está" />

      {erro && <Erro texto={erro} onTentar={carregar} />}
      {!erro && candidaturas === null && <Carregando linhas={3} />}

      {!erro && candidaturas && (
        <div className="ui-grade-painel">
          <ul className="ui-numeros" aria-label="Resumo">
            {numeros.map((x) => (
              <li key={x.rotulo}>
                <button type="button" className="ui-numero" onClick={x.ir}>
                  <span className="ui-numero__n">{x.n}</span>
                  <span className="ui-numero__rotulo">{x.rotulo}</span>
                </button>
              </li>
            ))}
          </ul>

          <Secao titulo="Precisa de atenção" nota={avisosNaoLidos ? avisosNaoLidos + (avisosNaoLidos === 1 ? ' aviso não lido no sino' : ' avisos não lidos no sino') : 'Pendências tiradas dos dados de agora'} className="ui-area-atencao">
            {pendencias.length === 0 && conversasNovas.length === 0 && prazosProximos.length === 0 && conflitosTema.length === 0
              ? <p className="ui-nota">Nada pendente agora.</p>
              : (
                <ul className="ui-atencao">
                  {prazosProximos.map((i) => (
                    <li key={'prazo:' + i.id}>
                      <button type="button" className="ui-atencao__item" data-tipo="agenda" onClick={() => irPara('edicao', { vista: 'edicao', sub: 'configuracao' })}>
                        <b>{i.titulo}</b>: {textoPrazo(i, hoje)}
                      </button>
                    </li>
                  ))}
                  {conflitosTema.map((g) => (
                    <li key={'tema:' + g.chave}>
                      <button type="button" className="ui-atencao__item" data-tipo="alerta" onClick={() => irPara('edicao', { vista: 'edicao', sub: 'temas' })}>
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
                      <button type="button" className="ui-atencao__item" data-tipo={p.tipo} onClick={() => irPara(p.vista)}>{p.texto}</button>
                    </li>
                  ))}
                </ul>
              )}
            <AvisosAparelho
              compacto
              explicacao="Receba estes avisos no celular ou no computador, mesmo com o painel fechado."
              registrar={(a) => rpc('registrar_push_organizacao', { p_secret: lerSenha(), p_endpoint: a.endpoint, p_p256dh: a.p256dh, p_auth: a.auth, p_user_agent: a.userAgent })}
              remover={(endpoint) => rpc('remover_push_organizacao', { p_secret: lerSenha(), p_endpoint: endpoint })}
            />
          </Secao>

          <Secao titulo="Atividade recente" nota="Quem fez o quê, por último" className="ui-area-atividade">
            {extra.atividade === null && <Carregando linhas={3} />}
            {extra.atividade && extra.atividade.length === 0 && <p className="ui-nota">Nenhuma ação registrada ainda.</p>}
            {extra.atividade && extra.atividade.length > 0 && (
              <Atividade linhas={extra.atividade} onAbrirMarca={(id) => abrirLink('marcas/' + id)} />
            )}
          </Secao>

          <Secao titulo="A esteira" nota="Do formulário do site até o combo fechado" className="ui-area-esteira">
            <div className="og-mesa">
              {colunas.map((e) => (
                <div className="og-mesa__col" key={e.chave}>
                  <div className="og-mesa__cabeca">
                    <span className="og-mesa__disco" style={{ background: e.cor, color: e.tinta }} aria-hidden="true">
                      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{ICONE_ETAPA[e.chave]}</svg>
                    </span>
                    <span>
                      <span className="og-mesa__nome">{e.nome}</span>
                      <span className="og-mesa__legenda">{e.legenda}</span>
                    </span>
                    <span className="og-mesa__n">{e.itens.length}</span>
                  </div>
                  {e.itens.length === 0 ? (
                    <p className="og-mesa__vazio">Ninguém aqui</p>
                  ) : (
                    e.itens.map((it) => {
                      const chave = it.tipo === 'marca' ? 'marca:' + it.participacaoId + ':' + it.participanteId : 'cand:' + it.id
                      // Navegação, não escrita: abre a ficha certa (candidatura
                      // em Respostas, conta em Marcas).
                      const destino = it.tipo === 'marca' ? 'marcas/' + it.participanteId : 'respostas/quero_participar/' + it.id
                      return (
                        <button type="button" className="og-cartao" key={chave} onClick={() => abrirLink(destino)}>
                          <span className="og-cartao__topo">
                            <b className="og-cartao__nome">{it.nome || '(sem nome)'}</b>
                            {it.novo && <span className="og-selo" data-novo="1">nova</span>}
                          </span>
                          <span className="og-cartao__meta">{it.meta || ''}</span>
                          {it.tipo === 'marca' && (
                            <span className="og-cartao__combo">
                              <span className="ui-oculto">{it.itensProntos} de 3 itens do combo prontos</span>
                              {[0, 1, 2].map((i) => (
                                <span key={i} title={ROTULO_COMBO[i]} className={i < it.itensProntos ? 'is-pronto' : ''}>
                                  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONE_COMBO[i]}</svg>
                                </span>
                              ))}
                            </span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              ))}
            </div>
          </Secao>

          <Secao titulo="Os formulários" nota="Onde cada resposta nasce" className="ui-area-forms">
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
        </div>
      )}
    </section>
  )
}
