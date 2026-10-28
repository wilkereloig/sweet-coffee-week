import React from 'react'
import { urlLogo } from '../../lib/logos'
import { api, seFaltar } from '../../lib/marcaApi'
import { chaveDia } from '../../lib/hoje'
import { VistaCabeca } from '../VistaCabeca'
import { Carregando, Erro, Secao } from '../ui'
import { VouchersMarca } from './VouchersMarca'
import { momentoEdicao, resumoTrajetoria, proximosDoCronograma } from '../../lib/operacao'
import { useSincronizar, useGuarda } from '../../lib/sync/react'
import { msAteMeiaNoite, comVendaGravada } from '../../lib/sincMarca'
import {
  nomeDaEdicao, fraseDaFase, planejarAgora, apresentarDestaque, semAcao as decidirSemAcao, esperandoOrganizacao, prazoDoCadastro,
  gruposDoInicio, linhasDeAcompanhamento, textoProgresso, resumoSolicitacoes, ordemDoInicio, vendaVisivel,
} from '../../lib/inicioMarca'
import { VendaDoDia } from './hoje/VendaDoDia'
import { Identificacao } from './hoje/Identificacao'
import { Agora } from './hoje/Agora'
import { Pendencias } from './hoje/Pendencias'
import { Acompanhamento } from './hoje/Acompanhamento'
import { Comunicacao } from './hoje/Comunicacao'
import { Materiais } from './hoje/Materiais'
import '../../styles/inicio-marca.css'

/*
 * Início (marca) — a ordem de cima para baixo (22/10/2026):
 *   identificação · o que fazer agora · pendências por assunto · acompanhamento · comunicação e prazos
 *   · materiais e história. As vendas do dia (e os vouchers) entram logo abaixo do destaque DURANTE o
 *   festival e descem depois dele; antes, a preparação vem primeiro (lib/inicioMarca.js › ordemDoInicio).
 *
 * As decisões (qual é o destaque, se uma mensagem passa na frente, o que dizer sem tarefa, o texto do
 * progresso) são puras e moram em lib/inicioMarca.js; os dados do guia vêm da casca (`resumo`). Aqui só se
 * carrega o que é desta tela (edição, cronograma, vendas, história).
 *
 * ⚠️ Os blocos são desenhados com `key`: mudar a ordem MOVE o bloco, não o remonta. A venda do dia guarda o
 * número digitado (useRegistroEditavel + usePendencia) e o perderia se fosse remontada.
 */
export function Hoje({ irPara, abrirLink, contadores = {}, alvo, consumirAlvo, resumo, dadosMarca, erroResumo, recarregarResumo, avisos = [] }) {
  const [vendas, setVendas] = React.useState(null)       // null = ainda não lidas (ou a leitura falhou)
  const [edicao, setEdicao] = React.useState(null)
  const [cronograma, setCronograma] = React.useState([])
  const [historia, setHistoria] = React.useState(null)
  const [erroLocal, setErroLocal] = React.useState(null)    // leitura que falhou SEM haver dado anterior para mostrar
  const [, tic] = React.useReducer((n) => n + 1, 0)
  const guarda = useGuarda()
  const lidos = React.useRef({})                            // o que já foi lido ao menos uma vez para esta participação

  const participante = dadosMarca && dadosMarca.participante
  const participacao = dadosMarca && dadosMarca.participacao
  const participacaoId = participacao ? participacao.id : null
  const edicaoCodigo = participacao ? participacao.edicao_codigo : null
  const estado = !dadosMarca ? 'carregando' : !participante ? 'sem-marca' : !participacao ? 'sem-participacao' : 'pronto'
  const hoje = chaveDia(new Date())
  const listaVendas = vendas || []
  const deHoje = listaVendas.find((v) => v.dia === hoje)

  // Virada do dia: sem isto, "hoje" só mudaria quando algo re-renderizasse a tela.
  React.useEffect(() => {
    const t = setTimeout(tic, msAteMeiaNoite(new Date()))
    return () => clearTimeout(t)
  }, [hoje])

  // Releitura silenciosa (sinal de sincronização): nunca troca o conteúdo por "Carregando…" nem mexe no
  // que a pessoa digitou. Leitura que falha MANTÉM o que já estava na tela e rejeita — o indicador de
  // sincronização mostra "falha"; só quando nunca houve dado é que a tela diz que não carregou.
  const carregarLocal = React.useCallback(async () => {
    const vale = guarda()
    const ed = participacaoId ? encodeURIComponent(edicaoCodigo) : null
    const leituras = {
      // Só a AUSÊNCIA da função no banco vira vazio (migration ainda não aplicada); falha de verdade conta como falha.
      historia: () => api('rpc/marca_minha_historia', { metodo: 'POST', corpo: {} }).catch(seFaltar(null)),
      ...(ed ? {
        edicao: () => api('edicoes?select=*&codigo=eq.' + ed),
        cronograma: () => api('edicao_cronograma?select=*&edicao_codigo=eq.' + ed + '&order=ordem'),
        vendas: () => api('vendas_diarias?select=*&participacao_id=eq.' + participacaoId + '&order=dia.desc'),
      } : {}),
    }
    const nomes = Object.keys(leituras)
    const res = await Promise.allSettled(nomes.map((n) => leituras[n]()))
    if (!vale()) return
    const dado = {}
    let falha = null
    res.forEach((x, i) => { if (x.status === 'fulfilled') dado[nomes[i]] = x.value; else falha = falha || x.reason })
    if (falha && falha.message === 'sessao_expirada') return    // o App leva ao login
    if ('historia' in dado) setHistoria(dado.historia)
    if ('edicao' in dado) setEdicao((dado.edicao && dado.edicao[0]) || null)
    if ('cronograma' in dado) setCronograma(dado.cronograma || [])
    if ('vendas' in dado) setVendas(dado.vendas || [])
    Object.keys(dado).forEach((n) => { lidos.current[n] = true })
    if (falha) {
      if (nomes.some((n) => !lidos.current[n])) setErroLocal(falha.message || 'erro')
      throw falha
    }
    setErroLocal(null)
  }, [participacaoId, edicaoCodigo, guarda])

  // Outra participação (nova edição): nada do que está na tela vale para ela.
  const ultimaParticipacao = React.useRef(participacaoId)
  React.useEffect(() => {
    if (!dadosMarca) return
    if (ultimaParticipacao.current !== participacaoId) {
      ultimaParticipacao.current = participacaoId
      lidos.current = {}
      setVendas(null); setEdicao(null); setCronograma([]); setErroLocal(null)
    }
    carregarLocal().catch(() => {})   // a falha fica em erroLocal; as releituras seguintes contam no indicador
  }, [carregarLocal, !!dadosMarca]) // eslint-disable-line react-hooks/exhaustive-deps
  useSincronizar(['participantes', 'edicao', 'vendas'], () => (dadosMarca ? carregarLocal() : undefined))
  // Aviso "registre as vendas de hoje": rola até a venda.
  React.useEffect(() => {
    if (!alvo) return
    if ((alvo.id === 'venda' || !alvo.id) && estado === 'pronto') {
      const el = document.getElementById('venda-do-dia')
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const campo = el.querySelector('input'); if (campo) campo.focus({ preventScroll: true }) }
    }
    if (estado !== 'carregando') consumirAlvo && consumirAlvo()
  }, [alvo, estado]) // eslint-disable-line react-hooks/exhaustive-deps

  const ir = (link, vista) => (link ? abrirLink(link) : irPara(vista))
  const momento = momentoEdicao(edicao, hoje)
  const trajetoria = resumoTrajetoria(historia)
  const proximos = proximosDoCronograma(cronograma, hoje, 5)
  const total = listaVendas.reduce((s, v) => s + Number(v.quantidade || 0), 0)
  const nomePessoa = participante && String(participante.responsavel || '').trim().split(/\s+/)[0]
  const edicaoNome = nomeDaEdicao(edicao, edicaoCodigo)
  const fase = fraseDaFase(edicao, momento)

  // ── Os blocos da tela, cada um sob a própria key ─────────────────────────
  let blocos = null
  if (estado === 'pronto' && resumo) {
    const agora = new Date()
    const itens = dadosMarca.itens || []
    const msgsNovas = contadores.mensagens || 0
    const prazoCadastro = prazoDoCadastro(cronograma, hoje)
    const plano = planejarAgora({ proxima: resumo.proxima, pendencias: resumo.pendencias, msgsNovas, momento, prazoCadastro })
    const destaque = apresentarDestaque(plano.destaque, { itens, agora, prazoCadastro })
    const semAcao = plano.destaque ? null : decidirSemAcao({ momento, esperas: esperandoOrganizacao({ resumo, dados: dadosMarca, momento }), vendaFeita: !!deHoje })
    const arquivos = (dadosMarca.arquivos || []).filter((a) => a.categoria !== 'combo')
    const pedidosAbertos = (dadosMarca.pedidos || []).filter((p) => p.estado !== 'respondido').length
    const grupos = gruposDoInicio(plano)
    const notaVenda = momento === 'depois' ? 'A edição terminou. Dá para conferir ou corrigir o que foi lançado.'
      : deHoje ? 'Lançado. Dá para corrigir quantas vezes precisar.'
      : 'Lance no fim do expediente. A organização soma tudo para o balanço da edição.'
    blocos = {
      identificacao: (
        <Identificacao nome={participante.nome_marca} edicao={edicaoNome} fase={fase}
          logoUrl={urlLogo(dadosMarca.logo && dadosMarca.logo.atual && dadosMarca.logo.atual.path)} />
      ),
      agora: <Agora destaque={destaque} semAcao={semAcao} aparte={plano.mensagemAparte} ir={ir} />,
      venda: vendaVisivel(momento) && (vendas !== null || !erroLocal) ? (
        <Secao id="venda-do-dia" titulo="Combos vendidos" nota={notaVenda}>
          {vendas === null
            ? <Carregando linhas={2} texto="Carregando as vendas…" />
            : <VendaDoDia vendas={vendas} hoje={hoje} total={total} participacaoId={participacaoId}
                aoGravar={(linha) => setVendas((atual) => comVendaGravada(atual, linha))}
                recarregar={carregarLocal} invalidar={() => { guarda() }} />}
        </Secao>
      ) : null,
      vouchers: <VouchersMarca />,
      pendencias: grupos.length ? <Pendencias grupos={grupos} itens={itens} ir={ir} irPara={irPara} alemDoDestaque={!!plano.fora} /> : null,
      acompanhamento: <Acompanhamento progresso={textoProgresso(resumo)} linhas={linhasDeAcompanhamento({ resumo, dados: dadosMarca })} irPara={irPara} />,
      comunicacao: (
        <Comunicacao mensagemAcima={msgsNovas > 0} solicitacoes={resumoSolicitacoes(dadosMarca.pedidos, agora)}
          recentes={(avisos || []).slice(0, 3)} cronograma={proximos} hoje={hoje} irPara={irPara} abrirLink={abrirLink}
          notaCronograma={momento === 'antes'
            ? 'O registro diário de combos vendidos abre aqui no primeiro dia do festival. As datas vêm da organização e podem mudar.'
            : 'As datas vêm da organização e podem mudar — o painel acompanha.'} />
      ),
      materiais: (
        <Materiais irPara={irPara} historia={historia} trajetoria={trajetoria}
          atalhos={[
            ['arquivos', arquivos.length ? 'Arquivos (' + arquivos.length + ')' : 'Arquivos', contadores.arquivos],
            ['guia', 'Guia de fotos', 0],
            ['fotos', 'Fotos', contadores.fotos],
            ['pedidos', 'Solicitações', pedidosAbertos],
          ]} />
      ),
    }
  }

  return (
    <section className="ui-vista-marca">
      <VistaCabeca
        acento="amarelo" icone="inicio"
        titulo={nomePessoa ? 'Olá, ' + nomePessoa : participante ? 'Olá, ' + participante.nome_marca : 'Início'}
        nota={participacao ? [participante.nome_marca, edicaoNome, fase].filter(Boolean).join(' · ') : 'O que falta e o que vem agora'}
      />

      {estado === 'carregando' && (erroResumo
        ? <Erro texto={erroResumo} onTentar={recarregarResumo} />
        : <Carregando linhas={3} texto="Carregando o seu painel…" />)}
      {estado === 'sem-marca' && <Erro titulo="Conta sem marca" texto="Sua conta existe, mas ainda não há marca ligada a ela. Fale com a organização pelo WhatsApp." />}

      {estado === 'pronto' && erroLocal && (
        <Erro titulo="Parte das informações não carregou" texto={erroLocal} onTentar={() => carregarLocal().catch(() => {})} />
      )}

      {estado === 'sem-participacao' && (
        <Secao titulo="Sem edição aberta" nota="O cadastro abre aqui quando a edição abrir.">
          <button className="og-btn og-btn--mini og-btn--vazado" type="button" onClick={() => irPara('mensagens')}>Falar com a organização</button>
        </Secao>
      )}

      {blocos && (
        <div className="gm-inicio">
          {ordemDoInicio(momento).map((k) => <React.Fragment key={k}>{blocos[k]}</React.Fragment>)}
        </div>
      )}
    </section>
  )
}
