import React from 'react'
import { organizarMeusPremios } from './logica.js'

const REFRESCO_MS = 60000

/** Lê os prêmios do mapa atual pela chave pessoal; não usa nem expõe a lista pública de ganhadores. */
export function usarMeusPremios (caca) {
  const [estado, setEstado] = React.useState(caca.chave ? 'carregando' : 'sem-mapa')
  const [premios, setPremios] = React.useState([])
  const [rodada, setRodada] = React.useState(0)
  const [ocupado, setOcupado] = React.useState(null)
  const [erroEscolha, setErroEscolha] = React.useState('')

  React.useEffect(() => {
    if (!caca.chave) { setEstado('sem-mapa'); setPremios([]); return undefined }
    let vivo = true
    const ler = async () => {
      const r = await caca.api.meusPremios(caca.chave)
      if (!vivo) return
      if (r.ok) { setPremios(organizarMeusPremios(r.premios)); setEstado('pronto') }
      else setEstado((atual) => (atual === 'pronto' ? atual : 'falha'))
    }
    ler()
    const id = setInterval(ler, REFRESCO_MS)
    const aoVoltar = () => { if (document.visibilityState === 'visible') setRodada((n) => n + 1) }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { vivo = false; clearInterval(id); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [caca.chave, caca.api, rodada])

  const tentar = React.useCallback(() => { setEstado('carregando'); setRodada((n) => n + 1) }, [])
  const escolher = React.useCallback(async (premio, opcao) => {
    if (!caca.chave || ocupado) return false
    setOcupado(premio)
    setErroEscolha('')
    try {
      const r = await caca.api.meusPremiosEscolherVoucher(caca.chave, premio, opcao)
      if (!r.ok) {
        const mensagens = {
          email_nao_confirmado: 'Confirme o e-mail do mapa antes de escolher o voucher.',
          voucher_opcao_indisponivel: 'Esse voucher acabou de ser escolhido. Atualizamos as opções disponíveis.',
          voucher_ja_escolhido: 'Você já escolheu seu voucher. Atualize para abrir o vale.',
        }
        setErroEscolha(mensagens[r.motivo] || 'Não foi possível reservar esse voucher agora. Tente de novo.')
        setRodada((n) => n + 1)
        return false
      }
      setRodada((n) => n + 1)
      return true
    } catch {
      setErroEscolha('Sem conexão. Seu voucher não foi reservado; tente de novo.')
      return false
    } finally { setOcupado(null) }
  }, [caca.api, caca.chave, ocupado])
  return { estado, premios, tentar, escolher, ocupado, erroEscolha }
}
