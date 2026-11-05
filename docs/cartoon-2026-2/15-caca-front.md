# 15 · Caça aos Carimbos — front: mapa de arquivos, rotas e hook

Fundação do front (05/11/2026). Regra de produto: `15-caca-especificacao.md`; contratos do banco: `15-caca-contrato-*.md`.
Tudo aparece com o mesmo gate do mapa (`MAPA_NO_AR`: DEV, `*.vercel.app?preview=1` ou `MAPA_PUBLICO=true`). Nenhuma flag mudou.

## Rotas (`src/edicao/rotas.js`, cena `caca`)

| Caminho | `resolverCena` | Quem renderiza |
|---|---|---|
| `/cartoon/caca` | `{ cena:'caca', secao:'central' }` | `caca/Central.jsx` |
| `/cartoon/caca/recuperar` | `secao:'recuperar'` | `caca/Recuperar.jsx` |
| `/cartoon/caca/mapa` | `secao:'mapa'` | a página `Mapa` existente (`entrada="mapa"`), com o próprio estado |
| `/cartoon/caca/ranking` · `grupos` · `metas` · `compartilhar` | `secao:<nome>` | `caca/secoes/<Nome>.jsx` |
| `/cartoon/caca/grupo/<uuid>` | `secao:'grupo', grupoId` (minúsculo) | `secoes/GrupoDetalhe.jsx` |
| `/cartoon/caca/convite/<token>` | `secao:'convite', token` (case-sensitive; `null` se o formato é ruim) | `secoes/Convite.jsx` |

Segmento a mais ou uuid ruim = `inexistente`. Token só existe no caminho: o Analytics já corta a rota no 1º segmento
(`rotaLimpa`), e o `document.title` da cena é fixo. `vercel.json` já cobre tudo com `/cartoon/:path*`.

## Arquivos

- `src/edicao/caca/api.js` — `criarApi({ chamar, buscar })` + `api` pronto. Todas as RPCs/edge dos contratos; sempre `{ ok:true,… }` ou `{ ok:false, motivo }`, nunca lança, nunca loga. Chave/id/token fora do formato nem saem. JSDoc de cada função traz o contrato.
- `src/edicao/caca/regras.js` — funções puras: `proximaAcao`, `resumoProgresso`, `ajudaLocalizacao`, `tokenValido`, `grupoIdValido`, `situacaoEmail`, `emailMascarado`, `nomeDaCasa`.
- `src/edicao/caca/useCaca.js` — o hook (abaixo).
- `src/edicao/caca/textos.js` — `CACA` (textos), `CACA_CAMINHOS`, `mensagemDoMotivo(motivo)`. Outras frentes acrescentam o bloco delas aqui (ou em arquivo próprio ao lado).
- Componentes: `Central`, `Recuperar`, `CriarMapa` (+ `AbrirPeloLink`), `CodigoPorEmail` (recuperar/confirmar), `EmailPendente`, `GuardarMapa` (só copia o link pessoal; sem WhatsApp, porque o endereço de compartilhamento levaria a chave).
- `src/edicao/cartoon/paginas/caca/index.jsx` — a página: um `<h1>` por seção, `useCaca()` uma vez, `caca` passado às seções.
- `src/edicao/cartoon/paginas/Carimbo.jsx` — porta do QR (carimbo pendente, ajuda de localização) e `CacaAposAvaliar` (porta da avaliação).
- `src/styles/cartoon/13-caca.css` — estilos `ct-caca__*`.
- `src/edicao/rota/useMeuMapa.js` — agora um recorte de `useCaca` (álbum, mapa e Mundo continuam como estavam; leitura `mapa_ler_v2`).

## `useCaca()` — o que devolve

`{ chave, mapa, estado, email, perdeu, perfil, resumo, proxima, atualizar, entrar, sair, apagar, api }`

- `estado`: `'sem-mapa' | 'carregando' | 'pronto' | 'falha'`. `mapa` = resposta de `mapa_ler_v2` (`total_casas`, `casas_validadas`, `extras`, `faltam`, `posicao`, `empatados`, `casas[{slug, carimbos, avaliou, estado:'validada'|'pendente', extras}]`).
- Chave no `localStorage` no esquema de sempre (`scw:edicao:2026.2:mapa`); `#mapa=` ainda grava e some do endereço. Chave que o banco não reconhece sai do aparelho e `perdeu` fica `true` (mapa recuperado em outro aparelho).
- `email`: `'confirmado' | 'pendente' | 'desconhecido'` (`mapa_confirmar_email_status`). `useCaca({ comEmail:false })` pula essa consulta.
- `entrar(chave)` guarda a chave nova (criação/recuperação); `sair()` esquece neste aparelho; `apagar()` apaga no banco e no aparelho; `atualizar()` relê.

## Contrato das seções (stubs a substituir)

`caca/secoes/{Grupos,GrupoDetalhe,Ranking,Metas,Compartilhar,Notificacoes,Instalar,Convite}.jsx`: `export default`, props `{ caca, navigate, dados }`
(+ `grupoId` no GrupoDetalhe, `token` no Convite). Não renderizar `<h1>`. `Notificacoes` e `Instalar` aparecem como blocos no fim da central.
A página já cuida de: carregando/falha da leitura do mapa e, em `grupos`/`grupo`/`metas`/`compartilhar`, de oferecer a criação do mapa quando não há um.
`ranking`, `recuperar` e `convite` NÃO esperam o mapa: tratam `caca.estado` sozinhas (o convite mostra a pré-visualização sem mapa e só exige mapa para entrar).
URLs de compartilhamento, logs e analytics nunca levam chave, token de convite ou código de recuperação.

## Testes

`npm run test:caca` (`tests/cartoon-caca-*.test.mjs`: api com cliente simulado, regras, rotas, textos) — também faz parte de `test:cartoon`.

## Pendências / avisos

- `caca-email` responde `email_indisponivel` quando não há provedor configurado e `falha_temporaria` quando o banco falha (a tela mostra "Tentar de novo"); a falha do provedor não pode ser dita (revelaria se o e-mail tem mapa), então depois de enviar a tela oferece "Não chegou?" com as alternativas honestas (copiar o link pessoal, colar o link, falar com a organização em `/contato`). Estado e como ligar o envio: `15-caca-contrato-identidade.md`.
- `src/edicao/cartoon/regulamento.js` e a seção do mapa em `src/data/conteudo/legal.js` foram reescritos em 05/11/2026 para a regra efetiva (ver "Regulamento e textos" abaixo). O que depende de decisão do Wilker segue como `{ aDefinir }` e está em `15-caca-publicacao-pendencias.md`.
- O botão de abrir a Caça na entrada da edição (`Entrada.jsx`) não foi mexido; hoje a Caça está no cabeçalho, no menu do celular e no rodapé (não na barra de abas).
- Imagens `public/images/caca/*-v1` são propostas e não foram ligadas.

## Frente Grupos e Ranking (05/11/2026)

- Ranking geral: `secoes/Ranking.jsx` + `ranking/{regras,textos}.js` + `ranking/ListaRanking.jsx` (a mesma lista serve ao ranking do grupo). Recorte público (`caca_ranking_publico`, "ver mais" até 50) + posição da própria pessoa vinda de `mapa_ler_v2` (vale fora do recorte). Empate = mesma posição, escrito "empatado em Nº". "Você" só marca a linha quando há uma única igual (o ranking público não traz identificador).
- Grupos: `secoes/{Grupos,GrupoDetalhe,Convite}.jsx` + `grupos/*` (`useGrupo`, `RotaDoGrupo`, `Integrantes`, `ConviteDoGrupo`, `CompartilharConvite`, `CriarGrupo`, `AvisoVisibilidade`, `SairDoGrupo`, `Confirmar`). Token de convite só em memória (nunca storage/log/analytics); aviso de visibilidade com aceite ao criar e ao entrar.
- Rota do grupo: lista de planejamento (nunca marca visita), Subir/Descer/Tirar por botão, `p_versao` em toda operação, conflito mostra a rota atual e pede para repetir. A rota pessoal (`/cartoon/minha-rota`, `?u=`) não foi tocada.
- CSS: `src/styles/cartoon/14-caca-grupos.css`, importado em `src/styles/scw-cartoon.css` logo depois de `13-caca.css`.
- Testes: `tests/cartoon-caca-grupos.test.mjs` e `tests/cartoon-caca-ranking.test.mjs` (rodam em `npm run test:caca`; `test:cartoon` lista arquivos à mão e ainda não os inclui).

## Frente GPS e pedido de revisão de presença (05/11/2026)

Contrato: `15-caca-contrato-gps.md`; decisão: `15-caca-gps-excecao.md`; coordenadas que faltam: `15-caca-coordenadas-pendentes.md`.

- `rota/carimbo.js › capturarPosicao` (3 tentativas com `watchPosition`, melhor leitura, negada pára na hora; `pedirPosicao` fica como leitura única). Só roda no toque em "Carimbar".
- `caca/gps.js` (puro): `podePedirPresenca` (2 falhas seguidas + plausível estar na casa), `motivoDoPedido`, `pedidoDaCasa`. Textos em `caca/textos-gps.js` (`GPS`).
- `caca/PedidoPresenca.jsx`: formulário do pedido (nota opcional de 200 caracteres); só diz "enviado" com `ok` do servidor; nunca promete carimbo.
- `caca/api.js`: `excecaoPedir(chave, { slug, motivo, lat, lng, precisao, nota })` e `excecaoMinhas(chave)`.
- `cartoon/paginas/Carimbo.jsx`: progresso "tentativa N de 3", dicas de sinal, orientação por plataforma (`regras.js › ajudaLocalizacao`), estado `pedido` e o status do pedido já feito. A posição fica em memória (ref) e só segue para a RPC do pedido.
- Estilo: bloco "GPS autônomo…" ao fim de `styles/cartoon/10-carimbo.css`. Testes: `tests/cartoon-caca-gps.test.mjs` (entra em `npm run test:caca`).
- Painel: aba "Pedidos de presença" (`vistas/caca/Excecoes.jsx`), resumo em "Revisão sem GPS" e faixa nas abas de apuração (`SemGps.jsx`); lógica em `painel-app/src/lib/cacaGps.js`; teste `tests/painel-app-caca-gps.test.mjs` (em `test:organizacao`).

## Regulamento e textos (05/11/2026)

Texto público conferido frase a frase contra as migrations 20261203 a 20261220 e os contratos `15-caca-contrato-*.md`.

- `src/edicao/cartoon/regulamento.js`: casas diferentes e extras, avaliação para validar o 1º carimbo (ordem livre), 12 horas, QR + localização,
  pedido de revisão de presença (decisão da organização), vouchers de 7 a 11/11 (corte 23h59 de Natal, desempate, 1 por pessoa, e-mail
  confirmado, prazos), prêmio final (todas as casas, peso 100 + 1 por extra, 3 ganhadores, sorteio verificável), ranking, grupos e metas
  (sem prêmio), e-mail e recuperação, avisos e app (sem promessa de entrega), dados. Três lacunas ficam marcadas como `aDefinir`
  (idade mínima, data e forma de entrega do prêmio final, prazo de guarda). O total de casas não é escrito no texto (hoje 26 ou 27, conforme o combo da Caroli Douces).
- `src/data/conteudo/legal.js` (Política de Privacidade): dados do mapa, e-mail, localização só no instante do carimbo com distância e margem guardadas,
  pedido de revisão, grupos, avisos, ranking, registro de prêmio, IP embaralhado por 2 dias, apagar mapa, retenção "ainda não definida".
- Textos da Caça (`caca/textos*.js`): a frase do mapa completo diz "concorre ao prêmio final".
- Painel (`CarimbosMapa.jsx`): a pontuação antiga ficou rotulada como legado extinto; a nota dos adesivos descreve a regra da unidade sem ponto.
- Testes que travam o texto: `tests/cartoon-caca-regras.test.mjs` (regulamento) e `tests/cartoon-caca-textos-regras.test.mjs` (regras efetivas e frases proibidas).
