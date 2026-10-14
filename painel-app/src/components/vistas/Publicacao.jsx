import React from 'react'
import { rpc, chamarFuncao, SUPABASE_URL } from '../../lib/rpc'
import { dataHoraCurta } from '../../lib/painelFormat'
import { rotulo } from '../../lib/status'
import {
  estadoPublicacao, textoPublicacao, FILTROS_PUBLICACAO, filtrarPublicacoes, podePublicarCombo, traduzirPendencia,
  diferencas, urlPublicaParticipante, validarSlug, lerCoordenada, linkMapa, PAPEIS_MIDIA, BUCKET_EDICAO, caminhoMidia,
  ALT_MAXIMO, CREDITO_MAXIMO, motivoNaoAprovar, traduzirErroPublicacao,
} from '../../lib/publicacao'
import { urlPublica } from '../../../../src/edicao/dados/modelo.js'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Carregando, Vazio, Erro, Selo, Modulo, MacroSecao, GradeModulos, Botao, Escolha, traduzirErro } from '../ui'
import { confirmar, pedirTexto } from '../Confirmar'
import '../../styles/edicao-org.css'

/*
 * Publicação da edição — lado da organização (Cartoon 2026.2, plano em
 * docs/cartoon-2026-2/04-painel.md §4.4–4.5). Duas telas:
 *   ListaPublicacao → Participantes › Publicação: uma linha por casa, filtros.
 *   AbaPublicacao   → ficha da marca, aba Publicação: pendências, diferença
 *                     entre a versão no ar e a atual, prévia, publicar/retirar,
 *                     slug, coordenadas e fotos.
 * O banco decide (pode() em cada RPC); o botão desabilitado é só conforto.
 */

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const msgErro = (e) => traduzirErro(traduzirErroPublicacao(e && e.message))
const PreviaPublica = React.lazy(() => import('./edicao/PreviaPublica.jsx'))
const ROTULO_PAPEL = Object.fromEntries(PAPEIS_MIDIA)

function Aviso({ aviso }) {
  if (!aviso) return null
  return aviso.ok
    ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p>
    : <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>
}

/* ── Lista: Participantes › Publicação ─────────────────────────────────── */
export function ListaPublicacao({ edicao, rota, navegar, registrarAtualizar }) {
  const [linhas, setLinhas] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const filtro = (rota && rota.filtros && rota.filtros.situacao) || ''
  const carregar = React.useCallback(async () => {
    setErro(null)
    try { setLinhas((await rpc('get_publicacoes_edicao', { p_secret: lerSenha(), p_edicao: edicao.codigo })) || []) } catch (e) { setErro(e.message) }
  }, [edicao.codigo])
  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => { if (registrarAtualizar) registrarAtualizar(carregar) }, [registrarAtualizar, carregar])

  const lista = filtrarPublicacoes(linhas, filtro)
  const abrir = (l) => navegar({ vista: 'participantes', aba: 'lista', filtros: { item: l.participante_id, sub: 'publicacao' } })

  return (
    <div className="ui-pilha">
      <div className="og-filtros">
        <Escolha rotulo="Mostrar" valor={filtro} opcoes={FILTROS_PUBLICACAO}
          onMudar={(v) => navegar({ filtros: v ? { situacao: v } : {} }, { substituir: true })} />
      </div>
      <p className="ui-nota">Edição {edicao.codigo}. A versão publicada fica no ar até a organização publicar a próxima, mesmo com alteração em análise.</p>
      {erro && <Erro texto={erro} onTentar={carregar} />}
      {!erro && linhas === null && <Carregando />}
      {!erro && linhas && linhas.length === 0 && <Vazio titulo="Nenhuma casa nesta edição">As casas aparecem aqui quando têm participação aberta na edição {edicao.codigo}.</Vazio>}
      {!erro && linhas && linhas.length > 0 && lista.length === 0 && <Vazio titulo="Nenhuma casa com esse filtro" />}
      {!erro && lista.length > 0 && (
        <ul className="og-lista">
          {lista.map((l) => (
            <li key={l.participacao_id}>
              <button type="button" className="og-item" onClick={() => abrir(l)}>
                <span className="og-item__cor" aria-hidden="true" />
                <span className="og-item__nome">{l.nome_marca || '(sem nome)'}</span>
                <span className="og-item__dir">
                  <Selo dominio="publicacao" valor={estadoPublicacao(l)} />
                  {l.combo_status && <Selo dominio="combo" valor={l.combo_status} />}
                  {Number(l.pendencias) > 0
                    ? <Selo tom="atencao">{l.pendencias} {Number(l.pendencias) === 1 ? 'pendência' : 'pendências'}</Selo>
                    : <Selo tom="ok">Sem pendências</Selo>}
                </span>
                <span className="og-item__meta">
                  {textoPublicacao(l)}{l.publicado_em ? ' · ' + dataHoraCurta(l.publicado_em) : ''}{l.slug ? ' · /' + l.slug : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Proteção da prévia: dado em construção não derruba a ficha ────────── */
class Protegida extends React.Component {
  constructor(p) { super(p); this.state = { erro: null } }
  static getDerivedStateFromError(erro) { return { erro } }
  render() {
    if (this.state.erro) return <p className="ui-nota ui-nota--erro" role="alert">A prévia não abriu ({String(this.state.erro.message || this.state.erro)}). O restante da ficha segue valendo.</p>
    return this.props.children
  }
}

/* ── Ficha › Publicação ────────────────────────────────────────────────── */
export function AbaPublicacao({ participante, pode, onMudou }) {
  const id = participante.participacao_id
  const [pub, setPub] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [faltando, setFaltando] = React.useState(null)
  const [agindo, setAgindo] = React.useState(false)
  const [previa, setPrevia] = React.useState(false)

  const carregar = React.useCallback(async () => {
    if (!id) return
    setErro(null)
    try { setPub(await rpc('get_publicacao', { p_secret: lerSenha(), p_participacao: id })) } catch (e) { setErro(e.message) }
  }, [id])
  React.useEffect(() => { carregar() }, [carregar])
  const depois = async () => { await carregar(); if (onMudou) onMudou() }

  if (!id) return <Vazio titulo="Sem participação na edição atual">A publicação é por participação: abra uma participação para esta marca primeiro.</Vazio>
  if (erro) return <Erro texto={traduzirErroPublicacao(erro)} onTentar={carregar} />
  if (!pub) return <Carregando linhas={4} />

  const nome = participante.nome_marca || 'esta casa'
  const podeDecidir = pode('curadoria.decidir')
  const comboOk = podePublicarCombo(pub)
  const ctx = { unidades: pub.unidades, itens: pub.atual && pub.atual.combo && pub.atual.combo.itens }
  const pendencias = pub.pendencias || []
  const estado = estadoPublicacao(pub)
  const v = pub.vigente

  async function publicar(nivel) {
    setAviso(null); setFaltando(null)
    const texto = nivel === 'marca'
      ? 'Publicar a casa ' + nome + ' no site? Entra no catálogo nome, apresentação, logo e unidades, sem o combo.'
      : 'Publicar casa e combo de ' + nome + ' no site? Esta passa a ser a versão no ar' + (v ? ', no lugar da v' + v.versao : '') + '.'
    if (!(await confirmar(texto))) return
    setAgindo(true)
    try {
      const r = await rpc('publicar_participacao', { p_secret: lerSenha(), p_participacao: id, p_nivel: nivel })
      if (r && r.ok === false) setFaltando(r.faltando || [])
      else { setAviso({ ok: 'Publicada a versão ' + (r && r.versao) + '. A marca recebe o aviso.' }); await depois() }
    } catch (e) { setAviso(msgErro(e)) } finally { setAgindo(false) }
  }

  async function retirar() {
    setAviso(null); setFaltando(null)
    const motivo = await pedirTexto('Retirar ' + nome + ' do site? A página sai do ar na hora; o endereço continua reservado.',
      { rotulo: 'Motivo (a marca recebe este texto)' }, { acao: 'Retirar do site', perigo: true })
    if (motivo == null) return
    if (!motivo.trim()) { setAviso('Escreva o motivo da retirada: a marca recebe esse texto.'); return }
    setAgindo(true)
    try {
      await rpc('retirar_publicacao', { p_secret: lerSenha(), p_participacao: id, p_motivo: motivo.trim() })
      setAviso({ ok: 'Retirada do site. A marca recebe o aviso com o motivo.' }); await depois()
    } catch (e) { setAviso(msgErro(e)) } finally { setAgindo(false) }
  }

  return (
    <div className="ui-pilha">
      <MacroSecao rotulo="Publicação no site" titulo={textoPublicacao(pub)}
        nota={v ? 'No ar desde ' + dataHoraCurta(v.publicado_em) + (v.publicado_por ? ', por ' + v.publicado_por : '') + '.'
          : pub.ultima && pub.ultima.retirado_em ? 'Retirada em ' + dataHoraCurta(pub.ultima.retirado_em) + (pub.ultima.retirado_por ? ' por ' + pub.ultima.retirado_por : '') + (pub.ultima.motivo ? '. Motivo: ' + pub.ultima.motivo : '') + '.'
            : 'Nada desta casa está no site ainda.'}>
        <GradeModulos className="ui-modulos--dois">
          <Modulo icone="enviar" titulo="Publicar ou retirar" sub="O que vai ao ar é uma cópia congelada: mudanças depois disso só aparecem na próxima publicação."
            status={<Selo dominio="publicacao" valor={estado} />}>
            <div className="ui-linha-acoes">
              {pub.combo_status && <Selo dominio="combo" valor={pub.combo_status} />}
              {pub.alterado_apos_aprovacao && <Selo tom="atencao">Alterado após aprovação</Selo>}
            </div>
            <div className="ui-linha-acoes">
              <Botao icone="loja" variante="secundario" disabled={!podeDecidir || agindo} onClick={() => publicar('marca')}>Publicar a casa</Botao>
              <Botao icone="combo" disabled={!podeDecidir || agindo || !comboOk} onClick={() => publicar('marca_e_combo')}>Publicar casa e combo</Botao>
              {pub.estado === 'publicado' && <Botao icone="arquivar" variante="secundario" className="og-btn--perigo" disabled={!podeDecidir || agindo} onClick={retirar}>Retirar do site</Botao>}
            </div>
            {!podeDecidir && <p className="ui-nota">Publicar e retirar são da curadoria.</p>}
            {podeDecidir && !comboOk && (
              <p className="ui-nota">{pub.combo_status !== 'aprovado'
                ? 'O combo só vai ao ar depois de aprovado (aba Operação). A casa pode ser publicada antes.'
                : 'O combo está aprovado, mas ainda há pendências (ao lado).'}</p>
            )}
            {faltando && (
              <div className="ui-nota ui-nota--erro" role="alert">
                <p>O banco recusou: falta resolver</p>
                <ul>{faltando.map((c) => <li key={c}>{traduzirPendencia(c, ctx)}</li>)}</ul>
              </div>
            )}
            <Aviso aviso={aviso} />
          </Modulo>
          <Modulo icone="pendencia" titulo="Pendências para publicar o combo" sub="A mesma regra do envio da marca para revisão."
            status={pendencias.length ? <Selo tom="atencao">{pendencias.length} {pendencias.length === 1 ? 'aberta' : 'abertas'}</Selo> : <Selo tom="ok">Nenhuma</Selo>}>
            {pendencias.length
              ? <ul className="ui-lista-simples">{pendencias.map((c) => <li key={c}><b>{traduzirPendencia(c, ctx)}</b></li>)}</ul>
              : <p className="ui-nota">Tudo que a página pública precisa está preenchido.</p>}
          </Modulo>
          <Endereco pub={pub} participacaoId={id} pode={pode} onSalvo={depois} />
        </GradeModulos>
      </MacroSecao>

      <MacroSecao rotulo="Conferir" titulo={v ? 'O que mudou desde a v' + v.versao : 'O que seria publicado'}
        acoes={<Botao icone="visao" variante="secundario" aria-expanded={previa} onClick={() => setPrevia((x) => !x)}>{previa ? 'Fechar prévia' : 'Ver como no site'}</Botao>}>
        {v ? <Diferenca antes={v.conteudo} depois={pub.atual} /> : <p className="ui-nota">Nenhuma versão no ar ainda: a prévia mostra a página inteira como ficaria.</p>}
        {previa && pub.atual && (
          <section className="eo-previa" aria-label={'Prévia da página de ' + nome}>
            <p className="eo-previa__faixa">Prévia, ainda não publicada</p>
            <Protegida><React.Suspense fallback={<Carregando linhas={3} texto="Abrindo a prévia…" />}><PreviaPublica p={pub.atual} /></React.Suspense></Protegida>
          </section>
        )}
      </MacroSecao>

      <MacroSecao rotulo="Mapa" titulo="Unidades e localização" nota="Só a organização grava a coordenada; o mapa público só usa a conferida.">
        <Unidades unidades={pub.unidades} pode={pode} onSalvo={depois} />
      </MacroSecao>

      <MacroSecao rotulo="Fotos" titulo="Fotos da página" nota="Só foto aprovada vai ao site, e aprovar exige texto alternativo.">
        <Fotos pub={pub} participacaoId={id} edicao={participante.edicao_codigo} pode={pode} onSalvo={depois} />
      </MacroSecao>
    </div>
  )
}

/* ── Diferença vigente × atual ─────────────────────────────────────────── */
function Diferenca({ antes, depois }) {
  const d = React.useMemo(() => diferencas(antes, depois), [antes, depois])
  if (!d.length) return <p className="ui-nota ui-nota--ok">Nada mudou: o que está no ar é igual ao cadastro atual.</p>
  return (
    <div className="ui-tabela-rolagem" tabIndex={0} role="region" aria-label="Diferença entre a versão no ar e a atual">
      <table className="ui-tabela eo-diff">
        <thead><tr><th scope="col">Campo</th><th scope="col">No ar</th><th scope="col">Agora</th></tr></thead>
        <tbody>{d.map((x) => (
          <tr key={x.chave}>
            <th scope="row">{x.rotulo}</th>
            <td className="eo-diff__antes">{x.antes || <em>(vazio)</em>}</td>
            <td className="eo-diff__depois">{x.depois || <em>(removido)</em>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

/* ── Endereço público (slug) ───────────────────────────────────────────── */
function Endereco({ pub, participacaoId, pode, onSalvo }) {
  const [slug, setSlug] = React.useState(pub.slug || '')
  const [aviso, setAviso] = React.useState(null)
  React.useEffect(() => { setSlug(pub.slug || '') }, [pub.slug])
  // Depois da 1ª publicação o endereço congela (QR impresso).
  const editavel = !pub.ultima && pode('cadastro.editar')
  const url = urlPublicaParticipante(pub.slug)

  async function salvar(ev) {
    ev.preventDefault()
    setAviso(null)
    const s = slug.trim()
    const problema = s && validarSlug(s)
    if (problema) { setAviso(problema); return }
    try {
      await rpc('org_salvar_dados_publicos', { p_secret: lerSenha(), p_participacao: participacaoId, p_dados: { slug_publico: s || null } })
      setAviso({ ok: s ? 'Endereço salvo.' : 'Endereço limpo: será gerado do nome na 1ª publicação.' }); await onSalvo()
    } catch (e) { setAviso(msgErro(e)) }
  }

  return (
    <Modulo icone="local" titulo="Endereço público" sub={pub.ultima ? 'Congelado desde a 1ª publicação.' : 'Gerado do nome da casa na 1ª publicação, se ficar vazio.'}>
      {url
        ? <p className="eo-url"><a className="og-link" href={url} target="_blank" rel="noreferrer">{url}</a></p>
        : <p className="ui-nota">Ainda sem endereço.</p>}
      {editavel && (
        <form className="ui-form" onSubmit={salvar}>
          <label className="og-campo"><span>Endereço (só antes da 1ª publicação)</span>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="ex.: cafe-da-praca" maxLength={80} autoCapitalize="off" spellCheck={false} /></label>
          <div className="ui-linha-acoes"><button className="og-btn og-btn--mini" type="submit" disabled={slug.trim() === (pub.slug || '')}>Salvar endereço</button></div>
        </form>
      )}
      <Aviso aviso={aviso} />
    </Modulo>
  )
}

/* ── Unidades: coordenada conferida ────────────────────────────────────── */
function Unidades({ unidades, pode, onSalvo }) {
  const lista = unidades || []
  if (!lista.length) return <Vazio titulo="Nenhuma unidade">A marca ainda não escolheu as unidades desta edição.</Vazio>
  return (
    <GradeModulos>
      {lista.map((u) => <Unidade key={u.participacao_unidade_id} u={u} pode={pode} onSalvo={onSalvo} />)}
    </GradeModulos>
  )
}

function Unidade({ u, pode, onSalvo }) {
  const [lat, setLat] = React.useState(u.lat == null ? '' : String(u.lat))
  const [lng, setLng] = React.useState(u.lng == null ? '' : String(u.lng))
  const [aviso, setAviso] = React.useState(null)
  const podeGravar = pode('producao.gerir') && !!u.unidade_id
  const endereco = [[u.logradouro, u.numero].filter(Boolean).join(', '), u.bairro, u.cidade].filter(Boolean).join(' · ')
  const conferida = !!u.coordenada_verificada_em

  async function salvar(ev) {
    ev.preventDefault()
    setAviso(null)
    const c = lerCoordenada(lat, lng)
    if (c.erro) { setAviso(c.erro); return }
    try {
      await rpc('org_verificar_coordenada', { p_secret: lerSenha(), p_unidade: u.unidade_id, p_lat: c.lat, p_lng: c.lng })
      setLat(String(c.lat)); setLng(String(c.lng))
      setAviso({ ok: 'Localização conferida.' }); await onSalvo()
    } catch (e) { setAviso(msgErro(e)) }
  }

  return (
    <Modulo icone="local" titulo={u.nome || u.bairro || 'Unidade ' + u.id_publico} sub={endereco || 'Sem endereço'}
      status={!u.participa ? <Selo tom="encerrado">Não participa</Selo>
        : conferida ? <Selo tom="ok">Localização conferida</Selo> : <Selo tom="atencao">Localização a conferir</Selo>}>
      {conferida && <p className="ui-nota">Conferida por {u.coordenada_verificada_por || 'organização'} em {dataHoraCurta(u.coordenada_verificada_em)}.</p>}
      <p><a className="og-link" href={linkMapa(u)} target="_blank" rel="noreferrer">Abrir no Google Maps</a></p>
      {!u.unidade_id && <p className="ui-nota">Unidade antiga, sem cadastro permanente: a marca precisa escolher ou criar a unidade no cadastro antes da conferência.</p>}
      {podeGravar && (
        <form className="ui-form" onSubmit={salvar}>
          <p className="ui-nota">No Google Maps, clique com o botão direito no ponto da loja e copie os números. Pode colar o par inteiro no primeiro campo.</p>
          <div className="eo-par">
            <label className="og-campo"><span>Latitude</span><input type="text" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-5.8123" /></label>
            <label className="og-campo"><span>Longitude</span><input type="text" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-35.2012" /></label>
          </div>
          <div className="ui-linha-acoes"><button className="og-btn og-btn--mini" type="submit">Conferir localização</button></div>
        </form>
      )}
      {!pode('producao.gerir') && <p className="ui-nota">Conferir a localização é da produção.</p>}
      <Aviso aviso={aviso} />
    </Modulo>
  )
}

/* ── Fotos ─────────────────────────────────────────────────────────────── */
function Fotos({ pub, participacaoId, edicao, pode, onSalvo }) {
  const [novo, setNovo] = React.useState(false)
  const midias = pub.midias || []
  const podeSubir = pode('producao.gerir')
  return (
    <div className="ui-pilha">
      {midias.length === 0 && <Vazio titulo="Nenhuma foto registrada">As fotos oficiais da sessão entram aqui; só as aprovadas vão ao site.</Vazio>}
      {midias.length > 0 && <GradeModulos>{midias.map((m) => <Foto key={m.id} m={m} pode={pode} onSalvo={onSalvo} />)}</GradeModulos>}
      {podeSubir && !novo && <div className="ui-linha-acoes"><Botao icone="camera" onClick={() => setNovo(true)}>Registrar foto</Botao></div>}
      {!podeSubir && <p className="ui-nota">Subir foto é da produção.</p>}
      {novo && <NovaFoto pub={pub} participacaoId={participacaoId} edicao={edicao} onFechar={() => setNovo(false)} onSalvo={onSalvo} />}
    </div>
  )
}

function Foto({ m, pode, onSalvo }) {
  const [alt, setAlt] = React.useState(m.alt || '')
  const [credito, setCredito] = React.useState(m.credito || '')
  const [aviso, setAviso] = React.useState(null)
  React.useEffect(() => { setAlt(m.alt || ''); setCredito(m.credito || '') }, [m.alt, m.credito])
  const mudou = alt !== (m.alt || '') || credito !== (m.credito || '')
  const podeTexto = pode('producao.gerir')
  const podeDecidir = pode('curadoria.decidir')

  async function salvarTexto(ev) {
    ev.preventDefault()
    setAviso(null)
    try {
      await rpc('org_salvar_midia', { p_secret: lerSenha(), p_dados: { id: m.id, alt, credito } })
      setAviso({ ok: 'Texto salvo.' }); await onSalvo()
    } catch (e) { setAviso(msgErro(e)) }
  }
  async function decidir(estado) {
    setAviso(null)
    if (estado === 'aprovada') {
      const motivo = mudou ? 'Salve o texto alternativo antes de aprovar.' : motivoNaoAprovar(m)
      if (motivo) { setAviso(motivo); return }
    }
    try {
      await rpc('org_decidir_midia', { p_secret: lerSenha(), p_id: m.id, p_estado: estado })
      await onSalvo()
    } catch (e) { setAviso(msgErro(e)) }
  }

  return (
    <Modulo icone="imagem" titulo={ROTULO_PAPEL[m.papel] || m.papel} sub={m.origem === 'marca' ? 'Enviada pela marca' : 'Sessão oficial'}
      status={<Selo dominio="midia" valor={m.estado} />}>
      <img className="eo-foto" src={urlPublica(SUPABASE_URL, BUCKET_EDICAO, m.path)} alt={m.alt || 'Foto sem texto alternativo'} loading="lazy"
        width={m.largura || undefined} height={m.altura || undefined} />
      <form className="ui-form" onSubmit={salvarTexto}>
        <label className="og-campo"><span>Texto alternativo (o que a foto mostra)</span>
          <input type="text" value={alt} maxLength={ALT_MAXIMO} disabled={!podeTexto} onChange={(e) => setAlt(e.target.value)} placeholder="Ex.: bolo de chocolate com cobertura e xícara de café" /></label>
        <label className="og-campo"><span>Crédito <em>(opcional)</em></span>
          <input type="text" value={credito} maxLength={CREDITO_MAXIMO} disabled={!podeTexto} onChange={(e) => setCredito(e.target.value)} /></label>
        {podeTexto && <div className="ui-linha-acoes"><button className="og-btn og-btn--mini og-btn--vazado" type="submit" disabled={!mudou}>Salvar texto</button></div>}
      </form>
      {podeDecidir && (
        <div className="ui-linha-acoes">
          {m.estado !== 'aprovada' && <Botao icone="sucesso" onClick={() => decidir('aprovada')}>Aprovar foto</Botao>}
          {m.estado !== 'recusada' && <Botao icone="fechar" variante="secundario" onClick={() => decidir('recusada')}>Recusar foto</Botao>}
        </div>
      )}
      <Aviso aviso={aviso} />
    </Modulo>
  )
}

// Converte para WEBP (o caminho no bucket termina em .webp) e mede a imagem.
async function paraWebp(arquivo) {
  const bmp = await createImageBitmap(arquivo)
  const escala = Math.min(1, 2400 / Math.max(bmp.width, bmp.height))
  const largura = Math.round(bmp.width * escala), altura = Math.round(bmp.height * escala)
  const tela = document.createElement('canvas')
  tela.width = largura; tela.height = altura
  tela.getContext('2d').drawImage(bmp, 0, 0, largura, altura)
  const blob = await new Promise((r) => tela.toBlob(r, 'image/webp', 0.86))
  if (!blob || blob.type !== 'image/webp') throw new Error('Este navegador não gera WEBP. Use o Chrome, o Edge ou o Firefox.')
  return { blob, largura, altura }
}

function NovaFoto({ pub, participacaoId, edicao, onFechar, onSalvo }) {
  const [papel, setPapel] = React.useState('combo_principal')
  const [itemId, setItemId] = React.useState('')
  const [unidadeId, setUnidadeId] = React.useState('')
  const [arquivo, setArquivo] = React.useState(null)
  const [alt, setAlt] = React.useState('')
  const [credito, setCredito] = React.useState('')
  const [itens, setItens] = React.useState(null)
  const [enviando, setEnviando] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)

  // get_publicacao não traz o id dos componentes; a ficha do cadastro traz.
  React.useEffect(() => {
    if (papel !== 'item' || itens) return
    rpc('get_ficha_participacao', { p_secret: lerSenha(), p_participacao: participacaoId })
      .then((f) => setItens((f && f.itens) || []))
      .catch((e) => { setItens([]); setAviso(msgErro(e)) })
  }, [papel, itens, participacaoId])

  async function enviar(ev) {
    ev.preventDefault()
    setAviso(null)
    if (!arquivo) { setAviso('Escolha a foto.'); return }
    if (papel === 'item' && !itemId) { setAviso('Escolha o componente da foto.'); return }
    if (papel === 'loja' && !unidadeId) { setAviso('Escolha a unidade da foto.'); return }
    setEnviando(true)
    try {
      const { blob, largura, altura } = await paraWebp(arquivo)
      const path = caminhoMidia(edicao, participacaoId, crypto.randomUUID())
      const a = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'subir', bucket: BUCKET_EDICAO, path })
      const r = await fetch(a.url, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/webp' } })
      if (!r.ok) throw new Error('o envio para o armazenamento falhou (HTTP ' + r.status + ')')
      await rpc('org_salvar_midia', { p_secret: lerSenha(), p_dados: {
        participacao_id: participacaoId, papel, item_id: papel === 'item' ? itemId : null,
        participacao_unidade_id: papel === 'loja' ? unidadeId : null, path, largura, altura, alt, credito,
      } })
      await onSalvo(); onFechar()
    } catch (e) { setAviso(msgErro(e)) } finally { setEnviando(false) }
  }

  const TIPO = { doce: 'Doce', salgado: 'Salgado', bebida: 'Bebida' }
  return (
    <form className="ui-form ui-form--destaque" onSubmit={enviar}>
      <Escolha rotulo="Onde a foto entra" valor={papel} opcoes={PAPEIS_MIDIA} onMudar={setPapel} />
      {papel === 'item' && (itens === null ? <Carregando linhas={1} texto="Carregando os componentes…" />
        : <Escolha rotulo="Componente" valor={itemId} onMudar={setItemId}
            opcoes={itens.map((i) => [i.id, (TIPO[i.tipo] || i.tipo) + (i.nome ? ': ' + i.nome : '')])} />)}
      {papel === 'loja' && <Escolha rotulo="Unidade" valor={unidadeId} onMudar={setUnidadeId}
        opcoes={(pub.unidades || []).map((u) => [u.participacao_unidade_id, u.nome || u.bairro || u.id_publico])} />}
      <label className="og-campo"><span>Foto (JPG, PNG ou WEBP; vira WEBP de até 2400px)</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setArquivo(e.target.files && e.target.files[0])} /></label>
      <label className="og-campo"><span>Texto alternativo <em>(obrigatório para aprovar)</em></span>
        <input type="text" value={alt} maxLength={ALT_MAXIMO} onChange={(e) => setAlt(e.target.value)} /></label>
      <label className="og-campo"><span>Crédito <em>(opcional)</em></span>
        <input type="text" value={credito} maxLength={CREDITO_MAXIMO} onChange={(e) => setCredito(e.target.value)} /></label>
      <p className="ui-nota">A foto nasce "{rotulo('midia', 'enviada')}" e só vai ao site depois de aprovada.</p>
      <div className="ui-linha-acoes">
        <button className="og-btn og-btn--mini" type="submit" disabled={enviando} aria-busy={enviando || undefined}>{enviando ? 'Enviando…' : 'Enviar foto'}</button>
        <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={onFechar} disabled={enviando}>Cancelar</button>
      </div>
      <Aviso aviso={aviso} />
    </form>
  )
}
