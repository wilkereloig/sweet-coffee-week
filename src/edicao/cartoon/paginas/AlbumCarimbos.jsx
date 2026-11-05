/*
 * Mapa da Doçura na Minha rota (docs/cartoon-2026-2/14 §14.3): o álbum das casas com os carimbos de verdade.
 * Logo desenhada em rascunho que ganha cor no primeiro carimbo, "×N" nas repetidas, "avaliar e validar" nas pendentes,
 * casas validadas, extras, posição, guardar e apagar o mapa (a leitura é a v2 da Caça: não há mais pontos). A chave e a leitura no banco moram em useMeuMapa (o link pessoal
 * `#mapa=<chave>` grava a chave e sai do endereço).
 */
import React from 'react'
import { EDICAO } from '../../config.js'
import { imagemPublica } from '../../dados/publico.js'
import { Link } from '../../componentes/base.jsx'
import * as C from '../../rota/carimbo.js'
import { GuardarMapa } from '../../caca/GuardarMapa.jsx'
import { CACA, CACA_CAMINHOS } from '../../caca/textos.js'

/** `meu`: o estado de useMeuMapa (rota/useMeuMapa.js), lido uma vez pela página e repartido com o Mundo. */
export function AlbumCarimbos ({ dados, navigate, meu }) {
  const { chave, mapa, estado } = meu
  const [naoApagou, setNaoApagou] = React.useState(false)
  async function apagar () {
    if (!window.confirm('Apagar este Mapa da Doçura? Os carimbos dele somem e não voltam. Se você tem outro mapa com o mesmo e-mail, o progresso desse continua valendo.')) return
    setNaoApagou(!(await meu.apagar()))
  }

  const C_ = EDICAO.caminho
  if (estado === 'sem-mapa') {
    return (
      <section className="ct-bloco ct-album" aria-labelledby="album-titulo">
        <h2 id="album-titulo" className="ct-h2">Mapa da Doçura</h2>
        <p className="ct-lead">Cada casa tem um QR no balcão. Leia com a câmera do celular, avalie o combo e valide casas diferentes na Caça aos Carimbos.</p>
        <div className="ct-acoes"><Link href={CACA_CAMINHOS.central} navigate={navigate} className="ct-botao">{CACA.criar.titulo}</Link></div>
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
        <strong>{CACA.progresso.casas(album.visitadas, album.total)}</strong> validadas
        {album.extras > 0 ? ` · ${CACA.progresso.extras(album.extras)}` : ''}
        {album.posicao ? ` · ${CACA.progresso.posicao(album.posicao)}` : ''}
      </p>
      {album.pendentes > 0 && (
        <p className="ct-nota">
          {album.pendentes === 1 ? '1 carimbo pendente' : `${album.pendentes} casas com carimbo pendente`}: avalie o combo para o carimbo valer.
        </p>
      )}
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
                  Avaliar e validar
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
      {naoApagou && <p className="ct-aviso" role="alert">Não deu para apagar agora e o seu mapa continua guardado. Tente de novo em instantes.</p>}
    </section>
  )
}
