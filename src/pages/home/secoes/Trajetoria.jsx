import React from 'react'
import { festivalFacts as F } from '../../../data/festivalFacts'
import { fotosHome } from '../../../data/imageLibrary'
import { IMPRENSA, TRAJETORIA as T } from '../../../data/conteudo/home'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { Rotulo } from '../../../components/Rotulo'
import { Seta } from '../../../components/Seta'
import { TituloDestaque } from '../TituloDestaque'
import { useContagem } from '../useHome'

/* ============================================================================
   04 Trajetória — dez anos em números (cada um com o que mede e quando foi
   apurado), a porta para Edições (cor do DESTINO, §6.2) e a imprensa.
   ========================================================================= */

/* Número só com o que ele mede (festivalFacts.*.mede) — nunca solto. */
const NUMEROS = T.numeros.map((n) => ({ ...n, alvo: F[n.fato].value, mede: F[n.fato].mede, apurado: F[n.fato].apurado }))
const ALVOS = NUMEROS.map((n) => n.alvo)
/* Os números comerciais não se derivam da base: dizem quando foram apurados. */
const APURADOS = [...new Set(NUMEROS.map((n) => n.apurado).filter(Boolean))]
const COMERCIAIS = NUMEROS.filter((n) => n.apurado).map((n) => n.titulo.toLowerCase())
const juntar = (lista) => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}` : lista[0])

export function Trajetoria({ ir }) {
  const faixaRef = React.useRef(null)
  const contagens = useContagem(ALVOS, faixaRef)
  const [verTudo, setVerTudo] = React.useState(false)
  const destaque = IMPRENSA[0]
  const materias = verTudo ? IMPRENSA.slice(1) : IMPRENSA.slice(1, 5)
  const E = T.edicoes

  return (
    <section className="scw-secao scw-secao--bege hm-trajetoria" aria-labelledby="hm-trajetoria-titulo">
      <div className="hm-cab">
        <div>
          <Rotulo icone="topicos/legado">{T.rotulo}</Rotulo>
          <h2 id="hm-trajetoria-titulo" className="scw-h2">
            <TituloDestaque t={T.titulo} />
          </h2>
        </div>
        <p className="hm-apoio">
          {F.editions.value} edições e {F.brands.value} marcas desde {F.firstYear}. Os temas, as casas e as fotos de cada ano estão no acervo.
        </p>
      </div>

      <ul className="hm-numeros" ref={faixaRef}>
        {NUMEROS.map((n, i) => (
          <li className="hm-numero" key={n.fato}>
            <span className="hm-numero__cabeca">
              <ScwIcon nome={n.icone} tamanho={24} />
              <b>{n.titulo}</b>
            </span>
            <strong className="scw-numeral hm-numero__valor">
              {n.antes}{contagens[i].toLocaleString('pt-BR')}{n.depois}
            </strong>
            <p className="hm-numero__texto">{n.mede}.</p>
          </li>
        ))}
      </ul>
      {APURADOS.length === 1 && (
        <p className="hm-numeros__nota">
          {juntar(COMERCIAIS).replace(/^./, (c) => c.toUpperCase())}: apurados em {APURADOS[0]}.
        </p>
      )}

      <a className="hm-destino hm-destino--edicoes" href="/edicoes" onClick={ir('/edicoes')}>
        <span className="hm-destino__fotos">
          {fotosHome('edicoes').map((foto) => (
            <span className="hm-destino__capa" key={foto.src}>
              <FotoAcervo foto={foto} papel="miniatura" />
              <b>{foto.ano}</b>
            </span>
          ))}
        </span>
        <span className="hm-destino__corpo">
          <span className="hm-destino__eixo">{E.eixo}</span>
          <strong className="hm-destino__titulo">{E.titulo}</strong>
          <span className="hm-destino__texto">{E.texto}</span>
          <span className="hm-destino__cta">{E.cta} <Seta size={16} /></span>
        </span>
      </a>

      <div className="hm-imprensa">
        <div className="hm-imprensa__cab">
          <Rotulo icone="topicos/imprensa">{T.imprensa.rotulo}</Rotulo>
          <a className="hm-materia" href={destaque.href} target="_blank" rel="noopener noreferrer">
            <span className="hm-materia__veiculo">{destaque.veiculo} · {destaque.ano}</span>
            <strong className="hm-materia__titulo">{destaque.titulo}</strong>
          </a>
        </div>
        <div>
          <div id="hm-materias" data-mo-bloco>
            {materias.map((item) => (
              <a className="hm-linha" href={item.href} key={item.href} target="_blank" rel="noopener noreferrer">
                <span>
                  <span className="hm-linha__veiculo">{item.veiculo}</span>
                  <span className="hm-linha__titulo">{item.titulo}</span>
                </span>
                <span className="hm-linha__ano">{item.ano}</span>
              </a>
            ))}
          </div>
          <button
            type="button"
            className="hm-imprensa__toggle"
            aria-controls="hm-materias"
            aria-expanded={verTudo}
            onClick={() => setVerTudo((v) => !v)}
          >
            {verTudo ? T.imprensa.verMenos : T.imprensa.verTodas(IMPRENSA.length)} <Seta size={16} />
          </button>
        </div>
      </div>
    </section>
  )
}

export default Trajetoria
