import React from 'react'
import { Botao } from '../ui'
import { Folha } from '../Folha'
import { passosDoGuia, quemAprova, etapasResumo } from '../../lib/socialGuia'

/*
 * Guia do Social media (18/10/2026; reorganizado 17/10/2026 para não empurrar
 * o calendário). Duas peças:
 *  - GuiaPrimeiraVez: UMA linha de orientação na primeira visita deste
 *    aparelho, com "Entendi" (localStorage, só preferência — sem ele, aparece
 *    de novo, nada quebra). O passo a passo NÃO tem botão aqui (23/10/2026):
 *    é o mesmo "Como funciona" logo abaixo, e dois botões para a mesma folha confundiam.
 *  - SocialGuia: os seis passos completos numa folha, aberta pelo "Como
 *    funciona" da linha do período. Não ocupa a tela de ninguém que não pediu.
 */
const CHAVE = 'scw_social_guia_visto'
const CHAVE_ANTIGA = 'scw_social_guia_recolhido' // quem já tinha escondido o guia antigo não vê a orientação de novo

function jaViu() { try { return localStorage.getItem(CHAVE) === '1' || localStorage.getItem(CHAVE_ANTIGA) === '1' } catch { return false } }
function marcarVisto() { try { localStorage.setItem(CHAVE, '1') } catch { /* modo privado */ } }

export function GuiaPrimeiraVez({ aprovadores = [], aprova = false }) {
  const [visivel, setVisivel] = React.useState(() => !jaViu())
  if (!visivel) return null
  const fechar = () => { marcarVisto(); setVisivel(false) }
  return (
    <aside className="sg-inicio" aria-label="Primeira vez no Planejamento">
      <p className="sg-inicio__texto">
        <b>Como uma postagem anda:</b> {etapasResumo({ aprovador: quemAprova(aprovadores), aprova })}
      </p>
      <Botao variante="secundario" onClick={fechar}>Entendi</Botao>
    </aside>
  )
}

export function SocialGuia({ aberto, onFechar, aprovadores = [], aprova = false, podeCriar = false, onNova }) {
  const passos = passosDoGuia({ aprovador: quemAprova(aprovadores), aprova })
  return (
    <Folha aberto={aberto} titulo="Como funciona, passo a passo" sub="Do planejamento à confirmação. O painel não publica no Instagram." onFechar={onFechar}>
      <ol className="sg__passos">
        {passos.map((p, i) => (
          <li key={p.titulo} className="sg__passo">
            <span className="sg__num" aria-hidden="true">{i + 1}</span>
            <span className="sg__texto"><b>{p.titulo}</b> {p.texto}</span>
          </li>
        ))}
      </ol>
      {podeCriar && onNova && <div className="ui-acoes sg__acoes"><Botao icone="mais" variante="destaque" onClick={() => { onFechar(); onNova() }}>Começar: nova postagem</Botao></div>}
    </Folha>
  )
}
