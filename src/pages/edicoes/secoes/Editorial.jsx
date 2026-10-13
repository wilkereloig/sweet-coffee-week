import React from 'react'

/*
 * TEXTO EDITORIAL — a mesma peça no painel do desktop e na sanfona do celular.
 * Ordem de leitura: história do festival (só na primeira cena), marco,
 * curiosidade, legado e os achados curtos do acervo. O <h1> da página é o tema
 * da edição; aqui os rótulos são <h2>.
 */
function Bloco({ rotulo, children }) {
  return (
    <section className="scw-edx__bloco">
      <h2 className="scw-edx__bloco-rot">{rotulo}</h2>
      {children}
    </section>
  )
}

export function Editorial({ id, classe = '', narrativa, abertura, curiosidades }) {
  return (
    // data-teclas-proprias: texto para ler — nem as setas nem o arraste aqui
    // dentro trocam de edição (selecionar uma frase não pode virar a cena).
    <div id={id} className={`scw-edx__editorial${classe ? ` ${classe}` : ''}`} data-teclas-proprias="">
      {abertura && (
        <Bloco rotulo="A história do festival">
          <p className="scw-edx__bloco-lede">{abertura.titulo}</p>
          {abertura.paragrafos.map((p) => <p key={p.slice(0, 32)} className="scw-edx__bloco-txt">{p}</p>)}
        </Bloco>
      )}
      {narrativa.marco && (
        <Bloco rotulo="Por que essa edição marcou a história"><p className="scw-edx__bloco-txt">{narrativa.marco}</p></Bloco>
      )}
      {narrativa.curiosidade && (
        <Bloco rotulo="Um destaque da edição"><p className="scw-edx__bloco-txt">{narrativa.curiosidade}</p></Bloco>
      )}
      {narrativa.legado && (
        <Bloco rotulo="O que ficou"><p className="scw-edx__bloco-txt">{narrativa.legado}</p></Bloco>
      )}
      {curiosidades.length > 0 && (
        <Bloco rotulo={`Curiosidades · ${curiosidades.length}`}>
          <ul className="scw-edx__curios">
            {curiosidades.map((c) => (
              <li key={c.t}>
                <b>{c.t}</b>
                <span className="scw-edx__curios-x">{c.x}</span>
                {c.v ? <span className="scw-edx__curios-v">{c.v}</span> : null}
              </li>
            ))}
          </ul>
        </Bloco>
      )}
    </div>
  )
}
