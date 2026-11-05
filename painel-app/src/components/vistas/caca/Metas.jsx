import React from 'react'
import { Botao, Carregando, Erro, Secao, Selo } from '../../ui'
import { confirmar } from '../../Confirmar'
import { useLeitura } from '../../../lib/leituraVivaReact'
import { cacaApi, validarMetas, linhaDoMarco, metasMudaram, MARCO_TIPOS, META_LIMITE, horaNatal } from '../../../lib/caca'
import { useExecutar, AvisoOk } from './comum'

/*
 * Metas comemorativas (spec 15 §13): marcos por casas validadas, mostrados na Central da Caça. Servem para comemorar:
 * NENHUM marco promete prêmio (os benefícios são os vouchers do dia e o prêmio final). Os marcos são relativos ao total de
 * casas (1, cerca de 1/3, cerca de 2/3, todas): o marco "todas" acompanha o total da edição. Lê `caca_metas_painel_ler` e
 * grava `caca_metas_gravar` (edicao.gerir), que valida de novo, audita e avisa os outros painéis abertos.
 */
export function Metas({ edicao, pode }) {
  const leitura = useLeitura(() => cacaApi.metas(edicao), ['carimbos'], { chave: `caca-metas-${edicao}` })
  const [ocupado, executar] = useExecutar()
  const [aviso, setAviso] = React.useState('')
  const dados = leitura.dados
  const doBanco = React.useMemo(() => (dados?.marcos || []).map(linhaDoMarco), [dados])
  const assinatura = JSON.stringify(dados?.marcos)
  const [linhas, setLinhas] = React.useState(null)
  // Valor novo do banco (outra pessoa mudou, ou acabamos de salvar) refaz o formulário.
  React.useEffect(() => { if (dados) setLinhas(doBanco) }, [assinatura]) // eslint-disable-line react-hooks/exhaustive-deps

  if (leitura.bloqueada) return <Erro texto={leitura.erro} onTentar={leitura.recarregar} />
  if (!dados || !linhas) return <Carregando />

  const podeGravar = pode('edicao.gerir')
  const total = dados.total_casas || 0
  const v = validarMetas(linhas, total)
  const mudou = metasMudaram(v.marcos, dados.marcos)
  const mudar = (i, campo, valor) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)))

  async function salvar() {
    const ok = await confirmar(`Os marcos passam a ser: ${v.marcos.map((m, i) => `${m.titulo} (${v.previa[i]} ${v.previa[i] === 1 ? 'casa' : 'casas'})`).join(' · ')}. Isso entra na auditoria e vale já para quem abrir a Central.`, { titulo: 'Mudar os marcos?', acao: 'Mudar' })
    if (!ok) return
    const r = await executar('metas', () => cacaApi.gravarMetas(v.marcos))
    if (!r) return
    await leitura.recarregar()
    setAviso('Marcos salvos.')
  }

  return (
    <div className="ui-pilha">
      <AvisoOk texto={aviso} onFechar={() => setAviso('')} />
      <Secao titulo="Metas comemorativas" nota="Marcos por casas diferentes validadas, mostrados na Central da Caça. Servem para comemorar: nenhum marco promete prêmio.">
        {dados.nota && <p className="ui-nota cp-proposta"><Selo tom="atencao">Decisão técnica — revisável</Selo> {dados.nota}</p>}
        <p className="ui-nota">A edição conta <strong>{total}</strong> {total === 1 ? 'casa' : 'casas'} hoje. Os marcos em parte das casas e o marco "todas as casas" se ajustam sozinhos se esse total mudar.</p>
        {!podeGravar && <p className="ui-nota">Você só lê estes marcos. Mudar é com quem gerencia a edição.</p>}
        <div className="cp-metas">
          {linhas.map((l, i) => (
            <LinhaMarco key={i} i={i} l={l} leitura={!podeGravar} casas={v.previa[i]} onMudar={mudar}
              onRemover={() => setLinhas((ls) => ls.filter((_, j) => j !== i))} />
          ))}
        </div>
        {podeGravar && (
          <div className="ui-linha-acoes">
            <Botao icone="mais" variante="secundario" disabled={linhas.length >= META_LIMITE.marcos}
              onClick={() => setLinhas((ls) => [...ls, { tipo: 'casas', valor: '', titulo: '' }])}>Incluir marco</Botao>
            <Botao variante="secundario" disabled={!mudou && JSON.stringify(linhas) === JSON.stringify(doBanco)} onClick={() => setLinhas(doBanco)}>Desfazer mudanças</Botao>
          </div>
        )}
        {!v.ok ? (
          <ul className="ui-nota ui-nota--erro cp-erros" role="alert">{v.erros.map((e) => <li key={e}>{e}</li>)}</ul>
        ) : (
          <>
            {v.avisos.length > 0 && <ul className="ui-nota cp-erros">{v.avisos.map((e) => <li key={e}>{e}</li>)}</ul>}
            <p className="ui-nota ui-nota--ok" role="status">Como fica hoje: {v.marcos.map((m, i) => `${v.previa[i]} — ${m.titulo}`).join(' · ')}.</p>
          </>
        )}
        {podeGravar && (
          <div className="ui-linha-acoes">
            <Botao disabled={!mudou || !v.ok || !!ocupado} aria-busy={ocupado === 'metas' || undefined} onClick={salvar}>Salvar marcos</Botao>
          </div>
        )}
        {dados.atualizado_em && <p className="ui-nota cp-meta">Última mudança: {horaNatal(dados.atualizado_em)}{dados.atualizado_por ? ` por ${dados.atualizado_por}` : ''}</p>}
      </Secao>
    </div>
  )
}

function LinhaMarco({ i, l, leitura, casas, onMudar, onRemover }) {
  const id = React.useId()
  const numerico = l.tipo !== 'todas'
  return (
    <div className="cp-metas__linha">
      <label className="og-campo"><span>Tipo do marco {i + 1}</span>
        <select value={l.tipo} disabled={leitura} onChange={(e) => onMudar(i, 'tipo', e.target.value)}>
          {MARCO_TIPOS.map(([k, rotulo]) => <option key={k} value={k}>{rotulo}</option>)}
        </select></label>
      {numerico && (
        <label className="og-campo"><span>{l.tipo === 'percentual' ? 'Parte das casas (%)' : 'Casas validadas'}</span>
          <input type="number" inputMode="numeric" min="1" max={l.tipo === 'percentual' ? 99 : META_LIMITE.casas} value={l.valor} disabled={leitura}
            aria-describedby={`${id}-casas`} onChange={(e) => onMudar(i, 'valor', e.target.value)} /></label>
      )}
      <label className="og-campo cp-metas__titulo"><span>Título do marco {i + 1}</span>
        <input type="text" maxLength={META_LIMITE.titulo} value={l.titulo} disabled={leitura} onChange={(e) => onMudar(i, 'titulo', e.target.value)} /></label>
      <p id={`${id}-casas`} className="ui-nota cp-metas__vale">{casas ? `Hoje: ${casas} ${casas === 1 ? 'casa' : 'casas'}` : ''}</p>
      {!leitura && <Botao soIcone icone="lixeira" variante="secundario" onClick={onRemover}>{`Remover o marco ${i + 1}`}</Botao>}
    </div>
  )
}
