/*
 * Cartão de combo da edição (11/11/2026, pedido do Wilker: "o objetivo é vender combo"). Um só, na Entrada e no
 * catálogo (antes eram dois: a lâmina da Entrada e o cartão do catálogo).
 * Em cima, o link para a ficha: foto, nome, casa, itens, tema e onde. No pé, fora do link (nunca botão dentro de link):
 *   · o preço da edição e as AÇÕES DE COMPRA (AcoesCompra) — pedir por delivery ou ir até a casa;
 *   · "Quero ir" / "Já fui" (Minha rota), secundários.
 * O festival não vende: as ações levam ao canal da casa ou ao endereço dela.
 */
import React from 'react'
import { EDICAO } from '../config.js'
import * as M from '../dados/modelo.js'
import { kitTemaEdicao } from '../../data/imageLibrary'
import { Link, Foto, proporcaoDe } from '../componentes/base.jsx'
import { IconeCartoon } from '../componentes/sistema/IconeCartoon.jsx'
import ScwIcon from '../../components/scw-icons/ScwIcon.jsx'
import { LogoDesenhada } from '../componentes/sistema/LogoDesenhada.jsx'
import { SeloDaCasa } from '../componentes/sistema/SeloDaCasa.jsx'
import { QueroIrCasa, JaFui } from './MarcasLover.jsx'
import { MAPA_NO_AR } from './contexto.js'
import { Ancora } from './paginas/participante/Ancora.jsx'
import { CATALOGO as T, COMPRA, ATENDIMENTO, RESTRICAO, TIPO_ORDEM, ICONE } from './textos.js'

const C = EDICAO.caminho

/** Selos do cartão: atendimento que alguma unidade declarou + restrição declarada no combo inteiro. */
function selosDaCasa (p) {
  const modos = M.MODOS.map(([k]) => k).filter((k) => M.estadoModo(p, k).estado === 'sim').map((k) => ATENDIMENTO[k])
  const restricoes = M.RESTRICOES.map((r) => r.chave).filter((k) => M.veredito(p.combo?.itens, k) === 'sim').map((k) => RESTRICAO[k])
  const veg = M.opcaoVegetariana(p.combo?.itens)
  const vegetariano = veg === 'nao' ? [] : [{ ...RESTRICAO.vegetariano, rotulo: veg === 'troca' ? RESTRICAO.vegetariano.rotuloTroca : RESTRICAO.vegetariano.rotulo }]
  return [...modos, ...vegetariano, ...restricoes]
}

/**
 * As duas ações de compra de uma casa. Link direto só quando não há dúvida (a mesma regra do atalho da ficha):
 *  · Delivery: canal único → abre o canal; várias unidades com canais diferentes, ou sem link → "Como pedir" da ficha.
 *  · Ir até a casa: uma unidade → "Como chegar" no mapa; várias → a lista de unidades da ficha.
 * Casa que declarou "não" para consumo no local E para retirada não ganha "Ir até a casa".
 * `naFicha`: dentro da própria ficha os destinos internos rolam até o bloco (Ancora) em vez de navegar.
 * `data-acao` e `data-casa` alimentam a contagem de cliques (useContagemCliques).
 */
export function AcoesCompra ({ p, navigate, className = '', naFicha = false }) {
  if (!p.combo) return null
  const us = p.unidades || []
  const delivery = M.estadoModo(p, 'delivery').estado === 'sim' ? M.destinoDelivery(p) : null
  const presencial = us.length > 0 && ['local', 'retirada'].some((k) => M.estadoModo(p, k).estado !== 'nao')
  const rota = us.length === 1 ? M.linkComoChegar(us[0]) : ''
  if (!delivery && !presencial) return null
  const ficha = (ver) => `${C}/participantes/${p.slug}?ver=${ver}`
  const externo = { target: '_blank', rel: 'noopener noreferrer' }
  const Interno = ({ ver, children, ...resto }) => (naFicha
    ? <Ancora para={ver} {...resto}>{children}</Ancora>
    : <Link href={ficha(ver)} navigate={navigate} {...resto}>{children}</Link>)
  return (
    <div className={`ct-compra ${className}`.trim()} data-casa={p.slug}>
      {delivery && (delivery.tipo === 'link'
        ? <a className="ct-botao ct-compra__botao" href={delivery.link} data-acao="delivery" {...externo}><IconeCartoon nome={ATENDIMENTO.delivery.icone} tamanho={24} /><span>{COMPRA.delivery}</span><span aria-hidden="true">↗</span><span className="ct-sr"> {COMPRA.novaAba}</span></a>
        : <Interno ver="atendimento" className="ct-botao ct-compra__botao" data-acao="delivery"><IconeCartoon nome={ATENDIMENTO.delivery.icone} tamanho={24} /><span>{COMPRA.delivery}</span></Interno>)}
      {presencial && (rota
        ? <a className="ct-botao ct-botao--contorno ct-compra__botao" href={rota} data-acao="como_chegar" {...externo}><ScwIcon nome={ICONE.comoChegar} tamanho={20} /><span>{COMPRA.irAteCasa}</span><span aria-hidden="true">↗</span><span className="ct-sr"> {COMPRA.novaAba}</span></a>
        : <Interno ver="unidades" className="ct-botao ct-botao--contorno ct-compra__botao" data-acao="ver_unidades"><ScwIcon nome={ICONE.comoChegar} tamanho={20} /><span>{COMPRA.irAteCasa}</span></Interno>)}
    </div>
  )
}

/**
 * `modo` 'combos' põe o combo à frente (nome do combo, itens); 'participantes', a casa. `etiqueta` ({ tipo, texto }) só
 * durante o festival, e diz o que é verdade AGORA ("Aberta agora, até 18h" / "Abre às 15h").
 */
export function CartaoCombo ({ p, modo = 'combos', navigate, encerrada = false, etiqueta = null, aoIr }) {
  const base = modo === 'combos' ? 'combos' : 'participantes'
  const us = p.unidades || []
  const bairros = [...new Map(us.map((u) => u.endereco?.bairro).filter(Boolean).map((b) => [M.normalizar(b), b])).values()]
  const itens = [...(p.combo?.itens || [])].sort((a, b) => a.posicao - b.posicao || TIPO_ORDEM.indexOf(a.tipo) - TIPO_ORDEM.indexOf(b.tipo))
  const nomeCombo = p.combo?.nome ? M.caixaLegivel(p.combo.nome) : ''
  const foto = p.combo?.fotos?.principal
  const espia = kitTemaEdicao(p.slug)?.objetoB
  const selos = selosDaCasa(p)
  const nomesItens = itens.map((i) => i.nome).filter(Boolean)
  const preco = !encerrada && p.combo?.preco ? M.formatarPreco(p.combo.preco) : ''
  return (
    <li className={`ct-cartao${espia ? ' ct-cartao--espia' : ''}`}>
      <Link className="ct-cartao__link" href={`${C}/${base}/${p.slug}`} navigate={navigate} aoIr={aoIr} data-acao="ver_combo" data-casa={p.slug}>
        <div className="ct-cartao__visual">
          {foto ? (
            <>
              <Foto foto={foto} proporcao={proporcaoDe(foto, '4 / 3')} alt="" />
              <SeloDaCasa casa={p.casa} />
            </>
          ) : (
            <div className="ct-cartao__reserva">
              <LogoDesenhada casa={p.casa} alt="" />
              <span className="ct-cartao__aviso">{p.combo ? T.fotoEmProducao : T.comboEmBreve}</span>
            </div>
          )}
          {etiqueta && <span className={`ct-cartao__momento ct-cartao__momento--${etiqueta.tipo}`}>{etiqueta.texto}</span>}
        </div>
        {espia && <img className="ct-cartao__espia" src={espia.src} width={espia.largura} height={espia.altura} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
        <div className="ct-cartao__corpo">
          <h2 className="ct-cartao__nome">{modo === 'combos' && nomeCombo ? nomeCombo : p.casa.nome}</h2>
          {modo === 'combos' ? nomeCombo && <p className="ct-cartao__sub">{p.casa.nome}</p> : nomeCombo && <p className="ct-cartao__sub">{nomeCombo}</p>}
          {modo === 'combos' && nomesItens.length > 0 && (
            <ul className="ct-cartao__itens">
              {itens.filter((i) => i.nome).map((i) => <li key={i.posicao}><ScwIcon nome={ICONE.tipo[i.tipo]} tamanho={16} /><span>{M.caixaLegivel(i.nome)}</span></li>)}
            </ul>
          )}
          {p.casa.tema && <p className="ct-cartao__tema">{T.tema(p.casa.tema)}</p>}
          {(bairros.length > 0 || us.length > 1) && (
            <p className="ct-cartao__onde">{[bairros.join(' · '), us.length > 1 ? T.unidades(us.length) : null].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        {selos.length > 0 && (
          <ul className="ct-selos ct-cartao__selos">
            {selos.map((s) => <li key={s.icone} className="ct-selo"><IconeCartoon nome={s.icone} tamanho={32} /><span>{s.rotulo}</span></li>)}
          </ul>
        )}
      </Link>
      {!encerrada && p.combo && (
        <div className="ct-cartao__venda">
          {preco && <p className="ct-cartao__preco"><span>{T.precoRotulo}</span> {preco}</p>}
          <AcoesCompra p={p} navigate={navigate} />
        </div>
      )}
      {!encerrada && MAPA_NO_AR && us.length > 0 && (
        <div className="ct-cartao__marcas">
          <QueroIrCasa p={p} navigate={navigate} />
          <JaFui p={p} />
        </div>
      )}
    </li>
  )
}
