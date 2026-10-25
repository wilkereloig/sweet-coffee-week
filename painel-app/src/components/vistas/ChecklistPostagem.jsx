import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Folha } from '../Folha'
import { Botao, BotaoIcone, traduzirErro } from '../ui'
import { confirmar } from '../Confirmar'
import * as K from '../../lib/checklist'
import * as R from '../../lib/redes'
import { usePendencia } from '../../lib/pendencias'

/*
 * Checklist da postagem (21/10/2026): a conferência da equipe antes de enviar (arte, legenda, marcas, data…). AVISA, não trava —
 * "Enviar para aprovação" com itens abertos só pergunta. Marcar não mexe na postagem (nem versão, nem aprovação). "Marcado" só
 * depois da resposta do servidor; quem marcou e quando ficam no item. Item removido some desta postagem (o banco guarda o registro).
 * Os modelos por formato (itens que cada postagem nova recebe) são do administrador (`redes.gerir`) e vivem na folha "Checklist padrão".
 */
const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }
const textoErro = (m) => K.traduzirErroChecklist(m) || traduzirErro(m)

export function ChecklistPostagem({ postId, itens, fechada, podeEditar, onItens }) {
  const [ocupado, setOcupado] = React.useState('')
  const [texto, setTexto] = React.useState('')
  const [erro, setErro] = React.useState(null)
  const c = K.contagem(itens)
  const editavel = podeEditar && !fechada
  usePendencia(editavel && texto.trim().length > 0, { rotulo: 'Item do checklist (não acrescentado)' })

  async function marcar(item, feito) {
    setOcupado(item.id); setErro(null)
    try {
      const novo = await rpc('redes_checklist_marcar', { p_secret: lerSenha(), p_item: item.id, p_feito: feito })
      onItens((l) => l.map((x) => (x.id === novo.id ? novo : x)))
    } catch (e) { setErro(textoErro(e.message)) } finally { setOcupado('') }
  }
  async function acrescentar(ev) {
    ev.preventDefault()
    const v = K.validarItem(texto, itens)
    if (!v.ok) { setErro(v.erro); return }
    setOcupado('novo'); setErro(null)
    try {
      const novo = await rpc('redes_checklist_item_salvar', { p_secret: lerSenha(), p_post: postId, p_texto: v.texto })
      onItens((l) => [...l, novo])
      setTexto('')
    } catch (e) { setErro(textoErro(e.message)) } finally { setOcupado('') }
  }
  async function remover(item) {
    if (!(await confirmar('Tirar “' + item.texto + '” do checklist desta postagem?'))) return
    setOcupado(item.id); setErro(null)
    try {
      await rpc('redes_checklist_item_remover', { p_secret: lerSenha(), p_item: item.id })
      onItens((l) => l.filter((x) => x.id !== item.id))
    } catch (e) { setErro(textoErro(e.message)) } finally { setOcupado('') }
  }

  return (
    <section className="ck" aria-labelledby="ck-titulo">
      <header className="ck-cabeca">
        <h3 id="ck-titulo">Checklist</h3>
        {c.total > 0 && <span className={'ck-conta' + (c.abertos.length === 0 ? ' is-completo' : '')}>{c.feitos}/{c.total}{c.abertos.length === 0 ? ' · tudo conferido' : ''}</span>}
      </header>
      {c.total === 0 && <p className="ck-vazio">Sem itens neste checklist.</p>}
      {c.total > 0 && (
        <ul className="ck-lista">
          {itens.map((i) => (
            <li key={i.id} className={'ck-item' + (i.feito ? ' is-feito' : '')}>
              <label className="ck-item__rotulo">
                <input type="checkbox" checked={!!i.feito} disabled={!editavel || ocupado === i.id} onChange={(e) => marcar(i, e.target.checked)} />
                <span className="ck-item__texto">{i.texto}</span>
              </label>
              {i.feito && <span className="ck-item__quem">{K.rotuloFeito(i, R.quandoTexto)}</span>}
              {editavel && <BotaoIcone icone="fechar" rotulo="Tirar item" alvo={i.texto} disabled={ocupado === i.id} onClick={() => remover(i)} />}
            </li>
          ))}
        </ul>
      )}
      {editavel && (
        <form className="ck-novo" onSubmit={acrescentar}>
          <label className="og-campo"><span className="ui-oculto">Novo item do checklist</span>
            <input type="text" maxLength={K.LIMITE_TEXTO} placeholder="Acrescentar item (só desta postagem)" value={texto} onChange={(e) => { setTexto(e.target.value); setErro(null) }} />
          </label>
          <Botao type="submit" variante="secundario" icone="mais" disabled={ocupado === 'novo' || !texto.trim()}>Acrescentar</Botao>
        </form>
      )}
      {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
    </section>
  )
}

/** Folha "Checklist padrão" (administrador): os itens que cada postagem NOVA recebe, por formato. */
export function ChecklistModelos({ onFechar, onSalvou }) {
  const [grupos, setGrupos] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [salvando, setSalvando] = React.useState('')
  const [aviso, setAviso] = React.useState('')
  const [sujos, setSujos] = React.useState(() => new Set())
  usePendencia(sujos.size > 0 && !salvando, { rotulo: 'Checklist padrão (não salvo)' })

  React.useEffect(() => {
    let vivo = true
    rpc('redes_checklist_modelos_listar', { p_secret: lerSenha() })
      .then((l) => { if (vivo) setGrupos(K.agruparModelos(l)) })
      .catch((e) => { if (vivo) setErro(textoErro(e.message)) })
    return () => { vivo = false }
  }, [])

  const editar = (formato, fn) => { setGrupos((g) => ({ ...g, [formato]: fn(g[formato]) })); setSujos((s) => new Set(s).add(formato)); setAviso('') }
  const mover = (f, i, d) => editar(f, (l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n })
  async function salvar(f) {
    const linhas = grupos[f]
    if (linhas.some((l) => !String(l.texto || '').trim())) { setErro('Há item sem texto em ' + R.FORMATO[f].curto + '.'); return }
    setSalvando(f); setErro(null)
    try {
      const nova = await rpc('redes_checklist_modelo_salvar', { p_secret: lerSenha(), p_formato: f, p_itens: K.modelosParaSalvar(linhas) })
      setGrupos((g) => ({ ...g, [f]: nova }))
      setSujos((s) => { const n = new Set(s); n.delete(f); return n })
      setAviso('Salvo: ' + R.FORMATO[f].rotulo + '. Vale para as próximas postagens; as que já existem não mudam.')
      if (onSalvou) onSalvou()
    } catch (e) { setErro(textoErro(e.message)) } finally { setSalvando('') }
  }

  return (
    <Folha aberto titulo="Checklist padrão" sub="Os itens que cada postagem nova recebe, por formato. As postagens que já existem não mudam." onFechar={onFechar}>
      {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
      {aviso && <p className="ui-nota" role="status">{aviso}</p>}
      {!grupos && !erro && <p className="ui-nota">Carregando…</p>}
      {grupos && R.FORMATOS.map((fm) => (
        <section key={fm.chave} className="ck-modelo">
          <h3>{fm.rotulo}</h3>
          <ul className="ck-lista">
            {grupos[fm.chave].map((l, i) => (
              <li key={l.id || 'n' + i} className="ck-item">
                <label className="ck-item__rotulo">
                  <input type="checkbox" checked={l.ativo !== false} onChange={(e) => editar(fm.chave, (arr) => arr.map((x, k) => (k === i ? { ...x, ativo: e.target.checked } : x)))} />
                  <span className="ui-oculto">Usar este item</span>
                  <input type="text" className="ck-item__campo" maxLength={K.LIMITE_TEXTO} aria-label={'Item ' + (i + 1) + ' de ' + fm.curto} value={l.texto} onChange={(e) => editar(fm.chave, (arr) => arr.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)))} />
                </label>
                <BotaoIcone icone="seta-esquerda" rotulo="Subir item" alvo={l.texto} disabled={i === 0} onClick={() => mover(fm.chave, i, -1)} />
                <BotaoIcone icone="seta-direita" rotulo="Descer item" alvo={l.texto} disabled={i === grupos[fm.chave].length - 1} onClick={() => mover(fm.chave, i, 1)} />
                <BotaoIcone icone="fechar" rotulo="Tirar item" alvo={l.texto} onClick={() => editar(fm.chave, (arr) => arr.filter((_, k) => k !== i))} />
              </li>
            ))}
          </ul>
          <div className="ui-acoes">
            <Botao variante="secundario" icone="mais" soIcone aria-label={'Acrescentar item em ' + fm.curto} disabled={grupos[fm.chave].length >= 20} onClick={() => editar(fm.chave, (arr) => [...arr, { texto: '', ativo: true }])}>Acrescentar item</Botao>
            <Botao variante="destaque" disabled={!sujos.has(fm.chave) || salvando === fm.chave} onClick={() => salvar(fm.chave)}>{salvando === fm.chave ? 'Salvando…' : 'Salvar ' + fm.curto}</Botao>
          </div>
        </section>
      ))}
    </Folha>
  )
}
