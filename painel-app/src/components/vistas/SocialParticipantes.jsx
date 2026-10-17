import React from 'react'
import { rpc, SUPABASE_URL } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Folha } from '../Folha'
import { Icone } from '../Icone'
import { Carregando, Erro, Vazio, Selo, Botao, Secao, LogoMarca } from '../ui'
import { confirmar } from '../Confirmar'
import { Autor } from '../Avatar'
import { urlLogo } from '../../lib/logos'
import { baixarArquivo } from '../../lib/redesArquivos'
import * as R from '../../lib/redes'
import { traduzirRedes } from './RedesFicha'
import { usePendencia } from '../../lib/pendencias'

/*
 * Social media › Participantes (17/10/2026): a ficha EDITORIAL de cada casa —
 * logo, marca, tema, combo, componentes, fotos, unidades e serviço — para quem
 * escreve as postagens. É o MESMO registro da ficha do participante, lido pela
 * projeção pública (`montar_publico`): sem telefone, e-mail, CNPJ, custos nem
 * pagamento. Não é outro cadastro de combo.
 *
 * Editar (editorial.editar): nome, descrição e proposta do combo; nome e
 * descrição dos componentes. ⚠️ A versão publicada no site NÃO muda — o combo
 * aprovado fica marcado "alterado depois da aprovação" e a curadoria revisa.
 * Copiar a descrição para uma legenda cria um texto independente: mudar o
 * combo depois não reescreve legenda nenhuma.
 */

const lerSenha = () => { try { return sessionStorage.getItem(CHAVE_SESSAO) || '' } catch { return '' } }
const ALVO = { vista: 'social', aba: 'participantes' }
export const CHAVE_NOVA_POSTAGEM = 'scw_social_nova_postagem'
const fotoUrl = (path) => (path ? SUPABASE_URL + '/storage/v1/object/public/edicao-publico/' + path.split('/').map(encodeURIComponent).join('/') : null)
const PAPEL_FOTO = { combo_principal: 'Principal do combo', combo_galeria: 'Galeria do combo', item: 'Componente', loja: 'Loja' }
const TIPO_ITEM = { doce: 'Doce', salgado: 'Salgado', bebida: 'Bebida' }
const LIMITES = { combo_nome: 80, combo_descricao: 400, combo_proposta: 2000, item_nome: 80, item_descricao: 400 }
const ROTULO = { combo_nome: 'Nome do combo', combo_descricao: 'Descrição do combo', combo_proposta: 'Proposta / apresentação editorial' }
const n = (v) => (v == null ? '' : String(v))

const ERROS = {
  versao_desatualizada: 'A marca ou outra pessoa salvou este combo enquanto você editava.',
  campo_invalido: 'Esse campo não é editável por aqui.',
  texto_longo: 'Um dos textos passou do limite.',
  item_invalido: 'Um componente não pertence a este combo. Atualize a ficha.',
}
const traduzir = (m) => { for (const [k, v] of Object.entries(ERROS)) if (String(m).includes(k)) return v; return traduzirRedes(m) }

/** O que mudou no formulário em relação ao lido (só isso vai ao servidor). */
export function mudancasEditoriais(lido, form) {
  const d = {}
  for (const k of ['combo_nome', 'combo_descricao', 'combo_proposta']) if (n(form[k]).trim() !== n(lido[k])) d[k] = form[k]
  const itens = []
  for (const it of form.itens || []) {
    const orig = (lido.itens || []).find((x) => x.id === it.id) || {}
    const m = {}
    if (n(it.nome).trim() !== n(orig.nome)) m.nome = it.nome
    if (n(it.descricao).trim() !== n(orig.descricao)) m.descricao = it.descricao
    if (Object.keys(m).length) itens.push({ id: it.id, ...m })
  }
  if (itens.length) d.itens = itens
  return d
}

function TextoCopiavel({ texto, rotulo, onCopiado }) {
  const [ok, setOk] = React.useState(false)
  React.useEffect(() => { if (!ok) return undefined; const t = setTimeout(() => setOk(false), 2500); return () => clearTimeout(t) }, [ok])
  if (!texto) return <p className="ui-nota">Sem {rotulo.toLowerCase()} cadastrada.</p>
  return (
    <div className="sp-texto">
      <p>{texto}</p>
      <Botao variante="secundario" icone={ok ? 'feito' : 'copiar'}
        onClick={() => navigator.clipboard.writeText(texto).then(() => { setOk(true); onCopiado(rotulo + ' copiada.') }, () => onCopiado('Não consegui copiar. Selecione o texto e copie à mão.'))}>
        {ok ? 'Copiada' : 'Copiar ' + rotulo.toLowerCase()}
      </Botao>
    </div>
  )
}

function FichaEditorial({ participacaoId, pode, navegar, onFechar, onMudou }) {
  const [f, setF] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [editando, setEditando] = React.useState(false)
  const [form, setForm] = React.useState(null)
  const [lido, setLido] = React.useState(null)
  const [conflito, setConflito] = React.useState(null)
  const [salvando, setSalvando] = React.useState(false)
  const [aviso, setAviso] = React.useState('')
  const [erroAcao, setErroAcao] = React.useState(null)
  const [falhaBaixa, setFalhaBaixa] = React.useState(null) // { fonte, nome } que não baixou
  const baixar = (fonte, nome) => { setFalhaBaixa(null); baixarArquivo(fonte, nome).catch(() => setFalhaBaixa({ fonte, nome })) }

  const carregar = React.useCallback(async () => {
    try { const r = await rpc('editorial_ficha', { p_secret: lerSenha(), p_participacao: participacaoId }); setF(r); setErro(null); return r }
    catch (e) { setErro(e.message); return null }
  }, [participacaoId])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (!aviso) return undefined; const t = setTimeout(() => setAviso(''), 4000); return () => clearTimeout(t) }, [aviso])

  const mudou = editando && lido && form ? mudancasEditoriais(lido, form) : {}
  const sujo = Object.keys(mudou).length > 0
  usePendencia(sujo, { rotulo: 'Combo de “' + ((f && f.marca) || 'participante') + '”: edição não salva', salvar: () => salvar() })

  function editar() {
    setLido(f.editavel)
    setForm({ ...f.editavel, itens: (f.editavel.itens || []).map((i) => ({ ...i })) })
    setEditando(true)
    setConflito(null)
  }
  async function salvar(esperado = lido) {
    setSalvando(true); setErroAcao(null)
    try {
      const r = await rpc('editorial_salvar', { p_secret: lerSenha(), p_participacao: participacaoId, p_esperado: esperado, p_dados: mudancasEditoriais(esperado, form) })
      setF(r); setEditando(false); setConflito(null); setLido(null)
      setAviso('Salvo. A versão do site não mudou — a curadoria foi avisada para revisar.')
      onMudou()
      return true
    } catch (e) {
      if (/versao_desatualizada/.test(e.message)) {
        const r = await carregar()
        if (r) setConflito({ atual: r.editavel })
      } else setErroAcao(traduzir(e.message))
      return false
    } finally { setSalvando(false) }
  }
  // Toda saída da ficha (X, Esc, criar postagem, ficha completa, abrir postagem) pergunta se há texto não salvo.
  async function sair(fn) {
    if (sujo) await new Promise((ok) => setTimeout(ok, 30))
    if (sujo && !(await confirmar('Sair sem salvar? O texto que você digitou no combo se perde.', { acao: 'Sair sem salvar' }))) return
    fn()
  }
  const fechar = () => sair(onFechar)
  function criarPostagem(comDescricao) {
    // Texto copiado AGORA: a legenda nasce independente do combo.
    const legenda = comDescricao ? [f.editavel.combo_nome, f.editavel.combo_descricao].filter(Boolean).join('\n\n') : ''
    // O @ da casa já entra nas menções (a pessoa só confere).
    const mencoes = R.arrobaDe(f.atual && f.atual.casa && f.atual.casa.instagram)
    try { sessionStorage.setItem(CHAVE_NOVA_POSTAGEM, JSON.stringify({ participante_id: f.participante_id, edicao_codigo: f.edicao_codigo, legenda, mencoes, titulo: f.marca })) } catch { /* modo privado */ }
    sair(() => navegar({ vista: 'social', aba: 'planejamento', filtros: { item: 'novo', volta: 'part:' + f.participante_id + ':' + (f.edicao_codigo || '') } }))
  }

  if (!f) {
    return <Folha aberto titulo="Participante" sub="Carregando…" onFechar={onFechar} larga="ampla" cheia>
      {erro ? <Erro texto={traduzir(erro)} onTentar={carregar} /> : <Carregando linhas={6} />}
    </Folha>
  }
  const casa = (f.atual && f.atual.casa) || {}
  const combo = (f.atual && f.atual.combo) || {}
  const pub = f.publicado && f.publicado.conteudo && f.publicado.conteudo.combo
  const difere = pub && (n(pub.nome) !== n(combo.nome) || n(pub.descricao) !== n(combo.descricao))
  const unidades = (f.atual && f.atual.unidades) || []
  const podeEditar = pode('editorial.editar')
  // Rótulo por htmlFor (o texto digitado num textarea dentro do <label> entraria no nome acessível).
  const idDe = (k) => 'sp-' + participacaoId + '-' + k
  const campoCombo = (k, linhas) => (
    <div className="og-campo sp-campo" key={k}>
      <span><label htmlFor={idDe(k)}>{ROTULO[k]}</label></span>
      {linhas ? <textarea id={idDe(k)} rows={linhas} maxLength={LIMITES[k]} value={n(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        : <input id={idDe(k)} maxLength={LIMITES[k]} value={n(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
      <small className="rd-campo__nota">{n(form[k]).length}/{LIMITES[k]}</small>
    </div>
  )

  return (
    <Folha aberto titulo={f.marca} sub={[f.tema ? 'Tema: ' + f.tema : 'Sem tema definido', f.edicao_codigo].filter(Boolean).join(' · ')} onFechar={fechar} larga="ampla" cheia>
      <div className="sp-ficha">
        <header className="sp-cabeca">
          <div className="sp-logo">
            <LogoMarca url={casa.logo ? urlLogo(casa.logo.path) : null} nome={f.marca} tamanho={72} />
            {casa.logo && casa.logo.path && <Botao variante="secundario" icone="baixar" aria-label={'Baixar a logo de ' + f.marca}
              onClick={() => baixar({ bucket: 'logos', path: casa.logo.path }, (f.marca + '-logo.' + (casa.logo.path.split('.').pop() || 'png')).replace(/\s+/g, '-').toLowerCase())}>Baixar logo</Botao>}
          </div>
          <div>
            <p className="sp-cabeca__selos">
              <Selo dominio="combo" valor={f.combo_status} />
              {f.alterado_apos_aprovacao ? <Selo tom="atencao">Alterado depois da aprovação</Selo>
                : f.publicado ? <Selo tom="ok">No site (versão {f.publicado.versao})</Selo> : <Selo tom="neutro">Ainda não está no site</Selo>}
            </p>
            <p className="sp-cabeca__info">{[f.tema_edicao && 'Tema da edição: ' + f.tema_edicao, casa.instagram && 'Instagram: ' + (R.arrobaDe(casa.instagram) || casa.instagram)].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="ui-acoes">
            {pode('redes.editar') && <Botao icone="mais" variante="destaque" onClick={() => criarPostagem(false)}>Criar postagem</Botao>}
            {pode('redes.editar') && f.editavel.combo_descricao && <Botao variante="secundario" icone="copiar" onClick={() => criarPostagem(true)}>Criar postagem com a descrição</Botao>}
            {pode('dado.ler') && <Botao variante="secundario" icone="ficha" onClick={() => sair(() => navegar({ vista: 'participantes', aba: 'lista', filtros: { item: f.participante_id } }))}>Ficha completa</Botao>}
          </div>
        </header>
        {aviso && <p className="og-aviso" role="status">{aviso}</p>}
        {falhaBaixa && (
          <div className="og-aviso rd-falha" role="alert">
            <p>Não consegui baixar “{falhaBaixa.nome}”. Confira a conexão.</p>
            <div className="ui-acoes">
              <Botao icone="atualizar" onClick={() => baixar(falhaBaixa.fonte, falhaBaixa.nome)}>Tentar de novo</Botao>
              <Botao variante="secundario" onClick={() => setFalhaBaixa(null)}>Fechar</Botao>
            </div>
          </div>
        )}

        {conflito && (
          <div className="og-aviso rd-conflito" role="alert">
            <p><b>{ERROS.versao_desatualizada}</b> O que você digitou continua no formulário. Compare:</p>
            <dl className="rd-conflito__lista">
              {Object.keys(mudou).filter((k) => k !== 'itens').map((k) => (
                <div key={k}><dt>{ROTULO[k]}</dt><dd><span>Salvo agora:</span> {n(conflito.atual[k]) || '(vazio)'}</dd><dd><span>O seu:</span> {n(form[k]) || '(vazio)'}</dd></div>
              ))}
              {(mudou.itens || []).map((it) => {
                const a = (conflito.atual.itens || []).find((x) => x.id === it.id) || {}
                return <div key={it.id}><dt>{TIPO_ITEM[a.tipo] || 'Componente'}</dt><dd><span>Salvo agora:</span> {n(a.nome)} — {n(a.descricao) || '(sem descrição)'}</dd></div>
              })}
            </dl>
            <div className="ui-acoes">
              <Botao onClick={() => { setLido(conflito.atual); salvar(conflito.atual) }} disabled={salvando}>Salvar o meu por cima</Botao>
              <Botao variante="secundario" onClick={() => { setEditando(false); setConflito(null) }}>Ficar com o salvo</Botao>
            </div>
          </div>
        )}

        <Secao titulo="Combo" nota="O que está no cadastro agora. A versão do site só muda quando a curadoria publica de novo."
          acoes={podeEditar && !editando ? <Botao variante="secundario" icone="editar" onClick={editar}>Editar textos</Botao> : null}>
          {editando ? (
            <form className="sp-form" onSubmit={(e) => { e.preventDefault(); salvar() }}>
              {campoCombo('combo_nome')}
              {campoCombo('combo_descricao', 4)}
              {campoCombo('combo_proposta', 4)}
              <fieldset className="sp-itens">
                <legend>Componentes</legend>
                {(form.itens || []).map((it, i) => (
                  <div className="sp-item-form" key={it.id}>
                    <p className="sp-item-form__tipo">{TIPO_ITEM[it.tipo] || 'Componente'} {it.posicao}</p>
                    <div className="og-campo"><span><label htmlFor={idDe('item-nome-' + i)}>Nome</label></span>
                      <input id={idDe('item-nome-' + i)} maxLength={LIMITES.item_nome} value={n(it.nome)} onChange={(e) => setForm({ ...form, itens: form.itens.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} /></div>
                    <div className="og-campo"><span><label htmlFor={idDe('item-desc-' + i)}>Descrição</label></span>
                      <textarea id={idDe('item-desc-' + i)} rows={2} maxLength={LIMITES.item_descricao} value={n(it.descricao)} onChange={(e) => setForm({ ...form, itens: form.itens.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)) })} /></div>
                  </div>
                ))}
              </fieldset>
              <p className="rd-campo__nota">Preço, tema, ingredientes, alergênicos e trocas não são editados aqui: são da marca e da curadoria.</p>
              {erroAcao && <p className="ui-nota ui-nota--erro" role="alert">{erroAcao}</p>}
              <div className="ui-acoes">
                <Botao type="submit" variante="destaque" icone="feito" disabled={salvando || !sujo}>{salvando ? 'Salvando…' : 'Salvar textos'}</Botao>
                <Botao variante="secundario" onClick={() => { setEditando(false); setConflito(null) }} disabled={salvando}>Cancelar</Botao>
              </div>
            </form>
          ) : (
            <div className="sp-combo">
              <h3 className="sp-combo__nome">{f.editavel.combo_nome || <span className="rd-falta">Combo sem nome</span>}</h3>
              <TextoCopiavel texto={f.editavel.combo_descricao} rotulo="Descrição" onCopiado={setAviso} />
              {f.editavel.combo_proposta && <><p className="sp-rotulo">Proposta / apresentação</p><TextoCopiavel texto={f.editavel.combo_proposta} rotulo="Proposta" onCopiado={setAviso} /></>}
              <ul className="sp-itens-lista">
                {(f.editavel.itens || []).map((it) => (
                  <li key={it.id}><b>{TIPO_ITEM[it.tipo] || 'Componente'}:</b> {it.nome || <span className="rd-falta">sem nome</span>}{it.descricao ? ' — ' + it.descricao : ''}</li>
                ))}
              </ul>
            </div>
          )}
          {difere && (
            <details className="sp-publicado" open>
              <summary>Versão no site (publicada {f.publicado.publicado_em ? R.quandoTexto(f.publicado.publicado_em) : ''}) — diferente da atual</summary>
              <p><b>{pub.nome}</b></p>
              <p>{pub.descricao}</p>
            </details>
          )}
        </Secao>

        <Secao titulo="Fotos" nota="Fotos da edição deste participante. Baixar não é publicar.">
          {(f.fotos || []).length ? (
            <ul className="sp-fotos">
              {f.fotos.map((x) => (
                <li key={x.id}>
                  <span className="sp-fotos__img" style={x.largura && x.altura ? { '--razao': x.largura / x.altura } : undefined}>
                    <img src={fotoUrl(x.path)} alt={x.alt || PAPEL_FOTO[x.papel]} loading="lazy" />
                  </span>
                  <span className="rd-campo__nota">{PAPEL_FOTO[x.papel]} · {x.estado === 'aprovada' ? 'aprovada' : 'sem aprovação'}{x.credito ? ' · ' + x.credito : ''}</span>
                  <Botao variante="secundario" icone="baixar" aria-label={'Baixar foto: ' + PAPEL_FOTO[x.papel]} onClick={() => baixar({ bucket: 'edicao-publico', path: x.path }, (f.marca + ' ' + PAPEL_FOTO[x.papel]).replace(/\s+/g, '-').toLowerCase() + '.webp')}>Baixar</Botao>
                </li>
              ))}
            </ul>
          ) : <p className="ui-nota">Foto pendente.</p>}
        </Secao>

        <details className="rd-gaveta">
          <summary>Unidades e serviço ({unidades.length})</summary>
          <div className="rd-gaveta__corpo">
          <p className="rd-campo__nota">Só o que o site pode mostrar.</p>
          {unidades.length ? (
            <ul className="sp-unidades">
              {unidades.map((u, i) => {
                const e = u.endereco || {}
                const modos = u.combo && u.combo.modos ? [u.combo.modos.local && 'consumo no local', u.combo.modos.retirada && 'retirada',
                  u.combo.modos.delivery === 'sim' && 'delivery'].filter(Boolean) : []
                return (
                  <li key={u.id || i}>
                    <p><b>{u.nome || 'Unidade ' + (i + 1)}</b></p>
                    <p className="rd-campo__nota">{[[e.logradouro, e.numero].filter(Boolean).join(', '), e.bairro, e.cidade].filter(Boolean).join(' · ') || 'Endereço pendente'}</p>
                    {u.horario_loja && <p className="rd-campo__nota">Horário da loja: {u.horario_loja}</p>}
                    {modos.length > 0 && <p className="rd-campo__nota">Combo: {modos.join(', ')}</p>}
                    {u.whatsapp && <p className="rd-campo__nota">WhatsApp autorizado: {u.whatsapp}</p>}
                  </li>
                )
              })}
            </ul>
          ) : <p className="ui-nota">Nenhuma unidade publicada ainda.</p>}
          </div>
        </details>

        <details className="rd-gaveta">
          <summary>Postagens deste participante ({(f.posts || []).length})</summary>
          <div className="rd-gaveta__corpo">
          {(f.posts || []).length ? (
            <ul className="sp-posts">
              {f.posts.map((p) => (
                <li key={p.id}>
                  <button type="button" className="rd-link" onClick={() => sair(() => navegar({ vista: 'social', aba: 'planejamento', filtros: { item: p.id } }))}>{p.titulo}</button>
                  <span className="rd-campo__nota"> · {p.programado_para ? R.quandoTexto(p.programado_para) : 'sem data'}</span> <Selo dominio="post_redes" valor={p.situacao} />
                </li>
              ))}
            </ul>
          ) : <p className="ui-nota">Nenhuma postagem ainda.</p>}
          </div>
        </details>

        <details className="rd-gaveta">
          <summary>Histórico editorial ({(f.historico || []).length})</summary>
          <div className="rd-gaveta__corpo">
          {(f.historico || []).length ? (
            <ol className="rd-historico">
              {f.historico.map((h) => {
                const d = h.detalhe || {}
                const campo = d.campo === 'item' ? (TIPO_ITEM[d.tipo] || 'componente').toLowerCase() : ROTULO[d.campo] ? ROTULO[d.campo].toLowerCase() : 'dados públicos'
                return <li key={h.id}><span className="rd-historico__quando">{R.quandoTexto(h.at)}</span> <Autor id={h.ator_user_id} rotulo={h.ator_rotulo} tamanho={20} /> — {h.acao === 'combo.editorial' ? 'editou ' + campo : h.acao}</li>
              })}
            </ol>
          ) : <p className="ui-nota">Nenhuma edição registrada.</p>}
          </div>
        </details>
      </div>
    </Folha>
  )
}

export function SocialParticipantes({ rota, navegar, pode, registrarAtualizar }) {
  const f = rota.filtros || {}
  const [dados, setDados] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [edicoes, setEdicoes] = React.useState([])
  const [busca, setBusca] = React.useState(f.q || '')
  const pedido = React.useRef(0)
  const carregar = React.useCallback(async () => {
    const meu = ++pedido.current // trocou de edição antes da resposta: a velha não sobrescreve a nova
    try { const r = await rpc('editorial_participantes', { p_secret: lerSenha(), p_edicao: f.ed || null }); if (meu === pedido.current) { setDados(r); setErro(null) } }
    catch (e) { if (meu === pedido.current) setErro(e.message) }
  }, [f.ed])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])
  const [erroOpcoes, setErroOpcoes] = React.useState(null)
  const carregarOpcoes = React.useCallback(() => {
    setErroOpcoes(null)
    rpc('redes_opcoes', { p_secret: lerSenha() }).then((o) => o && setEdicoes(o.edicoes || [])).catch((e) => setErroOpcoes(e.message))
  }, [])
  React.useEffect(() => { carregarOpcoes() }, [carregarOpcoes])
  const mudar = (patch, opc) => {
    const x = { ...f, ...patch }
    for (const k of Object.keys(x)) if (x[k] === undefined || x[k] === '') delete x[k]
    navegar({ ...ALVO, filtros: x }, opc)
  }
  React.useEffect(() => {
    if ((f.q || '') === busca) return undefined
    const t = setTimeout(() => mudar({ q: busca || undefined }, { substituir: true }), 300)
    return () => clearTimeout(t)
  }, [busca]) // eslint-disable-line react-hooks/exhaustive-deps

  const lista = dados ? dados.participantes || [] : []
  const q = (f.q || '').toLowerCase()
  const porBusca = q ? lista.filter((p) => [p.marca, p.tema, p.combo_nome].some((x) => String(x || '').toLowerCase().includes(q))) : lista
  // Cobertura: "sem postagem" mostra quem ainda não apareceu; "menos postagens" ordena por quem precisa.
  const visiveis = f.cob === 'sem' ? porBusca.filter((p) => !Number(p.n_posts))
    : f.cob === 'menos' ? [...porBusca].sort((a, b) => Number(a.n_posts) - Number(b.n_posts) || String(a.marca).localeCompare(String(b.marca)))
    : porBusca
  const semPost = lista.filter((p) => !Number(p.n_posts)).length
  // `item` = participante (o mesmo id dos links da postagem); a ficha lê a participação da edição.
  const aberta = f.item ? lista.find((p) => p.participante_id === f.item || p.participacao_id === f.item) : null

  return (
    <div className="sp">
      <div className="sb-ferramentas">
        <label className="og-campo rd-busca">
          <span className="ui-oculto">Buscar participante</span>
          <input type="search" value={busca} placeholder="Buscar marca, tema ou combo" enterKeyHint="search" onChange={(e) => setBusca(e.target.value)} />
        </label>
        <label className="rd-ver">
          <span className="ui-oculto">Edição</span>
          <select value={f.ed || (dados && dados.edicao) || ''} onChange={(e) => mudar({ ed: e.target.value }, { substituir: true })}>
            {!(f.ed || (dados && dados.edicao)) && <option value="">Edição…</option>}
            {edicoes.map((e) => <option key={e.codigo} value={e.codigo}>{e.codigo} · {e.nome}</option>)}
          </select>
        </label>
        <label className="rd-ver">
          <span className="ui-oculto">Mostrar</span>
          <select value={f.cob || ''} onChange={(e) => mudar({ cob: e.target.value || undefined }, { substituir: true })}>
            <option value="">Todos, A–Z</option>
            <option value="menos">Menos postagens primeiro</option>
            <option value="sem">Sem postagem ({semPost})</option>
          </select>
        </label>
      </div>
      {erroOpcoes && <Erro titulo="Não carreguei a lista de edições" texto={traduzir(erroOpcoes)} onTentar={carregarOpcoes} />}
      {erro && <Erro texto={traduzir(erro)} onTentar={carregar} />}
      {!erro && !dados && <Carregando linhas={5} />}
      {dados && (visiveis.length ? (
        <ul className="sp-lista">
          {visiveis.map((p) => (
            <li key={p.participacao_id}>
              <button type="button" className="sp-cartao" onClick={() => mudar({ item: p.participante_id })}
                aria-label={p.marca + (p.tema ? ', tema ' + p.tema : '') + (p.combo_nome ? ', combo ' + p.combo_nome : '') + ', ' + p.n_posts + ' postagens'}>
                <LogoMarca url={p.logo ? urlLogo(p.logo) : null} nome={p.marca} tamanho={48} />
                <span className="sp-cartao__corpo" aria-hidden="true">
                  <span className="sp-cartao__marca">{p.marca}</span>
                  <span className="rd-campo__nota">{p.tema || 'Tema pendente'} · {p.combo_nome || 'combo sem nome'}</span>
                  <span className="sp-cartao__selos">
                    <Selo dominio="combo" valor={p.combo_status} />
                    {p.alterado_apos_aprovacao && <Selo tom="atencao">Alterado</Selo>}
                    {p.no_site && <Selo tom="ok">No site</Selo>}
                    {Number(p.n_posts) ? <span className="rd-campo__nota"><Icone nome="calendario" tamanho={16} /> {p.n_posts} {Number(p.n_posts) === 1 ? 'postagem' : 'postagens'}</span>
                      : <Selo tom="atencao">Sem postagem</Selo>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : <Vazio titulo="Nenhum participante" icone="busca">Mude a edição ou a busca.</Vazio>)}
      {dados && f.item && !aberta && (
        <p className="og-aviso" role="status">Este participante não está na edição {dados.edicao}. Escolha a edição dele acima.</p>
      )}
      {aberta && (
        <FichaEditorial key={aberta.participacao_id} participacaoId={aberta.participacao_id} pode={pode} navegar={navegar}
          onMudou={carregar} onFechar={() => { const x = { ...f }; delete x.item; navegar({ ...ALVO, filtros: x }) }} />
      )}
    </div>
  )
}
