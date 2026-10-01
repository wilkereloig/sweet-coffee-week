import React from 'react'
import { avisoSuportado, assinaturaDoAparelho } from '../lib/push'
import { estadoAtual, ouvirInstalacao, pedirInstalacao, conviteDispensado, dispensarConvite } from '../lib/instalar'
import { AvisosAparelho } from './AvisosAparelho'
import { rpc } from '../lib/rpc'
import { CHAVE_SESSAO } from '../../../src/lib/adminAccess'

/*
 * O painel como app neste aparelho: instalar e ligar avisos. Duas peças:
 *   <InstalarApp> — o estado da instalação e a ação certa para ele;
 *   <ConviteApp>  — o convite de contexto (Início da marca, Visão geral da
 *                   organização), com "Agora não" lembrado por aparelho.
 * Os avisos continuam no <AvisosAparelho> de sempre: aqui não há segunda
 * implementação de push. Reabrir depois de dispensar: Ajuda rápida (as duas
 * pontas) e Conta (marca).
 */
// Avisos da organização: por RPC (a senha compartilhada ou a sessão nominal).
const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''
export const PUSH_ORGANIZACAO = {
  registrar: (a) => rpc('registrar_push_organizacao', { p_secret: lerSenha(), p_endpoint: a.endpoint, p_p256dh: a.p256dh, p_auth: a.auth, p_user_agent: a.userAgent }),
  remover: (endpoint) => rpc('remover_push_organizacao', { p_secret: lerSenha(), p_endpoint: endpoint }),
}

const BENEFICIO = 'Abre direto no painel, em tela cheia, e recebe avisos mesmo com ele fechado.'

function useInstalacao() {
  const [estado, setEstado] = React.useState(estadoAtual)
  React.useEffect(() => ouvirInstalacao(() => setEstado(estadoAtual())), [])
  return estado
}

export function InstalarApp({ compacto = false }) {
  const estado = useInstalacao()
  const [aviso, setAviso] = React.useState(null)

  async function instalar() {
    setAviso(null)
    const aceitou = await pedirInstalacao()
    setAviso(aceitou ? 'Instalando. O ícone do Painel SCW aparece na tela inicial.' : 'Instalação cancelada. Dá para instalar depois pela Ajuda.')
  }

  if (estado === 'instalado') {
    if (compacto) return null
    return (
      <p className="ui-estado-linha">
        <span className="ui-ponto" data-tom="ok" aria-hidden="true" />
        <b>Aberto como app neste aparelho</b>
      </p>
    )
  }
  return (
    <div className="ui-instalar">
      {!compacto && <p className="ui-nota">{BENEFICIO}</p>}
      {estado === 'pronto' && <button className="og-btn og-btn--mini" type="button" onClick={instalar}>Instalar o painel</button>}
      {estado === 'ios' && (
        <p className="ui-nota">No iPhone e no iPad: no Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. Abra o painel pelo ícone novo. Só assim os avisos funcionam no iPhone.</p>
      )}
      {estado === 'manual' && !compacto && (
        <p className="ui-nota">Este navegador não oferece a instalação aqui. Procure <b>Instalar app</b> ou <b>Adicionar à tela inicial</b> no menu dele. O painel também funciona direto pelo navegador.</p>
      )}
      {aviso && <p className="ui-nota" role="status">{aviso}</p>}
    </div>
  )
}

/**
 * Convite de contexto: só aparece se falta algo (instalar ou ligar avisos) e
 * a pessoa não dispensou neste aparelho. Nunca pede permissão sozinho.
 */
export function ConviteApp({ papel, registrar, remover, conferir }) {
  const instalacao = useInstalacao()
  const [fora, setFora] = React.useState(() => conviteDispensado(papel))
  const [ligado, setLigado] = React.useState(null) // null = conferindo
  const conferirRef = React.useRef(conferir)
  conferirRef.current = conferir

  React.useEffect(() => {
    if (!avisoSuportado()) { setLigado(false); return }
    let vivo = true
    assinaturaDoAparelho().then(async (a) => {
      const minha = !!a && (!conferirRef.current || await conferirRef.current(a.endpoint).catch(() => true))
      if (vivo) setLigado(minha)
    })
    return () => { vivo = false }
  }, [])

  const faltaInstalar = instalacao === 'pronto' || instalacao === 'ios'
  const faltaAvisos = avisoSuportado() && ligado === false && Notification.permission !== 'denied'
  if (fora || ligado === null || (!faltaInstalar && !faltaAvisos)) return null

  return (
    <div className="ui-convite ui-convite--app" role="region" aria-label="Painel como app">
      <p><b>Use o painel como app.</b> {BENEFICIO}</p>
      {faltaInstalar && <InstalarApp compacto />}
      {faltaAvisos && (
        <AvisosAparelho compacto registrar={registrar} remover={remover} conferir={conferir}
          explicacao="Ligue os avisos neste aparelho para saber na hora quando houver novidade."
          onMudou={(on) => setLigado(on)} />
      )}
      <button className="ui-link" type="button" onClick={() => { dispensarConvite(papel); setFora(true) }}>Agora não</button>
    </div>
  )
}
