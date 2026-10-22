import React from 'react'
import { rpc } from '../../lib/rpc'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { linkWhatsApp } from '../../lib/participantes'
import { dataHoraCurta } from '../../lib/painelFormat'
import { linkPreenchimento, textoPreenchimento, painelDaMarca, entraNoLoteDeSenhas, diferencasEnvio, situacaoLink, dataCurtaBR } from '../../lib/preenchimento'
import { emitirCredenciais, lerAcessos, registrarEnvio } from './AcessoMarca'
import { Secao, Selo, Botao, BotaoIcone, Carregando, Erro, Vazio, traduzirErro } from '../ui'
import { confirmar, pedirTexto } from '../Confirmar'
import { Folha } from '../Folha'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { DOMINIOS_VISTAS } from '../../lib/syncFichas'
import { ORIGEM_PUBLICA } from '../../lib/origem'

/*
 * Link de preenchimento (16/10/2026, pedido do Wilker).
 *
 * - Ficha › Gestão (`PreenchimentoMarca`): gerar/trocar o link, copiar a
 *   mensagem, abrir o WhatsApp do responsável e REVISAR o que a marca enviou —
 *   aplicar no cadastro ou descartar. Nada do envio grava sozinho.
 * - Participantes › Preenchimento (`ListaPreenchimento`): todas as marcas da
 *   edição atual, gerar os links que faltam, copiar todas as mensagens.
 *
 * Lógica pura em lib/preenchimento.js; banco em
 * supabase/migrations/20261016_link_preenchimento.sql.
 */
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
const BLOCOS = { marca: 'Responsável e contato', tema: 'Tema', combo: 'Combo', itens: 'Itens', unidades: 'Lojas' }
const STATUS_ENVIO = { pendente: ['Aguardando revisão', 'atencao'], aplicado: ['Aplicado', 'ok'], descartado: ['Descartado', 'encerrado'], substituido: ['Substituído por envio mais novo', 'neutro'] }

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true } catch { return false }
}

export function PreenchimentoMarca({ participante: p, pode }) {
  const guarda = useGuarda()
  const [d, setD] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [ocupado, setOcupado] = React.useState(false)
  const pa = p && p.participacao_id
  const podeEditar = pode('cadastro.editar')

  // Leitura comum (abrir, sinal de outra pessoa, depois de aplicar/descartar). true = leu. A releitura SILENCIOSA
  // mantém a tela como está e, se falhar, o que estava lá continua. `org_preenchimento` é LEITURA para a camada
  // de sincronização (o banco avisa quando o link nasce): ler daqui nunca dispara um novo ciclo.
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guarda()
    if (!silencioso) setErro(null)
    try {
      const novo = await rpc('org_preenchimento', { p_secret: lerSenha(), p_participacao: pa, p_gerar: false, p_novo: false })
      if (!vale()) return true
      setD(novo)
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!silencioso) setErro(traduzirErro(e.message))
      return false
    }
  }, [pa, guarda])
  // Gerar ou trocar o link É uma gravação (a mesma RPC cria o link): a falha precisa chegar a quem pediu, para a tela
  // não dizer "Link gerado." depois de uma recusa. Por isso rejeita, ao contrário da leitura comum.
  const gerarLink = React.useCallback(async (extra) => {
    const vale = guarda()
    const novo = await rpc('org_preenchimento', { p_secret: lerSenha(), p_participacao: pa, p_gerar: !!extra.gerar, p_novo: !!extra.novo })
    if (!vale()) return
    setD(novo)
    setErro(null)
  }, [pa, guarda])
  React.useEffect(() => { setD(null); setAviso(null); if (pa) carregar() }, [pa, carregar])
  useSincronizar(DOMINIOS_VISTAS.preenchimentoMarca, async () => { if (!(await carregar({ silencioso: true }))) throw new Error('preenchimento') }, { ativo: !!pa })

  if (!pa) return <Secao titulo="Link de preenchimento"><p className="ui-nota">Esta marca não tem participação aberta.</p></Secao>
  if (erro && !d) return <Erro texto={erro} onTentar={() => carregar()} />
  if (!d) return <Carregando linhas={3} />

  async function executar(fn, ok) {
    setOcupado(true); setErro(null); setAviso(null)
    try { await fn(); if (ok) setAviso(ok) } catch (e) { setErro(traduzirErro(e.message)) } finally { setOcupado(false) }
  }

  const l = d.link
  const link = linkPreenchimento(ORIGEM_PUBLICA, l && l.codigo)
  // Na ficha só a explicação do painel e o link; usuário e senha saem da lista (Participantes › Preenchimento), que sabe o acesso de cada marca.
  const mensagem = link ? textoPreenchimento({ marca: p.nome_marca, responsavel: p.responsavel, link, edicao: d.edicao || {}, painel: { origem: ORIGEM_PUBLICA } }) : ''
  const wa = link ? linkWhatsApp(p.telefone, mensagem) : null
  const sit = situacaoLink(l, d.pendente ? 1 : 0)
  const env = d.pendente
  const difs = env ? diferencasEnvio(d.atual || {}, env.dados || {}) : []
  const confirmados = env && Array.isArray(env.dados && env.dados.confirmados) ? env.dados.confirmados.map((b) => BLOCOS[b] || b) : []
  const obs = env && env.dados && typeof env.dados.observacao === 'string' ? env.dados.observacao.trim() : ''

  const aplicar = async () => {
    if (!await confirmar('Aplicar o envio de ' + p.nome_marca + ' no cadastro?\n\n' + (difs.length ? difs.length + ' campo(s) mudam.' : 'Nada muda nos campos; o envio fica marcado como revisado.'), { acao: 'Aplicar' })) return
    executar(async () => {
      await rpc('org_preenchimento_decidir', { p_secret: lerSenha(), p_envio: env.id, p_aplicar: true, p_motivo: null })
      await carregar({ silencioso: true }) // a ficha e a lista relêem sozinhas pelos domínios que o "Aplicar" anunciou
    }, 'Aplicado no cadastro.')
  }
  const descartar = async () => {
    const motivo = await pedirTexto('Descartar o envio de ' + p.nome_marca + '?', { rotulo: 'Motivo (opcional, fica no histórico)' }, { acao: 'Descartar', perigo: true })
    if (motivo === null) return
    executar(async () => {
      await rpc('org_preenchimento_decidir', { p_secret: lerSenha(), p_envio: env.id, p_aplicar: false, p_motivo: motivo || null })
      await carregar({ silencioso: true })
    }, 'Envio descartado. O cadastro não mudou.')
  }
  const trocar = async () => {
    if (!await confirmar('Trocar o link de ' + p.nome_marca + '?\n\nO link atual para de funcionar. Mande o novo para a marca.', { acao: 'Trocar link', perigo: true })) return
    executar(() => gerarLink({ novo: true }), 'Link novo gerado. O anterior não abre mais.')
  }

  return (
    <div className="ui-pilha">
      <Secao titulo="Link de preenchimento"
        nota="Página da marca, sem login: resumo da edição e formulário com o que já temos. O que ela enviar só entra no cadastro depois que alguém aplicar aqui.">
        <dl className="ui-dados">
          <div className="ui-dado"><dt>Situação</dt><dd><Selo tom={sit.tom}>{sit.texto}</Selo></dd></div>
          {l && <div className="ui-dado"><dt>Gerado</dt><dd>{dataHoraCurta(l.criado_em)}</dd></div>}
          {l && <div className="ui-dado"><dt>Aberto</dt><dd>{l.aberto_em ? dataHoraCurta(l.aberto_em) + ' · ' + l.acessos + (l.acessos === 1 ? ' visita' : ' visitas') : 'ainda não'}</dd></div>}
          {l && <div className="ui-dado"><dt>Último envio</dt><dd>{l.enviado_em ? dataHoraCurta(l.enviado_em) : 'nenhum'}</dd></div>}
          {d.edicao && d.edicao.prazo && <div className="ui-dado"><dt>Prazo da edição</dt><dd>{dataCurtaBR(d.edicao.prazo)}</dd></div>}
          {l && <div className="ui-dado"><dt>Vale até</dt><dd>{dataHoraCurta(l.expira_em)}</dd></div>}
        </dl>
        {link && <p className="pr-link"><a href={link} target="_blank" rel="noreferrer">{link}</a></p>}
        <div className="ac-acoes">
          {!l && <Botao icone="mais" disabled={ocupado || !podeEditar} onClick={() => executar(() => gerarLink({ gerar: true }), 'Link gerado.')}>Gerar link</Botao>}
          {l && <Botao icone="copiar" disabled={ocupado} onClick={async () => setAviso(await copiar(mensagem) ? 'Mensagem copiada. Cole no WhatsApp da marca.' : 'Sem área de transferência neste navegador.')}>Copiar mensagem</Botao>}
          {wa && <a className="og-btn og-btn--mini og-btn--vazado" href={wa} target="_blank" rel="noreferrer">Abrir WhatsApp de {String(p.responsavel || 'responsável').split(/\s+/)[0]}</a>}
          {l && <Botao icone="copiar" variante="secundario" disabled={ocupado} onClick={async () => setAviso(await copiar(link) ? 'Link copiado.' : 'Sem área de transferência neste navegador.')}>Copiar só o link</Botao>}
          {l && podeEditar && <button className="og-btn og-btn--mini og-btn--vazado" type="button" disabled={ocupado} onClick={trocar}>Trocar link</button>}
        </div>
        {!podeEditar && !l && <p className="ui-nota">Sua função não gera link de preenchimento.</p>}
        {!p.telefone && l && <p className="ui-nota">Sem WhatsApp do responsável no cadastro: copie a mensagem e envie por onde der.</p>}
        {aviso && <p className="ui-nota" role="status">{aviso}</p>}
        {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
      </Secao>

      {env && (
        <Secao titulo={'Envio de ' + dataHoraCurta(env.enviado_em) + ' · aguardando revisão'}
          nota="Confira o que muda. Aplicar grava no cadastro com as mesmas regras do editor (e fica no histórico); descartar não muda nada.">
          {difs.length === 0
            ? <p className="ui-nota">Nada muda: a marca confirmou os dados como estão.</p>
            : (
              <ul className="pr-dif">
                {difs.map((x, i) => (
                  <li key={i} className="pr-dif__linha">
                    <span className="pr-dif__campo">{x.grupo} · {x.campo}</span>
                    <span className="pr-dif__de"><span className="pr-dif__rot">Hoje</span><s>{x.de || '(vazio)'}</s></span>
                    <span className="pr-dif__para"><span className="pr-dif__rot">Enviado</span>{x.para || '(vazio)'}</span>
                  </li>
                ))}
              </ul>
            )}
          <p className="ui-nota">Blocos confirmados pela marca: {confirmados.length ? confirmados.join(', ') : 'nenhum'}.</p>
          {obs && <><p className="ui-nota">Observação da marca:</p><p className="ui-citacao">{obs}</p></>}
          {podeEditar
            ? (
              <div className="ac-acoes">
                <Botao icone="sucesso" disabled={ocupado} onClick={aplicar}>Aplicar no cadastro</Botao>
                <button className="og-btn og-btn--mini og-btn--vazado og-btn--perigo" type="button" disabled={ocupado} onClick={descartar}>Descartar envio</button>
              </div>
            )
            : <p className="ui-nota">Sua função só consulta. Quem edita cadastro aplica ou descarta.</p>}
        </Secao>
      )}

      {d.historico && d.historico.some((h) => h.status !== 'pendente') && (
        <Secao titulo="Envios anteriores">
          <ul className="ui-lista-simples">
            {d.historico.filter((h) => h.status !== 'pendente').map((h) => {
              const [rot, tom] = STATUS_ENVIO[h.status] || [h.status, 'neutro']
              return (
                <li key={h.id}>
                  <b>{dataHoraCurta(h.enviado_em)}</b>
                  <span><Selo tom={tom}>{rot}</Selo>{h.revisado_em ? ' · ' + dataHoraCurta(h.revisado_em) + (h.revisado_por ? ' por ' + h.revisado_por : '') : ''}{h.motivo ? ' · ' + h.motivo : ''}</span>
                </li>
              )
            })}
          </ul>
        </Secao>
      )}
    </div>
  )
}

/* ── Participantes › Preenchimento: todas as marcas da edição atual ───────── */
export function ListaPreenchimento({ pode, irPara }) {
  const guardaAcesso = useGuarda() // leituras independentes: uma não pode invalidar a outra
  const guardaLista = useGuarda()
  const [d, setD] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [aviso, setAviso] = React.useState(null)
  const [ocupado, setOcupado] = React.useState(false)
  const [acessos, setAcessos] = React.useState(null)
  const [slugs, setSlugs] = React.useState({})
  const [creds, setCreds] = React.useState({}) // só em memória: a senha temporária não é guardada em lugar nenhum
  // Mensagens com senha recém-gerada, À VISTA numa folha (22/10/2026): gerar 25 senhas leva ~1 min e o navegador recusa
  // copiar sem um clique recente — a cópia automática falhava calada. A folha mostra o texto e copia num clique novo.
  const [lote, setLote] = React.useState(null) // { texto, n, copiado }
  const podeEditar = pode('cadastro.editar')
  const podeAcesso = pode('marca.liberar')

  // Sem ler os acessos, a mensagem leva só a explicação do painel. Releitura que falha mantém o que já se sabia. true = leu.
  const lerAcesso = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guardaAcesso()
    try {
      const [a, ps] = await Promise.all([lerAcessos(), rpc('get_participantes', { p_secret: lerSenha() })])
      if (!vale()) return true
      setAcessos(a)
      setSlugs(Object.fromEntries((ps || []).map((x) => [x.id, x.slug])))
      return true
    } catch {
      if (!vale()) return true
      if (!silencioso) setAcessos(null)
      return false
    }
  }, [guardaAcesso])
  React.useEffect(() => { lerAcesso() }, [lerAcesso])

  // Leitura comum da lista (`org_preenchimentos` é LEITURA para a camada de sincronização). true = leu.
  const carregar = React.useCallback(async ({ silencioso = false } = {}) => {
    const vale = guardaLista()
    if (!silencioso) setErro(null)
    try {
      const novo = await rpc('org_preenchimentos', { p_secret: lerSenha(), p_gerar: false })
      if (!vale()) return true
      setD(novo)
      setErro(null)
      return true
    } catch (e) {
      if (!vale()) return true
      if (!silencioso) setErro(traduzirErro(e.message))
      return false
    }
  }, [guardaLista])
  // Gerar os links que faltam É uma gravação: rejeita, para a tela não dizer "Links gerados." depois de uma recusa.
  const gerarLinks = React.useCallback(async () => {
    const vale = guardaLista()
    const novo = await rpc('org_preenchimentos', { p_secret: lerSenha(), p_gerar: true })
    if (!vale()) return
    setD(novo)
    setErro(null)
  }, [guardaLista])
  React.useEffect(() => { carregar() }, [carregar])
  // Link, envio, marca ou acesso mudou (aqui ou em outra sessão): relê as duas leituras em silêncio.
  useSincronizar(DOMINIOS_VISTAS.listaPreenchimento, async () => {
    const [a, b] = await Promise.all([lerAcesso({ silencioso: true }), carregar({ silencioso: true })])
    if (!(a && b)) throw new Error('preenchimento')
  })

  if (erro && !d) return <Erro texto={erro} onTentar={() => carregar()} />
  if (!d) return <Carregando linhas={6} />

  const marcas = d.marcas || []
  if (!marcas.length) return <Vazio titulo="Nenhuma marca na edição atual" icone="pessoas" />
  const origem = ORIGEM_PUBLICA
  const painelDe = (m, cred) => painelDaMarca({ origem, slug: slugs[m.participante_id], acesso: acessos && acessos[m.participante_id], cred: cred || creds[m.participante_id] })
  const mensagemDe = (m, cred) => textoPreenchimento({ marca: m.nome, responsavel: m.responsavel, link: linkPreenchimento(origem, m.codigo), edicao: d.edicao || {}, painel: painelDe(m, cred) })
  // Quem entra no lote de senhas: toda marca ativa com link e acesso lido (sem conta → cria; com conta → gera senha
  // temporária nova). Fora: acesso pausado, encerrada, sem link e quem acabou de ganhar senha nesta tela.
  const acessoDe = (m) => (acessos && acessos[m.participante_id]) || null
  const entraNoLote = (m) => entraNoLoteDeSenhas({ marca: m, acesso: acessoDe(m), cred: creds[m.participante_id] })
  const paraSenha = marcas.filter(entraNoLote)
  const semLink = marcas.filter((m) => !m.codigo && m.status_cadastro !== 'encerrado').length
  const comLink = marcas.filter((m) => m.codigo)
  const aRevisar = marcas.filter((m) => m.pendentes > 0).length
  const enviados = marcas.filter((m) => m.enviado_em).length

  async function gerarFaltantes() {
    setOcupado(true); setAviso(null); setErro(null)
    try { await gerarLinks(); setAviso('Links gerados.') } catch (e) { setErro(traduzirErro(e.message)) } finally { setOcupado(false) }
  }
  // Senha temporária pelo painel (Edge Functions criar-acesso-marca / regerar-senha-conta, com a sua sessão) e já copia as
  // mensagens com a senha, que só aparece agora. Sem conta → cria; com a temporária ainda valendo → gera outra (a anterior
  // deixa de valer e as sessões abertas caem).
  async function gerarSenhas(lista) {
    if (!lista.length) return
    const criar = lista.filter((m) => !acessoDe(m).user_id)
    const trocar = lista.filter((m) => acessoDe(m).user_id)
    const partes = []
    if (criar.length) partes.push('criar ' + (criar.length === 1 ? 'o acesso de ' + criar[0].nome : criar.length + ' acessos novos'))
    if (trocar.length) partes.push('gerar senha temporária NOVA para ' + (trocar.length === 1 ? trocar[0].nome : trocar.length + ' marcas que já têm acesso'))
    const aviso2 = trocar.length ? '\n\nA senha que você já mandou para ' + (trocar.length === 1 ? 'essa marca' : 'essas marcas') + ' deixa de valer e as sessões abertas caem. ' : '\n\n'
    if (!await confirmar(partes.join(' e ').replace(/^./, (c) => c.toUpperCase()) + '?' + aviso2 + 'A senha aparece UMA VEZ: ela já entra na mensagem copiada. Nada é enviado às marcas.', { acao: 'Gerar senhas', perigo: trocar.length > 0 })) return
    setOcupado(true); setAviso(null); setErro(null)
    try {
      const feitos = []
      const alvo = (m) => ({ id: m.participante_id, nome_marca: m.nome, slug: slugs[m.participante_id] })
      if (criar.length) feitos.push(...await emitirCredenciais(criar.map(alvo), 'gerar'))
      if (trocar.length) feitos.push(...await emitirCredenciais(trocar.map(alvo), 'regerar'))
      const novos = {}
      for (const f of feitos) if (!f.erro) novos[f.p.id] = { login: f.login, senha: f.senha }
      setCreds((c) => ({ ...c, ...novos }))
      const ok = lista.filter((m) => novos[m.participante_id])
      if (ok.length) {
        const texto = ok.map((m) => '— ' + m.nome + (m.telefone ? ' · ' + m.telefone : '') + '\n\n' + mensagemDe(m, novos[m.participante_id])).join('\n\n\n')
        const copiou = await copiar(texto)
        setLote({ texto, n: ok.length, copiado: copiou, ids: ok.map((m) => m.participante_id) })
        // O rastro de "copiado" falhar não desfaz a senha gerada, mas a falha é dita (o histórico do acesso ficaria incompleto sem aviso).
        const registrou = !copiou || await registrarEnvio(ok.map((m) => m.participante_id), 'copiado').then(() => true, () => false)
        setAviso(ok.length + (ok.length === 1 ? ' senha gerada. ' : ' senhas geradas. ') + 'As mensagens estão na janela aberta, já com usuário e senha temporária. A senha não aparece de novo depois que você sair desta tela.' + (registrou ? '' : ' O histórico do acesso não registrou a cópia.'))
      }
      const falhas = feitos.filter((f) => f.erro).map((f) => f.p.nome_marca + ': ' + f.erro)
      if (falhas.length) setErro(falhas.join(' · '))
      await lerAcesso({ silencioso: true })
    } finally { setOcupado(false) }
  }
  async function copiarLote() {
    const copiou = await copiar(lote.texto)
    setLote((l) => ({ ...l, copiado: copiou ? true : 'falhou' }))
    if (copiou) registrarEnvio(lote.ids, 'copiado').catch(() => {})
  }
  async function fecharLote() {
    if (lote.copiado !== true && !(await confirmar('Fechar sem copiar? As senhas não aparecem de novo (a lista ainda copia cada marca enquanto esta tela estiver aberta).', { acao: 'Fechar', perigo: true }))) return
    setLote(null)
  }
  async function copiarTodas() {
    const texto = comLink.map((m) => '— ' + m.nome + (m.telefone ? ' · ' + m.telefone : '') + '\n\n' + mensagemDe(m)).join('\n\n\n')
    setAviso(await copiar(texto) ? comLink.length + ' mensagens copiadas.' : 'Sem área de transferência neste navegador.')
  }

  return (
    <div className="ui-pilha">
      <Secao titulo="Link de preenchimento"
        nota={'Uma página por marca, sem login, com o resumo da edição e os dados que já temos. O envio passa pela sua revisão na ficha (Gestão).' + (d.edicao && d.edicao.prazo ? ' Prazo na mensagem: ' + dataCurtaBR(d.edicao.prazo) + '.' : '')}
        acoes={(
          <>
            {podeEditar && semLink > 0 && <Botao icone="mais" disabled={ocupado} onClick={gerarFaltantes}>{'Gerar ' + semLink + (semLink === 1 ? ' link' : ' links')}</Botao>}
            {podeAcesso && paraSenha.length > 0 && <Botao icone="chave" disabled={ocupado} onClick={() => gerarSenhas(paraSenha)}>{'Gerar senhas de ' + paraSenha.length + (paraSenha.length === 1 ? ' marca' : ' marcas') + ' e copiar'}</Botao>}
            {comLink.length > 0 && <Botao icone="copiar" variante="secundario" onClick={copiarTodas}>Copiar todas as mensagens</Botao>}
          </>
        )}>
        <p className="ui-nota">{comLink.length} com link · {enviados} já enviaram · {aRevisar} para revisar</p>
        <p className="ui-nota">A mensagem abre com o Painel SCW: link, usuário e senha temporária (no primeiro acesso o painel pede para a marca criar a sua). "Gerar senhas" cria o acesso de quem não tem e gera senha temporária nova para as demais; a anterior deixa de valer e a nova só aparece na hora em que é gerada.</p>
        {aviso && <p className="ui-nota" role="status">{aviso}</p>}
        {erro && <p className="ui-nota ui-nota--erro" role="alert">{erro}</p>}
        {lote && (
          <Folha aberto titulo={lote.n + (lote.n === 1 ? ' senha gerada' : ' senhas geradas')} sub="Mensagens prontas, com usuário e senha temporária. Copie agora: a senha não aparece de novo." onFechar={fecharLote}
            rodape={<Botao icone="copiar" onClick={copiarLote}>{lote.copiado === true ? 'Copiado ✓ — copiar de novo' : 'Copiar tudo'}</Botao>}>
            {lote.copiado === true && <p className="ui-nota" role="status">Copiado. Cole no WhatsApp ou onde preferir.</p>}
            {lote.copiado === 'falhou' && <p className="ui-nota ui-nota--erro" role="alert">O navegador não deixou copiar. Selecione o texto abaixo (Ctrl+A dentro da caixa) e copie com Ctrl+C.</p>}
            <label className="og-campo"><span className="ui-oculto">Mensagens com as senhas</span>
              <textarea readOnly rows={18} value={lote.texto} onFocus={(e) => e.target.select()} data-testid="lote-senhas" />
            </label>
          </Folha>
        )}
        <ul className="pr-lista">
          {marcas.map((m) => {
            const sit = m.status_cadastro === 'encerrado' ? { texto: 'Encerrada', tom: 'encerrado' } : situacaoLink(m, m.pendentes)
            const wa = m.codigo ? linkWhatsApp(m.telefone, mensagemDe(m)) : null
            return (
              <li key={m.participacao_id} className="pr-lista__linha">
                <button type="button" className="og-link pr-lista__nome" onClick={() => irPara && irPara('participantes', { vista: 'participantes', id: m.participante_id, sub: 'gestao' })}>{m.nome}</button>
                <Selo tom={sit.tom}>{sit.texto}</Selo>
                <span className="pr-lista__acoes">
                  {podeAcesso && entraNoLote(m) && <button className="og-btn og-btn--mini" type="button" disabled={ocupado} onClick={() => gerarSenhas([m])}>{acessoDe(m).user_id ? 'Nova senha' : 'Criar acesso'}</button>}
                  {m.codigo && <BotaoIcone icone="copiar" rotulo="Copiar mensagem de" alvo={m.nome} onClick={async () => setAviso(await copiar(mensagemDe(m)) ? 'Mensagem de ' + m.nome + ' copiada.' : 'Sem área de transferência neste navegador.')} />}
                  {wa && <a className="og-btn og-btn--mini og-btn--vazado" href={wa} target="_blank" rel="noreferrer" aria-label={'Abrir WhatsApp de ' + m.nome}>WhatsApp</a>}
                </span>
              </li>
            )
          })}
        </ul>
      </Secao>
    </div>
  )
}
