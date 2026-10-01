import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataHoraCurta } from '../../lib/painelFormat'
import { rotulo } from '../../lib/status'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, Secao, Selo, traduzirErro } from '../ui'
import { pedirTexto } from '../Confirmar'

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

/*
 * Operação › Materiais — tudo o que sai para as marcas nesta edição (mesas,
 * prismas, placa, display, vouchers), numa lista só, agrupada por marca.
 * Registrar material novo continua na ficha da marca (aba Operação), onde
 * estão as unidades dela; aqui é o painel de conferência e entrega.
 */
export function MateriaisEdicao({ registrarAtualizar, pode, abrirLink }) {
  const [itens, setItens] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [filtro, setFiltro] = React.useState('abertos')
  const [aviso, setAviso] = React.useState(null)

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      const l = await rpc('get_materiais', { p_secret: lerSenha() })
      if (l == null) throw new Error('nao_autorizado')
      setItens(l)
    } catch (e) { setErro(e.message) }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])

  async function entregar(m) {
    const quem = await pedirTexto('Quem recebeu na marca?', {})
    if (!quem) return
    setAviso(null)
    try { await rpc('salvar_material', { p_secret: lerSenha(), p_item: { ...m, status: 'entregue', recebido_por: quem } }); carregar() }
    catch (e) { setAviso(traduzirErro(e.message)) }
  }

  if (erro) return <Erro texto={erro} onTentar={carregar} />
  if (!itens) return <Carregando />
  const visiveis = itens.filter((m) => filtro === 'todos' || (filtro === 'abertos' ? !['entregue', 'cancelado'].includes(m.status) : m.status === filtro))
  const grupos = []
  for (const m of visiveis) {
    const g = grupos.find((x) => x.marca === m.marca)
    if (g) g.itens.push(m); else grupos.push({ marca: m.marca, itens: [m] })
  }
  const contar = (s) => itens.filter((m) => m.status === s).length

  return (
    <div className="og-embutida">
      <div className="ui-filtros-mini" role="group" aria-label="Situação dos materiais">
        {[['abertos', 'A entregar'], ['previsto', 'Previstos'], ['separado', 'Separados'], ['entregue', 'Entregues'], ['todos', 'Todos']].map(([v, r]) => (
          <button key={v} type="button" className="ui-chip" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
            {r}{v !== 'todos' && v !== 'abertos' ? ' (' + contar(v) + ')' : ''}
          </button>
        ))}
      </div>
      {aviso && <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>}
      {itens.length === 0 && <Vazio titulo="Nenhum material registrado nesta edição">Registre na ficha de cada marca, aba Operação.</Vazio>}
      {itens.length > 0 && grupos.length === 0 && <Vazio titulo="Nada com esse filtro" />}
      {grupos.map((g) => (
        <Secao key={g.marca} titulo={g.marca}>
          <ul className="og-lista">{g.itens.map((m) => (
            <li key={m.id}>
              <div className="og-item og-item--info">
                <span className="og-item__cor" data-tom={m.status === 'entregue' ? 'ok' : 'aviso'} aria-hidden="true" />
                <p className="og-item__nome">{rotulo('material', m.item)}{m.quantidade != null ? ' · ' + m.quantidade : ''}{m.descricao ? ' · ' + m.descricao : ''}</p>
                <p className="og-item__meta">{[m.unidade, m.recebido_por && 'recebido por ' + m.recebido_por, m.entregue_em && dataHoraCurta(m.entregue_em), m.observacao].filter(Boolean).join(' · ') || '—'}</p>
                <span className="og-item__dir">
                  <Selo dominio="material_status" valor={m.status} />
                  {pode('producao.gerir') && !['entregue', 'cancelado'].includes(m.status) && (
                    <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => entregar(m)}>Marcar entregue</button>
                  )}
                </span>
              </div>
            </li>
          ))}</ul>
        </Secao>
      ))}
    </div>
  )
}
