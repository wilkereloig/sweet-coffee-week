/*
 * Atalhos do jogo (06/11/2026) — o mapa em tela cheia com cara de jogo de celular: UM botão compacto sobre o mapa (canto
 * oposto ao zoom, abaixo da barra, respeitando o entalhe) que mostra o placar ("2/26") e, ao toque, abre uma lista curta de
 * atalhos com ícone e rótulo: Progresso · Casas · Rota · Prêmios · Ranking · Grupos · Pedir carimbo. Cada atalho abre UMA folha por vez (Folha,
 * variante "jogo"); ao abrir a folha a lista recolhe sozinha. Nada de barra larga nem cartão permanente.
 *
 * Escape (pilha de interacao.js): folha → lista → tela cheia. Ao fechar a folha o foco volta ao botão dos atalhos; fechar a
 * lista também. O que a folha mostra vem de `conteudo(chave, fechar)` (a página reaproveita os componentes que já existem).
 * Só entra na tela cheia: fora dela a página já tem barra, faixa de progresso, "Minha rota" e abas (docs 14 §14.13).
 * `placar`: "2/26" ou '' (sem mapa) · `resumo`: o mesmo por extenso, para o nome acessível do botão.
 *
 * Atalhos FIXOS (06/11/2026): três dos sete ficam sempre à mão, em botões compactos logo abaixo do "Atalhos" (esquerda, longe do zoom
 * e da localização). Padrão Progresso · Prêmios · Ranking; a pessoa troca no menu ("Escolher atalhos fixos") e a escolha fica neste aparelho
 * (atalhosFixos.js). O botão fixo e o item da lista chamam o MESMO `abrir(chave)`: a folha, o conteúdo e o estado do mapa são os de sempre.
 */
import React from 'react'
import ScwIcon from '../../../../components/scw-icons/ScwIcon.jsx'
import { IconeCartoon } from '../../../componentes/sistema/IconeCartoon.jsx'
import { MAPA_CACA as TC } from '../../../caca/mapa/textos.js'
import { Folha } from './Folha.jsx'
import { useEscape } from './interacao.js'
import { QUANTOS, TEXTO_FIXOS as TX, lerFixos, guardarFixos, alternarEscolha } from './atalhosFixos.js'

// [chave, ícone ilustrado da edição]: o ícone nunca está sozinho, o rótulo vai ao lado.
const CHAVES = ['progresso', 'casas', 'rota', 'premios', 'ranking', 'grupos', 'visitaAnterior']
export const ATALHOS = [['progresso', 'progresso'], ['casas', 'casas'], ['rota', 'rota'], ['premios', 'vouchers'], ['ranking', 'ranking'], ['grupos', 'conversar'], ['visitaAnterior', 'ja-fui']]

export function Atalhos ({ placar = '', resumo = '', conteudo, pedido = null, extra = null }) {
  const [lista, setLista] = React.useState(false)
  const [aberta, setAberta] = React.useState(null)
  const [fixos, setFixos] = React.useState(() => lerFixos(CHAVES))
  const [escolhendo, setEscolhendo] = React.useState(null) // rascunho da escolha (lista de chaves) enquanto o painel "fixos" está aberto
  const origem = React.useRef(null) // o botão fixo que abriu a folha (o foco volta a ele); da lista, volta ao botão "Atalhos"
  const botao = React.useRef(null)
  const raiz = React.useRef(null)
  const idLista = React.useId()
  const voltarAoBotao = React.useCallback(() => requestAnimationFrame(() => {
    const de = origem.current
    origem.current = null
    ;(de?.isConnected ? de : botao.current)?.focus({ preventScroll: true })
  }), [])
  const fecharLista = React.useCallback(() => { setLista(false); setEscolhendo(null); botao.current?.focus({ preventScroll: true }) }, []) // o botão segue montado: foco na hora
  const fecharFolha = React.useCallback(() => { setAberta(null); voltarAoBotao() }, [voltarAoBotao])

  useEscape(lista, fecharLista)
  React.useEffect(() => {
    if (!lista) return undefined
    raiz.current?.querySelector('.ct-jogo__item')?.focus({ preventScroll: true })
    // toque fora da lista recolhe (o toque no mapa continua valendo: o mapa recebe o evento também)
    const fora = (e) => { if (!raiz.current?.contains(e.target)) { setLista(false); setEscolhendo(null) } }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [lista])

  const abrir = (chave, de = null) => { origem.current = de; setLista(false); setEscolhendo(null); setAberta(chave) }
  const rotuloDe = (chave) => TC.atalho[chave]
  const iconeDe = (chave) => ATALHOS.find(([c]) => c === chave)?.[1]
  // Escolha dos fixos: com três marcados vale na hora (e fica no aparelho); com menos, é só rascunho e a barra segue como estava.
  const marcar = (chave) => {
    const prox = alternarEscolha(escolhendo || fixos, chave)
    setEscolhendo(prox)
    if (prox.length === QUANTOS) { setFixos(prox); guardarFixos(prox, CHAVES) }
  }
  // Pedido de fora (o botão "Minha rota" da barra): abre a folha daquele atalho sobre o mapa, sem mexer em zoom nem seleção.
  // O pedido que já existia na montagem é velho (sobrou de uma ida anterior à tela cheia): não reabre a folha sozinho.
  const jaVisto = React.useRef(pedido)
  React.useEffect(() => { if (pedido && pedido !== jaVisto.current) { jaVisto.current = pedido; abrir(pedido.chave) } }, [pedido]) // eslint-disable-line react-hooks/exhaustive-deps -- só quando chega um pedido novo
  const titulo = aberta ? TC.atalhoTitulo[aberta] : ''
  return (
    <div ref={raiz} className="ct-jogo">
      <div className="ct-jogo__linha">
        <button ref={botao} type="button" className="ct-jogo__botao" data-atalhos aria-expanded={lista} aria-controls={lista ? idLista : undefined}
          aria-label={TC.atalhosNome(resumo)} onClick={() => setLista((v) => !v)}>
          <ScwIcon nome="menu" tamanho={20} /><span>{TC.atalhos}</span>{placar && <b className="ct-jogo__placar" aria-hidden="true">{placar}</b>}
        </button>
        {extra}
      </div>
      <div className="ct-jogo__fixos" role="group" aria-label={TX.grupo}>
        {fixos.map((chave) => (
          <button key={chave} type="button" className="ct-jogo__fixo" data-atalho-fixo={chave} aria-haspopup="dialog" aria-label={rotuloDe(chave)}
            title={rotuloDe(chave)} onClick={(e) => abrir(chave, e.currentTarget)}>
            <IconeCartoon nome={iconeDe(chave)} tamanho={32} /><span>{rotuloDe(chave)}</span>
          </button>
        ))}
      </div>
      {lista && (
        <ul id={idLista} className="ct-jogo__lista" aria-label={TC.atalhosLista}>
          {ATALHOS.map(([chave, icone]) => (
            <li key={chave}>
              <button type="button" className="ct-jogo__item" data-atalho={chave} onClick={() => abrir(chave)}>
                <IconeCartoon nome={icone} tamanho={32} /><span>{TC.atalho[chave]}</span>
              </button>
            </li>
          ))}
          <li className="ct-jogo__config">
            <button type="button" className="ct-jogo__item ct-jogo__item--config" data-config-fixos aria-expanded={!!escolhendo}
              onClick={() => setEscolhendo((v) => (v ? null : fixos))}>
              <ScwIcon nome="menu" tamanho={20} /><span>{TX.configurar}</span>
            </button>
            {escolhendo && (
              <fieldset className="ct-jogo__escolha">
                <legend>{TX.configTitulo}</legend>
                <p>{TX.configAjuda}</p>
                {ATALHOS.map(([chave, icone]) => {
                  const marcado = escolhendo.includes(chave)
                  const travado = !marcado && escolhendo.length >= QUANTOS
                  return (
                    <label key={chave} className={`ct-jogo__opcao${marcado ? ' is-marcada' : ''}${travado ? ' is-travada' : ''}`}>
                      <input type="checkbox" data-fixo-opcao={chave} checked={marcado} disabled={travado} onChange={() => marcar(chave)} />
                      <IconeCartoon nome={icone} tamanho={32} /><span>{rotuloDe(chave)}</span>
                    </label>
                  )
                })}
                <p className="ct-jogo__escolha-estado" role="status">
                  {escolhendo.length === QUANTOS ? `${TX.configConta(QUANTOS)}. ${TX.configCheio}` : `${TX.configConta(escolhendo.length)}. ${TX.configFaltam(QUANTOS - escolhendo.length)}`}
                </p>
                <button type="button" className="ct-jogo__pronto" disabled={escolhendo.length !== QUANTOS} onClick={() => { setEscolhendo(null); botao.current?.focus({ preventScroll: true }) }}>{TX.configPronto}</button>
              </fieldset>
            )}
          </li>
        </ul>
      )}
      <Folha variante="jogo" aberta={!!aberta} titulo={titulo} rotuloFechar={aberta ? TC.atalhoFechar(titulo) : 'Fechar'} aoFechar={fecharFolha}>
        {aberta && conteudo(aberta, fecharFolha)}
      </Folha>
    </div>
  )
}

/*
 * Faixa do jogo (09/11/2026): FORA da tela cheia os atalhos ficam à vista, com ícone e nome, entre a barra e o mapa (no computador o progresso,
 * os prêmios e o ranking só existiam rolando a página ou entrando na tela cheia). A mesma folha e o mesmo `conteudo(chave, fechar)` da tela cheia.
 * "Rota" só aparece no computador (no celular a barra já tem "Minha rota") e não abre folha: leva ao painel da rota, que ali já está na página.
 */
export const NA_FAIXA = ['progresso', 'premios', 'ranking', 'grupos', 'rota']
export function FaixaJogo ({ placar = '', resumo = '', conteudo, aoRota }) {
  const [aberta, setAberta] = React.useState(null)
  const origem = React.useRef(null)
  const fechar = React.useCallback(() => {
    setAberta(null)
    const de = origem.current
    requestAnimationFrame(() => { if (de?.isConnected) de.focus({ preventScroll: true }) })
  }, [])
  const titulo = aberta ? TC.atalhoTitulo[aberta] : ''
  return (
    <nav className="ct-jogo-faixa" aria-label={TC.atalhosLista}>
      {NA_FAIXA.map((chave) => (
        <button key={chave} type="button" className="ct-chip ct-jogo-faixa__botao" data-faixa-jogo={chave} aria-haspopup={chave === 'rota' ? undefined : 'dialog'}
          aria-label={chave === 'progresso' && resumo ? `${TC.atalho[chave]}: ${resumo}` : undefined}
          onClick={(e) => { if (chave === 'rota') return aoRota?.(); origem.current = e.currentTarget; setAberta(chave) }}>
          <IconeCartoon nome={ATALHOS.find(([c]) => c === chave)[1]} tamanho={24} /><span>{TC.atalho[chave]}</span>
          {chave === 'progresso' && placar && <b className="ct-mapa__filtros-conta" aria-hidden="true">{placar}</b>}
        </button>
      ))}
      <Folha variante="jogo" aberta={!!aberta} titulo={titulo} rotuloFechar={aberta ? TC.atalhoFechar(titulo) : 'Fechar'} aoFechar={fechar}>
        {aberta && conteudo(aberta, fechar)}
      </Folha>
    </nav>
  )
}
