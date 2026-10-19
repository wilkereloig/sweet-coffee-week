import React from 'react'
import { api } from '../../lib/marcaApi'
import { dataHoraCurta } from '../../lib/painelFormat'
import { ROTULO_SESSAO } from '../../lib/participantes'
import { fotosDaParticipacao } from '../../lib/guia'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Erro, Secao, Selo } from '../ui'
import { Arquivos } from './Arquivos'
import { useSincronizar, useGuarda } from '../../lib/sync/react'

/*
 * Fotos (marca, 29/09/2026) — a sessão de fotos (que morava no fim do
 * Cadastro), as fotos oficiais do combo e o guia de como preparar. O que
 * ainda não existe aparece numa linha, não num vazio grande.
 */
export function Fotos({ irPara, alvo, consumirAlvo, dadosMarca, recarregarResumo }) {
  const [sessoes, setSessoes] = React.useState(null)
  const [erroSessoes, setErroSessoes] = React.useState(null)
  const [reservando, setReservando] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const participacao = dadosMarca && dadosMarca.participacao
  const participante = dadosMarca && dadosMarca.participante

  const guarda = useGuarda()
  const temDados = React.useRef(false)

  // A RLS devolve as sessões desta marca E as vagas abertas da edição: quando outra marca pega uma vaga, ela some
  // na releitura (o clique em "reservar" já trata o "não está mais livre"). Releitura que falha MANTÉM a lista que
  // estava na tela e rejeita (o indicador mostra a falha); "não deu para carregar" só aparece sem dado algum — antes
  // a falha virava lista vazia, e a tela dizia "Aguardando liberação" sem saber.
  const carregar = React.useCallback(async () => {
    const vale = guarda()
    try {
      const l = (await api('sessoes_fotos?select=*&order=data_hora.asc')) || []
      if (!vale()) return
      setSessoes(l)
      setErroSessoes(null)
      temDados.current = true
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      if (!vale()) return
      if (!temDados.current) setErroSessoes(e.message || 'erro')
      throw e
    }
  }, [guarda])
  React.useEffect(() => { carregar().catch(() => {}) }, [carregar])
  useSincronizar(['fotos', 'participantes'], carregar)
  // Alvo com id (aviso de foto oficial) é da lista de fotos, que o consome.
  React.useEffect(() => { if (alvo && !alvo.id && consumirAlvo) consumirAlvo() }, [alvo]) // eslint-disable-line react-hooks/exhaustive-deps

  // A reserva é atômica por construção: só muda a linha que ainda está aberta.
  async function reservar(id) {
    if (!participacao || !participante) return
    setReservando(id)
    setAviso(null)
    try {
      const r = await api('sessoes_fotos?id=eq.' + id + '&status=eq.aberto', {
        metodo: 'PATCH',
        corpo: { status: 'agendada', participacao_id: participacao.id, participante_id: participante.id },
        prefer: 'return=representation',
      })
      setAviso(r && r.length ? { tom: 'ok', texto: 'Horário reservado. A organização é avisada.' } : { tom: 'erro', texto: 'Esse horário não está mais livre. Escolha outro.' })
      // A reserva já foi feita: releitura que falhar aqui não pode virar "não deu para reservar".
      await carregar().catch(() => {})
      if (recarregarResumo) recarregarResumo()
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      // Índice "uma sessão ativa por participação" (23505): já há sessão marcada.
      setAviso({ tom: 'erro', texto: /23505|duplicate|unique/i.test((e && e.message) || '') ? 'Sua marca já tem uma sessão marcada.' : 'Não deu para reservar agora. Tente de novo.' })
      await carregar().catch(() => {})
    } finally {
      setReservando(null)
    }
  }

  // Só a sessão desta participação e as vagas da edição dela (a RLS devolve todas).
  const { minhas, vagas } = fotosDaParticipacao(sessoes, participacao)
  const jaTem = minhas.some((s) => s.status !== 'cancelada')
  const realizada = minhas.some((s) => s.status === 'realizada')
  const liberado = participacao && participacao.foto_liberacao === 'liberado'

  return (
    <section className="ui-vista-marca">
      <VistaCabeca acento="magenta" icone="fotos" titulo="Fotos" nota="Sessão de fotos, fotos oficiais e o guia" />
      <div className="ui-grade-duas">
        <Secao titulo="Sessão de fotos">
          {sessoes === null && !erroSessoes && <Carregando linhas={2} />}
          {sessoes === null && erroSessoes && <Erro texto="Não deu para carregar a sessão de fotos agora." onTentar={() => { setErroSessoes(null); carregar().catch(() => {}) }} />}
          {sessoes && !jaTem && !liberado && (
            <p className="ui-nota">Aguardando liberação. Você recebe um aviso.</p>
          )}
          {sessoes && !jaTem && liberado && vagas.length === 0 && (
            <p className="ui-nota">Liberado. Os horários aparecem aqui.</p>
          )}
          {minhas.length > 0 && (
            <ul className="ui-lista-simples">
              {minhas.map((s) => (
                <li key={s.id}>
                  <b>{[dataHoraCurta(s.data_hora), s.local || ''].filter(Boolean).join(' · ')}</b>
                  <span><Selo tom={s.status === 'realizada' ? 'ok' : s.status === 'cancelada' ? 'encerrado' : 'andamento'}>{ROTULO_SESSAO[s.status] || s.status}</Selo>{s.observacoes ? ' ' + s.observacoes : ''}</span>
                </li>
              ))}
            </ul>
          )}
          {realizada && <p className="ui-nota">Sessão feita. As fotos chegam aqui, com aviso.</p>}
          {liberado && vagas.length > 0 && !jaTem && (
            <>
              <p className="ui-nota">A organização abriu horários. Escolha um:</p>
              <ul className="mc-vagas">
                {vagas.map((s) => {
                  const d = new Date(s.data_hora)
                  const rotulo = d.toLocaleDateString('pt-BR', { weekday: 'short' }) + ' ' + d.getDate() + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <li key={s.id}>
                      <button type="button" className="mc-vaga" disabled={reservando === s.id} onClick={() => reservar(s.id)}>
                        {reservando === s.id ? 'Reservando…' : rotulo}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          {aviso && <p className={'ui-nota' + (aviso.tom === 'erro' ? ' ui-nota--erro' : '')} role={aviso.tom === 'erro' ? 'alert' : 'status'}>{aviso.texto}</p>}
        </Secao>

        <Secao titulo="Guia de fotos" nota="Como preparar o combo para a sessão">
          <p className="ui-nota">As regras da foto, o que fazer e o que evitar, e o que levar no dia.</p>
          <button className="og-btn og-btn--vazado og-btn--mini" type="button" onClick={() => irPara('guia')}>Abrir o guia</button>
        </Secao>
      </div>
      <Arquivos fotos alvo={alvo} consumirAlvo={consumirAlvo} irPara={irPara} recarregarResumo={recarregarResumo} />
    </section>
  )
}
