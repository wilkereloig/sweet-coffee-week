import React from 'react'
import { api } from '../../../lib/marcaApi'

/** A disponibilidade é da participação inteira e só vale até a virada do dia local. */
export function ComboEsgotado({ participacaoId, hoje }) {
  const [estado, setEstado] = React.useState(null)
  const [carregando, setCarregando] = React.useState(true)
  const [salvando, setSalvando] = React.useState(false)
  const [erro, setErro] = React.useState('')
  const seq = React.useRef(0)

  const ler = React.useCallback(async () => {
    const atual = ++seq.current
    setCarregando(true)
    try {
      const r = await api('rpc/marca_combo_esgotado_estado', { metodo: 'POST', corpo: { p_participacao: participacaoId } })
      if (atual === seq.current) { setEstado(!!r?.esgotado); setErro('') }
    } catch (e) {
      if (atual === seq.current && e?.message !== 'sessao_expirada') setErro('Não consegui conferir o aviso de hoje. Tente novamente.')
    } finally { if (atual === seq.current) setCarregando(false) }
  }, [participacaoId])

  React.useEffect(() => { ler(); return () => { seq.current += 1 } }, [ler, hoje])

  async function alternar() {
    setSalvando(true); setErro('')
    try {
      const r = await api('rpc/marca_combo_esgotado', {
        metodo: 'POST', corpo: { p_participacao: participacaoId, p_esgotado: !estado },
      })
      setEstado(!!r?.esgotado)
    } catch (e) {
      if (e?.message === 'fora_do_festival') setErro('Este aviso só pode ser usado durante o período do festival.')
      else if (e?.message === 'combo_nao_publicado') setErro('Publique o combo para liberar este aviso no mapa.')
      else if (e?.message !== 'sessao_expirada') setErro('Não consegui atualizar agora. Confira sua conexão e tente de novo.')
    } finally { setSalvando(false) }
  }

  return (
    <div className={'mc-esgotado' + (estado ? ' is-esgotado' : '')} aria-live="polite">
      <div className="mc-esgotado__marca" aria-hidden="true"><span /></div>
      <div className="mc-esgotado__texto">
        <span className="mc-esgotado__rotulo">DISPONIBILIDADE NO MAPA</span>
        <strong>{estado ? 'Combos esgotados hoje' : 'Ainda tem combo disponível?'}</strong>
        <span>{estado
          ? 'A Organização foi avisada e o mapa informa que sua casa está sem combos.'
          : 'Se acabar, avise a Organização para atualizar o mapa.'}</span>
      </div>
      <button type="button" className="acao acao--amarela" onClick={alternar} disabled={carregando || salvando}>
        {carregando ? 'Conferindo…' : salvando ? 'Atualizando…' : estado ? 'Temos combos novamente' : 'Avisar que esgotou'}
      </button>
      {erro && <p className="mc-esgotado__erro" role="alert">{erro}</p>}
      <small>O aviso vale para toda a casa até o fim do dia e sai automaticamente amanhã.</small>
    </div>
  )
}
