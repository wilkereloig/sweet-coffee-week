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
import { comEnvio } from '../../lib/pendencias'
import { AvisoMudancaExterna } from '../AvisoMudancaExterna'
import { useLeitura, useEdicaoProtegida } from '../../lib/leituraVivaReact'
import { useDatasDoFestival } from '../../lib/festivalReact'
import { soAlterados, aparar, impressaoDoArquivo } from '../../lib/leituraViva'
import { NOMES_PUBLICACAO, ondeFica } from '../../lib/nomesPublicacao'

/*
 * Publicação da edição — lado da organização (Cartoon 2026.2, plano em
 * docs/cartoon-2026-2/04-painel.md §4.4–4.5). Duas telas:
 *   ListaPublicacao → Participantes › Páginas das marcas (rota `publicacao`): uma
 *                     linha por casa, filtros.
 *   AbaPublicacao   → ficha da marca, seção "Página da marca no site": pendências,
 *                     diferença entre a versão no ar e a atual, prévia,
 *                     publicar/retirar, slug, coordenadas e fotos.
 * Os nomes visíveis vêm de lib/nomesPublicacao.js: aqui se publica a página de
 * UMA marca; a liberação da edição inteira é Edição › Liberação no site.
 * O banco decide (pode() em cada RPC); o botão desabilitado é só conforto.
 */

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const msgErro = (e) => traduzirErro(traduzirErroPublicacao(e && e.message))
const PreviaPublica = React.lazy(() => import('./edicao/PreviaPublica.jsx'))
const ROTULO_PAPEL = Object.fromEntries(PAPEIS_MIDIA)
const CAMPOS_SLUG = ['slug']
const CAMPOS_COORDENADA = ['lat', 'lng']
const CAMPOS_FOTO = ['alt', 'credito']

// O pai (a ficha) relê as fontes dele quando algo aqui é gravado. Uma falha DESSA releitura não
// é falha da gravação que acabou de dar certo: ela aparece no aviso da própria ficha.
function avisarSalvo(onSalvo) {
  try { Promise.resolve(onSalvo && onSalvo()).catch(() => { /* a ficha mostra a própria falha */ }) } catch { /* idem */ }
}

function Aviso({ aviso }) {
  if (!aviso) return null
  return aviso.ok
    ? <p className="ui-nota ui-nota--ok" role="status">{aviso.ok}</p>
    : <p className="ui-nota ui-nota--erro" role="alert">{aviso}</p>
}

/* ── Lista: Participantes › Páginas das marcas ─────────────────────────── */
export function ListaPublicacao({ edicao, rota, navegar }) {
  const filtro = (rota && rota.filtros && rota.filtros.situacao) || ''
  // Relê sozinha quando muda o que a linha mostra: publicação, a marca (nome, situação do combo),
  // a edição e as pendências (que saem do cadastro e das unidades). Outra edição = lista nova.
  const leitura = useLeitura(
    async () => (await rpc('get_publicacoes_edicao', { p_secret: lerSenha(), p_edicao: edicao.codigo })) || [],
    ['publicacao', 'participantes', 'edicao', 'cadastro', 'unidades'], { chave: edicao.codigo },
  )
  const linhas = leitura.dados === undefined ? null : leitura.dados
  const erro = leitura.bloqueada ? leitura.erro : null

  const lista = filtrarPublicacoes(linhas, filtro)
  const abrir = (l) => navegar({ vista: 'participantes', aba: 'lista', filtros: { item: l.participante_id, sub: 'publicacao' } })

  return (
    <div className="ui-pilha">
      <p className="ui-nota">
        <b>{NOMES_PUBLICACAO.marcas.frase}.</b> Edição {edicao.codigo}. A versão publicada fica no ar até a organização publicar a próxima, mesmo com alteração em análise.
        {' '}{NOMES_PUBLICACAO.edicao.frase} fica em {ondeFica('edicao')}.
      </p>
      <div className="og-filtros">
        <Escolha rotulo="Mostrar" valor={filtro} opcoes={FILTROS_PUBLICACAO}
          onMudar={(v) => navegar({ filtros: v ? { situacao: v } : {} }, { substituir: true })} />
      </div>
      {erro && <Erro texto={erro} onTentar={leitura.recarregar} />}
      {leitura.falhouAtualizar && <Erro titulo="Não consegui atualizar" texto={leitura.erro} onTentar={leitura.recarregar} />}
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

/* Prévia = a página do site desenhada pelo componente do site, sob demanda.
 * Usada aqui e na visão geral da ficha (15/10/2026). */
export function PreviaPagina({ conteudo, nome, periodo = null }) {
  return (
    <section className="eo-previa" aria-label={'Prévia da página de ' + nome}>
      <p className="eo-previa__faixa">Prévia, ainda não publicada</p>
      <Protegida><React.Suspense fallback={<Carregando linhas={3} texto="Abrindo a prévia…" />}><PreviaPublica p={conteudo} periodo={periodo} /></React.Suspense></Protegida>
    </section>
  )
}

/* ── Ficha › Publicação ────────────────────────────────────────────────── */
export function AbaPublicacao({ participante, pode, onMudou }) {
  const id = participante.participacao_id
  const [aviso, setAviso] = React.useState(null)
  const [faltando, setFaltando] = React.useState(null)
  const [agindo, setAgindo] = React.useState(false)
  const [previa, setPrevia] = React.useState(false)
  const festival = useDatasDoFestival(participante.edicao_codigo)   // o período da edição chega à prévia (o horário sai como no site)

  // A publicação da casa lê de muita coisa (publicações, cadastro, unidades, logo, marca, preço da
  // edição); relê sozinha quando qualquer uma muda. Outra participação = leitura nova: a ficha de
  // uma casa nunca aparece com os dados da anterior.
  const leitura = useLeitura(
    () => rpc('get_publicacao', { p_secret: lerSenha(), p_participacao: id }),
    ['publicacao', 'cadastro', 'unidades', 'participantes', 'logos', 'edicao'], { chave: id, ativo: !!id },
  )
  const pub = leitura.dados
  React.useEffect(() => { setAviso(null); setFaltando(null); setAgindo(false); setPrevia(false) }, [id])
  const aposGravar = () => avisarSalvo(onMudou)

  if (!id) return <Vazio titulo="Sem participação na edição atual">A publicação é por participação: abra uma participação para esta marca primeiro.</Vazio>
  if (leitura.bloqueada) return <Erro texto={traduzirErroPublicacao(leitura.erro)} onTentar={leitura.recarregar} />
  if (!pub) return <Carregando linhas={4} />

  const nome = participante.nome_marca || 'esta casa'
  const ed = participante.edicao_codigo // a publicação é por participação: sempre diz a qual edição vale
  const naEd = ed ? ' (edição ' + ed + ')' : ''
  const podeDecidir = pode('curadoria.decidir')
  const comboOk = podePublicarCombo(pub)
  const ctx = { unidades: pub.unidades, itens: pub.atual && pub.atual.combo && pub.atual.combo.itens }
  const pendencias = pub.pendencias || []
  const estado = estadoPublicacao(pub)
  const v = pub.vigente

  async function publicar(nivel) {
    setAviso(null); setFaltando(null)
    // A versão nova substitui a do ar: se a do ar mostra o combo, publicar só a casa TIRA o combo do site.
    const tiraCombo = nivel === 'marca' && v && v.nivel === 'marca_e_combo'
    const texto = nivel === 'marca'
      ? 'Publicar a casa ' + nome + ' no site' + naEd + '? Entra no catálogo nome, apresentação, logo e unidades, sem o combo.'
        + (tiraCombo ? ' Atenção: o combo que está no ar agora SAI do site. Para mantê-lo, use "Publicar casa e combo".' : '')
      : 'Publicar casa e combo de ' + nome + ' no site' + naEd + '? Esta passa a ser a versão no ar' + (v ? ', no lugar da v' + v.versao : '') + '.'
    if (!(await confirmar(texto))) return
    setAgindo(true)
    try {
      const r = await rpc('publicar_participacao', { p_secret: lerSenha(), p_participacao: id, p_nivel: nivel })
      if (r && r.ok === false) setFaltando(r.faltando || [])
      else { setAviso({ ok: 'Publicada a versão ' + (r && r.versao) + '. A marca recebe o aviso.' }); aposGravar() }
    } catch (e) { setAviso(msgErro(e)) } finally { setAgindo(false) }
  }

  async function retirar() {
    setAviso(null); setFaltando(null)
    const motivo = await pedirTexto('Retirar ' + nome + ' do site' + naEd + '? A página sai do ar na hora; o endereço continua reservado.',
      { rotulo: 'Motivo (a marca recebe este texto)' }, { acao: 'Retirar do site', perigo: true })
    if (motivo == null) return
    if (!motivo.trim()) { setAviso('Escreva o motivo da retirada: a marca recebe esse texto.'); return }
    setAgindo(true)
    try {
      await rpc('retirar_publicacao', { p_secret: lerSenha(), p_participacao: id, p_motivo: motivo.trim() })
      setAviso({ ok: 'Retirada do site. A marca recebe o aviso com o motivo.' }); aposGravar()
    } catch (e) { setAviso(msgErro(e)) } finally { setAgindo(false) }
  }

  return (
    <div className="ui-pilha">
      {leitura.falhouAtualizar && <Erro titulo="Não consegui atualizar" texto={traduzirErroPublicacao(leitura.erro)} onTentar={leitura.recarregar} />}
      <MacroSecao rotulo={NOMES_PUBLICACAO.marcas.pagina + (ed ? ' · edição ' + ed : '')} titulo={textoPublicacao({ ...pub, versao: v ? v.versao : pub.ultima && pub.ultima.versao, nivel: v && v.nivel })}
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
            <p className="ui-nota">Vale só para esta casa. {NOMES_PUBLICACAO.edicao.frase} fica em {ondeFica('edicao')}.</p>
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
          <Endereco key={id} pub={pub} participacaoId={id} pode={pode} onSalvo={aposGravar} />
        </GradeModulos>
      </MacroSecao>

      <MacroSecao rotulo="Conferir" titulo={v ? 'O que mudou desde a v' + v.versao : 'O que seria publicado'}
        acoes={<Botao icone="olho" variante="secundario" aria-expanded={previa} onClick={() => setPrevia((x) => !x)}>{previa ? 'Fechar prévia' : 'Ver como no site'}</Botao>}>
        {v ? <Diferenca antes={v.conteudo} depois={pub.atual} nivel={v.nivel} /> : <p className="ui-nota">Nenhuma versão no ar ainda: a prévia mostra a página inteira como ficaria.</p>}
        {previa && pub.atual && <PreviaPagina conteudo={pub.atual} nome={nome} periodo={festival.periodo} />}
      </MacroSecao>

      <MacroSecao rotulo="Mapa" titulo="Unidades e localização" nota="Só a organização grava a coordenada; o mapa público só usa a conferida.">
        <Unidades unidades={pub.unidades} pode={pode} onSalvo={aposGravar} />
      </MacroSecao>

      <MacroSecao rotulo="Fotos" titulo="Fotos da página" nota="Só foto aprovada vai ao site, e aprovar exige texto alternativo.">
        <Fotos pub={pub} participacaoId={id} edicao={participante.edicao_codigo} pode={pode} onSalvo={aposGravar} />
      </MacroSecao>
    </div>
  )
}

/* ── Diferença vigente × atual ─────────────────────────────────────────── */
function Diferenca({ antes, depois, nivel }) {
  const d = React.useMemo(() => diferencas(antes, depois, nivel), [antes, depois, nivel])
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
  const [aviso, setAviso] = React.useState(null)
  // Depois da 1ª publicação o endereço congela (QR impresso).
  const editavel = !pub.ultima && pode('cadastro.editar')
  // O que está digitado nunca é trocado pela releitura: o endereço só acompanha o banco enquanto
  // a pessoa não mexeu nele; se outra pessoa mudar o mesmo campo, ela escolhe. Formulário escondido
  // (já publicada) não conta como trabalho pela metade.
  const servidor = React.useMemo(() => ({ slug: pub.slug || '' }), [pub.slug])
  const reg = useEdicaoProtegida(servidor, CAMPOS_SLUG, { chave: participacaoId, rotulo: 'Endereço público (não salvo)', pendente: editavel })
  const slug = reg.local.slug
  const url = urlPublicaParticipante(pub.slug)

  async function salvar(ev) {
    ev.preventDefault()
    setAviso(null)
    const s = slug.trim()
    const problema = s && validarSlug(s)
    if (problema) { setAviso(problema); return }
    const brutos = reg.local
    try {
      await rpc('org_salvar_dados_publicos', { p_secret: lerSenha(), p_participacao: participacaoId, p_dados: { slug_publico: s || null } })
      reg.confirmarSalvo({ slug: s }, brutos)
      setAviso({ ok: s ? 'Endereço salvo.' : 'Endereço limpo: será gerado do nome na 1ª publicação.' }); avisarSalvo(onSalvo)
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
            <input type="text" value={slug} onChange={(e) => reg.editar('slug', e.target.value.toLowerCase())} placeholder="ex.: cafe-da-praca" maxLength={80} autoCapitalize="off" spellCheck={false} /></label>
          <AvisoMudancaExterna registro={reg} rotulos={{ slug: 'Endereço público' }} />
          <div className="ui-linha-acoes"><button className="og-btn og-btn--mini" type="submit" disabled={reg.conflito || slug.trim() === (pub.slug || '')}>Salvar endereço</button></div>
        </form>
      )}
      <Aviso aviso={aviso} />
    </Modulo>
  )
}

/* ── Unidades: coordenada conferida ────────────────────────────────────── */
// Exportadas para os editores da visão geral da ficha (15/10/2026).
export { Unidades as ConferirLocalizacao, Fotos as RevisarFotos }

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
  // Latitude e longitude digitadas resistem à releitura (e acompanham o banco enquanto a pessoa
  // não mexeu): outra pessoa conferir a mesma unidade não apaga o que está sendo colado aqui.
  const servidor = React.useMemo(() => ({ lat: u.lat == null ? '' : String(u.lat), lng: u.lng == null ? '' : String(u.lng) }), [u.lat, u.lng])
  const reg = useEdicaoProtegida(servidor, CAMPOS_COORDENADA, { chave: u.participacao_unidade_id, rotulo: 'Localização da unidade (não salva)', pendente: pode('producao.gerir') && !!u.unidade_id })
  const { lat, lng } = reg.local
  const [aviso, setAviso] = React.useState(null)
  const podeGravar = pode('producao.gerir') && !!u.unidade_id
  const endereco = [[u.logradouro, u.numero].filter(Boolean).join(', '), u.bairro, u.cidade].filter(Boolean).join(' · ')
  const conferida = !!u.coordenada_verificada_em

  async function salvar(ev) {
    ev.preventDefault()
    setAviso(null)
    const c = lerCoordenada(lat, lng)
    if (c.erro) { setAviso(c.erro); return }
    const brutos = reg.local
    try {
      await rpc('org_verificar_coordenada', { p_secret: lerSenha(), p_unidade: u.unidade_id, p_lat: c.lat, p_lng: c.lng })
      // O par colado num campo só vira dois números limpos (a menos que a pessoa já tenha digitado mais).
      reg.confirmarSalvo({ lat: String(c.lat), lng: String(c.lng) }, brutos)
      setAviso({ ok: 'Localização conferida.' }); avisarSalvo(onSalvo)
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
            <label className="og-campo"><span>Latitude</span><input type="text" inputMode="decimal" value={lat} onChange={(e) => reg.editar('lat', e.target.value)} placeholder="-5.8123" /></label>
            <label className="og-campo"><span>Longitude</span><input type="text" inputMode="decimal" value={lng} onChange={(e) => reg.editar('lng', e.target.value)} placeholder="-35.2012" /></label>
          </div>
          <AvisoMudancaExterna registro={reg} rotulos={{ lat: 'Latitude', lng: 'Longitude' }} />
          <div className="ui-linha-acoes"><button className="og-btn og-btn--mini" type="submit" disabled={reg.conflito}>Conferir localização</button></div>
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
  const podeTexto = pode('producao.gerir')
  const podeDecidir = pode('curadoria.decidir')
  // Texto alternativo e crédito resistem à releitura: o que está digitado nunca é trocado, e o que a
  // pessoa não tocou acompanha o banco. Outra foto = outro rascunho (a lista é por m.id).
  const servidor = React.useMemo(() => ({ alt: m.alt || '', credito: m.credito || '' }), [m.alt, m.credito])
  const reg = useEdicaoProtegida(servidor, CAMPOS_FOTO, { chave: m.id, rotulo: 'Texto da foto (não salvo)', pendente: podeTexto })
  const { alt, credito } = reg.local
  const [aviso, setAviso] = React.useState(null)
  const mudou = reg.sujo

  async function salvarTexto(ev) {
    ev.preventDefault()
    setAviso(null)
    // Só o que mudou: o outro campo pode ter sido alterado por outra pessoa nesse meio-tempo.
    const brutos = reg.local
    const alterados = aparar(soAlterados(reg.base, reg.local, CAMPOS_FOTO))
    try {
      await rpc('org_salvar_midia', { p_secret: lerSenha(), p_dados: { id: m.id, ...alterados } })
      reg.confirmarSalvo(alterados, brutos)
      setAviso({ ok: 'Texto salvo.' }); avisarSalvo(onSalvo)
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
      avisarSalvo(onSalvo)
    } catch (e) { setAviso(msgErro(e)) }
  }

  return (
    <Modulo icone="imagem" titulo={ROTULO_PAPEL[m.papel] || m.papel} sub={m.origem === 'marca' ? 'Enviada pela marca' : 'Sessão oficial'}
      status={<Selo dominio="midia" valor={m.estado} />}>
      <img className="eo-foto" src={urlPublica(SUPABASE_URL, BUCKET_EDICAO, m.path)} alt={m.alt || 'Foto sem texto alternativo'} loading="lazy"
        width={m.largura || undefined} height={m.altura || undefined} />
      <form className="ui-form" onSubmit={salvarTexto}>
        <label className="og-campo"><span>Texto alternativo (o que a foto mostra)</span>
          <input type="text" value={alt} maxLength={ALT_MAXIMO} disabled={!podeTexto} onChange={(e) => reg.editar('alt', e.target.value)} placeholder="Ex.: bolo de chocolate com cobertura e xícara de café" /></label>
        <label className="og-campo"><span>Crédito <em>(opcional)</em></span>
          <input type="text" value={credito} maxLength={CREDITO_MAXIMO} disabled={!podeTexto} onChange={(e) => reg.editar('credito', e.target.value)} /></label>
        <AvisoMudancaExterna registro={reg} rotulos={{ alt: 'Texto alternativo', credito: 'Crédito' }} />
        {podeTexto && <div className="ui-linha-acoes"><button className="og-btn og-btn--mini og-btn--vazado" type="submit" disabled={!mudou || reg.conflito}>Salvar texto</button></div>}
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
  const [enviando, setEnviando] = React.useState(false)
  const [aviso, setAviso] = React.useState(null)
  // O que já subiu ao armazenamento mas ainda não foi registrado: tentar de novo com a mesma foto
  // não sobe outra vez (e não deixa objeto órfão). { path, largura, altura, impressao }
  const subido = React.useRef(null)

  // get_publicacao não traz o id dos componentes; a ficha do cadastro traz. Os componentes mudam
  // se a marca (ou a organização) editar o combo com este formulário aberto: relê sozinha.
  const lista = useLeitura(
    async () => { const f = await rpc('get_ficha_participacao', { p_secret: lerSenha(), p_participacao: participacaoId }); return (f && f.itens) || [] },
    ['cadastro'], { chave: participacaoId, ativo: papel === 'item' },
  )
  const itens = lista.dados === undefined ? (lista.erro ? [] : null) : lista.dados
  const avisoLista = lista.erro && lista.dados === undefined ? msgErro({ message: lista.erro }) : null
  // O componente escolhido deixou de existir no combo: a escolha some (não vai um id morto).
  React.useEffect(() => { if (itemId && lista.dados && !lista.dados.some((i) => i.id === itemId)) setItemId('') }, [lista.dados, itemId])

  async function enviar(ev) {
    ev.preventDefault()
    setAviso(null)
    if (!arquivo) { setAviso('Escolha a foto.'); return }
    if (papel === 'item' && !itemId) { setAviso('Escolha o componente da foto.'); return }
    if (papel === 'loja' && !unidadeId) { setAviso('Escolha a unidade da foto.'); return }
    setEnviando(true)
    let registrando = false
    try {
      let envio = subido.current && subido.current.impressao === impressaoDoArquivo(arquivo) ? subido.current : null
      if (!envio) {
        const { blob, largura, altura } = await paraWebp(arquivo)
        const path = caminhoMidia(edicao, participacaoId, crypto.randomUUID())
        const a = await chamarFuncao('arquivo-url', { secret: lerSenha(), acao: 'subir', bucket: BUCKET_EDICAO, path })
        const r = await comEnvio('Envio da foto', () => fetch(a.url, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/webp' } }))
        if (!r.ok) throw new Error('o envio para o armazenamento falhou (HTTP ' + r.status + ')')
        envio = subido.current = { path, largura, altura, impressao: impressaoDoArquivo(arquivo) }
      }
      registrando = true
      await rpc('org_salvar_midia', { p_secret: lerSenha(), p_dados: {
        participacao_id: participacaoId, papel, item_id: papel === 'item' ? itemId : null,
        participacao_unidade_id: papel === 'loja' ? unidadeId : null, path: envio.path, largura: envio.largura, altura: envio.altura, alt, credito,
      } })
      subido.current = null
      avisarSalvo(onSalvo); onFechar()
    } catch (e) {
      // A foto já está no armazenamento e só o registro falhou: diz isso (e o reenvio reaproveita o arquivo).
      setAviso(registrando ? msgErro(e) + ' A foto já foi enviada; ao enviar de novo ela não sobe outra vez.' : msgErro(e))
    } finally { setEnviando(false) }
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
      <Aviso aviso={aviso || avisoLista} />
    </form>
  )
}
