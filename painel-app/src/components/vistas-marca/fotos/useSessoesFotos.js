import React from 'react'
import { api, emVerComo } from '../../../lib/marcaApi'
import { fotosDaParticipacao } from '../../../lib/guia'
import { situacaoDaLeitura, interpretarReserva, textoDeConfirmarReserva } from '../../../lib/fotosMarca'
import { confirmar } from '../../Confirmar'
import { useSincronizar, useGuarda } from '../../../lib/sync/react'

/*
 * As sessões de fotos desta marca e a reserva de um horário (era o miolo de Fotos.jsx).
 *
 * A RLS devolve as sessões desta marca (de todas as edições) E as vagas abertas da edição: quando outra marca pega
 * uma vaga, ela some na releitura. Releitura que falha MANTÉM a lista que estava na tela e rejeita (o indicador de
 * sincronização mostra a falha); "não deu para carregar" só aparece quando nunca houve dado — antes a falha virava
 * lista vazia e a tela dizia "Aguardando liberação" sem saber.
 *
 * Reservar continua pelo MESMO caminho de antes: um PATCH em `sessoes_fotos` só na linha que ainda está aberta
 * (atômico: duas marcas na mesma vaga, só uma linha muda) e a confirmação vem do que o servidor devolve.
 */
export function useSessoesFotos({ participacao, participante, recarregarResumo }) {
  const [sessoes, setSessoes] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [reservando, setReservando] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const guarda = useGuarda()
  const temDados = React.useRef(false)

  const carregar = React.useCallback(async () => {
    const vale = guarda()
    try {
      const l = (await api('sessoes_fotos?select=*&order=data_hora.asc')) || []
      if (!vale()) return
      setSessoes(l)
      setErro(null)
      temDados.current = true
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      if (!vale()) return
      if (!temDados.current) setErro(e.message || 'erro')
      throw e
    }
  }, [guarda])
  React.useEffect(() => { carregar().catch(() => {}) }, [carregar])
  useSincronizar(['fotos', 'participantes'], carregar)

  const tentarDeNovo = React.useCallback(() => { setErro(null); carregar().catch(() => {}) }, [carregar])

  async function reservar(vaga) {
    if (!participacao || !participante || reservando) return
    // Modo "Ver como participante": nada é gravado — o aviso diz isso sem abrir a pergunta.
    if (emVerComo()) { setAviso(interpretarReserva({ erro: new Error('modo_visualizacao') })); return }
    const quer = await confirmar(textoDeConfirmarReserva(vaga), { acao: 'Reservar horário' })
    if (!quer) return
    setReservando(vaga.id)
    setAviso(null)
    // A vaga some da tela quando já não está livre; uma releitura que falhe não pode deixá-la à vista.
    const tirar = () => setSessoes((l) => (l ? l.filter((x) => x.id !== vaga.id) : l))
    // E a reserva que o servidor acabou de confirmar entra na lista pela linha que ele devolveu: com a releitura
    // fora do ar a tela já mostra "Sessão agendada" (a vaga sai de `vagas`, a linha entra em `minhas`), em vez de
    // seguir oferecendo o horário que é dela — cujo segundo clique diria "outra marca" (a vaga já não está aberta).
    const aplicar = (linha) => setSessoes((l) => (l ? l.map((x) => (x.id === linha.id ? { ...x, ...linha } : x)) : l))
    try {
      const r = await api('sessoes_fotos?id=eq.' + vaga.id + '&status=eq.aberto', {
        metodo: 'PATCH',
        corpo: { status: 'agendada', participacao_id: participacao.id, participante_id: participante.id },
        prefer: 'return=representation',
      })
      const res = interpretarReserva({ linhas: r, vaga })
      setAviso(res)
      if (res.tirarVaga) tirar()
      else if (res.reservou) aplicar(r[0])
      // A reserva já foi feita (ou recusada): a releitura que falhar aqui não pode virar "não deu para reservar".
      await carregar().catch(() => {})
      if (recarregarResumo) recarregarResumo()
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setAviso(interpretarReserva({ erro: e, vaga }))
      await carregar().catch(() => {})
    } finally {
      setReservando(null)
    }
  }

  const { minhas, vagas } = fotosDaParticipacao(sessoes, participacao)
  return { situacao: situacaoDaLeitura({ dados: sessoes, erro }), minhas, vagas, reservando, aviso, reservar, tentarDeNovo }
}
