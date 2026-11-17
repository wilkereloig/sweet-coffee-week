# 22 · Encerramento da edição Cartoon (16/11/2026)

Registro do que foi feito ao encerrar a 17ª edição (2026.2, Cartoon, 5 a 15 de novembro de 2026) e de
onde está cada coisa. Pedido do Wilker em 16/11/2026: voltar ao site institucional, preservar a edição no
acervo, desligar o site da edição sem apagar nada e avisar na Home que os resultados estão em apuração.

## 1. O que mudou no site

| O quê | Onde | Estado |
|---|---|---|
| Entrada do domínio | `src/edicao/config.js` → `ENTRADA_PRINCIPAL = 'institucional'` | `/` voltou a ser a Home institucional; `/festival` segue abrindo a mesma Home |
| Site da edição | `CARTOON_PUBLICA = false`, `MAPA_PUBLICO = false` | `/cartoon/*` cai na Home (regra de `src/lib/rotas.js`); em DEV e em `*.vercel.app?preview=1` a edição continua abrindo |
| QR impressos | `src/edicao/qrPontos.js` → com a edição fora do ar, todo código vai para `/` | a leitura continua sendo contada em `api/q.js` |
| Canônico e sitemap | `src/lib/pageMeta.js`, `public/sitemap.xml` | `/cartoon/*` e `/festival` apontam para `/`; saíram do sitemap; entrou `/edicoes/2026.2` |
| Acervo | `src/data/sweetCoffeeHistory.js` e derivados | Cartoon é a 17ª edição, 27 participantes, galeria com um combo por casa, premiação `em-apuracao` |
| Home | `src/data/destaqueEdicao.js` (desligado), `CAPITULO_CARTOON` em `src/data/conteudo/home.js`, `src/pages/home/secoes/CapituloCartoon.jsx`, `src/data/resultadosEdicao.js` | abertura do festival + Capítulo Cartoon: cidade ilustrada oficial, estado do Sweet Awards, agradecimento e créditos (revisão do mesmo dia; a primeira versão era a seção "Encerramento") |
| Sweet Awards | `src/pages/sweet-awards/secoes/AberturaApuracao.jsx`, `APURACAO` em `src/data/conteudo/sweet-awards.js` | abre com a Cartoon em apuração; os resultados logo abaixo são os últimos publicados (Lovers) |
| Próxima edição | `src/data/proximaEdicao.js` | tema, período, mês e ano em `null`; registro de interesse segue aberto |

## 2. O que NÃO foi apagado (e como religar)

Todo o código da edição continua em `src/edicao/` e `src/styles/scw-cartoon.css`: entrada, participantes,
combos, avaliação, premiação, mapa ilustrado, mapa real, Caça aos Carimbos, grupos, avisos, campanha
Ter Com Quem Contar, vouchers. O painel (`painel-app/`) e o banco não mudaram: avaliações, mapas, carimbos,
pedidos, prêmios, vendas diárias e leituras de QR seguem no Supabase.

Para rever a edição: abrir em DEV ou numa prévia `*.vercel.app?preview=1`. Para religar no domínio (decisão do
Wilker, com deploy): os três interruptores de `src/edicao/config.js`; os testes `tests/rotas-edicao.test.mjs`,
`tests/qr-leituras.test.mjs` e `tests/cartoon-carimbo.test.mjs` acompanham o valor das flags.

O mapa e as fichas de casa são a base da próxima frente, a **Rota da Doçura** (página de anúncio para
docerias e itens, começando por itens de Natal). Ainda sem especificação: não começar sem definir quem
anuncia, o que se vende, endereço da página e de onde vem o dado do anunciante.

## 3. Pendências do encerramento

1. **Resultados.** Sweet Awards (apuração é da organização), pódio da Caça aos Carimbos e sorteios saem
   primeiro no Instagram. Depois da divulgação: preencher `premiacao.categorias` da 2026.2 em
   `sweetCoffeeHistory.js` **e** trocar `premiacao.status` para `completa` (o Hall, o histórico, a Home e a
   abertura do Awards acompanham sozinhos); Caça e sorteios têm estado próprio em `src/data/resultadosEdicao.js`.
   Passo a passo em `docs/numeros-do-site.md` §8. Nada de resultado no código antes disso (A4).
2. **Vendas.** Das 27 casas, 8 não lançaram vendas e 15 têm dias pendentes (leitura de 16/11). Por isso os
   totais comerciais do site (`festivalFacts.combosSold`, `revenue`) continuam com a apuração de junho de 2026,
   e as páginas dizem que ela vai até a 16ª edição (`docs/numeros-do-site.md` §3 e §6).
3. **Instagram.** Os números de `festivalFacts` (visualizações, alcance, interações, seguidores, posts) ainda
   são os de junho de 2026. A atualização depende da exportação ano a ano do Meta Business Suite (limite de um
   ano por arquivo).
4. **Escolhas editoriais em aberto na página da edição:** foto de capa (hoje a primeira da lista), combo da
   Parma Doces (versão toast ou a substituta de 04/11) e os nomes canônicos de duas casas que mudaram de
   grafia no painel.

## 4. Números da edição (leitura de 16/11/2026, uso interno)

Fonte: banco da edição, Google Analytics (05 a 15/11) e exportação do Instagram (16/09 a 15/11). Detalhe e
método no relatório geral, na pasta da edição (`12_RELATORIO_GERAL_EDICAO`). Dado por casa não entra neste
repositório. ⛔ Estes números não vão para páginas públicas como comparação entre edições (§8.5).

| Frente | Número |
|---|---|
| Casas participantes | 27 (42 unidades) |
| Site | 13.693 visitantes, 23.608 sessões, 65,4% engajadas, 94% no celular |
| Origem das sessões | QR impresso 52%, Instagram 27%, Google 12% |
| QR Codes | 9.443 leituras (avaliação 6.173, displays 2.731, mapa 590) |
| Avaliações | 6.859 avaliações de 4.285 pessoas |
| Caça aos Carimbos | 2.824 mapas, 833 com carimbo, 2.163 carimbos válidos, 128 anulados, 480 pedidos conferidos |
| Instagram do festival | 99 posts e 428 stories, 9,82 milhões de visualizações, 244.827 interações |
| Vendas lançadas | 10.124 combos em 111 de 297 dias (parcial) |
