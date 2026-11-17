# Revisão do institucional depois da edição Cartoon (16/11/2026)

Registro da atualização pedida pelo Wilker em 16/11/2026: o site volta a apresentar o Sweet & Coffee Week como
festival permanente, com a Cartoon numa seção própria da Home e na expectativa do Sweet Awards. Branch
`dev/site-completo`; nada foi publicado em `master`.

Números, fontes, pendências e o passo a passo de publicação de resultado: `docs/numeros-do-site.md`.
Regras de cada página: `docs/regras/07-*.md`. Encerramento da edição: `docs/cartoon-2026-2/22-encerramento-da-edicao.md`.

## 1. Matriz de rotas

| Rota | Como estava (commit `ec6eee05`) | O que mudou | Como foi validado |
|---|---|---|---|
| `/` (Home) | abertura no modo destaque, "Edição encerrada", com o vídeo de lançamento; seção Encerramento com quatro cartões e três botões que repetiam Faça parte | abertura do festival ("O festival que põe Natal à mesa."), ficha com a última edição lida da base; **Capítulo Cartoon** com a cidade oficial, selo, placa e troféu, estado do resultado, duas ações e a ampliação da arte; agradecimento e créditos na mesma seção; Trajetória com período por apuração; chamada do Awards voltada ao histórico; sugestão para a próxima edição na linha de contato | `tests/home-cartoon.test.mjs`, `tests/numeros.test.mjs`, `tests/capitulo-cartoon-navegador.mjs` (360, 390, 768, 1440), `tests/casca-institucional.mjs`, capturas |
| `/edicoes` | Cartoon já no acervo, dois cartões de 2026 corrigidos | sem mudança de layout; números lidos da fonte | `tests/edicoes.test.mjs`, captura |
| `/edicoes/2026.2` | ficha dizia "Premiação em apuração"; sem seção de Sweet Awards; galeria sem aviso | nota de imagem ilustrativa na galeria; "O lançamento da edição" com o vídeo (sem tocar sozinho) e o reel; chapa "Sweet Awards desta edição" em apuração, com caminho para o Awards | `tests/edicoes.test.mjs`, `tests/destaque-edicao.test.mjs`, captura |
| `/sweet-awards` e `/historico-sweet-awards` | abria com os resultados da Lovers como se fossem os mais recentes; `EDICAO_RECENTE` digitado | abertura da expectativa da Cartoon (edição, estado, explicação, Instagram, "Ver resultados anteriores"); resultados rotulados "Último resultado publicado · 2026.1 Lovers"; edição dos resultados derivada da base; intervalo de anos do histórico derivado; título da aba "Sweet Awards" | `tests/sweet-awards.test.mjs`, `tests/numeros.test.mjs` (publicação futura com base sintética), navegador, captura |
| `/participar` | "17 edições, de Início a Lovers"; nota de apuração sem período | última edição lida da base (Cartoon); nota diz "até a 16ª edição (Lovers)"; registro de interesse segue sem prometer vaga, tema ou data | `tests/numeros.test.mjs`, `tests/quero-participar.test.mjs`, captura |
| `/apoiar` | "Histórico comercial das 17 edições" ao lado de números das 16 | fonte com o período real de cada grupo; itens sem valor somem | `tests/numeros.test.mjs`, captura |
| `/contato` e central de dúvidas | "Qual é o tema da edição atual?"; resposta genérica sobre resultados | pergunta passa a falar da próxima edição e lembra a última realizada; "Quando os resultados são divulgados?" diz onde acompanhar a Cartoon e leva ao Sweet Awards (enquanto em apuração) | `tests/faq-central.test.mjs`, `tests/numeros.test.mjs` |
| `/privacidade`, `/cookies`, `/termos`, `/uso-de-imagem` | citam mapa e Caça aos Carimbos como tratamento de dados da edição | sem mudança: o texto descreve dados que continuam guardados | `tests/consentimento.test.mjs` |
| `/em-breve` | número de edições e unidades digitados | número de edições e prefixo/unidade lidos da fonte | `tests/numeros.test.mjs` |
| `/cartoon/*` | fora do ar, mostra a Home; título da aba ainda "Cartoon · 5 a 15 de novembro" | título e descrição passam a ser os da Home enquanto a edição está fora do ar; canônico segue `/` | `tests/rotas-edicao.test.mjs`, `tests/consentimento.test.mjs` |
| `/q/<código>` (QR impressos) | abrem a Home e contam a leitura | sem mudança | `tests/qr-leituras.test.mjs` |
| Cabeçalho, rodapé, menu e abas | rótulos e destinos corretos | sem mudança | `tests/casca-institucional.mjs`, `tests/responsive.mjs` |
| `index.html`, `sitemap.xml` | 17 edições nas descrições; `/edicoes/2026.2` no sitemap | datas de `/sweet-awards`, `/edicoes` e `/edicoes/2026.2` no sitemap | leitura |

## 2. O que não foi mexido, de propósito

- Flags de publicação e interruptores da edição (`src/App.jsx`, `src/edicao/config.js`).
- Código, banco e painel da edição: mapa, Caça aos Carimbos, avaliação, vouchers.
- Fórmulas de avaliação, elegibilidade, desempate e apuração.
- Dados gerados (`src/data/mundoEdicao.js`, `imageVariants.js`).
- `public/manifest.webmanifest` (aplicativo da Caça): decisão do Wilker, ver `docs/numeros-do-site.md` §6.
- Os dois arquivos com alteração local anterior a esta revisão (`scripts/edicao/mapa-rascunho.mjs` e a linha
  `test:produtos` do `package.json`) ficaram fora do commit.

## 3. Capturas

`tests/capturas-revisao-2026-11-16/`: Home, Edições, detalhe da Cartoon, Sweet Awards, Participar, Apoiar e
Contato, em 1440×900 e 390×844, página inteira. `tests/capturas-capitulo-cartoon/`: a seção Cartoon, a ampliação
da cidade e a abertura do Sweet Awards em 360, 390, 768 e 1440.
