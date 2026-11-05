import React from 'react'
import { useLeitura } from '../../../lib/leituraVivaReact'
import { Botao, Carregando, Erro, Secao, Selo, Vazio } from '../../ui'
import { pedirTexto, avisar } from '../../Confirmar'
import { cacaApi, rotuloOrigem, horaNatal } from '../../../lib/caca'
import { useExecutar, Tabela, contatoDe, AvisoOk } from './comum'
import { ResumoSemGps } from './SemGps'

/*
 * Carimbos válidos sem prova de localização conferida (unidade sem ponto, ou exceção aprovada pelo painel). Quem pede
 * exceção ao GPS decide na aba "Pedidos de presença" (15-caca-gps-excecao.md): aqui a organização confere o que já
 * entrou e, se algo não fecha, anula com justificativa.
 */
export function Revisao({ edicao, pode }) {
  const lista = useLeitura(() => cacaApi.revisao(edicao), ['carimbos'], { chave: edicao })
  const [ocupado, executar] = useExecutar()
  const [aviso, setAviso] = React.useState('')
  const gerir = pode('producao.gerir')
  const contato = pode('relatorio.ler')

  async function anular(c) {
    const motivo = await pedirTexto(`O carimbo de ${c.apelido} em ${c.casa} sai do placar e do sorteio, e o banco guarda o motivo. Não dá para desfazer por aqui.`, { rotulo: 'Justificativa (obrigatória)' }, { titulo: 'Anular este carimbo?', acao: 'Anular', perigo: true })
    if (motivo === null) return
    if (!motivo.trim()) { await avisar('Escreva a justificativa: ela fica no histórico do carimbo.'); return }
    const ok = await executar(c.carimbo_id, () => cacaApi.anularCarimbo(c.carimbo_id, motivo.trim()))
    if (ok === undefined) return
    await lista.recarregar()
    setAviso(ok === false ? 'Esse carimbo já estava anulado.' : `Carimbo de ${c.apelido} anulado.`)
  }

  if (lista.bloqueada) return <Erro texto={lista.erro} onTentar={lista.recarregar} />
  if (!lista.dados) return <Carregando />
  const r = lista.dados
  const itens = r.carimbos || []
  const colunas = ['Apelido', 'Quando', 'Casa', 'Origem', 'Distância', ...(contato ? ['Contato'] : []), ...(gerir ? ['Ação'] : [])]
  return (
    <div className="ui-pilha">
      <AvisoOk texto={aviso} onFechar={() => setAviso('')} />
      <ResumoSemGps edicao={edicao} />
      <Secao titulo="Carimbos sem localização conferida" nota="O carimbo entra, mas a unidade não tem ponto conferido (Participantes › Localizações) ou o carimbo veio de uma exceção. Confira antes de apurar um dia ou sortear.">
        {!itens.length ? <Vazio titulo="Nada para revisar">Todos os carimbos válidos têm a localização conferida.</Vazio> : (
          <>
            <p className="ui-nota">{r.total > itens.length ? `Mostrando os ${itens.length} mais recentes de ${r.total}.` : `${r.total} carimbo${r.total === 1 ? '' : 's'}.`}</p>
            <Tabela rotulo="Carimbos para revisar" colunas={colunas}>
              {itens.map((c) => (
                <tr key={c.carimbo_id}>
                  <th scope="row">{c.apelido}</th>
                  <td>{horaNatal(c.criado_em)}</td>
                  <td className="cp-nota-celula">{c.casa}{c.nome_unidade ? ` · ${c.nome_unidade}` : ''}</td>
                  <td><Selo tom="atencao">{rotuloOrigem(c.origem)}</Selo></td>
                  <td>{c.distancia_m != null ? `${c.distancia_m} m${c.precisao_m != null ? ` (±${c.precisao_m} m)` : ''}` : '—'}</td>
                  {contato && <td>{contatoDe(c) || '—'}</td>}
                  {gerir && <td><Botao variante="secundario" disabled={!!ocupado} aria-label={`Anular o carimbo de ${c.apelido} em ${c.casa}`} onClick={() => anular(c)}>Anular</Botao></td>}
                </tr>
              ))}
            </Tabela>
          </>
        )}
      </Secao>
    </div>
  )
}
