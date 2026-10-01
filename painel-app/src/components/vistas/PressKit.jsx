import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { rotulo } from '../../lib/status'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { FichaContato, erroContato } from './Contatos'
import { Carregando, Vazio, Erro, Secao, Selo, Ajuda, Escolha } from '../ui'

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

// A ordem do trabalho: da sugestão à entrega. Cada status tem o PRÓXIMO passo.
const ORDEM = ['constou_na_lista', 'selecionado', 'confirmado', 'enviado', 'entregue', 'nao_entregue', 'cancelado']
const PROXIMO = {
  constou_na_lista: ['selecionado', 'Selecionar'],
  selecionado: ['confirmado', 'Preparar'],
  confirmado: ['enviado', 'Saiu para entrega'],
  enviado: ['entregue', 'Entregue'],
  nao_entregue: ['enviado', 'Reenviar'],
}

/*
 * Contatos › Press Kit (reestruturação 29/09/2026, etapa 5): a lista desta
 * edição, por situação, e as sugestões — quem já recebeu em edições
 * anteriores e ainda não está na lista. O histórico nunca decide sozinho.
 */
export function PressKit({ registrarAtualizar, pode, rota, navegar }) {
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [situacao, setSituacao] = React.useState('ativos')
  const podeMudar = pode('relacionamento.gerir')
  const aberto = rota.filtros.item || null

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      const l = await rpc('get_contatos', { p_secret: lerSenha() })
      if (l == null) throw new Error('nao_autorizado')
      setLista(l)
    } catch (e) { setErro(e.message) }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])

  async function mudar(c, status) {
    setAviso(null)
    try { await rpc('definir_presskit', { p_secret: lerSenha(), p_contato: c.id, p_status: status, p_dados: {} }); await carregar() }
    catch (e) { setAviso(erroContato(e.message)) }
  }

  if (erro) return <Erro texto={erro} onTentar={carregar} />
  if (!lista) return <Carregando />
  const naLista = lista.filter((c) => c.atual)
  const contar = (s) => naLista.filter((c) => c.atual.status === s).length
  const visiveis = naLista
    .filter((c) => situacao === 'todos' || (situacao === 'ativos' ? !['cancelado'].includes(c.atual.status) : c.atual.status === situacao))
    .sort((a, b) => ORDEM.indexOf(a.atual.status) - ORDEM.indexOf(b.atual.status) || a.nome.localeCompare(b.nome, 'pt-BR'))
  const sugestoes = lista.filter((c) => !c.atual && Number(c.recebimentos) > 0 && c.ativo !== false)

  return (
    <div className="og-embutida">
      <ul className="ui-numeros" aria-label="Resumo do Press Kit">
        {[['selecionado', 'selecionados'], ['confirmado', 'preparando'], ['enviado', 'enviados'], ['entregue', 'entregues'], ['nao_entregue', 'não entregues']].map(([s, r]) => (
          <li key={s}><button type="button" className="ui-numero" onClick={() => setSituacao(s)}><span className="ui-numero__n">{contar(s)}</span><span className="ui-numero__rotulo">{r}</span></button></li>
        ))}
      </ul>
      <Ajuda titulo="Como a lista funciona">
        <p>Sugerido → Selecionado → Preparando (endereço confirmado) → Enviado → Entregue. Abra a pessoa para registrar endereço, responsável pelo envio, datas e o que vai no kit.</p>
        <p>As sugestões abaixo são de quem recebeu em edições anteriores. Ninguém entra na lista sozinho.</p>
      </Ajuda>
      <Escolha rotulo="Situação" valor={situacao} onMudar={setSituacao}
        opcoes={[['ativos', 'Na lista'], ...ORDEM.map((s) => [s, rotulo('presskit', s)]), ['todos', 'Todos']]
          .map(([v, r]) => [v, r + (ORDEM.includes(v) ? ' (' + contar(v) + ')' : '')])} />
      {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}

      <Secao titulo="Lista desta edição" nota={naLista.length + (naLista.length === 1 ? ' pessoa' : ' pessoas')}>
        {visiveis.length === 0 && <Vazio titulo="Ninguém aqui">Selecione pessoas pela ficha (Contatos › Pessoas) ou pelas sugestões abaixo.</Vazio>}
        {visiveis.length > 0 && (
          <ul className="og-lista">{visiveis.map((c) => {
            const a = c.atual
            const prox = PROXIMO[a.status]
            return (
              <li key={c.id}>
                <div className="og-item og-item--info">
                  <span className="og-item__cor" data-tipo={c.tipo} aria-hidden="true" />
                  <button type="button" className="og-item__nome og-link" onClick={() => navegar({ filtros: { item: c.id } })}>{c.nome}</button>
                  <p className="og-item__meta">{[c.instagram, a.endereco_confirmado || c.endereco || 'sem endereço', a.responsavel_envio && 'envio: ' + a.responsavel_envio, a.data && 'enviado ' + dataCurta(a.data), a.recebido_em && 'recebido ' + dataCurta(a.recebido_em)].filter(Boolean).join(' · ')}</p>
                  <span className="og-item__dir">
                    <Selo dominio="presskit" valor={a.status} />
                    {podeMudar && prox && <button className="og-btn og-btn--mini" type="button" onClick={() => mudar(c, prox[0])}>{prox[1]}</button>}
                    {podeMudar && a.status === 'enviado' && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => mudar(c, 'nao_entregue')}>Não entregue</button>}
                  </span>
                </div>
              </li>
            )
          })}</ul>
        )}
      </Secao>

      <Secao titulo="Sugestões" nota="Receberam em edições anteriores e ainda não estão na lista">
        {sugestoes.length === 0 && <p className="ui-nota">Nenhuma sugestão agora.</p>}
        {sugestoes.length > 0 && (
          <ul className="og-lista">{sugestoes.map((c) => (
            <li key={c.id}>
              <div className="og-item og-item--info">
                <span className="og-item__cor" data-tipo={c.tipo} aria-hidden="true" />
                <button type="button" className="og-item__nome og-link" onClick={() => navegar({ filtros: { item: c.id } })}>{c.nome}</button>
                <p className="og-item__meta">{[c.instagram, c.recebimentos + (Number(c.recebimentos) === 1 ? ' Press Kit' : ' Press Kits'), c.ultima_edicao && 'último ' + c.ultima_edicao].filter(Boolean).join(' · ')}</p>
                <span className="og-item__dir">
                  {podeMudar && <button className="og-btn og-btn--mini" type="button" onClick={() => mudar(c, 'selecionado')}>Selecionar</button>}
                  {podeMudar && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => mudar(c, 'constou_na_lista')}>Sugerir</button>}
                </span>
              </div>
            </li>
          ))}</ul>
        )}
      </Secao>

      <FichaContato id={aberto} pode={pode} onFechar={() => navegar({ filtros: {} })} onMudou={carregar} />
    </div>
  )
}
