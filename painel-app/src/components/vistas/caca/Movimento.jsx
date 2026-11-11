import React from 'react'
import { Botao, Carregando, Erro, Secao, Selo } from '../../ui'
import { useLeitura } from '../../../lib/leituraVivaReact'
import { cacaApi, NIVEL_MOVIMENTO, resumoMovimento, textoFila } from '../../../lib/caca'
import { Tabela, useExecutar } from './comum'

/*
 * Movimento nas casas (docs/cartoon-2026-2/20-movimento-nas-casas.md, parte A). Só para a organização: carimbos feitos
 * no local (GPS) nas últimas 2 h de cada unidade, comparados com a média dela na mesma janela dos dias anteriores.
 * É movimento de quem joga a Caça, não lotação da casa: uma casa cheia de quem não joga aparece calma.
 */
const hh = (h) => `${String(h).padStart(2, '0')}h`
const horaNatal = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' })
const num = (n) => (n == null ? '—' : String(n).replace('.', ','))

export function Movimento({ pode }) {
  const leitura = useLeitura(() => cacaApi.movimentoEstado(), ['carimbos'], { chave: 'caca-movimento' })
  // Parte B: avisos "Estamos com fila agora" que valem agora (da casa ou marcados aqui). Opcional: sem a função, a coluna some.
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
  const resumo = Object.entries(m.niveis).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${NIVEL_MOVIMENTO[k].rotulo.toLowerCase()}`).join(' · ')

  return (
    <>
      <Secao titulo="Movimento agora" nota={`Carimbos feitos no local (GPS) nas últimas ${m.janelaHoras} h, comparados com a média de cada casa na mesma janela dos ${m.diasBase} dias anteriores. Delivery, visita anterior e exceção aprovada não entram. Mede quem joga a Caça, não a lotação: casa cheia de quem não joga aparece calma. Com menos de 3 carimbos na janela, fica "pouco dado". "Tinha fila?" é a resposta opcional de quem carimbou nessas horas. "Fila no mapa" é o aviso que a casa liga no painel dela (ou a organização, em nome dela): aparece no mapa por 1 h.`}>
        <p className="ui-nota" role="status">{resumo || 'Nenhuma casa com carimbo ainda.'}</p>
        <div className="ui-linha-acoes"><Botao variante="secundario" onClick={leitura.recarregar}>Atualizar</Botao></div>
        <Tabela rotulo="Movimento por casa" colunas={['Casa', `Últimas ${m.janelaHoras} h`, 'Normal', 'Nível', 'Tinha fila?', 'Fila no mapa', 'Pico', 'Hoje']}>
          {m.unidades.map((u) => (
            <tr key={u.id}>
              <td>{u.nome}{u.bairro ? <span className="cp-sub"> · {u.bairro}</span> : null}</td>
              <td>{u.janela}</td>
              <td>{num(u.normal)}</td>
              <td><Selo tom={NIVEL_MOVIMENTO[u.nivel].tom}>{NIVEL_MOVIMENTO[u.nivel].rotulo}</Selo></td>
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
      <Secao titulo="Carimbos por hora" nota="Hoje (barra cheia) e a média dos dias anteriores (contorno), todas as casas somadas.">
        {m.horas.length === 0
          ? <p className="ui-nota">Sem carimbos ainda.</p>
          : (
            <ul className="cp-horas" aria-label="Carimbos por hora, hoje e média">
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
