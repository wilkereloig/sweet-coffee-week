import React from 'react'
import { api } from '../../lib/marcaApi'
import { dataHoraCurta } from '../../lib/painelFormat'
import { ROTULO_SESSAO } from '../../lib/participantes'
import {
  TIPOS, ROTULO_TIPO, CANAIS, BLOCOS, NOMES_FALTANDO,
  precoNumero, itemDe, blocoCompleto, progresso,
  primeiroBlocoPendente, canaisParaObjeto, canaisParaArray,
} from '../../lib/cadastro'

/*
 * Vista "Cadastro" da marca — porte de public/painel/index.html (#mvCadastro,
 * ~1504-1628) + carregar/carregarParticipacao/preencher/desenharItens/
 * desenharUnidades/desenharSessoes/desenharVagas/reservarVaga/progresso/
 * acordeão/autosave/concluir (~4855-5634). Sem DOM: todo campo é controlado
 * por estado React; a lógica de completude vive em lib/cadastro.js.
 *
 * ⚠️ Não recebe props do Shell — PainelMarcaShell.jsx hoje monta `<Vista />`
 * sem nada. O cabeçalho (`pn-cabeca__sub`, badge de notificação) segue vazio
 * até uma fase futura ligar isso; não é escopo desta vista.
 */

const ICONE_BLOCO = [
  <><path d="M6.6 11.4h18.8l-1.4 14a2.2 2.2 0 0 1-2.2 2H10.2a2.2 2.2 0 0 1-2.2-2Z" /><path d="M11.8 11.4V9a4.2 4.2 0 0 1 8.4 0v2.4" /></>,
  <><path d="M16 4.4a8.4 8.4 0 0 1 4.9 15.2v2.6h-9.8v-2.6A8.4 8.4 0 0 1 16 4.4Z" /><path d="M12.2 24.4h7.6M13.4 27.6h5.2" strokeWidth="2.4" /></>,
  <><path fill="currentColor" stroke="none" d="M2.6 17h7.4l-.8 4.6a1.3 1.3 0 0 1-1.3 1.1H4.7a1.3 1.3 0 0 1-1.3-1.1Z" /><circle cx="6.3" cy="14" r="3.4" fill="currentColor" stroke="none" /><path fill="currentColor" stroke="none" d="M12 22.6 16.2 10.2l4.2 12.4Z" /><path fill="currentColor" stroke="none" d="M22.6 14.6h7.6l-1 6.8a1.4 1.4 0 0 1-1.4 1.2h-2.8a1.4 1.4 0 0 1-1.4-1.2Z" /><path d="M1.6 25.8h28.8" /></>,
  <><path d="M27.4 15.6 16.4 26.6a2.2 2.2 0 0 1-3.1 0L5.4 18.7a2.2 2.2 0 0 1 0-3.1L16.4 4.6h9.9a1.1 1.1 0 0 1 1.1 1.1Z" /><circle cx="21.8" cy="10.2" r="2.2" fill="currentColor" stroke="none" /></>,
  <><path d="M16 28.4s8.6-9.6 8.6-15.6a8.6 8.6 0 1 0-17.2 0c0 6 8.6 15.6 8.6 15.6Z" /><rect x="12.4" y="9.2" width="7.2" height="7.2" rx="2" fill="currentColor" stroke="none" /></>,
]
const TITULO_BLOCO = [
  { b: '01 · A marca', s: 'Quem participa' },
  { b: '02 · O tema', s: 'Sua leitura do tema da edição' },
  { b: '03 · Os três itens', s: 'Doce, salgado e bebida' },
  { b: '04 · Preço', s: 'Quanto custa o combo' },
  { b: '05 · Onde encontrar', s: 'Suas unidades' },
]

function Bloco({ indice, aberto, completo, onToggle, children }) {
  const t = TITULO_BLOCO[indice]
  return (
    <div className={'mc-bloco' + (aberto ? ' is-aberto' : '') + (completo ? ' is-pronto' : '')} data-bloco={indice}>
      <button type="button" className="mc-bloco__cabeca" aria-expanded={aberto} onClick={onToggle}>
        <span className="mc-bloco__disco" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">{ICONE_BLOCO[indice]}</svg>
        </span>
        <span className="mc-bloco__texto"><b>{t.b}</b><span>{t.s}</span></span>
        <span className={'selo' + (completo ? ' completo' : '')}>{completo ? 'Pronto' : 'Pendente'}</span>
        <svg className="mc-bloco__chevron" viewBox="0 0 32 32" fill="none" stroke="#6A2C15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.8 12.6 16 21.8l9.2-9.2" /></svg>
      </button>
      <div className="mc-bloco__corpo" hidden={!aberto}>{children}</div>
    </div>
  )
}

function seloParticipacao(status) {
  if (status === 'cadastro_completo') return { classe: 'selo completo', texto: 'Cadastro completo' }
  if (status === 'em_preenchimento') return { classe: 'selo andamento', texto: 'Em preenchimento' }
  if (status === 'encerrado') return { classe: 'selo', texto: 'Edição encerrada' }
  return { classe: 'selo', texto: 'Aguardando cadastro' }
}

const MARCA_VAZIA = { nome_marca: '', responsavel: '', telefone: '', email: '', instagram: '', site: '', cnpj: '', razao_social: '' }
const TEMA_VAZIO = { tema_combo: '', tema_justificativa: '' }

export function Cadastro() {
  const [carregando, setCarregando] = React.useState(true)
  const [erroCarregar, setErroCarregar] = React.useState(null)
  const [semParticipacao, setSemParticipacao] = React.useState(false)

  const [participanteId, setParticipanteId] = React.useState(null)
  const [participacaoId, setParticipacaoId] = React.useState(null)
  const [edicaoCodigo, setEdicaoCodigo] = React.useState('')
  const [statusCadastro, setStatusCadastro] = React.useState('')

  const [marca, setMarca] = React.useState(MARCA_VAZIA)
  const [tema, setTema] = React.useState(TEMA_VAZIO)
  const [precoStr, setPrecoStr] = React.useState('')
  const [itens, setItens] = React.useState([])
  const [unidades, setUnidades] = React.useState([])
  const [sessoes, setSessoes] = React.useState([])

  const [blocoAberto, setBlocoAberto] = React.useState(0)
  const [salvoTexto, setSalvoTexto] = React.useState('')
  const [erroSalvar, setErroSalvar] = React.useState(null)
  const [reservando, setReservando] = React.useState(null)
  const [concluindo, setConcluindo] = React.useState(false)
  const [concluirAviso, setConcluirAviso] = React.useState(null)

  const timerRef = React.useRef(null)
  const salvarRef = React.useRef(() => Promise.resolve())
  const tempSeqRef = React.useRef(0)

  function unidadeVazia() {
    tempSeqRef.current += 1
    return { _key: 'novo-' + tempSeqRef.current, id: null, endereco: '', bairro: '', horarios: '', faz_delivery: false, canais: canaisParaObjeto([]) }
  }

  const carregarSessoes = React.useCallback(async () => {
    try {
      setSessoes((await api('sessoes_fotos?select=*&order=data_hora.desc')) || [])
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
    }
  }, [])

  // ── Carregar ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const linhas = await api('participantes?select=*&order=created_at.desc')
        if (cancelado) return
        if (!linhas || !linhas.length) {
          setErroCarregar('Sua conta existe, mas ainda não há marca vinculada a ela. Fale com a organização.')
          setCarregando(false)
          return
        }
        const p = linhas[0]
        setParticipanteId(p.id)
        setMarca({
          nome_marca: p.nome_marca || '', responsavel: p.responsavel || '', telefone: p.telefone || '',
          email: p.email || '', instagram: p.instagram || '', site: p.site || '', cnpj: p.cnpj || '',
          razao_social: p.razao_social || '',
        })

        const pas = await api('participacoes?select=*&order=created_at.desc&limit=1')
        if (cancelado) return
        const pa = (pas && pas[0]) || null
        if (!pa) {
          setSemParticipacao(true)
          setCarregando(false)
          return
        }
        setParticipacaoId(pa.id)
        setEdicaoCodigo(pa.edicao_codigo || '')
        setStatusCadastro(pa.status_cadastro || '')
        setTema({ tema_combo: pa.tema_combo || '', tema_justificativa: pa.tema_justificativa || '' })
        const precoInicial = pa.combo_preco == null ? '' : String(pa.combo_preco).replace('.', ',')
        setPrecoStr(precoInicial)

        const [itensRows, unidadesRows, sessoesRows] = await Promise.all([
          api('participantes_itens?select=*&participacao_id=eq.' + pa.id),
          api('participacao_unidades?select=*&participacao_id=eq.' + pa.id + '&order=ordem'),
          api('sessoes_fotos?select=*&order=data_hora.desc'),
        ])
        if (cancelado) return
        const listaItens = itensRows || []
        const listaUnidades = (unidadesRows && unidadesRows.length)
          ? unidadesRows.map((u) => ({
              _key: u.id, id: u.id, endereco: u.endereco || '', bairro: u.bairro || '',
              horarios: u.horarios || '', faz_delivery: !!u.faz_delivery, canais: canaisParaObjeto(u.canais_delivery),
            }))
          : [unidadeVazia()]
        setItens(listaItens)
        setUnidades(listaUnidades)
        setSessoes(sessoesRows || [])
        setBlocoAberto(primeiroBlocoPendente({
          marca: { nome_marca: p.nome_marca || '', responsavel: p.responsavel || '', telefone: p.telefone || '' },
          tema: { tema_combo: pa.tema_combo || '', tema_justificativa: pa.tema_justificativa || '' },
          itens: listaItens, unidades: listaUnidades, precoStr: precoInicial,
        }))
        setCarregando(false)
      } catch (e) {
        if (cancelado) return
        if (e && e.message === 'sessao_expirada') return
        setErroCarregar('Não deu para carregar seu cadastro. Tente recarregar a página.')
        setCarregando(false)
      }
    })()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Autosave (debounce 900ms, mesmo tempo do arquivo estático) ───────────
  const salvar = React.useCallback(async () => {
    if (!participanteId || !participacaoId) return
    const camposMarca = {
      nome_marca: marca.nome_marca.trim(), responsavel: marca.responsavel.trim(), telefone: marca.telefone.trim(),
      email: marca.email.trim(), instagram: marca.instagram.trim(), site: marca.site.trim(),
      cnpj: marca.cnpj.trim(), razao_social: marca.razao_social.trim(),
    }
    const camposParticipacao = {
      tema_combo: tema.tema_combo.trim(), tema_justificativa: tema.tema_justificativa.trim(),
      combo_preco: precoNumero(precoStr) || null,
    }
    const salvarItens = () => Promise.all(itens.map((i) => api('participantes_itens?id=eq.' + i.id, {
      metodo: 'PATCH',
      corpo: {
        nome: (i.nome || '').trim(), descricao: (i.descricao || '').trim(), ingredientes: (i.ingredientes || '').trim(),
        vegano: !!i.vegano, sem_gluten: !!i.sem_gluten, sem_lactose: !!i.sem_lactose,
      },
      prefer: 'return=representation',
    })))
    const salvarUnidades = () => Promise.all(unidades.map((u, i) => {
      const corpo = {
        ordem: i, endereco: u.endereco.trim(), bairro: u.bairro.trim(), horarios: u.horarios.trim(),
        faz_delivery: !!u.faz_delivery, canais_delivery: canaisParaArray(u.canais),
      }
      if (u.id) return api('participacao_unidades?id=eq.' + u.id, { metodo: 'PATCH', corpo, prefer: 'return=representation' })
      // Unidade vazia não vira linha — a tela sempre mostra uma em branco.
      if (!corpo.endereco) return Promise.resolve([])
      return api('participacao_unidades', { metodo: 'POST', corpo: { ...corpo, participacao_id: participacaoId }, prefer: 'return=representation' })
        .then((linhas) => {
          const novoId = linhas && linhas[0] && linhas[0].id
          if (novoId) setUnidades((prev) => prev.map((x) => (x._key === u._key ? { ...x, id: novoId } : x)))
          return linhas
        })
    }))
    try {
      const [rm, rp] = await Promise.all([
        api('participantes?id=eq.' + participanteId, { metodo: 'PATCH', corpo: camposMarca, prefer: 'return=representation' }),
        api('participacoes?id=eq.' + participacaoId, { metodo: 'PATCH', corpo: camposParticipacao, prefer: 'return=representation' }),
        salvarItens(),
        salvarUnidades(),
      ])
      if (!rm || !rm.length || !rp || !rp.length) throw new Error('sem_confirmacao')
      setSalvoTexto('Salvo automaticamente.')
      setErroSalvar(null)
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setSalvoTexto('')
      setErroSalvar('Não deu para salvar agora. O que você digitou continua na tela. Tente de novo.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participanteId, participacaoId, marca, tema, precoStr, itens, unidades])

  React.useEffect(() => { salvarRef.current = salvar }, [salvar])
  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function agendarSalvar() {
    setSalvoTexto('')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { salvarRef.current() }, 900)
  }

  // ── Campos ────────────────────────────────────────────────────────────────
  function alterarMarca(campo, valor) { setMarca((prev) => ({ ...prev, [campo]: valor })); agendarSalvar() }
  function alterarTema(campo, valor) { setTema((prev) => ({ ...prev, [campo]: valor })); agendarSalvar() }
  function alterarPreco(valor) { setPrecoStr(valor); agendarSalvar() }
  function alterarItem(id, campo, valor) {
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)))
    agendarSalvar()
  }
  function alterarUnidade(chave, campo, valor) {
    setUnidades((prev) => prev.map((u) => (u._key === chave ? { ...u, [campo]: valor } : u)))
    agendarSalvar()
  }
  function alterarCanal(chave, tipo, valor) {
    setUnidades((prev) => prev.map((u) => (u._key === chave ? { ...u, canais: { ...u.canais, [tipo]: valor } } : u)))
    agendarSalvar()
  }
  function adicionarUnidade() {
    setUnidades((prev) => [...prev, unidadeVazia()])
    agendarSalvar()
  }
  function removerUnidade(chave) {
    const alvo = unidades.find((u) => u._key === chave)
    setUnidades((prev) => prev.filter((u) => u._key !== chave))
    if (alvo && alvo.id) {
      api('participacao_unidades?id=eq.' + alvo.id, { metodo: 'DELETE' }).catch((e) => {
        if (e && e.message === 'sessao_expirada') return
        setErroSalvar('Não deu para remover a unidade agora. Recarregue a página.')
      })
    }
    agendarSalvar()
  }

  async function reservarVaga(id) {
    setReservando(id)
    try {
      const r = await api('sessoes_fotos?id=eq.' + id + '&status=eq.aberto', {
        metodo: 'PATCH',
        corpo: { status: 'agendada', participacao_id: participacaoId, participante_id: participanteId },
        prefer: 'return=representation',
      })
      if (!r || !r.length) setErroSalvar('Essa vaga acabou de ser escolhida por outra marca. Escolha outra.')
      await carregarSessoes()
    } catch (e) {
      if (e && e.message === 'sessao_expirada') return
      setErroSalvar('Não deu para reservar agora. Tente de novo.')
    } finally {
      setReservando(null)
    }
  }

  async function concluir(ev) {
    ev.preventDefault()
    setConcluindo(true)
    setConcluirAviso(null)
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    // Salva antes de concluir: quem valida é o servidor, sobre o que está
    // GRAVADO — concluir com o autosave pendente reprovaria campo cheio.
    await salvar()
    try {
      const r = await api('rpc/marca_concluir_cadastro', { metodo: 'POST', corpo: { p_participacao: participacaoId } })
      if (!r || r.ok !== true) {
        const faltando = (r && r.faltando) || []
        setConcluirAviso({ tom: 'erro', texto: 'Falta preencher: ' + faltando.map((f) => NOMES_FALTANDO[f] || f).join(', ') + '.' })
      } else {
        setStatusCadastro('cadastro_completo')
        setConcluirAviso({
          tom: 'ok',
          texto: 'Cadastro concluído. A organização revisa e fala com você se precisar de algo. Mudou alguma coisa? É só editar aqui e concluir de novo.',
        })
      }
    } catch (e) {
      if (!(e && e.message === 'sessao_expirada')) {
        setConcluirAviso({ tom: 'erro', texto: 'Não deu para concluir agora. Tente de novo em instantes.' })
      }
    } finally {
      setConcluindo(false)
    }
  }

  if (carregando) return <p className="nota">Carregando…</p>

  if (erroCarregar) {
    return (
      <div className="card">
        <h2>Não consegui carregar</h2>
        <p className="nota">{erroCarregar}</p>
      </div>
    )
  }

  const dadosProgresso = { marca, tema, itens, unidades, precoStr }
  const feitos = progresso(dadosProgresso)
  const selo = semParticipacao ? { classe: 'selo', texto: 'Sem edição aberta' } : seloParticipacao(statusCadastro)
  const vagas = sessoes.filter((s) => s.status === 'aberto')
  const jaTemSessao = sessoes.some((s) => s.status !== 'aberto')

  return (
    <>
      <p className="rotulo">{semParticipacao ? 'Área da marca' : 'Edição ' + edicaoCodigo}</p>
      <h1>{marca.nome_marca || 'Sua participação'}</h1>
      <p style={{ marginTop: 14 }}><span className={selo.classe}>{selo.texto}</span></p>

      {semParticipacao && (
        <div className="card" style={{ marginTop: 22 }}>
          <h2>Ainda não há edição aberta para você</h2>
          <p className="nota">Sua conta está ativa, mas a organização ainda não abriu a sua
            participação na próxima edição. Assim que abrir, o formulário aparece aqui.
            Você não precisa fazer nada agora.</p>
        </div>
      )}

      {!semParticipacao && (
        <div>
          <div className="progresso" style={{ marginTop: 22 }}>
            <b>{feitos} de {BLOCOS} blocos</b>
            <div className="trilha"><i style={{ transform: 'scaleX(' + feitos / BLOCOS + ')' }} /></div>
          </div>

          <div className="salvo">{salvoTexto}</div>
          {erroSalvar && <div className="aviso erro">{erroSalvar}</div>}

          <form onSubmit={concluir}>
            <Bloco indice={0} aberto={blocoAberto === 0} completo={blocoCompleto(0, dadosProgresso)} onToggle={() => setBlocoAberto((a) => (a === 0 ? null : 0))}>
              <p className="nota">Isto atravessa as edições. Corrija o que mudou.</p>
              <label><span>Nome da marca</span><input required value={marca.nome_marca} onChange={(e) => alterarMarca('nome_marca', e.target.value)} /></label>
              <div className="dupla">
                <label><span>Responsável pelo festival</span><input required value={marca.responsavel} onChange={(e) => alterarMarca('responsavel', e.target.value)} /></label>
                <label><span>Telefone</span><input inputMode="tel" required value={marca.telefone} onChange={(e) => alterarMarca('telefone', e.target.value)} /></label>
              </div>
              <div className="dupla">
                <label><span>E-mail de contato</span><input type="email" inputMode="email" value={marca.email} onChange={(e) => alterarMarca('email', e.target.value)} /></label>
                <label><span>Instagram <em>(opcional)</em></span><input placeholder="@suamarca" value={marca.instagram} onChange={(e) => alterarMarca('instagram', e.target.value)} /></label>
              </div>
              <div className="dupla">
                <label><span>Site <em>(opcional)</em></span><input placeholder="https://" value={marca.site} onChange={(e) => alterarMarca('site', e.target.value)} /></label>
                <label><span>CNPJ <em>(opcional)</em></span><input inputMode="numeric" value={marca.cnpj} onChange={(e) => alterarMarca('cnpj', e.target.value)} /></label>
              </div>
              <label><span>Razão social <em>(opcional)</em></span><input value={marca.razao_social} onChange={(e) => alterarMarca('razao_social', e.target.value)} /></label>
            </Bloco>

            <Bloco indice={1} aberto={blocoAberto === 1} completo={blocoCompleto(1, dadosProgresso)} onToggle={() => setBlocoAberto((a) => (a === 1 ? null : 1))}>
              <p className="nota">O festival nasce de um tema, e cada marca lê esse tema do seu
                jeito. Conte qual foi a sua leitura.</p>
              <label><span>Tema escolhido pela marca</span><input required value={tema.tema_combo} onChange={(e) => alterarTema('tema_combo', e.target.value)} /></label>
              <label><span>Justificativa <em>(por que esse ângulo, como conversa com a inspiração)</em></span>
                <textarea required value={tema.tema_justificativa} onChange={(e) => alterarTema('tema_justificativa', e.target.value)} />
              </label>
            </Bloco>

            <Bloco indice={2} aberto={blocoAberto === 2} completo={blocoCompleto(2, dadosProgresso)} onToggle={() => setBlocoAberto((a) => (a === 2 ? null : 2))}>
              <p className="nota">Cada item é julgado na sua categoria, e a média dos três é o
                Melhor Combo. Descreva como cada um conversa com o tema.</p>
              <p className="nota"><b>Marcar vegano, sem glúten ou sem lactose amplia o público
                que chega até você</b>: muita gente escolhe a rota pelo que consegue comer.
                As restrições valem por item: o doce pode ser vegano e o salgado não.</p>
              <div>
                {TIPOS.map((tipo) => {
                  const it = itemDe(tipo, itens)
                  if (!it) return null
                  return (
                    <div className="item" key={it.id}>
                      <div className="topo"><b>{ROTULO_TIPO[tipo]}</b></div>
                      <label><span>Nome</span><input value={it.nome || ''} onChange={(e) => alterarItem(it.id, 'nome', e.target.value)} /></label>
                      <label><span>Descrição <em>(como conversa com o tema)</em></span>
                        <textarea value={it.descricao || ''} onChange={(e) => alterarItem(it.id, 'descricao', e.target.value)} />
                      </label>
                      <label><span>Ingredientes</span><input value={it.ingredientes || ''} onChange={(e) => alterarItem(it.id, 'ingredientes', e.target.value)} /></label>
                      <label className="marcar"><input type="checkbox" checked={!!it.vegano} onChange={(e) => alterarItem(it.id, 'vegano', e.target.checked)} /><span>Vegano</span></label>
                      <label className="marcar"><input type="checkbox" checked={!!it.sem_gluten} onChange={(e) => alterarItem(it.id, 'sem_gluten', e.target.checked)} /><span>Sem glúten</span></label>
                      <label className="marcar"><input type="checkbox" checked={!!it.sem_lactose} onChange={(e) => alterarItem(it.id, 'sem_lactose', e.target.checked)} /><span>Sem lactose</span></label>
                    </div>
                  )
                })}
              </div>
            </Bloco>

            <Bloco indice={3} aberto={blocoAberto === 3} completo={blocoCompleto(3, dadosProgresso)} onToggle={() => setBlocoAberto((a) => (a === 3 ? null : 3))}>
              <label style={{ maxWidth: 220 }}><span>Valor do combo <em>(em reais)</em></span>
                <input inputMode="decimal" placeholder="0,00" required value={precoStr} onChange={(e) => alterarPreco(e.target.value)} />
              </label>
            </Bloco>

            <Bloco indice={4} aberto={blocoAberto === 4} completo={blocoCompleto(4, dadosProgresso)} onToggle={() => setBlocoAberto((a) => (a === 4 ? null : 4))}>
              <p className="nota">Uma por endereço. Rede com várias lojas cadastra cada uma.
                Continua contando como uma marca só. O horário aqui é o <b>dos dias do
                festival</b>, que pode ser diferente do horário normal da loja.</p>
              <div>
                {unidades.map((u, i) => (
                  <div className="unidade" key={u._key}>
                    <div className="topo">
                      <b>Unidade {i + 1}</b>
                      <button className="link" type="button" onClick={() => removerUnidade(u._key)}>remover</button>
                    </div>
                    <label><span>Endereço</span><input value={u.endereco} onChange={(e) => alterarUnidade(u._key, 'endereco', e.target.value)} /></label>
                    <div className="dupla">
                      <label><span>Bairro</span><input value={u.bairro} onChange={(e) => alterarUnidade(u._key, 'bairro', e.target.value)} /></label>
                      <label><span>Horário durante o festival</span>
                        <input placeholder="seg a sáb, 10h às 22h" value={u.horarios} onChange={(e) => alterarUnidade(u._key, 'horarios', e.target.value)} />
                      </label>
                    </div>
                    <label className="marcar">
                      <input type="checkbox" checked={!!u.faz_delivery} onChange={(e) => alterarUnidade(u._key, 'faz_delivery', e.target.checked)} />
                      <span>Esta unidade faz delivery</span>
                    </label>
                    <div className="canais" hidden={!u.faz_delivery}>
                      <b>Link de cada canal</b>
                      {CANAIS.map((c) => (
                        <label key={c.tipo}>
                          <span>{c.rotulo} <em>(deixe em branco se não usa)</em></span>
                          <input placeholder={c.dica} value={u.canais[c.tipo]} onChange={(e) => alterarCanal(u._key, c.tipo, e.target.value)} />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="acao secundaria" type="button" onClick={adicionarUnidade}>+ Adicionar unidade</button>
            </Bloco>

            <button className="acao larga" type="submit" style={{ marginTop: 18 }} disabled={concluindo}>
              {concluindo ? 'Concluindo…' : 'Concluir cadastro'}
            </button>
          </form>

          {concluirAviso && <div className={'aviso ' + concluirAviso.tom} style={{ marginTop: 12 }}>{concluirAviso.texto}</div>}

          {sessoes.length > 0 && (
            <div className="card" style={{ marginTop: 18 }}>
              <p className="rotulo">Fotos do combo</p>
              <h2>Sua sessão</h2>
              <p className="nota">
                {vagas.length > 0 && !jaTemSessao
                  ? 'A organização abriu horários. Escolha um abaixo.'
                  : 'Quem fotografa é a organização. A data e o local são definidos por ela; qualquer mudança é combinada pelo canal de sempre.'}
              </p>
              <div>
                {sessoes.map((s) => (
                  <div className="linha" key={s.id}>
                    <div className="corpo">
                      <b>{[dataHoraCurta(s.data_hora), s.local || ''].filter(Boolean).join(' · ')}</b>
                      {s.observacoes && <span>{s.observacoes}</span>}
                    </div>
                    <div className="lado">
                      <span className={'selo' + (s.status === 'realizada' ? ' completo' : '')}>{ROTULO_SESSAO[s.status] || s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              {vagas.length > 0 && !jaTemSessao && (
                <ul className="mc-vagas">
                  {vagas.map((s) => {
                    const d = new Date(s.data_hora)
                    const rotulo = d.toLocaleDateString('pt-BR', { weekday: 'short' }) + ' ' + d.getDate() +
                      ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    return (
                      <li key={s.id}>
                        <button type="button" className="mc-vaga" disabled={reservando === s.id} onClick={() => reservarVaga(s.id)}>
                          {reservando === s.id ? 'Reservando…' : rotulo}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
