import React from 'react'
import { api } from '../../lib/marcaApi'
import { minhasSolicitacoes } from '../../lib/pedidosMarca'
import { resumoMarca } from '../../lib/guia'

/*
 * Estado da marca numa leitura só (29/09/2026): a casca usa para os números
 * das abas; Início, Meu cadastro e Meu combo, para pendências, progresso e o
 * estado de cada campo. Tudo sob a RLS da marca.
 */
export function useResumoMarca() {
  const [dados, setDados] = React.useState(null)
  const [erro, setErro] = React.useState(null)

  const carregar = React.useCallback(async () => {
    try {
      const participantes = await api('participantes?select=*&order=created_at.desc&limit=1')
      const participante = (participantes && participantes[0]) || null
      if (!participante) { setDados({ participante: null }); return }
      const pas = await api('participacoes?select=*&order=created_at.desc&limit=1')
      const participacao = (pas && pas[0]) || null
      if (!participacao) { setDados({ participante, participacao: null }); return }
      const id = participacao.id
      const [itens, unidades, correcoes, solics, estados, sessoes, arqs, leituras, temas, logo] = await Promise.all([
        api('participantes_itens?select=*&participacao_id=eq.' + id),
        api('participacao_unidades?select=*&participacao_id=eq.' + id),
        // Leituras novas: sem a migration, a tela segue sem elas (§10.4-b).
        api('correcoes_campo?select=id,campo,bloco,comentario,estado,criada_em,corrigida_em&participacao_id=eq.' + id + '&order=criada_em.desc').catch(() => []),
        api('solicitacoes?select=id,titulo,prazo_em,escopo,edicao_codigo,bloco,campo,prioridade').catch(() => []),
        api('solicitacao_estado?select=solicitacao_id,estado&participacao_id=eq.' + id).catch(() => []),
        api('sessoes_fotos?select=*&order=data_hora.asc').catch(() => []),
        api('arquivos?select=id,nome,categoria,exige_leitura,publicado_em&arquivado=eq.false&order=publicado_em.desc').catch(() => []),
        api('arquivo_leitura?select=arquivo_id').catch(() => []),
        api('temas_propostos?select=status,observacao&participacao_id=eq.' + id + '&status=neq.substituido&order=created_at.desc&limit=1').catch(() => []),
        // Logo oficial (cabeçalho e Início); sem a migration, segue sem ela.
        api('rpc/marca_minha_logo', { metodo: 'POST', corpo: {} }).catch(() => null),
      ])
      const estadoDe = Object.fromEntries((estados || []).map((e) => [e.solicitacao_id, e.estado]))
      const pedidos = minhasSolicitacoes(solics || [], participacao)
        .map((s) => ({ ...s, estado: estadoDe[s.id] || 'pendente' }))
      const lidos = new Set((leituras || []).map((l) => l.arquivo_id))
      const minhas = (sessoes || []).filter((s) => s.participante_id)
      setDados({
        participante, participacao, itens: itens || [], unidades: unidades || [],
        correcoes: correcoes || [], pedidos, sessoes: minhas,
        vagasAbertas: (sessoes || []).filter((s) => s.status === 'aberto').length,
        arquivos: arqs || [],
        // Fotos oficiais (categoria combo) moram na aba Fotos: contadas à parte,
        // senão a pendência levaria a Arquivos, onde elas não aparecem.
        arquivosParaLer: (arqs || []).filter((a) => a.exige_leitura && !lidos.has(a.id) && a.categoria !== 'combo').length,
        fotosParaLer: (arqs || []).filter((a) => a.exige_leitura && !lidos.has(a.id) && a.categoria === 'combo').length,
        tema: (temas && temas[0]) || null,
        logo,
      })
      setErro(null)
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setErro(e.message || 'erro')
    }
  }, [])

  // Quem dispara a leitura é a casca (na montagem, a cada minuto e após salvar).
  const resumo = React.useMemo(() => (dados && dados.participante ? resumoMarca(dados) : null), [dados])
  return { dados, resumo, erro, carregar }
}
