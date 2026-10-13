/*
 * 01 Abertura — a busca É a ação principal.
 *
 * A página existe para resolver dúvida e encaminhar o contato. Antes, a
 * abertura tinha dois botões que só rolavam a página ("Ver as perguntas" / "Ir
 * para o formulário"), e no celular os dois caíam embaixo do aviso de cookies.
 * Agora o campo de busca mora aqui: ele escreve no MESMO estado da central, e
 * "Buscar" leva direto à lista já filtrada, com o foco no título do resultado.
 * O formulário fica como segunda ação, em link.
 *
 * Classes `.ctt-abertura*` mantidas: scw-motion.css coreografa a entrada por
 * elas (e o motor deixa o herói de fora).
 */
import React from 'react'
import { heroPhotos } from '../../../data/imageLibrary'
import { HeroFotos } from '../../../components/HeroFotos'
import ScwIcon from '../../../components/scw-icons/ScwIcon'
import Seta from '../../../components/Seta'
import { ABERTURA } from '../../../data/conteudo/contato'
import { TOTAL } from '../useCentralDuvidas'
import { ancora, rolarPara } from '../rolar'

const HERO_FOTOS = heroPhotos('contato')

export function Abertura({ central }) {
  const buscar = (e) => {
    e.preventDefault()
    rolarPara('ctt-resultados', 'ctt-resultados-titulo')
  }

  return (
    <section
      className="scw-hero-bloco scw-hero-bloco--compacto scw-hero-veu ctt-abertura"
      aria-labelledby="ctt-titulo"
      data-mo-fora
    >
      <HeroFotos fotos={HERO_FOTOS} />
      <div className="ctt-abertura__grade">
        <span className="scw-rotulo ctt-abertura__rotulo">{ABERTURA.rotulo}</span>
        <h1 id="ctt-titulo" className="scw-h1 ctt-abertura__titulo">{ABERTURA.titulo}</h1>
        <p className="scw-hero__lead ctt-abertura__lead">
          {ABERTURA.lead.replace('{total}', TOTAL)}
        </p>
        <div className="ctt-abertura__acoes">
          <form role="search" className="ctt-procura" onSubmit={buscar}>
            <label htmlFor="ctt-busca-heroi" className="ctt-procura__rotulo">{ABERTURA.buscaRotulo}</label>
            <div className="ctt-procura__linha">
              <ScwIcon nome="ui/busca" tamanho={20} />
              <input
                id="ctt-busca-heroi"
                type="search"
                value={central.busca}
                onChange={(e) => central.mudarBusca(e.target.value)}
                placeholder={ABERTURA.buscaExemplo}
                autoComplete="off"
                enterKeyHint="search"
              />
              <button type="submit" className="scw-btn ctt-btn-choco ctt-procura__botao">
                {ABERTURA.buscar}
              </button>
            </div>
          </form>
          <a href="#mensagem" onClick={ancora('mensagem')} className="ctt-abertura__escrever">
            {ABERTURA.escrever} <Seta size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}

export default Abertura
