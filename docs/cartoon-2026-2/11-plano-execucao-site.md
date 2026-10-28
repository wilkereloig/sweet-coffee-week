# Site da edição Cartoon — Plano de execução

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** aplicar o sistema visual do manual v03 à camada `/cartoon` e reconstruir as 7 páginas sobre ele, vendo tudo só no servidor local.

**Architecture:**
- O trabalho fica dentro da camada atual. Tokens e componentes do sistema vão em `src/styles/scw-cartoon.css` e `src/edicao/componentes/sistema/`. As páginas são recompostas sobre eles. Roteador, dados, Minha rota, avaliação e testes continuam.
- A etapa 1 entrega tokens, fonte, componentes e a vitrine `/cartoon/sistema` (só no DEV) e **para** para aprovação do Wilker.
- As etapas 2 a 9 estão em roteiro (§E2–E9). Cada uma ganha plano detalhado próprio quando a anterior for aprovada, porque o que o Wilker decidir na vitrine muda o código delas.

**Tech Stack:** React 18 + Vite 5, CSS puro com custom properties, `node:test`, Playwright (Chromium), Python com fontTools/Pillow (fonte e imagens), MCP do Supabase do SCW (só leitura).

**Spec:** [10-sistema-visual-e-paginas.md](10-sistema-visual-e-paginas.md). Cada tarefa cita a seção que implementa.

## Global Constraints

- Branch `dev/site-completo`. Conferir com `git branch --show-current` antes de cada tarefa.
- **Commits locais. NUNCA push, merge ou `master`.** Pedido do Wilker em 27/10: "não publicar nada".
- `CARTOON_PUBLICA` e `ENTRADA_PRINCIPAL` (`src/edicao/config.js`) e as flags de `src/App.jsx` não mudam.
- **Nada é gravado no banco.** Só consulta de leitura.
- Não tocar em institucional, Home (`/`), painel nem Edge Functions. Única exceção: a `FichaParticipante`, que o painel importa (etapa 6).
- **Paleta exata:**

  | Nome | HEX |
  |---|---|
  | creme | `#FDF0DE` |
  | amarelo | `#FDB901` |
  | chocolate | `#3A150F` |
  | preto | `#050505` |
  | vermelho | `#ED1C20` |
  | rosa | `#E8195A` |
  | branco | `#FCFCFC` |
  | azul | `#0184E4` |
  | turquesa | `#05BEBA` |
  | roxo | `#6424AB` |

  `#FAC506` e `#FDF2DF` saem.
- **Contraste:**
  - texto pequeno só com 4,5:1 ou mais;
  - creme sobre vermelho, rosa ou azul só em texto grande (≥ 18,66px em peso ≥ 700);
  - chocolate sobre roxo ou azul nunca.
- **Fonte:** Grandstander, servida de `public/fonts/grandstander/`, declarada só em `scw-cartoon.css`.
- Alvo de toque ≥ 44px. Um `<h1>` por página. Respeitar `prefers-reduced-motion`.
- **Textos:** português do Brasil e grafias do `CLAUDE.md` §8 (Sweet & Coffee Week, SCW, "avaliam", nunca "o Sweet").
- **Build de verificação fora do projeto, uma vez só, nunca dois ao mesmo tempo:**

  ```bash
  npx vite build --outDir "$TEMP/scw_build_$$" --emptyOutDir && rm -rf "$TEMP/scw_build_$$"
  ```

- Nada de conteúdo do festival inventado (A4). A vitrine usa exemplos neutros ou fatos já públicos (5 a 15 de novembro, 11 dias).
- **Capturas de teste** (`tests/capturas-*`) não entram em commit.

---

# Etapa 1 · Tokens, fonte, componentes e vitrine

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `scripts/edicao/fonte-grandstander.py` | criar | recorta a Grandstander (latim) e grava woff2 + licença |
| `public/fonts/grandstander/grandstander-latin.woff2` · `OFL.txt` | gerar | a fonte servida pelo projeto |
| `src/styles/scw-cartoon.css` | modificar | `@font-face`, tokens do manual, tipografia, botão e peças do sistema |
| `src/edicao/componentes/sistema/Letreiro.jsx` | criar | título de seção: imagem desenhada ou texto com efeito de letreiro |
| `src/edicao/componentes/sistema/TopoCanal.jsx` | criar | topo de página na cor do canal |
| `src/edicao/componentes/sistema/pecas.jsx` | criar | Etiqueta, Pílula, Carimbo, Placa, Botão, Quadro, Barras de sinal |
| `public/images/marcas-edicoes/2026.2/letreiros/*.webp` | gerar | letreiros "Nosso elenco" e "Hora de provar" |
| `src/data/imageLibrary.js` | modificar | `letreiroEdicao(chave)` |
| `src/data/imageVariants.js` | regenerar | variantes 480/960 dos letreiros |
| `src/edicao/rotas.js` | modificar | cena `sistema` |
| `src/edicao/cartoon/index.jsx` | modificar | vitrine só no DEV, por import preguiçoso |
| `src/edicao/cartoon/paginas/Sistema.jsx` · `sistema.css` | criar | a vitrine e o arranjo dela |
| `tests/cartoon-sistema.test.mjs` | criar | fonte, tokens, contraste, vitrine só no DEV |
| `tests/rotas-edicao.test.mjs` | modificar | cena `/cartoon/sistema` |
| `tests/cartoon-sistema-navegador.mjs` | criar | vitrine no navegador em 360/768/1440 |
| `package.json` | modificar | scripts dos testes |
| `src/CLAUDE.md`, `CLAUDE.md`, spec 10 | modificar | exceção declarada da camada, comando novo, ajuste da spec |

---

### Task 1: Grandstander servida pelo projeto

Spec §10.3, Tipografia.

**Files:**
- Create: `scripts/edicao/fonte-grandstander.py`
- Create (gerados): `public/fonts/grandstander/grandstander-latin.woff2`, `public/fonts/grandstander/OFL.txt`
- Modify: `src/styles/scw-cartoon.css` (topo do arquivo)
- Create: `tests/cartoon-sistema.test.mjs`
- Modify: `package.json` (script `test:cartoon`)

**Interfaces:**
- Produces: família CSS `'Grandstander'`, pesos 100–900 (fonte variável), disponível dentro do chunk da edição.

- [ ] **Step 1: Escrever o teste que falha**

`tests/cartoon-sistema.test.mjs`:

```js
// Sistema visual da camada Cartoon (docs/cartoon-2026-2/10-sistema-visual-e-paginas.md, etapa 1).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(import.meta.dirname, '..')
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8')
const existe = (p) => fs.existsSync(path.join(raiz, p))
const cssDe = (dir) => fs.readdirSync(path.join(raiz, dir), { withFileTypes: true }).flatMap((e) => {
  const rel = path.join(dir, e.name)
  return e.isDirectory() ? cssDe(rel) : e.name.endsWith('.css') ? [rel] : []
})

test('Grandstander servida pelo projeto e declarada só na camada da edição', () => {
  assert.ok(existe('public/fonts/grandstander/grandstander-latin.woff2'), 'falta o woff2')
  assert.ok(existe('public/fonts/grandstander/OFL.txt'), 'falta a licença OFL')
  assert.match(ler('src/styles/scw-cartoon.css'), /@font-face\s*{[^}]*font-family:\s*'Grandstander'[^}]*font-weight:\s*100 900/)
  for (const f of cssDe('src').filter((f) => !f.endsWith('scw-cartoon.css'))) {
    assert.doesNotMatch(ler(f), /@font-face[^}]*Grandstander/, `${f} declara a fonte da edição`)
  }
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/cartoon-sistema.test.mjs`
Expected: FAIL, "falta o woff2".

- [ ] **Step 3: Escrever o script da fonte**

`scripts/edicao/fonte-grandstander.py`:

```python
"""Grandstander (OFL) -> woff2 com recorte latino, para a camada Cartoon.

Uso: python -I scripts/edicao/fonte-grandstander.py <grandstander.ttf> <OFL.txt>
A origem é a pasta assets/ do MANUAL-DIRECAO-VISUAL-CARTOON-v03 (Dropbox F2).
Mantém o eixo de peso (100-900): é a mesma fonte variável, só sem os glifos
que o site não usa.
"""
import shutil
import sys
from pathlib import Path

from fontTools import subset

origem, licenca = Path(sys.argv[1]), Path(sys.argv[2])
destino = Path(__file__).resolve().parents[2] / 'public' / 'fonts' / 'grandstander'
destino.mkdir(parents=True, exist_ok=True)

opcoes = subset.Options()
opcoes.flavor = 'woff2'
opcoes.layout_features = ['*']
opcoes.name_IDs = ['*']
fonte = subset.load_font(str(origem), opcoes)
recorte = subset.Subsetter(opcoes)
# Latim básico + Latim-1 (acentos do português) + pontuação tipográfica + € e ™.
recorte.populate(unicodes=[*range(0x20, 0x7F), *range(0xA0, 0x100), *range(0x2010, 0x2028), 0x20AC, 0x2122])
recorte.subset(fonte)
subset.save_font(fonte, str(destino / 'grandstander-latin.woff2'), opcoes)
shutil.copyfile(licenca, destino / 'OFL.txt')
print('ok', destino)
```

- [ ] **Step 4: Gerar a fonte e conferir o eixo**

```bash
A="/f/F2 Experience Dropbox/Criação ELOI Design/SWEET&COFFEE WEEK/2026.2 SCW CARTOONS/00_BRIEFING_E_DIRECAO/01_SISTEMA_KV/MANUAL-DIRECAO-VISUAL-v02/assets"
python -I scripts/edicao/fonte-grandstander.py "$A/grandstander.ttf" "$A/grandstander-OFL.txt"
python -I -c "from fontTools.ttLib import TTFont; f=TTFont('public/fonts/grandstander/grandstander-latin.woff2'); print([(a.axisTag,a.minValue,a.maxValue) for a in f['fvar'].axes])"
```

Expected: `ok …\public\fonts\grandstander` e depois `[('wght', 100.0, 900.0)]`.

- [ ] **Step 5: Declarar a fonte no topo de `scw-cartoon.css`**

Inserir antes do primeiro comentário (linha 1):

```css
/* Grandstander (OFL), servida pelo projeto — docs/cartoon-2026-2/10 §10.3.
   Declarada só aqui: o arquivo só entra no chunk da edição. */
@font-face {
  font-family: 'Grandstander';
  src: url('/fonts/grandstander/grandstander-latin.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

```

- [ ] **Step 6: Incluir o teste no `test:cartoon`**

Em `package.json`, a linha do `test:cartoon` vira:

```json
    "test:cartoon": "node --test tests/rotas-edicao.test.mjs tests/cartoon-modelo.test.mjs tests/cartoon-rota.test.mjs tests/cartoon-sistema.test.mjs",
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npm run test:cartoon`
Expected: os 23 testes de antes e mais 1 (`Grandstander servida…`), 0 falhas.

- [ ] **Step 8: Commit (local)**

```bash
git add scripts/edicao/fonte-grandstander.py public/fonts/grandstander src/styles/scw-cartoon.css tests/cartoon-sistema.test.mjs package.json
git commit -m "feat(edicao): Grandstander servida pelo projeto para a camada Cartoon"
```

---

### Task 2: Tokens do manual v03 e contraste

Spec §10.3, Cor, Tipografia e Forma.

**Files:**
- Modify: `src/styles/scw-cartoon.css` (bloco `.ct-edicao`, cabeçalho de comentário, regras de título, troca em massa de fonte e tinta)
- Modify: `tests/cartoon-sistema.test.mjs`

**Interfaces:**
- Produces:
  - **Tokens de cor:** `--ct-creme`, `--ct-amarelo`, `--ct-chocolate`, `--ct-preto`, `--ct-vermelho`, `--ct-rosa`, `--ct-branco`, `--ct-azul`, `--ct-turquesa`, `--ct-roxo`.
  - **Fonte e tamanhos:** `--ct-font`, `--ct-fs-display`, `--ct-fs-titulo`, `--ct-fs-sub`, `--ct-fs-texto`, `--ct-fs-servico`.
  - **Forma:** `--ct-traco` (chocolate), `--ct-traco-desenho` (preto), `--ct-sombra`, `--ct-sombra-p`, `--ct-raio`, `--ct-raio-p`.
  - **Classes:** `.ct-h1`, `.ct-h2`, `.ct-sub` (nova), `.ct-lead`, `.ct-rotulo`.
  - **Mantidos:** `--ct-trilho`, `--ct-mo`.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `tests/cartoon-sistema.test.mjs`:

```js
const CSS = 'src/styles/scw-cartoon.css'
const tokens = () => Object.fromEntries([...ler(CSS).matchAll(/--ct-([a-z]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map(([, n, h]) => [n, h.toUpperCase()]))
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

test('paleta do manual v03, e nada da paleta antiga', () => {
  assert.deepEqual(tokens(), {
    creme: '#FDF0DE', amarelo: '#FDB901', chocolate: '#3A150F', preto: '#050505', vermelho: '#ED1C20',
    rosa: '#E8195A', branco: '#FCFCFC', azul: '#0184E4', turquesa: '#05BEBA', roxo: '#6424AB',
  })
  const css = ler(CSS)
  for (const velho of ['#FAC506', '#FDF2DF', 'amarelo-heroi', 'var(--scw-font', 'rgba(5, 5, 5']) {
    assert.ok(!css.includes(velho), `ainda usa ${velho}`)
  }
  assert.match(css, /--ct-font:\s*'Grandstander'/)
})

test('contraste medido a partir dos tokens', () => {
  const t = tokens()
  const LEITURA = [['chocolate', 'creme'], ['chocolate', 'amarelo'], ['chocolate', 'turquesa'], ['chocolate', 'branco'],
    ['creme', 'chocolate'], ['creme', 'roxo'], ['preto', 'azul']]
  const SO_GRANDE = [['creme', 'vermelho'], ['creme', 'rosa'], ['creme', 'azul']]
  const PROIBIDO = [['chocolate', 'roxo'], ['chocolate', 'azul']]
  for (const [tinta, fundo] of LEITURA) assert.ok(contraste(t[tinta], t[fundo]) >= 4.5, `${tinta} sobre ${fundo} < 4,5`)
  for (const [tinta, fundo] of SO_GRANDE) {
    const c = contraste(t[tinta], t[fundo])
    assert.ok(c >= 3 && c < 4.5, `${tinta} sobre ${fundo} = ${c.toFixed(2)}: a regra "só texto grande" mudou`)
  }
  for (const [tinta, fundo] of PROIBIDO) assert.ok(contraste(t[tinta], t[fundo]) < 4.5, `${tinta} sobre ${fundo} passou a ser legível: rever a regra`)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/cartoon-sistema.test.mjs`
Expected: FAIL em `paleta do manual v03` (creme `#FDF2DF`, falta chocolate e rosa) e em `contraste` (`t.chocolate` indefinido).

- [ ] **Step 3: Trocar as regras de título (texto original)**

Em `src/styles/scw-cartoon.css`, substituir:

```css
.ct-h1 { max-width: 20ch; margin: 0 0 12px; font: 900 clamp(32px, 4.2vw, 64px)/.98 var(--scw-font-black); letter-spacing: -.03em; text-wrap: balance; }
.ct-h2 { max-width: 24ch; margin: 0 0 16px; font: 900 clamp(24px, 2.8vw, 38px)/1.02 var(--scw-font-black); letter-spacing: -.025em; text-wrap: balance; }
.ct-lead { max-width: 52ch; margin: 0 0 20px; font: 400 clamp(17px, 1.4vw, 20px)/1.5 var(--scw-font-ui); }
.ct-rotulo { margin: 0 0 6px; font: 700 12px/1.2 var(--scw-font-ui); letter-spacing: .12em; text-transform: uppercase; }
```

por:

```css
.ct-h1 { max-width: 20ch; margin: 0 0 12px; font: 900 var(--ct-fs-display)/.95 var(--ct-font); text-wrap: balance; }
.ct-h2 { max-width: 24ch; margin: 0 0 16px; font: 900 var(--ct-fs-titulo)/1 var(--ct-font); text-wrap: balance; }
.ct-sub { margin: 0 0 8px; font: 800 var(--ct-fs-sub)/1.1 var(--ct-font); }
.ct-lead { max-width: 52ch; margin: 0 0 20px; font: 600 clamp(18px, 1.4vw, 21px)/1.45 var(--ct-font); }
.ct-rotulo { margin: 0 0 6px; font: 700 var(--ct-fs-servico)/1.3 var(--ct-font); letter-spacing: .1em; text-transform: uppercase; }
```

- [ ] **Step 4: Troca em massa só depois do bloco de tokens**

O bloco `.ct-edicao { … }` termina na linha 46, depois do `@font-face` da Task 1; a troca começa na 47. O comando troca:
- as três fontes Nexa pela da edição;
- peso 400 por 500 no texto;
- tinta e contorno preto por chocolate;
- o amarelo extra e o rgba preto pelos equivalentes da paleta;
- o espaçamento negativo da Nexa Slab.

```bash
grep -n '^  font: 400 clamp(15.5px' src/styles/scw-cartoon.css   # confirma o fim do bloco: deve sair a linha 45
sed -i -E '47,$ {
  s/var\(--scw-font-(black|ui|texto)\)/var(--ct-font)/g
  s/font: 400 /font: 500 /g
  s/var\(--ct-preto\)/var(--ct-chocolate)/g
  s/var\(--ct-amarelo-heroi\)/var(--ct-amarelo)/g
  s/rgba\(5, 5, 5, /rgba(58, 21, 15, /g
  s/letter-spacing: -\.0(3|25)em/letter-spacing: -.01em/g
}' src/styles/scw-cartoon.css
```

Expected: o `grep` mostra `45:  font: 400 clamp(15.5px, 1.2vw, 17px)/1.6 var(--scw-font-texto);`. Se a linha for outra, ajustar o `47` para (linha + 2) antes de rodar o `sed`.

- [ ] **Step 5: Trocar o bloco de tokens**

Substituir o bloco inteiro, de `.ct-edicao {` até `font: 400 clamp(15.5px, 1.2vw, 17px)/1.6 var(--scw-font-texto);\n}`, por:

```css
.ct-edicao {
  /* Paleta do manual v03 (27/10/2026) — docs/cartoon-2026-2/10 §10.3. */
  --ct-creme: #FDF0DE;
  --ct-amarelo: #FDB901;
  --ct-chocolate: #3A150F;
  --ct-preto: #050505;
  --ct-vermelho: #ED1C20;
  --ct-rosa: #E8195A;
  --ct-branco: #FCFCFC;
  --ct-azul: #0184E4;
  --ct-turquesa: #05BEBA;
  --ct-roxo: #6424AB;

  --ct-font: 'Grandstander', system-ui, sans-serif;
  --ct-fs-display: clamp(40px, 6vw, 72px);
  --ct-fs-titulo: clamp(28px, 3.6vw, 44px);
  --ct-fs-sub: clamp(20px, 2.2vw, 26px);
  --ct-fs-texto: clamp(17px, 0.4vw + 15.5px, 18px);
  --ct-fs-servico: 14px;

  --ct-traco: 2.5px solid var(--ct-chocolate);
  --ct-traco-desenho: 2.5px solid var(--ct-preto);
  --ct-sombra: 4px 4px 0 var(--ct-chocolate);
  --ct-sombra-p: 3px 3px 0 var(--ct-chocolate);
  --ct-raio: 18px;
  --ct-raio-p: 14px;
  --ct-trilho: max(clamp(16px, 5vw, 96px), calc((100% - 1440px) / 2));
  --ct-mo: 180ms cubic-bezier(.22, .9, .24, 1);

  min-height: 100svh;
  display: flex;
  flex-direction: column;
  background: var(--ct-creme);
  color: var(--ct-chocolate);
  font: 500 var(--ct-fs-texto)/1.5 var(--ct-font);
  font-synthesis: none;
}
```

- [ ] **Step 6: Atualizar o comentário de cabeçalho**

Substituir as linhas:

```css
 * Contraste: as cores fortes da marca (vermelho, azul, roxo, turquesa) vão em
 * superfície e grafismo, nunca em texto pequeno — texto é preto sobre creme,
 * amarelo ou turquesa, ou creme sobre preto. Tipografia de texto = a
 * institucional até haver fonte da edição aprovada (D-04).
```

por:

```css
 * Sistema do manual v03 (docs/cartoon-2026-2/10-sistema-visual-e-paginas.md):
 * texto em chocolate sobre creme, amarelo, turquesa ou branco; creme sobre
 * chocolate ou roxo; creme sobre vermelho, rosa ou azul só em texto grande;
 * chocolate sobre roxo ou azul nunca. Fonte: Grandstander, peso por papel.
 * tests/cartoon-sistema.test.mjs mede o contraste a partir destes tokens.
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npm run test:cartoon`
Expected: todos passam, inclusive `paleta do manual v03` e `contraste medido a partir dos tokens`.

- [ ] **Step 8: Commit (local)**

```bash
git add src/styles/scw-cartoon.css tests/cartoon-sistema.test.mjs
git commit -m "feat(edicao): tokens do manual v03 na camada Cartoon (paleta, Grandstander, forma)"
```

---

### Task 3: Componentes do sistema

Spec §10.4.

**Files:**
- Create: `src/edicao/componentes/sistema/Letreiro.jsx`
- Create: `src/edicao/componentes/sistema/TopoCanal.jsx`
- Create: `src/edicao/componentes/sistema/pecas.jsx`
- Modify: `src/styles/scw-cartoon.css` (botão e seção nova "sistema")

**Interfaces:**
- Consumes: tokens da Task 2; `Link` de `src/edicao/componentes/base.jsx` (`{ href, navigate, children, aoIr, ...resto }`).
- Produces:
  - `Letreiro({ texto: string, imagem?: { src, largura, altura }, nivel?: 1|2|3, tamanho?: 'titulo'|'display', cor?: 'vermelho'|'amarelo'|'chocolate' })`
  - `TopoCanal({ canal: 'estreia'|'elenco'|'cardapio'|'rota'|'gala'|'servico', children, className? })`, `CANAIS: string[]`
  - `Etiqueta({ children, as? })`
  - `Pilula({ children })`
  - `Carimbo({ children })`
  - `Placa({ numero, rotulo, cor?: 'amarelo'|'creme'|'turquesa' })`
  - `Botao({ tipo?: 'primario'|'acao'|'secundario', href?, navigate?, children, ...resto })`
  - `Quadro({ children, fita?: boolean })`
  - `BarrasSinal()`

Os componentes são verificados no navegador (Task 6): os testes `node:test` do projeto não importam JSX.

- [ ] **Step 1: `Letreiro.jsx`**

```jsx
/*
 * Título de seção (docs/cartoon-2026-2/10 §10.4). Com `imagem`: o letreiro
 * desenhado da edição, e o texto real fica no HTML para leitor de tela e busca.
 * Sem imagem: o texto em Grandstander com efeito de letreiro em CSS. O mesmo
 * componente segura os dois casos — a página não escolhe.
 */
import React from 'react'
import { srcSet } from '../../../data/imageLibrary'

export function Letreiro ({ texto, imagem, nivel = 2, tamanho = 'titulo', cor = 'vermelho' }) {
  const Tag = `h${nivel}`
  if (imagem) {
    return (
      <Tag className="ct-letreiro ct-letreiro--imagem">
        <img src={imagem.src} srcSet={srcSet(imagem.src)} sizes="(max-width: 600px) 90vw, 560px" alt="" width={imagem.largura} height={imagem.altura} />
        <span className="ct-sr">{texto}</span>
      </Tag>
    )
  }
  return <Tag className={`ct-letreiro ct-letreiro--${tamanho} ct-letreiro--cor-${cor}`}>{texto}</Tag>
}
```

- [ ] **Step 2: `TopoCanal.jsx`**

```jsx
/*
 * Topo de página no canal de cor (docs/cartoon-2026-2/10 §10.2): Estreia
 * amarelo · Elenco creme · Cardápio rosa · Rota turquesa · Gala chocolate ·
 * Serviço creme com faixa azul. O corpo da página continua creme.
 */
import React from 'react'

export const CANAIS = ['estreia', 'elenco', 'cardapio', 'rota', 'gala', 'servico']

export function TopoCanal ({ canal, children, className = '' }) {
  return <section className={`ct-canal ct-canal--${canal} ${className}`.trim()}>{children}</section>
}
```

- [ ] **Step 3: `pecas.jsx`**

```jsx
/*
 * Peças pequenas do sistema visual da Cartoon (docs/cartoon-2026-2/10 §10.4).
 * Só composição: o desenho mora em scw-cartoon.css, sobre os tokens --ct-*.
 */
import React from 'react'
import { Link } from '../base.jsx'

/** Fita amarela com o nome da seção. */
export function Etiqueta ({ children, as: Tag = 'p' }) {
  return <Tag className="ct-etiqueta">{children}</Tag>
}

/** Dado curto em chocolate. */
export function Pilula ({ children }) {
  return <span className="ct-pilula">{children}</span>
}

/** Selo ou nota em vermelho — texto grande, nunca frase. */
export function Carimbo ({ children }) {
  return <span className="ct-carimbo">{children}</span>
}

/** Dado duro: número grande + rótulo. A cor contrasta com o canal; a tinta é sempre chocolate. */
export function Placa ({ numero, rotulo, cor = 'amarelo' }) {
  return (
    <p className={`ct-placa ct-placa--${cor}`}>
      <span className="ct-placa__numero">{numero}</span>
      <span className="ct-placa__rotulo">{rotulo}</span>
    </p>
  )
}

const CLASSE_BOTAO = { primario: 'ct-botao', acao: 'ct-botao ct-botao--acao', secundario: 'ct-botao ct-botao--contorno' }

/** Com `href` vira link da edição; sem, botão. Reusa .ct-botao, que as páginas já usam. */
export function Botao ({ tipo = 'primario', href, navigate, children, ...resto }) {
  const className = CLASSE_BOTAO[tipo]
  if (href) return <Link href={href} navigate={navigate} className={className} {...resto}>{children}</Link>
  return <button type="button" className={className} {...resto}>{children}</button>
}

/** Quadro branco com fita nos cantos, para logo ou foto. */
export function Quadro ({ children, fita = true }) {
  return <div className={`ct-quadro${fita ? ' ct-quadro--fita' : ''}`}>{children}</div>
}

const BARRAS = ['creme', 'amarelo', 'turquesa', 'rosa', 'vermelho', 'azul', 'roxo']

/** Barras de sinal: a paleta inteira junta, só em transição — nunca fundo de texto. */
export function BarrasSinal () {
  return (
    <div className="ct-barras" aria-hidden="true">
      {BARRAS.map((c) => <span key={c} className={`ct-barras__b ct-barras__b--${c}`} />)}
    </div>
  )
}
```

- [ ] **Step 4: Redesenhar o botão (texto depois da Task 2)**

Em `src/styles/scw-cartoon.css`, substituir:

```css
.ct-edicao .ct-botao {
  display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 20px;
  border: var(--ct-traco); border-radius: 23px; background: var(--ct-chocolate); color: var(--ct-creme);
  font: 700 15px/1 var(--ct-font); text-decoration: none; cursor: pointer;
  transition: transform var(--ct-mo), background-color var(--ct-mo), color var(--ct-mo);
}
.ct-edicao .ct-botao:hover { transform: translateY(-2px); }
.ct-edicao .ct-botao:active { transform: translateY(0); }
.ct-edicao .ct-botao:disabled { opacity: .45; cursor: default; transform: none; }
.ct-edicao .ct-botao--contorno { background: transparent; color: var(--ct-chocolate); }
.ct-edicao .ct-botao--feito { background: var(--ct-turquesa); color: var(--ct-chocolate); }
```

por:

```css
.ct-edicao .ct-botao {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 22px;
  border: var(--ct-traco); border-radius: 999px; background: var(--ct-amarelo); color: var(--ct-chocolate);
  box-shadow: var(--ct-sombra-p);
  font: 800 16px/1 var(--ct-font); text-decoration: none; cursor: pointer;
  transition: transform var(--ct-mo), box-shadow var(--ct-mo), background-color var(--ct-mo);
}
.ct-edicao .ct-botao:hover { transform: translate(-1px, -1px); box-shadow: var(--ct-sombra); }
.ct-edicao .ct-botao:active { transform: translate(2px, 2px); box-shadow: 0 0 0 var(--ct-chocolate); }
.ct-edicao .ct-botao:disabled { opacity: .45; cursor: default; transform: none; box-shadow: none; }
/* Creme sobre vermelho fecha ~3,9:1: só texto grande (19px/800). */
.ct-edicao .ct-botao--acao { background: var(--ct-vermelho); color: var(--ct-creme); font-size: 19px; }
.ct-edicao .ct-botao--contorno { background: var(--ct-creme); color: var(--ct-chocolate); }
.ct-edicao .ct-botao--feito { background: var(--ct-turquesa); color: var(--ct-chocolate); }
```

- [ ] **Step 5: CSS das peças**

Acrescentar antes do bloco `@media (prefers-reduced-motion: reduce)` no fim do arquivo:

```css
/* ------------------------------------------------------------- sistema (docs/cartoon-2026-2/10 §10.4) */
.ct-letreiro { margin: 0 0 16px; text-wrap: balance; }
.ct-letreiro--imagem img { display: block; width: min(560px, 100%); height: auto; }
/* Letreiro em texto: cor de ação, contorno chocolate por fora (paint-order) e sombra curta. */
.ct-letreiro--titulo, .ct-letreiro--display {
  --ct-letra: var(--ct-vermelho);
  color: var(--ct-letra);
  font-family: var(--ct-font); font-weight: 900;
  -webkit-text-stroke: .1em var(--ct-chocolate);
  paint-order: stroke fill;
  text-shadow: .05em .06em 0 var(--ct-chocolate);
}
.ct-letreiro--titulo { font-size: var(--ct-fs-titulo); line-height: 1.02; }
.ct-letreiro--display { font-size: var(--ct-fs-display); line-height: .98; }
.ct-letreiro--cor-amarelo { --ct-letra: var(--ct-amarelo); }
.ct-letreiro--cor-chocolate { --ct-letra: var(--ct-chocolate); }

.ct-etiqueta {
  display: inline-block; margin: 0 0 12px; padding: 6px 14px 5px;
  border: var(--ct-traco); background: var(--ct-amarelo); color: var(--ct-chocolate); box-shadow: var(--ct-sombra-p);
  font: 800 var(--ct-fs-servico)/1.2 var(--ct-font); letter-spacing: .1em; text-transform: uppercase;
  transform: rotate(-3deg);
}
.ct-pilula {
  display: inline-flex; align-items: center; min-height: 32px; padding: 0 14px; border-radius: 999px;
  background: var(--ct-chocolate); color: var(--ct-creme); font: 800 15px/1 var(--ct-font);
}
/* Vermelho sobre creme fecha ~3,9:1: carimbo é sempre texto grande (20px/900). */
.ct-carimbo {
  display: inline-grid; place-items: center; padding: 8px 14px; border: 3px solid var(--ct-vermelho); border-radius: var(--ct-raio-p);
  color: var(--ct-vermelho); font: 900 20px/1 var(--ct-font); text-transform: uppercase; transform: rotate(-6deg);
}
.ct-placa {
  display: inline-grid; gap: 2px; margin: 0; padding: 12px 18px 14px; border: var(--ct-traco); border-radius: var(--ct-raio-p);
  box-shadow: var(--ct-sombra); color: var(--ct-chocolate); text-align: center;
}
.ct-placa__numero { font: 900 clamp(28px, 4vw, 44px)/1 var(--ct-font); }
.ct-placa__rotulo { font: 700 var(--ct-fs-servico)/1.2 var(--ct-font); letter-spacing: .1em; text-transform: uppercase; }
.ct-placa--amarelo { background: var(--ct-amarelo); }
.ct-placa--creme { background: var(--ct-creme); }
.ct-placa--turquesa { background: var(--ct-turquesa); }

.ct-quadro { position: relative; display: inline-grid; place-items: center; padding: 14px; border: var(--ct-traco); background: var(--ct-branco); box-shadow: var(--ct-sombra-p); }
.ct-quadro--fita::before, .ct-quadro--fita::after {
  content: ''; position: absolute; width: 56px; height: 18px;
  border: 1.5px solid rgba(58, 21, 15, .35); background: rgba(253, 185, 1, .85);
}
.ct-quadro--fita::before { top: -9px; left: -14px; transform: rotate(-35deg); }
.ct-quadro--fita::after { right: -14px; bottom: -9px; transform: rotate(-35deg); }

/* skewY e não rotate: rotate alarga a caixa e abriria rolagem lateral. */
.ct-barras { display: grid; grid-template-columns: repeat(7, 1fr); height: 18px; border-block: var(--ct-traco); transform: skewY(-1deg); }
.ct-barras__b + .ct-barras__b { border-left: 1.2px solid var(--ct-chocolate); }
.ct-barras__b--creme { background: var(--ct-creme); }
.ct-barras__b--amarelo { background: var(--ct-amarelo); }
.ct-barras__b--turquesa { background: var(--ct-turquesa); }
.ct-barras__b--rosa { background: var(--ct-rosa); }
.ct-barras__b--vermelho { background: var(--ct-vermelho); }
.ct-barras__b--azul { background: var(--ct-azul); }
.ct-barras__b--roxo { background: var(--ct-roxo); }

.ct-canal { display: grid; justify-items: start; gap: 8px; padding: clamp(32px, 6vw, 72px) var(--ct-trilho); border-bottom: var(--ct-traco); color: var(--ct-chocolate); }
.ct-canal--estreia { background: var(--ct-amarelo); }
.ct-canal--elenco { background: var(--ct-creme); }
.ct-canal--cardapio { background: var(--ct-rosa); color: var(--ct-creme); }
.ct-canal--rota { background: var(--ct-turquesa); }
.ct-canal--gala { background: var(--ct-chocolate); color: var(--ct-creme); }
.ct-canal--servico { background: var(--ct-creme); border-top: 12px solid var(--ct-azul); }
/* Rosa não sustenta texto pequeno (creme ~4:1): rótulo e apoio vão em placa creme (manual v03, canal 3). */
.ct-canal--cardapio .ct-rotulo, .ct-canal--cardapio .ct-lead {
  padding: 6px 12px; border-radius: var(--ct-raio-p); background: var(--ct-creme); color: var(--ct-chocolate);
}
.ct-canal--cardapio :focus-visible, .ct-canal--gala :focus-visible { outline-color: var(--ct-amarelo); }
```

- [ ] **Step 6: Conferir que nada quebrou**

Run: `npm run test:cartoon && npm run test:imagens`
Expected: tudo passa. `rotas-edicao` confere que nenhuma classe `ct-` vazou para fora da camada.

- [ ] **Step 7: Commit (local)**

```bash
git add src/edicao/componentes/sistema src/styles/scw-cartoon.css
git commit -m "feat(edicao): componentes do sistema visual da Cartoon (letreiro, canal, peças, botão)"
```

---

### Task 4: Letreiros desenhados como asset do site

Spec §10.10.

**Files:**
- Create (gerados): `public/images/marcas-edicoes/2026.2/letreiros/nosso-elenco.webp`, `hora-de-provar.webp` e as variantes `-480.webp`/`-960.webp`
- Modify: `src/data/imageLibrary.js`
- Modify (gerado): `src/data/imageVariants.js`

**Interfaces:**
- Produces: `letreiroEdicao(chave: 'elenco'|'provar') → { src, largura, altura } | null`.
  - `elenco` = "Estrelando… Nosso elenco!";
  - `provar` = "Agora é hora de provar!".

- [ ] **Step 1: Converter os PNG do manual para WebP**

```bash
A="/f/F2 Experience Dropbox/Criação ELOI Design/SWEET&COFFEE WEEK/2026.2 SCW CARTOONS/00_BRIEFING_E_DIRECAO/01_SISTEMA_KV/MANUAL-DIRECAO-VISUAL-v02/assets"
mkdir -p public/images/marcas-edicoes/2026.2/letreiros
python -I -c "
import sys
from PIL import Image
a, d = sys.argv[1], sys.argv[2]
for origem, nome in [('ig-titulo-elenco.png', 'nosso-elenco'), ('ig-titulo-provar.png', 'hora-de-provar')]:
    im = Image.open(f'{a}/{origem}').convert('RGBA')
    im.save(f'{d}/{nome}.webp', 'WEBP', quality=88, method=6)
    print(nome, im.size)
" "$A" public/images/marcas-edicoes/2026.2/letreiros
```

Expected: `nosso-elenco (1462, 736)` e `hora-de-provar (1479, 724)`. Sem recorte: o tamanho fica igual ao do arquivo do manual, e é o que vai no Step 3.

- [ ] **Step 2: Gerar as variantes**

Run: `node scripts/gerar-variantes.mjs --so=2026.2/letreiros`
Expected: `src/data/imageVariants.js` ganha as duas entradas `/images/marcas-edicoes/2026.2/letreiros/…webp` com larguras `[480, 960]`.

- [ ] **Step 3: Registrar em `imageLibrary.js`**

Logo depois da função `fotoProximaEdicao`, acrescentar:

```js
/* Letreiros desenhados da edição 2026.2 (manual v03, assets/ig-titulo-*.png),
   recortados da margem transparente e convertidos para WebP. Título fixo de
   seção: <Letreiro imagem={letreiroEdicao('elenco')} texto="…" /> — o texto
   real vai no HTML. Letreiro novo entra aqui, nunca montado na página. */
const LETREIROS_EDICAO = {
  elenco: { src: '/images/marcas-edicoes/2026.2/letreiros/nosso-elenco.webp', largura: 1462, altura: 736 },
  provar: { src: '/images/marcas-edicoes/2026.2/letreiros/hora-de-provar.webp', largura: 1479, altura: 724 },
}

/** Letreiro desenhado da edição (`elenco` · `provar`), ou `null`. */
export function letreiroEdicao(chave) {
  return LETREIROS_EDICAO[chave] || null
}
```

- [ ] **Step 4: Rodar os testes de imagem**

Run: `npm run test:imagens`
Expected: passa. O caminho vem de `imageLibrary`, não da página.

- [ ] **Step 5: Commit (local)**

```bash
git add public/images/marcas-edicoes/2026.2/letreiros src/data/imageLibrary.js src/data/imageVariants.js
git commit -m "feat(edicao): letreiros desenhados 'Nosso elenco' e 'Hora de provar' como asset"
```

---

### Task 5: Vitrine `/cartoon/sistema`, só no DEV

Spec §10.12, etapa 1.

**Files:**
- Modify: `src/edicao/rotas.js`
- Modify: `src/edicao/cartoon/index.jsx`
- Create: `src/edicao/cartoon/paginas/Sistema.jsx`
- Create: `src/edicao/cartoon/paginas/sistema.css`
- Modify: `tests/rotas-edicao.test.mjs`
- Modify: `tests/cartoon-sistema.test.mjs`

**Interfaces:**
- Consumes: componentes da Task 3; `letreiroEdicao` da Task 4.
- Produces:
  - `resolverCena('/cartoon/sistema')` → `{ cena: 'sistema' }`;
  - `Sistema` (export default), carregado só quando `import.meta.env.DEV`.

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/rotas-edicao.test.mjs`, no teste `cenas da edição`, logo depois da linha `for (const s of ['mapa', 'minha-rota', 'avaliar', 'premiacao']) …`, acrescentar:

```js
  assert.deepEqual(c('/cartoon/sistema'), { cena: 'sistema' })
  assert.deepEqual(c('/cartoon/sistema/x'), { cena: 'inexistente' })
```

Em `tests/cartoon-sistema.test.mjs`, acrescentar:

```js
test('vitrine do sistema só existe no servidor de desenvolvimento', () => {
  const casca = ler('src/edicao/cartoon/index.jsx')
  assert.match(casca, /import\.meta\.env\.DEV\s*\?\s*React\.lazy\(\(\)\s*=>\s*import\('\.\/paginas\/Sistema\.jsx'\)\)\s*:\s*null/)
  assert.doesNotMatch(casca, /^import .*Sistema/m, 'import estático levaria a vitrine para o build')
  assert.match(ler('src/edicao/cartoon/paginas/Sistema.jsx'), /import '\.\/sistema\.css'/)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:cartoon`
Expected: FAIL em `cenas da edição` (`/cartoon/sistema` dá `inexistente`) e em `vitrine do sistema…` (ENOENT de `Sistema.jsx`).

- [ ] **Step 3: Cena `sistema` em `rotas.js`**

```js
export const CENAS = ['entrada', 'participantes', 'participante', 'combos', 'mapa', 'minha-rota', 'avaliar', 'premiacao', 'sistema', 'inexistente']
```

e

```js
  if (!slug && ['mapa', 'minha-rota', 'avaliar', 'premiacao', 'sistema'].includes(primeira)) return { cena: primeira }
```

- [ ] **Step 4: Vitrine preguiçosa no `index.jsx`**

Depois da linha `import { Premiacao } from './paginas/Premiacao.jsx'`:

```jsx
// Vitrine do sistema visual (docs/cartoon-2026-2/10 §10.12): só no DEV. Fora
// dele o import nem existe no código, então a vitrine não entra no build.
const Sistema = import.meta.env.DEV ? React.lazy(() => import('./paginas/Sistema.jsx')) : null
```

Trocar `const { cena, slug, foco } = resolverCena(path)` por:

```jsx
  const pedida = resolverCena(path)
  const { slug, foco } = pedida
  const cena = pedida.cena === 'sistema' && !Sistema ? 'inexistente' : pedida.cena
```

Em `TITULOS`, acrescentar `sistema: 'Sistema visual',`.

Trocar `const precisaLista = !['entrada', 'participante', 'inexistente'].includes(cena)` por:

```jsx
  const precisaLista = !['entrada', 'participante', 'sistema', 'inexistente'].includes(cena)
```

No `switch`, antes de `default:`:

```jsx
      case 'sistema': conteudo = <React.Suspense fallback={<Carregando texto="Carregando a vitrine…" />}><Sistema /></React.Suspense>; break
```

- [ ] **Step 5: `sistema.css`**

```css
/* Vitrine do sistema (só DEV). Só o arranjo da vitrine; o desenho das peças
   mora em src/styles/scw-cartoon.css. */
.ct-vitrine { padding-bottom: 48px; }
.ct-vitrine__cores { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.ct-vitrine__cor { display: grid; gap: 2px; padding: 12px; border: var(--ct-traco); border-radius: var(--ct-raio-p); background: var(--ct-creme); }
.ct-vitrine__amostra {
  display: grid; place-items: center; height: 72px; margin-bottom: 6px; border: var(--ct-traco); border-radius: 10px;
  background: var(--v-fundo); color: var(--v-tinta); font: 900 32px/1 var(--ct-font);
}
.ct-vitrine__papel { font-size: 15px; }
.ct-vitrine__tipos { display: grid; gap: 20px; margin: 0; }
.ct-vitrine__tipos dt { font: 700 13px/1.2 var(--ct-font); letter-spacing: .08em; text-transform: uppercase; }
.ct-vitrine__tipos dd { margin: 4px 0 0; }
.ct-vitrine__grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 24px; align-items: center; }
.ct-vitrine__pecas { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; margin-bottom: 24px; }
.ct-vitrine__pecas--quadro { margin-top: 32px; }
.ct-vitrine__logo { display: grid; place-items: center; width: 140px; height: 90px; font: 700 14px/1.2 var(--ct-font); }
```

- [ ] **Step 6: `Sistema.jsx`**

```jsx
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
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npm run test:cartoon`
Expected: todos passam.

- [ ] **Step 8: Conferir que a vitrine não entra no build**

```bash
npx vite build --outDir "$TEMP/scw_build_$$" --emptyOutDir > /dev/null && grep -rl "ct-vitrine" "$TEMP/scw_build_$$"; echo "achados: $?"; rm -rf "$TEMP/scw_build_$$"
```

Expected: nenhum arquivo listado e `achados: 1`. O `grep` devolve 1 quando não acha nada.

- [ ] **Step 9: Commit (local)**

```bash
git add src/edicao/rotas.js src/edicao/cartoon/index.jsx src/edicao/cartoon/paginas/Sistema.jsx src/edicao/cartoon/paginas/sistema.css tests/rotas-edicao.test.mjs tests/cartoon-sistema.test.mjs
git commit -m "feat(edicao): vitrine do sistema visual em /cartoon/sistema, só no DEV"
```

---

### Task 6: Vitrine no navegador (360 · 768 · 1440)

Spec §10.11.

**Files:**
- Create: `tests/cartoon-sistema-navegador.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: a vitrine da Task 5.
- Produces: script `npm run test:cartoon-sistema` e capturas em `tests/capturas-sistema/sistema-{360,768,1440}.png`, que não entram em commit.

- [ ] **Step 1: Escrever o teste**

`tests/cartoon-sistema-navegador.mjs`:

```js
/**
 * cartoon-sistema-navegador.mjs — vitrine do sistema visual da Cartoon no SERVIDOR DE DESENVOLVIMENTO.
 *
 *   npm run test:cartoon-sistema
 *
 * A vitrine (/cartoon/sistema) só existe no DEV (docs/cartoon-2026-2/10 §10.12),
 * então este teste sobe o `vite`, não o build. Reprova, em 360, 768 e 1440:
 *  1. mais de um <h1>; erro no console;
 *  2. Grandstander não carregada ou não aplicada ao texto;
 *  3. rolagem lateral;
 *  4. botão ou link da vitrine com menos de 44px de altura.
 * Guarda capturas em tests/capturas-sistema/ para a conferência visual do Wilker.
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 5218
const BASE = `http://localhost:${PORT}`
const CAPTURAS = join(__dirname, 'capturas-sistema')
const TELAS = [[360, 780], [768, 1024], [1440, 900]]
const falhas = []
const falha = (m) => { falhas.push(m); console.log(`  ✗ ${m}`) }
const ok = (m) => console.log(`  ✓ ${m}`)

function killTree (pid) {
  if (!pid) return
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    else process.kill(-pid, 'SIGKILL')
  } catch { /* já morto */ }
}

async function waitForServer (url, ms = 30000) {
  const t = Date.now()
  while (Date.now() - t < ms) {
    try { if ((await fetch(url)).ok) return } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`servidor não respondeu em ${ms}ms`)
}

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: join(__dirname, '..'), shell: true, stdio: 'ignore', detached: process.platform !== 'win32',
})
let browser
try {
  await waitForServer(`${BASE}/`)
  mkdirSync(CAPTURAS, { recursive: true })
  browser = await chromium.launch()
  for (const [w, h] of TELAS) {
    console.log(`\n${w}×${h}`)
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    const erros = []
    // Falha de rede da RPC da edição não é da vitrine (ela não usa dado); o resto é.
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push(m.text()) })
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(`${BASE}/cartoon/sistema`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.ct-vitrine', { timeout: 20000 })
    await page.evaluate(() => document.fonts.ready)
    const r = await page.evaluate(() => {
      const corpo = document.querySelector('.ct-vitrine .ct-bloco > p:not([class])')
      const alvos = [...document.querySelectorAll('.ct-vitrine a, .ct-vitrine button')]
        .filter((e) => e.offsetParent !== null)
        .map((e) => ({ texto: e.textContent.trim(), altura: Math.round(e.getBoundingClientRect().height) }))
      return {
        h1: document.querySelectorAll('h1').length,
        carregada: document.fonts.check('500 18px Grandstander'),
        familia: getComputedStyle(corpo).fontFamily,
        lateral: document.documentElement.scrollWidth - window.innerWidth,
        baixos: alvos.filter((a) => a.altura < 44),
      }
    })
    if (r.h1 === 1) ok('um <h1>'); else falha(`${w}: ${r.h1} <h1>`)
    if (r.carregada && /Grandstander/.test(r.familia)) ok('Grandstander aplicada'); else falha(`${w}: fonte "${r.familia}", carregada=${r.carregada}`)
    if (r.lateral <= 0) ok('sem rolagem lateral'); else falha(`${w}: rolagem lateral de ${r.lateral}px`)
    if (r.baixos.length === 0) ok('alvos ≥ 44px'); else falha(`${w}: alvos baixos ${JSON.stringify(r.baixos)}`)
    if (erros.length === 0) ok('console limpo'); else falha(`${w}: console — ${erros.join(' | ')}`)
    await page.screenshot({ path: join(CAPTURAS, `sistema-${w}.png`), fullPage: true })
    await page.close()
  }
} finally {
  await browser?.close()
  killTree(vite.pid)
}
if (falhas.length) { console.log(`\n${falhas.length} falha(s)`); process.exit(1) }
console.log('\nvitrine ok')
```

- [ ] **Step 2: Script no `package.json`**

Acrescentar depois de `"test:cartoon-navegador"`:

```json
    "test:cartoon-sistema": "node tests/cartoon-sistema-navegador.mjs",
```

- [ ] **Step 3: Rodar**

Run: `npm run test:cartoon-sistema`
Expected: as 3 telas com 5 `✓` cada e `vitrine ok` no fim.

Se algum alvo vier com menos de 44px ou houver rolagem lateral, corrigir no CSS da peça (Task 3) ou da vitrine (Task 5), nunca no teste, e rodar de novo.

- [ ] **Step 4: Commit (local)**

```bash
git add tests/cartoon-sistema-navegador.mjs package.json
git commit -m "test(edicao): vitrine do sistema no navegador em 360, 768 e 1440"
```

---

### Task 7: Documentação e passada de testes

Regra de ouro do `CLAUDE.md` §0.1: documento que diverge é corrigido no mesmo commit.

**Files:**
- Modify: `src/CLAUDE.md` (§6.1, depois das exceções F2 e WhatsApp)
- Modify: `CLAUDE.md` (§3.2, tabela de comandos)
- Modify: `docs/cartoon-2026-2/10-sistema-visual-e-paginas.md` (§10.4)

- [ ] **Step 1: Exceção declarada em `src/CLAUDE.md` §6.1**

Depois do parágrafo que termina em `…como o Instagram desde 14/10/2026.`, acrescentar:

```markdown
#### Exceção declarada — a camada da edição (27/10/2026)

A camada de edição (`.ct-edicao`, `src/styles/scw-cartoon.css`, rota `/cartoon`) tem
**paleta, fonte e forma próprias**: é o KV da edição (§2.1 do `CLAUDE.md` raiz), não o
festival institucional. Fonte: `docs/cartoon-2026-2/10-sistema-visual-e-paginas.md` §10.3
(manual v03). Lá dentro **não valem** a tabela de 9 cores deste §6.1, a família Nexa do
§6.5 nem o "botão chapado, sem sombra" do §6.6 — valem a paleta da edição, a
**Grandstander** e a sombra curta de desenho animado. Fora de `.ct-edicao` nada disso
existe: `tests/rotas-edicao.test.mjs` reprova vazamento de `--ct-*`, e
`tests/cartoon-sistema.test.mjs` reprova a fonte declarada fora da camada e mede o
contraste a partir dos tokens.
```

- [ ] **Step 2: Comando novo no `CLAUDE.md` §3.2**

Logo depois da linha da tabela que começa com `| \`npm run test:cartoon\` (inclui \`test:rotas-edicao\`)`, acrescentar:

```markdown
| `npm run test:cartoon-sistema` | vitrine do sistema visual da Cartoon (`/cartoon/sistema`, só no DEV) contra o `vite`: um `<h1>`, Grandstander aplicada, sem rolagem lateral e alvos ≥ 44px em 360/768/1440; capturas em `tests/capturas-sistema/` |
```

- [ ] **Step 3: Ajustar a spec §10.4 ao que foi construído**

Em `docs/cartoon-2026-2/10-sistema-visual-e-paginas.md`, trocar:

```markdown
Um arquivo por componente, sem estilo inline. Os estilos ficam em `scw-cartoon.css`, sobre os tokens.
```

por:

```markdown
`Letreiro.jsx`, `TopoCanal.jsx` e (etapa 2) `Olhinhos.jsx` têm arquivo próprio. As peças
pequenas ficam juntas em `pecas.jsx`. Sem estilo inline; o desenho fica em
`scw-cartoon.css`, sobre os tokens. O `Botao` reusa as classes `.ct-botao` que as páginas
já usam, então o botão novo vale para a camada inteira de uma vez.
```

Na mesma seção, a linha da `Placa` passa a dizer `cor` (amarelo · creme · turquesa; a tinta é sempre chocolate).

- [ ] **Step 4: Passada completa**

```bash
npm run test:cartoon && npm run test:imagens && npm run test:redesign && npm run test:cartoon-sistema
npx vite build --outDir "$TEMP/scw_build_$$" --emptyOutDir > /dev/null && echo build-ok; rm -rf "$TEMP/scw_build_$$"
```

Expected: todos verdes e `build-ok`. `test:cartoon-navegador`, `responsive` e `motion` não rodam aqui: eles exigem `npm run build` dentro do projeto e entram na passada da etapa 4, quando a casca muda.

- [ ] **Step 5: Commit (local)**

```bash
git add src/CLAUDE.md CLAUDE.md docs/cartoon-2026-2/10-sistema-visual-e-paginas.md
git commit -m "docs(edicao): exceção declarada da camada Cartoon e comando da vitrine"
```

---

### Task 8: Ponto de aprovação

- [ ] **Step 1:** subir o servidor (`preview_start` com a config `sweet-coffee-week`) e abrir `http://localhost:3000/cartoon/sistema` no painel do navegador.
- [ ] **Step 2:** mandar ao Wilker as capturas `tests/capturas-sistema/sistema-360.png` e `sistema-1440.png` (SendUserFile).
- [ ] **Step 3:** **PARAR.** Pedir aprovação de cores, tipografia, letreiros, peças e canais. Cada ajuste pedido vira edição no CSS e uma nova rodada do Task 6, Step 3.
- [ ] **Step 4:** registrar o resultado em `progresso-scw.md` (memória) e só então pedir o plano detalhado da etapa 2.

---

# Etapas 2 a 9 · roteiro

Cada etapa tem plano detalhado próprio (writing-plans), escrito depois da aprovação da anterior e com as mesmas Global Constraints. Cada uma termina com o Wilker conferindo no `localhost`.

### E2 · Olhinhos (spec §10.5) → **aprovação**
- `src/edicao/componentes/sistema/Olhinhos.jsx`: SVG desenhado no código.
  - Ovais, contorno de nanquim (`--ct-traco-desenho`), filete branco, pupila, dois brilhos, pálpebra e sobrancelha.
  - Props `expressao` (`encantado` · `esperto` · `surpreso`), `olhar` (`{x, y}` relativo ou `'cursor'`) e `lado`.
- Referência de forma: `olhos-1-encantado.png`, `olhos-2-esperto.png` e `olhos-3-surpreso.png` da pasta do manual.
- Movimento:
  - piscada por temporizador com intervalo aleatório de 3–6 s, às vezes dupla;
  - troca de expressão interpolada;
  - antecipação e quique nas curvas.
  - Tudo desligado com `prefers-reduced-motion`.
- Seguir o cursor só com `olhar="cursor"` (herói da Entrada).
- Entra primeiro na vitrine. Teste de navegador: piscada acontece; parado com movimento reduzido; nenhum `<button>` dentro (é decorativo, `aria-hidden`).

### E3 · Retrato local dos dados (spec §10.9 e §10.14)
- Campos completos do §10.14: valor do combo (da organização), restrições alimentares, atendimento com canais e links, unidades, galeria e o par de logos desenhadas.
- Coordenadas geocodificadas via Nominatim só no retrato, marcadas "a conferir".
- Logos desenhadas: os 29 pares de `ILUSTRACOES_DERIVADAS` otimizados em WebP, fora do git enquanto forem só do retrato local.
- Ler no banco a função de projeção (`recortar_publico`) e as de publicação para reproduzir o formato de `edicao_publica` e de `participante_publico`.
- Montar por consulta de leitura (MCP `supabase-scw`) incluindo as casas não publicadas.
- Gravar em `src/edicao/dados/retrato/cartoon.local.json` (+ `.gitignore`). Logos copiadas para `public/retrato-local/` se o storage for privado.
- `src/edicao/dados/publico.js`: no DEV, demo (`?demo=1`) > retrato > RPC.
- Aviso "Retrato local do painel · dd/mm" em `base.jsx`.
- Teste: o teste existente "build de produção não carrega dado de demonstração" passa a cobrir o retrato.

### E4 · Casca (spec §10.6)
- Selo da edição como asset (`logo-scw-cartoon.png` → WebP, `imageLibrary`).
- Cabeçalho creme; menu do celular em folha (Esc, véu, link); abas creme com contorno.
- Rodapé chocolate com `BarrasSinal` e a logo F2 já do site (`/images/logo-f2experience.svg`).
- Quebras de tela da camada passam a ser 600 / 900 / 1200 (spec §10.3). Os `@media` de 760/761 do herói saem aqui; os dos filtros saem na E6.
- Testes: `cartoon-navegador` (seção 9 atualizada para a casca nova + menu), `responsive`, `casca-institucional` (institucional intacto).

### E5 · Entrada (spec §10.7)
- `TopoCanal estreia`:
  - letreiro `provar`;
  - TV-cidade (asset novo);
  - olhinhos seguindo o cursor;
  - placas só com fatos do dado.
- Depois do topo: Como funciona (etiqueta azul) · Nosso elenco (logos em `Quadro`) · Onde ficam · Avalie · Dúvidas.
- Teste de navegador da cena, com o retrato e com a demonstração.

### E6 · Participantes + ficha da casa
- Componente `LogoDesenhada`: preto e branco → colorido com tinta espalhando a partir do mouse, pintando uma vez no celular, colorida direto com movimento reduzido. Só o desenho representa a casa, sem a logo oficial (decisão do Wilker, 27/10).
- Ficha com todos os blocos de conteúdo do §10.14, cada um com o seu link.
- **Catálogo:** foto do combo como protagonista, "Foto em produção" com a logo no `Quadro`, filtros bairro / aberto hoje / vegano / diet / para viagem / delivery.
- **Ficha:** topo Elenco, bloco do combo em `TopoCanal cardapio`, unidades, restrições.
- **Painel:** `FichaParticipante` muda junto. Rodar `npm run test:painel` (ou o teste do painel que a usa) e confirmar verde.

### E7 · Mapa + painel do Sweet Lover (spec §10.14)
- **Mapa** (`TopoCanal rota`): a edição inteira num plano geral, "perto de mim", filtros (bairro, aberto agora, quero ir, já fui) e lista ao lado. Unidade sem coordenada conferida entra com "localização em conferência".
- **Por casa:** "quero ir" e "já fui", no mapa, no cartão e na ficha.
- **Minha rota** vira o painel do Sweet Lover:
  - lista "quero ir";
  - visitadas;
  - progresso "x de N casas";
  - paradas em placas numeradas e tracejado vermelho;
  - Google Maps em trechos;
  - compartilhar por link.
- Persistência no aparelho, por edição, estendendo `src/edicao/rota/minhaRota.js` (lógica pura). Testes novos de estado: marcar, desmarcar, migrar a rota antiga, storage quebrado. Os testes de rota existentes continuam verdes.

### E10 · Mapa ilustrado de Natal (depois da E7)
- Com as coordenadas conferidas, plotar as casas sobre o contorno de Natal e gerar o desenho em estilo cartoon, misturando os temas das casas.
- Ferramenta: skill `gerar-imagem-openai`, medium, com o manual v03 como referência.
- Uso: peça da edição e, se aprovado, camada do mapa do site.

### E8 · Avaliar + Premiação
- **Avaliar:** `TopoCanal servico`, letreiro "Avalie sua experiência" (versão de fundo transparente do asset do manual) e estado "abre em 5 de novembro" com olhinhos surpresos longe do formulário.
- **Premiação:** `TopoCanal gala`, troféu oficial sob holofote, pódio sem inventar 2º e 3º.

### E9 · Acabamento
- Letreiros que faltarem ("Onde ficam", "Minha rota", "Sweet Awards"), gerados pela skill `gerar-imagem-openai` em qualidade medium, se o Wilker aprovar a página com letreiro em CSS e pedir o desenhado.
- Passada final:
  - `test:cartoon`, `test:cartoon-sistema`;
  - `npm run build && npm run test:cartoon-navegador`, `responsive`, `motion`, `casca-institucional`;
  - `test:redesign`, `test:imagens`, testes do painel.
- Atualizar `09-execucao.md`, `README.md` da pasta e a memória `progresso-scw.md`.
