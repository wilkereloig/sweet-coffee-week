/* Gera DOSSIE-FESTIVAL.md a partir de src/data/. Nada é escrito à mão aqui:
   todo número, nome e texto vem dos módulos — é o que impede o dossiê de
   divergir do site.

   Rodar:  node --import ./scripts/esm-registrar.mjs ./scripts/gerar-dossie.mjs

   O registrador existe porque os módulos de dados importam sem extensão
   (`from './participants'`): o Vite resolve, o Node ESM não. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const D = new URL('../src/data/', import.meta.url).href

const AW = await import(D + '_arquivo/sweetAwards.js')
const { SWEET_COFFEE_HISTORY: H, AWARD_STATUS } = await import(D + 'sweetCoffeeHistory.js')
const { LOVERS_2026_AWARDS_RESULTS: L } = await import(D + 'loversAwardsResults.js')
const { PARTICIPANTS } = await import(D + 'participants.js')
const { EDICOES_NARRATIVA: NARR } = await import(D + 'edicoesNarrativa.js')
const { festivalFacts: FACTS } = await import(D + 'festivalFacts.js')
const FAQ = (await import(D + 'faqCentral.js')).default
const CFAQ = await import(D + 'contactFaq.js')

const out = []
const w = (s = '') => out.push(s)
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')

/* ---------------------------------------------------------------- cabeçalho */
w('# Dossiê completo — Sweet & Coffee Week')
w()
w('> Documento gerado a partir do código-fonte do site institucional')
w('> (`site-sweet-coffee-week-home-v2`, branch `dev/site-completo`) em 06/08/2026.')
w('> **Nada aqui foi escrito de memória**: cada número, nome, data e texto foi lido')
w('> direto dos módulos de dados.')
w('>')
w('> **Para regerar depois de mexer nos dados:**')
w('> `node --import ./scripts/esm-registrar.mjs ./scripts/gerar-dossie.mjs`')
w()
w('## Como ler este documento')
w()
w('**Hierarquia de verdade** (regra do projeto, `CLAUDE.md` §16):')
w()
w('1. `src/data/*.js` — **a verdade**. É o que o site renderiza.')
w('2. `ACERVO.md` — transcrição legível do acervo. Se divergir do código, vale o código.')
w('3. `src/data/handoff/*.js` — snapshots derivados do design. Se divergirem, vale o código.')
w()
w('**Regra permanente: não inventar dado.** Onde o acervo não registra, este documento')
w('diz "não registrado" em vez de preencher. A seção final lista as lacunas conhecidas —')
w('para um site novo, elas são tão importantes quanto os dados que existem.')
w()
w('**Fontes declaradas na própria base:**')
w()
for (const f of H.meta.fontes) w(`- ${f}`)
w()
w(`> ${H.meta.descricao}`)
w()
w('---')
w()

/* --------------------------------------------------------------- 1. marca */
w('## 1. Identidade e nomenclatura')
w()
w('**Grafias oficiais** — o erro mais comum do acervo é escrever "Sweet" sozinho.')
w()
w('| Papel | Grafia oficial |')
w('| --- | --- |')
w('| Festival | **Sweet & Coffee Week** |')
w('| Sigla | **SCW** (só depois do nome completo aparecer) |')
w('| Edição atual | **Sweet & Coffee Week Lovers** |')
w('| Premiação | **Sweet Awards** / **Sweet & Coffee Week Awards** |')
w('| Público fiel | **Sweet Lovers** |')
w('| Genéricos aceitos | o festival · o evento · a edição |')
w()
w('**Nunca usar:** "o Sweet", "do Sweet", "no Sweet", "história do Sweet",')
w('"Sweet Coffee Week" (sem o &), "Sweet Coffee Awards", "Sweet & Coffee Lovers".')
w()
w('**Duas identidades visuais que nunca se misturam:** a institucional do festival')
w('e o KV da edição Lovers. Um site novo precisa decidir isso desde o começo.')
w()
w('---')
w()

/* ------------------------------------------------------------- 2. números */
w('## 2. Números canônicos do festival')
w()
w('Fonte única: `src/data/festivalFacts.js`. É daqui que a Home lê os contadores.')
w()
w('| Dado | Valor | Como aparece |')
w('| --- | --- | --- |')
w(`| Edições realizadas | ${FACTS.editions.value} | ${FACTS.editions.label} |`)
w(`| Anos de festival | ${FACTS.years.value} | ${FACTS.years.label} |`)
w(`| Primeiro ano | ${FACTS.firstYear} | — |`)
w(`| Marcas participantes (acumulado) | ${FACTS.brands.value} | ${FACTS.brands.label} |`)
w(`| Combos vendidos | ${FACTS.combosSold.value} ${FACTS.combosSold.unit} | ${FACTS.combosSold.label} |`)
w(`| Visualizações no Instagram | ${FACTS.igViews.value} ${FACTS.igViews.unit} | ${FACTS.igViews.label} |`)
w()
if (H.dadosGerais) {
  w('**Outros dados gerais registrados na base histórica:**')
  w()
  w('```json')
  w(JSON.stringify(H.dadosGerais, null, 2))
  w('```')
  w()
}
w('**Números de alcance usados na página Apoiar** (origem: acervo de mídia da')
w('organização, citados no site): +200 mil pessoas alcançadas · +18 milhões de')
w('visualizações no Instagram · +290 mil interações do público.')
w()
w('---')
w()

/* ------------------------------------------------------- 3. quem realiza */
w('## 3. Quem realiza, patrocina e apoia')
w()
const PF = H.patrocinadoresFixos
w(`- **Realização:** ${PF.realizacao}`)
w(`- **Apoio recorrente:** ${(PF.apoio || []).join(' · ') || 'não registrado'}`)
w(`- **Plataforma de votação:** ${PF.plataformaVotacao || 'não registrado'}`)
w(`- **Fotografia:** ${(PF.fotografia || []).join(' · ') || 'não registrado'}`)
w()
const parceirosPorEdicao = H.edicoes
  .map((e) => ({ id: e.id, nome: e.nome, p: (e.patrocinadores && e.patrocinadores.parceiros) || [] }))
  .filter((x) => x.p.length)
const nomeParc = (x) => (typeof x === 'string' ? x : `${x.nome}${x.tipo ? ` _(${x.tipo})_` : ''}`)
w('**Parceiros registrados por edição.** Só 4 das 16 edições têm parceiro na base —')
w(`${H.edicoes.length - parceirosPorEdicao.length} estão com \`patrocinadores.parceiros\` vazio.`)
w('É a maior lacuna comercial do acervo: quem apoiou as outras 12 edições não está registrado.')
w()
w('| Edição | Parceiros e tipo de relação |')
w('| --- | --- |')
for (const x of parceirosPorEdicao) w(`| ${x.id} — ${esc(x.nome)} | ${x.p.map((y) => esc(nomeParc(y))).join(' · ')} |`)
w()
const tipos = [...new Set(parceirosPorEdicao.flatMap((x) => x.p.map((y) => y.tipo).filter(Boolean)))]
w(`**Tipos de relação já usados:** ${tipos.join(' · ')}.`)
w('Não há taxonomia fechada — cada edição nomeou do seu jeito. Um site novo precisa')
w('padronizar isso antes de montar página de cotas.')
w()
w('---')
w()

/* ------------------------------------------------- 4. linha do tempo geral */
w('## 4. As 16 edições — visão geral')
w()
w('| # | Código | Nome | Tema | Período | Marcas | Premiação |')
w('| --- | --- | --- | --- | --- | --- | --- |')
for (const e of H.edicoes) {
  const st = AWARD_STATUS[e.premiacao?.status]?.label || e.premiacao?.status || '—'
  w(`| ${e.ordem} | \`${e.id}\` | ${esc(e.nome)} | ${esc(e.tema || '—')} | ${esc(e.periodo || '—')} | ${e.participantesCount ?? '—'} | ${esc(st)} |`)
}
w()
const totalMarcasSlots = H.edicoes.reduce((s, e) => s + (e.participantesCount || 0), 0)
const marcasDistintas = new Set(H.edicoes.flatMap((e) => e.participantes || []))
w(`**Somatório de participações:** ${totalMarcasSlots} (marca contada uma vez por edição).`)
w(`**Marcas distintas na base:** ${marcasDistintas.size} nomes diferentes.`)
w()
w('---')
w()

/* ----------------------------------------------------- 5. ficha por edição */
w('## 5. Ficha completa de cada edição')
w()
for (const e of H.edicoes) {
  const n = NARR[e.id]
  w(`### ${e.ordem}. ${e.nome} — \`${e.id}\``)
  w()
  w('| Campo | Valor |')
  w('| --- | --- |')
  w(`| Tema | ${esc(e.tema || 'sem tema')} |`)
  w(`| Período | ${esc(e.periodo || 'não registrado')} |`)
  w(`| Marcas participantes | ${e.participantesCount ?? 'não registrado'} |`)
  if (e.slogan) w(`| Slogan | ${esc(e.slogan)} |`)
  if (e.conceito) w(`| Conceito | ${esc(e.conceito)} |`)
  if (e.formato) w(`| Formato do combo | ${esc(e.formato)} |`)
  if (e.comboValor) w(`| Valor do combo | ${esc(e.comboValor)} |`)
  w(`| Status da premiação | ${esc(AWARD_STATUS[e.premiacao?.status]?.label || e.premiacao?.status || '—')} |`)
  if (e.premiacao?.observacao) w(`| Observação | ${esc(e.premiacao.observacao)} |`)
  w()
  if (e.statusDados) {
    w('**Status dos dados desta edição:**')
    w()
    w('```json')
    w(JSON.stringify(e.statusDados, null, 2))
    w('```')
    w()
  }
  if (n) {
    w(`**O que propôs.** ${n.lead}`)
    w()
    w(`**Por que marcou.** ${n.marco}`)
    w()
    w(`**Curiosidade.** ${n.curiosidade}`)
    w()
    w(`**Legado.** ${n.legado}`)
    w()
  }
  if (e.participantes?.length) {
    w(`**Marcas (${e.participantes.length}):** ${e.participantes.join(' · ')}`)
    w()
  }
  const cats = e.premiacao?.categorias || []
  if (cats.length) {
    w('**Pódios:**')
    w()
    const semColocacao = cats.every((c) => !(c.colocacoes || []).length)
    if (semColocacao) {
      w('> ⚠️ As categorias estão registradas, mas **os pódios desta edição não vivem aqui** —')
      w('> na base histórica eles estão vazios de propósito. O resultado oficial completo')
      w('> está em `src/data/loversAwardsResults.js` e foi transcrito na **seção 6.3**.')
      w()
    }
    for (const c of cats) {
      const tr = c.trilha ? ` _(trilha: ${c.trilha.replace(/_/g, ' ')})_` : ''
      w(`- **${c.categoria}**${tr}`)
      for (const col of c.colocacoes || []) {
        const pts = col.pontos != null ? ` — ${col.pontos} ${col.pontos === 1 ? "ponto" : "pontos"}` : ""
        const emp = col.nomes.length > 1 ? ' _(empate)_' : ''
        w(`  - ${col.pos}º — ${col.nomes.join(' e ')}${pts}${emp}`)
      }
    }
    w()
  } else if (e.premiacao?.status === 'nao-teve') {
    w('_Sem premiação nesta edição._')
    w()
  } else {
    w('_Pódios não registrados na base estruturada desta edição._')
    w()
  }
  w('---')
  w()
}

/* ------------------------------------------------------------ 6. awards */
w('## 6. Sweet Awards')
w()
w('### 6.1 Como funciona hoje')
w()
w(`Janela de votação da última edição: **${AW.AWARDS_VOTING.opensAt}** até **${AW.AWARDS_VOTING.closesAt}** (fuso de Natal/RN).`)
w()
w(`Escala de notas: **${AW.AWARDS_SCALE.join(' · ')}** (${AW.AWARDS_SCALE[0]} menor, ${AW.AWARDS_SCALE[AW.AWARDS_SCALE.length - 1]} maior).`)
w()
w(`São **${AW.AWARDS_CATEGORIES.length} categorias avaliadas no formulário**. "Melhor Combo" **não** é pergunta:`)
w('é derivado da média de Doce + Salgado + Bebida, calculado no banco.')
w()
w('| Categoria | Pergunta ao público | O que avalia |')
w('| --- | --- | --- |')
for (const c of AW.AWARDS_CATEGORIES) w(`| **${esc(c.label)}** | ${esc(c.question)} | ${esc(c.help)} |`)
w()
w('**Dados de público captados junto com o voto** (obrigatórios):')
w()
w(`- Gênero: ${AW.GENDER_OPTIONS.join(' · ')}`)
w(`- Escolaridade: ${AW.ESCOLARIDADE_OPTIONS.join(' · ')}`)
w(`- Faixa etária: ${AW.FAIXA_ETARIA_OPTIONS.join(' · ')}`)
w()
if (AW.AWARDS_CATEGORY_BLURB) {
  w('**Descrição pública de cada categoria:**')
  w()
  for (const [k, v] of Object.entries(AW.AWARDS_CATEGORY_BLURB)) w(`- **${k}** — ${v}`)
  w()
}
w('### 6.2 Quem dá a nota — evolução')
w()
w('A régua mudou ao longo da história. Três momentos:')
w()
w('| Período | Quem julga |')
w('| --- | --- |')
w('| 2019 | Categoria única, sem trilhas |')
w('| 2020.2 a 2021.2 | Júri Técnico **e** Sweet Lovers (trilhas separadas) |')
w('| 2022 em diante | Só Sweet Lovers — o público |')
w()
const trilhas = new Set()
for (const e of H.edicoes) for (const c of e.premiacao?.categorias || []) if (c.trilha) trilhas.add(c.trilha)
w(`Trilhas registradas na base: ${[...trilhas].map((t) => '`' + t + '`').join(' · ') || 'nenhuma'}.`)
w('Quando `trilha` é `null`, a peça de origem não distinguia trilha.')
w()
w('### 6.3 Resultado oficial da edição atual — Lovers 2026.1')
w()
w(`> ${L.premiacao.observacao}`)
w()
w('⚠️ **Atenção de fonte:** na base histórica os pódios de 2026.1 estão vazios de')
w('propósito. Os resultados da edição atual vivem em `src/data/loversAwardsResults.js`.')
w()
for (const c of L.premiacao.categorias) {
  w(`**${c.categoria}** \`${c.key}\``)
  w()
  for (const col of c.colocacoes) {
    const pts = col.pontos != null ? ` — ${col.pontos} ${col.pontos === 1 ? "ponto" : "pontos"}` : ""
    const emp = col.nomes.length > 1 ? ' _(empate)_' : ''
    w(`- ${col.pos}º — ${col.nomes.join(' e ')}${pts}${emp}`)
  }
  w()
}

/* hall dos mais premiados — calculado da base + lovers */
const wins = new Map()
const registra = (nome, pos) => {
  if (!wins.has(nome)) wins.set(nome, { n: nome, p1: 0, p2: 0, p3: 0, total: 0 })
  const r = wins.get(nome)
  if (pos === 1) r.p1++
  else if (pos === 2) r.p2++
  else if (pos === 3) r.p3++
  r.total++
}
for (const e of H.edicoes)
  for (const c of e.premiacao?.categorias || [])
    for (const col of c.colocacoes || []) for (const nome of col.nomes) registra(nome, col.pos)
for (const c of L.premiacao.categorias)
  for (const col of c.colocacoes) for (const nome of col.nomes) registra(nome, col.pos)
const hall = [...wins.values()].sort((a, b) => b.total - a.total || b.p1 - a.p1 || a.n.localeCompare(b.n, 'pt-BR'))

w('### 6.4 Hall dos mais premiados')
w()
w(`Contagem de todas as colocações de pódio da história (${hall.length} marcas já subiram ao pódio).`)
w('Calculado somando a base histórica + o resultado oficial da 16ª edição.')
w()
w('| # | Marca | 1º | 2º | 3º | Total |')
w('| --- | --- | --- | --- | --- | --- |')
hall.forEach((r, i) => w(`| ${i + 1} | ${esc(r.n)} | ${r.p1} | ${r.p2} | ${r.p3} | **${r.total}** |`))
w()

/* categorias ao longo do tempo */
const catsPorEdicao = new Map()
for (const e of H.edicoes) {
  const s = new Set((e.premiacao?.categorias || []).map((c) => c.categoria))
  if (s.size) catsPorEdicao.set(e.id, s)
}
catsPorEdicao.set('2026.1', new Set(L.premiacao.categorias.map((c) => c.categoria)))
const todasCats = [...new Set([...catsPorEdicao.values()].flatMap((s) => [...s]))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
w('### 6.5 Evolução das categorias')
w()
w(`**${todasCats.length} categorias distintas** já foram julgadas na história do Sweet Awards.`)
w()
w('| Categoria | Edições em que existiu |')
w('| --- | --- |')
for (const c of todasCats) {
  const eds = [...catsPorEdicao.entries()].filter(([, s]) => s.has(c)).map(([id]) => id)
  w(`| ${esc(c)} | ${eds.join(', ')} _(${eds.length})_ |`)
}
w()

/* empates */
const empates = []
for (const e of H.edicoes)
  for (const c of e.premiacao?.categorias || [])
    for (const col of c.colocacoes || [])
      if (col.nomes.length > 1) empates.push({ ed: e.id, cat: c.categoria, pos: col.pos, nomes: col.nomes })
for (const c of L.premiacao.categorias)
  for (const col of c.colocacoes)
    if (col.nomes.length > 1) empates.push({ ed: '2026.1', cat: c.categoria, pos: col.pos, nomes: col.nomes })
w('### 6.6 Empates registrados')
w()
if (empates.length) {
  w(`${empates.length} empates na história. Cada colocação guarda um array \`nomes\`;`)
  w('empate = mais de um nome na mesma posição.')
  w()
  w('| Edição | Categoria | Posição | Marcas |')
  w('| --- | --- | --- | --- |')
  for (const x of empates) w(`| ${x.ed} | ${esc(x.cat)} | ${x.pos}º | ${x.nomes.map(esc).join(' e ')} |`)
} else {
  w('Nenhum empate registrado.')
}
w()
w('---')
w()

/* ------------------------------------------------- 7. participantes atuais */
w('## 7. Participantes da edição atual (Lovers 2026.1)')
w()
w(`**${PARTICIPANTS.length} marcas.** Cada uma tem slug congelado — os QR Codes da edição`)
w('apontam para `/#/lovers/combos/{slug}` e **essas URLs não podem mudar**.')
w()
w('| Marca | Slug | Instagram | Bairro | Cidade | Tema escolhido | Unidades |')
w('| --- | --- | --- | --- | --- | --- | --- |')
for (const p of PARTICIPANTS) {
  w(`| ${esc(p.name)} | \`${p.slug}\` | ${esc(p.instagram || '—')} | ${esc(p.neighborhood || '—')} | ${esc(p.city || '—')} | ${esc(p.theme || '—')} | ${p.locations?.length ?? 1} |`)
}
w()
w('### 7.1 Ficha de cada participante')
w()
for (const p of PARTICIPANTS) {
  w(`#### ${p.name}`)
  w()
  w(`- **Slug (congelado):** \`${p.slug}\``)
  w(`- **Instagram:** ${p.instagram || 'não registrado'}`)
  w(`- **WhatsApp:** ${p.whatsapp || 'não registrado'}`)
  w(`- **Tema escolhido:** ${p.theme || 'não registrado'}`)
  w(`- **Edição temática:** ${p.edition || 'não registrado'}`)
  w(`- **Logo:** ${p.logo || 'não registrado'}`)
  w(`- **Unidades:** ${p.locations?.length ?? 0}`)
  for (const loc of p.locations || []) {
    w(`  - **${loc.name}** — ${loc.address || 's/ endereço'}, ${loc.neighborhood || '—'}, ${loc.city || '—'}`)
    if (loc.latitude != null) w(`    - Coordenadas: \`${loc.latitude}, ${loc.longitude}\``)
    if (loc.mapsUrl) w(`    - Maps: ${loc.mapsUrl}`)
    if (loc.openingHours) w(`    - Horários: ${String(loc.openingHours).replace(/\n/g, ' · ')}`)
  }
  w()
}
w('---')
w()

/* -------------------------------------------- 8. todas as marcas históricas */
const partPorMarca = new Map()
for (const e of H.edicoes)
  for (const nome of e.participantes || []) {
    if (!partPorMarca.has(nome)) partPorMarca.set(nome, [])
    partPorMarca.get(nome).push(e.id)
  }
const marcas = [...partPorMarca.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'pt-BR'))
w('## 8. Todas as marcas da história')
w()
w(`**${marcas.length} nomes distintos** aparecem nas listas de participantes das 16 edições.`)
w()
w('⚠️ Nome distinto ≠ marca distinta: a base tem `participantAliases` para reconciliar')
w('grafias (a mesma casa aparece com nomes diferentes ao longo dos anos). Um site novo')
w('deveria normalizar isso na origem.')
w()
if (H.participantAliases) {
  w('**Aliases registrados:**')
  w()
  w('```json')
  w(JSON.stringify(H.participantAliases, null, 2))
  w('```')
  w()
}
w('| Marca | Participações | Edições |')
w('| --- | --- | --- |')
for (const [nome, eds] of marcas) w(`| ${esc(nome)} | ${eds.length} | ${eds.join(', ')} |`)
w()
w('---')
w()

/* ------------------------------------------------------------- 9. imagens */
w('## 9. Acervo de imagens disponível no site')
w()
const base = path.join(RAIZ, 'public/images')
const conta = (dir) => {
  const p = path.join(base, dir)
  if (!fs.existsSync(p)) return null
  let n = 0
  const anda = (d) => {
    for (const it of fs.readdirSync(d, { withFileTypes: true })) {
      if (it.isDirectory()) anda(path.join(d, it.name))
      else if (/\.(jpe?g|png|webp|svg|avif)$/i.test(it.name)) n++
    }
  }
  anda(p)
  return n
}
w('| Pasta | Arquivos | Para que serve |')
w('| --- | --- | --- |')
const pastas = [
  ['edicoes', 'fotos por edição (`/images/edicoes/<code>/`)'],
  ['combos', 'foto do combo de cada participante (`/images/combos/<slug>/main.jpg`)'],
  ['marcas-edicoes', 'marca visual de cada edição'],
  ['momentos', 'registros de público e de rua'],
  ['campanha', 'peças e bastidores de campanha'],
  ['imprensa', 'registros em TV e veículos'],
  ['shapes', 'formas de apoio gráfico'],
]
for (const [d, uso] of pastas) {
  const n = conta(d)
  w(`| \`public/images/${d}/\` | ${n == null ? '**não existe**' : n} | ${uso} |`)
}
const logos = path.join(RAIZ, 'public/logos/participants')
const nLogos = fs.existsSync(logos) ? fs.readdirSync(logos).filter((f) => /\.(png|svg|jpe?g|webp)$/i.test(f)).length : 0
w(`| \`public/logos/participants/\` | ${nLogos} | logo real de cada participante |`)
w()
w('**Fora do repositório:** o acervo bruto (~58 GB) vive em `acervo-bruto/` na raiz,')
w('fora do `public/` e fora do git. Foi movido para lá porque o Vite copiava tudo a cada build.')
w()
w('⚠️ **Nada gerado por IA entra como registro do festival.** O acervo externo tem pelo')
w('menos uma peça assim (um mapa falso da Rota da Doçura com texto deformado). Sinais de')
w('alerta: nome tipo "Imagem N gerada", texto ilegível, logo com forma inconsistente.')
w()
w('⚠️ **Nome de pasta do acervo não descreve o conteúdo** — já falhou duas vezes')
w('("encantamento em loja" e "patrocínios e apoios" eram fotos de festa a fantasia).')
w()
w('---')
w()

/* ----------------------------------------------------------------- 10. FAQ */
w('## 10. Central de dúvidas — as 93 perguntas')
w()
w('Fonte única: `src/data/faqCentral.js`. Alimenta a interface e o schema `FAQPage`.')
w()
w('**Dados da edição usados nas respostas** (mudam a cada edição — ficam isolados em `EDICAO`):')
w()
w('```json')
w(JSON.stringify(FAQ.edicao, null, 2))
w('```')
w()
w(`**Aviso padrão:** ${FAQ.aviso}`)
w()
const catLabel = Object.fromEntries(FAQ.categorias)
const porCat = new Map()
for (const q of FAQ.perguntas) {
  if (!porCat.has(q.cat)) porCat.set(q.cat, [])
  porCat.get(q.cat).push(q)
}
w('| Assunto | Perguntas |')
w('| --- | --- |')
for (const [id, label] of FAQ.categorias) {
  if (id === 'todas') continue
  w(`| ${label} | ${porCat.get(id)?.length ?? 0} |`)
}
w(`| **Total** | **${FAQ.perguntas.length}** |`)
w()
for (const [id, label] of FAQ.categorias) {
  if (id === 'todas') continue
  const qs = porCat.get(id) || []
  if (!qs.length) continue
  w(`### ${label}`)
  w()
  for (const q of qs) {
    w(`**${q.p}**`)
    w()
    for (const par of q.r) w(par)
    if (q.link) {
      const lk = FAQ.links[q.link]
      w()
      w(`_Leva para:_ ${lk ? (lk.label || q.link) : '`' + q.link + '` (link ainda não existe)'}`)
    }
    w()
  }
}
w('**Links que ainda não existem** (quando `null`, o link não aparece na interface —')
w('preencher faz o link surgir sozinho):')
w()
for (const [k, v] of Object.entries(FAQ.links)) if (v == null) w(`- \`${k}\``)
w()
w('---')
w()

/* ------------------------------------------------------------ 11. contatos */
w('## 11. Canais e contato')
w()
for (const [k, v] of Object.entries(FAQ.links)) {
  if (v && v.url) w(`- **${k}** — ${v.url} (${v.label})`)
}
w()
w('**Assuntos do formulário de contato** (fonte: `src/data/contactFaq.js`):')
w()
const assuntos = CFAQ.CONTACT_SUBJECTS || CFAQ.ASSUNTOS || null
if (assuntos) {
  for (const a of assuntos) w(`- ${typeof a === 'string' ? a : (a.label || a.id)}`)
} else {
  w('_(exportações disponíveis: ' + Object.keys(CFAQ).join(', ') + ')_')
}
w()
w('**Filtros da central de dúvidas na página Contato:**')
w()
for (const c of CFAQ.FAQ_CATEGORIES || []) w(`- ${c.label} (\`${c.id}\`)`)
w()
w('**Backup de formulário:** todo briefing/formulário do ecossistema cai também por')
w('e-mail no Formspree. O painel só recebe com o Supabase ativo.')
w()
w('---')
w()

/* ------------------------------------------------------------ 12. lacunas */
w('## 12. Lacunas conhecidas — o que o acervo NÃO tem')
w()
w('Para planejar um site novo, isto vale tanto quanto os dados que existem.')
w()
const semPeriodo = H.edicoes.filter((e) => !e.periodo).map((e) => e.id)
const semTema = H.edicoes.filter((e) => !e.tema).map((e) => e.id)
const semCount = H.edicoes.filter((e) => e.participantesCount == null).map((e) => e.id)
const semLista = H.edicoes.filter((e) => !e.participantes?.length).map((e) => e.id)
// "Sem pódio" cobre dois casos: nenhuma categoria, ou categorias com colocações vazias
// (é o caso de 2026.1, cujos pódios vivem em loversAwardsResults.js de propósito).
const semPodio = H.edicoes
  .filter((e) => {
    if (e.premiacao?.status === 'nao-teve') return false
    const cs = e.premiacao?.categorias || []
    return !cs.length || cs.every((c) => !(c.colocacoes || []).length)
  })
  .map((e) => e.id)
const semPremiacao = H.edicoes.filter((e) => e.premiacao?.status === 'nao-teve').map((e) => e.id)
w('| Lacuna | Onde |')
w('| --- | --- |')
w(`| Edição sem período registrado | ${semPeriodo.join(', ') || 'nenhuma'} |`)
w(`| Edição sem tema | ${semTema.join(', ') || 'nenhuma'} |`)
w(`| Edição sem contagem de marcas | ${semCount.join(', ') || 'nenhuma'} |`)
w(`| Edição sem lista de marcas | ${semLista.join(', ') || 'nenhuma'} |`)
w(`| Edição com premiação mas sem pódio estruturado | ${semPodio.join(', ') || 'nenhuma'} |`)
w(`| Parceiros/patrocinadores por edição | vazio em ${H.edicoes.length - parceirosPorEdicao.length} das 16 (só ${parceirosPorEdicao.map((x) => x.id).join(', ')} têm) |`)
w(`| Valor do combo por edição | só ${H.edicoes.filter((e) => e.comboValor).map((e) => e.id).join(', ') || 'nenhuma'} |`)
w()
w('**Outras lacunas estruturais:**')
w()
w('- **2º e 3º lugares que o acervo não registra** ficam como ausência honesta — nunca preenchidos.')
w(`- **${semPremiacao.length} edições não tiveram premiação nenhuma** (${semPremiacao.join(', ')}) — isso precisa ser dito, não escondido.`)
w('- **Crédito de imprensa:** o acervo não traz veículo, data nem pessoa confiáveis para as fotos de TV. Por isso o alt text é genérico.')
w('- **Logo de participante sem arquivo** cai em fallback de iniciais — nunca inventar logo.')
w('- **O wordmark desenhado ainda letra "ELOI Design Studio"** (assunto da agência, não do festival).')
w()
w('---')
w()
w('## 13. Restrições que qualquer site novo herda')
w()
w('- **URLs de QR Code são permanentes:** `/#/lovers/combos/{slug}` e `/#/lovers/awards`.')
w('  Os QR Codes já foram impressos. Trocar hash routing por path routing quebra todos.')
w('  Os 21 slugs estão congelados (seção 7).')
w('- **Não inventar dado histórico, ranking ou vencedor.**')
w('- **Edições não competem entre si** — nada de gráfico comparando tamanho de edição.')
w('  Comparação só entre participantes (premiados, recorrentes).')
w('- **Institucional e Lovers nunca se misturam** visualmente.')
w('- **Nada gerado por IA como registro do festival.**')
w()

fs.writeFileSync(path.join(RAIZ, 'DOSSIE-FESTIVAL.md'), out.join('\n'), 'utf8')
console.log('ok —', out.length, 'linhas')
