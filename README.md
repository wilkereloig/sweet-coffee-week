# Sweet & Coffee Week

Site oficial do festival **Sweet & Coffee Week** — Natal/RN. Vite + React 18 (JSX),
sem TypeScript. Publicado na Vercel.

> ## 👉 As regras do projeto estão em [`CLAUDE.md`](CLAUDE.md)
>
> Documento único: arquitetura, sistema visual, tom, dados do festival, armadilhas
> conhecidas e o que não mexer. **Se ele divergir do código, vale o código.**
>
> Este README não repete nada do que está lá — um fato em dois arquivos vira dois
> fatos diferentes na primeira mudança.

## ⚠️ Duas branches, e nenhuma delas é "a certa" sozinha

| Branch | O que é |
| --- | --- |
| `master` | **o que está publicado.** A Vercel faz deploy a cada push aqui |
| `dev/site-completo` | **onde o trabalho acontece.** Tem commits que `master` ainda não recebeu |

As duas divergiram. Ler só uma dá uma imagem incompleta do projeto: `master` mostra o
site que está no ar, `dev/site-completo` mostra para onde ele está indo.

Ferramenta que lê este repositório — conector do Claude Design, agente, revisor, IDE —
deve apontar para **`dev/site-completo`**. `master` só recebe merge com autorização
explícita do Wilke, porque push nele é deploy de produção.

## Setup

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # gera dist/
```

⚠️ As páginas estáticas de `public/` (`/quero-participar/`, `/organizacao/`, `/marca/`)
**não são servidas pelo dev server** — o Vite não resolve índice de diretório para
`public/`. Conferir essas contra o build. Ver `CLAUDE.md` §10.4-b.

## Testes

```bash
npm run test:redesign         # paleta, tipografia e medida de linha
npm run test:motion           # movimento, 6 páginas × 2 telas
npm run test:imagens          # caminho de imagem montado à mão
npm run test:quero-participar # a página estática de pré-cadastro
npm run test:organizacao      # o painel interno
node tests/responsive.mjs     # overflow horizontal, contra o build
```

`package.json` tem a lista completa.

## Estrutura

```
src/
  components/   casca do site, ícones
  pages/institutional/   Home · Edicoes · HistoricoAwards · Participar ·
                         Apoiar · Contato · EmBreve
  data/         dados do festival — fonte única de cada número
  hooks/        useSiteMotion.js (motor de movimento)
  styles/       scw-2026.css (sistema visual) · scw-motion.css · scw-<pagina>.css
  App.jsx · router.js
public/         imagens, fontes e as páginas estáticas
tests/
```

## Publicação

`src/App.jsx` carrega as flags que decidem o que o domínio oficial mostra —
`COMING_SOON_PUBLICATION` está **ligada** hoje, então o público vê só a landing
`/em-breve`. **Não alterar sem pedido explícito**: ver `CLAUDE.md` §3.4, que explica
as três flags e por que a alteração é decisão do Wilke, nunca automática.
