import React from 'react'
import { api, seFaltar } from '../../lib/marcaApi'
import { minhasSolicitacoes } from '../../lib/pedidosMarca'
import { resumoMarca, fotosDaParticipacao } from '../../lib/guia'
import { precisaLeitura, mapaDeLeituras } from '../../lib/arquivosMarca'
import { barramento } from '../../lib/sync/barramento'

/*
 * Estado da marca numa leitura só (29/09/2026): a casca usa para os números
 * das abas; Início, Meu cadastro e Meu combo, para pendências, progresso e o
 * estado de cada campo. Tudo sob a RLS da marca.
 */
export function useResumoMarca() {
  const [dados, setDados] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  // Leituras se sobrepõem (minuto, foco, após salvar): só a mais recente
  // escreve — uma resposta lenta e velha não desfaz o que a nova trouxe.
  const seqRef = React.useRef(0)

  // Devolve false só se a leitura FALHOU (a casca mostra "sem sincronizar"); resposta
  // velha, tela desmontada ou conta trocada (época do barramento) nunca grava.
  const carregar = React.useCallback(async () => {
    const minha = ++seqRef.current
    const epoca = barramento.epoca()
    const atual = () => minha === seqRef.current && epoca === barramento.epoca()
    try {
      const participantes = await api('participantes?select=*&order=created_at.desc&limit=1')
      const participante = (participantes && participantes[0]) || null
      if (!participante) { if (atual()) setDados({ participante: null }); return true }
      const pas = await api('participacoes?select=*&order=created_at.desc&limit=1')
      const participacao = (pas && pas[0]) || null
      if (!participacao) { if (atual()) setDados({ participante, participacao: null }); return true }
      const id = participacao.id
      const [itens, unidades, correcoes, solics, estados, sessoes, arqs, leituras, temas, logo, previa, publicacao] = await Promise.all([
        api('participantes_itens?select=*&participacao_id=eq.' + id),
        api('participacao_unidades?select=*&participacao_id=eq.' + id + '&order=ordem'),
        // Leituras novas: sem a migration, a tela segue sem elas (§10.4-b).
        // Só a AUSÊNCIA no banco vira vazio; falha passageira vai para `erro`.
        api('correcoes_campo?select=id,campo,bloco,comentario,estado,criada_em,corrigida_em&participacao_id=eq.' + id + '&order=criada_em.desc').catch(seFaltar([])),
        api('solicitacoes?select=id,titulo,prazo_em,escopo,participacao_id,edicao_codigo,bloco,campo,prioridade').catch(seFaltar([])),
        api('solicitacao_estado?select=solicitacao_id,estado&participacao_id=eq.' + id).catch(seFaltar([])),
        api('sessoes_fotos?select=*&order=data_hora.asc').catch(seFaltar([])),
        api('arquivos?select=id,nome,categoria,exige_leitura,publicado_em&arquivado=eq.false&order=publicado_em.desc').catch(seFaltar([])),
        // Com `lido_em`: leitura anterior à versão atual (arquivo substituído) volta a contar como pendente.
        api('arquivo_leitura?select=arquivo_id,lido_em').catch(seFaltar([])),
        api('temas_propostos?select=status,observacao&participacao_id=eq.' + id + '&status=neq.substituido&order=created_at.desc&limit=1').catch(seFaltar([])),
        // Logo oficial (cabeçalho e Início); sem a migration, segue sem ela.
        api('rpc/marca_minha_logo', { metodo: 'POST', corpo: {} }).catch(seFaltar(null)),
        // O que o servidor ainda exige para a página no site (unidades, horários, alergênicos…): o MESMO `faltando`
        // da prévia. Sem a migration da camada de edição, fica null e o Início não afirma nada sobre isso.
        api('rpc/marca_previa_publica', { metodo: 'POST', corpo: { p_participacao: id } }).catch(seFaltar(null)),
        api('rpc/marca_minha_publicacao', { metodo: 'POST', corpo: { p_participacao: id } }).catch(seFaltar(null)),
      ])
      if (!atual()) return true
      const estadoDe = Object.fromEntries((estados || []).map((e) => [e.solicitacao_id, e.estado]))
      const pedidos = minhasSolicitacoes(solics || [], participacao)
        .map((s) => ({ ...s, estado: estadoDe[s.id] || 'pendente' }))
      const lidos = mapaDeLeituras(leituras)
      const fotos = fotosDaParticipacao(sessoes, participacao)
      setDados({
        participante, participacao, itens: itens || [], unidades: unidades || [],
        correcoes: correcoes || [], pedidos, sessoes: fotos.minhas,
        vagasAbertas: fotos.vagas.length,
        arquivos: arqs || [],
        // Fotos oficiais (categoria combo) moram na aba Fotos: contadas à parte,
        // senão a pendência levaria a Arquivos, onde elas não aparecem.
        arquivosParaLer: (arqs || []).filter((a) => precisaLeitura(a, lidos) && a.categoria !== 'combo').length,
        fotosParaLer: (arqs || []).filter((a) => precisaLeitura(a, lidos) && a.categoria === 'combo').length,
        tema: (temas && temas[0]) || null,
        logo,
        faltandoEdicao: previa && Array.isArray(previa.faltando) ? previa.faltando : null,
        publicacao,
      })
      setErro(null)
      return true
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return true
      if (atual()) setErro(e.message || 'erro')
      return false
    }
  }, [])

  // Quem dispara a leitura é a casca (na montagem, a cada minuto e após salvar).
  const resumo = React.useMemo(() => (dados && dados.participante ? resumoMarca(dados) : null), [dados])
  return { dados, resumo, erro, carregar }
}
