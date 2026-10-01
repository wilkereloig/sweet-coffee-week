import React from 'react'
import { api } from '../../lib/marcaApi'
import { dataHoraCurta } from '../../lib/painelFormat'
import { ROTULO_SESSAO } from '../../lib/participantes'
import { fotosDaParticipacao } from '../../lib/guia'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Secao, Selo } from '../ui'
import { Arquivos } from './Arquivos'

/*
 * Fotos (marca, 29/09/2026) — a sessão de fotos (que morava no fim do
 * Cadastro), as fotos oficiais do combo e o guia de como preparar. O que
 * ainda não existe aparece numa linha, não num vazio grande.
 */
export function Fotos({ irPara, alvo, consumirAlvo, dadosMarca, recarregarResumo }) {
  const [sessoes, setSessoes] = React.useState(null)
  const [reservando, setReservando] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const participacao = dadosMarca && dadosMarca.participacao
  const participante = dadosMarca && dadosMarca.participante

  const carregar = React.useCallback(async () => {
    try { setSessoes((await api('sessoes_fotos?select=*&order=data_hora.asc')) || []) } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setSessoes([])
    }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])
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
      await carregar()
      if (recarregarResumo) recarregarResumo()
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      // Índice "uma sessão ativa por participação" (23505): já há sessão marcada.
      setAviso({ tom: 'erro', texto: /23505|duplicate|unique/i.test((e && e.message) || '') ? 'Sua marca já tem uma sessão marcada.' : 'Não deu para reservar agora. Tente de novo.' })
      await carregar()
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
        <Secao titulo="Sessão de fotos" nota="Quem fotografa é a organização. Data e local são definidos por ela.">
          {sessoes === null && <Carregando linhas={2} />}
          {sessoes && !jaTem && !liberado && (
            <p className="ui-nota">Aguardando liberação para foto. A sessão é marcada depois dela, e você recebe um aviso quando for liberado.</p>
          )}
          {sessoes && !jaTem && liberado && vagas.length === 0 && (
            <p className="ui-nota">Liberado para foto, ainda sem horário livre. Quando a organização abrir a agenda, os horários aparecem aqui.</p>
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
          {realizada && <p className="ui-nota">Sessão realizada. As fotos oficiais aparecem logo abaixo quando a organização publicar, e você recebe um aviso.</p>}
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
