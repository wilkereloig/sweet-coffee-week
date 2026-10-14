import React from 'react'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { FotoAcervo } from '../../../components/FotoAcervo'
import { RESERVA } from '../../../data/imageLibrary'
import {
  SECOES, FILTRO, ICONE_CATEGORIA, ICONE_CATEGORIA_PADRAO, NAO_REGISTRADO,
} from '../../../data/conteudo/sweet-awards'
import {
  TODAS, opcoesFiltro, filtrarCategorias, anuncioFiltro, podioCompleto, fotosDoPodio,
} from '../consulta'
import { Cabeca } from './Cabeca'
import { medalha } from './medalha'

/* Selo de cada categoria: ciclo canônico da paleta (§6.3), com a tinta que
   passa sobre cada disco. A cor segue a POSIÇÃO NA BASE, não a do filtro —
   escolher "Melhor Doce" não muda a cor do selo dele. */
const CICLO = [
  { cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { cor: 'var(--scw-cyan)',    tinta: 'var(--scw-choco)' },
  { cor: 'var(--scw-magenta)', tinta: 'var(--scw-creme)' },
  { cor: 'var(--scw-roxo)',    tinta: 'var(--scw-creme)' },
  { cor: 'var(--scw-laranja)', tinta: 'var(--scw-choco)' },
  { cor: 'var(--scw-marrom)',  tinta: 'var(--scw-creme)' },
]

/* Card de colocação: foto da casa premiada + medalha DENTRO da legenda (§7.3).
   Empate fica na mesma colocação, com as marcas lado a lado. Colocação que o
   acervo não registra aparece como tal, sem foto e sem nome inventado. */

function CardColocacao({ colocacao, foto, grande }) {
  const { pos, nomes, empate } = colocacao
  const primeiro = pos === 1
  return (
    <li className={`swa-card${primeiro ? ' swa-card--primeiro' : ''}`} style={{ '--swa-medalha': medalha(pos) }}>
      <span className="swa-card__foto">
        {nomes && foto
          ? <FotoAcervo foto={foto} papel={primeiro && grande ? 'cheia' : 'cartao'} />
          : <span className="swa-reserva">{nomes ? RESERVA : 'Colocação não registrada no acervo.'}</span>}
      </span>
      <span className="swa-card__legenda">
        <span className="swa-card__cabeca">
          <span className="swa-medalha" aria-hidden="true"><span className="swa-num">{pos}º</span></span>
          <span className="swa-card__rotulo">
            {primeiro ? 'Primeiro lugar' : `${pos}º lugar`}{empate ? ' · empate' : ''}
          </span>
        </span>
        <b className="swa-card__marca">{nomes ? nomes.join(' + ') : NAO_REGISTRADO}</b>
      </span>
    </li>
  )
}

function Categoria({ cat, cor, fotos, grande }) {
  const id = `swa-cat-${cat.nome.normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
  return (
    <article className="swa-cat" aria-labelledby={id}>
      <div className="swa-cat__cab">
        <span className="scw-disco swa-cat__selo" style={{ '--c': cor.cor, '--tinta': cor.tinta }} aria-hidden="true">
          <ScwIcon nome={ICONE_CATEGORIA[cat.nome] || ICONE_CATEGORIA_PADRAO} tamanho={24} />
        </span>
        <h3 className="scw-h3 swa-cat__nome" id={id}>{cat.nome}</h3>
        {cat.desc && <p className="swa-cat__desc">{cat.desc}</p>}
      </div>
      <ol className="swa-podio">
        {podioCompleto(cat.pod).map((p) => (
          <CardColocacao key={p.pos} colocacao={p} foto={fotos.get(`${cat.nome}:${p.pos}`)} grande={grande} />
        ))}
      </ol>
    </article>
  )
}

/*
 * 02 — Resultados da edição em destaque. Filtro de categoria: "Todas" mostra os
 * oito pódios em duas colunas (desktop); escolher uma categoria mostra só o
 * pódio dela, maior. Botões com `aria-pressed` (estado anunciado por cada um) e
 * uma região viva que diz o que a tela passou a mostrar — o foco fica no botão.
 */
export function Resultados({ edicao }) {
  const t = SECOES.resultados
  const [filtro, setFiltro] = React.useState(TODAS)
  const opcoes = React.useMemo(() => opcoesFiltro(edicao.cats, FILTRO.todas), [edicao])
  const fotos = React.useMemo(() => fotosDoPodio(edicao), [edicao])
  const cor = React.useMemo(
    () => new Map(edicao.cats.map((c, i) => [c.nome, CICLO[i % CICLO.length]])),
    [edicao],
  )
  const visiveis = filtrarCategorias(edicao.cats, filtro)
  const uma = visiveis.length === 1

  return (
    <section id={t.id} className="scw-secao scw-secao--creme" aria-labelledby={`${t.id}-titulo`}>
      <Cabeca secao={t} />

      {/* Área de consulta: entra como um bloco só e nada aqui dentro tem classe
          trocada pelo motor de movimento (§6.15). */}
      <div className="swa-consulta" data-mo-bloco>
        <div className="swa-filtro" role="group" aria-labelledby="swa-filtro-rotulo">
          <span className="swa-filtro__rotulo" id="swa-filtro-rotulo">{FILTRO.rotulo}</span>
          <ul className="swa-filtro__lista">
            {opcoes.map((o) => (
              <li key={o.chave}>
                <button
                  type="button"
                  className="swa-filtro__op"
                  aria-pressed={filtro === o.chave}
                  onClick={() => setFiltro(o.chave)}
                >
                  {o.rotulo}
                  {o.chave === TODAS && <span className="swa-filtro__n" aria-hidden="true">{o.total}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="scw-sr" role="status">{anuncioFiltro(edicao.cats, filtro)}</p>

        <div className="swa-cats" data-vista={uma ? 'uma' : 'todas'}>
          {visiveis.map((c) => (
            <Categoria key={c.nome} cat={c} cor={cor.get(c.nome)} fotos={fotos} grande={uma} />
          ))}
        </div>

        <p className="swa-fotos-nota">{t.legendaFotos}</p>
      </div>
    </section>
  )
}
