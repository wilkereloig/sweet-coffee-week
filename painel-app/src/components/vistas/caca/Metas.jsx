import React from 'react'
import { Botao, Secao, Selo } from '../../ui'
import { METAS_EXEMPLO, validarMetas, sqlDasMetas } from '../../../lib/caca'

/*
 * Metas comemorativas (spec 15 §13): marcos por casas validadas, configuráveis, sem prometer prêmio.
 * ⚠️ O painel ainda NÃO consegue ler nem gravar os marcos: eles moram em `caca_config` (tabela fechada) e não há
 * função de painel para isso. Esta tela é um rascunho que valida as mesmas regras do banco e entrega o comando
 * pronto; quem tem acesso ao banco aplica. Os números abaixo são os de EXEMPLO com que o banco nasceu.
 */
export function Metas({ dados }) {
  const total = (dados.premios.dados?.apuracoes || [])[0]?.total_casas
  const [linhas, setLinhas] = React.useState(() => METAS_EXEMPLO.map((m) => ({ casas: String(m.casas), titulo: m.titulo })))
  const [copiado, setCopiado] = React.useState(false)
  const v = validarMetas(linhas, total)
  const sql = v.ok ? sqlDasMetas(v.metas) : ''

  const mudar = (i, campo, valor) => { setCopiado(false); setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l))) }
  async function copiar() {
    try { await navigator.clipboard.writeText(sql); setCopiado(true) } catch { setCopiado(false) }
  }

  return (
    <div className="ui-pilha">
      <Secao titulo="Metas comemorativas" nota="Marcos por casas validadas, mostrados na Central da Caça. Servem para comemorar: nenhum marco promete prêmio.">
        <p className="ui-nota cp-proposta"><Selo tom="atencao">EXEMPLO — números ainda não decididos</Selo> Os marcos que o banco traz são 5, 10, 20 e todas as casas. Confirme os números antes de aplicar.</p>
        <p className="ui-nota">O painel ainda não grava os marcos: monte aqui, confira e copie o comando para quem cuida do banco aplicar.</p>
        <div className="cp-metas">
          {linhas.map((l, i) => (
            <div key={i} className="cp-metas__linha">
              <label className="og-campo"><span>Casas validadas</span>
                <input type="number" inputMode="numeric" min="1" max={total || undefined} value={l.casas} onChange={(e) => mudar(i, 'casas', e.target.value)} /></label>
              <label className="og-campo cp-metas__titulo"><span>Título do marco</span>
                <input type="text" maxLength={60} value={l.titulo} onChange={(e) => mudar(i, 'titulo', e.target.value)} /></label>
              <Botao soIcone icone="lixeira" variante="secundario" onClick={() => { setCopiado(false); setLinhas((ls) => ls.filter((_, j) => j !== i)) }}>{`Remover o marco ${i + 1}`}</Botao>
            </div>
          ))}
        </div>
        <div className="ui-linha-acoes">
          <Botao icone="mais" variante="secundario" onClick={() => { setCopiado(false); setLinhas((ls) => [...ls, { casas: '', titulo: '' }]) }}>Incluir marco</Botao>
          <Botao variante="secundario" onClick={() => { setCopiado(false); setLinhas(METAS_EXEMPLO.map((m) => ({ casas: String(m.casas), titulo: m.titulo }))) }}>Voltar aos exemplos</Botao>
        </div>
        {total ? <p className="ui-nota">A edição tem {total} casas: marcos acima disso nunca seriam alcançados.</p> : <p className="ui-nota">O total de casas aparece depois da primeira apuração de dia; até lá só confiro o mínimo.</p>}
        {!v.ok ? (
          <ul className="ui-nota ui-nota--erro cp-erros" role="alert">{v.erros.map((e) => <li key={e}>{e}</li>)}</ul>
        ) : (
          <div className="ui-pilha">
            <p className="ui-nota ui-nota--ok" role="status">Marcos válidos: {v.metas.map((m) => `${m.casas} — ${m.titulo}`).join(' · ')}.</p>
            <label className="og-campo"><span>Comando para o banco</span><textarea readOnly rows={4} value={sql} onFocus={(e) => e.target.select()} /></label>
            <div className="ui-linha-acoes"><Botao icone="copiar" variante="secundario" onClick={copiar}>Copiar comando</Botao>{copiado && <span role="status" className="ui-nota">Copiado.</span>}</div>
          </div>
        )}
      </Secao>
    </div>
  )
}
