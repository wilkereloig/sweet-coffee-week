/*
 * Tela de convite (/cartoon/caca/convite/<token>, spec 15 §8). A pré-visualização é anônima e mostra só o nome do grupo e
 * quantos são. Para entrar a pessoa precisa de mapa PRÓPRIO (sem ele, criamos ali mesmo e ela volta para este convite sem
 * sair da tela) e aceitar que apelido e progresso serão vistos pelos integrantes. Entrar não cria carimbo para ninguém.
 * O token vive só no caminho e na chamada ao banco: não vai para log, analytics nem storage.
 * Props do contrato das seções: `{ caca, navigate, dados, token }`. Sem <h1>. Esta seção não espera o mapa: trata `caca.estado`.
 */
import React from 'react'
import { Link, Carregando, Falha } from '../../componentes/base.jsx'
import { CriarMapa } from '../CriarMapa.jsx'
import { GuardarMapa } from '../GuardarMapa.jsx'
import { CACA, CACA_CAMINHOS, mensagemDoMotivo } from '../textos.js'
import { GRUPOS, mensagemDoMotivoGrupo } from '../grupos/textos.js'
import { AvisoVisibilidade } from '../grupos/AvisoVisibilidade.jsx'

const T = GRUPOS.convidado

function Invalido ({ motivo, navigate, tem }) {
  return (
    <div className="ct-caca__bloco" role="alert">
      <p className="ct-sub">{mensagemDoMotivo(motivo || 'convite_invalido')}</p>
      <p className="ct-nota">{T.invalido}</p>
      {tem && <div className="ct-acoes"><Link href={CACA_CAMINHOS.grupos} navigate={navigate} className="ct-botao ct-botao--contorno">{T.ver}</Link></div>}
    </div>
  )
}

function Entrar ({ caca, token, navigate, nomeDoGrupo }) {
  const [aceite, setAceite] = React.useState(false)
  const [erro, setErro] = React.useState({ aceite: '', geral: '' })
  const [enviando, setEnviando] = React.useState(false)

  async function entrar (e) {
    e.preventDefault()
    if (!aceite) { setErro({ aceite: GRUPOS.aviso.exigido, geral: '' }); return }
    setEnviando(true); setErro({ aceite: '', geral: '' })
    const r = await caca.api.grupoEntrar(caca.chave, token, true)
    setEnviando(false)
    if (r.ok) { navigate(CACA_CAMINHOS.grupo(r.grupo_id)); return }
    if (r.motivo === 'mapa_desconhecido') { caca.atualizar(); return }
    setErro({ aceite: '', geral: mensagemDoMotivoGrupo(r.motivo) })
  }

  return (
    <form className="ct-form ct-grupos__form" onSubmit={entrar} noValidate aria-label={`Entrar no grupo ${nomeDoGrupo}`}>
      {caca.mapa?.apelido && <p className="ct-nota">{T.voceVai(caca.mapa.apelido)}</p>}
      <AvisoVisibilidade marcado={aceite} aoMudar={(v) => { setAceite(v); setErro((x) => ({ ...x, aceite: '' })) }} erro={erro.aceite} id="convite" />
      {erro.geral && <p className="ct-aviso" role="alert">{erro.geral}</p>}
      <div className="ct-acoes">
        <button type="submit" className="ct-botao" disabled={enviando}>{enviando ? T.entrando : T.entrar}</button>
        <Link href={CACA_CAMINHOS.grupos} navigate={navigate} className="ct-botao ct-botao--contorno">{T.ver}</Link>
      </div>
    </form>
  )
}

export default function Convite ({ caca, navigate, token }) {
  const { api } = caca
  const [previa, setPrevia] = React.useState({ fase: 'carregando' })
  const [tentativa, setTentativa] = React.useState(0)
  const [recemCriado, setRecemCriado] = React.useState(false)

  React.useEffect(() => {
    let vivo = true
    setPrevia({ fase: 'carregando' })
    api.grupoConviteVer(token).then((r) => {
      if (!vivo) return
      setPrevia(r.ok ? { fase: 'pronto', ...r } : { fase: 'falha' })
    })
    return () => { vivo = false }
  }, [api, token, tentativa])

  if (previa.fase === 'carregando') return <Carregando texto={T.carregando} />
  if (previa.fase === 'falha') return <Falha titulo={T.falhaVer.titulo} texto={T.falhaVer.texto} tentar={() => setTentativa((n) => n + 1)} />
  if (!previa.valido) return <Invalido motivo={previa.motivo} navigate={navigate} tem={caca.estado === 'pronto'} />

  return (
    <div className="ct-caca__central ct-grupos__convidado">
      <section className="ct-caca__proxima" aria-labelledby="convite-grupo">
        <p className="ct-rotulo">{T.chamou}</p>
        <h2 id="convite-grupo" className="ct-h2 ct-grupos__nome">{previa.nome_do_grupo}</h2>
        <p className="ct-nota">{T.integrantes(previa.membros_qtd)}</p>
      </section>

      {caca.estado === 'carregando' && <Carregando texto={CACA.carregando} />}
      {caca.estado === 'falha' && <Falha titulo={CACA.falha.titulo} texto={CACA.falha.texto} tentar={caca.atualizar} />}
      {caca.estado === 'sem-mapa' && (
        <>
          {caca.perdeu && <p className="ct-aviso" role="status">{CACA.chaveTrocada}</p>}
          <p className="ct-lead">{T.precisaMapa}</p>
          <CriarMapa navigate={navigate} aoAbrir={(k, criado) => { if (caca.entrar(k)) setRecemCriado(criado) }} />
          <p className="ct-nota">{T.jaTenhoMapa}</p>
        </>
      )}
      {caca.estado === 'pronto' && (
        <>
          {recemCriado && <GuardarMapa chave={caca.chave} />}
          <Entrar caca={caca} token={token} navigate={navigate} nomeDoGrupo={previa.nome_do_grupo} />
        </>
      )}
    </div>
  )
}
