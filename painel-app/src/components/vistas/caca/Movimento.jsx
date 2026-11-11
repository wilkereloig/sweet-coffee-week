import React from 'react'
import { Botao, Carregando, Erro, Secao, Selo } from '../../ui'
import { confirmar } from '../../Confirmar'
import { useLeitura } from '../../../lib/leituraVivaReact'
import { cacaApi, NIVEL_MOVIMENTO, resumoMovimento, textoFila } from '../../../lib/caca'
import { Tabela, useExecutar } from './comum'

/*
 * Movimento nas casas (docs/cartoon-2026-2/20-movimento-nas-casas.md). Presenças de cada unidade nas últimas 2 h, somando as
 * fontes: pessoas que avaliaram o combo ali ou carimbaram por GPS (uma vez por pessoa) + metade das leituras do QR da casa no
 * display. Desde a migration 20270129 o nível vem da OCUPAÇÃO estimada das mesas: presenças ÷ taxa da casa (rastros por combo
 * vendido) = combos em 2 h; × 30 min na mesa ÷ 1,5 combo por mesa ÷ mesas. Alto ≥ 70% · tranquila ≤ 30%. O site nunca diz "lotada".
 * O que o site mostra (selo "movimento acima do normal" e "boa hora para visitar") só sai com o interruptor ligado.
 */
const hh = (h) => `${String(h).padStart(2, '0')}h`
const horaNatal = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' })
const num = (n) => (n == null ? '—' : String(n).replace('.', ','))
const textoOcupacao = (u) => (u.mesas == null ? 'sem mesas cadastradas' : `${Math.round((u.ocupacao || 0) * 100)}% · ≈ ${u.combos} combos em 2 h · ${u.mesas} mesas`)

export function Movimento({ pode }) {
  const leitura = useLeitura(() => cacaApi.movimentoEstado(), ['carimbos'], { chave: 'caca-movimento' })
  // Avisos "Estamos com fila agora" que valem agora (da casa ou marcados aqui). Opcional: sem a função, a coluna some.
  const filas = useLeitura(() => cacaApi.filaAvisos(), ['carimbos'], { chave: 'caca-fila-avisos', opcional: true })
  const [ocupado, executar] = useExecutar()
  if (!pode('dado.ler')) return null
  if (leitura.bloqueada) return <Erro texto={leitura.erro} onTentar={leitura.recarregar} />
  if (!leitura.dados) return <Carregando />
  const m = resumoMovimento(leitura.dados)
  const filaDe = new Map((Array.isArray(filas.dados) ? filas.dados : []).map((f) => [f.unidade, f]))
  const gerir = pode('producao.gerir')
  async function trocarFila(u) {
    const r = await executar('fila-' + u.id, () => cacaApi.filaDefinir(u.id, !filaDe.has(u.id)))
    if (r) await filas.recarregar()
  }
  async function trocarPublico() {
    if (!m.publico && !(await confirmar('Ligar o movimento no site? O cartão e a página da casa passam a mostrar "Movimento acima do normal agora" nas casas com nível alto e "Boa hora para visitar" nas mais tranquilas que estiverem abertas, e o mapa ganha o filtro "Menos movimento agora". O site nunca diz que a casa está lotada.'))) return
    const r = await executar('publico', () => cacaApi.movimentoPublicoDefinir(!m.publico))
    if (r) await leitura.recarregar()
  }
  const resumo = Object.entries(m.niveis).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${NIVEL_MOVIMENTO[k].rotulo.toLowerCase()}`).join(' · ')

  return (
    <>
      <Secao titulo="Movimento agora" nota={`Presenças de cada casa nas últimas ${m.janelaHoras} h: pessoas que avaliaram o combo ali ou carimbaram por GPS (uma vez por pessoa) mais metade das leituras do QR da casa no display. O normal é a média da mesma janela nos ${m.diasBase} dias anteriores. Ocupação estimada = presenças convertidas em combos pela taxa da casa (rastros por combo vendido), 30 min na mesa, 1,5 combo por mesa, dividido pelas mesas. Alto: 70% ou mais · tranquila: 30% ou menos. Só conta o público do festival.`}>
        <p className="ui-nota" role="status">
          <Selo tom={m.publico ? 'ok' : 'neutro'}>{m.publico ? 'No site: ligado' : 'No site: desligado'}</Selo>{' '}
          {resumo || 'Nenhuma casa com presença ainda.'}
          {m.fotoEm ? ` O site lê a foto das ${horaNatal(m.fotoEm)} (refeita a cada 15 min).` : ' O site ainda não tem foto.'}
        </p>
        <div className="ui-linha-acoes">
          <Botao variante="secundario" onClick={leitura.recarregar}>Atualizar</Botao>
          {gerir && <Botao variante={m.publico ? 'secundario' : undefined} disabled={!!ocupado} aria-busy={ocupado === 'publico' || undefined} onClick={trocarPublico}>{m.publico ? 'Desligar no site' : 'Ligar no site…'}</Botao>}
        </div>
        <Tabela rotulo="Movimento por casa" colunas={['Casa', 'Presenças', 'Normal', 'Ocupação estimada', 'Nível', 'Fontes (avaliou · carimbou · QR)', 'Tinha fila?', 'Fila no mapa', 'Pico', 'Hoje']}>
          {m.unidades.map((u) => (
            <tr key={u.id}>
              <td>{u.nome}{u.bairro ? <span className="cp-sub"> · {u.bairro}</span> : null}</td>
              <td>{num(u.indice)}</td>
              <td>{num(u.normal)}</td>
              <td>{textoOcupacao(u)}</td>
              <td><Selo tom={NIVEL_MOVIMENTO[u.nivel].tom}>{NIVEL_MOVIMENTO[u.nivel].rotulo}</Selo>{u.tranquila ? <span className="cp-sub"> · tranquila</span> : null}</td>
              <td>{u.fontes.avaliacoes} · {u.fontes.carimbos} · {u.fontes.qr}</td>
              <td>{textoFila(u.fila) || '—'}</td>
              <td>
                {filaDe.has(u.id) ? `Até ${horaNatal(filaDe.get(u.id).ate)} (${filaDe.get(u.id).origem === 'marca' ? 'a casa' : 'organização'})` : '—'}
                {gerir && filas.dados && (
                  <Botao variante="secundario" disabled={!!ocupado} aria-busy={ocupado === 'fila-' + u.id || undefined} onClick={() => trocarFila(u)}>
                    {filaDe.has(u.id) ? 'Tirar fila' : 'Marcar fila (1 h)'}
                  </Botao>
                )}
              </td>
              <td>{u.pico == null ? '—' : hh(u.pico)}</td>
              <td>{u.hoje}</td>
            </tr>
          ))}
        </Tabela>
      </Secao>
      <Secao titulo="Displays para conferir" nota="Pelo QR da casa no display de mesa: nunca lido, parado há mais de 2 dias, ou muita leitura para pouco carimbo.">
        {m.displays.length === 0
          ? <p className="ui-nota">Nenhum display com sinal de problema.</p>
          : (
            <ul className="cp-fatos">
              {m.displays.map((d) => <li key={d.nome}><span>{d.nome}</span>{d.texto} ({d.leituras} leituras · {d.carimbos} carimbos)</li>)}
            </ul>
            )}
      </Secao>
      <Secao titulo="Presenças por hora" nota="Avaliações e carimbos por GPS de hoje (barra cheia) e a média dos dias anteriores (contorno), todas as casas somadas.">
        {m.horas.length === 0
          ? <p className="ui-nota">Sem presenças ainda.</p>
          : (
            <ul className="cp-horas" aria-label="Presenças por hora, hoje e média">
              {m.horas.map((h) => (
                <li key={h.hora}>
                  <span className="cp-horas__rotulo">{hh(h.hora)}</span>
                  <span className="cp-horas__trilho" aria-hidden="true">
                    <span className="cp-horas__hoje" style={{ width: `${(h.hoje / m.maximo) * 100}%` }} />
                    {h.media != null && <span className="cp-horas__media" style={{ width: `${(h.media / m.maximo) * 100}%` }} />}
                  </span>
                  <span className="cp-horas__num">{h.hoje} hoje · {num(h.media)} média</span>
                </li>
              ))}
            </ul>
            )}
      </Secao>
    </>
  )
}
