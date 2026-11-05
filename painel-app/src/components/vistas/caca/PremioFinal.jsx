import React from 'react'
import { Botao, Carregando, Erro, Secao, Selo } from '../../ui'
import { confirmar, pedirTexto } from '../../Confirmar'
import {
  cacaApi, compararSimulacoes, pesoTotal, validarSemente, ROTULO_REGRA, rotuloMotivo, SORTEIO_OFICIAL_LIBERADO, realizarSorteioOficial, lerRegras,
} from '../../../lib/caca'
import { useExecutar, AvisoOk, Tabela, contatoDe, baixarCsv } from './comum'
import { PremiosTabela, useAcoesDePremio } from './PremiosTabela'

/*
 * Prêmio final (spec 15 §6): concorre quem validou todas as casas; peso = base + carimbos extras; ganhadores sem
 * reposição. Aqui só SIMULA: o servidor devolve a lista de concorrentes, o hash de verificação e os ganhadores com a
 * semente informada, e rodar de novo com a MESMA semente tem que dar exatamente o mesmo. A surpresa do prêmio
 * não aparece em lugar nenhum desta tela.
 */

export function PremioFinal({ edicao, pode, dados }) {
  const { premios: p, config: c } = dados
  const podeGerir = pode('edicao.gerir')
  const contato = pode('relatorio.ler')
  const [ocupado, executar] = useExecutar()
  const [semente, setSemente] = React.useState('')
  const [erroSemente, setErroSemente] = React.useState('')
  const [sim, setSim] = React.useState(null)
  const [repeticao, setRepeticao] = React.useState(null)
  const acoes = useAcoesDePremio({ premios: p.dados?.premios || [], apuracoes: p.dados?.apuracoes || [], config: c.dados, recarregar: p.recarregar })

  if (p.bloqueada) return <Erro texto={p.erro} onTentar={p.recarregar} />
  if (!p.dados) return <Carregando />
  const finais = (p.dados.premios || []).filter((x) => x.tipo === 'final')

  async function simular() {
    const v = validarSemente(semente)
    setErroSemente(v.ok ? '' : v.erro)
    if (!v.ok) return
    setRepeticao(null)
    const r = await executar('simular', () => cacaApi.sortear(edicao, v.semente))
    if (r) setSim(r)
  }
  async function reproduzir() {
    if (!sim) return
    const r = await executar('reproduzir', () => cacaApi.sortear(edicao, sim.semente))
    if (r) setRepeticao(compararSimulacoes(sim, r))
  }
  function baixarConcorrentes() {
    baixarCsv('caca-concorrentes-simulacao.csv', [
      ['apelido', 'casas', 'extras', 'peso', ...(contato ? ['email', 'whatsapp'] : [])],
      ...sim.concorrentes.map((x) => [x.apelido, x.casas, x.extras, x.peso, ...(contato ? [x.email, x.whatsapp] : [])]),
    ])
  }

  return (
    <div className="ui-pilha">
      <AvisoOk texto={acoes.aviso} onFechar={acoes.limparAviso} />
      <Secao titulo="Quem concorre e simulação do sorteio" nota="Concorre quem validou todas as casas. Cada carimbo extra soma 1 ao peso; o peso mostra a vantagem relativa, não uma chance garantida. Ganhar voucher do dia não tira ninguém do prêmio final. A simulação não grava nada.">
        {!podeGerir ? <p className="ui-nota">Só quem gerencia a edição simula o sorteio.</p> : (
          <div className="ui-pilha">
            <div className="cp-semente">
              <label className="og-campo">
                <span>Semente da simulação</span>
                <input type="text" value={semente} maxLength={200} aria-invalid={erroSemente ? 'true' : undefined} aria-describedby="cp-semente-ajuda"
                  onChange={(e) => { setSemente(e.target.value); setErroSemente('') }} onKeyDown={(e) => { if (e.key === 'Enter') simular() }} />
              </label>
              <Botao disabled={!!ocupado} aria-busy={ocupado === 'simular' || undefined} onClick={simular}>Simular sorteio</Botao>
            </div>
            <p id="cp-semente-ajuda" className="ui-nota">Qualquer frase combinada com testemunhas serve. Quem tiver a mesma semente e a mesma lista chega ao mesmo resultado.</p>
            {erroSemente && <p className="ui-nota ui-nota--erro" role="alert">{erroSemente}</p>}
          </div>
        )}
        {sim && <Simulacao sim={sim} contato={contato} repeticao={repeticao} ocupado={ocupado} onReproduzir={reproduzir} onBaixar={baixarConcorrentes} />}
        {c.dados && <p className="ui-nota">Regras em vigor: peso base {lerRegras(c.dados).pesoBase}, {lerRegras(c.dados).ganhadoresFinal} ganhadores (mudam em Regras e prazos, só para sorteios futuros).</p>}
      </Secao>

      <Secao titulo="Prêmios finais registrados" nota="Só existem depois do sorteio oficial. Confirmar, entregar, expirar e cancelar ficam na auditoria.">
        <PremiosTabela premios={finais} tipo="final" podeGerir={podeGerir} contato={contato} config={c.dados} acoes={acoes} vazio="O sorteio oficial ainda não foi realizado." />
      </Secao>

      <SorteioOficial edicao={edicao} podeGerir={podeGerir} sim={sim} onFeito={p.recarregar} />
    </div>
  )
}

function Simulacao({ sim, contato, repeticao, ocupado, onReproduzir, onBaixar }) {
  return (
    <div className="cp-simulacao">
      <p className="cp-faixa-sim"><Selo tom="atencao">SIMULAÇÃO — nada foi gravado</Selo></p>
      <ul className="cp-fatos">
        <li><span>Semente</span><code>{sim.semente}</code></li>
        <li><span>Regra aplicada</span>{ROTULO_REGRA[sim.regra] || sim.regra}</li>
        <li><span>Completaram as {sim.total_casas} casas</span>{sim.completos}</li>
        <li><span>Ganhadores</span>{sim.ganhadores_final}</li>
        <li><span>Peso base</span>{sim.peso_base}</li>
        <li><span>Peso somado</span>{pesoTotal(sim.concorrentes)}</li>
        <li><span>Código de verificação</span><code className="cp-hash">{sim.hash_verificacao}</code></li>
      </ul>

      <div className="cp-verificar">
        <Botao variante="secundario" disabled={!!ocupado} aria-busy={ocupado === 'reproduzir' || undefined} onClick={onReproduzir}>Repetir com a mesma semente</Botao>
        {repeticao && (repeticao.igual
          ? <p className="ui-nota ui-nota--ok" role="status">Confere: mesma semente, mesmo código de verificação, mesmos concorrentes e mesmos ganhadores, na mesma ordem.</p>
          : <p className="ui-nota ui-nota--erro" role="alert">DIFERENTE. {!repeticao.mesmoHash && 'O código de verificação mudou. '}{!repeticao.mesmosConcorrentes && 'A lista de concorrentes mudou (alguém completou ou teve carimbo anulado). '}{!repeticao.mesmosGanhadores && 'Os ganhadores mudaram. '}Não use esta simulação como prova.</p>)}
      </div>

      <h3 className="cp-dia__titulo">Ganhadores da simulação</h3>
      {!sim.ganhadores.length ? <p className="ui-nota">Ninguém completou o mapa ainda: não há ganhadores nesta simulação.</p> : (
        <Tabela rotulo="Ganhadores da simulação" colunas={['Ordem', 'Apelido', 'Casas', 'Extras', 'Peso', 'Como entrou', ...(contato ? ['Contato'] : [])]}>
          {sim.ganhadores.map((g) => (
            <tr key={g.posicao}><td>{g.posicao}</td><th scope="row">{g.apelido}</th><td>{g.casas}</td><td>{g.extras}</td><td>{g.peso}</td><td className="cp-nota-celula">{rotuloMotivo(g.motivo)}</td>{contato && <td>{contatoDe(g) || '—'}</td>}</tr>
          ))}
        </Tabela>
      )}

      <div className="cp-simulacao__lista">
        <h3 className="cp-dia__titulo">Concorrentes ({sim.concorrentes.length})</h3>
        {sim.concorrentes.length > 0 && <Botao icone="baixar" variante="secundario" onClick={onBaixar}>Lista (CSV)</Botao>}
      </div>
      {!sim.concorrentes.length ? <p className="ui-nota">Ninguém completou as {sim.total_casas} casas até agora.</p> : (
        <Tabela rotulo="Concorrentes ao prêmio final" colunas={['Apelido', 'Casas', 'Extras', 'Peso', ...(contato ? ['Contato'] : [])]}>
          {sim.concorrentes.map((x) => (
            <tr key={x.apelido + x.peso + (x.email || '')}><th scope="row">{x.apelido}</th><td>{x.casas}</td><td>{x.extras}</td><td>{x.peso}</td>{contato && <td>{contatoDe(x) || '—'}</td>}</tr>
          ))}
        </Tabela>
      )}
    </div>
  )
}

/**
 * O sorteio que vale. Fica separado, em duas etapas e travado por `SORTEIO_OFICIAL_LIBERADO` (lib/caca.js): enquanto
 * a trava estiver desligada o botão não faz nada e a função nem monta a chamada que grava.
 */
function SorteioOficial({ edicao, podeGerir, sim, onFeito }) {
  const [ocupado, executar] = useExecutar()
  const [feito, setFeito] = React.useState('')
  if (!podeGerir) return null

  async function realizar() {
    if (!sim) return
    const ok = await confirmar(`Etapa 1 de 2. O sorteio oficial grava os ${sim.ganhadores_final} prêmios finais e não se repete nesta edição. Vale a semente "${sim.semente}" e o código de verificação ${sim.hash_verificacao}. Os concorrentes já foram publicados e conferidos?`, { titulo: 'Realizar o sorteio oficial?', acao: 'Continuar', perigo: true })
    if (!ok) return
    const digitado = await pedirTexto('Etapa 2 de 2. Para confirmar, escreva SORTEAR.', { rotulo: 'Confirmação' }, { titulo: 'Última confirmação', acao: 'Realizar o sorteio', perigo: true })
    if (digitado === null || digitado.trim() !== 'SORTEAR') return
    const r = await executar('oficial', () => realizarSorteioOficial(edicao, sim.semente, sim))
    if (!r) return
    await onFeito()
    setFeito('Sorteio oficial realizado. Os prêmios finais estão na lista acima.')
  }

  return (
    <Secao titulo="Sorteio oficial" nota="Separado de propósito. Só roda com a simulação feita acima, em duas confirmações, uma única vez por edição.">
      <div className="cp-oficial">
        <AvisoOk texto={feito} />
        <p className="ui-nota">
          {SORTEIO_OFICIAL_LIBERADO ? 'Liberado. Confira a simulação acima antes de continuar.' : 'Desativado nesta versão: o sorteio oficial ainda não foi liberado pela organização. Por enquanto, só a simulação.'}
        </p>
        <Botao variante="secundario" className="og-btn--perigo" disabled={!SORTEIO_OFICIAL_LIBERADO || !sim || !!ocupado} aria-disabled={!SORTEIO_OFICIAL_LIBERADO || !sim || undefined} onClick={realizar}>Realizar o sorteio oficial</Botao>
      </div>
    </Secao>
  )
}
