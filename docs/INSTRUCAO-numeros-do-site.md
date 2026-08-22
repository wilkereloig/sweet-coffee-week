# INSTRUÇÃO — Atualizar os números do site

**Para o Claude Code, na branch `dev/site-completo`.** Escrito em 22/08/2026, a partir da
auditoria em `acervo/analise-numeros-site-2026-08.md`.

---

## 0 · Antes de qualquer coisa

```bash
git branch --show-current   # tem que ser dev/site-completo. Se for master/main: PARE e avise.
git status --short
git diff --stat
```

⚠️ **As alterações desta instrução JÁ ESTÃO APLICADAS no working tree**, sem commit.
Os arquivos da tarefa são exatamente estes quatro:

```
src/data/festivalFacts.js
src/pages/institutional/Home.jsx
src/pages/institutional/Participar.jsx
src/pages/institutional/Apoiar.jsx
```

**Se `git diff` mostrar os quatro:** seu trabalho é **conferir contra a especificação do §2,
rodar as checagens do §3 e commitar** como manda o §4. Não refaça.

**Se o working tree estiver limpo** (alguém descartou): aplique a especificação do §2 do zero.

⛔ **`public/organizacao/index.html`** também aparece modificado e os três `.md` na raiz e
em `docs/` aparecem como untracked. **Nada disso é desta tarefa — não commitar junto.**

---

## 1 · Absolutas

| # | Regra |
|---|---|
| A1 | Trabalhar só em `dev/site-completo`. Nunca `master`/`main` |
| A2 | **Nenhum deploy.** Nunca `vercel --prod`, nunca merge para `master` |
| A3 | **Não tocar nas flags** de `src/App.jsx` (`COMING_SOON_PUBLICATION` segue `true`) |
| A4 | **Não inventar número.** Todo dado histórico sai da contagem da base, nunca digitado |
| A5 | `git add` só nos quatro arquivos do §0 |

---

## 2 · A especificação

### 2.1 `src/data/festivalFacts.js` — a fonte única, em duas naturezas

O arquivo passa a separar o que dá para contar do que não dá:

**Derivado** (contado de `sweetCoffeeHistory.js` + `participants.js` a cada import, com os
aliases resolvidos por `normalizeParticipantName` de `sweetHistoryStats.js`). Uma marca
conta **uma vez por edição** — rede com várias unidades = 1 marca:

| Campo | Valor esperado | O que é |
|---|---|---|
| `editions` | 16 | edições realizadas |
| `brands` | 123 | casas distintas na história |
| `participations` | 410 | soma das 16 listas = combos autorais criados |
| `returnRate` | 68 | % das marcas que participaram de 2+ edições (84 de 123) |
| `newPerEdition` | 7 | média de estreias por edição depois da primeira |
| `storesLastEdition` | 33 | soma das unidades das 21 marcas da Lovers |

⚠️ **Se algum desses valores sair diferente, NÃO ajuste o número — investigue a base.**
Eles batem com `acervo/ACERVO-OFICIAL.md` §9.1 e com os testes.

**Literal**, porque não há como derivar — cada um carrega `mede` e `apurado`:

| Campo | Valor | Apuração |
|---|---|---|
| `combosSold` | 34 mil | junho de 2026 |
| `revenue` | 712 mil | junho de 2026 |
| `igViews` | 18 milhões | junho de 2026 |
| `igReach` | 200 mil | junho de 2026 |
| `igInteractions` | 290 mil | junho de 2026 |
| `igFollowers` | 65 mil | junho de 2026 |
| `igPosts` | 1.600 | junho de 2026 |

`daysPerEdition` fica literal em **11**, com `mede: 'duração da rota em cada edição, padrão
desde 2019'` — as edições 2017.1, 2018.1 e 2018.2 duraram 10 dias, e o comentário do
arquivo registra isso.

⚠️ **Alcance, interações e visualizações são métricas distintas. Nunca somar, nunca chamar
de "impressões".** Métricas do festival não se misturam com as da F2 Experience.

### 2.2 Home · 05 Números — quatro cards

| Numeral | Rótulo | Nota |
|---|---|---|
| `123` | marcas participantes | casas de Natal e região: doçarias, cafeterias, confeitarias e restaurantes |
| `410` | combos autorais criados | uma criação por marca em cada edição |
| `+34 mil` | combos vendidos | somando as 16 edições |
| `+18 mi` | visualizações no Instagram | cerca de 23 vezes a população de Natal |

Cores e discos na ordem amarelo → cyan → magenta → roxo; ícones
`simbolos/estabelecimento`, `simbolos/combo-oficial`, `combos/doce-cafe`,
`redes/instagram`. Todos os valores vêm de `festivalFacts`, nenhum escrito no JSX.

**Saiu:** "16 edições" — já está na pill do herói e na página Edições.

⚠️ **O 123 nunca vai sozinho.** Sem a nota, o leitor confunde marca com endereço: são 123
**casas**, cada rede contada uma vez, contra 33 **lojas** só na última edição.

### 2.3 Participar · 03 Números — seis cards

| Numeral | Rótulo | Descrição |
|---|---|---|
| `68%` | das marcas voltaram | 84 das 123 marcas participaram de mais de uma edição |
| `410` | combos autorais criados | uma criação inédita por marca em cada edição — 123 casas distintas de Natal e região desde 2016 |
| `+18 mi` | visualizações no Instagram | conteúdo do festival e das marcas participantes |
| `11 dias` | em cartaz por edição | duração da rota em cada edição, padrão desde 2019 |
| `33` | lojas na última edição | 21 marcas na última edição, somando todas as unidades |
| `7` | marcas novas por edição | média de estreias por edição desde 2016 |

Ícones: `simbolos/memoria`, `simbolos/combo-oficial`, `redes/instagram`, `ui/calendario`,
`mecanica/loja`, `topicos/circulacao`. Números e descrições vêm de `festivalFacts`.

**Saíram:** "16 edições", "+120 marcas" e "+34 mil combos" (já estão na Home) e
**"17 matérias na imprensa"** — este também na nota da seção 06, que perdeu a frase
"São 17 matérias no total". A galeria de registros em TV e os chips de veículo ficam:
a seção prova repercussão por evidência, não por contagem. O número volta quando o
levantamento das matérias fechar.

### 2.4 Apoiar · 02 Alcance — seis cards

| Numeral | Rótulo | Descrição |
|---|---|---|
| `+R$ 712 mil` | movimentação direta | movimentação direta no caixa das marcas, somando as 16 edições |
| `+18 mi` | visualizações no Instagram | cerca de 23 vezes a população de Natal |
| `+200 mil` | de alcance | contas alcançadas — 1 em cada 4 moradores de Natal |
| `+290 mil` | interações | curtidas, comentários, salvamentos e compartilhamentos |
| `+65 mil` | seguidores no Instagram | comunidade Sweet Lovers que acompanha combos e resultados |
| `+34 mil` | combos vendidos | combos vendidos somando as 16 edições |

Ícones: `mecanica/promocao`, `redes/instagram`, `mecanica/publico`, `mecanica/avaliar`,
`simbolos/sweet-lovers`, `combos/doce-cafe`. O ícone do card de alcance **não** repete o
`topicos/alcance` do rótulo da seção.

O parágrafo de abertura da seção declara a apuração e o aviso das métricas distintas.

**Saíram:** "+1.600 posts", "16 edições" e "10 anos".

### 2.5 Sweet Awards — não tocar

Os três números do herói (11 edições premiadas · 271 prêmios · 44 marcas premiadas) já são
contados da base. **Não alterar.**

---

## 3 · Checagens obrigatórias

```bash
npx vite build --outDir "$TEMP/scw_build_$$" --emptyOutDir && rm -rf "$TEMP/scw_build_$$"
node tests/redesign-2026.test.mjs
```

Esperado: build limpo (~135 módulos) e **15/15 testes passando** — inclusive
"os números citados no texto editorial batem com a base" e "flags de publicação seguem
intactas". Qualquer falha: **parar, mostrar o erro e não commitar.**

Conferir também, com os olhos:

- [ ] nenhum número histórico digitado no JSX — todos saem de `festivalFacts`;
- [ ] o `123` aparece sempre acompanhado da explicação de que são casas de Natal e região;
- [ ] nenhuma chave de ícone inexistente (varrer os `nome=`/`i:` contra `SCW_ICONS`);
- [ ] nenhum número repetido entre Home, Participar e Apoiar;
- [ ] a seção 07 da Home (F2 Experience) segue intocada.

---

## 4 · Commit

```bash
git add src/data/festivalFacts.js src/pages/institutional/Home.jsx \
        src/pages/institutional/Participar.jsx src/pages/institutional/Apoiar.jsx

git commit -m "feat: números do site derivados da base, com apuração declarada

- festivalFacts.js separa histórico derivado (16/123/410/68%/7/33) de comercial literal
- cada número comercial carrega o que mede e a apuração de junho de 2026
- Home: 123 marcas explicadas, 410 combos autorais, +34 mil combos, +18 mi
- Participar: 68% de retorno, 410 combos, +18 mi, 11 dias em cartaz, 33 lojas, 7 estreias
- Apoiar: R\$ 712 mil, +18 mi, +200 mil alcance, +290 mil interações, +65 mil, +34 mil
- remove '17 matérias' (sem lastro no acervo) e a duplicação entre as três páginas"

git push origin dev/site-completo
```

⛔ **Não commitar** `public/organizacao/index.html` nem os `.md` untracked — são de outra
frente de trabalho.

---

## 5 · O que continua pendente depois deste commit

1. **Atualizar `acervo/regras-do-projeto-site.md` §8.4**, que ainda manda escrever
   "+120 marcas" e "desde 2016" em vez de "10 anos". O site já mudou; a regra precisa
   acompanhar — e a §9.1 ganha os números derivados novos.
2. **Levantar as matérias de imprensa** com veículo, data e URL, para o número voltar.
3. **Nota de "40% das marcas que disputaram"** no herói do Sweet Awards (44 de 110 marcas
   que participaram de alguma edição premiada) — exige markup novo no bloco de três
   números; decidir se entra.
4. **Publicar** o institucional é `COMING_SOON_PUBLICATION = false`, e isso é decisão do
   Eloi, nunca automática.
