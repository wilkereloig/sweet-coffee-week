import React from 'react'
import { entradaDoHtml, entradaAtual, podeRecarregarSozinho } from '../lib/versao'

const OLHAR_A_CADA = 10 * 60 * 1000
const CHAVE_RECARGA = 'scw_painel_recarregou'

// O HTML publicado agora. O `?v=` foge do cache do service worker, que guarda
// `/painel/` como reserva de rede caída e devolveria a versão antiga.
async function entradaPublicada() {
  const r = await fetch('/painel/?v=' + Date.now(), { cache: 'no-store', credentials: 'same-origin' })
  return r.ok ? entradaDoHtml(await r.text()) : null
}

/*
 * Faixa de estado do app: sem conexão, e versão nova disponível.
 *
 * Offline: o painel depende do servidor para quase tudo, então não finge
 * funcionar — diz que está sem conexão e que as ações podem não ser enviadas.
 * O que já estava na tela continua visível.
 *
 * Versão nova: duas fontes. (1) O service worker novo assume sozinho
 * (skipWaiting) — mas o sw.js quase nunca muda entre publicações. (2) Por isso
 * o painel também compara o próprio arquivo de entrada com o do HTML
 * publicado (lib/versao.js): o app instalado no celular fica dias vivo em
 * segundo plano e, sem isso, seguia na versão antiga sem aviso (02/10/2026).
 * Voltando ao app sem nada pela metade, recarrega sozinho; senão, a faixa
 * oferece a recarga em vez de recarregar no meio de um formulário.
 */
export function Conexao() {
  const [online, setOnline] = React.useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [versaoNova, setVersaoNova] = React.useState(false)

  React.useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    let sw = null
    if ('serviceWorker' in navigator) {
      sw = navigator.serviceWorker
      // Só avisa se JÁ havia um SW controlando: na primeira instalação o
      // controllerchange também dispara, e não há versão "nova" nenhuma.
      const havia = !!sw.controller
      const trocou = () => { if (havia) setVersaoNova(true) }
      sw.addEventListener('controllerchange', trocou)
      // Procura versão nova ao voltar para o app (celular: app instalado
      // fica dias aberto em segundo plano).
      const olhar = () => {
        if (document.visibilityState === 'visible') sw.getRegistration('/painel/').then((r) => r && r.update()).catch(() => {})
      }
      document.addEventListener('visibilitychange', olhar)
      return () => {
        window.removeEventListener('online', on)
        window.removeEventListener('offline', off)
        sw.removeEventListener('controllerchange', trocou)
        document.removeEventListener('visibilitychange', olhar)
      }
    }
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  /* Versão nova pela publicação, não pelo service worker: compara o arquivo
     de entrada desta aba com o do HTML publicado — ao abrir, ao voltar para
     o app e a cada 10 min com ele na frente. Voltando de segundo plano sem
     nada pela metade na tela, recarrega sozinho (uma vez por versão, para
     nunca entrar em laço); senão, mostra a faixa. */
  React.useEffect(() => {
    const atual = entradaAtual(document)
    if (!atual) return undefined
    let vivo = true
    async function conferir(voltouAgora) {
      if (!navigator.onLine || document.visibilityState !== 'visible') return
      let publicada = null
      try { publicada = await entradaPublicada() } catch { return }
      if (!vivo || !publicada || publicada === atual) return
      let jaTentou = false
      try { jaTentou = sessionStorage.getItem(CHAVE_RECARGA) === publicada } catch { /* aba privada */ }
      if (voltouAgora && !jaTentou && podeRecarregarSozinho(document)) {
        try { sessionStorage.setItem(CHAVE_RECARGA, publicada) } catch { /* segue */ }
        window.location.reload()
        return
      }
      setVersaoNova(true)
    }
    const aoVoltar = () => { if (document.visibilityState === 'visible') conferir(true) }
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('pageshow', aoVoltar)
    const inicio = window.setTimeout(() => conferir(false), 4000)
    const relogio = window.setInterval(() => conferir(false), OLHAR_A_CADA)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('pageshow', aoVoltar)
      window.clearTimeout(inicio)
      window.clearInterval(relogio)
    }
  }, [])

  if (online && !versaoNova) return null
  return (
    <div className="ui-conexao" role="status" data-tom={online ? 'versao' : 'offline'}>
      {!online
        ? <span>Sem conexão. O que está na tela continua aqui, mas nada é enviado nem atualizado até a internet voltar.</span>
        : (
          <>
            <span>Há uma versão nova do painel.</span>
            <button type="button" className="ui-conexao__btn" onClick={() => window.location.reload()}>Atualizar agora</button>
          </>
        )}
    </div>
  )
}
