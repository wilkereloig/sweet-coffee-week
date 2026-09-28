import React from 'react'
import { api } from '../../lib/marcaApi'
import { blocosPendentes, chaveDia, proximosPassos } from '../../lib/hoje'
import { minhasSolicitacoes } from '../../lib/pedidosMarca'
import { dataHoraExtensa, rotuloStatus } from '../../lib/central'
import { VistaCabeca } from '../VistaCabeca'
import { AvisosAparelho } from '../AvisosAparelho'
import { Carregando, Erro, Secao } from '../ui'
import { ICONE_MARCA } from '../PainelMarcaShell'
import { momentoEdicao, resumoTrajetoria, proximosDoCronograma, textoPrazo, itemDoCronograma, dataDoItem } from '../../lib/operacao'

const dataBr = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '')

/*
 * Hoje (marca) — a tela de entrada. Primeiro o próximo passo (cada um leva ao
 * lugar exato); no festival, a venda do dia logo abaixo. O resto — cronograma,
 * história, o que já foi feito — é consulta e fica depois ou recolhido.
 */
export function Hoje({ irPara, abrirLink, contadores = {}, alvo, consumirAlvo }) {
  const [estado, setEstado] = React.useState('carregando') // carregando | sem-marca | sem-participacao | pronto | erro
  const [marca, setMarca] = React.useState(null)
  const [participacao, setParticipacao] = React.useState(null)
  const [vendas, setVendas] = React.useState([])
  const [faltam, setFaltam] = React.useState([])
  const [pedidos, setPedidos] = React.useState({ pendentes: 0, prazo: null })
  const [sessoes, setSessoes] = React.useState([])
  const [arquivosParaLer, setArquivosParaLer] = React.useState(0)
  const [qtd, setQtd] = React.useState('')
  const [salvando, setSalvando] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  // Edição como configuração: datas e cronograma vêm do banco.
  const [edicao, setEdicao] = React.useState(null)
  const [cronograma, setCronograma] = React.useState([])
  const [tema, setTema] = React.useState(null)
  const [historia, setHistoria] = React.useState(null)

  const hoje = chaveDia(new Date())
  const deHoje = vendas.find((v) => v.dia === hoje)

  const carregar = React.useCallback(async () => {
    setEstado('carregando')
    try {
      const participantes = await api('participantes?select=*&order=created_at.desc')
      const participante = participantes && participantes[0]
      if (!participante) { setEstado('sem-marca'); return }
      setMarca(participante)
      // A história é só a CONFIRMADA pela organização (o banco decide).
      api('rpc/marca_minha_historia', { metodo: 'POST', corpo: {} }).then(setHistoria).catch(() => setHistoria(null))
      const participacoes = await api('participacoes?select=*&order=created_at.desc&limit=1')
      const pa = (participacoes && participacoes[0]) || null
      setParticipacao(pa)
      if (!pa) { setEstado('sem-participacao'); return }
      const ed = encodeURIComponent(pa.edicao_codigo)
      const [eds, crono, temas] = await Promise.all([
        api('edicoes?select=*&codigo=eq.' + ed).catch(() => []),
        api('edicao_cronograma?select=*&edicao_codigo=eq.' + ed + '&order=ordem').catch(() => []),
        api('temas_propostos?select=*&participacao_id=eq.' + pa.id + '&status=neq.substituido&order=created_at.desc&limit=1').catch(() => []),
      ])
      setEdicao((eds && eds[0]) || null)
      setCronograma(crono || [])
      setTema((temas && temas[0]) || null)
      const [itens, unidades, vendasLinhas, solics, estados, sess, arqs, leituras] = await Promise.all([
        api('participantes_itens?select=*&participacao_id=eq.' + pa.id),
        api('participacao_unidades?select=*&participacao_id=eq.' + pa.id),
        api('vendas_diarias?select=*&participacao_id=eq.' + pa.id + '&order=dia.desc'),
        api('solicitacoes?select=id,titulo,prazo_em,escopo,edicao_codigo').catch(() => []),
        api('solicitacao_estado?select=solicitacao_id,estado&participacao_id=eq.' + pa.id).catch(() => []),
        api('sessoes_fotos?select=*&order=data_hora.asc').catch(() => []),
        api('arquivos?select=id,exige_leitura').catch(() => []),
        api('arquivo_leitura?select=arquivo_id').catch(() => []),
      ])
      setVendas(vendasLinhas || [])
      setFaltam(blocosPendentes({ participante, participacao: pa, itens: itens || [], unidades: unidades || [] }))
      const feitos = new Set((estados || []).filter((e) => e.estado === 'respondido').map((e) => e.solicitacao_id))
      const abertos = minhasSolicitacoes(solics || [], pa).filter((s) => !feitos.has(s.id))
      const prazos = abertos.map((s) => s.prazo_em).filter(Boolean).sort()
      setPedidos({ pendentes: abertos.length, prazo: prazos[0] || null })
      setSessoes(sess || [])
      const lidos = new Set((leituras || []).map((l) => l.arquivo_id))
      setArquivosParaLer((arqs || []).filter((a) => a.exige_leitura && !lidos.has(a.id)).length)
      setEstado('pronto')
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setEstado('erro')
    }
  }, [])

  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { setQtd(deHoje ? String(deHoje.quantidade) : '') }, [deHoje])
  // Aviso "registre as vendas de hoje" ou passo da lista: rola até a venda.
  React.useEffect(() => {
    if (!alvo) return
    if (alvo.id === 'venda' && estado === 'pronto') {
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
      // Outro aparelho lançou primeiro (UNIQUE do dia): recarrega em vez de erro genérico.
      if (/duplicate|unique|23505/i.test(e.message || '')) { await carregar(); setErro('Já havia um número lançado hoje em outro aparelho. Confira e atualize.'); return }
      setErro('Não deu para lançar agora. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  const minhaSessao = sessoes.find((s) => s.participante_id && s.status !== 'cancelada') || null
  const vagas = sessoes.filter((s) => s.status === 'aberto').length
  const momento = momentoEdicao(edicao, hoje)
  const prazoComboItem = itemDoCronograma(cronograma, 'combo', hoje)
  const { passos, feitos } = proximosPassos({
    semParticipacao: estado === 'sem-participacao',
    faltam, statusCadastro: participacao ? participacao.status_cadastro : '',
    pedidosPendentes: pedidos.pendentes, prazoMaisProximo: pedidos.prazo,
    msgsNaoLidas: contadores.mensagens || 0,
    sessao: minhaSessao, vagasAbertas: minhaSessao ? 0 : vagas, arquivosParaLer,
    momento, vendaHojeRegistrada: !!deHoje,
    tema: tema ? { status: tema.status, tema: tema.tema, observacao: tema.observacao } : null,
    combo: participacao ? { status: participacao.combo_status, nota: participacao.combo_revisao_nota } : null,
    fotoLiberacao: participacao ? participacao.foto_liberacao : null,
    prazoCombo: prazoComboItem ? dataDoItem(prazoComboItem) : null,
  })
  const trajetoria = resumoTrajetoria(historia)
  const proximos = proximosDoCronograma(cronograma, hoje, 5)
  const total = vendas.reduce((s, v) => s + Number(v.quantidade || 0), 0)

  return (
    <section className="ui-vista-marca">
      <VistaCabeca
        acento="amarelo" viewBox="0 0 32 32" strokeWidth={2.2} icone={ICONE_MARCA.hoje}
        titulo={marca ? 'Olá, ' + marca.nome_marca : 'Hoje'}
        nota={participacao ? 'Edição ' + participacao.edicao_codigo + ' · ' + rotuloStatus(participacao.status_cadastro) : 'O que já foi feito e o que vem agora'}
      />

      {estado === 'carregando' && <Carregando linhas={3} texto="Carregando o seu dia…" />}
      {estado === 'erro' && <Erro texto="Não deu para carregar agora." onTentar={carregar} />}
      {estado === 'sem-marca' && <Erro titulo="Conta sem marca" texto="Sua conta existe, mas ainda não há marca ligada a ela. Fale com a organização pelo WhatsApp." />}

      {(estado === 'pronto' || estado === 'sem-participacao') && marca && (
        // Contexto em uma ou duas linhas, sem título próprio: o título da tela
        // já é a VistaCabeca (desktop) ou a barra fixa (celular).
        <div className="ui-boasvindas">
          {trajetoria.tipo === 'recorrente' && (
            <p className="ui-boasvindas__linha">
              Bem-vindo de volta: {trajetoria.participacoes} participações no Sweet &amp; Coffee Week
              {trajetoria.desde ? ', desde ' + trajetoria.desde + ' (' + trajetoria.desdeCodigo + ')' : ''}
              {trajetoria.premios ? ', ' + trajetoria.premios + (trajetoria.premios === 1 ? ' pódio' : ' pódios') + ' no Sweet Awards' : ''}.
            </p>
          )}
          {trajetoria.tipo === 'primeira' && (
            <p className="ui-boasvindas__linha">Esta é a sua primeira edição no Sweet &amp; Coffee Week. Comece pelo primeiro passo abaixo.</p>
          )}
          {edicao && momento !== 'indefinido' && (
            <p className="ui-boasvindas__linha">
              {momento === 'antes' && edicao.nome + ': o festival começa em ' + dataBr(edicao.festival_inicio) + '.'}
              {momento === 'durante' && edicao.nome + ': o festival está acontecendo, até ' + dataBr(edicao.festival_fim) + '.'}
              {momento === 'depois' && edicao.nome + ': o festival terminou. Obrigado por fazer parte.'}
            </p>
          )}
        </div>
      )}

      {/* Ordem = prioridade: o próximo passo; no festival, a venda do dia (o
          gesto diário); depois o cronograma e a história. No desktop o
          cronograma vai para a coluna da direita. Avisos ficam no sino. */}
      {(estado === 'pronto' || estado === 'sem-participacao') && (
        <div className="ui-grade-painel ui-grade-painel--marca">
          <Secao titulo="Próximos passos" className="ui-area-atencao">
            {passos.length === 0
              ? <p className="ui-nota">Nada pendente agora. Quando a organização pedir algo ou escrever, chega um aviso.</p>
              : (
                <ol className="ui-passos">
                  {passos.map((p) => (
                    <li key={p.chave}>
                      {p.destino
                        ? (
                          <button type="button" className="ui-passo" data-tom={p.tom} onClick={() => (p.destino.includes('/') ? abrirLink(p.destino) : irPara(p.destino))}>
                            <span className="ui-passo__texto">{p.texto}</span>
                            {p.detalhe && <span className="ui-passo__detalhe">{p.detalhe}</span>}
                            {p.quando && <span className="ui-passo__detalhe">{dataHoraExtensa(p.quando)}{p.local ? ' · ' + p.local : ''}</span>}
                            <span className="ui-passo__ir" aria-hidden="true">→</span>
                          </button>
                        )
                        : (
                          <div className="ui-passo" data-tom={p.tom}>
                            <span className="ui-passo__texto">{p.texto}</span>
                            {p.detalhe && <span className="ui-passo__detalhe">{p.detalhe}</span>}
                          </div>
                        )}
                    </li>
                  ))}
                </ol>
              )}
            {/* O que já foi feito é consulta, não tarefa: fica recolhido. */}
            {feitos.length > 0 && (
              <details className="ui-recolhe">
                <summary>Já feito ({feitos.length})</summary>
                <ul className="ui-feitos">
                  {feitos.map((f) => <li key={f.chave}>{f.texto}</li>)}
                </ul>
              </details>
            )}
            <AvisosAparelho
              compacto
              explicacao="Quer saber na hora quando a organização escrever ou pedir algo? Ligue os avisos neste aparelho."
              registrar={async (a) => {
                await api('push_subscriptions?endpoint=eq.' + encodeURIComponent(a.endpoint), { metodo: 'DELETE' }).catch(() => null)
                await api('push_subscriptions', { metodo: 'POST', prefer: 'return=minimal', corpo: { papel: 'marca', participante_id: marca && marca.id, endpoint: a.endpoint, p256dh: a.p256dh, auth_chave: a.auth, user_agent: a.userAgent } })
              }}
              remover={(endpoint) => api('push_subscriptions?endpoint=eq.' + encodeURIComponent(endpoint), { metodo: 'DELETE' })}
            />
          </Secao>

          {estado === 'pronto' && momento !== 'antes' && (
            <Secao id="venda-do-dia" titulo="Combos vendidos" nota={deHoje ? 'Lançado. Dá para corrigir quantas vezes precisar.' : 'Lance no fim do expediente. A organização soma tudo para o balanço da edição.'} className="ui-area-esteira">
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

          {proximos.length > 0 && (
            <Secao
              titulo="Cronograma da edição"
              className="ui-area-atividade"
              nota={estado === 'pronto' && momento === 'antes'
                ? 'O registro diário de combos vendidos abre aqui no primeiro dia do festival. As datas vêm da organização e podem mudar.'
                : 'As datas vêm da organização e podem mudar — o painel acompanha.'}
            >
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
            <Secao titulo="Minha história no Sweet & Coffee Week" nota="Registrada pela organização a partir do acervo do festival." className="ui-area-historia">
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
