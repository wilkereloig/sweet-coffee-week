import React from 'react'
import { rpc, chamarFuncao } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { dataHoraCurta, preco, prazoSelo } from '../../lib/painelFormat'
import {
  COR_CADASTRO, ROTULO_SESSAO, RECADO_MANUAL,
  slugPrevisto, resumoParticipante,
} from '../../lib/participantes'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { VistaCabeca } from '../VistaCabeca'
import { Folha } from '../Folha'
import { Credenciais } from '../Credenciais'
import { ICONE } from '../PainelShell'

// Linha de "Contato:" — só aparece quando o valor existe, como
// `linha()` na versão estática.
function Linha({ rotulo, valor }) {
  if (!valor) return null
  return <p className="og-par"><b>{rotulo}</b> {valor}</p>
}

function restricoes(i) {
  return [i.vegano ? 'vegano' : '', i.sem_gluten ? 'sem glúten' : '', i.sem_lactose ? 'sem lactose' : '']
    .filter(Boolean).join(' · ')
}

// A ficha completa de uma marca (get_ficha_participacao) — leitura, sem os
// botões de "enviar foto"/"dar por respondido" da versão estática: esses
// mutam Storage e solicitações, área da vista Produção, que ainda não existe
// em painel-app. Ver relatório da tarefa.
function FichaCorpo({ estado }) {
  if (estado.carregando) return <div className="og-bloco"><p>Buscando a ficha.</p></div>
  if (estado.erro) return <div className="og-bloco"><p>{estado.erro}</p></div>

  const f = estado.dados
  const m = f.marca || {}
  const pa = f.participacao || {}
  const itens = f.itens || []
  const unidades = f.unidades || []
  const solics = f.solicitacoes || []
  const arqs = f.arquivos || []
  const sess = f.sessoes || []
  const edicoes = f.edicoes || []

  return (
    <>
      <div className="og-bloco" style={{ borderTop: 0, paddingTop: 0 }}>
        <h3>Contato</h3>
        <Linha rotulo="Responsável:" valor={m.responsavel} />
        <Linha rotulo="Telefone:" valor={m.telefone} />
        <Linha rotulo="E-mail:" valor={m.email} />
        <Linha rotulo="Instagram:" valor={m.instagram} />
        <Linha rotulo="Site:" valor={m.site} />
        <Linha rotulo="CNPJ:" valor={m.cnpj} />
        <Linha rotulo="Razão social:" valor={m.razao_social} />
      </div>

      <div className="og-bloco">
        <h3>O combo</h3>
        <Linha rotulo="Tema:" valor={pa.tema_combo} />
        <Linha rotulo="Justificativa:" valor={pa.tema_justificativa} />
        <Linha rotulo="Preço:" valor={preco(pa.combo_preco)} />
        {itens.length
          ? itens.map((i) => (
              <div className="og-par" style={{ marginTop: 10 }} key={i.id}>
                <b>{(i.tipo || '').toUpperCase()}</b> {i.nome || '(sem nome)'}
                {i.descricao && <><br />{i.descricao}</>}
                {i.ingredientes && <><br /><i>{i.ingredientes}</i></>}
                {restricoes(i) && <><br />{restricoes(i)}</>}
              </div>
            ))
          : <p>Os três itens ainda não foram criados.</p>}
      </div>

      <div className="og-bloco">
        <h3>Unidades</h3>
        {unidades.length
          ? unidades.map((u, i) => (
              <p className="og-par" key={u.id || i}>
                <b>{u.endereco || '(sem endereço)'}</b>{u.bairro ? ' · ' + u.bairro : ''}
                {u.horarios && <><br />{u.horarios}</>}
                <br />
                {u.faz_delivery
                  ? 'delivery: ' + ((u.canais_delivery || []).map((c) => c.tipo).join(', ') || 'sem canal informado')
                  : 'sem delivery'}
              </p>
            ))
          : <p>Nenhuma unidade cadastrada.</p>}
      </div>

      <div className="og-bloco">
        <h3>Pedidos</h3>
        {solics.length
          ? solics.map((s) => {
              const prazo = s.prazo_em ? prazoSelo(s.prazo_em) : null
              return (
                <p className="og-par" key={s.id}>
                  <b>{s.titulo}</b> · {s.estado === 'respondido' ? 'respondido' : 'pendente'}
                  {prazo ? ' · ' + prazo.texto : ''}
                </p>
              )
            })
          : <p>Nenhum pedido publicado para esta marca.</p>}
      </div>

      <div className="og-bloco">
        <h3>Arquivos e fotos</h3>
        {arqs.length
          ? arqs.map((a) => (
              <p className="og-par" key={a.id}>
                <b>{a.nome}</b>
                {a.exige_leitura ? (a.lido_em ? ' · leu em ' + dataCurta(a.lido_em) : ' · ainda não leu') : ''}
              </p>
            ))
          : <p>Nenhum arquivo para esta marca.</p>}
        {sess.length
          ? sess.map((x) => (
              <p className="og-par" key={x.id}><b>Sessão</b> {dataHoraCurta(x.data_hora)} · {ROTULO_SESSAO[x.status] || x.status}</p>
            ))
          : <p>Nenhuma sessão de fotos agendada.</p>}
      </div>

      <div className="og-bloco">
        <h3>Histórico</h3>
        {edicoes.map((e) => (
          <p className="og-par" key={e.id}><b>{e.edicao_codigo}</b> · {e.status_cadastro}{e.tema_combo ? ' · ' + e.tema_combo : ''}</p>
        ))}
      </div>
    </>
  )
}

export function Marcas({ registrarAtualizar, reportarEstado, pode = () => true }) {
  const [participantes, setParticipantes] = React.useState(null) // null = carregando
  const [erro, setErro] = React.useState(null)

  const [fichaAberta, setFichaAberta] = React.useState(false)
  const [fichaEstado, setFichaEstado] = React.useState(null) // { carregando, dados, erro }

  const [cadastroAberto, setCadastroAberto] = React.useState(false)
  const [manNome, setManNome] = React.useState('')
  const [manTelefone, setManTelefone] = React.useState('')
  const [manResponsavel, setManResponsavel] = React.useState('')
  const [manEmail, setManEmail] = React.useState('')
  const [manAviso, setManAviso] = React.useState(null) // { tom, texto }
  const [manCriando, setManCriando] = React.useState(false)
  const [manCriada, setManCriada] = React.useState(false)
  const [manCredenciais, setManCredenciais] = React.useState(null) // { login, senha }

  const carregar = React.useCallback(async () => {
    setErro(null)
    const senha = sessionStorage.getItem(CHAVE_SESSAO) || ''
    try {
      // admin_ping junto, como em Respostas: RPC de leitura não dá erro com
      // senha inválida, só devolve lista vazia — sem isso, sessão vencida
      // pareceria "nenhuma marca" em vez de "sessão vencida".
      const [valida, lista] = await Promise.all([
        rpc('admin_ping', { p_secret: senha }),
        rpc('get_participantes', { p_secret: senha }),
      ])
      if (valida !== true) {
        setErro('A senha desta sessão não vale mais. Saia e entre de novo.')
        return
      }
      const novo = lista || []
      setParticipantes(novo)
      if (reportarEstado) reportarEstado({ participantes: novo })
    } catch (e) {
      setErro(e.message)
    }
  }, [reportarEstado])

  React.useEffect(() => { carregar() }, [carregar])
  React.useEffect(() => {
    if (registrarAtualizar) registrarAtualizar(carregar)
  }, [registrarAtualizar, carregar])

  async function abrirFicha(participacaoId) {
    setFichaAberta(true)
    setFichaEstado({ carregando: true, dados: null, erro: null })
    const senha = sessionStorage.getItem(CHAVE_SESSAO) || ''
    try {
      const f = await rpc('get_ficha_participacao', { p_secret: senha, p_participacao: participacaoId })
      setFichaEstado({ carregando: false, dados: f, erro: f ? null : 'Ficha não encontrada.' })
    } catch (e) {
      setFichaEstado({ carregando: false, dados: null, erro: e.message })
    }
  }

  function abrirCadastro() {
    setManNome(''); setManTelefone(''); setManResponsavel(''); setManEmail('')
    setManAviso(null); setManCriando(false); setManCriada(false); setManCredenciais(null)
    setCadastroAberto(true)
  }

  async function criarMarcaManual() {
    const nome = manNome.trim()
    const telefone = manTelefone.trim()
    if (!nome) { setManAviso({ tom: 'erro', texto: 'Escreva o nome do estabelecimento.' }); return }
    if (!telefone) { setManAviso({ tom: 'erro', texto: 'O telefone é como você entrega o acesso.' }); return }

    setManCriando(true)
    setManAviso(null)
    const senha = sessionStorage.getItem(CHAVE_SESSAO) || ''
    try {
      const r = await chamarFuncao('criar-acesso-marca', {
        secret: senha,
        marca: { nome, telefone, responsavel: manResponsavel.trim(), email: manEmail.trim() },
      })
      if (!r || !r.login || !r.senha) throw new Error('a função não devolveu as credenciais.')

      await carregar()
      setManAviso({ tom: 'ok', texto: 'Marca criada. Copie ou envie agora.' })
      setManCriada(true)
      setManCredenciais({ login: r.login, senha: r.senha })
    } catch (e) {
      const codigo = e.dados && e.dados.erro
      let recado = RECADO_MANUAL[codigo] || ('Não criou: ' + e.message)
      if (codigo === 'existe_candidatura') {
        recado += ' Abra a ficha dela em "Respostas" e use o botão Criar acesso: assim a candidatura fica vinculada à conta em vez de ficar órfã.'
      }
      setManAviso({ tom: 'erro', texto: recado })
    } finally {
      setManCriando(false)
    }
  }

  const tituloFicha = fichaEstado?.dados?.marca?.nome_marca || (fichaEstado?.carregando ? 'Carregando…' : 'Ficha')
  const subFicha = fichaEstado?.dados
    ? 'Edição ' + (fichaEstado.dados.participacao.edicao_codigo || 'N/D') + ' · ' + (fichaEstado.dados.participacao.status_cadastro || '')
    : ''

  return (
    <section className="og-vista">
      <VistaCabeca acento="roxo" icone={ICONE.participantes} titulo="Marcas" nota="Quem já tem conta e preenche o próprio cadastro" />

      <section className="og-forms">
        <div className="og-forms__cabeca og-forms__cabeca--com-acao">
          <div>
            <h2>Marcas com acesso</h2>
            <p>Quem já tem conta para preencher o próprio cadastro.</p>
          </div>
          <button
            className="og-btn og-btn--mini" type="button"
            disabled={!pode('marca.liberar')}
            title={pode('marca.liberar') ? undefined : 'Sua função não cadastra marca'}
            onClick={abrirCadastro}
          >
            Cadastrar marca
          </button>
        </div>
        {/* Texto visível, não só title: botão disabled não recebe hover nem
            foco de teclado (pointer-events:none no CSS) — achado de revisão
            adversarial. */}
        {!pode('marca.liberar') && <p className="og-forms__nota">Sua função não cadastra marca.</p>}

        {erro && (
          <div className="og-estado" data-tom="erro">
            <h2>Não consegui listar as marcas</h2>
            <p>{erro}</p>
            <p>Se a mensagem fala em função inexistente, a migration das contas ainda não foi aplicada no banco. O resto do painel não depende dela e segue funcionando.</p>
          </div>
        )}

        {!erro && participantes && participantes.length === 0 && (
          <div className="og-estado">
            <h2>Nenhuma marca com acesso</h2>
            <p>Há dois caminhos: aprovar uma candidatura do "Quero participar" e usar o botão <b>Criar acesso</b> na ficha dela, ou cadastrar a marca direto aqui, no botão <b>Cadastrar marca</b> acima: para quem você convidou sem passar pelo formulário.</p>
            <p>Nos dois casos o login é o nome do estabelecimento e a senha aparece uma vez, para você entregar.</p>
          </div>
        )}

        {!erro && participantes && participantes.length > 0 && (
          <ul className="og-lista">
            {participantes.map((p) => {
              // `<button>` e não `<div>`: a linha ABRE a ficha, e ação de
              // navegação em elemento morto não recebe foco nem tecla
              // (CLAUDE.md §13). Marca sem participação não abre nada.
              const clicavel = !!p.participacao_id
              const Item = clicavel ? 'button' : 'div'
              return (
                <li key={p.id}>
                  <Item
                    className="og-item"
                    type={clicavel ? 'button' : undefined}
                    onClick={clicavel ? () => abrirFicha(p.participacao_id) : undefined}
                  >
                    <span className="og-item__cor" style={{ background: COR_CADASTRO[p.status_cadastro] || '#6A2C15' }} aria-hidden="true" />
                    <p className="og-item__nome">{p.nome_marca || '(sem nome)'}</p>
                    <p className="og-item__meta">{resumoParticipante(p)}</p>
                    <span className="og-item__dir">
                      <span className="og-selo" data-acesso={p.status_cadastro}>{p.status_cadastro}</span>
                      <span className="og-item__data">{dataCurta(p.created_at)}</span>
                    </span>
                  </Item>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Folha aberto={fichaAberta} titulo={tituloFicha} sub={subFicha} onFechar={() => setFichaAberta(false)}>
        {fichaEstado && <FichaCorpo estado={fichaEstado} />}
      </Folha>

      <Folha aberto={cadastroAberto} titulo="Cadastrar marca" sub="Para quem você convidou sem passar pelo formulário" onFechar={() => setCadastroAberto(false)}>
        <div className="og-bloco" style={{ borderTop: 0, paddingTop: 0 }}>
          <p className="og-forms__nota">A conta nasce agora, com login e senha. Nome e telefone são obrigatórios: um vira o login, o outro é o botão do WhatsApp.</p>
          <label className="og-campo">
            <span>Nome do estabelecimento</span>
            <input type="text" autoComplete="off" value={manNome} onChange={(e) => setManNome(e.target.value)} />
          </label>
          <p className="og-forms__nota">O login vai ser: <b>{slugPrevisto(manNome) || '…'}</b></p>
          <label className="og-campo">
            <span>Telefone (WhatsApp)</span>
            <input type="tel" inputMode="tel" placeholder="(84) 90000-0000" value={manTelefone} onChange={(e) => setManTelefone(e.target.value)} />
          </label>
          <label className="og-campo">
            <span>Responsável <span className="og-forms__nota">(opcional)</span></span>
            <input type="text" autoComplete="off" value={manResponsavel} onChange={(e) => setManResponsavel(e.target.value)} />
          </label>
          <label className="og-campo">
            <span>E-mail <span className="og-forms__nota">(opcional)</span></span>
            <input type="email" autoComplete="off" placeholder="contato@marca.com.br" value={manEmail} onChange={(e) => setManEmail(e.target.value)} />
          </label>
          {manAviso && <div className="og-aviso" data-tom={manAviso.tom}>{manAviso.texto}</div>}
          {manCredenciais && (
            <Credenciais nomeMarca={manNome} telefone={manTelefone} login={manCredenciais.login} senha={manCredenciais.senha} />
          )}
          <button
            className="og-btn" type="button"
            disabled={manCriando || manCriada || !pode('marca.liberar')}
            title={pode('marca.liberar') ? undefined : 'Sua função não cadastra marca'}
            onClick={criarMarcaManual}
          >
            {manCriando ? 'Criando…' : manCriada ? 'Criada' : 'Criar marca e acesso'}
          </button>
        </div>
      </Folha>
    </section>
  )
}
