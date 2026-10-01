import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { linkWhatsApp } from '../../lib/participantes'
import { rotulo } from '../../lib/status'
import { urlLogo, estadoLogoLista } from '../../lib/logos'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { Conversa } from '../Conversa'
import { Atividade } from '../Atividade'
import { Icone, MODULO_ICONE } from '../Icone'
import { Carregando, Vazio, Erro, Abas, painelDaAba, Selo, Modulo, MacroSecao, GradeModulos, Botao, MaisAcoes, LogoMarca, traduzirErro } from '../ui'
import { AbaOperacao, AbaTrajetoria } from './FichaOperacao'
import { AbaCadastroMarca, AbaCombo, AbaUnidades } from './FichaCadastro'
import { AbaAcesso } from './AcessoMarca'

/*
 * Ficha do participante como PÁGINA (reconstrução visual, 29/09/2026 —
 * decisão do Wilker). Mesmo endereço de antes (#participantes/lista?item=…
 * &sub=…); com `item`, a aba Marcas mostra esta página no lugar da lista e
 * "‹ Marcas" volta. Cabeçalho = resumo operacional (logo, nome, situação,
 * progresso, pendências, ações); subnavegação por assunto.
 */
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

export const ABAS_FICHA = ['resumo', 'cadastro', 'combo', 'unidades', 'operacao', 'mensagens', 'trajetoria', 'acesso', 'historico']

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
        <div className="ui-filtros-mini" role="group" aria-label="Filtrar histórico">
          {[['', 'Tudo'], ['observacao', 'Só observações'], ['acoes', 'Só ações']].map(([v, r]) => (
            <button key={v} type="button" className="ui-chip" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>{r}</button>
          ))}
        </div>
        {erro && <Erro texto={erro} onTentar={carregar} />}
        {!erro && linhas === null && <Carregando linhas={4} />}
        {!erro && linhas && visiveis.length === 0 && <Vazio titulo="Nada registrado ainda">As mudanças de status, mensagens, pedidos e observações desta marca aparecem aqui, com quem fez e quando.</Vazio>}
        {!erro && linhas && visiveis.length > 0 && <Atividade linhas={visiveis} comMarca={false} />}
      </Modulo>
    </GradeModulos>
  )
}

/* ── Resumo: a situação e um card clicável por assunto ─────────────────── */
function AbaResumo({ p, logo, naoLidas, onAba }) {
  const pct = pctCadastro(p)
  const nPend = pendenciasDe(p)
  const nUni = Number(p.unidades || 0)
  const nItens = Number(p.itens_prontos || 0)
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios)
  return (
    <>
      <MacroSecao rotulo="Situação atual" titulo={pct == null ? 'Sem edição aberta' : 'Cadastro ' + pct + '% concluído'}
        nota={pct == null ? 'A marca não tem participação na edição atual.' : nPend ? plural(nPend, 'pendência', 'pendências') + ' para resolver.' : 'Nada pendente no cadastro.'}>
        {pct != null && (
          <GradeModulos>
            <Modulo icone={MODULO_ICONE.pendencias} titulo="Pendências" sub="O que a marca ainda precisa fazer"
              status={nPend ? <Selo tom="atencao">{plural(nPend, 'aberta', 'abertas')}</Selo> : <Selo tom="ok">Nenhuma</Selo>}>
              <ul className="ui-lista-simples">
                <li><b>{plural(Number(p.campos_faltando || 0), 'campo obrigatório vazio', 'campos obrigatórios vazios')}</b><span>Somam no % do cadastro (logo incluída).</span></li>
                <li><b>{plural(Number(p.correcoes_abertas || 0), 'alteração pedida', 'alterações pedidas')}</b><span>Esperando a marca corrigir.</span></li>
                <li><b>{plural(Number(p.pedidos_abertos || 0), 'pedido sem resposta', 'pedidos sem resposta')}</b><span>Pedidos da organização (Operação).</span></li>
              </ul>
            </Modulo>
          </GradeModulos>
        )}
      </MacroSecao>
      <MacroSecao rotulo="Módulos" titulo="Onde está cada coisa">
        <GradeModulos>
          <Modulo onClick={() => onAba('cadastro')} icone={MODULO_ICONE.cadastro} titulo="Cadastro" rotuloIr="Abrir cadastro"
            status={p.status_cadastro && <Selo dominio="cadastro" valor={p.status_cadastro} />}>
            {pct != null && <><span className="ui-modulo__num">{pct}%</span><span className="ui-modulo__progresso" aria-hidden="true"><span style={{ '--p': pct / 100 }} /></span></>}
          </Modulo>
          <Modulo onClick={() => onAba('cadastro')} icone={MODULO_ICONE.logo} titulo="Logo" rotuloIr="Ver logo"
            status={<Selo dominio="logo" valor={estadoLogoLista(logo)} />}>
            <LogoMarca url={urlLogo(logo && logo.path)} nome={p.nome_marca} tamanho={56} />
          </Modulo>
          <Modulo onClick={() => onAba('combo')} icone={MODULO_ICONE.combo} titulo="Combo" rotuloIr="Abrir combo"
            status={p.combo_status && <Selo dominio="combo" valor={p.combo_status} />}>
            <p className="ui-nota">{p.tema_combo ? 'Tema: ' + p.tema_combo : 'Tema ainda não escolhido.'} · {nItens}/3 itens prontos</p>
          </Modulo>
          <Modulo onClick={() => onAba('unidades')} icone={MODULO_ICONE.unidades} titulo="Unidades" rotuloIr="Abrir unidades"
            status={nUni ? <Selo tom="ok">{plural(nUni, 'cadastrada', 'cadastradas')}</Selo> : <Selo tom="atencao">Nenhuma</Selo>} />
          <Modulo onClick={() => onAba('operacao')} icone={MODULO_ICONE.operacao} titulo="Operação" rotuloIr="Abrir operação"
            sub="Foto, pagamento, tema, aprovação, materiais"
            status={Number(p.pendencias) > 0 ? <Selo tom="atencao">{p.pendencias} para revisar</Selo> : null} />
          <Modulo onClick={() => onAba('mensagens')} icone={MODULO_ICONE.mensagens} titulo="Mensagens" rotuloIr="Abrir conversa"
            status={naoLidas ? <Selo tom="atencao">{plural(naoLidas, 'nova', 'novas')}</Selo> : <Selo tom="ok">Em dia</Selo>} />
          <Modulo onClick={() => onAba('acesso')} icone={MODULO_ICONE.acesso} titulo="Acesso ao painel" rotuloIr="Gerenciar acesso"
            status={p.status_acesso && <Selo dominio="acesso" valor={p.status_acesso} />} />
          <Modulo onClick={() => onAba('trajetoria')} icone={MODULO_ICONE.trajetoria} titulo="Trajetória" rotuloIr="Ver trajetória"
            status={p.historico_status && <Selo dominio="historico" valor={p.historico_status} />} />
        </GradeModulos>
      </MacroSecao>
    </>
  )
}

export function FichaMarcaPagina({ participante: p, logo, aba: abaPedida, onAba, onVoltar, pode, onMudou, naoLidas = 0, onLidas }) {
  const aba = ABAS_FICHA.includes(abaPedida) ? abaPedida : 'resumo'
  const titulo = React.useRef(null)
  const idAbas = React.useId()
  React.useEffect(() => { if (titulo.current) titulo.current.focus({ preventScroll: true }) }, [p && p.id])
  if (!p) return <Carregando linhas={4} />
  const pct = pctCadastro(p)
  const nPend = pendenciasDe(p)
  const nome1 = String(p.responsavel || '').trim().split(/\s+/)[0]
  const wa = linkWhatsApp(p.telefone, nome1 ? 'Olá, ' + nome1 + '. ' : '')

  return (
    <div className="fm-pagina">
      <button type="button" className="og-link fm-voltar" onClick={onVoltar}><Icone nome="voltar" tamanho={16} /> Todas as marcas</button>
      <header className="fm-cabeca">
        <LogoMarca url={urlLogo(logo && logo.path)} nome={p.nome_marca} tamanho={72} />
        <div>
          <h2 className="fm-cabeca__nome" tabIndex={-1} ref={titulo}>{p.nome_marca || '(sem nome)'}</h2>
          <div className="fm-cabeca__selos">
            {p.edicao_codigo && <Selo tom="neutro">Edição {p.edicao_codigo}</Selo>}
            {p.historico_status === 'recorrente_confirmado' && <Selo tom="andamento">Participante recorrente</Selo>}
            <Selo dominio="cadastro" valor={p.status_cadastro} />
            {p.status_acesso && <Selo dominio="acesso" valor={p.status_acesso} />}
          </div>
          <p className="fm-cabeca__meta">
            {pct != null && <><b>{pct}% concluído</b> · </>}
            {nPend ? nPend + (nPend === 1 ? ' pendência' : ' pendências') : 'sem pendências'}
            {p.ultima_atividade ? ' · atualizado em ' + dataCurta(p.ultima_atividade) : ''}
            {p.responsavel ? ' · ' + p.responsavel : ''}
          </p>
        </div>
        <div className="fm-cabeca__acoes">
          <Botao icone="pendencia" variante="destaque" onClick={() => onAba('resumo')}>Ver pendências</Botao>
          {wa && <a className="og-btn og-btn--mini og-btn--vazado" href={wa} target="_blank" rel="noreferrer"><Icone nome={MODULO_ICONE.whatsapp} tamanho={16} />WhatsApp</a>}
          <Botao icone="chave" variante="secundario" onClick={() => onAba('acesso')}>Gerenciar acesso</Botao>
          <MaisAcoes itens={[
            { rotulo: 'Pedir alteração em um campo', icone: 'alteracao', onClick: () => onAba('cadastro') },
            { rotulo: 'Ver histórico', icone: 'historico', onClick: () => onAba('historico') },
            { rotulo: 'Ver trajetória no festival', icone: 'pessoas', onClick: () => onAba('trajetoria') },
            { rotulo: 'Arquivar marca', icone: 'arquivar', perigo: true, onClick: () => onAba('acesso') },
          ]} />
        </div>
      </header>

      <Abas
        idBase={idAbas}
        rotulo={'Seções da ficha de ' + p.nome_marca}
        ativa={aba}
        onMudar={onAba}
        abas={[
          { chave: 'resumo', rotulo: 'Resumo', n: nPend },
          { chave: 'cadastro', rotulo: 'Cadastro', n: Number(p.correcoes_abertas || 0) },
          { chave: 'combo', rotulo: 'Combo' },
          { chave: 'unidades', rotulo: 'Unidades' },
          { chave: 'operacao', rotulo: 'Operação', n: Number(p.pendencias || 0) },
          { chave: 'mensagens', rotulo: 'Mensagens', n: naoLidas },
          { chave: 'trajetoria', rotulo: 'Trajetória' },
          { chave: 'acesso', rotulo: 'Acesso' },
          { chave: 'historico', rotulo: 'Histórico' },
        ]}
      />
      <div {...painelDaAba(idAbas, aba)} className="ui-painel-aba">
        {aba === 'resumo' && <AbaResumo p={p} logo={logo} naoLidas={naoLidas} onAba={onAba} />}
        {aba === 'cadastro' && <AbaCadastroMarca participante={p} pode={pode} onMudou={onMudou} />}
        {aba === 'combo' && <AbaCombo participante={p} pode={pode} onMudou={onMudou} />}
        {aba === 'unidades' && <AbaUnidades participante={p} pode={pode} onMudou={onMudou} />}
        {aba === 'operacao' && <AbaOperacao participante={p} pode={pode} />}
        {aba === 'trajetoria' && <AbaTrajetoria participante={p} pode={pode} onMudou={onMudou} />}
        {aba === 'mensagens' && <AbaMensagens participante={p} pode={pode} onLidas={onLidas} />}
        {aba === 'historico' && <AbaHistorico participante={p} pode={pode} />}
        {aba === 'acesso' && <AbaAcesso participante={p} pode={pode} onMudou={onMudou} onFechar={onVoltar} />}
      </div>
    </div>
  )
}

// Rótulo curto da situação na lista (usa o mesmo dicionário).
export const rotuloSituacao = (p) => rotulo('cadastro', p.status_cadastro)
