# Home · Seção "De uma ideia para a cidade" — Díptico editorial vivo

**Data:** 2026-07-13
**Rota:** Home (`src/pages/institutional/Home.jsx`), seção `#ciclo` / `.hmv2-cycle`
**Tipo:** reformulação de seção da página-mãe (alteração **explicitamente solicitada** pelo usuário — §9)
**Status:** design aprovado (abordagem B), aguardando revisão do spec

---

## 1. Objetivo

Reformular a seção do ciclo do festival (tema → marcas → cidade → memória) que hoje
usa o padrão genérico "chip numerado + linha conectora". Transformar num **díptico
editorial**: fotografia real do acervo ao lado de uma sequência tipográfica das 4
batidas, com movimento com propósito.

Satisfaz os 4 eixos pedidos: (1) tirar cara de passo-a-passo genérico; (2) reestruturar;
(3) mais movimento/interação; (4) trazer fotografia. E corrige o problema silencioso: a
seção é um **vale de energia** — 100% texto entre seções ricas em foto.

**A narrativa das 4 batidas é mantida** (é o mecanismo real do festival); reformula-se a
apresentação, não o conteúdo.

## 2. Estado atual (a substituir)

- `.hmv2-cycle__head`: H2 "De uma ideia para a **cidade**." + intro, grid 2-col, borda inferior.
- `.hmv2-cycle__list`: `<ol>` 4 colunas; cada item = chip quadrado colorido (01–04:
  choco/coral/ciano/rosa) + h3 + p; linha conectora desenha entre itens.
- Motion: stagger por item (span escala, h3/p sobem, linha desenha).
- Dados: `const STAGES` (linha ~35), 4 tuplas `[number, title, text]`.
- Responsivo: 4→2 col (960) → 1 col (720).

## 3. Design alvo (abordagem B)

### 3.1 Layout — desktop (≥960)
Grid 2 colunas dentro do gutter existente (`--hm-gutter`, sem largura própria — §4):

```
┌──────────────┐   De uma ideia para a cidade.        ← head (H2 + intro) no topo da col. direita
│              │   [intro]
│   MOLDURA    │  ▏ 01  Um tema abre a conversa
│   FOTO       │  ▏ 02  As marcas criam o percurso     ← beat ativo (hover/foco)
│  do acervo   │  ▏ 03  A cidade entra na rota
│   (4:5)      │  ▏ 04  A memória continua
└──────────────┘  ▏ = trilho vertical de progresso
```

- **Coluna esquerda** = moldura editorial (proporção fixa ~4:5, `object-fit: cover`),
  borda/fundo no idioma de placeholder do projeto (§8). Contém as 4 fotos empilhadas
  (`position:absolute`), só a do beat ativo visível.
- **Coluna direita** = head no topo + `<ol>` das 4 batidas em coluna. Cada linha:
  - **numeral gigante fantasma** (idioma que a Home já usa em `hmv2-press__featureYear`)
    — não mais chip quadrado;
  - `h3` (título, `--font-display`);
  - `p` (texto).

### 3.2 Cor
- **Um acento só: coral** (`--accent`, primário do festival, mesma cor do `<em>` "cidade"
  no H2). Beat ativo acende em coral; inativos em `--ink`/esmaecido.
- **Remove o arco-íris** dos 4 chips (choco/coral/ciano/rosa) — era cor decorativa sem
  função (§3/§5). Fundo da seção mantém `--cream-deep`.

### 3.3 Interação
- Estado React: `activeStage` (`useState`, default `0`). Sem observer de scroll para
  ativação → **sem scroll-jacking** (§17); não colide com o trilho horizontal da Edições (§10).
- **Desktop (hover/foco):** `mouseenter`/`focus` numa linha define `activeStage` →
  a foto correspondente entra por crossfade, o numeral acende, o trilho preenche até o índice.
  As linhas são focáveis (`tabIndex`/botão) para teclado.
- **Mobile/touch (<960):** coluna única — moldura no topo reflete o beat ativo; **toque**
  numa batida troca a foto. Default beat 01.
- **Trilho de progresso**: barra vertical fina à esquerda do `<ol>`; altura de preenchimento
  = `(activeStage+1)/4`, animada por `transform: scaleY` (funcional: mostra posição no ciclo,
  não é enfeite — §5).

### 3.4 Movimento
Só `transform`/`opacity`/`filter`; sem layout shift; sem lib nova (§ regras técnicas + Motion).
- **Entrada da seção** (IntersectionObserver já existente): mantém stagger; numerais
  revelam; foto 01 entra (`opacity` + `scale 1.03→1`); trilho desenha até o beat 01.
- **Troca de beat** (hover/tap): crossfade da foto (`opacity`, ~.45s) + `scale` sutil no
  incoming; numeral ativo transiciona cor/opacidade; trilho reajusta `scaleY`.
- **`prefers-reduced-motion`**: sem crossfade/scale; troca instantânea; trilho estático.
- **Auto-ciclo opcional (fora de escopo por padrão, YAGNI):** timer que avança o beat
  sozinho. Não implementar salvo pedido — deixar comentário `// ponytail:` marcando o ponto
  de extensão.

### 3.5 Dados e fotos
Estender `STAGES` de `[number,title,text]` para incluir `photo` + `alt`. Fotos = **acervo
real verificado** (existem no repo); curadoria fina do frame é do usuário:

| Beat | `photo` | `alt` |
|------|---------|-------|
| 01 | `/images/edicoes/2016/01.webp` | "Primeira edição do festival — o tema que abre a conversa" |
| 02 | `/images/combos/adocee-doceria/main.jpg` | "Combo de participante — as marcas criam o percurso" |
| 03 | `/images/edicoes/2025/03.webp` | "Público nas ruas — a cidade entra na rota" |
| 04 | `/images/edicoes/2026.1/01.webp` | "Edição Lovers, 10 anos — a memória continua" |

- **Fallback honesto (§7/§8):** se uma imagem falhar (`onError`), a moldura mostra fundo
  creme + o título do beat + rótulo curto ("Foto do acervo") — nunca imagem quebrada,
  nunca imagem inventada/externa.
- Fotos ficam inline no `STAGES` (menor diff; sem arquivo de dados novo).

### 3.6 Responsivo
- **≥960:** díptico 2-col (foto + lista).
- **<960:** 1 coluna — moldura no topo, head, depois `<ol>` das batidas (toque troca foto).
  Trilho de progresso **some no mobile**; beat ativo marcado só pelo numeral aceso (mantém simples).
- **<560/<420:** herdam `padding-inline` da seção (já existe); type reduz.
- Escala de breakpoints canônica: 960 · 720 · 560 · 420 (§17).

### 3.7 Acessibilidade
- Linhas de batida = elementos interativos focáveis (botão ou `role`+`tabIndex`), operáveis
  por teclado; foco visível.
- `alt` descritivo em cada foto; moldura decorativa não rouba foco.
- Contraste coral/ink sobre creme dentro do aceitável já usado no projeto.
- `aria-current` (ou similar) marcando o beat ativo.

## 4. Escopo

**Dentro:** apenas a seção `#ciclo` em `Home.jsx` — JSX da seção (295–309), `STAGES`
(~35), e o bloco CSS `.hmv2-cycle*` dentro do `<style>` da Home (incl. stagger 606–627,
reduced-motion 655–666, breakpoints 650–653). Sem novos arquivos, sem novas libs, sem deps.

**Fora:** qualquer outra seção da Home; flags de publicação; rotas; dados históricos;
identidade Lovers aplicada ao institucional; auto-ciclo por timer.

## 5. Conformidade com regras (CLAUDE.md)

- §3 paleta: só coral + ink + creme; remove arco-íris; nenhuma cor nova. ✅
- §4 margens: usa `--hm-gutter`, sem largura própria. ✅
- §5 elementos soltos: trilho e numeral **carregam informação** (posição no ciclo,
  ordem) — funcionais, não enfeite. Sem eyebrow. ✅
- §5 fonte: rótulos em Nexa (`--font-display`/`--font-sans`), **sem mono**. ✅
- §7/§8 fotos/fallback: acervo real + fallback editorial honesto. ✅
- §9 Home: alteração explicitamente solicitada. ✅
- §17 responsivo: escala canônica; sem sticky-horizontal; sem overflow lateral. ✅
- Motion: só transform/opacity/filter; respeita reduced-motion; sem lib. ✅
- Não colide com Edições (§10): sem trilho horizontal / apresentação por passos. ✅

## 6. Verificação
- `npm run build` (build fora do projeto, uma vez — regra técnica).
- Conferência visual (desktop/tablet/mobile) é do usuário.
