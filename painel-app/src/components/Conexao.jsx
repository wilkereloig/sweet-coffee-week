import React from 'react'

/*
 * Faixa de estado do app: sem conexão, e versão nova disponível.
 *
 * Offline: o painel depende do servidor para quase tudo, então não finge
 * funcionar — diz que está sem conexão e que as ações podem não ser enviadas.
 * O que já estava na tela continua visível.
 *
 * Versão nova: o service worker novo assume sozinho (skipWaiting), mas a aba
 * aberta continua com o JavaScript antigo até recarregar. A faixa oferece a
 * recarga em vez de recarregar no meio de um formulário.
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
