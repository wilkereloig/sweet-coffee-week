/*
 * Vitrine do sistema visual da Cartoon — SÓ NO DEV (/cartoon/sistema).
 * docs/cartoon-2026-2/10 §10.12, etapa 1: o Wilker aprova cores, tipos e peças
 * aqui antes de qualquer página mudar. O index.jsx só importa este arquivo sob
 * import.meta.env.DEV, então ele não entra no build.
 * §10.15 (28/10): ícones, cenografia e ficha de exemplo com cenário por tema.
 */
import React from 'react'
import './sistema.css'
import { letreiroEdicao, cenaEdicao, srcSet } from '../../../data/imageLibrary'
import { Letreiro } from '../../componentes/sistema/Letreiro.jsx'
import { TopoCanal, CANAIS } from '../../componentes/sistema/TopoCanal.jsx'
import { IconeCartoon } from '../../componentes/sistema/IconeCartoon.jsx'
import { CenarioTema } from '../../componentes/sistema/CenarioTema.jsx'
import { Olhinhos } from '../../componentes/sistema/Olhinhos.jsx'
import { Etiqueta, Pilula, Placa, Carimbo, Botao, Quadro, BarrasSinal } from '../../componentes/sistema/pecas.jsx'

// [cor, papel, tinta que passa sobre ela]
const CORES = [
  ['creme', 'base, respiro, corpo das páginas', 'chocolate'],
  ['amarelo', 'cena, faixa, botão primário, canal Estreia', 'chocolate'],
  ['chocolate', 'todo texto, contorno, sombra', 'creme'],
  ['preto', 'contorno de desenho', 'creme'],
  ['vermelho', 'ação focal, carimbo, tracejado de rota (texto grande)', 'creme'],
  ['rosa', 'destaque curto, canal Cardápio (texto grande)', 'creme'],
  ['branco', 'quadro de logo e foto, brilho', 'chocolate'],
  ['azul', 'canal Serviço', 'preto'],
  ['turquesa', 'canal Rota', 'chocolate'],
  ['roxo', 'só em detalhe (barras de sinal)', 'creme'],
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

// [grupo, [[nome do ícone, rótulo]]] — os 24 do §10.15; o rótulo é o texto que sempre acompanha o ícone.
const GRUPOS_ICONES = [
  ['Navegação', [['inicio', 'Início'], ['casas', 'Casas'], ['mapa', 'Mapa'], ['rota', 'Rota'], ['avaliar', 'Avaliar'], ['premio', 'Prêmio']]],
  ['Atendimento', [['no-local', 'No local'], ['para-viagem', 'Para viagem'], ['delivery', 'Delivery']]],
  ['Restrições', [['vegano', 'Vegano'], ['sem-gluten', 'Sem glúten'], ['sem-lactose', 'Sem lactose'], ['sem-acucar', 'Sem açúcar']]],
  ['Unidade', [['endereco', 'Endereço'], ['horario', 'Horário'], ['aberto-agora', 'Aberto agora'], ['conversar', 'Conversar'], ['como-chegar', 'Como chegar']]],
  ['Painel do Sweet Lover', [['quero-ir', 'Quero ir'], ['ja-fui', 'Já fui'], ['progresso', 'Progresso'], ['compartilhar', 'Compartilhar']]],
  ['Estados', [['vazio', 'Vazio'], ['erro', 'Erro']]],
]

// Fichas de exemplo: só o arranjo. Nada daqui é o cadastro real da casa (o aviso da seção diz isso).
const FICHAS = [
  { slug: 'casa-alice-doceria', nome: 'Casa Alice Doceria', tema: 'Inspirado em Alice no País das Maravilhas', selos: [['no-local', 'No local'], ['para-viagem', 'Para viagem'], ['vegano', 'Vegano']] },
  { slug: 'boldfood-confeitaria-inclusiva', nome: 'Boldfood Confeitaria Inclusiva', tema: 'Inspirado em Ursinhos Carinhosos', selos: [['no-local', 'No local'], ['delivery', 'Delivery'], ['sem-gluten', 'Sem glúten']] },
]

/** HEX lido do próprio CSS: a vitrine nunca repete o valor do token. */
function Hex ({ cor }) {
  const ref = React.useRef(null)
  const [hex, setHex] = React.useState('')
  React.useEffect(() => { setHex(getComputedStyle(ref.current).getPropertyValue(`--ct-${cor}`).trim()) }, [cor])
  return <code ref={ref}>{hex}</code>
}

export default function Sistema () {
  const tv = cenaEdicao('tv')
  const natal = cenaEdicao('natal')
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
          <Carimbo>Estreia</Carimbo>
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

      <section aria-labelledby="v-canais">
        <div className="ct-bloco">
          <h2 id="v-canais" className="ct-h2">Canais · topo de página</h2>
        </div>
        {CANAIS.map((canal) => canal === 'cardapio' ? (
          <TopoCanal key={canal} canal={canal}>
            <Letreiro nivel={3} texto={NOME_CANAL[canal]} cor="amarelo" />
            <div className="ct-painel">
              <p className="ct-rotulo">Canal {NOME_CANAL[canal]}</p>
              <p className="ct-lead">Rosa é moldura: o texto pequeno mora neste painel creme.</p>
              <Botao>Ação do canal</Botao>
            </div>
          </TopoCanal>
        ) : (
          <TopoCanal key={canal} canal={canal}>
            <p className="ct-rotulo">Canal {NOME_CANAL[canal]}</p>
            <Letreiro nivel={3} texto={NOME_CANAL[canal]} cor={canal === 'gala' ? 'amarelo' : 'vermelho'} />
            <p className="ct-lead">Texto de apoio no tom de leitura deste canal.</p>
            <Botao>Ação do canal</Botao>
          </TopoCanal>
        ))}
      </section>

      <section className="ct-bloco" aria-labelledby="v-icones">
        <h2 id="v-icones" className="ct-h2">Ícones</h2>
        <p className="ct-nota">24 ícones ilustrados em 48 px, sempre com o nome ao lado: nenhum carrega função sozinho.</p>
        <div className="ct-vitrine__icones">
          {GRUPOS_ICONES.map(([grupo, itens]) => (
            <div key={grupo}>
              <h3 className="ct-rotulo">{grupo}</h3>
              <ul className="ct-vitrine__lista-icones">
                {itens.map(([nome, rotulo]) => (
                  <li key={nome}><IconeCartoon nome={nome} /><span>{rotulo}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <h3 className="ct-rotulo">Tamanhos de exibição</h3>
        <ul className="ct-vitrine__lista-icones ct-vitrine__lista-icones--linha">
          {[32, 48, 64].map((t) => (
            <li key={t}><IconeCartoon nome="casas" tamanho={t} /><span>{t} px</span></li>
          ))}
        </ul>
      </section>

      <section className="ct-bloco" aria-labelledby="v-cenografia">
        <h2 id="v-cenografia" className="ct-h2">Cenografia</h2>
        <p className="ct-nota">Uma peça grande por tela. A tela da TV fica vazia de propósito: o site põe o conteúdo ali.</p>
        <div className="ct-vitrine__cena">
          <figure className="ct-vitrine__tv">
            <img src={tv.src} width={tv.largura} height={tv.altura} alt="" aria-hidden="true" decoding="async" />
            <div className="ct-vitrine__tv-tela"><Placa numero="5 a 15" rotulo="de novembro" /></div>
          </figure>
          <img
            className="ct-vitrine__natal" src={natal.src} srcSet={srcSet(natal.src)} sizes="(max-width: 900px) 100vw, 60vw"
            width={natal.largura} height={natal.altura} alt="" aria-hidden="true" decoding="async"
          />
        </div>
      </section>

      <VitrineOlhinhos />

      <section aria-labelledby="v-ficha">
        <div className="ct-bloco">
          <h2 id="v-ficha" className="ct-h2">Ficha da casa · cenário por tema</h2>
          <p className="ct-aviso ct-aviso--demo">Exemplo — nome e tema são da casa; selos e combo são ilustrativos, não o cadastro real.</p>
        </div>
        {FICHAS.map(({ slug, nome, tema, selos }) => (
          <article key={slug}>
            <TopoCanal canal="elenco">
              <CenarioTema slug={slug} />
              <p className="ct-rotulo">Casa participante</p>
              <Letreiro nivel={3} tamanho="display" cor="chocolate" texto={nome} />
              <p className="ct-lead">{tema}</p>
              <ul className="ct-vitrine__selos">
                {selos.map(([icone, rotulo]) => (
                  <li key={icone} className="ct-vitrine__selo"><IconeCartoon nome={icone} tamanho={32} /><span>{rotulo}</span></li>
                ))}
              </ul>
            </TopoCanal>
            <TopoCanal canal="cardapio">
              <Letreiro nivel={4} texto="Cardápio" cor="amarelo" />
              <div className="ct-painel">
                <p className="ct-sub">Nome do combo</p>
                <p>Doce · Salgado · Bebida</p>
                <p className="ct-nota">Exemplo: o combo e o preço reais vêm do cadastro da casa.</p>
              </div>
            </TopoCanal>
          </article>
        ))}
      </section>
    </div>
  )
}

const EXPRESSOES_VITRINE = [
  ['encantado', 'Encantado', 'novidade e combo'],
  ['curioso', 'Curioso', 'dica, mapa, rota'],
  ['expectativa', 'Expectativa', 'contagem, "abre em", última chance'],
]

// Olhinhos (§10.5): as três expressões, a troca animada e o olhar seguindo o cursor. Nada aqui é página real.
function VitrineOlhinhos () {
  const [exp, setExp] = React.useState('encantado')
  return (
    <section className="ct-bloco" aria-labelledby="v-olhinhos">
      <h2 id="v-olhinhos" className="ct-h2">Olhinhos</h2>
      <p className="ct-nota">No padrão da cliente (MANUAL-CARTOON §1.3), desenhados no código. Piscam sozinhos a cada 3 a 6 segundos e param com "reduzir movimento". Um par por tela, olhando para o título, a placa ou a logo; nenhum onde a logo da edição já é grande, nem perto de formulário, endereço, ingrediente e mapa.</p>
      <ul className="ct-vitrine__olhinhos">
        {EXPRESSOES_VITRINE.map(([chave, nome, uso]) => (
          <li key={chave}>
            <Olhinhos expressao={chave} tamanho={200} />
            <p className="ct-rotulo">{nome}</p>
            <p className="ct-nota">{uso}</p>
          </li>
        ))}
      </ul>
      <div className="ct-vitrine__olhinhos-demo">
        <div>
          <h3 className="ct-rotulo">Troca de expressão</h3>
          <Olhinhos expressao={exp} tamanho={220} />
          <div className="ct-vitrine__olhinhos-botoes">
            {EXPRESSOES_VITRINE.map(([chave, nome]) => (
              <Botao key={chave} tipo={exp === chave ? 'primario' : 'secundario'} aria-pressed={exp === chave} onClick={() => setExp(chave)}>{nome}</Botao>
            ))}
          </div>
        </div>
        <div>
          <h3 className="ct-rotulo">Seguindo o cursor</h3>
          <Olhinhos expressao="encantado" olhar="cursor" lado="direita" tamanho={220} />
          <p className="ct-nota">Espelhado (lado direita) para olhar para dentro da tela.</p>
        </div>
      </div>
    </section>
  )
}
