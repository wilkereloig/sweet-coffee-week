import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { rotulo } from '../../lib/status'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { FichaContato, erroContato } from './Contatos'
import { Carregando, Vazio, Erro, Secao, Selo, Ajuda, Escolha } from '../ui'
import { confirmar } from '../Confirmar'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { DOMINIOS_VISTAS } from '../../lib/syncFichas'
import { ORDEM, PROXIMO, ANTERIOR, RETIRADO, jaSaiu, estaNaLista, sugestoesDaLista, filtrarLista, contarSituacao } from '../../lib/presskit'

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

/*
 * Contatos › Press Kit (reestruturação 29/09/2026, etapa 5): a lista desta
 * edição, por situação, e as sugestões — quem já recebeu em edições
 * anteriores e ainda não está na lista. O histórico nunca decide sozinho.
 *
 * Tudo se desfaz (28/10/2026, pedido do Wilker): "Retirar da lista" é o status `cancelado` — o registro fica, a
 * pessoa sai da lista e dos contadores e volta por "Colocar de volta"; "Voltar para …" corrige um passo; e o
 * aviso depois de cada mudança traz "Desfazer". A lógica pura mora em lib/presskit.js.
 */
export function PressKit({ pode, rota, navegar }) {
  const guarda = useGuarda()
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [situacao, setSituacao] = React.useState('ativos')
  const podeMudar = pode('relacionamento.gerir')
  const aberto = rota.filtros.item || null

  // true = leu. A releitura SILENCIOSA (sinal de outra pessoa, reconexão, depois de uma ação) mantém a lista, a
  // situação escolhida e a ficha aberta; se falhar, a lista que estava na tela continua.
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guarda()
    if (!silencioso) setErro(null)
    try {
      const l = await rpc('get_contatos', { p_secret: lerSenha() })
      if (l == null) throw new Error('nao_autorizado')
      if (!vale()) return true
      setLista(l)
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!silencioso || /nao_autorizado/.test(e.message)) setErro(e.message)
      return false
    }
  }, [guarda])
  React.useEffect(() => { carregar() }, [carregar])
  useSincronizar(DOMINIOS_VISTAS.contatos, async () => { if (!(await carregar({ silencioso: true }))) throw new Error('presskit') })
  const tentarDeNovo = React.useCallback(() => carregar(), [carregar])

  // `ok` = o que a tela diz depois; `volta` = [contato, status anterior] quando dá para desfazer (o aviso ganha "Desfazer").
  async function mudar(c, status, { ok, volta } = {}) {
    setAviso(null)
    try {
      await rpc('definir_presskit', { p_secret: lerSenha(), p_contato: c.id, p_status: status, p_dados: {} })
      await carregar({ silencioso: true })
      if (ok) setAviso({ ok, volta })
    } catch (e) { setAviso(erroContato(e.message)) }
  }
  async function retirar(c) {
    const antes = c.atual.status
    if (jaSaiu(antes) && !await confirmar('Retirar ' + c.nome + ' da lista? O Press Kit já saiu para entrega. O registro fica guardado em “' + rotulo('presskit', RETIRADO) + '”, de onde dá para colocar de volta.', { perigo: true })) return
    await mudar(c, RETIRADO, { ok: c.nome + ' saiu da lista desta edição.', volta: [c, antes] })
  }
  const voltarPasso = (c) => mudar(c, ANTERIOR[c.atual.status], { ok: c.nome + ' voltou para “' + rotulo('presskit', ANTERIOR[c.atual.status]) + '”.', volta: [c, c.atual.status] })
  const colocarDeVolta = (c) => mudar(c, 'selecionado', { ok: c.nome + ' voltou para a lista (' + rotulo('presskit', 'selecionado') + ').', volta: [c, RETIRADO] })

  if (erro) return <Erro texto={erro} onTentar={tentarDeNovo} />
  if (!lista) return <Carregando />
  const contar = (s) => contarSituacao(lista, s)
  const naLista = lista.filter(estaNaLista).length
  const visiveis = filtrarLista(lista, situacao)
  const sugestoes = sugestoesDaLista(lista)
  const vazio = situacao === 'ativos' || situacao === 'todos'
    ? 'Selecione pessoas pela ficha (Contatos › Pessoas) ou pelas sugestões abaixo.'
    : 'Ninguém está em “' + rotulo('presskit', situacao) + '” agora. Escolha outra situação ou “Na lista”.'

  return (
    <div className="og-embutida">
      <ul className="ui-numeros" aria-label="Resumo do Press Kit">
        {[['selecionado', 'selecionados'], ['confirmado', 'preparando'], ['enviado', 'enviados'], ['entregue', 'entregues'], ['nao_entregue', 'não entregues']].map(([s, r]) => (
          <li key={s}><button type="button" className="ui-numero" onClick={() => setSituacao(s)}><span className="ui-numero__n">{contar(s)}</span><span className="ui-numero__rotulo">{r}</span></button></li>
        ))}
      </ul>
      <Ajuda titulo="Como a lista funciona">
        <p>Sugerido → Selecionado → Preparando (endereço confirmado) → Enviado → Entregue. Abra a pessoa para registrar endereço, responsável pelo envio, datas e o que vai no kit.</p>
        <p>Errou um passo? Cada pessoa tem “Voltar para …” e “Retirar da lista”. Quem sai fica em “Retirado da lista” (nada se apaga) e volta por “Colocar de volta”. Depois de cada mudança o aviso traz “Desfazer”.</p>
        <p>As sugestões abaixo são de quem recebeu em edições anteriores. Ninguém entra na lista sozinho; “Não incluir nesta edição” tira a pessoa das sugestões.</p>
      </Ajuda>
      <Escolha rotulo="Situação" valor={situacao} onMudar={setSituacao}
        opcoes={[['ativos', 'Na lista'], ...ORDEM.map((s) => [s, rotulo('presskit', s)]), ['todos', 'Todos']]
          .map(([v, r]) => [v, r + (ORDEM.includes(v) ? ' (' + contar(v) + ')' : '')])} />
      {aviso && (typeof aviso === 'string'
        ? <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>
        : (
          <p className="ui-nota ui-nota--ok" role="status">
            {aviso.ok}
            {aviso.volta && <> <button type="button" className="og-link" onClick={() => mudar(aviso.volta[0], aviso.volta[1], { ok: 'Desfeito.' })}>Desfazer</button></>}
          </p>
        ))}

      <Secao titulo="Lista desta edição" nota={naLista + (naLista === 1 ? ' pessoa' : ' pessoas')}>
        {visiveis.length === 0 && <Vazio titulo="Ninguém aqui">{vazio}</Vazio>}
        {visiveis.length > 0 && (
          <ul className="og-lista">{visiveis.map((c) => {
            const a = c.atual
            const prox = PROXIMO[a.status]
            return (
              <li key={c.id}>
                <div className="og-item og-item--info og-item--acoes">
                  <span className="og-item__cor" data-tipo={c.tipo} aria-hidden="true" />
                  <button type="button" className="og-item__nome og-link" onClick={() => navegar({ filtros: { item: c.id } })}>{c.nome}</button>
                  <p className="og-item__meta">{[c.instagram, a.endereco_confirmado || c.endereco || 'sem endereço', a.responsavel_envio && 'envio: ' + a.responsavel_envio, a.data && 'enviado ' + dataCurta(a.data), a.recebido_em && 'recebido ' + dataCurta(a.recebido_em)].filter(Boolean).join(' · ')}</p>
                  <span className="og-item__dir">
                    <Selo dominio="presskit" valor={a.status} />
                    {podeMudar && prox && <button className="og-btn og-btn--mini" type="button" onClick={() => mudar(c, prox[0])}>{prox[1]}</button>}
                    {podeMudar && a.status === 'enviado' && <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => mudar(c, 'nao_entregue')}>Não entregue</button>}
                    {podeMudar && a.status === RETIRADO && <button className="og-btn og-btn--mini" type="button" aria-label={'Colocar de volta: ' + c.nome} onClick={() => colocarDeVolta(c)}>Colocar de volta</button>}
                    {podeMudar && a.status !== RETIRADO && ANTERIOR[a.status] && (
                      <button className="og-btn og-btn--mini og-btn--vazado" type="button" aria-label={'Voltar para ' + rotulo('presskit', ANTERIOR[a.status]) + ': ' + c.nome} onClick={() => voltarPasso(c)}>Voltar para {rotulo('presskit', ANTERIOR[a.status])}</button>
                    )}
                    {podeMudar && a.status !== RETIRADO && <button className="og-btn og-btn--mini og-btn--vazado" type="button" aria-label={'Retirar da lista: ' + c.nome} onClick={() => retirar(c)}>Retirar da lista</button>}
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
              <div className="og-item og-item--info og-item--acoes">
                <span className="og-item__cor" data-tipo={c.tipo} aria-hidden="true" />
                <button type="button" className="og-item__nome og-link" onClick={() => navegar({ filtros: { item: c.id } })}>{c.nome}</button>
                <p className="og-item__meta">{[c.instagram, c.recebimentos + (Number(c.recebimentos) === 1 ? ' Press Kit' : ' Press Kits'), c.ultima_edicao && 'último ' + c.ultima_edicao].filter(Boolean).join(' · ')}</p>
                <span className="og-item__dir">
                  {podeMudar && <button className="og-btn og-btn--mini" type="button" aria-label={'Selecionar: ' + c.nome} onClick={() => mudar(c, 'selecionado')}>Selecionar</button>}
                  {podeMudar && <button className="og-btn og-btn--mini og-btn--vazado" type="button" aria-label={'Só sugerir: ' + c.nome} onClick={() => mudar(c, 'constou_na_lista')}>Só sugerir</button>}
                  {podeMudar && (
                    <button className="og-btn og-btn--mini og-btn--vazado" type="button" aria-label={'Não incluir nesta edição: ' + c.nome}
                      onClick={() => mudar(c, RETIRADO, { ok: c.nome + ' não entra no Press Kit desta edição. Fica em “' + rotulo('presskit', RETIRADO) + '”.' })}>Não incluir nesta edição</button>
                  )}
                </span>
              </div>
            </li>
          ))}</ul>
        )}
      </Secao>

      <FichaContato id={aberto} pode={pode} onFechar={() => navegar({ filtros: {} })} />
    </div>
  )
}
