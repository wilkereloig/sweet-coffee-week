import React from 'react'
import { MARCA_SWEET_AWARDS, trofeuEdicao } from '../../../data/imageLibrary'
import Seta from '../../../components/Seta'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import { APURACAO as T, SECOES } from '../../../data/conteudo/sweet-awards'
import { irPara } from './Indice'

const PREMIADOS = SECOES.resultados.id
const TROFEU = trofeuEdicao('ouro')

/*
 * 01 — Abertura da EXPECTATIVA (16/11/2026): a edição em destaque terminou e o
 * resultado ainda não foi divulgado. Identifica a edição, diz o estado, explica
 * em uma frase o que está acontecendo, leva ao Instagram oficial (onde o
 * resultado sai primeiro) e deixa os resultados anteriores a um clique.
 *
 * Clima de reconhecimento com as cores do próprio site: chapa chocolate, luz
 * creme e o dourado só no troféu oficial (v15, arquivo do Sweet Awards — nunca
 * redesenhado). A marca do Sweet Awards é a permanente, não a da edição.
 *
 * ⛔ Nada de pódio vazio, medalha, vencedor de exemplo, data ou contagem
 * regressiva (A4). Os três números são do histórico já publicado.
 *
 * Mesma geometria e mesmas classes do herói da página (.scw-heroi-foto,
 * .swa-hero, .swa-numeros): scw-motion.css coreografa por elas. Sem laço.
 */
export function AberturaApuracao({ numeros, destaque, temAnteriores = true }) {
  return (
    <section className="scw-heroi-foto swa-hero swa-gala" aria-labelledby="swa-titulo" data-mo-fora>
      <div className="swa-gala__palco">
        <img
          className="swa-gala__trofeu"
          src={TROFEU.src}
          width={TROFEU.largura}
          height={TROFEU.altura}
          alt={T.trofeu}
          decoding="async"
        />
        <img
          className="swa-gala__marca"
          src={MARCA_SWEET_AWARDS.src}
          width={MARCA_SWEET_AWARDS.largura}
          height={MARCA_SWEET_AWARDS.altura}
          alt={MARCA_SWEET_AWARDS.alt}
          decoding="async"
        />
      </div>
      <div className="scw-heroi-foto__texto swa-hero__texto">
        <p className="swa-gala__rotulo">{T.rotulo(destaque.tema, destaque.code)}</p>
        <h1 className="scw-h1" id="swa-titulo">{T.titulo(destaque.tema)}</h1>
        <p className="swa-gala__estado"><span aria-hidden="true" />{T.estado}</p>
        <p className="scw-lead">{T.texto}</p>
        <div className="swa-gala__acoes">
          <a
            className="scw-btn swa-gala__acao"
            href={T.instagram.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${T.instagram.rotulo} (abre em nova aba)`}
          >
            <ScwIcon nome="instagram" tamanho={24} /> {T.instagram.rotulo}
          </a>
          {/* Só com resultado publicado na base: sem ele a seção (e a âncora) não existe. */}
          {temAnteriores && (
            <a className="scw-btn scw-btn--contorno-claro" href={`#${PREMIADOS}`} onClick={irPara(PREMIADOS)}>
              {T.anteriores} <Seta />
            </a>
          )}
        </div>
        <dl className="swa-numeros">
          <div>
            <dt>Edições premiadas</dt>
            <dd>{numeros.edicoes}</dd>
          </div>
          <div>
            <dt>Prêmios entregues</dt>
            <dd>{numeros.premios}</dd>
          </div>
          <div>
            <dt>Marcas premiadas</dt>
            <dd>{numeros.marcas}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

export default AberturaApuracao
