import React from 'react'
import { api } from '../../../lib/marcaApi'

/*
 * "Estamos com fila agora" (docs/cartoon-2026-2/20-movimento-nas-casas.md, parte B). Um aviso por endereço: o mapa mostra
 * "Fila agora" no cartão da casa por 1 hora (o banco vence sozinho) e a Organização é avisada. Mesmo desenho do combo esgotado.
 */
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' })

export function FilaAgora({ participacaoId, hoje }) {
  const [unidades, setUnidades] = React.useState(null)
  const [salvando, setSalvando] = React.useState('')
  const [erro, setErro] = React.useState('')

  const ler = React.useCallback(async () => {
    try {
      const r = await api('rpc/marca_fila_estado', { metodo: 'POST', corpo: { p_participacao: participacaoId } })
      setUnidades(Array.isArray(r) ? r : []); setErro('')
    } catch (e) {
      if (e?.message !== 'sessao_expirada') setErro('Não consegui conferir o aviso de fila. Tente novamente.')
    }
  }, [participacaoId])

  // O aviso vence sozinho: reler a cada minuto mantém o botão certo sem recarregar a página.
  React.useEffect(() => { ler(); const t = setInterval(ler, 60000); return () => clearInterval(t) }, [ler, hoje])

  async function trocar(u) {
    setSalvando(u.unidade); setErro('')
    try {
      await api('rpc/marca_fila_definir', { metodo: 'POST', corpo: { p_participacao: participacaoId, p_unidade: u.unidade, p_fila: !u.ate } })
      await ler()
    } catch (e) {
      if (e?.message === 'fora_do_festival') setErro('Este aviso só pode ser usado durante o período do festival.')
      else if (e?.message !== 'sessao_expirada') setErro('Não consegui atualizar agora. Confira sua conexão e tente de novo.')
    } finally { setSalvando('') }
  }

  if (!unidades || unidades.length === 0) return erro ? <p className="mc-esgotado__erro" role="alert">{erro}</p> : null
  const varias = unidades.length > 1
  return unidades.map((u) => (
    <div key={u.unidade} className={'mc-esgotado' + (u.ate ? ' is-esgotado' : '')} aria-live="polite">
      <div className="mc-esgotado__marca" aria-hidden="true"><span /></div>
      <div className="mc-esgotado__texto">
        <span className="mc-esgotado__rotulo">FILA NO MAPA{varias && u.bairro ? ' · ' + u.bairro.toUpperCase() : ''}</span>
        <strong>{u.ate ? 'Fila agora, até ' + hora(u.ate) : 'Está com fila agora?'}</strong>
        <span>{u.ate
          ? 'O mapa mostra "Fila agora" no cartão da casa. Sai sozinho no horário, ou antes se você tirar.'
          : 'Avise e o mapa mostra "Fila agora" por 1 hora. Quem está a caminho fica sabendo.'}</span>
      </div>
      <button type="button" className="acao acao--amarela" onClick={() => trocar(u)} disabled={!!salvando}>
        {salvando === u.unidade ? 'Atualizando…' : u.ate ? 'A fila acabou' : 'Estamos com fila agora'}
      </button>
      {erro && <p className="mc-esgotado__erro" role="alert">{erro}</p>}
    </div>
  ))
}
