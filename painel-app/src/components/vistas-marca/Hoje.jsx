import React from 'react'
import { api } from '../../lib/marcaApi'
import { blocosPendentes, chaveDia, proximosPassos } from '../../lib/hoje'
import { minhasSolicitacoes } from '../../lib/pedidosMarca'
import { dataHoraExtensa, tempoRelativo, rotuloStatus } from '../../lib/central'
import { VistaCabeca } from '../VistaCabeca'
import { AvisosAparelho } from '../AvisosAparelho'
import { Carregando, Erro, Secao } from '../ui'
import { ICONE_MARCA } from '../PainelMarcaShell'

/*
 * Hoje (marca) — a tela de entrada. Em um olhar: o que já foi feito, o que
 * falta, o que é urgente, se a organização escreveu, quando são as fotos. Cada
 * passo leva ao lugar exato. Embaixo, a venda do dia.
 */
export function Hoje({ irPara, abrirLink, contadores = {}, avisos = [] }) {
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

  const hoje = chaveDia(new Date())
  const deHoje = vendas.find((v) => v.dia === hoje)

  const carregar = React.useCallback(async () => {
    setEstado('carregando')
    try {
      const participantes = await api('participantes?select=*&order=created_at.desc')
      const participante = participantes && participantes[0]
      if (!participante) { setEstado('sem-marca'); return }
      setMarca(participante)
      const participacoes = await api('participacoes?select=*&order=created_at.desc&limit=1')
      const pa = (participacoes && participacoes[0]) || null
      setParticipacao(pa)
      if (!pa) { setEstado('sem-participacao'); return }
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
  const { passos, feitos } = proximosPassos({
    semParticipacao: estado === 'sem-participacao',
    faltam, statusCadastro: participacao ? participacao.status_cadastro : '',
    pedidosPendentes: pedidos.pendentes, prazoMaisProximo: pedidos.prazo,
    msgsNaoLidas: contadores.mensagens || 0,
    sessao: minhaSessao, vagasAbertas: minhaSessao ? 0 : vagas, arquivosParaLer,
  })
  const total = vendas.reduce((s, v) => s + Number(v.quantidade || 0), 0)
  const ultimosAvisos = avisos.slice(0, 4)

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
            {feitos.length > 0 && (
              <ul className="ui-feitos" aria-label="Já feito">
                {feitos.map((f) => <li key={f.chave}>{f.texto}</li>)}
              </ul>
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

          <Secao titulo="Últimos avisos" className="ui-area-atividade">
            {ultimosAvisos.length === 0
              ? <p className="ui-nota">Nenhum aviso ainda.</p>
              : (
                <ul className="ui-lista-simples">
                  {ultimosAvisos.map((n) => (
                    <li key={n.id}>
                      <button type="button" className="og-link" onClick={() => n.link && abrirLink(n.link)}>{n.titulo}</button>
                      <span className="ui-nota">{tempoRelativo(n.criada_em)}{n.lida_em ? '' : ' · novo'}</span>
                    </li>
                  ))}
                </ul>
              )}
          </Secao>

          {estado === 'pronto' && (
            <Secao titulo="Combos vendidos" nota={deHoje ? 'Lançado. Dá para corrigir quantas vezes precisar.' : 'Lance no fim do expediente. A organização soma tudo para o balanço da edição.'} className="ui-area-esteira">
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
                  <div className="mc-venda__dias">
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
        </div>
      )}
    </section>
  )
}
