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

## As duas branches, e o que cada uma é

| Branch | O que é |
| --- | --- |
| `dev/site-completo` | **o site em desenvolvimento — a versão de verdade.** Site institucional completo: Home, Edições, Sweet Awards, Participar, Apoiar, Contato |
| `master` | **só o que está publicado hoje:** a landing `/em-breve` e as páginas estáticas. A Vercel faz deploy a cada push aqui |

**`dev/site-completo` é superconjunto de `master`** — tudo que está no ar também está
aqui. Ler `dev/site-completo` dá a imagem inteira do projeto; ler `master` dá só a
fatia publicada.

**É essa versão que vai substituir a `/em-breve`.** Publicar é virar
`COMING_SOON_PUBLICATION` para `false` em `src/App.jsx` e mesclar em `master` — as
duas coisas são decisão do Wilke, nunca automáticas (`CLAUDE.md` §3.4, A2, A3).

⚠️ **Commit que entra por `master` tem que voltar para `dev/site-completo`.** Foi a
divergência entre os dois troncos que produziu duas implementações da área da marca e
o conflito `add/add` da unificação de 22/08/2026. Tronco que só recebe e nunca devolve
vira o segundo tronco de novo na leva seguinte.

Ferramenta que lê este repositório — conector do Claude Design, agente, revisor, IDE —
aponta para **`dev/site-completo`**.
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

## Onde o site está no ar

| Link | O que é |
| --- | --- |
| <https://sweetcoffeeweek.com.br> | **produção.** O domínio oficial, o link do cliente |
| <https://site-sweet-coffee-week.vercel.app> | mesmo deploy de produção, pelo domínio da Vercel |
| <https://site-sweet-coffee-week-git-master-eloidesignstudio.vercel.app> | alias fixo da branch `master` |

O projeto na Vercel é **`site-sweet-coffee-week`** (org `eloidesignstudio`), e faz
deploy de produção a cada push em `master`. Push em `dev/site-completo` gera Preview,
com URL nova a cada commit — pegar a do último deploy no painel da Vercel.

⚠️ **`sweet-coffee-preview.vercel.app` é um projeto ANTIGO e parado**, de outra conta
de deploy. Ele responde 200 e serve uma versão obsoleta do site — por isso é pior que
um link quebrado: parece atual. Não passar esse link para ninguém.
