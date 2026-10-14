# 2 · Arquitetura, rotas e fases

## 2.1 As duas camadas

| | Institucional (permanente) | Cartoon (edição 2026.2) |
|---|---|---|
| Endereço | `/` antes do lançamento; `/festival` sempre; `/edicoes`, `/sweet-awards`, `/participar`, `/apoiar`, `/contato` | `/cartoon` e filhas, sempre; `/` enquanto ativada |
| Dados | estáticos em `src/data/` (acervo) | projeção pública do banco (seção 3.6) |
| Dado volátil | proibido (CLAUDE.md §2.2) | permitido: preço, endereço, horário, canais, enquanto a edição acontece |
| Identidade | tokens institucionais (`scw-2026.css`) | tokens Cartoon isolados (`scw-cartoon.css`, prefixo `ct-`) |
| Casca | cabeçalho, rodapé e abas institucionais | cabeçalho, rodapé e abas próprios; link fixo "Sobre o festival" para `/festival` |
| Compartilhado | roteador, documentos legais, aviso e preferências de cookies, Analytics, carregamento sob demanda, ícones v3 | o mesmo |

**[Proposta] Organização do código.**

```
src/edicao/                      motor de edição, sem nada da Cartoon
  config.js                      edição ativa: código, caminho, tema; lê os interruptores
  dados/publico.js               cliente da projeção pública (RPC + cache + estados)
  dados/demo/                    fixtures de demonstração (só DEV com ?demo=1)
  rota/minhaRota.js              Minha rota (localStorage por edição)
  componentes/                   ficha de participante, cartões, mapa, estados vazios
src/edicao/cartoon/              o que é da Cartoon
  index.jsx                      monta as páginas e importa scw-cartoon.css
  paginas/Entrada.jsx, Participantes.jsx, Participante.jsx, Mapa.jsx, MinhaRota.jsx, Avaliar.jsx, Premiacao.jsx
  textos.js                      todo o texto da edição (CLAUDE.md §5.6)
  casca/CabecalhoCartoon.jsx, RodapeCartoon.jsx, AbasCartoon.jsx
src/styles/scw-cartoon.css       tokens e componentes da edição, tudo sob .ct-edicao
```

Motivo: a próxima edição troca `src/edicao/cartoon/` e reaproveita `src/edicao/`. Isso cumpre "nasce com KV próprio e páginas próprias" (CLAUDE.md §2.1) sem copiar lógica (§5.3).

**[Proposta] Uma aplicação só, não duas.** A Cartoon é um conjunto de chunks do mesmo SPA. Alternativa descartada: segundo app Vite como o painel. Ela duplicaria roteador, consentimento, Analytics e documentos legais, e exigiria trocar o `index.html` servido em `/` para ativar a edição.

## 2.2 Mapa de rotas

Todas exigem rewrite `/cartoon/:path*` → `/` (hoje `/cartoon` daria 404 na Vercel). `/festival` também precisa de rewrite.

| Rota | Função | Observação |
|---|---|---|
| `/cartoon` | Entrada da edição | |
| `/cartoon/participantes` | Catálogo | filtros e busca na query: `?q=`, `?bairro=`, `?modo=delivery`, `?alimentar=sem-gluten` |
| `/cartoon/participantes/:slug` | Página completa do participante | **ficha de referência**; endereço canônico |
| `/cartoon/combos` | Exploração dos combos | mesma coleção do catálogo, com a foto do combo e a composição à frente |
| `/cartoon/combos/:slug` | Acesso direto ao combo | ver 2.3 |
| `/cartoon/mapa` | Mapa e lista de unidades | `?unidade=<id-publico>` abre a unidade |
| `/cartoon/minha-rota` | Paradas escolhidas | também abre como painel lateral no mapa |
| `/cartoon/avaliar` | Entrada da avaliação | `?participante=<slug>&unidade=<id-publico>` pré-seleciona |
| `/cartoon/premiacao` | Como funciona e resultados, conforme a fase | |
| `/festival` | Home institucional | sempre, inclusive com a Cartoon na entrada |
| `/cartoon/*` desconhecido | 404 da edição | não cai na Home |

**Endereços que NÃO mudam [Proposta]:** `/mapa`, `/rota`, `/participantes` e `/lovers*` continuam redirecionando para `/`. Motivo: estão impressos em material Lovers; se passassem a abrir a Cartoon, um QR antigo mostraria oferta nova. O teste da fase 1 garante isso.

## 2.3 Rota do combo: detalhe próprio ou seção do participante

| Critério | A · Detalhe próprio do combo | B · Página do participante focada no combo |
|---|---|---|
| Clareza | duas fichas com dados repetidos (preço, unidades, restrições), que podem divergir | uma ficha; o combo é a seção B dela |
| Compartilhamento | link curto para o combo | o link mantém o endereço `/cartoon/combos/:slug`; o canônico aponta para o participante |
| Voltar/avançar | duas entradas de histórico para o mesmo conteúdo | uma entrada; voltar retorna ao catálogo |
| QR Code | QR do combo e QR da marca levariam a lugares diferentes | ambos levam à mesma página; o do combo já abre na seção do combo |
| Manutenção | dois componentes de página | um componente com `foco="combo"` |

**[Proposta] B.** `/cartoon/combos/:slug` renderiza `Participante` com `foco="combo"`. Ela abre já posicionada no topo da seção "Descubra o combo", sem animação de rolagem. O título da aba é "Combo da <Casa> · Sweet & Coffee Week Cartoon". O endereço fica como foi acessado, sem redirecionar, para não perder a origem nos relatórios. Como cada participação tem um combo (1:1, seção 3), o slug é o mesmo.

## 2.4 Slugs, identificadores e QR Codes

- **[Proposta] `slug_publico`** novo em `participacoes`, minúsculo com hífens (`paneer-patisserie`), único por edição. É gerado do nome oficial na primeira publicação e **congelado** depois dela. Motivo: `participantes.slug` é o login, sem hífen, e muda na renomeação (seção 1.3).
- **[Proposta]** Tabela `participacao_slug_aliases (slug, participacao_id)`. Se a organização renomear uma marca depois de publicar, o slug antigo vira alias e a página responde pelo novo. O endereço não muda, e um QR impresso continua válido.
- **[Proposta]** Unidade com identificador público próprio: `unidade_publica_id`, curto, estável e não sequencial (ex.: `u7k2`). Serve para `?unidade=`, Minha rota e avaliação. Não usar o `uuid` interno nem a posição `ordem`.
- **[Proposta] Identificador da edição:** `edicoes.codigo = '2026.2'` no banco; `cartoon` só no caminho. O caminho fica em `src/edicao/config.js`, que mapeia `{ codigo: '2026.2', caminho: '/cartoon', tema: 'Cartoon' }`.
- **[Proposta] QR Codes:**
  - Apontam para o caminho limpo do participante: `https://www.sweetcoffeeweek.com.br/cartoon/participantes/<slug>?o=qr`.
  - Não usam hash; o roteador já lê `pathname` quando não há hash (`src/router.js:8-12`).
  - `?o=qr` vira um evento de Analytics e é retirado do endereço registrado (o padrão de `rotaLimpa`).
  - O gerador antigo é adaptado em `scripts/qr-edicao.mjs`, que lê a projeção publicada. Ele exige reinstalar o pacote `qrcode` como dependência de desenvolvimento.
  - Os QRs só são gerados **depois** que o slug está congelado.
- **Durabilidade [Proposta]:** depois do encerramento, o QR continua abrindo a página do participante no modo registro (2.7, fase 9). Nunca abre outra marca nem outra edição.

## 2.5 Comportamento de navegação

| Requisito | Como |
|---|---|
| Link direto e recarregar | rewrite na Vercel + roteador lê `pathname`; a página busca os dados pelo slug |
| Voltar/avançar | **[Decisão D-14]** recomendação: trocar `navigate()` de hash para `history.pushState` no site todo, mantendo leitura do hash para links antigos. Sem isso, entrar por `/cartoon/participantes/x` e clicar gera `/cartoon/participantes/x#/cartoon/mapa`, que funciona mas fica feio no compartilhamento. Exige rewrite para `/sweet-awards` e `/em-breve`, hoje ausente |
| Filtros e posição do catálogo | filtros na query string (`replaceState` a cada mudança); ao abrir um participante, salvar `scrollY` em `sessionStorage` com a chave da URL do catálogo; ao voltar, restaurar depois de os cartões renderizarem |
| Rolagem ao trocar de página | hoje o roteador sobe ao topo em toda troca (`router.js:15-21`); a Cartoon desliga isso só na volta ao catálogo (`popstate`) |
| Participante inexistente | 404 da edição: "Não encontramos essa casa na Cartoon", com links para o catálogo e o mapa; `noindex` |
| Conteúdo despublicado | estado próprio "Esta página saiu do ar"; sem nome nem dados da marca; links para o catálogo |
| Metadados | `title` e `description` por rota em tempo de execução (`pageMeta.js`); `link rel=canonical` gerado em tempo de execução para o caminho limpo |
| Compartilhamento (og) | **[Proposta]** segundo HTML de entrada `cartoon.html` (mesmo `main.jsx`, `<head>` com og da Cartoon) e rewrite `/cartoon/:path*` → `/cartoon.html`. og por participante fica em **[Decisão D-07]**: exige função no servidor |
| Analytics | rotas da edição entram em `ROTAS` (`analytics.js:34`); o slug é registrado (dado público), a unidade como id público |

## 2.6 Configuração: seis interruptores independentes

Nenhum é ligado por data. Cada um tem um responsável e uma reversão.

| # | Interruptor | Onde | Valores | Quem aciona | Efeito |
|---|---|---|---|---|---|
| 1 | **Fase da edição** | banco: `edicao_publicacao.fase` | `preparacao` · `pre_lancamento` · `em_andamento` · `encerrada` | organização (`edicao.gerir`) | muda texto e o que cada página mostra (2.7); não libera dado |
| 2a | **Rota da edição pública** | código: `CARTOON_PUBLICA` em `App.jsx` | `false` / `true` | Wilker autoriza; deploy | `false`: `/cartoon` só em preview. `true`: `/cartoon` aberta ao público |
| 2b | **Experiência da entrada principal** | código: `ENTRADA_PRINCIPAL` em `App.jsx` | `'institucional'` / `'cartoon'` | Wilker autoriza; deploy | `'cartoon'`: `/` mostra a Entrada da Cartoon; `/festival` mostra a Home institucional. Exige 2a = `true` (teste) |
| 3 | **Publicação de participantes** | banco: `edicao_publicacao.participantes_publicos` + publicação de cada marca | `false` / `true` | organização (`curadoria.decidir`) | `true`: catálogo mostra as marcas com versão publicada |
| 4 | **Publicação de combos** | banco: `edicao_publicacao.combos_publicos` + publicação do combo de cada marca | `false` / `true` | organização (`curadoria.decidir`) | `true`: a seção do combo aparece nas marcas com combo publicado |
| 5 | **Abertura da avaliação** | banco: `edicao_publicacao.avaliacao_aberta` + janela `avaliacao_abre_em`/`avaliacao_fecha_em` | `false` / `true` | organização (`edicao.gerir`) | o servidor só aceita avaliação com a chave ligada **e** dentro da janela |
| 6 | **Publicação dos resultados** | banco: `edicao_publicacao.resultados_publicos` | `false` / `true` | organização (`relatorio.ler` + `edicao.gerir`) | `true`: a premiação mostra os vencedores gravados em `premiacoes` |

**Por que 2a e 2b no código e 3–6 no banco [Proposta].** 2a e 2b mudam o que o domínio inteiro mostra: são decisão do Wilker com deploy, como as flags atuais (A3, CLAUDE.md §3.4). Os interruptores 3 a 6 são operação do festival e precisam ser acionados pela organização sem deploy, no meio do evento. Todos passam por RPC com permissão, com registro em `auditoria`.

**Regras de coerência [Proposta]** (impostas no servidor, com teste):

- `combos_publicos` exige `participantes_publicos`.
- `avaliacao_aberta` exige `fase = em_andamento` e janela definida.
- `resultados_publicos` exige `avaliacao_aberta = false`.
- `ENTRADA_PRINCIPAL = 'cartoon'` exige `CARTOON_PUBLICA = true` (teste de código).
- `INSTITUTIONAL_PREVIEW` continua aditivo: em preview, a Cartoon aparece com dados publicados. A prévia de não publicados é só no painel (seção 4.3).

## 2.7 O que cada página mostra por fase

| Página | preparacao | pre_lancamento | em_andamento | encerrada |
|---|---|---|---|---|
| Entrada | só em preview | tema, período, "em breve"; participantes se 3 ligado | tudo; destaque "acontece agora" | "a Cartoon terminou"; resultados se 6 ligado; link para o acervo |
| Catálogo | só preview | marcas publicadas (sem combo se 4 desligado) | marcas + combos | marcas + combos, **sem** preço, horário, canais e Minha rota |
| Participante | só preview | A (casa) + "combo será revelado em 03/11" se a data estiver confirmada | A–G conforme publicado | A–C e fotos; aviso de edição encerrada; sem D-E-F operacionais |
| Mapa / Minha rota | só preview | unidades das marcas publicadas, sem horário de combo | completo | fora do ar: "a edição terminou" + link para o catálogo |
| Avaliar | só preview | "a avaliação abre durante o festival" | formulário se 5 ligado e dentro da janela | "avaliação encerrada" |
| Premiação | só preview | categorias e como funciona, se definidas | idem | resultados se 6 ligado; senão "resultado em breve" |

A data do lançamento dos combos (03/11) e do anúncio (19/11) consta em `00-estado-da-edicao.md` da pasta da edição. **[Decisão D-15]** confirmar se pode ser exibida.

## 2.8 Transições e reversão

| Transição | Ação | O que muda | Reversão |
|---|---|---|---|
| T1 · abrir `/cartoon` | `CARTOON_PUBLICA = true` + deploy | rota pública; Home institucional ganha link para a edição | `false` + deploy; ou promover o deploy anterior na Vercel |
| T2 · publicar participantes | organização liga 3 | catálogo e páginas das marcas publicadas | desligar 3: catálogo volta a "em breve"; nada se perde |
| T3 · publicar combos | organização liga 4 | seção do combo | desligar 4 |
| T4 · ativar a Cartoon em `/` | `ENTRADA_PRINCIPAL = 'cartoon'` + deploy | `/` vira Entrada; `/festival` vira a Home institucional; links "Início" da casca institucional apontam para `/festival` | `'institucional'` + deploy |
| T5 · abrir a avaliação | organização liga 5 e define a janela | botão Avaliar aparece; o servidor aceita envios | desligar 5: o servidor recusa na hora; envios já gravados ficam |
| T6 · encerrar | organização muda a fase para `encerrada`, desliga 5 | modo registro (2.7) | voltar para `em_andamento` |
| T7 · publicar resultados | organização liga 6 depois de gravar `premiacoes` | vencedores aparecem | desligar 6 |
| T8 · devolver `/` ao institucional | `ENTRADA_PRINCIPAL = 'institucional'` + deploy | `/` volta à Home; `/cartoon` fica como registro | — |
| T9 · migrar para o acervo | combos e fotos aprovados entram em Edições (como `editionCombos.js`); resultados entram no histórico do Sweet Awards (CLAUDE.md §2.1) | 2026.2 entra no histórico; o teste "Cartoon não é histórico" muda | reverter o commit |

Toda mudança de 3 a 6 grava em `auditoria` quem acionou, quando e o valor anterior. O painel mostra a última mudança ao lado de cada chave.
