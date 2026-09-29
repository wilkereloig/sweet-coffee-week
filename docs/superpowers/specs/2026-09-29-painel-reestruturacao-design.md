# Painel SCW — reestruturação (arquitetura, navegação, módulos)

Data: 29/09/2026 · Pedido do Wilker Eloi · Branch `dev/site-completo`

## 1. Problema

O painel cresceu por fases e ficou organizado pela ordem em que as coisas
nasceram, não pelo assunto. Diagnóstico (inventário completo das telas, do
banco e da área da marca, 29/09/2026):

- **Assunto espalhado.** Tema decidido em 2 telas e exibido em mais 3; sessões
  de foto em 4; "criar acesso" com 3 portas; três "históricos" diferentes; a
  edição atual se configura em Produção.
- **Sem endereço.** A vista mora só na memória: recarregar volta à Mesa, e os 7
  contadores da Mesa abrem listas sem filtro.
- **Status sem padrão.** 11 mapas de rótulo em 6 arquivos; o mesmo estado com
  nomes diferentes; valores crus do banco em 3 lugares.
- **Texto demais.** Parágrafos de regra fixos na tela (Guia de fotos, Edição,
  Trajetória).
- **Administrador limitado.** Não edita o cadastro da marca (itens, preço,
  unidades), não arquiva/substitui arquivo, não muda status de cadastro.
- **Relacionamento raso.** Contato tem um tipo só, sem e-mail/cidade; voucher
  não existe como registro.
- **Área da marca.** Pendência leva à tela, não ao campo; avisos do aparelho
  dentro de Arquivos; fotos oficiais do combo invisíveis para a marca.

## 2. Decisões do Wilker (29/09/2026)

1. **7 módulos** na organização; Press Kit e Vouchers são abas de Contatos
   (uma base de pessoas, sem cadastro duplicado).
2. **Excluir = arquivar + restaurar.** Exclusão definitiva continua só para
   resposta de formulário (como hoje).
3. **Voucher:** cada marca da edição cede **7** vouchers do próprio combo
   (número configurável por edição). Cada voucher tem **código único**, vale
   **só naquela marca**, e é a **marca** quem registra o uso no painel dela.
4. **Ordem:** estrutura primeiro (etapas 1→7 abaixo).

## 3. Nova navegação

### Organização — 7 módulos

| Módulo (id) | Abas | Vem de |
|---|---|---|
| Visão geral (`visao`) | — | Mesa; contadores levam à lista filtrada |
| Participantes (`participantes`) | Lista · Candidaturas · Temas · Vendas | Marcas + Respostas "Quero participar" + Edição›Temas/Vendas |
| Contatos (`contatos`) | Pessoas · Press Kit · Vouchers · Recebidos do site | Contatos + Respostas "Apoiar"/"Contato" |
| Operação (`operacao`) | Pedidos · Fotos · Materiais | Produção (sem arquivos) + materiais |
| Arquivos (`arquivos`) | Gerais · Por participante · Guias · Arquivados | Produção›Arquivos + Guia de fotos |
| Edição (`edicao`) | Configuração · Todas as edições | Edição + seletor da edição atual (sai de Produção) |
| Administração (`admin`) | Equipe · Revisão · Importações · Histórico · Formulários | Equipe + Edição›Revisão/Importações |

Celular: atalhos `visao · participantes · contatos · operacao`; o resto em "Mais".

Links antigos gravados no banco (`marcas/…`, `producao/…`, `respostas/…`,
`edicao/temas`, `mesa`) continuam valendo: `interpretarLink` traduz.

### Marca — 5 destinos

Hoje · Cadastro · Pedidos · Mensagens · **Downloads** (Meu combo, Identidade
do festival, Guias — inclui o Guia de fotos —, Documentos). "Avisos neste
aparelho" vai para o botão **Conta** (junto de Sair).

## 4. Etapas

Cada etapa é um commit (ou poucos) em `dev/site-completo`, com build e
`npm run test:organizacao` verdes. Nada vai para `master` sem autorização.

### Etapa 1 — Fundação

- **Endereço depois do `#`**: `/painel/#participantes?situacao=sem_acesso`,
  `/painel/#participantes/<id>/mensagens`. `lib/rota.js` (puro, testado):
  `lerRota(hash)` / `montarRota({vista,id,sub,filtros})`. O shell lê a vista
  do endereço e reage a `hashchange` (Voltar do navegador funciona). Sem
  mudança no servidor nem no service worker.
- **Dicionário único de status**: `lib/status.js` —
  `STATUS[dominio][valor] = {rotulo, tom}`, tons `neutro · andamento ·
  atencao · ok · encerrado`. Os `ROTULO_*` existentes passam a DERIVAR dele
  (uma fonte, nenhum consumidor quebra). `<Selo dominio valor>` em `ui.jsx`.
  Teste: todo valor dos CHECKs do banco tem rótulo.
- **Peças comuns**: `useFiltroUrl` (filtros/busca no endereço) e `<Ajuda>`
  (`<details>` nativo com "ⓘ" — tira parágrafo de regra da tela).

### Etapa 2 — Navegação e Visão geral

- Novos destinos/abas da tabela do §3, reaproveitando as vistas existentes
  (o código muda de lugar; comportamento igual).
- `Producao.jsx` (954 linhas) se divide: Pedidos/Fotos/Materiais → Operação;
  Arquivos → módulo Arquivos; edição atual → Edição.
- Respostas vira componente com `origens` por parâmetro: Candidaturas
  (quero_participar) e Recebidos do site (apoiar, contato).
- Visão geral: cada contador abre a lista com o filtro aplicado.
- Administração: visível a quem tem ao menos uma das permissões das abas;
  cada aba conferida com a sua.

### Etapa 3 — Ficha do participante editável (administrador)

- Permissão nova **`cadastro.editar`** (só Administrador).
- RPCs (`security definer`, `pode(p_secret,'cadastro.editar')`, auditoria
  pelos gatilhos que já existem):
  `org_salvar_participante` (todos os campos da marca),
  `org_salvar_participacao` (preço, flags, delivery, proposta, status do
  cadastro), `org_salvar_item` (cria o item se faltar),
  `org_salvar_unidade` / `org_remover_unidade`,
  `org_arquivar_participante` (arquiva/restaura; `participantes.arquivado_em`).
- Ficha: aba Cadastro vira blocos (A marca · Tema · Os três itens · Preço e
  detalhes · Onde encontrar · Status), cada um com "Editar" → formulário do
  bloco → Salvar. Nunca um formulário gigante.
- Lista de Participantes ganha filtro "Arquivados".

### Etapa 4 — Arquivos e Downloads

- `arquivos.categoria` (`combo`, `identidade`, `guia`, `documento`, `outro`).
- RPCs: `atualizar_arquivo` (nome, descrição, categoria),
  `substituir_arquivo` (novo caminho, versão+1, tamanho, tipo),
  `arquivar_arquivo` (arquiva/restaura).
- Organização: módulo Arquivos com Gerais / Por participante / Guias /
  Arquivados, agrupados por categoria; cada linha: nome · tipo · tamanho · data
  · Baixar · Editar · Substituir · Arquivar.
- Marca: Downloads agrupado por categoria, com tipo, tamanho e data;
  "Meu combo" inclui as fotos oficiais do bucket `combos`.

### Etapa 5 — Contatos e Press Kit

- `contatos_relacionamento`: `email`, `cidade`, `categorias text[]`
  (influenciador · imprensa · parceiro · convidado · outro; várias por
  pessoa). `tipo` continua existindo e é sempre a primeira categoria (não
  quebra importação nem consultas antigas). Press Kit e Voucher NÃO são
  categoria digitada: saem dos envios e dos vouchers.
- Press Kit: aba própria da edição com a lista, status (rótulos: constou na
  lista → **Sugerido**, confirmado → **Preparando**), endereço, responsável,
  data, observação, confirmação de entrega; e "Sugestões" = quem recebeu em
  edições anteriores e ainda não está na lista.
- Ficha da pessoa: Informações gerais · Relacionamento · Histórico (press
  kits, vouchers, edições) · Observações internas.

### Etapa 6 — Vouchers

- `edicoes.vouchers_por_participante int default 7`.
- Tabela `vouchers`: `codigo` único (`SCW-XXXXX`, alfabeto sem I/O/0/1),
  `edicao_codigo`, `participacao_id` (obrigatório), `contato_id`, `status`
  (`disponivel · destinado · enviado · utilizado · cancelado`), datas de
  envio e uso, responsável, observação.
- RPCs organização: `gerar_vouchers` (completa até a cota, idempotente),
  `get_vouchers`, `destinar_voucher`, `atualizar_voucher` (enviar, cancelar,
  liberar). Marca: `marca_usar_voucher(p_codigo)` (só código da própria
  participação, só `destinado`/`enviado` → `utilizado`).
- Contatos›Vouchers: por marca (7, destinados, enviados, usados, restantes)
  e por pessoa. Ficha da pessoa: histórico de vouchers de todas as edições.
- Marca: cartão "Validar voucher" em Hoje e a lista dos 7 dela.

### Etapa 7 — Área da marca

- 5 destinos (§3), endereço por `#` como na organização, botão Conta com
  avisos do aparelho e Sair.
- Pendências com ação direta: "Seu cadastro tem N pendências" em Hoje; cada
  item abre o bloco e foca o campo (`#cadastro/<bloco>/<campo>`).

## 5. Fora do escopo (de propósito)

- Biblioteca de rotas ou de tabela: o painel já tem roteamento próprio e cada
  lista tem colunas próprias.
- Envio de foto de item pela organização (continua fora, decisão anterior).
- Exclusão definitiva de participante, contato, arquivo ou pedido.

## 6. Verificação

Por etapa: build de verificação fora do projeto, `npm run test:organizacao`,
testes novos das libs puras (`rota`, `status`, `vouchers`), migrations
aplicadas pelo MCP `supabase-scw` com conferência por `has_function_privilege`
e consulta de fumaça. Conferência visual e logada é do Wilker.
