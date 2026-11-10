import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import * as E from '../../lib/edicaoMarca'
import { usePendencia } from '../../lib/pendencias'
import { Carregando, Erro, Modulo, Selo, traduzirErro } from '../ui'
import { MODULO_ICONE } from '../Icone'
import { Alimentar } from '../vistas-marca/edicao/Alimentar'
import '../../styles/edicao-marca.css'

/*
 * Informações alimentares e trocas, editadas pela EQUIPE (09/11/2026). É o mesmo formulário da marca (<Alimentar>) e grava
 * nas MESMAS tabelas que o site lê (declaracoes_alimentares e substituicoes), por org_salvar_alimentar. A ficha antiga gravava
 * as colunas legadas (vegano, sem glúten…), que o site não lê. Sem resposta = "não respondido": a tela nunca pré-marca.
 */
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const SEM_ESTADO = () => undefined
const LISTA_VAZIA = []

function doBanco(itens, lido) {
  const rows = (lido && lido.declaracoes) || []
  return {
    declaracoes: E.declaracoesPorItem(rows),
    substituicoes: ((lido && lido.substituicoes) || []).map(E.substituicaoDeLinha),
    declTrocas: E.declaracoesPorTroca(rows),
  }
}

function corpoDeclaracoes(porAspecto) {
  const o = {}
  for (const [a, d] of Object.entries(porAspecto || {})) if (E.declaracaoGravavel(a, d)) o[a] = E.corpoDeclaracao(d)
  return o
}

export function AlimentarEquipe({ participacaoId, itens = LISTA_VAZIA, unidades = LISTA_VAZIA, podeEditar, onSalvo }) {
  const [estado, setEstado] = React.useState({ carregando: true, erro: null })
  const [declaracoes, setDeclaracoes] = React.useState({})
  const [substituicoes, setSubstituicoes] = React.useState([])
  const [declTrocas, setDeclTrocas] = React.useState({})
  const [sujo, setSujo] = React.useState(false)
  const [salvando, setSalvando] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  const seq = React.useRef(0)
  const idsItens = itens.map((i) => i.id).join(',')

  const ler = React.useCallback(async () => {
    setEstado({ carregando: true, erro: null })
    try {
      const lido = await rpc('get_alimentar_participacao', { p_secret: lerSenha(), p_participacao: participacaoId })
      const d = doBanco(itens, lido)
      setDeclaracoes(d.declaracoes); setSubstituicoes(d.substituicoes); setDeclTrocas(d.declTrocas)
      setSujo(false)
      setEstado({ carregando: false, erro: null })
    } catch (e) { setEstado({ carregando: false, erro: traduzirErro(e.message) }) }
  }, [participacaoId, idsItens]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { ler() }, [ler])

  const alterarDeclaracao = (itemId, aspecto, campo, valor) => {
    setDeclaracoes((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] || {}), [aspecto]: { observacao: '', ...(prev[itemId] || {})[aspecto], [campo]: valor } } }))
    setSujo(true)
  }
  const sub = {
    adicionar(itemId) {
      seq.current += 1
      setSubstituicoes((prev) => [...prev, {
        _key: 'troca-' + seq.current, id: null, item_id: itemId, original: '', alternativa: '', descricao: '',
        disponibilidade: 'sob_consulta', acrescimo: '', como_solicitar: '', modalidades: [], unidades: [],
      }])
      setSujo(true)
    },
    alterar(k, campo, valor) { setSubstituicoes((prev) => prev.map((s) => (s._key === k ? { ...s, [campo]: valor } : s))); setSujo(true) },
    alterarDeclaracao(k, aspecto, campo, valor) {
      setDeclTrocas((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), [aspecto]: { observacao: '', ...(prev[k] || {})[aspecto], [campo]: valor } } }))
      setSujo(true)
    },
    remover(k) {
      setSubstituicoes((prev) => prev.filter((x) => x._key !== k))
      setDeclTrocas((prev) => { const { [k]: _fora, ...resto } = prev; return resto })
      setSujo(true)
    },
  }

  async function salvar() {
    setSalvando(true); setAviso(null)
    try {
      const corpo = {
        itens: itens.map((it) => ({
          item_id: it.id,
          declaracoes: corpoDeclaracoes(declaracoes[it.id]),
          trocas: substituicoes.filter((s) => s.item_id === it.id && E.substituicaoGravavel(s)).map((s) => {
            const { original: _o, acrescimo: _a, ...resto } = E.corpoSubstituicao(s, it.nome)
            return { id: s.id || null, ...resto, declaracoes: corpoDeclaracoes(declTrocas[s._key]) }
          }),
        })),
      }
      await rpc('org_salvar_alimentar', { p_secret: lerSenha(), p_participacao: participacaoId, p_dados: corpo })
      await ler()
      setAviso({ erro: false, texto: 'Informações alimentares salvas. O site atualiza em até 2 minutos.' })
      if (onSalvo) await onSalvo()
    } catch (e) { setAviso({ erro: true, texto: traduzirErro(e.message) }) } finally { setSalvando(false) }
  }
  usePendencia(sujo, { rotulo: 'Informações alimentares ainda não salvas', salvar: async () => { await salvar(); return true } })

  const unidadesTela = React.useMemo(() => unidades.map((u) => E.unidadeDeLinhas(u, u._un)), [unidades])

  return (
    <Modulo icone={MODULO_ICONE.combo} titulo="Informações alimentares e trocas" sub="O que o site mostra em “Restrições alimentares” e “Opções de troca”."
      status={sujo ? <Selo tom="atencao">Não salvo</Selo> : null}>
      {estado.carregando && <Carregando linhas={3} />}
      {estado.erro && <Erro texto={estado.erro} onTentar={ler} />}
      {!estado.carregando && !estado.erro && !itens.length && <p className="ui-nota">Esta marca ainda não cadastrou os itens do combo.</p>}
      {!estado.carregando && !estado.erro && itens.length > 0 && !podeEditar && <p className="ui-nota">Só leitura: sua função não edita o cadastro.</p>}
      {!estado.carregando && !estado.erro && itens.length > 0 && podeEditar && (
        <>
          <Alimentar itens={itens} declaracoes={declaracoes} substituicoes={substituicoes} declTrocas={declTrocas} unidades={unidadesTela}
            est={SEM_ESTADO} alterarDeclaracao={alterarDeclaracao} sub={sub} />
          {aviso && <p className={'ui-nota ' + (aviso.erro ? 'ui-nota--erro' : 'ui-nota--ok')} role={aviso.erro ? 'alert' : 'status'}>{aviso.texto}</p>}
          <div className="ui-linha-acoes">
            <button className="og-btn og-btn--mini" type="button" disabled={salvando || !sujo} onClick={salvar}>{salvando ? 'Salvando…' : 'Salvar informações alimentares'}</button>
            <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={salvando || !sujo} onClick={ler}>Descartar</button>
          </div>
        </>
      )}
    </Modulo>
  )
}
