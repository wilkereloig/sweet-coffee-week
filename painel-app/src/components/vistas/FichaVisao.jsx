import React from 'react'
import { rpc, SUPABASE_URL } from '../../lib/rpc'
import { urlPublica, formatarPreco } from '../../../../src/edicao/dados/modelo.js'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { dataHoraCurta } from '../../lib/painelFormat'
import { dataCurta } from '../../lib/respostas'
import { rotulo } from '../../lib/status'
import { tempoRelativo } from '../../lib/central'
import { mascaraWhatsApp } from '../../lib/participantes'
import { linkWebSeguro } from '../../lib/cadastro'
import { estadoLogoLista } from '../../lib/logos'
import { BUCKET_EDICAO, traduzirPendencia } from '../../lib/publicacao'
import { NOMES_PUBLICACAO } from '../../lib/nomesPublicacao'
import { ROTULO_MATERIAL, ROTULO_MATERIAL_STATUS } from '../../lib/operacao'
import {
  criarCarregadorFicha, situacaoTema, TEXTO_TEMA, TOM_TEMA, textoCusto, componentesDaFicha, unidadesDaFicha,
  textoResposta, fotosDaFicha, fotosIniciais, resumoPublicacao, acoesDaSecao, edicaoDaFicha,
} from '../../lib/fichaGeral'
import { Carregando, Erro, Vazio, Selo, Botao } from '../ui'
import { Icone } from '../Icone'
import { useSincronizar } from '../../lib/sync/react'
import { DOMINIOS_VISTAS, mesclarFonte } from '../../lib/syncFichas'

/*
 * Visão do participante (15/10/2026) — a ficha geral: tudo o que a marca
 * preencheu, numa página só, para LER. Editar continua nos editores de sempre,
 * abertos no lugar da seção (ver FichaMarcaPagina). Composição pura em
 * lib/fichaGeral.js; aqui só desenho e as quatro leituras.
 */
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

/*
 * As quatro leituras da ficha, cada uma com estado próprio. O estado guarda
 * de qual participação ele é: trocar de marca não mostra, nem por um quadro,
 * o dado da anterior sob o nome da seguinte.
 *
 * Sincronização (19/10/2026): a visão relê sozinha, e em silêncio, quando muda
 * qualquer domínio que as quatro leituras tocam (outra pessoa mexeu na marca,
 * reconexão, volta ao app). A releitura NÃO volta ao esqueleto: o conteúdo fica na
 * tela, e se a leitura falhar o que já estava lá continua (a falha vai para o
 * indicador, não para o lugar do cadastro). `recarregar()` (editor que acabou de
 * salvar, "Tentar de novo") devolve uma promessa para quem precisa esperar.
 */
export function useFichaGeral(participacaoId) {
  const id = participacaoId || null
  const [estado, setEstado] = React.useState({ id: undefined, fontes: {} })
  const carregar = React.useMemo(() => criarCarregadorFicha(
    (nome, args) => rpc(nome, { p_secret: lerSenha(), ...args }),
    (fonte, s, deQuem, opcoes) => setEstado((x) => {
      const antes = x.id === deQuem ? x.fontes : {}
      return { id: deQuem, fontes: { ...antes, [fonte]: mesclarFonte(antes[fonte], s, opcoes) } }
    }),
  ), [])
  // Guarda a leitura mais nova para cancelar na saída: nada é gravado depois de desmontar nem da troca de marca.
  const ultima = React.useRef(null)
  const iniciar = React.useCallback((opcoes) => { const c = carregar(id, opcoes); ultima.current = c; return c }, [carregar, id])
  React.useEffect(() => { iniciar(); return () => { if (ultima.current) ultima.current() } }, [iniciar])
  const recarregar = React.useCallback(() => iniciar({ manter: true }).pronto, [iniciar])
  useSincronizar(DOMINIOS_VISTAS.fichaGeral, async () => {
    const falhas = await iniciar({ manter: true }).pronto
    if (falhas.length) throw new Error('ficha: ' + falhas.join(', '))
  })
  const atuais = estado.id === id ? estado.fontes : {}
  const f = (k) => atuais[k] || { estado: id || k === 'edicoes' ? 'carregando' : 'sem_participacao', dados: null, erro: null }
  return { fontes: { nucleo: f('nucleo'), publicacao: f('publicacao'), correcoes: f('correcoes'), edicoes: f('edicoes') }, recarregar }
}

/* ── Peças de leitura ──────────────────────────────────────────────────── */
// Fonte em estado ≠ ok: diz qual dos cinco, nunca "vazio".
function EstadoFonte({ f, oQue, onTentar, linhas = 3 }) {
  if (f.estado === 'carregando') return <Carregando linhas={linhas} texto={'Carregando ' + oQue + '…'} />
  if (f.estado === 'erro') return <Erro titulo={'Não consegui carregar ' + oQue} texto={f.erro} onTentar={onTentar} />
  if (f.estado === 'sem_permissao') return <p className="ui-nota">Sua função não lê {oQue}.</p>
  if (f.estado === 'sem_participacao') return <p className="ui-nota">Sem participação nesta edição: não há {oQue} para mostrar.</p>
  return null
}

const Vazio_ = ({ children = 'Não informado' }) => <span className="fg-vazio">{children}</span>

// Pares rótulo/valor. Rótulo pequeno, valor com presença. `largo` ocupa a linha.
function Dados({ itens }) {
  const lista = itens.filter(Boolean)
  if (!lista.length) return null
  return (
    <dl className="fg-dados">
      {lista.map(([r, v, op = {}], i) => (
        <div key={i} className={'fg-dado' + (op.largo ? ' fg-dado--largo' : '')}>
          <dt>{r}</dt>
          <dd>{v == null || v === '' || v === false ? <Vazio_>{op.vazio}</Vazio_> : v}</dd>
        </div>
      ))}
    </dl>
  )
}

// Texto longo: a consulta normal mostra o começo; o resto a um toque, sem tooltip.
function TextoLongo({ texto, limite = 360 }) {
  const [aberto, setAberto] = React.useState(false)
  if (!texto) return null
  if (texto.length <= limite) return <span className="fg-texto">{texto}</span>
  return (
    <span className="fg-texto">
      {aberto ? texto : texto.slice(0, limite).replace(/\s+\S*$/, '') + '…'}{' '}
      <button type="button" className="ui-link fg-ler-mais" aria-expanded={aberto} onClick={() => setAberto((x) => !x)}>
        {aberto ? 'Mostrar menos' : 'Ler descrição completa'}
      </button>
    </span>
  )
}

function SecaoFicha({ id, titulo, nota, acoes, edicao, children }) {
  return (
    <section className="fg-secao" id={'fg-' + id} aria-labelledby={'fg-' + id + '-t'} tabIndex={-1}>
      <header className="fg-secao__cabeca">
        <div>
          <h3 className="fg-secao__titulo" id={'fg-' + id + '-t'}>{titulo}</h3>
          {nota && <p className="fg-secao__nota">{nota}</p>}
        </div>
        {!edicao && acoes && <div className="fg-secao__acoes">{acoes}</div>}
      </header>
      {edicao || children}
    </section>
  )
}

// Ações da seção pela função de quem lê; null quando não há nenhuma (a seção fica sem barra).
function botoesAcao(secao, pode, ctx, onEditar) {
  const lista = acoesDaSecao(secao, pode, ctx)
  return lista.length ? lista.map((a) => (
    <Botao key={a.editor + a.rotulo} icone="editar" variante={a.principal ? undefined : 'secundario'} onClick={() => onEditar({ secao, editor: a.editor })}>{a.rotulo}</Botao>
  )) : null
}

/* ── Pendências (coluna auxiliar) ──────────────────────────────────────── */
export function Pendencias({ itens, carregando, onIr }) {
  return (
    <section className="fg-pend" aria-labelledby="fg-pend-t">
      <h3 className="fg-pend__titulo" id="fg-pend-t">Pendências{!carregando && itens.length > 0 ? ' (' + itens.length + ')' : ''}</h3>
      {carregando && <Carregando linhas={2} texto="Conferindo as pendências…" />}
      {!carregando && itens.length === 0 && <p className="ui-nota ui-nota--ok">Nada pendente no que foi possível verificar.</p>}
      {itens.length > 0 && (
        <ul className="fg-pend__lista">
          {itens.map((x) => (
            <li key={x.chave} className={x.erro ? 'is-erro' : ''}>
              <button type="button" className="fg-pend__item" onClick={() => onIr(x.secao)}>
                <span>{x.texto}</span>
                <span className="fg-pend__onde">{ONDE[x.secao] || 'Ver'} <Icone nome="ir" tamanho={16} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
const ONDE = { cadastro: 'Cadastro', combo: 'Tema e combo', unidades: 'Unidades', fotos: 'Fotos', operacao: 'Operação', publicacao: NOMES_PUBLICACAO.marcas.pagina, comunicacao: 'Comunicação' }

/* ── Seções ────────────────────────────────────────────────────────────── */
function SecaoCadastro({ p, logo, fontes, recarregar, acoes, edicao }) {
  const nuc = fontes.nucleo
  const m = nuc.estado === 'ok' && nuc.dados && nuc.dados.marca ? nuc.dados.marca : p
  return (
    <SecaoFicha id="cadastro" titulo="Cadastro" nota="Dados da marca, válidos para todas as edições." acoes={acoes} edicao={edicao}>
      <h4 className="fg-sub">Contato interno <small>só a equipe vê</small></h4>
      <Dados itens={[
        ['Responsável', m.responsavel],
        ['WhatsApp do responsável', m.telefone && mascaraWhatsApp(m.telefone)],
        ['E-mail', m.email],
      ]} />
      <h4 className="fg-sub">No site <small>o que o público lê</small></h4>
      <Dados itens={[
        ['Nome oficial', m.nome_marca],
        ['Apresentação', nuc.estado === 'ok' ? m.apresentacao_publica && <TextoLongo texto={m.apresentacao_publica} /> : <EstadoFonte f={nuc} oQue="a apresentação" onTentar={recarregar} linhas={1} />, { largo: true }],
        ['Instagram', m.instagram],
        ['Site', m.site],
        ['Logo', <Selo key="l" dominio="logo" valor={estadoLogoLista(logo)} />],
      ]} />
      <h4 className="fg-sub">Dados fiscais</h4>
      <Dados itens={[['Razão social', m.razao_social], ['CNPJ', m.cnpj]]} />
      <p className="fg-nota-fim">O contato de cada loja (WhatsApp público, canais de pedido) fica em Unidades.</p>
    </SecaoFicha>
  )
}

function Alimentar({ a, f, onTentar }) {
  if (a === null) return <EstadoFonte f={f} oQue="as informações alimentares" onTentar={onTentar} linhas={2} />
  const grupo = (estado) => a.alergenicos.filter((x) => x.estado === estado).map((x) => (x.observacao && x.aspecto === 'outro_alergenico' ? x.observacao : x.rotulo))
  const semResposta = a.alergenicos.filter((x) => !x.estado).map((x) => x.rotulo)
  const obs = [...a.alergenicos, ...a.caracteristicas].filter((x) => x.observacao && x.aspecto !== 'outro_alergenico')
  const lista = (l) => (l.length ? l.join(', ') : null)
  return (
    <div className="fg-alimentar">
      <p className="fg-alimentar__conta">{a.respondidos} de {a.total} alergênicos respondidos</p>
      <Dados itens={[
        lista(grupo('contem')) && ['Contém', lista(grupo('contem'))],
        lista(grupo('pode_conter')) && ['Pode conter (contato cruzado)', lista(grupo('pode_conter'))],
        lista(grupo('nao_contem')) && ['Não contém', lista(grupo('nao_contem'))],
        lista(grupo('nao_informado')) && ['A marca não soube informar', lista(grupo('nao_informado'))],
        lista(semResposta) && ['Sem resposta', lista(semResposta)],
        ['Características', a.caracteristicas.map((x) => x.rotulo + ': ' + (x.estado ? x.texto : 'sem resposta')).join(' · '), { largo: true }],
        obs.length > 0 && ['Observações', obs.map((x) => x.rotulo + ': ' + x.observacao).join(' · '), { largo: true }],
      ]} />
    </div>
  )
}

function Componente({ c, fotos, f, onTentar }) {
  // A foto aprovada vem primeiro; sem ela, a mais recente registrada para o componente.
  const doItem = fotos.filter((x) => x.papel === 'item' && c.id && x.itemId === c.id)
  const foto = doItem.find((x) => x.estado === 'aprovada') || doItem[0]
  return (
    <article className="fg-bloco" aria-labelledby={'fg-item-' + c.posicao}>
      <h4 className="fg-bloco__titulo" id={'fg-item-' + c.posicao}><span className="fg-bloco__tipo">{c.posicao}º · {c.rotuloTipo}</span>{c.nome || <Vazio_>Sem nome</Vazio_>}</h4>
      <div className={foto ? 'fg-bloco__com-foto' : ''}>
        {foto && <Miniatura foto={foto} pequena />}
        <Dados itens={[
          ['Descrição', c.descricao && <TextoLongo texto={c.descricao} />, { largo: true }],
          ['Ingredientes', c.ingredientes && <TextoLongo texto={c.ingredientes} limite={240} />, { largo: true }],
        ]} />
      </div>
      <h5 className="fg-sub fg-sub--menor">Informações alimentares</h5>
      <Alimentar a={c.alimentar} f={f} onTentar={onTentar} />
      <h5 className="fg-sub fg-sub--menor">Substituições</h5>
      {c.trocas === null ? <EstadoFonte f={f} oQue="as substituições" onTentar={onTentar} linhas={1} />
        : c.trocas.length === 0 ? <p className="fg-vazio">Nenhuma substituição informada.</p>
          : (
            <ul className="fg-trocas">
              {c.trocas.map((t, i) => (
                <li key={i}>
                  <b>{t.original} → {t.alternativa}</b>
                  <span>{[t.disponibilidade, t.acrescimo, 'em ' + t.modalidades, t.unidades].join(' · ')}</span>
                  {t.comoSolicitar && <span>Como pedir: {t.comoSolicitar}</span>}
                  {t.alimentar && t.alimentar.contem.length > 0 && <span>A alternativa contém: {t.alimentar.contem.join(', ')}</span>}
                </li>
              ))}
            </ul>
          )}
      {(c.legado.selos.length > 0 || c.legado.substituicao) && (
        <p className="fg-legado">Cadastro anterior, não confirmado: {[c.legado.selos.length > 0 && 'marcado como ' + c.legado.selos.join(', '), c.legado.substituicao && 'substituição "' + c.legado.substituicao + '"'].filter(Boolean).join('; ')}.</p>
      )}
    </article>
  )
}

function SecaoCombo({ p, fontes, recarregar, pode, onEditar, edicaoAberta }) {
  const nuc = fontes.nucleo
  const pub = fontes.publicacao
  const pubOk = pub.estado === 'ok' && pub.dados
  const ed = fontes.edicoes.estado === 'ok' ? edicaoDaFicha(p.edicao_codigo, fontes.edicoes.dados) : null
  const valorCombo = ed ? ((fontes.edicoes.dados || []).find((e) => e.codigo === p.edicao_codigo) || {}).valor_combo : undefined
  if (nuc.estado !== 'ok') {
    return <SecaoFicha id="combo" titulo="Tema e combo"><EstadoFonte f={nuc} oQue="o tema e o combo" onTentar={recarregar} /></SecaoFicha>
  }
  const d = nuc.dados
  const pa = d.participacao || {}
  const tema = situacaoTema(pa, d.temas)
  const unidades = unidadesDaFicha(d.unidades, pubOk ? pub.dados : null)
  const nomeUni = (idp) => (unidades.find((u) => u.idPublico === idp) || {}).nome || idp
  const comps = componentesDaFicha(d.itens, pubOk ? (pub.dados.atual && pub.dados.atual.combo && pub.dados.atual.combo.itens) || [] : null, nomeUni)
  const fotos = pubOk ? fotosDaFicha(pub.dados.midias, pub.dados, comps, unidades) : []
  const principal = fotos.find((x) => x.principal)
  const participam = unidades.filter((u) => u.participa)
  const nModo = (k) => participam.filter((u) => u.modos[k] === 'sim').length
  const entrega = participam.some((u) => u.modos.delivery === 'sim')
  const sim = (v) => (v === true ? 'Sim' : v === false ? 'Não' : null)
  const ctx = { temaEstado: tema.estado, comboStatus: pa.combo_status }
  return (
    <SecaoFicha id="combo" titulo="Tema e combo" acoes={botoesAcao("combo", pode, ctx, onEditar)} edicao={edicaoAberta}>
      <Dados itens={[
        ['Tema geral da edição', ed && ed.temaGeral ? ed.temaGeral + (ed.nome ? ' (' + ed.nome + ')' : '') : fontes.edicoes.estado === 'carregando' ? 'Carregando…' : null, { vazio: 'Não definido' }],
        ['Tema escolhido pela marca', tema.tema && <>{tema.tema} <Selo tom={TOM_TEMA[tema.estado]}>{TEXTO_TEMA[tema.estado]}</Selo></>, { vazio: TEXTO_TEMA.sem_tema }],
        tema.estado === 'divergente' && ['Última proposta registrada', tema.temaProposta + ' (' + rotulo('tema', tema.proposta.status) + ')'],
        tema.proposta && tema.proposta.decidido_em && ['Análise do tema', 'Por ' + (tema.proposta.decidido_rotulo || 'organização') + ' ' + tempoRelativo(tema.proposta.decidido_em) + (tema.proposta.observacao ? ': "' + tema.proposta.observacao + '"' : '')],
        ['Justificativa do tema', tema.justificativa && <TextoLongo texto={tema.justificativa} />, { largo: true }],
      ]} />
      <h4 className="fg-sub">O combo</h4>
      <div className={principal ? 'fg-bloco__com-foto' : ''}>
        {principal && <Miniatura foto={principal} />}
        <Dados itens={[
          ['Nome do combo', pa.combo_nome],
          ['Situação da revisão', <Selo key="c" dominio="combo" valor={pa.combo_status || 'rascunho'} />],
          pa.combo_revisao_nota && ['Nota da revisão para a marca', pa.combo_revisao_nota, { largo: true }],
          ['Descrição', pa.combo_descricao && <TextoLongo texto={pa.combo_descricao} />, { largo: true }],
          ['Proposta criativa', pa.combo_proposta && <TextoLongo texto={pa.combo_proposta} />, { largo: true }],
          ['Condições', pa.combo_condicoes, { largo: true }],
        ]} />
      </div>
      <h4 className="fg-sub">Preço e condições</h4>
      <Dados itens={[
        ['Preço do combo na edição', valorCombo != null ? formatarPreco(Number(valorCombo)) : fontes.edicoes.estado === 'carregando' ? 'Carregando…' : null, { vazio: 'Não definido pela organização' }],
        ['Sai para viagem', sim(pa.combo_para_viagem)],
        ['Custo da embalagem para viagem', pa.combo_para_viagem === false ? 'Não se aplica' : textoCusto(pa.custo_embalagem)],
        ['Custo do delivery', !entrega && participam.length ? 'Não se aplica (nenhuma unidade entrega o combo)' : textoCusto(pa.custo_delivery)],
        ['Retirada', participam.length ? nModo('retirada') + ' de ' + participam.length + (participam.length === 1 ? ' unidade' : ' unidades') : null, { vazio: 'Sem unidade participando' }],
        ['Delivery do combo', participam.length ? nModo('delivery') + ' de ' + participam.length + (participam.length === 1 ? ' unidade' : ' unidades') : null, { vazio: 'Sem unidade participando' }],
      ]} />
      <p className="fg-nota-fim">Custos de embalagem e entrega são da marca e não mudam o preço do combo.</p>
      <h4 className="fg-sub">Componentes ({comps.length})</h4>
      {comps.length === 0 ? <p className="fg-vazio">Nenhum componente cadastrado.</p>
        : comps.map((c) => <Componente key={c.id || c.posicao} c={c} fotos={fotos} f={pub} onTentar={recarregar} />)}
    </SecaoFicha>
  )
}

function Unidade({ u }) {
  const modos = 'No local: ' + textoResposta(u.modos.local) + ' · Retirada: ' + textoResposta(u.modos.retirada) + ' · Delivery: ' + textoResposta(u.modos.delivery)
  const coord = u.coordenada.estado === 'conferida' ? 'Conferida' + (u.coordenada.por ? ' por ' + u.coordenada.por : '') + (u.coordenada.em ? ' em ' + dataCurta(u.coordenada.em) : '')
    : u.coordenada.estado === 'a_conferir' ? 'Ponto informado, a conferir' : 'Sem ponto no mapa'
  return (
    <article className="fg-bloco" aria-labelledby={'fg-uni-' + u.id}>
      <h4 className="fg-bloco__titulo" id={'fg-uni-' + u.id}>
        {u.nome}
        {u.participa ? <Selo tom="ok">Participa desta edição</Selo> : <Selo tom="encerrado">Não participa desta edição</Selo>}
      </h4>
      <Dados itens={[
        ['Endereço', u.enderecoTexto && <>{u.enderecoTexto}{u.endereco.referencia && <span className="fg-texto-apoio"> Referência: {u.endereco.referencia}</span>}</>, { largo: true, vazio: 'Endereço não informado' }],
        ['Localização no mapa', <>{coord}{(u.mapa || u.trajeto) && <span className="fg-links">{u.mapa && <a className="og-link" href={u.mapa} target="_blank" rel="noreferrer">Abrir no mapa</a>}{u.trajeto && <a className="og-link" href={u.trajeto} target="_blank" rel="noreferrer">Trajeto</a>}</span>}</>, { largo: true }],
        u.participa && ['Horário da loja', u.horarioLoja],
        u.participa && ['Horário do combo', u.horarioCombo === null ? null : u.horarioCombo.length ? <ul className="fg-lista">{u.horarioCombo.map((h) => <li key={h.dias}><b>{h.dias}</b>{h.faixas}</li>)}</ul> : null, { largo: true, vazio: u.horarioCombo === null ? 'Não carregou' : 'Não informado' }],
        u.participa && ['Atendimento do combo', modos, { largo: true }],
        u.participa && u.modos.delivery === 'sim' && ['Canais de pedido', u.canais.length ? u.canais.map((c, i) => <span key={i} className="fg-canal">{c.rotulo}{c.link && <>: {linkWebSeguro(c.link) ? <a className="og-link" href={linkWebSeguro(c.link)} target="_blank" rel="noreferrer">{c.link}</a> : <span>{c.link} (endereço inválido)</span>}</>}</span>) : null, { largo: true }],
        u.participa && u.modos.delivery === 'sim' && ['Regiões de entrega', u.regioes],
        u.participa && u.modos.delivery === 'sim' && ['Taxa de entrega', u.taxa],
        u.participa && ['WhatsApp público da loja', u.whatsappPublico && mascaraWhatsApp(u.whatsappPublico), { vazio: 'Não divulgado no site' }],
        u.observacao && ['Condições nesta edição', u.observacao, { largo: true }],
        (u.anterior.horarios || u.anterior.mesas) && ['Cadastro anterior', [u.anterior.horarios && 'horário: ' + u.anterior.horarios, u.anterior.mesas && 'mesas: ' + u.anterior.mesas].filter(Boolean).join(' · '), { largo: true }],
      ]} />
    </article>
  )
}

function SecaoUnidades({ fontes, recarregar, pode, onEditar, edicaoAberta }) {
  const nuc = fontes.nucleo
  const pub = fontes.publicacao
  const pubOk = pub.estado === 'ok' && pub.dados
  const acoes = botoesAcao("unidades", pode, { temPublicacao: !!pubOk }, onEditar)
  if (nuc.estado !== 'ok' && !pubOk) {
    return <SecaoFicha id="unidades" titulo="Unidades"><EstadoFonte f={nuc.estado === 'carregando' || pub.estado === 'carregando' ? { estado: 'carregando' } : nuc} oQue="as unidades" onTentar={recarregar} /></SecaoFicha>
  }
  const unidades = unidadesDaFicha(nuc.estado === 'ok' ? nuc.dados.unidades : [], pubOk ? pub.dados : null)
  const n = unidades.filter((u) => u.participa).length
  return (
    <SecaoFicha id="unidades" titulo={'Unidades (' + unidades.length + ')'} acoes={acoes} edicao={edicaoAberta}
      nota={unidades.length ? n + (n === 1 ? ' participa' : ' participam') + ' desta edição. Endereço e mapa são do cadastro permanente; horário e atendimento são desta edição.' : null}>
      {!pubOk && pub.estado !== 'sem_participacao' && (
        <div className="fg-aviso-fonte"><EstadoFonte f={pub} oQue="o endereço completo e os horários desta edição" onTentar={recarregar} linhas={1} /></div>
      )}
      {unidades.length === 0 ? <p className="fg-vazio">Nenhuma unidade vinculada a esta participação.</p>
        : unidades.map((u) => <Unidade key={u.id} u={u} />)}
    </SecaoFicha>
  )
}

function Miniatura({ foto, pequena }) {
  const url = urlPublica(SUPABASE_URL, BUCKET_EDICAO, foto.path)
  return (
    <figure className={'fg-foto' + (pequena ? ' fg-foto--pequena' : '')}>
      <a href={url} target="_blank" rel="noreferrer" className="fg-foto__link" aria-label={'Ampliar: ' + foto.rotuloPapel + (foto.alvo ? ' — ' + foto.alvo : '')}>
        <img src={url} alt={foto.alt || ''} loading="lazy" width={foto.largura || undefined} height={foto.altura || undefined} />
      </a>
      <figcaption>
        <b>{foto.rotuloPapel}{foto.alvo ? ' · ' + foto.alvo : ''}</b>
        <span>{foto.situacao}</span>
        {!pequena && <span>{foto.alt ? 'Texto alternativo: ' + foto.alt : 'Sem texto alternativo'}{foto.credito ? ' · Crédito: ' + foto.credito : ''}</span>}
      </figcaption>
    </figure>
  )
}

function SecaoFotos({ fontes, recarregar, pode, onEditar, edicaoAberta }) {
  const [todas, setTodas] = React.useState(false)
  const pub = fontes.publicacao
  const nuc = fontes.nucleo
  const pubOk = pub.estado === 'ok' && pub.dados
  const acoes = botoesAcao("fotos", pode, { temPublicacao: !!pubOk }, onEditar)
  if (!pubOk) return <SecaoFicha id="fotos" titulo="Fotos"><EstadoFonte f={pub} oQue="as fotos" onTentar={recarregar} /></SecaoFicha>
  const itens = nuc.estado === 'ok' ? nuc.dados.itens : []
  const comps = componentesDaFicha(itens, null)
  const unidades = unidadesDaFicha(nuc.estado === 'ok' ? nuc.dados.unidades : [], pub.dados)
  const fotos = fotosDaFicha(pub.dados.midias, pub.dados, comps, unidades)
  const n = todas ? fotos.length : fotosIniciais(fotos)
  const conta = (fn) => fotos.filter(fn).length
  return (
    <SecaoFicha id="fotos" titulo={'Fotos (' + fotos.length + ')'} acoes={acoes} edicao={edicaoAberta}
      nota={fotos.length ? [conta((x) => x.estado === 'enviada') + ' recebidas aguardando revisão', conta((x) => x.estado === 'aprovada') + ' aprovadas', conta((x) => x.publicada) + ' no ar'].join(' · ') : null}>
      {fotos.length === 0 ? <p className="fg-vazio">Nenhuma foto registrada nesta edição. As fotos da sessão oficial entram aqui; só as aprovadas vão ao site.</p> : (
        <>
          <div className="fg-fotos">{fotos.slice(0, n).map((x) => <Miniatura key={x.id} foto={x} />)}</div>
          {n < fotos.length && <Botao icone="mais" variante="secundario" onClick={() => setTodas(true)}>Mostrar mais {fotos.length - n} {fotos.length - n === 1 ? 'foto' : 'fotos'}</Botao>}
        </>
      )}
    </SecaoFicha>
  )
}

function SecaoOperacao({ p, fontes, recarregar, pode, onEditar, onIr, edicaoAberta }) {
  const nuc = fontes.nucleo
  const acoes = botoesAcao("operacao", pode, {}, onEditar)
  if (nuc.estado !== 'ok') return <SecaoFicha id="operacao" titulo="Operação"><EstadoFonte f={nuc} oQue="a operação" onTentar={recarregar} /></SecaoFicha>
  const d = nuc.dados
  const pa = d.participacao || {}
  // Sessões: a leitura traz as de todas as edições da marca; aqui vale a consultada.
  const sessoes = (d.sessoes || []).filter((s) => s.participacao_id === pa.id || (!s.participacao_id && s.edicao_codigo === pa.edicao_codigo))
  const outras = (d.sessoes || []).length - sessoes.length
  const abertas = (d.solicitacoes || []).filter((s) => s.estado !== 'respondido')
  const correcoes = fontes.correcoes.estado === 'ok' ? (fontes.correcoes.dados || []).filter((c) => c.estado !== 'resolvida') : null
  const vendas = d.vendas || []
  const totalVendas = vendas.reduce((s, v) => s + Number(v.quantidade || 0), 0)
  return (
    <SecaoFicha id="operacao" titulo="Operação" acoes={acoes} edicao={edicaoAberta}>
      <Dados itens={[
        ['Liberação para fotos', <><Selo key="f" dominio="foto" valor={pa.foto_liberacao} />{pa.foto_liberacao_motivo && <span className="fg-texto-apoio"> {pa.foto_liberacao_motivo}</span>}</>, { largo: true }],
        ['Sessão de fotos', sessoes.length ? (
          <ul className="fg-lista">{sessoes.slice(0, 3).map((s) => (
            <li key={s.id}><b>{dataHoraCurta(s.data_hora)} · {rotulo('sessao', s.status)}</b>{[s.local, s.responsavel_organizacao && 'organização: ' + s.responsavel_organizacao, s.responsavel_participante && 'na marca: ' + s.responsavel_participante].filter(Boolean).join(' · ')}</li>
          ))}</ul>) : null, { largo: true, vazio: 'Nenhuma sessão nesta edição' + (outras > 0 ? ' (' + outras + ' de outra edição)' : '') }],
        ['Pedidos da organização sem resposta', abertas.length ? <ul className="fg-lista">{abertas.map((s) => <li key={s.id}><b>{s.titulo}</b>{s.prazo_em ? 'prazo ' + dataCurta(s.prazo_em) : ''}</li>)}</ul> : 'Nenhum', { largo: true }],
        ['Alterações pedidas à marca', correcoes === null ? <EstadoFonte f={fontes.correcoes} oQue="as alterações pedidas" onTentar={recarregar} linhas={1} />
          : correcoes.length ? <button type="button" className="ui-link" onClick={() => onIr('comunicacao')}>{correcoes.length} {correcoes.length === 1 ? 'aberta' : 'abertas'}: ver em Comunicação</button> : 'Nenhuma aberta'],
        ['Revisão de dados', (d.pendencias || []).length ? (d.pendencias || []).length + ' para conferir' : 'Nada para conferir'],
        ['Materiais', (d.materiais || []).length ? <ul className="fg-lista">{d.materiais.map((m) => <li key={m.id}><b>{(ROTULO_MATERIAL[m.item] || m.item) + (m.quantidade != null ? ' · ' + m.quantidade : '')}</b>{ROTULO_MATERIAL_STATUS[m.status]}{m.recebido_por ? ' · recebido por ' + m.recebido_por : ''}</li>)}</ul> : null, { largo: true, vazio: 'Nenhum material registrado' }],
        ['Arquivos enviados à marca', (d.arquivos || []).length ? <ul className="fg-lista">{d.arquivos.map((a) => <li key={a.id}><b>{a.nome}</b>{a.exige_leitura ? (a.lido_em ? 'leu em ' + dataCurta(a.lido_em) : 'leitura não confirmada') : 'sem confirmação de leitura'}</li>)}</ul> : null, { largo: true, vazio: 'Nenhum arquivo' }],
        vendas.length > 0 && ['Vendas lançadas', totalVendas + (totalVendas === 1 ? ' combo' : ' combos') + ' em ' + vendas.length + (vendas.length === 1 ? ' dia' : ' dias')],
        // Pagamento só para quem gere pagamento — mesma regra da edição dele.
        pode('pagamento.gerir') && ['Pagamento da taxa', <Selo key="p" dominio="pagamento" valor={pa.pagamento_status} />],
      ]} />
    </SecaoFicha>
  )
}

function SecaoPublicacao({ p, fontes, recarregar, pode, onEditar, edicaoAberta, previa, onPrevia, PreviaPagina }) {
  const pub = fontes.publicacao
  if (pub.estado !== 'ok' || !pub.dados) return <SecaoFicha id="publicacao" titulo={NOMES_PUBLICACAO.marcas.pagina}><EstadoFonte f={pub} oQue="a publicação" onTentar={recarregar} /></SecaoFicha>
  const r = resumoPublicacao(pub.dados)
  const ctx = { unidades: pub.dados.unidades, itens: pub.dados.atual && pub.dados.atual.combo && pub.dados.atual.combo.itens }
  const acoes = <>{botoesAcao("publicacao", pode, { temPublicacao: true }, onEditar)}
    {pub.dados.atual && <Botao icone="visao" variante="secundario" aria-expanded={previa} onClick={() => onPrevia(!previa)}>{previa ? 'Fechar prévia' : 'Ver prévia pública'}</Botao>}</>
  return (
    <SecaoFicha id="publicacao" titulo={NOMES_PUBLICACAO.marcas.pagina} acoes={acoes} edicao={edicaoAberta}
      nota="O que está no ar é uma cópia congelada: o cadastro pode mudar sem mudar o site, até a próxima publicação.">
      <Dados itens={[
        ['No site', <><Selo key="s" dominio="publicacao" valor={r.estado} /> <span className="fg-texto-apoio">{r.texto}</span></>, { largo: true }],
        r.versao && ['Versão no ar', 'v' + r.versao + (r.nivel === 'marca' ? ' (só a casa, sem o combo)' : ' (casa e combo)') + ' · ' + dataHoraCurta(r.publicadoEm) + (r.publicadoPor ? ' · por ' + r.publicadoPor : '')],
        r.retirada && ['Retirada', dataHoraCurta(r.retirada.em) + (r.retirada.por ? ' · por ' + r.retirada.por : '') + (r.retirada.motivo ? ' · "' + r.retirada.motivo + '"' : ''), { largo: true }],
        ['Link público', r.link ? <a className="og-link" href={r.link} target="_blank" rel="noreferrer">{r.link}</a> : r.reservado ? <span>{r.reservado} <span className="fg-texto-apoio">(reservado, ainda não está no ar)</span></span> : null, { largo: true, vazio: 'Gerado na primeira publicação' }],
        ['Cadastro atual × versão no ar', r.diferencas == null ? 'Nada no ar ainda' : r.diferencas === 0 ? 'Iguais' : r.diferencas + (r.diferencas === 1 ? ' campo mudou' : ' campos mudaram') + ' desde a v' + r.versao],
        ['Revisão do combo', <><Selo key="c" dominio="combo" valor={r.comboStatus || 'rascunho'} />{r.alterado && <span className="fg-texto-apoio"> Alterado depois da aprovação</span>}</>],
        ['O que impede publicar o combo', r.pendencias ? <ul className="fg-lista">{pub.dados.pendencias.map((c) => <li key={c}>{traduzirPendencia(c, ctx)}</li>)}</ul> : 'Nada: tudo que a página pública pede está preenchido', { largo: true }],
      ]} />
      {previa && pub.dados.atual && <PreviaPagina conteudo={pub.dados.atual} nome={p.nome_marca || 'esta casa'} />}
    </SecaoFicha>
  )
}

/* ── A visão ───────────────────────────────────────────────────────────── */
export function VisaoParticipante({ p, logo, fontes, recarregar, pode, pendencias, carregandoPend, editando, renderEditor, onEditar, onIr, previa, onPrevia, PreviaPagina }) {
  const comum = { p, fontes, recarregar, pode, onEditar, onIr }
  const ed = (id) => (editando && editando.secao === id ? renderEditor(editando) : null)
  return (
    <div className="fg-visao">
      <aside className="fg-lado" aria-label="Pendências desta participação">
        <Pendencias itens={pendencias} carregando={carregandoPend} onIr={onIr} />
      </aside>
      <div className="fg-principal">
        <SecaoCadastro {...comum} logo={logo} acoes={botoesAcao("cadastro", pode, {}, onEditar)} edicao={ed('cadastro')} />
        {!p.participacao_id ? (
          <Vazio titulo="Sem participação aberta">
            Tema, combo, unidades, fotos, operação e publicação são por edição, e esta marca não tem participação aberta. Abra a edição em Edição › Configuração para o formulário aparecer.
          </Vazio>
        ) : (
          <>
            <SecaoCombo {...comum} edicaoAberta={ed('combo')} />
            <SecaoUnidades {...comum} edicaoAberta={ed('unidades')} />
            <SecaoFotos {...comum} edicaoAberta={ed('fotos')} />
            <SecaoOperacao {...comum} edicaoAberta={ed('operacao')} />
            <SecaoPublicacao {...comum} edicaoAberta={ed('publicacao')} previa={previa} onPrevia={onPrevia} PreviaPagina={PreviaPagina} />
          </>
        )}
      </div>
    </div>
  )
}
