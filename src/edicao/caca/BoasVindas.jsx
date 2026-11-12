/*
 * Boas-vindas da Caça aos Carimbos (12/11/2026, pedido do Wilker): a tela de quem ainda não tem mapa. Antes eram uma introdução amarela ("Primeira vez na
 * Caça?"), um cartão branco ("Primeira vez aqui? Crie agora") e o "Já tenho mapa" — a mesma coisa três vezes. Agora é uma sequência só, que convence e
 * depois pede o cadastro:
 *   1. a mensagem de boas-vindas, com UM botão (Criar meu mapa) e, ao lado, a saída de quem já tem mapa (Recuperar meu mapa);
 *   2. o que a pessoa pode ganhar — a lista do pop-up "O que você disputa" (disputa/ListaDisputa), com o que está valendo AGORA: voucher do dia, prêmio
 *      final e campanha do Sicredi; nada é escrito aqui, então não anuncia o que não existe (sem dado, a seção some);
 *   3. como carimbar, em quatro passos, com o guia completo a um toque.
 * O formulário vem logo abaixo (Central → CriarMapa). Como esta tela já mostra a disputa, ela registra o dia (o mesmo registro do pop-up) e o pop-up
 * "O que você disputa" não aparece por cima dela, nem logo depois de a pessoa criar o mapa.
 */
import React from 'react'
import { EDICAO } from '../config.js'
import { Link } from '../componentes/base.jsx'
import { Botao, Gibi, Passos } from '../componentes/sistema/pecas.jsx'
import { Letreiro } from '../componentes/sistema/Letreiro.jsx'
import { IconeCartoon } from '../componentes/sistema/IconeCartoon.jsx'
import { CACA } from './textos.js'
import { BOAS_VINDAS as B, GUIA } from './guia/textos.js'
import { BotaoComoCarimbar } from './guia/GuiaCarimbar.jsx'
import { irAoApelido } from './CriarMapa.jsx'
import { ListaDisputa } from './disputa/ListaDisputa.jsx'
import { useDisputa } from './disputa/useDisputa.js'
import { gravarDia } from './disputa/logica.js'

const armazem = () => { try { return window.localStorage } catch { return null } }

export function BoasVindas ({ caca, dados, navigate }) {
  const totalDaEdicao = (dados?.participantes || []).filter((p) => (p.unidades || []).length).length
  const { lido, campanha, hojeIso, disputa } = useDisputa(caca, totalDaEdicao)
  const comPremio = lido !== 'carregando' && !!(disputa.voucher || disputa.campanha || disputa.final)

  // A disputa do dia já foi mostrada aqui: o pop-up só volta amanhã.
  React.useEffect(() => { if (comPremio) gravarDia(armazem(), hojeIso) }, [comPremio, hojeIso])

  return (
    <>
      <section className="ct-caca-chamada ct-reticula ct-boasvindas" aria-labelledby="caca-boasvindas">
        <span className="ct-explosao ct-caca-chamada__explosao" aria-hidden="true" />
        <span className="ct-caca-chamada__carimbo" aria-hidden="true"><IconeCartoon nome="ja-fui" tamanho={64} /></span>
        <div className="ct-caca-chamada__texto">
          <Letreiro id="caca-boasvindas" apoio={B.apoio} texto={B.titulo} cor="vermelho" />
          <p>{B.texto}</p>
          <div className="ct-acoes">
            <Botao tipo="acao" data-criar-mapa onClick={irAoApelido}>{CACA.criar.acao}</Botao>
          </div>
          <p className="ct-boasvindas__ja">
            <span>{B.jaTem}</span>
            <Link href={`${EDICAO.caminho}/caca/recuperar`} navigate={navigate} className="ct-link-frase">{CACA.criar.recuperar}</Link>
          </p>
        </div>
        <Gibi chave="luva-acena" className="ct-caca-chamada__luva" />
      </section>

      {comPremio && (
        <section className="ct-boasvindas__bloco ct-boasvindas__ganhar" aria-labelledby="caca-ganhar">
          <h2 id="caca-ganhar" className="ct-sub">{B.ganharTitulo}</h2>
          <ListaDisputa disputa={disputa} campanha={campanha} navigate={navigate} />
        </section>
      )}

      <section className="ct-boasvindas__bloco ct-boasvindas__como" aria-labelledby="caca-como">
        <h2 id="caca-como" className="ct-sub">{B.comoTitulo}</h2>
        <Passos passos={B.passos} />
        <p className="ct-boasvindas__guia"><BotaoComoCarimbar navigate={navigate} rotulo={GUIA.completo} /></p>
      </section>
    </>
  )
}
