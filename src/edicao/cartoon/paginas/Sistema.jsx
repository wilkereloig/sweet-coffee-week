/*
 * Vitrine do sistema visual da Cartoon — SÓ NO DEV (/cartoon/sistema).
 * docs/cartoon-2026-2/10 §10.12, etapa 1: o Wilker aprova cores, tipos e peças
 * aqui antes de qualquer página mudar. O index.jsx só importa este arquivo sob
 * import.meta.env.DEV, então ele não entra no build.
 */
import React from 'react'
import './sistema.css'
import { letreiroEdicao } from '../../../data/imageLibrary'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { TopoCanal, CANAIS } from '../../componentes/sistema/TopoCanal.jsx'
import { Etiqueta, Pilula, Placa, Carimbo, Botao, Quadro, BarrasSinal } from '../../componentes/sistema/pecas.jsx'

// [cor, papel, tinta que passa sobre ela]
const CORES = [
  ['creme', 'base, respiro, corpo das páginas', 'chocolate'],
  ['amarelo', 'cena, faixa, botão primário, canal Estreia', 'chocolate'],
  ['chocolate', 'todo texto, contorno, sombra', 'creme'],
  ['preto', 'contorno de desenho', 'creme'],
  ['vermelho', 'ação focal, carimbo, rota (texto grande)', 'creme'],
  ['rosa', 'destaque curto, canal Cardápio (texto grande)', 'creme'],
  ['branco', 'quadro de logo e foto, brilho', 'chocolate'],
  ['azul', 'canal Serviço', 'preto'],
  ['turquesa', 'canal Rota', 'chocolate'],
  ['roxo', 'só em detalhe', 'creme'],
]

// [classe do sistema, regra, exemplo]
const TIPOS = [
  ['ct-h1', 'Título de página · 900', 'Casa Alice Doceria'],
  ['ct-h2', 'Título de seção · 900', 'Onde ficam as casas'],
  ['ct-sub', 'Chamada e nome do combo · 800', 'Um doce, um salgado e uma bebida'],
  ['ct-lead', 'Abertura de seção · 600', 'Casas de Natal transformam desenhos em sabor.'],
  ['', 'Texto corrido · 500', 'Escolha a casa, prove o combo no local, para levar ou por delivery, conforme a casa, e avalie a experiência no site.'],
  ['ct-rotulo', 'Serviço · 700, caixa alta', '5 a 15 de novembro · @sweetcoffeeweek'],
]

const NOME_CANAL = { estreia: 'Estreia', elenco: 'Elenco', cardapio: 'Cardápio', rota: 'Rota', gala: 'Gala', servico: 'Serviço' }

/** HEX lido do próprio CSS: a vitrine nunca repete o valor do token. */
function Hex ({ cor }) {
  const ref = React.useRef(null)
  const [hex, setHex] = React.useState('')
  React.useEffect(() => { setHex(getComputedStyle(ref.current).getPropertyValue(`--ct-${cor}`).trim()) }, [cor])
  return <code ref={ref}>{hex}</code>
}

export default function Sistema () {
  return (
    <div className="ct-vitrine">
      <section className="ct-bloco">
        <Etiqueta>Só no servidor local</Etiqueta>
        <h1 className="ct-h1">Sistema visual da Cartoon</h1>
        <p>Cores, tipos e peças do manual v03 aplicados ao site. Confira no celular e no desktop antes das páginas mudarem.</p>
      </section>

      <section className="ct-bloco" aria-labelledby="v-cores">
        <h2 id="v-cores" className="ct-h2">Cores</h2>
        <ul className="ct-vitrine__cores">
          {CORES.map(([cor, papel, tinta]) => (
            <li key={cor} className="ct-vitrine__cor" style={{ '--v-fundo': `var(--ct-${cor})`, '--v-tinta': `var(--ct-${tinta})` }}>
              <span className="ct-vitrine__amostra" aria-hidden="true">Aa</span>
              <span><strong>{cor}</strong> <Hex cor={cor} /></span>
              <span className="ct-vitrine__papel">{papel}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ct-bloco" aria-labelledby="v-tipos">
        <h2 id="v-tipos" className="ct-h2">Tipografia · Grandstander</h2>
        <dl className="ct-vitrine__tipos">
          {TIPOS.map(([classe, regra, exemplo]) => (
            <div key={regra}>
              <dt>{regra}</dt>
              <dd className={classe || undefined}>{exemplo}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ct-bloco" aria-labelledby="v-letreiros">
        <h2 id="v-letreiros" className="ct-h2">Letreiros</h2>
        <div className="ct-vitrine__grade">
          <Letreiro nivel={3} texto="Estrelando: nosso elenco!" imagem={letreiroEdicao('elenco')} />
          <Letreiro nivel={3} texto="Agora é hora de provar!" imagem={letreiroEdicao('provar')} />
          <Letreiro nivel={3} texto="Onde ficam" />
          <Letreiro nivel={3} tamanho="display" cor="chocolate" texto="Casa Alice Doceria" />
        </div>
      </section>

      <section className="ct-bloco" aria-labelledby="v-pecas">
        <h2 id="v-pecas" className="ct-h2">Peças</h2>
        <div className="ct-vitrine__pecas">
          <Etiqueta>Como funciona</Etiqueta>
          <Pilula>17ª edição</Pilula>
          <Carimbo>Nota 10</Carimbo>
          <Placa numero="5 a 15" rotulo="de novembro" />
          <Placa numero="11" rotulo="dias de festival" cor="creme" />
          <Placa numero="3" rotulo="itens no combo" cor="turquesa" />
        </div>
        <div className="ct-acoes">
          <Botao>Ver as casas</Botao>
          <Botao tipo="acao">Avaliar agora</Botao>
          <Botao tipo="secundario">Abrir o mapa</Botao>
          <Botao disabled>Indisponível</Botao>
        </div>
        <div className="ct-vitrine__pecas ct-vitrine__pecas--quadro">
          <Quadro><span className="ct-vitrine__logo">Logo da casa</span></Quadro>
        </div>
        <BarrasSinal />
      </section>

      <section className="ct-bloco" aria-labelledby="v-canais">
        <h2 id="v-canais" className="ct-h2">Canais · topo de página</h2>
      </section>
      {CANAIS.map((canal) => (
        <TopoCanal key={canal} canal={canal}>
          <p className="ct-rotulo">Canal {NOME_CANAL[canal]}</p>
          <Letreiro nivel={3} texto={NOME_CANAL[canal]} cor={canal === 'gala' || canal === 'cardapio' ? 'amarelo' : 'vermelho'} />
          <p className="ct-lead">Texto de apoio no tom de leitura deste canal.</p>
          <Botao>Ação do canal</Botao>
        </TopoCanal>
      ))}
    </div>
  )
}
