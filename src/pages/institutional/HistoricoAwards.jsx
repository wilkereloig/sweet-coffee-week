/*
 * PÁGINA INSTITUCIONAL — Sweet Awards (redesign 2026).
 * Rotas públicas: #/sweet-awards e #/historico-sweet-awards (route 'historico-awards').
 *
 * Identidade INSTITUCIONAL do festival (chocolate + creme + roxo da página, medalhas
 * ouro/prata/bronze). Nunca o KV da edição Lovers — nada de --lovers-*, .kv-lovers
 * nem Sofia Pro. A cor da página vem de body.route-historico-awards (--scw-pagina).
 *
 * Seções (design_handoff_site_institucional/README.md → "Sweet Awards"):
 *   01 Abertura      — título + 4 números + vitrine dos 4 primeiros lugares + índice
 *   02 Vencedores    — 8 categorias × 3 colocações da edição Lovers 2026.1
 *   03 Como é decidido — Júri Técnico (2020.2–2021.2) e Sweet Lovers
 *   04 Hall          — mais premiados, barra segmentada por colocação
 *   05 Histórico     — acordeão 2019–2025, pódio completo por categoria e trilha
 *   06 Antes de 2019 — as cinco primeiras edições não tiveram premiação (dito, não escondido)
 *
 * DADOS — nada é inventado. `src/data/handoff/awardsData.js` DERIVA da fonte a cada
 * import: cruza `sweetCoffeeHistory.js` (histórico, pódios, trilhas e aliases) com
 * `loversAwardsResults.js` (pódios da 2026.1, vazios de propósito na base histórica).
 * Deixou de ser snapshot congelado em 07/08/2026 — era ele que mantinha o Hall com
 * número errado. Corrigir pódio ou alias agora é mexer só na fonte.
 * As agregações desta página contam marca por IDENTIDADE (slug de `resolveParticipant`),
 * não por string, senão `Canuto's` e `Canuto’s` virariam duas casas no hall.
 * Marca da edição: vem SEMPRE de `editionMark()` (src/data), a fonte de verdade.
 * O campo `logo` do snapshot apontava pra `/images/editions/<code>.png`, caminho
 * que nunca existiu; corrigido em jul/2026 para `/images/marcas-edicoes/<code>/logo.png`
 * e segue sem ser lido por esta página.
 *
 * FOTOGRAFIA — só pelo sistema central `src/data/imageLibrary.js`. Nenhum caminho é
 * montado aqui. `awardPhoto(nome, edição, variação)` devolve foto apenas quando o
 * vínculo marca↔combo existe no acervo (edição Lovers); para 2019–2025 devolve `null`
 * de propósito, e o histórico aparece sem fotografia em vez de tomar emprestada a
 * imagem de outra edição. O acervo NÃO tem foto rotulada por peça (doce, salgado,
 * bebida): cada card mostra o combo da marca premiada e o alt diz isso.
 */
import React from 'react'
import '../../styles/scw-awards.css'
import { AWARDS_DADOS } from '../../data/handoff/awardsData'
import { heroPhotos } from '../../data/imageLibrary'
import { HeroFotos } from '../../components/HeroFotos'
import { Marquee } from '../../components/Marquee'
import { resolveParticipant } from '../../data/participantAssets'
import { editionMark } from '../../data/editionAssets'
import { awardPhoto, RESERVA } from '../../data/imageLibrary'
import ScwIcon from '../../components/scw-icons/ScwIcon'

/* ---------------------------------------------------------------------------
   Derivações da base (estáticas: AWARDS_DADOS não muda em runtime)
   ------------------------------------------------------------------------ */

const EDICOES = AWARDS_DADOS.edicoes
const LOVERS = EDICOES.find((e) => e.code === '2026.1') || null
// Histórico = demais edições, da mais recente para a mais antiga.
const HISTORICO = EDICOES.filter((e) => e.code !== '2026.1').slice().reverse()

/* Identidade da marca para AGREGAR (hall e contagem de marcas): o slug do acervo
   quando a casa é conhecida, senão o próprio nome. Sem isso, uma variação de grafia
   ("Canuto’s" × "Canuto's") vira duas marcas distintas nos números. */
const identidade = (nome) => resolveParticipant(nome).slug || nome

/* Banda de foto do herói no celular — mesma fonte central das outras rotas. */
const FOTOS_HERO = heroPhotos('historico-awards')

/* Faixa de palavras abaixo do herói, como em Home, Participar e Apoiar. Aqui
   ela carrega as CATEGORIAS da última edição: elas viviam num índice dentro do
   próprio herói e vieram para cá (pedido do Wilke, 21/08/2026).
   Derivadas de `LOVERS.cats`, nunca digitadas — se a próxima edição mudar de
   categorias, a faixa muda junto. O marquee compõe em caixa-alta, então o nome
   entra como está na fonte. */
const PALAVRAS = LOVERS ? LOVERS.cats.map((c) => c.nome) : []

/* Números do herói, contados da própria base (nunca digitados à mão).
   ⚠️ `premios` conta PRÊMIOS ENTREGUES: um por marca em cada colocação, e num
   empate cada marca leva o seu. Não confundir com três outras contagens que a
   mesma base produz e que já enganaram aqui:
   · 249 posições de pódio (as linhas 1º/2º/3º, empate contando uma vez);
   · 83 pares categoria×edição — era ESTE que aparecia como "categorias
     julgadas", e ele conta a mesma categoria duas vezes quando ela teve Júri
     Técnico e Sweet Lovers na mesma edição;
   · 10 categorias distintas em dez anos.
   Os 271 batem com o acervo oficial (§9.1). */
const ESTATISTICAS = (() => {
  const marcas = new Set()
  let premios = 0
  for (const e of EDICOES) {
    for (const c of e.cats) for (const p of c.pod) for (const n of p.nomes) {
      premios++
      marcas.add(identidade(n))
    }
  }
  return { edicoes: EDICOES.length, premios, marcas: marcas.size }
})()

// Hall: TODAS as colocações (1º, 2º e 3º) somando Júri Técnico e Sweet Lovers.
const HALL = (() => {
  const cont = new Map()
  for (const e of EDICOES) {
    for (const c of e.cats) {
      for (const p of c.pod) {
        for (const n of p.nomes) {
          const chave = identidade(n)
          const r = cont.get(chave) || { nome: n, p1: 0, p2: 0, p3: 0, total: 0 }
          if (p.pos === 1) r.p1++
          else if (p.pos === 2) r.p2++
          else r.p3++
          r.total++
          cont.set(chave, r)
        }
      }
    }
  }
  return [...cont.values()]
    .sort((a, b) => b.total - a.total || b.p1 - a.p1 || a.nome.localeCompare(b.nome))
    .slice(0, 10)
})()

/* ---------------------------------------------------------------------------
   Fotos — tudo vem do sistema central (src/data/imageLibrary.js).

   Uma foto por card, na chave '<índice da categoria>:<colocação>'. A `variação`
   avança por MARCA, então uma casa que vence várias categorias (O Maestro Café
   vence três) mostra um combo diferente em cada card, em vez da mesma imagem
   repetida. Em empate a foto é a da primeira marca da colocação — o alt do
   sistema central nomeia justamente essa casa, e a legenda lista as duas.
   ------------------------------------------------------------------------ */

const FOTOS = (() => {
  const mapa = new Map()
  const usos = new Map()
  ;(LOVERS ? LOVERS.cats : []).forEach((c, ci) => {
    for (const p of c.pod) {
      const nome = p.nomes[0]
      const chave = identidade(nome)
      const variacao = usos.get(chave) || 0
      usos.set(chave, variacao + 1)
      // Fora da edição Lovers awardPhoto devolve null — o acervo não liga marca
      // e foto nas edições antigas, e emprestar imagem seria invenção.
      mapa.set(`${ci}:${p.pos}`, awardPhoto(nome, LOVERS ? LOVERS.code : '', variacao))
    }
  })
  return mapa
})()

/* ---------------------------------------------------------------------------
   Peças visuais
   ------------------------------------------------------------------------ */

// Medalha por colocação — codifica o resultado (não é sticker). Paleta
// fechada (redesign 29/07/2026): numeral SEMPRE chocolate. 3º é laranja, não
// marrom — marrom sobre chocolate dá ~1,5:1 (falha como emblema E como texto
// solto no Hall, que tem fundo chocolate); laranja fecha 4,8:1 nos dois usos
// e ainda lê melhor como "bronze" que um marrom escuro.
const MEDALHA = { 1: 'var(--scw-amarelo)', 2: 'var(--scw-cyan)', 3: 'var(--scw-laranja)' }
const medalha = (pos) => MEDALHA[pos] || 'var(--scw-laranja)'

// Cores dos selos de categoria — só paleta oficial. Tinta do ícone por fundo:
// roxo/magenta pedem creme (choco sobre eles falha, 1,45:1 e 3,8:1).
const PALETA_SELO = [
  { cor: 'var(--scw-roxo)',    tinta: 'var(--scw-creme)' },
  { cor: 'var(--scw-magenta)', tinta: 'var(--scw-creme)' },
  { cor: 'var(--scw-cyan)',    tinta: 'var(--scw-choco)' },
  { cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)' },
  { cor: 'var(--scw-laranja)', tinta: 'var(--scw-choco)' },
  { cor: 'var(--scw-marrom)',  tinta: 'var(--scw-creme)' },
]

// Ícones de linha por categoria (decorativos, aria-hidden no selo).
const ICONES = {
  'Melhor Combo': <><rect x="4" y="13" width="7" height="7" rx="1.6" /><rect x="13" y="9" width="7" height="11" rx="1.6" /><circle cx="8" cy="7" r="3" /></>,
  'Melhor Doce': <><path d="M6 11h12l-1.6 8.4a1.4 1.4 0 0 1-1.4 1.1H9a1.4 1.4 0 0 1-1.4-1.1L6 11Z" /><path d="M7 11a5 5 0 0 1 10 0" /><path d="M12 4v3" /></>,
  'Melhor Salgado': <><path d="M3.5 15.5c2-6 6-9 8.5-9s6.5 3 8.5 9" /><path d="M3.5 15.5h17" /><path d="M6 19h12" /></>,
  'Melhor Bebida': <><path d="M7 8h10l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H9.7a1.5 1.5 0 0 1-1.5-1.3L7 8Z" /><path d="M13 8 15 3" /><path d="M8 13h8" /></>,
  'Melhor Atendimento': <><path d="M5 17h14" /><path d="M6.5 17a5.5 5.5 0 0 1 11 0" /><path d="M12 6v2.5" /><circle cx="12" cy="4.6" r="1.2" /><path d="M9 20h6" /></>,
  'Melhor Apresentação': <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 15l4.5-4 3.5 3 3-2.5L20 15" /><circle cx="9" cy="9.5" r="1.4" /></>,
  'Melhor Criatividade': <><path d="M12 3.5a6 6 0 0 0-3.4 10.9V17h6.8v-2.6A6 6 0 0 0 12 3.5Z" /><path d="M9.6 20h4.8" /></>,
  'Encantamento em Loja': <><path d="M4 9h16v11H4z" /><path d="M4 9l2-4h12l2 4" /><path d="M10 20v-6h4v6" /></>,
}

function SeloCategoria({ nome, cor, tinta }) {
  return (
    <span className="swa-selo" style={{ '--swa-selo': cor, '--swa-selo-tinta': tinta }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {ICONES[nome] || ICONES['Melhor Combo']}
      </svg>
    </span>
  )
}

// Foto do acervo com reserva honesta quando não há imagem (§7/§8). Recebe o objeto
// pronto do sistema central: `src`, `alt` contextual e `position` (ponto focal por
// imagem, para o recorte não cortar o combo).
function FotoAcervo({ foto }) {
  const [quebrada, setQuebrada] = React.useState(false)
  if (!foto || quebrada) return <span className="swa-reserva">{RESERVA}</span>
  return (
    <img
      src={foto.src}
      alt={foto.alt}
      style={{ objectPosition: foto.position }}
      loading="lazy"
      decoding="async"
      onError={() => setQuebrada(true)}
    />
  )
}

// Logo real da marca (resolveParticipant) com fallback em iniciais — nunca inventa.
// brandColor não é usada: é token da edição Lovers e esta página é institucional.
function MarcaParticipante({ nome }) {
  const m = resolveParticipant(nome)
  const [quebrada, setQuebrada] = React.useState(false)
  return (
    <span className="swa-marca" aria-hidden="true">
      {m.logo && !quebrada
        ? <img src={m.logo} alt="" loading="lazy" decoding="async" onError={() => setQuebrada(true)} />
        : <span>{m.fallback}</span>}
    </span>
  )
}

// Marca da edição no acordeão: logo real ou o tema como reserva textual.
function MarcaEdicao({ code, tema }) {
  const marca = editionMark(code)
  const [quebrada, setQuebrada] = React.useState(false)
  return (
    <span className="swa-edicao__marca" aria-hidden="true">
      {marca.logo && !quebrada
        ? <img src={marca.logo} alt="" loading="lazy" decoding="async" onError={() => setQuebrada(true)} />
        : <span>{tema || code}</span>}
    </span>
  )
}

const Seta = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 6.5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// 03 — trilha do tempo de "quem dá a nota" (três momentos, cronológico).
const TRILHA = [
  { ano: '2019', titulo: 'Nasce com uma categoria', cor: 'var(--scw-amarelo)', tinta: 'var(--scw-choco)',
    traco: <><circle cx="12" cy="9" r="5.4" /><path d="M9.2 13.9 8 21l4-2.1 4 2.1-1.2-7.1" /></>,
    texto: 'O primeiro pódio premia um combo só. A pergunta era simples: qual foi o melhor da edição?' },
  { ano: '2020.2 – 2021.2', titulo: 'Júri Técnico entra em cena', cor: 'var(--scw-cyan)', tinta: 'var(--scw-choco)',
    traco: <path d="M4 8h16M12 8v11M8.5 19h7M4 8 1.9 12.2h4.2L4 8M20 8l-2.1 4.2h4.2L20 8" />,
    texto: 'Por três edições, profissionais convidados avaliam execução, equilíbrio e acabamento em paralelo ao público.' },
  { ano: '2022 em diante', hoje: true, titulo: 'Só Sweet Lovers decide', cor: 'var(--scw-roxo)', tinta: 'var(--scw-creme)',
    traco: <path d="M12 20.3s-7.3-4.5-7.3-9.6A3.9 3.9 0 0 1 12 8.1a3.9 3.9 0 0 1 7.3 2.6c0 5.1-7.3 9.6-7.3 9.6Z" />,
    texto: 'Quem prova dá nota ao que comeu. O pódio sai da média dessas notas — e de mais nada.' },
]

const ROTULO_TRILHA = { juri_tecnico: 'Júri Técnico', sweet_lovers: 'Sweet Lovers' }
const COR_TRILHA = { juri_tecnico: 'var(--scw-cyan)', sweet_lovers: 'var(--scw-magenta)' }
// Magenta puro só sustenta 3,8:1 com tinta chocolate — insuficiente pra texto
// pequeno (pílula de 10px). Cyan sustenta choco (6,18:1); magenta pede creme.
const TINTA_TRILHA = { juri_tecnico: 'var(--scw-choco)', sweet_lovers: 'var(--scw-creme)' }

// Agrupa as categorias de uma edição por trilha, preservando a ordem dos dados.
function agruparPorTrilha(cats) {
  const grupos = []
  const indice = new Map()
  for (const c of cats) {
    const t = c.trilha || ''
    if (!indice.has(t)) { indice.set(t, { trilha: t, cats: [] }); grupos.push(indice.get(t)) }
    indice.get(t).cats.push(c)
  }
  return grupos
}

/* ---------------------------------------------------------------------------
   02 — card de colocação (foto + medalha + marca)
   ------------------------------------------------------------------------ */

function CardColocacao({ colocacao, foto }) {
  const primeiro = colocacao.pos === 1
  const marca = colocacao.nomes.join(' e ') // empates ficam na MESMA colocação
  return (
    <li
      className={`swa-card${primeiro ? ' swa-card--primeiro' : ''}`}
      style={{ '--swa-medalha': medalha(colocacao.pos) }}
    >
      <span className="swa-card__foto"><FotoAcervo foto={foto} /></span>
      <span className="swa-card__legenda">
        <span className="swa-card__cabeca">
          <span className="swa-medalha" aria-hidden="true">{colocacao.pos}º</span>
          <span className="swa-card__rotulo">{primeiro ? 'Primeiro lugar' : `${colocacao.pos}º lugar`}</span>
        </span>
        <b className="swa-card__marca">{marca}</b>
      </span>
    </li>
  )
}

/* ---------------------------------------------------------------------------
   05 — acordeão de uma edição
   ------------------------------------------------------------------------ */

function EdicaoAcordeao({ edicao, aberto, onAlternar }) {
  const id = `swa-edicao-${edicao.code.replace('.', '-')}`
  const grupos = agruparPorTrilha(edicao.cats)
  const varias = grupos.length > 1
  return (
    <article className="swa-edicao">
      <h3 className="swa-edicao__h">
        <button
          type="button"
          className="swa-edicao__botao"
          aria-expanded={aberto}
          aria-controls={`${id}-painel`}
          id={`${id}-botao`}
          onClick={onAlternar}
        >
          <MarcaEdicao code={edicao.code} tema={edicao.tema} />
          <span className="swa-edicao__id">
            <span className="swa-edicao__titulo">{edicao.code} · {edicao.tema}</span>
            <span className="swa-edicao__nota">{edicao.nota}</span>
          </span>
          <span className="swa-edicao__cats">
            <b>{edicao.cats.length}</b>
            <span>categorias</span>
          </span>
          <span className="swa-edicao__seta" aria-hidden="true"><Seta /></span>
        </button>
      </h3>

      {aberto && (
        <div className="swa-edicao__painel" id={`${id}-painel`} role="region" aria-labelledby={`${id}-botao`}>
          <p className="swa-edicao__periodo">{edicao.periodo}</p>
          {grupos.map((g) => (
            <div className="swa-grupo" key={g.trilha || 'unica'}>
              {varias && ROTULO_TRILHA[g.trilha] && (
                <span className="swa-grupo__rotulo" style={{ '--swa-grupo': COR_TRILHA[g.trilha], '--swa-grupo-tinta': TINTA_TRILHA[g.trilha] }}>
                  {ROTULO_TRILHA[g.trilha]}
                </span>
              )}
              <ul className="swa-hist-cats">
                {g.cats.map((c) => (
                  <li className="swa-hist-cat" key={`${g.trilha}-${c.nome}`}>
                    <b>{c.nome}</b>
                    {c.pod.length > 0 ? (
                      <ol className="swa-hist-podio">
                        {c.pod.map((p) => (
                          <li key={p.pos}>
                            <span className="swa-hist-medalha" style={{ '--swa-medalha': medalha(p.pos) }} aria-hidden="true">{p.pos}</span>
                            <span className={`swa-hist-nome${p.pos === 1 ? ' swa-hist-nome--primeiro' : ''}`}>
                              <span className="swa-sr">{p.pos}º lugar: </span>{p.nomes.join(' + ')}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <span className="swa-hist-vazio">Resultado ainda não registrado.</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Menção Honrosa: reconhecimento SEM ordem de colocação — por isso
              não é pódio, não tem medalha e não entra no Hall. Só a 2021.1 tem,
              e é a primeira aparição do encantamento em loja na história do
              prêmio, dois anos antes de virar categoria. */}
          {edicao.mencao && (
            <div className="swa-mencao">
              <span className="swa-mencao__rotulo">Menção Honrosa · {edicao.mencao.categoria}</span>
              <p className="swa-mencao__nomes">{edicao.mencao.nomes.join(' · ')}</p>
              <p className="swa-mencao__nota">Reconhecimento sem ordem de colocação — não conta como pódio.</p>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

/* ---------------------------------------------------------------------------
   Página
   ------------------------------------------------------------------------ */

export function HistoricoAwardsPage() {
  const [aberto, setAberto] = React.useState('2025')
  const cats = LOVERS ? LOVERS.cats : []

  const maiorHall = HALL[0] ? HALL[0].total : 1
  const largura = (n) => `${(n / maiorHall) * 100}%`

  return (
    <>
      {/* 01 — ABERTURA. Título, lead e três números, e nada mais: a vitrine dos
          quatro primeiros lugares saiu em 06/08/2026 (pedido do Wilke) — as
          mesmas fotos abrem a seção 02, logo abaixo. A banda de foto é a
          imagem do herói no celular, onde a reserva de topo de 216px era roxo
          chapado (pedido do Wilke, 30/07/2026). */}
      <section className="swa-hero scw-hero-veu" aria-labelledby="swa-titulo">
        <HeroFotos fotos={FOTOS_HERO} />
        <div className="swa-hero__texto">
          <span className="scw-pill scw-pill--pagina">Sweet Awards · desde 2019</span>
          <h1 className="scw-h1" id="swa-titulo">O prêmio que o público entrega.</h1>
          <p className="scw-lead">
            Quem percorre a rota prova, avalia e elege. De uma categoria única em 2019 a oito pódios
            na edição dos dez anos, o Sweet Awards virou o encerramento de cada temporada do festival.
          </p>
          <dl className="swa-numeros">
            <div>
              <dt>Edições premiadas</dt>
              <dd>{ESTATISTICAS.edicoes}</dd>
            </div>
            <div>
              <dt>Prêmios entregues</dt>
              <dd>{ESTATISTICAS.premios}</dd>
            </div>
            <div>
              <dt>Marcas premiadas</dt>
              <dd>{ESTATISTICAS.marcas}</dd>
            </div>
          </dl>
        </div>
      </section>

      <Marquee palavras={PALAVRAS} />

      {/* 02 — VENCEDORES DA EDIÇÃO LOVERS 2026.1 */}
      <section className="scw-secao scw-secao--creme">
        <div className="swa-cab">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="premios/trofeu" tamanho={20} />Resultado oficial · 2026.1 Lovers</span>
            <h2 className="scw-h2">Os vencedores dos dez anos</h2>
          </div>
          <p className="swa-apoio">
            Oito categorias decididas pelos Sweet Lovers entre 4 e 14 de junho de 2026.
            Empates aparecem na mesma colocação.
          </p>
        </div>

        <div className="swa-cats">
          {cats.map((c, ci) => (
            <article key={c.nome}>
              <div className="swa-cat__cab">
                <SeloCategoria nome={c.nome} {...PALETA_SELO[ci % PALETA_SELO.length]} />
                <h3 className="scw-h3 swa-cat__nome">{c.nome}</h3>
                {c.desc && <p className="swa-cat__desc">{c.desc}</p>}
              </div>
              <ol className="swa-podio">
                {c.pod.map((p) => (
                  <CardColocacao key={p.pos} colocacao={p} foto={FOTOS.get(`${ci}:${p.pos}`)} />
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      {/* 03 — QUEM DÁ A NOTA (trilha do tempo: cronológico, não dois cards gêmeos) */}
      <section className="scw-secao scw-secao--bege">
        <div className="swa-cab">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="premios/voto" tamanho={20} />Como é decidido</span>
            <h2 className="scw-h2">Quem dá a nota</h2>
          </div>
          <p className="swa-apoio">
            A régua mudou três vezes desde 2019. Hoje, quem decide é quem percorre a rota.
          </p>
        </div>

        <div className="swa-trilha">
          {TRILHA.map((m) => (
            <article key={m.ano}>
              <span className="swa-trilha__selo" aria-hidden="true" style={{ background: m.cor, color: m.tinta }}>
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{m.traco}</svg>
              </span>
              <div className="swa-trilha__ano">
                <span>{m.ano}</span>
                {m.hoje && <span className="swa-trilha__hoje">hoje</span>}
              </div>
              <b className="swa-trilha__titulo">{m.titulo}</b>
              <p className="swa-trilha__texto">{m.texto}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 04 — HALL DOS MAIS PREMIADOS (participantes, nunca edições entre si) */}
      <section className="scw-secao scw-secao--choco swa-escura">
        <div className="swa-cab">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="premios/medalha" tamanho={20} />Hall dos mais premiados</span>
            <h2 className="scw-h2">Quem mais subiu ao pódio</h2>
          </div>
          <p className="swa-apoio">
            Todas as colocações conquistadas — 1º, 2º e 3º lugares — em todas as edições com
            premiação registrada, somando Júri Técnico e Sweet Lovers.
          </p>
        </div>

        <ul className="swa-legenda">
          {[1, 2, 3].map((pos) => (
            <li key={pos} style={{ '--swa-medalha': medalha(pos) }}>
              <i aria-hidden="true" />{pos}º lugar
            </li>
          ))}
        </ul>

        <ol className="swa-hall">
          {HALL.map((h, i) => (
            <li key={h.nome}>
              <span className="swa-hall__rank" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <MarcaParticipante nome={h.nome} />
              <span className="swa-hall__id">
                <b className="swa-hall__nome">{h.nome}</b>
                <span className="swa-barra" aria-hidden="true">
                  <span style={{ width: largura(h.p1), background: medalha(1) }} />
                  <span style={{ width: largura(h.p2), background: medalha(2) }} />
                  <span style={{ width: largura(h.p3), background: medalha(3) }} />
                </span>
              </span>
              <span className="swa-hall__cont">
                <span style={{ color: medalha(1) }}>{h.p1}×1º</span>
                <span style={{ color: medalha(2) }}>{h.p2}×2º</span>
                <span style={{ color: medalha(3) }}>{h.p3}×3º</span>
                <b className="swa-hall__total">
                  {h.total}<span className="swa-sr"> colocações no total</span>
                </b>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* 05 — HISTÓRICO COMPLETO 2019–2025 */}
      <section className="scw-secao scw-secao--creme">
        <div className="swa-cab">
          <div>
            <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="simbolos/memoria" tamanho={20} />Histórico completo · 2019 a 2025</span>
            <h2 className="scw-h2">Todos os pódios, edição por edição</h2>
          </div>
          <p className="swa-apoio">
            Da estreia em 2019, com categoria única, às quinze categorias da edição Terras
            Potiguares. Abra uma edição para ver os resultados. Nessas edições não é possível
            saber qual marca aparece em cada foto, então os pódios aparecem sem fotografia.
          </p>
        </div>

        <div className="swa-edicoes">
          {HISTORICO.map((e) => (
            <EdicaoAcordeao
              key={e.code}
              edicao={e}
              aberto={aberto === e.code}
              onAlternar={() => setAberto((atual) => (atual === e.code ? null : e.code))}
            />
          ))}
        </div>
      </section>

      {/* 06 — ANTES DE 2019: ausência dita com todas as letras */}
      <section className="scw-secao scw-secao--compacta scw-secao--bege">
        <div className="swa-antes">
          <span className="scw-rotulo scw-rotulo--com-icone"><ScwIcon nome="topicos/legado" tamanho={20} />Antes de 2019</span>
          <h2 className="scw-h2">As cinco primeiras edições não tiveram premiação</h2>
          <p className="scw-corpo">
            De 2016 a 2018.2, o festival era um circuito de descoberta: combo a preço único, sem disputa.
            O Sweet Awards nasceu na Pâtisserie Francesa, em 2019, quando o público pediu para eleger
            o melhor combo — e nunca mais saiu do calendário.
          </p>
        </div>
      </section>
    </>
  )
}
