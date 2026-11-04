/*
 * Peças pequenas do sistema visual da Cartoon (docs/cartoon-2026-2/10 §10.4).
 * Só composição: o desenho mora em scw-cartoon.css, sobre os tokens --ct-*.
 */
import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon.jsx'
import { Link } from '../base.jsx'
import { IconeCartoon } from './IconeCartoon.jsx'
import { gibiEdicao } from '../../../data/imageLibrary'

/**
 * Fita com o nome da seção: amarela; `cor="azul"` no canal Serviço ("como funciona"), em texto grande.
 * `icone`: ícone de CONTORNO do sistema (icones/interface, 20 px) antes do texto — leitura rápida do assunto
 * (Doce, Salgado, Bebida). Ilustração da edição (IconeCartoon) fica para navegação e modos de atendimento.
 */
export function Etiqueta ({ children, as: Tag = 'p', cor, icone, ...resto }) {
  return (
    <Tag className={`ct-etiqueta${cor ? ` ct-etiqueta--${cor}` : ''}${icone ? ' ct-etiqueta--icone' : ''}`} {...resto}>
      {icone && <ScwIcon nome={icone} tamanho={20} />}{children}
    </Tag>
  )
}

/** Rótulo de tópico (caixa-alta pequena) com ícone de contorno: diz de que se está falando antes do conteúdo. */
export function Rotulo ({ children, icone, as: Tag = 'p', className = '', ...resto }) {
  return (
    <Tag className={`ct-rotulo${icone ? ' ct-rotulo--icone' : ''} ${className}`.trim()} {...resto}>
      {icone && <ScwIcon nome={icone} tamanho={20} />}<span>{children}</span>
    </Tag>
  )
}

/**
 * Preço em letreiro, como o "COMBO R$ 38,90" da arte final do carrossel: rótulo branco em cima e o valor vermelho com
 * volume. O espaço entre os dois é texto: a frase lida é "Combo R$ 38,90".
 */
export function Preco ({ rotulo, valor, as: Tag = 'p', className = '' }) {
  return <Tag className={`ct-preco ${className}`.trim()}><span className="ct-preco__combo">{rotulo}</span> <span className="ct-preco__valor">{valor}</span></Tag>
}

/** Dado curto em chocolate. */
export function Pilula ({ children }) {
  return <span className="ct-pilula">{children}</span>
}

/** Selo ou nota em vermelho — texto grande, nunca frase. */
export function Carimbo ({ children }) {
  return <span className="ct-carimbo">{children}</span>
}

/** Dado duro: número grande + rótulo. A cor contrasta com o canal; a tinta é sempre chocolate. */
export function Placa ({ numero, rotulo, cor = 'amarelo' }) {
  return (
    <p className={`ct-placa ct-placa--${cor}`}>
      <span className="ct-placa__numero">{numero}</span>
      <span className="ct-placa__rotulo">{rotulo}</span>
    </p>
  )
}

const CLASSE_BOTAO = { primario: 'ct-botao', acao: 'ct-botao ct-botao--acao', secundario: 'ct-botao ct-botao--contorno' }

/**
 * Com `href` + `navigate` vira link da edição (SPA); com `href` sem `navigate`
 * (link externo, mapa, WhatsApp) vira <a> comum; sem `href`, botão.
 * Reusa .ct-botao, que as páginas já usam; `className` do chamador soma, não substitui.
 */
export function Botao ({ tipo = 'primario', href, navigate, children, className: extra = '', ...resto }) {
  const className = `${CLASSE_BOTAO[tipo] ?? CLASSE_BOTAO.primario} ${extra}`.trim()
  if (href && navigate) return <Link href={href} navigate={navigate} className={className} {...resto}>{children}</Link>
  if (href) return <a href={href} className={className} {...resto}>{children}</a>
  return <button type="button" className={className} {...resto}>{children}</button>
}

/** Quadro branco com fita nos cantos, para logo ou foto. */
export function Quadro ({ children, fita = true, className = '' }) {
  return <div className={`ct-quadro${fita ? ' ct-quadro--fita' : ''} ${className}`.trim()}>{children}</div>
}

/** Chip de alternância (filtro do catálogo e do mapa, "Quero ir"/"Já fui"): ícone da edição + texto, nunca o ícone sozinho. */
export function Chip ({ ativo, icone, onClick, children, className = '' }) {
  return (
    <button type="button" className={`ct-chip${icone ? ' ct-chip--icone' : ''} ${className}`.trim()} aria-pressed={ativo} onClick={onClick}>
      {icone && <IconeCartoon nome={icone} tamanho={32} />}<span>{children}</span>
    </button>
  )
}

/**
 * Desenho de gibi da edição (imageLibrary `gibiEdicao`: mesa, palco, objetos, luvas). Sempre decorativo: alt vazio e
 * aria-hidden; o texto que ele acompanha diz tudo. `prioridade` para o que aparece na primeira tela.
 */
export function Gibi ({ chave, className = '', prioridade = false }) {
  const g = gibiEdicao(chave)
  if (!g) return null
  return (
    <img className={`ct-gibi ${className}`.trim()} src={g.src} width={g.largura} height={g.altura} alt="" aria-hidden="true"
      decoding="async" loading={prioridade ? 'eager' : 'lazy'} {...(prioridade ? { fetchpriority: 'high' } : {})} />
  )
}

/* Cada passo ganha o objeto desenhado do assunto (repaginação de 04/11); sem objeto, o ícone ilustrado de antes. */
const DESENHO_DO_PASSO = { casas: 'loja', 'no-local': 'bandeja', avaliar: 'prancheta', premio: 'megafone' }

/**
 * Passos numerados como tira de gibi (Entrada "Como funciona", Avaliar "Como avaliar"): cada passo é um quadro com a
 * caixa do número no canto, o objeto desenhado e o texto. `passos`: [{ titulo, texto, icone }].
 */
export function Passos ({ passos }) {
  return (
    <ol className="ct-passos">
      {passos.map((p, i) => (
        <li key={p.titulo}>
          <span className="ct-passos__n" aria-hidden="true">{i + 1}</span>
          {DESENHO_DO_PASSO[p.icone] ? <Gibi chave={DESENHO_DO_PASSO[p.icone]} className="ct-passos__desenho" /> : <IconeCartoon nome={p.icone} tamanho={64} />}
          <h3 className="ct-passos__titulo">{p.titulo}</h3>
          <p>{p.texto}</p>
        </li>
      ))}
    </ol>
  )
}
