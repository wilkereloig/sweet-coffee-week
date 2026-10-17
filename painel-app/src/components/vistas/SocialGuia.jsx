import React from 'react'
import { Botao } from '../ui'
import { passosDoGuia, quemAprova } from '../../lib/socialGuia'

/*
 * Guia passo a passo do Social media (18/10/2026, pedido do Wilker): fica no
 * alto do Planejamento e diz, em seis passos, o caminho de uma postagem —
 * de planejar a confirmar. Recolhido, vira um botão "Como funciona". Aberto ou
 * recolhido é preferência deste aparelho (localStorage; sem ele, abre).
 */
const CHAVE = 'scw_social_guia_recolhido'

function lerRecolhido() { try { return localStorage.getItem(CHAVE) === '1' } catch { return false } }
function gravarRecolhido(v) { try { if (v) localStorage.setItem(CHAVE, '1'); else localStorage.removeItem(CHAVE) } catch { /* modo privado */ } }

export function SocialGuia({ aprovadores = [], aprova = false, podeCriar = false, temPosts = false, onNova }) {
  // Abre sozinho só enquanto não há postagem (quem já usa vê o calendário primeiro); "Como funciona" reabre.
  const [recolhido, setRecolhido] = React.useState(() => lerRecolhido() || temPosts)
  const passos = passosDoGuia({ aprovador: quemAprova(aprovadores), aprova })
  // O botão clicado sai da tela ao alternar: o foco vai para o botão que entra no lugar.
  const foco = React.useRef(false)
  const alvo = React.useRef(null)
  React.useEffect(() => { if (foco.current && alvo.current) { const b = alvo.current.querySelector('button'); if (b) b.focus(); foco.current = false } }, [recolhido])
  const alternar = (v) => { foco.current = true; setRecolhido(v); gravarRecolhido(v) }

  if (recolhido) {
    return (
      <div className="sg-recolhido" ref={alvo}>
        <Botao variante="secundario" icone="informacao" aria-expanded={false} onClick={() => alternar(false)}>Como funciona: passo a passo</Botao>
      </div>
    )
  }
  return (
    <section className="sg" aria-labelledby="sg-titulo">
      <header className="sg__cabeca" ref={alvo}>
        <h2 id="sg-titulo">Como funciona, passo a passo</h2>
        <Botao variante="secundario" icone="recolher" aria-expanded onClick={() => alternar(true)}>Esconder o guia</Botao>
      </header>
      <ol className="sg__passos">
        {passos.map((p, i) => (
          <li key={p.titulo} className="sg__passo">
            <span className="sg__num" aria-hidden="true">{i + 1}</span>
            <span className="sg__texto"><b>{p.titulo}</b> {p.texto}</span>
          </li>
        ))}
      </ol>
      {podeCriar && onNova && <div className="ui-acoes"><Botao icone="mais" variante="destaque" onClick={onNova}>Começar: nova postagem</Botao></div>}
    </section>
  )
}
