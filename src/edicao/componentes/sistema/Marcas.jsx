/*
 * Marcas da edição, sempre sobre branco: é o fundo em que a Sicredi usa a versão preferencial, sem box
 * (manual de identidade, p. 16-17). Regras do manual aqui: Sicredi com o maior destaque, logos alinhados
 * pelo centro, sem sombra nem rotação, área de reserva e de convivência respeitadas (gap do CSS).
 * Fica acima do rodapé em todas as páginas.
 */
import React from 'react'
import { LOGO_F2, MARCAS_PARCEIROS as M } from '../../../data/imageLibrary'
import { MARCAS as T } from '../../cartoon/textos.js'

const Logo = ({ marca, className }) => <img className={className} src={marca.src} alt={marca.alt} width={marca.largura} height={marca.altura} loading="lazy" decoding="async" />

export function FaixaMarcas () {
  return (
    <section className="ct-marcas" aria-label="Realização, patrocínio e apoio">
      <div className="ct-marcas__grupo"><p className="ct-marcas__rotulo">{T.realizacao}</p><Logo marca={LOGO_F2} className="ct-marcas__f2" /></div>
      <div className="ct-marcas__grupo">
        <p className="ct-marcas__rotulo">{T.patrocinio}</p>
        <Logo marca={M.sicredi} className="ct-marcas__sicredi" />
      </div>
      <div className="ct-marcas__grupo">
        <p className="ct-marcas__rotulo">{T.apoio}</p>
        <div className="ct-marcas__logos"><Logo marca={M.senac} className="ct-marcas__senac" /><Logo marca={M.espacoReduzido} className="ct-marcas__espaco" /></div>
      </div>
    </section>
  )
}
