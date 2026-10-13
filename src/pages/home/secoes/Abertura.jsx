import React from 'react'
import { destaqueEdicao, destaqueValido } from '../../../data/destaqueEdicao'
import { proximaEdicao as PROX } from '../../../data/proximaEdicao'
import { festivalFacts as F } from '../../../data/festivalFacts'
import { fotoAte, fotosHome, heroPhotos, LARGURA_HEROI_MOBILE } from '../../../data/imageLibrary'
import { ABERTURA as T } from '../../../data/conteudo/home'
import { useCrossfade } from '../../../hooks/useCrossfade'
import { PausaFotos } from '../../../components/HeroFotos'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { Seta } from '../../../components/Seta'

/* ============================================================================
   01 Abertura — dois modos, uma decisão só: `destaqueValido()`.
   · sem destaque válido (o estado normal): abertura do FESTIVAL, permanente e
     completa — o que é, um caminho, e as fotos de pessoas da última edição;
   · com destaque válido: a edição assume a abertura (rótulo, título, texto,
     foto com legenda, ação) e o resto da Home segue igual, logo abaixo.
   Nunca decidir por `ativo` direto: um campo faltando abriria bloco vazio.
   A classe `.hm-abre` fica nos dois modos — scw-motion.css coreografa por ela.
   ========================================================================= */

const PESSOAS = heroPhotos('home')
const COMBOS = fotosHome('heroiCombos')

/* Mesmo corte do CSS da abertura (max-width: 999px usa a variante estreita). */
const ehDesktop = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
  window.matchMedia('(min-width: 1000px)').matches

const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const temTexto = (v) => typeof v === 'string' && v.trim().length > 0

/* O que a abertura permanente sabe dizer em três linhas. "Próxima edição" só
   aparece se proximaEdicao.js tiver o mês (campo null não aparece, A4). */
const FICHA = [
  [T.ficha.edicoes, `${F.editions.value}, desde ${F.firstYear}`],
  [T.ficha.marcas, `${F.brands.value} já participaram`],
  PROX.mes ? [T.ficha.proxima, PROX.periodo || maiuscula(PROX.mes)] : null,
].filter(Boolean)

export function Abertura({ ir, rolarPara, destaque = destaqueEdicao }) {
  return destaqueValido(destaque)
    ? <AberturaDestaque d={destaque} ir={ir} rolarPara={rolarPara} />
    : <AberturaFestival ir={ir} rolarPara={rolarPara} />
}

function AberturaFestival({ ir, rolarPara }) {
  const urlDe = React.useCallback(
    (i) => (PESSOAS[i] ? (ehDesktop() ? PESSOAS[i].src : fotoAte(PESSOAS[i].src, LARGURA_HEROI_MOBILE)) : null),
    [],
  )
  const { ativa, pedidas, reduzido, pausado, alternarPausa, temRotacao } = useCrossfade(PESSOAS.length, { urlDe })
  /* Sem movimento, uma camada só — e a página baixa uma foto de cada. */
  const n = reduzido ? 1 : PESSOAS.length
  const camada = (foto, i, url) => (
    <span
      key={foto.src}
      className={'hm-abre__foto' + (i === ativa ? ' is-ativa' : '')}
      style={{ ...url(foto, pedidas[i]), '--pos': foto.position }}
      role={i === ativa ? 'img' : undefined}
      aria-label={i === ativa ? foto.alt : undefined}
      aria-hidden={i === ativa ? undefined : 'true'}
    />
  )

  return (
    <section className="hm-abre" data-mo-fora aria-labelledby="hm-abre-titulo">
      <div className="hm-abre__texto">
        <p className="hm-abre__estado">{T.rotulo}</p>
        <h1 id="hm-abre-titulo" className="scw-h1 hm-abre__titulo">
          {T.titulo.antes}<em className="hm-abre__enfase">{T.titulo.destaque}</em>{T.titulo.depois}
        </h1>
        <p className="hm-abre__lead">{T.lead}</p>
        <div className="hm-acoes">
          <a className="scw-btn scw-btn--solido" href="/edicoes" onClick={ir('/edicoes')}>
            {T.acaoPrincipal} <Seta />
          </a>
          <a className="scw-btn scw-btn--contorno-claro" href="#festival" onClick={rolarPara('festival')}>
            {T.acaoSecundaria}
          </a>
        </div>
        <dl className="hm-abre__ficha">
          {FICHA.map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt>{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </div>

      <figure className={'hm-abre__fotos' + (temRotacao ? ' tem-pausa' : '')}>
        <div className="hm-abre__pessoas">
          {PESSOAS.slice(0, n).map((foto, i) => camada(foto, i, (f, pedida) => ({
            '--foto': pedida ? `url("${f.src}")` : undefined,
            '--foto-mobile': pedida ? `url("${fotoAte(f.src, LARGURA_HEROI_MOBILE)}")` : undefined,
          })))}
          {temRotacao && <PausaFotos pausado={pausado} alternar={alternarPausa} />}
        </div>
        <div className="hm-abre__combo">
          {COMBOS.slice(0, n).map((foto, i) => camada(foto, i, (f, pedida) => ({
            '--foto': pedida ? `url("${fotoAte(f.src, 480)}")` : undefined,
          })))}
        </div>
        <figcaption className="hm-abre__legenda">
          {T.legenda}{' · '}combo {COMBOS[ativa].legenda}
        </figcaption>
      </figure>
    </section>
  )
}

/* Composição pequena e explícita: mesma grade e mesmas classes da abertura,
   uma foto só (sem rotação, sem pausa), e o caminho para o resto da Home. */
function AberturaDestaque({ d, ir, rolarPara }) {
  const href = d.acao.href
  /* Rota do SPA navega sem recarregar; página estática (barra final, §10.4-b)
     e endereço externo seguem como link de navegador. */
  const interna = href.startsWith('/') && !href.endsWith('/')
  return (
    <section className="hm-abre hm-abre--destaque" data-mo-fora aria-labelledby="hm-abre-titulo">
      <div className="hm-abre__texto">
        {temTexto(d.rotulo) && <p className="hm-abre__estado">{d.rotulo}</p>}
        <h1 id="hm-abre-titulo" className="scw-h1 hm-abre__titulo">{d.titulo}</h1>
        <p className="hm-abre__lead">{d.texto}</p>
        <div className="hm-acoes">
          <a className="scw-btn scw-btn--solido" href={href} onClick={interna ? ir(href) : undefined}>
            {d.acao.rotulo} <Seta />
          </a>
          <a className="scw-btn scw-btn--contorno-claro" href="#festival" onClick={rolarPara('festival')}>
            {T.destaqueSecundaria}
          </a>
        </div>
      </div>

      <figure className="hm-abre__fotos">
        <div className="hm-abre__pessoas">
          <FotoAcervo foto={d.imagem} papel="cheia" prioridade className="hm-abre__img" />
        </div>
        <figcaption className="hm-abre__legenda">{d.legenda}</figcaption>
      </figure>
    </section>
  )
}

export default Abertura
