/*
 * Rota colaborativa do grupo (spec 15 §8): lista de PLANEJAMENTO. Todos os integrantes adicionam, reordenam e tiram casas;
 * a lista mostra quem adicionou; nada aqui marca visita nem cria carimbo. Reordenar é por botões Subir/Descer (teclado e
 * leitor de tela); arrastar não é necessário.
 * Cada operação manda a `rota_versao` que a tela viu. Se alguém mexeu antes (`conflito`), o servidor não altera nada e
 * devolve a rota atual: mostramos ela e pedimos para repetir. Uma operação por vez (botões desligados enquanto espera).
 */
import React from 'react'
import { casasParaAdicionar, itensDaRota, nomeParaRota, posicaoDoPasso, conjuntoColetivo, quemAdicionou, semAcesso } from './regras.js'
import { GRUPOS, mensagemDoMotivoGrupo } from './textos.js'

const T = GRUPOS.rota

export function RotaDoGrupo ({ grupo, grupoId, caca, dados, aplicar, ler, perdeuAcesso }) {
  const [ocupado, setOcupado] = React.useState(false)
  const [aviso, setAviso] = React.useState(null) // { tipo: 'ok' | 'erro', texto }
  const [escolhida, setEscolhida] = React.useState('')
  const foco = React.useRef(null) // { slug, acao }: onde devolver o foco depois de reordenar
  const lista = React.useRef(null)

  const rota = Array.isArray(grupo.rota) ? grupo.rota : []
  const versao = Number.isFinite(Number(grupo.rota_versao)) ? Number(grupo.rota_versao) : null
  const nomeDe = (slug) => nomeParaRota(dados, slug)
  const itens = itensDaRota(rota, nomeDe)
  const coletivas = conjuntoColetivo(grupo)
  const disponiveis = casasParaAdicionar(dados?.participantes, rota)
  const euId = grupo.eu?.membro_id

  // Depois de mover, o botão que a pessoa apertou muda de lugar na lista: o foco acompanha a casa (ou o botão vizinho, na ponta).
  React.useEffect(() => {
    const f = foco.current
    if (!f || !lista.current) return
    foco.current = null
    const q = (acao) => lista.current.querySelector(`[data-rota="${f.slug}:${acao}"]:not(:disabled)`)
    const alvo = q(f.acao) || q(f.acao === 'subir' ? 'descer' : 'subir') || q('tirar')
    if (alvo) alvo.focus()
  }, [rota])

  async function rodar (fazer, anunciar, devolverFoco = null) {
    if (ocupado) return false
    setOcupado(true); setAviso(null)
    const r = await fazer(versao)
    setOcupado(false)
    if (r.ok || r.motivo === 'conflito') aplicar(r)
    if (r.ok) { foco.current = devolverFoco; setAviso({ tipo: 'ok', texto: anunciar(r) }); return true }
    if (r.motivo === 'conflito') setAviso({ tipo: 'erro', texto: T.anuncio.conflito })
    else if (semAcesso(r.motivo)) perdeuAcesso()
    else if (r.motivo === 'mapa_desconhecido') caca.atualizar()
    else {
      setAviso({ tipo: 'erro', texto: mensagemDoMotivoGrupo(r.motivo) })
      if (r.motivo === 'nao_esta_na_rota' || r.motivo === 'casa_desconhecida') ler({ silencioso: true })
    }
    return false
  }

  const { api, chave } = caca
  async function adicionar (e) {
    e.preventDefault()
    const slug = escolhida
    if (!slug) return
    const ok = await rodar((v) => api.grupoRotaAdicionar(chave, grupoId, slug, v),
      (r) => (r.mudou === false ? T.anuncio.jaEstava(nomeDe(slug)) : T.anuncio.adicionada(nomeDe(slug), r.rota.length)))
    if (ok) setEscolhida('')
  }
  const mover = (slug, indice, passo) => {
    const alvo = posicaoDoPasso(rota, indice, passo)
    if (alvo == null) return
    rodar((v) => api.grupoRotaMover(chave, grupoId, slug, alvo, v),
      (r) => (r.mudou === false ? T.anuncio.semMudanca(nomeDe(slug)) : T.anuncio.movida(nomeDe(slug), alvo)),
      { slug, acao: passo < 0 ? 'subir' : 'descer' })
  }
  const tirar = (slug) => rodar((v) => api.grupoRotaRemover(chave, grupoId, slug, v), () => T.anuncio.removida(nomeDe(slug)))

  return (
    <section className="ct-caca__bloco ct-grupos__rota" aria-labelledby="grupo-rota" aria-busy={ocupado}>
      <h2 id="grupo-rota" className="ct-sub">{T.titulo}</h2>
      <p className="ct-nota">{T.texto}</p>

      {itens.length === 0
        ? <p className="ct-nota ct-grupos__vazia">{T.vazia}</p>
        : (
          <ol className="ct-rota" ref={lista} aria-label={T.titulo}>
            {itens.map((it, i) => (
              <li key={it.slug} className="ct-rota__item">
                <span className="ct-rota__num" aria-hidden="true">{it.posicao}</span>
                <span className="ct-rota__texto">
                  <strong><span className="ct-sr">{T.posicao(it.posicao)}: </span>{it.nome}</strong>
                  <span className="ct-rota__meta">
                    {T.adicionadaPor(quemAdicionou(it, euId))}
                    {coletivas.has(it.slug) && <span className="ct-rota__marca"><span aria-hidden="true">✓ </span>{T.jaValidada}</span>}
                  </span>
                </span>
                <span className="ct-rota__botoes">
                  <button type="button" className="ct-rota__btn" data-rota={`${it.slug}:subir`} disabled={ocupado || i === 0} aria-label={T.subir(it.nome)} onClick={() => mover(it.slug, i, -1)}>
                    <span aria-hidden="true">↑</span> {T.subirRotulo}
                  </button>
                  <button type="button" className="ct-rota__btn" data-rota={`${it.slug}:descer`} disabled={ocupado || i === itens.length - 1} aria-label={T.descer(it.nome)} onClick={() => mover(it.slug, i, 1)}>
                    <span aria-hidden="true">↓</span> {T.descerRotulo}
                  </button>
                  <button type="button" className="ct-rota__btn" data-rota={`${it.slug}:tirar`} disabled={ocupado} aria-label={T.tirar(it.nome)} onClick={() => tirar(it.slug)}>
                    <span aria-hidden="true">×</span> {T.tirarRotulo}
                  </button>
                </span>
              </li>
            ))}
          </ol>
          )}

      <form className="ct-form ct-grupos__adicionar" onSubmit={adicionar} aria-label={T.adicionar}>
        {(dados?.participantes || []).length === 0
          ? <p className="ct-nota">{T.semLista}</p>
          : disponiveis.length === 0
            ? <p className="ct-nota">{T.semCasas}</p>
            : (
              <>
                <label className="ct-campo"><span>{T.adicionar}</span>
                  <select value={escolhida} onChange={(e) => setEscolhida(e.target.value)} disabled={ocupado}>
                    <option value="">{T.escolha}</option>
                    {disponiveis.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
                  </select>
                </label>
                <div className="ct-acoes"><button type="submit" className="ct-botao" disabled={ocupado || !escolhida}>{ocupado ? GRUPOS.ocupado : T.adicionarAcao}</button></div>
              </>
              )}
      </form>

      <p className="ct-sr" role="status" aria-live="polite">{aviso?.tipo === 'ok' ? aviso.texto : ''}</p>
      {aviso?.tipo === 'ok' && <p className="ct-nota ct-grupos__ok" aria-hidden="true">{aviso.texto}</p>}
      {aviso?.tipo === 'erro' && <p className="ct-aviso" role="alert">{aviso.texto}</p>}
    </section>
  )
}
