import React from 'react'
import { api } from '../../lib/marcaApi'
import { dataHoraCurta } from '../../lib/painelFormat'
import { ROTULO_SESSAO } from '../../lib/participantes'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Secao } from '../ui'
import { ICONE_MARCA } from '../PainelMarcaShell'
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
      setAviso(r && r.length ? { tom: 'ok', texto: 'Horário reservado.' } : { tom: 'erro', texto: 'Esse horário acabou de ser escolhido por outra marca. Escolha outro.' })
      await carregar()
      if (recarregarResumo) recarregarResumo()
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setAviso({ tom: 'erro', texto: 'Não deu para reservar agora. Tente de novo.' })
    } finally {
      setReservando(null)
    }
  }

  const minhas = (sessoes || []).filter((s) => s.participante_id && s.status !== 'aberto')
  const vagas = (sessoes || []).filter((s) => s.status === 'aberto')
  const jaTem = minhas.some((s) => s.status !== 'cancelada')
  const liberado = participacao && participacao.foto_liberacao === 'liberado'

  return (
    <section className="ui-vista-marca">
      <VistaCabeca acento="magenta" viewBox="0 0 32 32" strokeWidth={2.2} icone={ICONE_MARCA.fotos} titulo="Fotos" nota="Sessão de fotos, fotos oficiais e o guia" />
      <div className="ui-grade-duas">
        <Secao titulo="Sessão de fotos" nota="Quem fotografa é a organização. Data e local são definidos por ela.">
          {sessoes === null && <Carregando linhas={2} />}
          {sessoes && minhas.length === 0 && vagas.length === 0 && (
            <p className="ui-nota">{liberado ? 'Ainda sem horário. Quando a organização abrir a agenda, você recebe um aviso.' : 'A sessão é marcada depois da liberação para foto. Você recebe um aviso.'}</p>
          )}
          {minhas.length > 0 && (
            <ul className="ui-lista-simples">
              {minhas.map((s) => (
                <li key={s.id}>
                  <b>{[dataHoraCurta(s.data_hora), s.local || ''].filter(Boolean).join(' · ')}</b>
                  <span><span className="og-selo" data-tom={s.status === 'realizada' ? 'ok' : s.status === 'cancelada' ? 'encerrado' : 'andamento'}>{ROTULO_SESSAO[s.status] || s.status}</span>{s.observacoes ? ' ' + s.observacoes : ''}</span>
                </li>
              ))}
            </ul>
          )}
          {vagas.length > 0 && !jaTem && (
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
