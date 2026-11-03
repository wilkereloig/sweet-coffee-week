/*
 * Galeria de um assunto (o item do combo, as fotos da casa) — lista 13, P3.
 * Carrossel com rolagem nativa (arrastar no toque, Shift+roda no mouse), setas e pontos para quem não arrasta,
 * e a foto ampliada num <dialog> com anterior/próxima e as setas do teclado. Uma foto só: sem carrossel, só a
 * ampliação. `fotos`: [{ path, alt, largura, altura, rotulo? }] — `rotulo` ("Detalhe", "Outra opção") vira a
 * legenda curta da foto da vez.
 */
import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon.jsx'
import { Foto, proporcaoDe } from '../base.jsx'

export function Galeria ({ fotos, nome, proporcao = '4 / 5', prioridade = false, reserva }) {
  const lista = (fotos || []).filter(Boolean)
  const trilho = React.useRef(null)
  const caixa = React.useRef(null)
  const [atual, setAtual] = React.useState(0)
  const [ampliada, setAmpliada] = React.useState(0)

  // A foto da vez é a mais perto do início do trilho (a rolagem é do navegador; aqui só se lê onde parou).
  const aoRolar = () => {
    const t = trilho.current
    if (t) setAtual(Math.min(lista.length - 1, Math.max(0, Math.round(t.scrollLeft / t.clientWidth))))
  }
  const irPara = (n) => {
    const t = trilho.current
    if (t) t.scrollTo({ left: n * t.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const abrir = (n) => { setAmpliada(n); caixa.current?.showModal() }
  const teclas = (e) => {
    if (e.key === 'ArrowRight') setAmpliada((n) => Math.min(lista.length - 1, n + 1))
    if (e.key === 'ArrowLeft') setAmpliada((n) => Math.max(0, n - 1))
  }

  if (!lista.length) return <Foto foto={null} proporcao={proporcao} reserva={reserva} />
  const varias = lista.length > 1
  const legenda = lista[atual]?.rotulo

  return (
    <div className={`ct-galeria-item${varias ? ' ct-galeria-item--varias' : ''}`} role="group" aria-roledescription="galeria" aria-label={nome ? `Fotos: ${nome}` : 'Fotos'}>
      <div className="ct-galeria-item__palco">
        <ul ref={trilho} className="ct-galeria-item__trilho" onScroll={varias ? aoRolar : undefined} tabIndex={varias ? 0 : undefined}
          aria-label={varias ? 'Arraste para ver as outras fotos' : undefined}>
          {lista.map((f, n) => (
            <li key={f.path || n} className="ct-galeria-item__slide" aria-hidden={varias && n !== atual ? 'true' : undefined}>
              <button type="button" className="ct-galeria-item__ampliar" onClick={() => abrir(n)} tabIndex={varias && n !== atual ? -1 : 0}
                aria-label={`Ampliar a foto ${n + 1} de ${lista.length}${f.rotulo ? ` (${f.rotulo})` : ''}`}>
                <Foto foto={f} proporcao={proporcao} prioridade={prioridade && n === 0} />
                <span className="ct-galeria-item__lupa" aria-hidden="true"><ScwIcon nome="ampliar" tamanho={20} /></span>
              </button>
            </li>
          ))}
        </ul>
        {varias && (
          <>
            <button type="button" className="ct-galeria-item__seta ct-galeria-item__seta--antes" onClick={() => irPara(atual - 1)} disabled={atual === 0} aria-label="Foto anterior">
              <ScwIcon nome="seta-esquerda" tamanho={20} />
            </button>
            <button type="button" className="ct-galeria-item__seta ct-galeria-item__seta--depois" onClick={() => irPara(atual + 1)} disabled={atual === lista.length - 1} aria-label="Próxima foto">
              <ScwIcon nome="seta-direita" tamanho={20} />
            </button>
          </>
        )}
      </div>
      {varias && (
        <div className="ct-galeria-item__pe">
          <p className="ct-galeria-item__legenda" aria-live="polite">
            <span>{atual + 1}/{lista.length}</span>{legenda && <strong>{legenda}</strong>}
          </p>
          <ul className="ct-galeria-item__pontos">
            {lista.map((f, n) => (
              <li key={f.path || n}>
                <button type="button" className="ct-galeria-item__ponto" onClick={() => irPara(n)} aria-current={n === atual ? 'true' : undefined}
                  aria-label={`Foto ${n + 1}${f.rotulo ? `: ${f.rotulo}` : ''}`} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <dialog ref={caixa} className="ct-galeria" aria-label={nome ? `Fotos: ${nome}` : 'Fotos'} onKeyDown={teclas}
        onClick={(e) => { if (e.target === caixa.current) caixa.current.close() }}>
        <Foto foto={lista[ampliada]} proporcao={proporcaoDe(lista[ampliada], '4 / 5')} />
        <div className="ct-acoes">
          {varias && <button type="button" className="ct-botao ct-botao--contorno" disabled={ampliada === 0} onClick={() => setAmpliada(ampliada - 1)}>Anterior</button>}
          {varias && <span aria-live="polite">{ampliada + 1} de {lista.length}{lista[ampliada]?.rotulo ? ` · ${lista[ampliada].rotulo}` : ''}</span>}
          {varias && <button type="button" className="ct-botao ct-botao--contorno" disabled={ampliada === lista.length - 1} onClick={() => setAmpliada(ampliada + 1)}>Próxima</button>}
          <button type="button" className="ct-botao" onClick={() => caixa.current.close()}>Fechar</button>
        </div>
      </dialog>
    </div>
  )
}
