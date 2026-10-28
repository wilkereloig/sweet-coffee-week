import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { cobravel } from '../../lib/fichaGeral'
import { textoCobranca, erroDoAviso, TITULO_MAX, TEXTO_MAX, avisoNomeCombo } from '../../lib/pendenciasAviso'
import { Folha } from '../Folha'
import { Botao, Selo, traduzirErro, MarcaComLogo } from '../ui'

/*
 * Cobrar pendências do participante e avisar ajustes (26/10/2026, pedido do Wilker). Banco:
 * `org_avisar_marca` (supabase/migrations/20261114_avisar_marca_pendencias.sql) — sino + push no painel da
 * marca, o toque leva ao campo, e o texto fica na conversa. Texto pronto em lib/pendenciasAviso.js.
 */
const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }

export function enviarAvisoMarca(participanteId, { titulo, texto, link }, tipo = 'pendencia') {
  return rpc('org_avisar_marca', { p_secret: lerSenha(), p_participante: participanteId, p_titulo: titulo.trim(), p_texto: texto.trim(), p_link: link || null, p_tipo: tipo })
}

/** Título e mensagem editáveis (contador de caracteres). */
function CamposAviso({ titulo, texto, onTitulo, onTexto, linhas = 7 }) {
  return (
    <>
      <label className="og-campo"><span>Título do aviso (aparece no sino e no celular)</span>
        <input type="text" value={titulo} maxLength={TITULO_MAX} onChange={(e) => onTitulo(e.target.value)} />
      </label>
      <label className="og-campo"><span>Mensagem (fica também na conversa)</span>
        <textarea rows={linhas} value={texto} maxLength={TEXTO_MAX} onChange={(e) => onTexto(e.target.value)} />
        <small className="cp-conta">{texto.trim().length} de {TEXTO_MAX}</small>
      </label>
    </>
  )
}

/*
 * Caixa "Avisar o participante", controlada por quem a usa (o editor salva e, se marcada, avisa).
 * `valor` = { marcado, titulo, texto }. Vem marcada, com o texto pronto; editável ou desmarcável.
 */
export function CaixaAviso({ valor, onMudar, pode }) {
  if (!pode('mensagem.enviar')) return <p className="ui-nota">Avisar o participante é de quem envia mensagens (sua função não envia).</p>
  return (
    <fieldset className="cp-caixa">
      <label className="cp-caixa__marcar">
        <input type="checkbox" checked={valor.marcado} onChange={(e) => onMudar({ ...valor, marcado: e.target.checked })} />
        <span>Avisar o participante do que foi feito</span>
      </label>
      {valor.marcado && <CamposAviso titulo={valor.titulo} texto={valor.texto} linhas={5}
        onTitulo={(t) => onMudar({ ...valor, titulo: t })} onTexto={(t) => onMudar({ ...valor, texto: t })} />}
    </fieldset>
  )
}

/** Estado inicial da caixa a partir de um aviso pronto ({ titulo, texto, link }). */
export const caixaDe = (aviso) => ({ marcado: true, titulo: aviso.titulo, texto: aviso.texto, link: aviso.link })

/*
 * Folha de cobrança. `destinos` = [{ participante, itens }] — um (da ficha) ou vários (lote da lista).
 * Um destino: título e texto editáveis. Vários: o texto de cada marca é montado com as pendências marcadas
 * dela, mais um recado comum; a prévia de cada uma fica a um toque.
 */
export function FolhaCobrar({ aberto, destinos = [], carregando = null, onFechar, onEnviado }) {
  const um = destinos.length === 1
  const [marcadas, setMarcadas] = React.useState({}) // participanteId → Set(chave)
  const [edicao, setEdicao] = React.useState(null) // um destino: { titulo, texto } depois que a pessoa mexe
  const [recado, setRecado] = React.useState('')
  const [estado, setEstado] = React.useState({ fase: 'pronto' }) // pronto · enviando · feito
  const chave = destinos.map((d) => d.participante.id + ':' + d.itens.map((x) => x.chave).join(',')).join('|')

  React.useEffect(() => {
    if (!aberto) return
    setMarcadas(Object.fromEntries(destinos.map((d) => [d.participante.id, new Set(d.itens.filter(cobravel).map((x) => x.chave))])))
    setEdicao(null); setRecado(''); setEstado({ fase: 'pronto' })
  }, [aberto, chave]) // eslint-disable-line react-hooks/exhaustive-deps

  const escolhidos = (d) => d.itens.filter((x) => cobravel(x) && (marcadas[d.participante.id] || new Set()).has(x.chave))
  const montar = (d) => textoCobranca({ responsavel: d.participante.responsavel, itens: escolhidos(d), recado })
  const alternar = (pid, c) => setMarcadas((m) => { const s = new Set(m[pid] || []); s.has(c) ? s.delete(c) : s.add(c); return { ...m, [pid]: s } })
  const prontos = destinos.map((d) => ({ d, aviso: montar(d) })).filter((x) => x.aviso)
  const unico = um && prontos[0] ? { ...prontos[0].aviso, ...(edicao || {}) } : null
  const erro = um ? (unico ? erroDoAviso(unico) : 'Marque ao menos uma pendência.') : (prontos.length ? null : 'Nenhuma pendência marcada.')

  async function enviar() {
    if (erro) return
    setEstado({ fase: 'enviando', feitos: 0 })
    const resultados = []
    for (const { d, aviso } of prontos) {
      const a = um ? unico : aviso
      try { await enviarAvisoMarca(d.participante.id, a); resultados.push({ d, ok: true }) } catch (e) { resultados.push({ d, ok: false, erro: traduzirErro(e && e.message) }) }
      setEstado({ fase: 'enviando', feitos: resultados.length })
    }
    setEstado({ fase: 'feito', resultados })
    if (onEnviado) onEnviado(resultados)
  }

  const titulo = um ? 'Cobrar pendências' : 'Cobrar pendências de ' + destinos.length + ' marcas'
  const sub = um && destinos[0] ? destinos[0].participante.nome_marca : 'Um aviso por marca, só com o que falta nela'
  const enviando = estado.fase === 'enviando'
  return (
    <Folha aberto={aberto} titulo={titulo} sub={sub} larga={!um} onFechar={() => { if (!enviando) onFechar() }}>
      {carregando && (
        <div className="ui-pilha" role="status">
          <p>Conferindo as pendências: {carregando.feitas} de {carregando.total} marcas…</p>
          <progress max={carregando.total} value={carregando.feitas} className="cp-progresso" />
        </div>
      )}
      {!carregando && estado.fase === 'feito' && <Resultado resultados={estado.resultados} onFechar={onFechar} />}
      {!carregando && estado.fase !== 'feito' && (
        <form className="ui-form" onSubmit={(e) => { e.preventDefault(); enviar() }}>
          <p className="ui-nota">Chega como aviso no painel e no celular do participante (o toque leva direto ao campo) e fica registrado na conversa.</p>
          {destinos.map((d) => {
            const lista = d.itens.filter(cobravel)
            const pid = d.participante.id
            const n = escolhidos(d).length
            return (
              <fieldset key={pid} className="cp-destino">
                <legend><MarcaComLogo nome={d.participante.nome_marca} participanteId={pid} />{!um && <Selo tom={n ? 'andamento' : 'neutro'}>{n ? n + (n === 1 ? ' pendência' : ' pendências') : 'nada a cobrar'}</Selo>}</legend>
                {!lista.length && <p className="ui-nota">{d.falhas && d.falhas.length ? 'Não consegui ler tudo desta marca; tente de novo pela ficha.' : 'Nada que a marca precise fazer agora.'}</p>}
                {lista.length > 0 && (
                  <ul className="cp-itens">
                    {lista.map((x) => (
                      <li key={x.chave}><label>
                        <input type="checkbox" checked={(marcadas[pid] || new Set()).has(x.chave)} onChange={() => { alternar(pid, x.chave); setEdicao(null) }} />
                        <span>{x.paraMarca}</span>
                      </label></li>
                    ))}
                  </ul>
                )}
                {!um && n > 0 && (
                  <details className="cp-previa"><summary>Ver a mensagem desta marca</summary><pre>{montar(d).texto}</pre></details>
                )}
              </fieldset>
            )
          })}
          {um && unico && (
            <CamposAviso titulo={unico.titulo} texto={unico.texto}
              onTitulo={(t) => setEdicao({ titulo: t, texto: unico.texto })} onTexto={(t) => setEdicao({ titulo: unico.titulo, texto: t })} />
          )}
          {um && edicao && <p className="ui-nota">Você editou o texto. Mudar as pendências marcadas refaz o texto.</p>}
          {!um && (
            <label className="og-campo"><span>Recado para todas (opcional, entra antes do fim de cada mensagem)</span>
              <textarea rows={3} value={recado} maxLength={600} onChange={(e) => setRecado(e.target.value)} placeholder="Ex.: o prazo de preenchimento termina em 02/11." />
            </label>
          )}
          {erro && <p className="ui-nota" role="status">{erro}</p>}
          <div className="ui-linha-acoes">
            <Botao type="submit" icone="sino" disabled={!!erro || enviando}>
              {enviando ? 'Enviando ' + (estado.feitos + 1) + ' de ' + prontos.length + '…' : um ? 'Enviar aviso' : 'Enviar ' + prontos.length + (prontos.length === 1 ? ' aviso' : ' avisos')}
            </Botao>
            <Botao variante="secundario" onClick={onFechar} disabled={enviando}>Cancelar</Botao>
          </div>
        </form>
      )}
    </Folha>
  )
}

function Resultado({ resultados, onFechar }) {
  const ok = resultados.filter((r) => r.ok)
  const falhas = resultados.filter((r) => !r.ok)
  const foco = React.useRef(null)
  React.useEffect(() => { if (foco.current) foco.current.focus() }, [])
  return (
    <div className="ui-pilha">
      <p className="og-aviso" data-tom={falhas.length ? 'erro' : 'ok'} role="status" tabIndex={-1} ref={foco}>
        {ok.length ? (ok.length === 1 ? 'Aviso enviado para ' + ok[0].d.participante.nome_marca + '.' : ok.length + ' avisos enviados.') : 'Nenhum aviso foi enviado.'}
        {falhas.length ? ' ' + falhas.length + (falhas.length === 1 ? ' não foi.' : ' não foram.') : ''}
      </p>
      {falhas.length > 0 && (
        <ul className="ui-lista-simples">{falhas.map((r) => <li key={r.d.participante.id}><b>{r.d.participante.nome_marca}</b><span>{r.erro}</span></li>)}</ul>
      )}
      <div className="ui-linha-acoes"><Botao onClick={onFechar}>Fechar</Botao></div>
    </div>
  )
}

/*
 * "Resolver agora" do nome do combo: a organização define o nome (org_salvar_dados_publicos, cadastro.editar)
 * e, com a caixa marcada, avisa a marca do que fez.
 */
export function NomeDoCombo({ participante, atual = '', pode, onSalvo }) {
  const [nome, setNome] = React.useState(atual || '')
  const [caixa, setCaixa] = React.useState(() => caixaDe(avisoNomeCombo({ responsavel: participante.responsavel, nome: atual })))
  const [editouAviso, setEditouAviso] = React.useState(false)
  const [estado, setEstado] = React.useState(null)
  // O texto do aviso acompanha o nome enquanto a pessoa não mexe nele.
  React.useEffect(() => { if (!editouAviso) setCaixa((c) => ({ ...c, ...avisoNomeCombo({ responsavel: participante.responsavel, nome }), marcado: c.marcado })) }, [nome]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!pode('cadastro.editar')) return <p className="ui-nota">Definir o nome do combo é de quem edita cadastros.</p>
  const limpo = nome.trim()
  const avisa = caixa.marcado && pode('mensagem.enviar')
  const erroCaixa = avisa ? erroDoAviso(caixa) : null

  async function salvar(e) {
    e.preventDefault()
    if (!limpo || erroCaixa) return
    setEstado({ fase: 'salvando' })
    try {
      await rpc('org_salvar_dados_publicos', { p_secret: lerSenha(), p_participacao: participante.participacao_id, p_dados: { combo_nome: limpo } })
    } catch (err) { setEstado({ fase: 'erro', texto: traduzirErro(err && err.message) }); return }
    let aviso = null
    if (avisa) {
      try { await enviarAvisoMarca(participante.id, caixa, 'ajuste'); aviso = 'ok' } catch (err) { aviso = traduzirErro(err && err.message) }
    }
    setEstado({ fase: 'salvo', aviso })
    if (onSalvo) onSalvo()
  }

  return (
    <form className="ui-form" onSubmit={salvar}>
      <label className="og-campo"><span>Nome do combo (até 80 caracteres)</span>
        <input type="text" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Combo Toon Town" />
      </label>
      <CaixaAviso pode={pode} valor={caixa} onMudar={(v) => { if (v.titulo !== caixa.titulo || v.texto !== caixa.texto) setEditouAviso(true); setCaixa(v) }} />
      {erroCaixa && <p className="ui-nota" role="status">{erroCaixa}</p>}
      <div className="ui-linha-acoes">
        <Botao type="submit" icone="sucesso" disabled={!limpo || !!erroCaixa || (estado && estado.fase === 'salvando')}>{avisa ? 'Salvar e avisar' : 'Salvar nome'}</Botao>
      </div>
      {estado && estado.fase === 'erro' && <p className="og-aviso" data-tom="erro" role="alert">{estado.texto}</p>}
      {estado && estado.fase === 'salvo' && (
        <p className="og-aviso" data-tom="ok" role="status">
          Nome salvo.{estado.aviso === 'ok' ? ' O participante foi avisado.' : estado.aviso ? ' O aviso não foi: ' + estado.aviso : ''}
        </p>
      )}
    </form>
  )
}
