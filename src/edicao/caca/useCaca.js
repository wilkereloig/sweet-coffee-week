import React from 'react'
import { EDICAO } from '../config.js'
import * as C from '../rota/carimbo.js'
import { api as apiPadrao } from './api.js'
import { resumoProgresso, proximaAcao, situacaoEmail } from './regras.js'

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
  return C.lerChave(EDICAO.codigo)
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
 *   perdeu   true quando havia chave no aparelho e o banco não a reconhece mais (mapa recuperado em outro aparelho)
 *   perfil   { nome, email, whatsapp } digitados neste aparelho
 *   atualizar() relê o mapa · entrar(chave) guarda uma chave nova (criação/recuperação) · sair() esquece o mapa NESTE
 *   aparelho (o mapa continua no banco) · apagar() apaga o mapa no banco e no aparelho
 */
export function useCaca ({ api = apiPadrao, comEmail = true } = {}) {
  const [chave, setChave] = React.useState(chaveInicial)
  const [mapa, setMapa] = React.useState(null)
  const [estado, setEstado] = React.useState(chave ? 'carregando' : 'sem-mapa')
  const [email, setEmail] = React.useState('desconhecido')
  const [perdeu, setPerdeu] = React.useState(false)
  const [leitura, setLeitura] = React.useState(0)

  React.useEffect(() => {
    if (!chave) { setEstado('sem-mapa'); return undefined }
    let vivo = true
    api.mapaLer(chave).then((r) => {
      if (!vivo) return
      if (r.ok) {
        setMapa(r.mapa); setEstado('pronto'); setPerdeu(false)
        C.gravarPerfil(EDICAO.codigo, { nome: r.mapa?.apelido, email: r.mapa?.email, whatsapp: r.mapa?.whatsapp })
      } else if (r.motivo === 'mapa_desconhecido') {
        C.apagarChave(EDICAO.codigo); setChave(null); setMapa(null); setPerdeu(true); setEstado('sem-mapa')
      } else setEstado((e) => (e === 'pronto' ? e : 'falha')) // releitura que falha não derruba o mapa já mostrado
    })
    return () => { vivo = false }
  }, [chave, leitura, api])

  React.useEffect(() => {
    if (!comEmail || estado !== 'pronto' || !chave) return undefined
    let vivo = true
    api.emailStatus(chave).then((r) => { if (vivo) setEmail(situacaoEmail(r)) })
    return () => { vivo = false }
  }, [estado, chave, leitura, api, comEmail])

  const atualizar = React.useCallback(() => setLeitura((n) => n + 1), [])
  const entrar = React.useCallback((nova) => {
    if (!C.chaveValida(nova)) return false
    C.gravarChave(EDICAO.codigo, nova)
    setMapa(null); setEmail('desconhecido'); setPerdeu(false); setEstado('carregando'); setChave(nova)
    return true
  }, [])
  const sair = React.useCallback(() => {
    C.apagarChave(EDICAO.codigo); setChave(null); setMapa(null); setEmail('desconhecido'); setEstado('sem-mapa')
  }, [])
  const apagar = React.useCallback(async () => {
    if (chave) await api.mapaApagar(chave) // se o banco não responder, apaga do aparelho mesmo assim
    sair()
  }, [chave, api, sair])

  const resumo = React.useMemo(() => resumoProgresso(mapa), [mapa])
  const proxima = React.useMemo(() => proximaAcao(mapa), [mapa])
  const perfil = React.useMemo(() => C.lerPerfil(EDICAO.codigo), [mapa, chave])

  return { chave, mapa, estado, email, perdeu, perfil, resumo, proxima, atualizar, entrar, sair, apagar, api }
}
