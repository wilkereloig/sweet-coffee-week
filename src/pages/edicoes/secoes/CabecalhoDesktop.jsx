import React from 'react'
import { NavPrincipal, AcessoTopo } from '../../../components/nav'
import { TEXTOS } from '../../../data/conteudo/edicoes'

/*
 * CABEÇALHO PRÓPRIO DO DESKTOP — mesma geometria da casca do site (trilho +
 * 50px), para o menu não mudar de lugar entre páginas. A marca da EDIÇÃO ocupa
 * o slot da logo; o menu é a mesma peça do site (NavPrincipal, em cápsula
 * legível) e o botão de acesso vive aqui porque o App não monta o cabeçalho
 * do site nesta rota.
 *
 * Fica FORA da cena que remonta a cada edição: trocar de edição não pode
 * derrubar o foco de quem está no menu. Só a marca remonta (key), para o selo
 * entrar de novo.
 *
 * O texto ao lado da marca (tema + "2016 · edição 01") saiu em 12/10/2026:
 * a identificação da edição foi para junto do título, na coluna.
 */
export function CabecalhoDesktop({ marca, tema, ir, onOpenAccess, accessOpen }) {
  return (
    <header className="scw-edx__cab">
      <div className="scw-edx__cab-linha">
        <span className="scw-edx__marca" key={marca.code}>
          {marca.logo
            ? <img className="scw-edx__marca-img" src={marca.logo} alt={`Marca da edição ${tema}`} decoding="async" />
            : <span className="scw-edx__marca-reserva">{TEXTOS.marcaPendente}</span>}
        </span>
        <NavPrincipal route="edicoes" aoNavegar={ir} />
        {onOpenAccess && <AcessoTopo onOpenAccess={onOpenAccess} accessOpen={accessOpen} />}
      </div>
    </header>
  )
}
