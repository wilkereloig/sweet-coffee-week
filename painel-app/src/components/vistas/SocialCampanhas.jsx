import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Icone } from '../Icone'
import { Carregando, Erro, Vazio, Botao, MaisAcoes, traduzirErro } from '../ui'
import { confirmar } from '../Confirmar'
import * as P from '../../lib/pastas'
import * as C from '../../lib/campanhas'
import * as R from '../../lib/redes'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { FormularioCampanha } from './FormularioCampanha'

/*
 * Social media › Campanhas (21/10/2026): agrupa as postagens de uma mesma ação (Confirmados, Contagem regressiva…) com período,
 * meta e progresso. Uma campanha por postagem. Campanha não se apaga: arquiva e restaura (as postagens continuam ligadas).
 * "Ver no calendário" abre o Planejamento no mês do início já filtrado por ela (`camp` no endereço).
 */
const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }
const textoErro = (m) => C.traduzirErroCampanha(m) || traduzirErro(m)
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios)

function CartaoCampanha({ c, podeEditar, onVer, onEditar, onArquivar, onRestaurar }) {
  const pr = C.progressoCampanha(c)
  const periodo = C.periodoTexto(c)
  const abertas = Number(c.n_abertas) || 0
  const atrasadas = Number(c.n_atrasadas) || 0
  return (
    <li className={'sc-cartao' + (c.arquivada ? ' is-arquivada' : '')} style={P.estiloPasta(c.cor)}>
      <div className="sc-cartao__topo">
        <h3 className="sc-cartao__nome"><span className="bb-ponto" aria-hidden="true" />{c.nome}</h3>
        {c.arquivada && <span className="sc-cartao__selo">Arquivada</span>}
      </div>
      {periodo && <p className="sc-cartao__periodo"><Icone nome="calendario" tamanho={16} />{periodo}</p>}
      {c.descricao && <p className="sc-cartao__desc">{c.descricao}</p>}
      <div className="sc-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pr.pct} aria-label={pr.rotulo}><span style={{ width: pr.pct + '%' }} /></div>
      <p className="sc-cartao__prog"><b>{pr.rotulo}</b>{c.meta ? <span> · meta de {c.meta}</span> : null}</p>
      <p className="sc-cartao__nums">
        {plural(abertas, 'em aberto', 'em aberto')}
        {atrasadas > 0 && <> · <b className="sc-cartao__atraso">{plural(atrasadas, 'atrasada', 'atrasadas')}</b></>}
      </p>
      <div className="sc-cartao__acoes">
        <Botao variante="secundario" icone="calendario" onClick={() => onVer(c)}>Ver no calendário</Botao>
        {podeEditar && !c.arquivada && <Botao variante="secundario" icone="editar" onClick={() => onEditar(c)}>Editar</Botao>}
        {podeEditar && !c.arquivada && <MaisAcoes itens={[{ rotulo: 'Arquivar campanha', icone: 'pasta', onClick: () => onArquivar(c) }]} rotulo={<span className="ui-oculto">Mais ações de {c.nome}</span>} />}
        {podeEditar && c.arquivada && <Botao variante="secundario" icone="ciclo" onClick={() => onRestaurar(c)}>Restaurar</Botao>}
      </div>
    </li>
  )
}

export function SocialCampanhas({ navegar, pode }) {
  const guarda = useGuarda()
  const [lista, setLista] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [form, setForm] = React.useState(null) // { campanha: obj|null }
  const [aviso, setAviso] = React.useState('')
  const [arquivadasAbertas, setArquivadasAbertas] = React.useState(false)
  const temLista = React.useRef(false)
  const podeEditar = !!pode('redes.editar')

  const carregar = React.useCallback(async (silencioso = false) => {
    const vale = guarda()
    try {
      const r = await rpc('redes_campanhas_listar', { p_secret: lerSenha() })
      if (!vale()) return true
      temLista.current = true
      setLista(r || [])
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!(silencioso && temLista.current)) setErro(e.message)
      return false
    }
  }, [guarda])
  React.useEffect(() => { carregar() }, [carregar])
  useSincronizar(['redes'], async () => { if (!(await carregar(true))) throw new Error('redes_campanhas') })
  React.useEffect(() => { if (!aviso) return undefined; const t = setTimeout(() => setAviso(''), 5000); return () => clearTimeout(t) }, [aviso])

  const ver = (c) => navegar({ vista: 'social', aba: 'planejamento', filtros: { camp: c.id, modo: 'mes', data: c.inicio || R.hoje() } })
  async function arquivar(c) {
    const n = Number(c.n_total) || 0
    if (!(await confirmar('Arquivar a campanha “' + c.nome + '”? As ' + plural(n, 'postagem ligada', 'postagens ligadas') + ' continuam com ela; ela só deixa de aparecer para novas escolhas. Dá para restaurar.'))) return
    try { await rpc('redes_campanha_arquivar', { p_secret: lerSenha(), p_id: c.id, p_arquivar: true }); setAviso('Campanha arquivada.'); carregar(true) } catch (e) { setAviso(textoErro(e.message)) }
  }
  async function restaurar(c) {
    try { await rpc('redes_campanha_arquivar', { p_secret: lerSenha(), p_id: c.id, p_arquivar: false }); setAviso('Campanha restaurada.'); carregar(true) } catch (e) { setAviso(textoErro(e.message)) }
  }

  const ordenadas = C.ordenarCampanhas(lista || [])
  const ativas = ordenadas.filter((c) => !c.arquivada)
  const arquivadas = ordenadas.filter((c) => c.arquivada)

  return (
    <div className="sc">
      <header className="sc-cabeca">
        <p className="sc-cabeca__nota">Agrupe as postagens de uma mesma ação. Cada postagem pertence a uma campanha só.</p>
        {podeEditar && <Botao icone="mais" variante="destaque" onClick={() => setForm({ campanha: null })}>Nova campanha</Botao>}
      </header>
      {aviso && <p className="ui-nota" role="status">{aviso}</p>}
      {erro && <Erro texto={textoErro(erro)} onTentar={() => carregar()} />}
      {!erro && !lista && <Carregando linhas={3} />}
      {!erro && lista && ativas.length === 0 && (
        <Vazio titulo="Nenhuma campanha ainda" icone="tema">
          {podeEditar ? 'Crie a primeira para acompanhar quantas postagens já saíram.' : 'Quem planeja as postagens cria as campanhas.'}
        </Vazio>
      )}
      {ativas.length > 0 && (
        <ul className="sc-lista">
          {ativas.map((c) => <CartaoCampanha key={c.id} c={c} podeEditar={podeEditar} onVer={ver} onEditar={(x) => setForm({ campanha: x })} onArquivar={arquivar} onRestaurar={restaurar} />)}
        </ul>
      )}
      {arquivadas.length > 0 && (
        <section className="sc-arquivadas">
          <button type="button" className="rd-link" aria-expanded={arquivadasAbertas} onClick={() => setArquivadasAbertas((x) => !x)}>
            {arquivadasAbertas ? 'Esconder' : 'Ver'} arquivadas ({arquivadas.length})
          </button>
          {arquivadasAbertas && (
            <ul className="sc-lista">
              {arquivadas.map((c) => <CartaoCampanha key={c.id} c={c} podeEditar={podeEditar} onVer={ver} onEditar={(x) => setForm({ campanha: x })} onArquivar={arquivar} onRestaurar={restaurar} />)}
            </ul>
          )}
        </section>
      )}
      {form && (
        <FormularioCampanha key={form.campanha ? form.campanha.id : 'nova'} campanha={form.campanha} onFechar={() => setForm(null)}
          onSalvou={() => { setForm(null); setAviso('Campanha salva.'); carregar(true) }} />
      )}
    </div>
  )
}
