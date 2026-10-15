import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { linkWhatsApp, mascaraWhatsApp } from '../../lib/participantes'
import { rotulo } from '../../lib/status'
import { urlLogo } from '../../lib/logos'
import { destinoNaFicha, subDaFicha } from '../../lib/rota'
import { SECOES_VISAO, pendenciasDaFicha, processosDaFicha, edicaoDaFicha } from '../../lib/fichaGeral'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Conversa } from '../Conversa'
import { Atividade } from '../Atividade'
import { Icone, MODULO_ICONE } from '../Icone'
import { Carregando, Vazio, Erro, Abas, painelDaAba, Selo, Modulo, MacroSecao, GradeModulos, Botao, MaisAcoes, LogoMarca, traduzirErro, Escolha, NivelTitulo } from '../ui'
import { confirmar } from '../Confirmar'
import { AbaOperacao, AbaTrajetoria } from './FichaOperacao'
import { AbaCadastroMarca, AbaCombo, AbaUnidades, CorrecoesCampo } from './FichaCadastro'
import { AbaAcesso } from './AcessoMarca'
import { AbaPublicacao, PreviaPagina, ConferirLocalizacao, RevisarFotos } from './Publicacao'
import { useFichaGeral, VisaoParticipante } from './FichaVisao'

/*
 * Ficha do participante (15/10/2026 — ficha geral). Mesmo endereço de antes
 * (#participantes/lista?item=…&sub=…). Quatro vistas no lugar das dez abas:
 *   Visão do participante (padrão) → tudo que foi preenchido, para ler, com
 *     âncoras por seção; editar abre o editor de sempre NO LUGAR da seção
 *   Comunicação → conversa e alterações pedidas
 *   Histórico   → atividade no painel + trajetória no festival
 *   Gestão      → acesso e administração
 * Os `sub` das abas antigas são traduzidos em lib/rota.js (destinoNaFicha).
 */
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

export const pendenciasDe = (p) => Number(p.campos_faltando || 0) + Number(p.correcoes_abertas || 0) + Number(p.pedidos_abertos || 0)
export const pctCadastro = (p) => (p.participacao_id && Number(p.campos_total)
  ? Math.round(((Number(p.campos_total) - Number(p.campos_faltando || 0)) / Number(p.campos_total)) * 100) : null)

/* ── Mensagens ─────────────────────────────────────────────────────────── */
function AbaMensagens({ participante, pode, onLidas }) {
  const [msgs, setMsgs] = React.useState([])
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState(null)
  // Ref: o pai recria a função a cada render, e ela não pode reiniciar a busca.
  const lidasRef = React.useRef(onLidas)
  lidasRef.current = onLidas

  const carregar = React.useCallback(async () => {
    try {
      const l = await rpc('get_mensagens', { p_secret: lerSenha(), p_participante: participante.id })
      setMsgs(l || [])
      setErro(null)
      // Abrir a conversa é ler: marca as mensagens da marca como lidas.
      if ((l || []).some((m) => m.de === 'marca' && !m.lida_em)) {
        await rpc('ler_mensagens_org', { p_secret: lerSenha(), p_participante: participante.id })
        if (lidasRef.current) lidasRef.current()
      }
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [participante.id])

  React.useEffect(() => {
    carregar()
    const t = setInterval(() => { if (document.visibilityState === 'visible') carregar() }, 20000)
    return () => clearInterval(t)
  }, [carregar])

  async function enviar(corpo) {
    await rpc('enviar_mensagem', { p_secret: lerSenha(), p_participante: participante.id, p_corpo: corpo })
    await carregar()
  }

  return (
    <Modulo icone={MODULO_ICONE.mensagens} titulo="Conversa com a marca" largo>
      <Conversa
        mensagens={msgs} lado="organizacao" rotuloOutro={participante.nome_marca}
        carregando={carregando} erro={erro} onTentar={carregar}
        onEnviar={enviar}
        podeEnviar={pode('mensagem.enviar') && !!participante.user_id}
        semPermissao={!participante.user_id ? 'A marca ainda não tem acesso ao painel: crie o acesso para poder conversar por aqui.' : 'Sua função só lê as mensagens.'}
      />
    </Modulo>
  )
}

/* ── Histórico: quem fez o quê + observações internas ──────────────────── */
function AbaHistorico({ participante, pode }) {
  const [linhas, setLinhas] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [texto, setTexto] = React.useState('')
  const [salvando, setSalvando] = React.useState(false)
  const [avisoObs, setAvisoObs] = React.useState(null)
  const [filtro, setFiltro] = React.useState('')

  const carregar = React.useCallback(async () => {
    setErro(null)
    try {
      setLinhas((await rpc('get_atividade', { p_secret: lerSenha(), p_participante: participante.id, p_limite: 300 })) || [])
    } catch (e) {
      setErro(e.message)
    }
  }, [participante.id])
  React.useEffect(() => { carregar() }, [carregar])

  async function salvarObs(ev) {
    ev.preventDefault()
    if (!texto.trim()) return
    setSalvando(true)
    setAvisoObs(null)
    try {
      await rpc('adicionar_observacao', { p_secret: lerSenha(), p_participante: participante.id, p_texto: texto.trim() })
      setTexto('')
      await carregar()
    } catch (e) {
      setAvisoObs(traduzirErro(e.message))
    } finally {
      setSalvando(false)
    }
  }

  const visiveis = (linhas || []).filter((a) => !filtro || (filtro === 'observacao' ? a.acao === 'observacao' : a.acao !== 'observacao'))

  return (
    <GradeModulos className="ui-modulos--dois">
      <Modulo icone="editar" titulo="Observação interna" sub="Só a equipe vê. Fica no histórico com o seu nome.">
        {pode('triagem.editar') ? (
          <form className="ui-form" onSubmit={salvarObs}>
            <label className="og-campo">
              <span>Observação</span>
              <textarea rows={3} placeholder="Ex.: informou por telefone que envia a foto nova amanhã." value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} />
            </label>
            <div className="ui-acoes"><button className="og-btn og-btn--mini" type="submit" disabled={salvando || !texto.trim()}>{salvando ? 'Salvando…' : 'Registrar observação'}</button></div>
            {avisoObs && <p className="ui-nota ui-nota--erro" role="alert">{avisoObs}</p>}
          </form>
        ) : <p className="ui-nota">Sua função lê o histórico, mas não registra observação.</p>}
      </Modulo>
      <Modulo icone={MODULO_ICONE.historico} titulo="Linha do tempo" largo>
        <Escolha rotulo="Mostrar" valor={filtro} onMudar={setFiltro}
          opcoes={[['', 'Tudo'], ['observacao', 'Só observações'], ['acoes', 'Só ações']]} />
        {erro && <Erro texto={erro} onTentar={carregar} />}
        {!erro && linhas === null && <Carregando linhas={4} />}
        {!erro && linhas && visiveis.length === 0 && <Vazio titulo="Nada registrado ainda">As mudanças de status, mensagens, pedidos e observações desta marca aparecem aqui, com quem fez e quando.</Vazio>}
        {!erro && linhas && visiveis.length > 0 && <Atividade linhas={visiveis} comMarca={false} />}
      </Modulo>
    </GradeModulos>
  )
}

/* ── Editor aberto no lugar da seção ───────────────────────────────────────
 * Reaproveita o editor de sempre (nenhum JSX de edição copiado). Formulário
 * com digitação e ainda não enviado = alteração não salva: sair pergunta
 * antes, e fechar a aba do navegador também avisa. */
function EdicaoNaSecao({ titulo, onConcluir, sujoRef, children }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    const el = ref.current
    const sujos = new Set()
    const marcar = (e) => { const f = e.target && e.target.closest && e.target.closest('form'); if (f) sujos.add(f) }
    const limpar = (e) => { sujos.delete(e.target) }
    const temSujo = () => [...sujos].some((f) => f.isConnected)
    const antes = (e) => { if (temSujo()) { e.preventDefault(); e.returnValue = '' } }
    el.addEventListener('input', marcar, true)
    el.addEventListener('change', marcar, true)
    el.addEventListener('submit', limpar, true)
    window.addEventListener('beforeunload', antes)
    sujoRef.current = temSujo
    return () => {
      el.removeEventListener('input', marcar, true)
      el.removeEventListener('change', marcar, true)
      el.removeEventListener('submit', limpar, true)
      window.removeEventListener('beforeunload', antes)
      sujoRef.current = () => false
    }
  }, [sujoRef])
  return (
    <div className="fg-editor" ref={ref} role="group" aria-label={titulo}>
      <div className="fg-editor__barra">
        <p className="fg-editor__titulo"><Icone nome="editar" tamanho={16} />{titulo}<span>Cada bloco salva sozinho. Concluir volta à leitura com os dados novos.</span></p>
        <Botao icone="sucesso" onClick={onConcluir}>Concluir edição</Botao>
      </div>
      <NivelTitulo.Provider value={3}>{children}</NivelTitulo.Provider>
    </div>
  )
}

const TITULO_EDITOR = {
  cadastro: 'Editando os dados da marca', combo: 'Editando tema e componentes', unidades: 'Editando as unidades',
  coordenadas: 'Conferindo a localização das unidades', fotos: 'Revisando as fotos', operacao: 'Operação da participação',
  publicacao: 'Publicação no site',
}

const VISTAS = [['visao', 'Visão do participante'], ['comunicacao', 'Comunicação'], ['historico', 'Histórico'], ['gestao', 'Gestão']]

function rolarPara(secao) {
  const el = document.getElementById('fg-' + secao)
  if (!el) return
  const reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ block: 'start', behavior: reduzir ? 'auto' : 'smooth' })
  el.focus({ preventScroll: true })
}
const depoisDoQuadro = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn))

export function FichaMarcaPagina({ participante: p, logo, sub, onSub, onVoltar, pode, onMudou, naoLidas = 0, onLidas }) {
  const { vista, secao } = destinoNaFicha(sub)
  const { fontes, recarregar } = useFichaGeral(p && p.participacao_id)
  const [editando, setEditando] = React.useState(null) // { secao, editor }
  const [previa, setPrevia] = React.useState(false)
  const sujoRef = React.useRef(() => false)
  const titulo = React.useRef(null)
  const idAbas = React.useId()
  const id = p && p.id

  // Outra marca: fecha editor e prévia da anterior; o foco vai ao nome.
  React.useEffect(() => { setEditando(null); setPrevia(false) }, [id])
  React.useEffect(() => { if (titulo.current && !secao) titulo.current.focus({ preventScroll: true }) }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  // Link para uma seção (aba antiga, pendência, recarga): rola até ela quando o
  // conteúdo de cima já tem altura — senão a seção "fugiria" ao carregar.
  const pronto = fontes.nucleo.estado !== 'carregando' && fontes.publicacao.estado !== 'carregando'
  React.useEffect(() => { if (vista === 'visao' && secao) depoisDoQuadro(() => rolarPara(secao)) }, [vista, secao, id, pronto])
  React.useEffect(() => { if (vista === 'historico' && secao === 'trajetoria') depoisDoQuadro(() => rolarPara('trajetoria')) }, [vista, secao, id])

  if (!p) return <Carregando linhas={4} />

  const podeSair = async () => !sujoRef.current() || confirmar('Há alterações não salvas neste editor. Sair sem salvar?', { acao: 'Sair sem salvar', perigo: true })
  const aposSalvar = () => { recarregar(); if (onMudou) onMudou() }

  async function mudarVista(v, sec = '') {
    if (editando && !(await podeSair())) return
    setEditando(null)
    onSub(subDaFicha(v, sec))
  }
  async function irPara(destino) {
    if (destino === 'comunicacao') return mudarVista('comunicacao')
    if (vista !== 'visao') return mudarVista('visao', destino)
    onSub(destino, { substituir: true })
    rolarPara(destino)
  }
  async function abrirEditor(alvo) {
    if (editando && !(await podeSair())) return
    setPrevia(false)
    setEditando(alvo)
    if (vista !== 'visao') onSub(alvo.secao)
    depoisDoQuadro(() => rolarPara(alvo.secao))
  }
  async function concluir() {
    if (!(await podeSair())) return
    const s = editando && editando.secao
    setEditando(null)
    aposSalvar()
    if (s) depoisDoQuadro(() => rolarPara(s))
  }
  async function voltar() {
    if (editando && !(await podeSair())) return
    onVoltar()
  }

  const pub = fontes.publicacao.estado === 'ok' ? fontes.publicacao.dados : null
  function editorDe(chave) {
    if (chave === 'cadastro') return <AbaCadastroMarca participante={p} pode={pode} onMudou={aposSalvar} />
    if (chave === 'combo') return <AbaCombo participante={p} pode={pode} onMudou={aposSalvar} />
    if (chave === 'unidades') return <AbaUnidades participante={p} pode={pode} onMudou={aposSalvar} />
    if (chave === 'operacao') return <AbaOperacao participante={p} pode={pode} />
    if (chave === 'publicacao') return <AbaPublicacao participante={p} pode={pode} onMudou={aposSalvar} />
    if (!pub) return <p className="ui-nota">Os dados desta edição não carregaram. Feche o editor e tente de novo.</p>
    if (chave === 'coordenadas') return <ConferirLocalizacao unidades={pub.unidades} pode={pode} onSalvo={aposSalvar} />
    if (chave === 'fotos') return <RevisarFotos pub={pub} participacaoId={p.participacao_id} edicao={p.edicao_codigo} pode={pode} onSalvo={aposSalvar} />
    return null
  }
  const renderEditor = (alvo) => (
    <EdicaoNaSecao titulo={TITULO_EDITOR[alvo.editor] || 'Editando'} onConcluir={concluir} sujoRef={sujoRef}>{editorDe(alvo.editor)}</EdicaoNaSecao>
  )

  const nome1 = String(p.responsavel || '').trim().split(/\s+/)[0]
  const wa = linkWhatsApp(p.telefone, nome1 ? 'Olá, ' + nome1 + '. ' : '')
  const destinoWa = [p.responsavel || 'responsável', p.telefone && mascaraWhatsApp(p.telefone)].filter(Boolean).join(' · ')
  const ed = fontes.edicoes.estado === 'ok' ? edicaoDaFicha(p.edicao_codigo, fontes.edicoes.dados) : null
  const processos = processosDaFicha(p, fontes)
  const pendencias = pendenciasDaFicha({ participante: p, fontes, naoLidas })
  const carregandoPend = ['nucleo', 'publicacao', 'correcoes'].some((k) => fontes[k].estado === 'carregando')
  const secoes = p.participacao_id ? SECOES_VISAO : SECOES_VISAO.slice(0, 1)

  return (
    <div className="fm-pagina">
      <button type="button" className="og-link fm-voltar" onClick={voltar}><Icone nome="voltar" tamanho={16} /> Todas as marcas</button>
      <header className="fg-cabeca">
        <span className="fg-logo"><LogoMarca url={urlLogo(logo && logo.path)} nome={p.nome_marca} tamanho={88} /></span>
        <div className="fg-cabeca__texto">
          <p className="fg-cabeca__edicao">
            {p.edicao_codigo ? 'Edição ' + p.edicao_codigo + (ed && ed.temaGeral ? ' · ' + ed.temaGeral : '') : 'Sem participação aberta'}
            {ed && ed.atual === false && <Selo tom="atencao">Não é a edição atual</Selo>}
          </p>
          <h2 className="fm-cabeca__nome" tabIndex={-1} ref={titulo}>{p.nome_marca || '(sem nome)'}</h2>
          <dl className="fg-processos">
            {processos.map((x) => (
              <div key={x.chave}><dt>{x.rotulo}</dt><dd><Selo dominio={x.dominio || undefined} valor={x.valor} tom={x.tom}>{x.texto}</Selo></dd></div>
            ))}
          </dl>
          {p.ultima_atividade && <p className="fg-cabeca__meta">Última atualização em {dataCurta(p.ultima_atividade)}</p>}
        </div>
        <div className="fg-cabeca__acoes">
          {wa && <a className="og-btn og-btn--mini og-btn--vazado" href={wa} target="_blank" rel="noreferrer" aria-label={'WhatsApp de ' + destinoWa} title={destinoWa}><Icone nome={MODULO_ICONE.whatsapp} tamanho={16} />WhatsApp{nome1 ? ' · ' + nome1 : ''}</a>}
          {pode('cadastro.editar') && <Botao icone="editar" variante="secundario" onClick={() => abrirEditor({ secao: 'cadastro', editor: 'cadastro' })}>Editar dados</Botao>}
          {pub && pub.atual && <Botao icone="visao" variante="secundario" onClick={() => { setPrevia(true); irPara('publicacao') }}>Ver prévia pública</Botao>}
          <MaisAcoes itens={[
            { rotulo: 'Comunicação e alterações pedidas', icone: 'alteracao', onClick: () => mudarVista('comunicacao') },
            { rotulo: 'Registrar observação interna', icone: 'historico', onClick: () => mudarVista('historico') },
            { rotulo: 'Ver trajetória no festival', icone: 'pessoas', onClick: () => mudarVista('historico', 'trajetoria') },
            { rotulo: 'Gerenciar acesso', icone: 'chave', onClick: () => mudarVista('gestao') },
            { rotulo: 'Arquivar marca', icone: 'arquivar', perigo: true, onClick: () => mudarVista('gestao') },
          ]} />
        </div>
      </header>

      <Abas idBase={idAbas} rotulo={'Ficha de ' + (p.nome_marca || 'participante')} ativa={vista} onMudar={(v) => mudarVista(v)}
        abas={VISTAS.map(([chave, r]) => ({ chave, rotulo: r, n: chave === 'comunicacao' ? naoLidas : 0 }))} />

      <div {...painelDaAba(idAbas, vista)} className="ui-painel-aba">
        {vista === 'visao' && (
          <>
            {secoes.length > 1 && (
              <nav className="fg-ancoras" aria-label="Seções da visão do participante">
                <ul className="fg-ancoras__lista">
                  {secoes.map(([k, r]) => (
                    <li key={k}><button type="button" className="fg-ancora" aria-current={secao === k ? 'location' : undefined} onClick={() => irPara(k)}>{r}</button></li>
                  ))}
                </ul>
                <Escolha className="fg-ancoras__celular" rotulo="Ir para seção" valor={secao} opcoes={secoes} onMudar={irPara} />
              </nav>
            )}
            <VisaoParticipante p={p} logo={logo} fontes={fontes} recarregar={recarregar} pode={pode}
              pendencias={pendencias} carregandoPend={carregandoPend} editando={editando} renderEditor={renderEditor}
              onEditar={abrirEditor} onIr={irPara} previa={previa} onPrevia={setPrevia} PreviaPagina={PreviaPagina} />
          </>
        )}
        {vista === 'comunicacao' && (
          <div className="ui-pilha">
            <AbaMensagens participante={p} pode={pode} onLidas={onLidas} />
            {p.participacao_id && <CorrecoesCampo participacaoId={p.participacao_id} pode={pode} onMudou={aposSalvar} />}
          </div>
        )}
        {vista === 'historico' && (
          <>
            <MacroSecao rotulo="Atividade" titulo="O que aconteceu nesta ficha" nota="Mudanças de situação, mensagens, pedidos e observações internas, com quem fez e quando.">
              <AbaHistorico participante={p} pode={pode} />
            </MacroSecao>
            <MacroSecao id="fg-trajetoria" rotulo="Trajetória" titulo="Participação no festival" nota="Edições em que a marca esteve, prêmios e o vínculo com o acervo. Não é o histórico de mudanças da ficha.">
              <AbaTrajetoria participante={p} pode={pode} onMudou={onMudou} />
            </MacroSecao>
          </>
        )}
        {vista === 'gestao' && <AbaAcesso participante={p} pode={pode} onMudou={onMudou} onFechar={onVoltar} />}
      </div>
    </div>
  )
}

// Rótulo curto da situação na lista (usa o mesmo dicionário).
export const rotuloSituacao = (p) => rotulo('cadastro', p.status_cadastro)
