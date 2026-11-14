import React from 'react'
import { api } from '../../lib/marcaApi'
import { VistaCabeca } from '../VistaCabeca'
import { Icone } from '../Icone'
import { Carregando, Erro, traduzirErro } from '../ui'
import { TEMAS_MELHORAR, opiniaoVazia, opiniaoDoBanco, opiniaoParaSalvar } from '../../lib/opiniaoCasa'

/*
 * Sua opinião (marca) — a casa conta à organização como foi a edição (14/11/2026).
 * Uma resposta por edição, editável. Grava pela RPC `marca_salvar_opiniao`, que
 * resolve a casa pela sessão. Endereço direto: /painel/#opiniao (vai no relatório em PDF).
 */
export function Opiniao({ voltar }) {
  const [form, setForm] = React.useState(opiniaoVazia)
  const [estado, setEstado] = React.useState('carregando')   // carregando | pronto | erro
  const [erro, setErro] = React.useState(null)
  const [salvando, setSalvando] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)

  const carregar = React.useCallback(async () => {
    setEstado('carregando')
    try {
      setForm(opiniaoDoBanco(await api('rpc/marca_minha_opiniao', { metodo: 'POST', corpo: {} })))
      setEstado('pronto')
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setErro(e && e.message === 'sem_participacao' ? 'Sua casa não está na edição atual.' : traduzirErro(e && e.message))
      setEstado('erro')
    }
  }, [])
  React.useEffect(() => { carregar() }, [carregar])

  const alterar = (k, v) => { setAviso(null); setForm((f) => ({ ...f, [k]: v })) }
  const alternarTema = (t) => alterar('melhorar_temas', form.melhorar_temas.includes(t)
    ? form.melhorar_temas.filter((x) => x !== t) : [...form.melhorar_temas, t])

  async function salvar(ev) {
    ev.preventDefault()
    setSalvando(true)
    try {
      await api('rpc/marca_salvar_opiniao', { metodo: 'POST', corpo: { p: opiniaoParaSalvar(form) } })
      setAviso({ ok: true, texto: 'Recebemos sua opinião. Obrigado! Dá para voltar aqui e mudar quando quiser.' })
    } catch (e) {
      setAviso({ ok: false, texto: e && e.message === 'modo_visualizacao' ? 'Modo de visualização: nada é gravado.' : traduzirErro(e && e.message) })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className="ui-vista-marca">
      {voltar && <button type="button" className="og-link fm-voltar" onClick={voltar}><Icone nome="voltar" tamanho={16} /> Voltar</button>}
      <VistaCabeca acento="cyan" icone="depoimento" titulo="Sua opinião sobre a edição"
        nota="Conte como foi o Sweet & Coffee Week para a sua casa. Só a organização lê, e tudo é opcional." />
      {estado === 'carregando' && <Carregando linhas={4} />}
      {estado === 'erro' && <Erro texto={erro} onTentar={carregar} />}
      {estado === 'pronto' && (
        <form className="ui-form" onSubmit={salvar}>
          <fieldset className="marcar-grupo">
            <legend className="marcar-grupo__pergunta">De 0 a 10, quanto você recomendaria participar do Sweet & Coffee Week a outra casa?</legend>
            {Array.from({ length: 11 }, (_, n) => (
              <label className="marcar" key={n}>
                <input type="radio" name="recomendacao" checked={form.recomendacao === n} onChange={() => alterar('recomendacao', n)} />
                <span>{n}</span>
              </label>
            ))}
          </fieldset>
          <label className="og-campo"><span>O que funcionou bem para a sua casa?</span>
            <textarea rows={3} maxLength={4000} value={form.funcionou} onChange={(e) => alterar('funcionou', e.target.value)} />
          </label>
          <fieldset className="marcar-grupo">
            <legend className="marcar-grupo__pergunta">O que atrapalhou ou pode melhorar?</legend>
            {TEMAS_MELHORAR.map(([t, r]) => (
              <label className="marcar" key={t}>
                <input type="checkbox" checked={form.melhorar_temas.includes(t)} onChange={() => alternarTema(t)} />
                <span>{r}</span>
              </label>
            ))}
          </fieldset>
          <label className="og-campo"><span>Conte mais sobre o que pode melhorar</span>
            <textarea rows={3} maxLength={4000} value={form.melhorar} onChange={(e) => alterar('melhorar', e.target.value)} />
          </label>
          <fieldset className="marcar-grupo">
            <legend className="marcar-grupo__pergunta">Sua casa tem interesse em participar das próximas edições?</legend>
            {[['sim', 'Sim'], ['talvez', 'Talvez'], ['nao', 'Não']].map(([v, r]) => (
              <label className="marcar" key={v}>
                <input type="radio" name="interesse" checked={form.interesse === v} onChange={() => alterar('interesse', v)} />
                <span>{r}</span>
              </label>
            ))}
          </fieldset>
          <label className="og-campo"><span>Sugestão de tema para as próximas edições</span>
            <input maxLength={500} value={form.tema_sugerido} onChange={(e) => alterar('tema_sugerido', e.target.value)} />
          </label>
          <label className="og-campo"><span>Quer dizer mais alguma coisa?</span>
            <textarea rows={3} maxLength={4000} value={form.livre} onChange={(e) => alterar('livre', e.target.value)} />
          </label>
          {aviso && <p className={'ui-nota' + (aviso.ok ? '' : ' ui-nota--erro')} role="status">{aviso.texto}</p>}
          <button className="acao" type="submit" disabled={salvando}>{salvando ? 'Enviando…' : 'Enviar minha opinião'}</button>
        </form>
      )}
    </section>
  )
}
