import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Folha } from '../Folha'
import { Icone } from '../Icone'
import { Botao, traduzirErro } from '../ui'
import { confirmar } from '../Confirmar'
import * as P from '../../lib/pastas'
import * as C from '../../lib/campanhas'
import { usePendencia } from '../../lib/pendencias'

/*
 * Formulário de campanha (21/10/2026) — o mesmo para a aba Campanhas e para "Nova campanha…" dentro da ficha da postagem.
 * Monta já aberto (quem usa renderiza só enquanto precisa dele). "Salvo" só depois da resposta do servidor; o que foi digitado e
 * não salvo conta como trabalho pendente (a atualização do painel não passa por cima).
 */
const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }
const textoErro = (m) => C.traduzirErroCampanha(m) || traduzirErro(m)

const doBanco = (c) => (c
  ? { nome: c.nome || '', cor: c.cor || 'amarelo', descricao: c.descricao || '', inicio: c.inicio || '', fim: c.fim || '', meta: c.meta == null ? '' : String(c.meta) }
  : { ...C.CAMPANHA_VAZIA })

export function FormularioCampanha({ campanha = null, onFechar, onSalvou }) {
  const [f, setF] = React.useState(() => doBanco(campanha))
  const [salvando, setSalvando] = React.useState(false)
  const [erro, setErro] = React.useState(null)
  const [tocou, setTocou] = React.useState(false)
  const base = React.useMemo(() => doBanco(campanha), [campanha])
  const sujo = JSON.stringify(f) !== JSON.stringify(base)
  usePendencia(sujo && !salvando, { rotulo: campanha ? 'Campanha “' + campanha.nome + '” (não salva)' : 'Nova campanha (não salva)' })
  const mudar = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErro(null) }
  const v = C.validarCampanha(f)

  async function salvar(ev) {
    ev.preventDefault()
    setTocou(true)
    if (!v.ok) return
    setSalvando(true); setErro(null)
    try {
      const salva = await rpc('redes_campanha_salvar', { p_secret: lerSenha(), p_id: campanha ? campanha.id : null, p_dados: C.dadosParaSalvar(f) })
      onSalvou(salva)
    } catch (e) { setErro(textoErro(e.message)) } finally { setSalvando(false) }
  }
  async function fechar() {
    if (sujo && !salvando && !(await confirmar('Descartar o que foi digitado nesta campanha?'))) return
    onFechar()
  }

  return (
    <Folha aberto titulo={campanha ? 'Editar campanha' : 'Nova campanha'} sub="Agrupa as postagens de uma mesma ação (ex.: Confirmados, Contagem regressiva)." onFechar={fechar}>
      <form className="ui-form" onSubmit={salvar} noValidate>
        <label className="og-campo"><span>Nome</span>
          <input type="text" maxLength={C.LIMITE_NOME} required autoFocus value={f.nome} onChange={(e) => mudar('nome', e.target.value)} aria-invalid={tocou && !!v.erros.nome} />
          {tocou && v.erros.nome && <small className="rd-campo__nota rd-campo__nota--erro" role="alert">{v.erros.nome}</small>}
        </label>
        <div role="radiogroup" aria-label="Cor da campanha">
          <p className="ui-nota">Cor</p>
          <ul className="bb-cores">
            {P.CORES_PASTA.map((c) => (
              <li key={c.chave}>
                <button type="button" role="radio" aria-checked={f.cor === c.chave} className="bb-cor" onClick={() => mudar('cor', c.chave)}>
                  <span className="bb-cor__amostra" style={P.estiloPasta(c.chave)} aria-hidden="true"><Icone nome={f.cor === c.chave ? 'feito' : 'tema'} tamanho={20} /></span>{c.rotulo}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <label className="og-campo"><span>Descrição <em>(opcional)</em></span>
          <textarea rows={3} maxLength={C.LIMITE_DESCRICAO} value={f.descricao} onChange={(e) => mudar('descricao', e.target.value)} />
        </label>
        <div className="ui-form--linha-dupla">
          <label className="og-campo"><span>Início <em>(opcional)</em></span>
            <input type="date" value={f.inicio} onChange={(e) => mudar('inicio', e.target.value)} />
          </label>
          <label className="og-campo"><span>Fim <em>(opcional)</em></span>
            <input type="date" value={f.fim} min={f.inicio || undefined} onChange={(e) => mudar('fim', e.target.value)} aria-invalid={tocou && !!v.erros.fim} />
            {tocou && v.erros.fim && <small className="rd-campo__nota rd-campo__nota--erro" role="alert">{v.erros.fim}</small>}
          </label>
        </div>
        <label className="og-campo"><span>Meta de postagens publicadas <em>(opcional)</em></span>
          <input type="number" min="0" step="1" inputMode="numeric" value={f.meta} onChange={(e) => mudar('meta', e.target.value)} aria-invalid={tocou && !!v.erros.meta} />
          {tocou && v.erros.meta && <small className="rd-campo__nota rd-campo__nota--erro" role="alert">{v.erros.meta}</small>}
        </label>
        {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
        <div className="ui-acoes">
          <Botao type="submit" variante="destaque" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar campanha'}</Botao>
          <Botao type="button" variante="secundario" onClick={fechar}>Cancelar</Botao>
        </div>
      </form>
    </Folha>
  )
}
