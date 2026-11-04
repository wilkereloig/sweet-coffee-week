/*
 * Mapa da Doçura na Minha rota (docs/cartoon-2026-2/14 §14.3): o álbum das casas com os carimbos de verdade.
 * Logo desenhada em rascunho que ganha cor no primeiro carimbo, "×N" nas repetidas, "avalie e ganhe +2",
 * pontos, posição, guardar e apagar o mapa. O link pessoal (`#mapa=<chave>`) grava a chave e sai do endereço.
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { imagemPublica } from '../../dados/publico.js'
import { Link } from '../../componentes/base.jsx'
import * as C from '../../rota/carimbo.js'
import { GuardarMapa } from './Carimbo.jsx'

function chaveInicial () {
  const doLink = C.chaveDoHash(globalThis.location?.hash)
  if (doLink) {
    C.gravarChave(EDICAO.codigo, doLink)
    // A chave não fica no endereço: quem copiar a barra do navegador não leva o mapa junto.
    try { history.replaceState(history.state, '', location.pathname + location.search) } catch { /* sem history */ }
    return doLink
  }
  return C.lerChave(EDICAO.codigo)
}

export function AlbumCarimbos ({ dados, navigate }) {
  const [chave, setChave] = React.useState(chaveInicial)
  const [mapa, setMapa] = React.useState(null)
  const [estado, setEstado] = React.useState(chave ? 'carregando' : 'sem-mapa')

  React.useEffect(() => {
    if (!chave) { setEstado('sem-mapa'); return undefined }
    let vivo = true
    C.chamar('mapa_ler', { p_chave: chave })
      .then((m) => {
        if (!vivo) return
        if (!m) { C.apagarChave(EDICAO.codigo); setChave(null); return }
        setMapa(m); setEstado('pronto')
      })
      .catch(() => { if (vivo) setEstado('falha') })
    return () => { vivo = false }
  }, [chave])

  async function apagar () {
    if (!window.confirm('Apagar seu Mapa da Doçura? Os carimbos e os pontos somem e não voltam.')) return
    try { await C.chamar('mapa_apagar', { p_chave: chave }) } catch { /* apaga do aparelho mesmo assim */ }
    C.apagarChave(EDICAO.codigo); setMapa(null); setChave(null)
  }

  const C_ = EDICAO.caminho
  if (estado === 'sem-mapa') {
    return (
      <section className="ct-bloco ct-album" aria-labelledby="album-titulo">
        <h2 id="album-titulo" className="ct-h2">Mapa da Doçura</h2>
        <p className="ct-lead">Cada casa tem um QR no balcão. Leia com a câmera do celular e ganhe pontos para o sorteio de itens do festival. Seu mapa começa na primeira leitura.</p>
        <p className="ct-nota"><Link href={`${C_}/regulamento`} navigate={navigate}>Como funciona e regulamento</Link></p>
      </section>
    )
  }
  if (estado !== 'pronto') {
    return (
      <section className="ct-bloco ct-album" aria-labelledby="album-titulo" aria-busy={estado === 'carregando'}>
        <h2 id="album-titulo" className="ct-h2">Mapa da Doçura</h2>
        <p className="ct-nota">{estado === 'falha' ? 'Não conseguimos abrir seu mapa agora. Seus carimbos estão guardados; tente de novo em instantes.' : 'Abrindo seu mapa…'}</p>
      </section>
    )
  }

  const album = C.estadoAlbum(dados?.participantes || [], mapa)
  return (
    <section className="ct-bloco ct-album" aria-labelledby="album-titulo">
      <h2 id="album-titulo" className="ct-h2">Mapa da Doçura de {mapa.apelido}</h2>
      <p className="ct-lead">
        <strong>{album.pontos} {album.pontos === 1 ? 'ponto' : 'pontos'}</strong> · {album.visitadas} de {album.total} casas carimbadas
        {album.posicao ? ` · ${album.posicao}º no ranking` : ''}
      </p>
      <ul className="ct-album__grade">
        {album.casas.map((c) => {
          const p = (dados?.participantes || []).find((x) => x.slug === c.slug)
          const par = p?.casa?.logo_desenhada
          const src = par ? (c.colorida ? par.cor : par.pb) : imagemPublica(p?.casa?.logo)
          return (
            <li key={c.slug} className={`ct-album__casa${c.colorida ? ' is-carimbada' : ''}`}>
              <Link href={`${C_}/participantes/${c.slug}`} navigate={navigate} className="ct-album__link">
                {src
                  ? <img className={`ct-album__logo${!par && !c.colorida ? ' ct-album__logo--cinza' : ''}`} src={src} alt="" loading="lazy" decoding="async" />
                  : <span className="ct-album__logo ct-album__logo--inicial" aria-hidden="true">{c.nome.charAt(0)}</span>}
                <span className="ct-album__nome">{c.nome}</span>
                <span className="ct-sr">{c.colorida ? `, ${c.carimbos} ${c.carimbos === 1 ? 'carimbo' : 'carimbos'}` : ', sem carimbo'}</span>
                {c.carimbos > 1 && <span className="ct-album__vezes" aria-hidden="true">×{c.carimbos}</span>}
              </Link>
              {c.podeAvaliar && (
                <button type="button" className="ct-album__avaliar" onClick={() => navigate(C.prepararAvaliacao({ caminho: C_, slug: c.slug, mapa }))}>
                  Avaliar e ganhar +2
                </button>
              )}
              {c.avaliou && <span className="ct-album__selo">Avaliada</span>}
            </li>
          )
        })}
      </ul>
      <GuardarMapa chave={chave} />
      <div className="ct-acoes">
        <Link href={`${C_}/regulamento`} navigate={navigate} className="ct-botao ct-botao--contorno">Regulamento</Link>
        <button type="button" className="ct-botao ct-botao--contorno" onClick={apagar}>Apagar meu mapa</button>
      </div>
    </section>
  )
}
