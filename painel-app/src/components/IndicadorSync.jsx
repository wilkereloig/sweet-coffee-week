import React from 'react'
import { useEstadoSync } from '../lib/sync/react'
import { sincronizacao } from '../lib/sync'
import { mudancasExternas, ouvirPendencias } from '../lib/pendencias'

/*
 * Estado da sincronização, discreto, no cabeçalho (19/10/2026). Quatro situações
 * e nada além delas: Atualizado · Atualizando · Sem conexão · Falha de sincronização.
 * "Em tempo real" só aparece na dica DEPOIS que os canais confirmaram a assinatura
 * (estado.tempoRealAtivo); antes disso, ou sem canal (acesso compartilhado, canal
 * negado), a dica diz que a conferência é periódica — nunca finge tempo real.
 * Em falha ou sem conexão vira botão: tocar tenta de novo agora.
 */
const hhmm = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function textoDoEstado(e) {
  if (e.situacao === 'sem_conexao') return { rotulo: 'Sem conexão', dica: 'Sem internet. O painel volta a atualizar sozinho quando a conexão voltar.' }
  if (e.situacao === 'falha') {
    const motivo = e.detalhe === 'canal_negado'
      ? 'Sua conta não conseguiu ligar as atualizações automáticas.'
      : e.detalhe === 'tempo_real_indisponivel'
        ? 'As atualizações automáticas estão fora do ar; o painel confere a cada 45 segundos.'
        : 'Não deu para ler os dados agora.'
    return { rotulo: 'Sem sincronizar', dica: motivo + ' Toque para tentar de novo.' }
  }
  if (e.situacao === 'atualizando') return { rotulo: 'Atualizando…', dica: 'Buscando o que mudou.' }
  const quando = e.ultimaEm ? ' Última atualização às ' + hhmm(e.ultimaEm) + '.' : ''
  if (e.tempoRealAtivo) return { rotulo: 'Atualizado', dica: 'Em tempo real: o que as outras pessoas salvam aparece aqui sozinho.' + quando }
  if (e.conectando) return { rotulo: 'Atualizado', dica: 'Ligando as atualizações automáticas…' + quando }
  return { rotulo: 'Atualizado', dica: 'Conferindo a cada 45 segundos (esta sessão não tem atualização em tempo real).' + quando }
}

export function IndicadorSync() {
  const e = useEstadoSync()
  // Há um registro aberto para edição que outra pessoa alterou: a dica avisa (o aviso
  // de verdade está no próprio formulário, com a escolha de qual versão vale).
  const [externas, setExternas] = React.useState(() => mudancasExternas().length)
  React.useEffect(() => ouvirPendencias(() => setExternas(mudancasExternas().length)), [])
  if (e.modo === 'parado') return null
  const base = textoDoEstado(e)
  const rotulo = base.rotulo
  const dica = externas ? base.dica + ' ' + (externas === 1 ? 'Um registro que você está editando foi alterado por outra pessoa.' : externas + ' registros que você está editando foram alterados por outras pessoas.') : base.dica
  const agir = e.situacao === 'falha' || e.situacao === 'sem_conexao'
  const classe = 'pn-sync pn-sync--' + e.situacao + (e.tempoRealAtivo ? ' pn-sync--ao-vivo' : '')
  const conteudo = (
    <>
      <span className="pn-sync__ponto" aria-hidden="true" />
      <span className="pn-sync__rotulo">{rotulo}</span>
    </>
  )
  if (!agir) return <span className={classe} role="status" aria-live="polite" title={dica} data-sync={e.situacao}>{conteudo}<span className="pn-sync__sr"> — {dica}</span></span>
  return (
    <button type="button" className={classe} title={dica} aria-label={rotulo + '. ' + dica} data-sync={e.situacao}
      onClick={() => sincronizacao.tentarDeNovo()}>
      {conteudo}
    </button>
  )
}
