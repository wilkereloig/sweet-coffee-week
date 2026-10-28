import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataHoraCurta } from '../../lib/painelFormat'
import { rotulo } from '../../lib/status'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, Secao, Selo, traduzirErro, Escolha } from '../ui'
import { pedirTexto } from '../Confirmar'
import { useLeitura } from '../../lib/leituraVivaReact'
import { materialParaEntregar } from '../../lib/leituraViva'

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

const MOTIVO_NAO_ENTREGA = {
  sumiu: 'Este material não está mais na lista. A lista foi atualizada: confira.',
  ja_entregue: 'Outra pessoa já marcou este material como entregue.',
  cancelado: 'Este material foi cancelado por outra pessoa.',
}

/*
 * Operação › Materiais — tudo o que sai para as marcas nesta edição (mesas,
 * prismas, placa, display, vouchers), numa lista só, agrupada por marca.
 * Registrar material novo continua na ficha da marca (aba Operação), onde
 * estão as unidades dela; aqui é o painel de conferência e entrega.
 */
export function MateriaisEdicao({ pode }) {
  const [filtro, setFiltro] = React.useState('abertos')
  const [aviso, setAviso] = React.useState(null)
  const [entregando, setEntregando] = React.useState(null) // id do material cuja entrega está sendo gravada

  // A lista (e o filtro escolhido) se atualizam sozinhos quando muda o material, a marca ou a
  // unidade — são os nomes que a linha mostra. Falha de releitura não tira a lista da tela.
  const leitura = useLeitura(async () => {
    const l = await rpc('get_materiais', { p_secret: lerSenha() })
    if (l == null) throw new Error('nao_autorizado')
    return l
  }, ['materiais', 'participantes', 'unidades'])
  const itens = leitura.dados === undefined ? null : leitura.dados

  async function entregar(m) {
    const quem = await pedirTexto('Quem recebeu na marca?', {})
    if (!quem) return
    setAviso(null)
    // O texto levou segundos e salvar_material regrava a LINHA INTEIRA: o que vai é a linha de
    // agora (a lista pode ter mudado nesse meio-tempo), nunca a de quando a pessoa clicou.
    const r = materialParaEntregar(leitura.atual(), m.id, quem)
    if (!r.item) { setAviso(MOTIVO_NAO_ENTREGA[r.motivo]); return }
    setEntregando(m.id)
    try {
      await rpc('salvar_material', { p_secret: lerSenha(), p_item: r.item })
      // Confirmado: sai de "a entregar" na hora; a releitura (domínio "materiais") traz a data.
      leitura.ajustar((l) => l.map((x) => (x.id === m.id ? { ...x, status: 'entregue', recebido_por: quem } : x)))
    } catch (e) { setAviso(traduzirErro(e.message)) } finally { setEntregando(null) }
  }

  if (leitura.bloqueada) return <Erro texto={leitura.erro} onTentar={leitura.recarregar} />
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
      {leitura.falhouAtualizar && <Erro titulo="Não consegui atualizar" texto={leitura.erro} onTentar={leitura.recarregar} />}
      <Escolha rotulo="Mostrar" valor={filtro} onMudar={setFiltro}
        opcoes={[['abertos', 'A entregar'], ['previsto', 'Previstos'], ['separado', 'Separados'], ['entregue', 'Entregues'], ['todos', 'Todos']]
          .map(([v, r]) => [v, r + (v !== 'todos' && v !== 'abertos' ? ' (' + contar(v) + ')' : '')])} />
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
                    <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={entregando === m.id} onClick={() => entregar(m)}>Marcar entregue</button>
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
