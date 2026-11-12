import React from 'react'
import { EDICAO } from '../config.js'
import * as C from '../rota/carimbo.js'
import { api as apiPadrao } from './api.js'
import { resumoProgresso, proximaAcao, situacaoEmail } from './regras.js'
import { aposLeitura, ESPERA_CONFIRMACAO_MS } from './leituraDoMapa.js'

/**
 * Chave do mapa: a do link pessoal (`#mapa=`, que grava e sai do endereço) ou a do aparelho. É o MESMO esquema de
 * armazenamento de sempre (`scw:edicao:<código>:mapa`), então nenhum mapa existente é invalidado.
 */
export function chaveInicial () {
  const doLink = C.chaveDoHash(globalThis.location?.hash)
  if (doLink) {
    C.gravarChave(EDICAO.codigo, doLink)
    // A chave não fica no endereço: quem copiar a barra do navegador não leva o mapa junto.
    try { history.replaceState(history.state, '', location.pathname + location.search) } catch { /* sem history */ }
    return doLink
  }
  // Sem chave ativa mas com uma na quarentena (o banco deixou de reconhecê-la há menos de 7 dias): tenta de novo, uma vez por sessão — se o problema era do
  // banco, o mapa volta sozinho, sem pedir código por e-mail (carimbo.js › QUARENTENA).
  return C.lerChave(EDICAO.codigo) || C.chaveDaQuarentena(EDICAO.codigo)
}

/**
 * O estado central da Caça aos Carimbos: um por página (as seções recebem `caca` pronto, não leem o banco de novo).
 * `comEmail: false` pula a consulta da situação do e-mail (quem só precisa do progresso, como o mapa, não paga a chamada).
 *
 *   estado   'sem-mapa' | 'carregando' | 'pronto' | 'falha'
 *   chave    a chave pessoal (NUNCA vai para log, analytics, URL ou arte)
 *   mapa     resposta de `mapa_ler_v2` (total_casas, casas_validadas, extras, faltam, posicao, empatados, casas[])
 *   resumo   números seguros do mapa · proxima  a próxima ação útil (regras.proximaAcao)
 *   email    'confirmado' | 'pendente' | 'desconhecido'
 *   perdeu   true quando havia chave no aparelho e o banco não a reconhece mais (confirmado em duas leituras; a chave vai para a quarentena, não é apagada)
 *   perfil   { nome, email, whatsapp } digitados neste aparelho
 *   recemCriado true logo depois de `entrar(chave, { criado: true })`: a tela mostra o "guarde seu mapa". Vive aqui, não na
 *            tela, porque entrar troca o corpo por "carregando" e desmonta quem guardasse o aviso.
 *   atualizar() relê o mapa · entrar(chave, { criado }) guarda uma chave nova (criação/recuperação/link): se o banco não a
 *   reconhecer, volta para a chave que o aparelho já tinha · sair() esquece o mapa NESTE aparelho (o mapa continua no
 *   banco) · apagar() apaga no banco e depois no aparelho; devolve false (e mantém a chave) se o banco não confirmar
 */
export function useCaca ({ api = apiPadrao, comEmail = true } = {}) {
  const [chave, setChave] = React.useState(chaveInicial)
  const [mapa, setMapa] = React.useState(null)
  const [estado, setEstado] = React.useState(chave ? 'carregando' : 'sem-mapa')
  const [email, setEmail] = React.useState('desconhecido')
  const [perdeu, setPerdeu] = React.useState(false)
  const [leitura, setLeitura] = React.useState(0)
  const [recemCriado, setRecemCriado] = React.useState(false)
  const atual = React.useRef(chave); atual.current = chave
  const anterior = React.useRef(null) // a chave que valia antes de `entrar`: volta a valer se a nova for desconhecida
  const duvidas = React.useRef(0) // respostas "desconhecida" seguidas para a chave de agora (leituraDoMapa.js: a segunda é que solta o mapa)

  React.useEffect(() => {
    if (!chave) { setEstado('sem-mapa'); return undefined }
    let vivo = true
    let espera = 0
    // Segunda chance: a chave em uso não é a ativa do aparelho, é a da quarentena (chaveInicial).
    const daQuarentena = C.lerChave(EDICAO.codigo) !== chave && C.lerQuarentena(EDICAO.codigo)?.chave === chave
    api.mapaLer(chave).then((r) => {
      if (!vivo) return
      const volta = anterior.current
      const acao = aposLeitura({ ok: r.ok, motivo: r.motivo, duvidas: duvidas.current, volta, chave, daQuarentena })
      if (acao === 'abrir') {
        anterior.current = null; duvidas.current = 0
        if (daQuarentena) C.gravarChave(EDICAO.codigo, chave) // o banco a reconheceu de novo: volta a ser a chave do aparelho
        C.apagarQuarentena(EDICAO.codigo)
        setMapa(r.mapa); setEstado('pronto'); setPerdeu(false)
        C.gravarPerfil(EDICAO.codigo, { nome: r.mapa?.apelido, email: r.mapa?.email, whatsapp: r.mapa?.whatsapp })
      } else if (acao === 'voltar') {
        anterior.current = null; duvidas.current = 0
        C.gravarChave(EDICAO.codigo, volta); setMapa(null); setEstado('carregando'); setChave(volta)
      } else if (acao === 'reler') {
        // Uma resposta "desconhecida" isolada não custa o mapa ao aparelho: pergunta de novo daqui a pouco, antes de largar a chave.
        duvidas.current += 1
        espera = setTimeout(() => setLeitura((n) => n + 1), ESPERA_CONFIRMACAO_MS)
      } else if (acao === 'segurar') {
        setChave(null); setMapa(null); setEstado('sem-mapa') // a segunda chance não deu: fica na quarentena até vencer; o aviso de "chave trocada" já foi dado
      } else if (acao === 'soltar') {
        duvidas.current = 0; anterior.current = null
        C.soltarChave(EDICAO.codigo) // vai para a quarentena, NÃO é apagada
        setChave(null); setMapa(null); setPerdeu(true); setEstado('sem-mapa')
      } else setEstado((e) => (e === 'pronto' ? e : 'falha')) // releitura que falha não derruba o mapa já mostrado
    })
    return () => { vivo = false; clearTimeout(espera) }
  }, [chave, leitura, api])

  React.useEffect(() => {
    if (!comEmail || estado !== 'pronto' || !chave) return undefined
    let vivo = true
    api.emailStatus(chave).then((r) => { if (vivo) setEmail(situacaoEmail(r)) })
    return () => { vivo = false }
  }, [estado, chave, leitura, api, comEmail])

  // Pede ao navegador para NÃO apagar o mapa deste aparelho quando faltar espaço (Chrome/Android concedem a sites usados; o Safari decide sozinho).
  React.useEffect(() => { if (chave) { try { navigator.storage?.persist?.()?.catch?.(() => {}) } catch { /* sem a API */ } } }, [chave])
  const atualizar = React.useCallback(() => setLeitura((n) => n + 1), [])
  // Voltou à aba (carimbou ou avaliou em outra, ou o celular dormiu): relê o mapa, no máximo uma vez a cada 30 s. Sem relógio: só no retorno.
  const ultimaVolta = React.useRef(0)
  React.useEffect(() => {
    if (!chave) return undefined
    const voltou = () => {
      if (document.visibilityState !== 'visible' || Date.now() - ultimaVolta.current < 30_000) return
      ultimaVolta.current = Date.now()
      atualizar()
    }
    document.addEventListener('visibilitychange', voltou)
    window.addEventListener('online', voltou)
    return () => { document.removeEventListener('visibilitychange', voltou); window.removeEventListener('online', voltou) }
  }, [chave, atualizar])
  const entrar = React.useCallback((nova, { criado = false } = {}) => {
    if (!C.chaveValida(nova)) return false
    C.gravarChave(EDICAO.codigo, nova)
    C.apagarQuarentena(EDICAO.codigo) // chave nova (criada ou recuperada): a que estava na quarentena não serve mais
    duvidas.current = 0
    setPerdeu(false); setRecemCriado(criado)
    // Mesma chave: o efeito de leitura não roda sozinho (a dependência não mudou), então manda reler em vez de ficar em "carregando".
    if (nova === atual.current) { setEstado((e) => (e === 'pronto' ? e : 'carregando')); setLeitura((n) => n + 1); return true }
    anterior.current = atual.current
    setMapa(null); setEmail('desconhecido'); setEstado('carregando'); setChave(nova)
    return true
  }, [])
  const sair = React.useCallback(() => {
    C.apagarChave(EDICAO.codigo); C.apagarQuarentena(EDICAO.codigo); C.apagarPerfil(EDICAO.codigo) // a pessoa decidiu sair: nada fica para voltar sozinho
    anterior.current = null; duvidas.current = 0
    setChave(null); setMapa(null); setEmail('desconhecido'); setRecemCriado(false); setEstado('sem-mapa')
  }, [])
  const apagar = React.useCallback(async () => {
    if (chave) {
      const r = await api.mapaApagar(chave)
      // Sem confirmação do banco a chave fica: é a única forma de tentar de novo. Mapa que o banco já não conhece conta como apagado.
      if (!r.ok && r.motivo !== 'mapa_desconhecido') return false
    }
    sair()
    return true
  }, [chave, api, sair])

  const resumo = React.useMemo(() => resumoProgresso(mapa), [mapa])
  const proxima = React.useMemo(() => proximaAcao(mapa), [mapa])
  const perfil = React.useMemo(() => C.lerPerfil(EDICAO.codigo), [mapa, chave])

  return { chave, mapa, estado, email, perdeu, recemCriado, perfil, resumo, proxima, atualizar, entrar, sair, apagar, api }
}
