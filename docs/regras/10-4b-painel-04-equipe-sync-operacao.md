<!-- Parte das regras do projeto. Índice: painel-app/CLAUDE.md. Movido sem reescrita de painel-app/CLAUDE.md em 10/11/2026. -->

#### Equipe: foto de perfil, Meu perfil e autoria — 17/10/2026
- `perfis.avatar_path` → bucket PRIVADO `equipe` (2 MB, webp/jpg), caminho `<user_id>/<uuid>.(webp|jpg)`. A
  `arquivo-url` só assina subida na pasta do PRÓPRIO JWT (conta ativa) ou com `acesso.gerir`; baixar = `dado.ler` ou
  `redes.ver`. `perfil_foto_definir` confere o objeto (pasta, tamanho, tipo) antes de apontar; remover só tira a
  referência — nada se apaga. O painel recorta um QUADRADO (zoom + posição, prévia no canvas; nada esticado) e gera
  512 px em webp (`lib/equipe.js`, `areaRecorte`/`gerarFoto`).
- **Meu perfil** (`components/MeuPerfil.jsx`, botão com avatar + nome no topo): dados, foto, nome de exibição
  (`meu_nome_definir`, 2–60, auditado) e avisos do aparelho. Login, função, ativação e permissões NÃO mudam ali. No
  celular o "Sair" do topo mora aqui (o avatar ocupa o lugar dele). Acesso compartilhado: explica que não é uma pessoa.
  Administração › Equipe: avatar na lista e o mesmo `EditorFoto` para trocar a foto de outra conta.
- **Autoria:** o registro guarda o id da SESSÃO (`auth.uid()`) + o rótulo do momento; o painel só desenha
  (`Avatar`/`Autor` em `components/Avatar.jsx`; diretório `equipe_diretorio` no `EquipeContexto` do PainelShell; fotos
  assinadas numa chamada só). Nome mostrado = o gravado (renomear não reescreve). Sem id: "Acesso compartilhado" (ícone
  de chave) ou "Sistema" — nunca atribuído a uma pessoa. Conta desativada continua no diretório. Foto removida →
  iniciais. Avatar da equipe é redondo; logo de participante (`LogoMarca`) é outra peça.
- Onde aparece: Atividade, sino (avatar + nome + quando + agrupamento), comentários, histórico da postagem, responsável,
  confirmação de publicação, histórico editorial do combo, lista da Equipe.
- Avisos: `notificacoes` ganhou `ator_user_id` (default da sessão), `para_user_id`, `chave_grupo`, `atualizada_em`,
  `n_agrupadas`; `get_notificacoes_org` (tipo de retorno novo) e `ler_notificacoes_org`/`registrar_push_organizacao`
  aceitam qualquer porta de leitura (`membro_org`) — antes a Social media via o aviso e não conseguia marcá-lo como
  lido nem ligar o push.

#### Atualização do painel e convite do aparelho — 18/10/2026 (pedido do Wilker)
- **Identidade da versão = o build inteiro.** `vite.config.js › versaoDoPainel` (depois de gravar o build): sha256 do HTML
  final do painel + todos os arquivos que ele carrega (chunks, inclusive sob demanda, CSS, assets) + `sw.js` e manifesto
  → id de 16 hex. Sai em `<meta name="scw-versao">` (a versão da aba) e em `/painel/versao.json` (`app`, `id`,
  `publicado_em`, `ambiente` = `VERCEL_ENV`, `commit`, `novidades` = 1ª linha de `painel-app/NOVIDADES.txt`). Mesmo
  deploy, então o arquivo nunca aponta para recurso ausente. Compara IGUALDADE (rollback também é "outra versão").
  ⛔ Não voltar a comparar só o arquivo de entrada nem o conteúdo do `sw.js`.
- **Um monitor só** (`lib/versao.js › criarMonitor`, instância em `Conexao.jsx › monitorDoPainel`): ao abrir (3 s), ao
  voltar ao app, ao voltar a internet, a cada 15 min com a aba visível, quando um chunk não carrega (`vite:preloadError`)
  e no push de versão. Uma consulta por vez; no máximo uma por minuto entre as abas (`scw_versao_vista` no localStorage);
  o resultado vai às outras abas por `BroadcastChannel('scw-painel-versao')`. Resposta HTML, JSON alheio, 404 e
  ambiente diferente (produção × preview) são recusados.
- **Aviso:** "Atualização disponível / Uma nova versão do Painel SCW está pronta." com "Atualizar agora" e "Depois".
  "Depois" recolhe para um ponto no botão do perfil/conta (`PontoVersao`), até a aba fechar. Com folha ou diálogo aberto
  o aviso não flutua por cima (recolhe e volta quando fecha); dentro de Meu perfil/Sua conta a mesma caixa aparece
  embutida (`CaixaAtualizacao`), ao lado de "Verificar atualização" — diferente do botão "Atualizar" do topo, que só relê
  os dados.
- **"Atualizar agora"** (`atualizarAgora`): conexão → trabalho pendente → versão ainda no servidor → HTML novo com a MESMA
  id e os arquivos que ele abre respondendo → worker novo em espera ativado por mensagem (`ativar`) e esperado →
  recarga única. Ao abrir, `resultadoDaAtualizacao` confere se a id esperada entrou: "Painel atualizado." ou "não
  entrou" com uma 2ª tentativa por endereço novo (`?atualizar=`); depois disso, para (sem laço).
- **Trabalho pendente declarado** (`lib/pendencias.js`): `usePendencia(ativo, { rotulo, salvar?, guardaRascunho? })`,
  `registrarPendencia` (com `ativo()` perguntado na hora) e `comEnvio` (todo upload). Ligados: ficha da postagem
  (alterações e comentário digitado), edição editorial, editor de seção da ficha do participante, cadastro da marca,
  Meu perfil (nome e foto) e TODOS os envios de arquivo. Um `beforeunload` só, para o painel inteiro. Com pendência, o
  aviso lista o que falta e oferece "Voltar para salvar", "Salvar e atualizar" (quando todos sabem salvar) e
  "Atualizar sem salvar" (confirmação explícita). Envio em andamento nunca é interrompido.
- **Service worker:** sem `skipWaiting` na instalação (o novo ESPERA); ativa pela mensagem `ativar` (fluxo do botão, ou
  aba recém-aberta sem nada pela metade: ao abrir, o painel chama `update()` e o worker que terminar de instalar no
  1º minuto assume — a troca não apaga nada que outra aba use). Caches `scw-painel-casca-v3` e `scw-painel-assets` (este NÃO é apagado por versão:
  aba antiga ainda pede chunk dela; poda pelos 400 mais antigos). Limpeza só com prefixo `scw-painel-`; o `scw-painel-v2`
  antigo migra os `/assets/` e sai. `/painel/versao.json` e o `/painel/` não-navegação vêm sempre da rede. Os workers de
  `/organizacao/` e `/marca/` passaram a limpar só o próprio prefixo (antes apagavam tudo da origem).
  ⚠️ **Transição:** instalações com o painel até `6ea52e3` detectam a versão pelo código ANTIGO (arquivo de entrada) e
  recarregam/avisam como antes; ao abrir a versão nova, o worker novo instala e assume (sem nada pela metade) e o
  cache antigo migra. A partir dela, vale o fluxo novo.
- **Cabeçalhos** (`vercel.json`): `versao.json` e `sw.js` `no-store`; `/painel/` `no-cache`; `/assets/*` imutável.
- **Push de versão — servidor, não navegador.** Migration `20261020_painel_versao.sql`: pg_cron `scw-painel-versao`
  (10 min) → `painel_versao_ciclo()` lê por pg_net o `versao.json` DO DOMÍNIO DE PRODUÇÃO; id novo com
  `ambiente = production` vira linha em `painel_versoes` e chama a `enviar-push` com `{ versao_id }` (modo 3). Texto fixo
  "Painel SCW atualizado / Há melhorias disponíveis. Toque para abrir e atualizar.", tag `scw-versao`, url
  `/painel/?verificar=1`. Uma vez por aparelho e versão (`push_versao_envios`), 404/410 desativa, falha tenta de novo
  (até 3, no 1º dia). Preferência por aparelho: `push_subscriptions.avisar_versao` (`push_aparelho`). Toque com aba
  aberta: o worker manda `verificar-versao` (nunca recarrega); sem aba, abre `?verificar=1`. "ok" no registro = o serviço
  de push ACEITOU, não prova que apareceu na tela.
- **Convite do aparelho** (`AppNoAparelho.jsx › ConviteAparelho`, substituiu o cartão da Mesa/Início): depois do login,
  conta carregada, sem tour, sem folha/diálogo, sem pendência e sem aviso de atualização na frente. Fora do modo app:
  "Tenha o Painel SCW no seu celular" (Instalar painel só com `beforeinstallprompt`; senão os passos aparecem DIRETO, sem
  um toque a mais: Safari no iPhone — com "na primeira vez pelo ícone, entre com o nome e a senha; depois o painel fica aberto
  até você tocar em Sair" (o app da Tela de Início guarda a sessão à parte do Safari) —, "No iPhone, use o Safari para instalar"
  fora do Safari). Aberto pelo ícone (ou computador sem oferta): "Ative as notificações do painel" (a etapa explica que é
  preciso escolher "Permitir"); sucesso só depois de o servidor confirmar a inscrição desta conta (`push_aparelho`);
  bloqueado = `COMO_LIBERAR` (`lib/instalar.js`), um texto por aparelho (iPhone · Android no app · Android no navegador ·
  computador), sem pedir de novo. "Agora não"/fechar adia 7 dias POR CONTA e aparelho
  (`scw_convite_aparelho_<papel>_<conta>`, só a data). Uma vez por sessão. Meu perfil / Sua conta › "Aplicativo e
  notificações" reabre, mostra o estado deste aparelho e a preferência de aviso de versão.
  **O sino** (`Central › aparelho`) ganha no topo "Avisos neste aparelho" (desde 25/10/2026 numa caixa que abre e
  fecha, `<details class="ui-central-aparelho ui-recolhe">`, fechada por padrão): o estado (Ligados · Desligados · Bloqueados ·
  Indisponíveis, sempre com a linha de estado), o botão de ligar e o link "Como instalar e ligar os avisos" (fecha a folha e
  abre o convite 300 ms depois, porque a folha leva 260 ms para sair). ⛔ Nunca no "Ver como participante": o aparelho na mão
  é do administrador, então o sino, a etapa do tour e a seção da Conta não mostram os controles de aviso lá. O
  `pushMarca.conferir` só conta assinatura `ativo` (a que o servidor desativou não é "Ligados"). iPhone com iOS < 16.4: "Atualize
  o iPhone para iOS 16.4 ou mais novo para receber avisos."
- Testes: `tests/painel-app-versao.test.mjs` (transição com dependências falsas); navegador com builds reais A→B no
  harness local (fora do repositório).

- **Ingredientes não são mais pedidos** (19/10/2026, pedido do Wilker): a organização só precisa de nome, descrição e dos
  alergênicos/características de cada item. Saíram o campo do formulário `/preencher/` (fica um `<input hidden>` que só deixa o
  valor antigo atravessar, sem apagar nem gerar diferença), o campo do Cadastro da marca e o da ficha da organização; o total de
  campos obrigatórios passou de 16 para 13 (`guia.js › camposObrigatorios`, `cadastro.js › itemCompleto`) e o banco acompanha
  (migration `20261021_ingredientes_opcional.sql`: `campos_cadastro` e `marca_concluir_cadastro`). A coluna
  `participantes_itens.ingredientes` continua: dado antigo é preservado e ainda aparece na ficha e na página pública.
  ⛔ Não voltar a exigir ingredientes sem mudar as duas pontas (app e banco) juntas.

- **Painel SCW na mensagem e na página de preenchimento** (19/10/2026, pedido do Wilker): a mensagem de WhatsApp traz, NO TOPO (logo depois da saudação),
  a apresentação do painel (centro de comunicação com a organização: arquivos, fotos do combo, formulários, atualizar e
  conferir dados), o link `/painel/`, o usuário (`participantes.slug`) e a senha. A página `/preencher/` ganhou o mesmo
  aviso no topo (`#pr-painel`), **sem usuário nem senha**: a página abre só com o código do link. A senha temporária NÃO é
  guardada (aparece uma vez, na tela que a cria), então `painelDaMarca` só a escreve se a credencial acabou de ser criada
  na tela; quem já recebeu a sua leva "a que enviamos na mensagem do seu acesso"; quem já trocou, "a que você criou".
  Em Participantes › Preenchimento, "Gerar senhas de N marcas e copiar" (`marca.liberar`) cria o acesso de quem não tem
  (`criar-acesso-marca`) e gera senha temporária NOVA para quem já tem (`regerar-senha-conta`; inclui as 2 contas de teste do Wilker, que já tinham trocado a senha), pelo
  `emitirCredenciais`, e copia as mensagens já com a senha; a credencial fica só em memória da tela. Fora do lote
  (`entraNoLoteDeSenhas`): acesso bloqueado/desativado, marca encerrada, sem link e quem acabou de ganhar senha na tela.
  A marca entra com a senha temporária e o painel já pede para ela criar a própria (`deve_trocar_senha`).
  ⚠️ Gerar senha nova invalida a anterior e derruba as sessões abertas: só pelo botão, com a confirmação.

- **"Perdi meu acesso" do participante abre o WhatsApp** (19/10/2026, pedido do Wilker): `LoginMarca.jsx` troca o aviso por um
  link `wa.me` para a organização com a mensagem pronta (`linkPerdiAcesso` em `lib/participantes.js`, leva o nome digitado no
  campo). O número (`WHATSAPP_ORGANIZACAO`) mora num lugar só e foi passado pelo Wilker, com o 9 extra
  (confirmado por ele); nome de pessoa não entra no código nem na mensagem. O login da EQUIPE (`LoginOrganizacao.jsx`) continua com o aviso
  "fale com um administrador".



#### Sincronização em tempo real do painel — 19/10/2026 (pedido do Wilker: "tudo que muda aparece nas outras telas e sessões")

Antes: leitura por consulta HTTP ao abrir a tela, polls soltos (avisos 60 s, marca 60 s, mensagens 20 s) e nenhum aviso entre
telas depois de salvar. Agora há **uma camada só** (`painel-app/src/lib/sync/`), com três mecanismos separados:

| Mecanismo | O que faz | Onde |
|---|---|---|
| **Mesma sessão** | gravação CONFIRMADA (`rpc()`, `chamarFuncao()`, `api()` do lado marca) anuncia os domínios que alterou; as telas que leem esses domínios relêem | `rpc.js` / `marcaApi.js` → `sync/anuncio.js` → `sync/barramento.js` |
| **Outras sessões e aparelhos** | o BANCO manda um sinal mínimo por gatilho (`realtime.send`, canais PRIVADOS); a tela relê pela rota autorizada de sempre | migration `20261022_sincronizacao_tempo_real.sql` → `sync/tempoReal.js` |
| **Reconexão** | volta à aba (fora ≥ 3 s), rede de volta, canal reentrando, ou conferência a cada 3 min → `reconciliar()` relê tudo o que está montado | `sync/sessao.js` |

- **Domínios** (`sync/dominios.js`, vocabulário FECHADO): `participantes, cadastro, unidades, temas, logos, correcoes, pedidos,
  fotos, arquivos, materiais, edicao, publicacao, mensagens, avisos, vendas, vouchers, acessos, redes, biblioteca, editorial,
  perfis, contatos, preenchimento, respostas, atividade, configuracao`. Domínio desconhecido é descartado (no cliente e no
  servidor). **Toda RPC/função que o painel chama tem que estar classificada** (leitura, sem sinal, ou gravação → domínios):
  `tests/painel-app-sincronizacao-ampliada.test.mjs` reprova chamada nova sem classificação. `org_preenchimento(s)` são
  LEITURAS de propósito (criam o link na 1ª vez; o banco avisa por gatilho) — avisar daqui faria a tela recarregar em laço.
- **Canais** (todos privados; política `sync_receber` em `realtime.messages`, só SELECT — o navegador não publica):
  `scw:org` (`dado.ler`) · `scw:social` (`redes.ver`) · `scw:marcas` (qualquer marca ativa: vagas de foto abertas, arquivos
  gerais, edição) · `scw:marca:<id>` (só a conta dona) · `scw:pessoa:<uid>` (avisos, leitura, perfil — vale até para conta
  pausada, para ela saber). Social media NÃO entra em `scw:org`: vendas, vouchers, acessos e mensagens nunca chegam a ela.
  O painel pergunta ao servidor quais canais pode ouvir (`sync_meus_canais()`), então permissão revogada sai da lista.
- **O sinal é mínimo**: `{d: domínio, r: id opaco, t: hora}`. Nunca registro, nome, contato, texto ou token. Dedupe por
  transação (`scw.sync_vistos`); o gatilho engole qualquer erro (o sinal nunca derruba a gravação).
- **Sessão**: o transporte usa o MESMO token e a MESMA renovação do resto (`tokenVivo` → `renovarCompartilhado`); não cria
  sessão paralela nem faz login. Token novo vai pelo quadro `access_token`, sem reconectar. O acesso COMPARTILHADO (senha única)
  não tem token → **sem canal**: só a conferência periódica a cada 45 s (a senha nunca vai a canal nem à URL). O indicador diz
  "conferindo a cada 45 segundos" — não chama isso de tempo real.
- **Estado mostrado** (`IndicadorSync`): Atualizado · Atualizando · Sem conexão · Sem sincronizar (falha). "Em tempo real" só na
  dica e só DEPOIS do `phx_reply` ok de todos os canais.
- **Troca de conta**: `pararSincronizacao()` fecha os canais, zera o barramento e muda a ÉPOCA; resposta de carga iniciada antes
  não grava mais em tela (`useGuarda`). Outra ABA que sai/entra como outra pessoa dispara `onTrocaDeConta` (evento `storage`)
  → `App.trocaLocal()`, que só encerra o contexto desta aba, **sem** logout no servidor e **sem** apagar a sessão (que já é a
  da outra conta).
- **Para ligar uma tela nova**: `useSincronizar(['dominio', …], recarregarSilencioso)` (releitura SEM spinner, mantendo o que
  estava na tela se falhar e rejeitando para o indicador), `const vale = useGuarda()()` antes de cada `await` com `if (!vale()) return`,
  e nada de `setInterval` de dados. Registro em edição: `useRegistroEditavel` + `<AvisoMudancaExterna/>` (mescla em três vias:
  campo que não toquei acompanha o servidor, o que digitei nunca é trocado em silêncio, o mesmo campo dos dois lados vira
  conflito e a pessoa escolhe). `usePendencia(...).sinalizarExterno()` avisa o indicador.
- **Avisos**: grupo por pessoa e leitura por conta continuam (`avisar_pessoa`, `notificacao_leitura`); ler um aviso atualiza o
  contador das outras sessões da mesma pessoa; leitura que falha DESFAZ o otimista. Pendência resolvida deixa de contar como
  aberta (post sai de "aprovação" → aviso do aprovador vira lido; pedido respondido → aviso da marca vira lido).
- **Push** (`enviar-push` + `carga.ts` + migration `20261022_push_entrega.sql`): mensagem e formulário não mostram o texto na
  tela de bloqueio; resultado por aviso e aparelho (`push_envios`); falha passageira tenta de novo (até 3×, 5 min, só avisos não
  lidos); "ok" = o serviço de push ACEITOU, não prova que apareceu. O aviso interno existe antes do push e não depende dele.
  Com o painel aberto, o service worker avisa as abas (`{tipo:'push'}`) para relerem os avisos.
- ⚠️ `realtime.messages` só ganha partição do dia depois que um cliente se conecta ao Realtime (o `postgres` não consegue criá-la):
  sinal emitido com ninguém conectado se perde — inofensivo (ninguém ouvia) e coberto pela releitura ao conectar.
- Testes: `node --test tests/painel-app-sync-*.test.mjs tests/painel-app-sincronizacao*.test.mjs tests/painel-push-carga.test.mjs`;
  banco: `supabase/testes/sincronizacao.sql` (transação que se desfaz). Reversão: `supabase/reverter/20261022_sincronizacao_tempo_real.sql`.
- **Vistas ligadas à camada (19/10/2026)** — quem escreve tela nova usa os ajudantes que já existem, não copia o padrão:
  `lib/leituraVivaReact.js` (`useLeitura` = carga inicial + releitura silenciosa com guarda; `useEdicaoProtegida` = formulário
  que resiste à alteração externa, manda só o que mudou, bloqueia salvar com conflito) · `lib/rascunhoOrg.js`
  (`useRascunhoOrg`, a versão curta do mesmo: registro editável + pendência + `avisarSalvo`) · `lib/syncFichas.js` (domínios por
  vista da organização, `mesclarFonte` mantém o dado antigo se a releitura falha) · `lib/sincMarca.js` (lado da marca) ·
  `lib/cadastroMescla.js` (mescla campo a campo do Cadastro da marca: unidades, horários, trocas) · `lib/redes.js`
  (`mesclarPostExterno`, `reduzirEditorial`: postagem e combo editorial em três vias). ⚠️ `useRascunhoOrg` e `useEdicaoProtegida`
  se sobrepõem — ao mexer num, avaliar fundir.
- **Cobertura — o que NÃO chega em tempo real** (cai na conferência: 45 s sem canal, 3 min com): avaliações do público
  (`Avaliacoes`: não há gatilho na tabela); "No site"/versão publicada para o social media (`publicacao`, `cadastro`,
  `unidades` não vão ao `scw:social`); foto aprovada por outra sessão na Biblioteca do admin; nome de participante na lista de
  postagens. Aba com conflito aberto no Cadastro da marca: trocar de aba grava SEM a coluna em conflito (a versão da marca
  naquele campo se perde; o aviso de fechar a aba já cobre o resto).
- **Contagens da Visão geral** (`resumoDaEdicao`/`participaDaEdicao` em `lib/mesa.js`): participação `encerrado` (desistiu) NÃO entra
  no total da edição, em "com acesso", "sem acesso" nem em "cadastros completos"; os filtros com/sem acesso de Marcas e o lote
  "Gerar senhas" seguem a mesma regra, para o número do cartão abrir uma lista do mesmo tamanho. "Cadastro completo" é o STATUS
  (a organização confirma), não "todos os campos preenchidos" (`campos_faltando = 0`).
- **Regressão automática**: `tests/painel-app-sync-sem-polling.test.mjs` reprova `setInterval` fora da camada (exceções: versão
  publicada, URL assinada de imagem, nova tentativa de `minhas_permissoes` quando a leitura falhou).
- Navegador (backend e Realtime FALSOS, nada vai ao Supabase): `node tests/painel-sincronizacao-navegador.mjs` (15 cenários:
  dois aparelhos, ordem trocada, queda, abas, sessão expirada, permissão revogada, canal negado, marca, segundo plano, sem rede,
  senha única) e `node tests/painel-app-sync-vistas-navegador.mjs` (23 cenários das vistas reais: Produção, Arquivos, Materiais,
  Chaves da edição, Publicação, Logo). Filtro opcional: `SO=<n>` no primeiro, texto no segundo.

#### Combos para aprovar — decidir na Visão geral — 27/10/2026 (pedido do Wilker)
"No card aparece exatamente o que eu preciso saber, e não achei onde é que eu aprovo." Antes, o cartão "Cadastros para aprovar" só
dizia o nome da marca e abria a lista; a decisão morava em ficha › Operação › Combo, quatro cliques adiante. Migration
`20261117_combos_em_analise.sql` (✅ aplicada; teste `supabase/testes/combos-em-analise.sql` → `TESTE_OK`; reversão em
`supabase/reverter/`), lógica em `lib/combosAnalise.js`, folha em `vistas/mesa/FolhaDecidirCombo.jsx`, teste
`tests/painel-app-combos-analise.test.mjs` e cenário V9 de `tests/painel-visao-geral-navegador.mjs`.
- **O que espera a curadoria é o COMBO** (`combo_status = 'em_analise'`), não o cadastro (já completo). O cartão agora se chama
  "Combos para aprovar", e o detalhe diz marca · “nome do combo” · tema · "enviado há N h" (`desde` = o último "→ em_analise"
  da auditoria). O NÚMERO continua sendo o tamanho da lista de marcas que ele abre (marca encerrada não conta).
- **O cartão resolve ali mesmo:** `acao.abrir = 'aprovacao'` faz o clique abrir a folha, em vez de ir à lista (pé: "Revisar e
  decidir"). A folha mostra uma marca por vez, do combo que espera há mais tempo: combo, tema e justificativa, os três itens e os
  custos da marca (vazio = "não informado", 0 = "sem custo"); **Aprovar combo**, **Pedir ajuste** (nota obrigatória) e
  **Abrir a ficha**. Decidir = `revisar_combo`, a MESMA RPC da ficha, então a marca recebe o mesmo aviso (sino + push). A fila é a
  do momento em que a folha abriu (decidir relê a Visão geral, e a lista que encolhe não embaralha "2 de 3").
- **Nunca meia lista:** o cartão só mostra o combo se `get_combos_em_analise` trouxe TODOS os que ele conta (`cobreAsMarcas`);
  leitura que caiu (ou sem `curadoria.decidir`) volta ao texto simples e à lista de marcas. A leitura não entra em `falhas`.
- ⚠️ `auditoria.alvo_id` é TEXTO: comparar com `pa.id::text` (a primeira versão da função quebrava no uso).

#### Aviso de alteração com o CAMPO e o toque que leva até ele — 27/10/2026 (pedido do Wilker)
"Quero saber na notificação o que a marca alterou, e que ao clicar me leve ao campo." Muda o R7 de "A marca só salva" (acima): o
aviso "<Marca> alterou o cadastro" deixou de listar ÁREAS ("Logo", "Combo e custos") e passou a listar **campos**. Migration
`20261118_alteracao_marca_campos.sql` (✅ aplicada pelo MCP; teste `supabase/testes/marca-salvar-avisa.sql` → `TESTE_OK`, com os
passos I e J novos; reversão em `supabase/reverter/`), testes `tests/painel-app-alteracao-campos.test.mjs` e
`tests/painel-aviso-campo-navegador.mjs` (porta 5247; ficha de mentira, sino, rolagem e destaque).
- **Texto = os nomes dos campos**, como a ficha os chama: "Nome do combo · Doce: descrição · Logo · Unidade 1: endereço". Só o
  NOME, não o valor (decisão do Wilker): o salvamento automático grava a cada ~1 s e o aviso, um só e sem UPDATE a cada letra,
  guardaria o valor pela metade. O valor certo está na ficha, destacado. Campo novo acumula no mesmo aviso (sem push novo);
  campo repetido não grava nada.
- **O catálogo mora no banco:** `campo_alterado_marca(tabela, coluna, linha, participação)` devolve `{rótulo, seção, âncora}`;
  coluna fora dele não gera aviso (status, progresso e carimbos). `marca_alterou` (gatilho) e `avisar_alteracao_marca_campo`
  usam ele. As funções por área (`avisar_alteracao_marca`) ficam sem uso (o painel não deixa apagar função).
- **Link = `marcas/<participante>/<seção>/<campo>`** (seção: `cadastro` · `combo` · `unidades`). Com vários campos o toque leva ao
  PRIMEIRO (ordem alfabética das colunas que mudaram no mesmo salvamento); os outros estão no texto. `rotaDoLink` põe o 3º
  segmento em `filtros.campo`; `lerIrDaUrl` aceita até 4 segmentos (o push `?ir=`); `interpretarLink` devolve `campo`.
- **A ficha rola até o campo e o destaca por 6 s** (`rolarParaCampo` em `FichaMarcaPagina.jsx`, classe `.fg-alvo`, sem animação):
  linha de dados = `#fg-campo-<chave>` (o `Dados` de `FichaVisao.jsx` aceita `{ id }`); item = bloco `#fg-item-<posição>`;
  unidade = bloco `#fg-uni-<id da unidade na edição>`. Chave desconhecida cai na seção, sem erro. Trocar de seção na ficha solta
  o campo do endereço (`onSub` limpa `campo`). ⚠️ **Campo novo no catálogo do banco precisa de âncora na ficha** — o teste
  confere cada chave do SQL contra os `id: '…'` de `FichaVisao.jsx`.
- ⚠️ Painel antigo (sem esta versão) abre a ficha na seção, sem o campo; o toque no PUSH (`?ir=` com 4 segmentos) só chega ao
  destino com o painel novo (a regra antiga recusava).

#### Operação › QR Codes — 30/10/2026 (`#operacao/qr`)
Aba só de leitura (`dado.ler`): quantas vezes cada peça com QR foi lida, por participante (ranking), dia, hora, cidade, aparelho e peça.
Plano e decisões: `docs/cartoon-2026-2/12-plano-qr-leituras.md`. Vista `vistas/QrCodes.jsx`, lógica pura em `lib/qr.js` (período, ranking,
busca, CSV), estilo em `styles/qr.css`, testes em `tests/painel-app-qr.test.mjs`.
- **Banco:** `20261122_qr_painel.sql` → `get_qr_resumo(p_secret, p_de, p_ate, p_testes)`, que chama `qr_resumo_dados` (o cálculo, fechado para
  anon/authenticated). `qr_pontos` e `qr_leituras_hora` seguem fechadas. Robôs ficam fora de todos os números (só aparecem em "de robôs");
  o ponto `teste` só entra em "Tudo, com testes"; datas no fuso de Natal; "Desde a abertura" usa `festival_inicio` da edição atual.
- **Sem domínio de sincronização:** o número muda a cada QR lido, não por ação da equipe; atualiza pelo botão "Atualizar".
- ⚠️ `qr` é chave de rota nova de Operação (entrou no contrato de `tests/painel-app-nomes-publicacao.test.mjs`).
- **Não faz ainda:** pausar nem cadastrar peça. Fica para quando a D3 definir peças novas (peça nova também precisa do PNG do QR, que sai do
  `scripts/qr-edicao.mjs --por-peca`).

#### Preenchimento automático — 02/11/2026 (pedido do Wilker: "automatize os participantes que preencheram o formulário… e gerar uma notificação")
Marca envia o `/preencher` → entra no cadastro e em Social media › Participantes sem ninguém clicar em "Aplicar", com texto revisado
pela API do Claude e UMA notificação (com push) que abre a ficha em Participantes. Migration `20261125_preenchimento_automatico.sql`
(✅ aplicada pelo MCP do claude.ai; teste `supabase/testes/preenchimento-automatico.sql` → `TESTE_OK`; reversão em `supabase/reverter/`),
edge function `supabase/functions/processar-preenchimento/` (✅ no ar, `--no-verify-jwt`, modelo `claude-sonnet-5-5`).
- ⚠️ **Nasce DESLIGADO:** `admin_config.preenchimento_automatico = false`. Ligar = `update public.admin_config set preenchimento_automatico = true;`
  DEPOIS de criar o secret `ANTHROPIC_API_KEY` (Supabase › Project Settings › Edge Functions › Secrets; só o Wilker mexe na chave).
  Ligado, o aviso antigo "enviou o formulário… revise e aplique" deixa de sair no envio (senão são dois avisos).
- **Fluxo:** gatilho `preenchimento_automatico` (pg_net, só o id) → função → `sistema_aplicar_envio` (reaproveita
  `org_preenchimento_decidir`, que aceita `eh_servico()`; rótulo "Automático (formulário)") → `sistema_textos_para_revisar` → API →
  `sistema_gravar_revisoes` → `sistema_finalizar_envio` (a notificação). A APLICAÇÃO vem antes da revisão: a API cair nunca a impede.
- **O banco manda, não a API:** `sistema_gravar_revisoes` pega o ORIGINAL do banco e só grava se o texto mudou, os DÍGITOS são os
  mesmos e o tamanho fica entre 60% e 160%; nunca sobrescreve revisão à mão sobre o mesmo original. Campos cobertos: `combo.nome|
  descricao|condicoes`, `<tipo>.nome|descricao|ingredientes`, `<tipo>.troca<k>.alternativa|descricao|como_solicitar`. As revisões
  especiais (`opcao:`, `ocultar:`) continuam sendo trabalho manual.
- **"Novo/Alterado" por campo:** o gatilho `alteracao_campo_marca` só registrava a MARCA logada (`meu_participante()`); agora também
  aceita `scw.alterou_participante`, que só `sistema_aplicar_envio` marca. ⚠️ Antes disso, "Aplicar" à mão NÃO gerava "Novo/Alterado".
- **`pode()` aceita `scw.sistema_ativo = 'on'`** (transação de `sistema_aplicar_envio`, que só a chave de serviço executa), porque
  `decidir` chama `org_salvar_*`. NUNCA liberar `pode` por papel de serviço: outras funções validam senha de pessoa com o cliente de serviço.
- **Falha:** envio pendente há 2 min+ (ou aplicado sem concluir) é refeito pelo cron `scw-preenchimento-reprocessar` (5 min); pendente
  há 30 min → aviso no formato antigo ("não consegui aplicar sozinho… revise e aplique"), uma vez (`aviso_falha_em`).

#### Descrição da troca é OPCIONAL — 03/11/2026 (Wilker, vendo o Marlon cobrado depois de ele deixar só o título "Água sem Gás")
Muda "Trocas completas" (02/11): o NOME e os 8 alergênicos da troca seguem obrigatórios; a DESCRIÇÃO deixou de ser cobrada.
`faltasDaTroca` (edicaoMarca.js) só devolve `alimentar`; o Início (`pendencias_marca`, migration `20261126_troca_descricao_opcional.sql`,
✅ aplicada, teste `supabase/testes/pendencias-marca.sql` → `TESTE_OK`), o "Faltam N" e a % param de pedir; o `/preencher` marca o campo
"(opcional)" e não o valida mais. A descrição continua sendo gravada e aparecendo (Social › Participantes, site) quando a marca escreve.
Descrição do COMBO segue obrigatória.
- **Diagnóstico da chave (03/11):** `POST {"diagnostico":"chave"}` na função devolve `{ok:true, chave:true|false}` — só diz se a chave existe (secret `scw-api-key`, nome criado pelo Wilker; `ANTHROPIC_API_KEY` também vale) no ambiente dela, nunca o valor. ⚠️ `rpc()` da função lê o corpo como TEXTO: função SQL `returns void` responde com corpo vazio (o `r.json()` direto virou 500 no 1º envio real, Caffè Basilico's, depois de aplicar e notificar).

#### Descrições sem limite visível — 03/11/2026 (Wilker, repassando a pergunta da Jolie: "os combos têm limite de caracteres pra descrição dos itens?" — "se tiver limite, retire")
As descrições do ITEM (era 300 no painel da marca, 600 no /preencher, 400 na ficha da organização), da TROCA (600) e do COMBO (400)
perderam o limite e o contador. Fica um TETO TÉCNICO de **5.000 caracteres** (`maxLength` 5000 nas telas; checks de
`participacoes.combo_descricao` e `substituicoes.descricao`; `org_preenchimento_decidir` e `editorial_salvar`) para colar um
documento inteiro não estourar o cadastro nem o texto de post. Migration `20261127_descricoes_sem_limite.sql` (✅ aplicada, testada
com rollback). Os NOMES (80) e a "proposta editorial" (2.000) seguem como eram. ⚠️ Quem ainda tem o painel/formulário antigo aberto
continua com o limite de tela antigo até recarregar.
- **Sem `tool_choice` forçado (03/11):** o `claude-sonnet-5-5` responde 400 ("tool_choice type tool/any not supported") — a função pede a ferramenta pela instrução do sistema e, se vier texto, lê o JSON dele. 1º teste real da API: Casa Alice Doceria, 3 campos revisados ("Cafe carioca" → "Café carioca", "ninho" → "Ninho", pontuação do combo), sem mudar informação.
- **Revisar tudo (03/11, Wilker: "revise todos os dados"):** `POST {"revisar_participacao":"<id>"}` revisa UMA participação sem aplicar envio nem notificar; só manda à API os textos SEM revisão para o original de hoje (`sistema_textos_sem_revisao`, migration `20261128_textos_sem_revisao.sql`) — as 133 revisões do Word e as automáticas ficam. Rodado nas 27 participações da edição: 12 campos novos em 8 marcas, 0 erro. Revisão que mexe em NOME de produto (ex.: "Burguer" → "Burger") é desfeita à mão: o prompt só autoriza corrigir grafia, e o modelo às vezes decide que estilo é erro.

#### Vouchers virtuais — 04/11/2026 (pedido do Wilker)
Plano e estado: `docs/cartoon-2026-2/15-voucher-virtual.md`. Migration `20261201_voucher_virtual.sql` (✅ aplicada em 04/11/2026; reversão em
`supabase/reverter/`; teste do banco `supabase/testes/voucher-virtual.sql` → `TESTE_OK`), lógica em `lib/vouchers.js` e `lib/voucherPendente.js`,
testes em `tests/painel-app-vouchers.test.mjs`.
- **Mesma tabela, dois canais.** `vouchers.canal` (`fisico` | `virtual`) e `link_token` (12 letras, só no virtual: constraint). Cota própria em
  `edicoes.vouchers_virtuais_por_participante` (padrão 2). `gerar_vouchers`/`destinar_vouchers` olham só os impressos; `gerar_vouchers_virtuais`/
  `destinar_vouchers_virtuais` são os do virtual (o destinar devolve `[{codigo, link_token}]`). ⚠️ Linha sem `canal` (banco antigo) é impresso (`canalDe`).
- **Organização:** Contatos › Vouchers ganha o seletor "Canal" (Impressos · Virtuais; só aparece com `cota_virtual` vindo do banco). Voucher virtual
  destinado tem "Copiar link" (ícone) e "Copiar mensagem" (texto pronto, `mensagemVoucherVirtual`). O link é sempre o do domínio oficial
  (`ORIGEM_PUBLICA`), nunca o da barra. ⚠️ O link só abre para o cliente quando `/cartoon` estiver público (`CARTOON_PUBLICA`).
- **Marca:** o cartão de vouchers aparece também só com virtuais e mostra a contagem deles. O código chega ao campo por três caminhos — digitado,
  QR lido pela câmera do celular (`/painel/?voucher=SCW-XXXXX`, guardado em `sessionStorage` ANTES do login por `capturarVoucherDaUrl` no `main.jsx`)
  ou "Ler o QR do cliente" dentro do painel (`LerQrVoucher`, só onde há `BarcodeDetector`: Chrome; no iPhone vale a câmera do celular). ⛔ Ler NÃO
  registra: o campo só é preenchido e a baixa é o botão "Registrar uso" (`marca_usar_voucher`, a mesma do impresso).
- **Contatos › ficha da pessoa** conta "disponíveis" só dos impressos (`x.canal !== 'virtual'`): o destinar de lá chama `destinar_vouchers`.
- ⚠️ Não verificado em navegador nem em aparelho (câmera, `BarcodeDetector`, abertura do QR no iPhone). Verificado: testes (687 do painel, 73 da
  edição), teste SQL no banco e build.

#### Fotos do combo por LINK (Dropbox) e aviso no dia 5 — 03/11/2026 (Wilker: "uma forma de disponibilizar essas fotos sem ocupar espaço")
O Supabase free já está em ~1,04 GB (`redes` 773 MB + `arquivos` 261 MB; limite 1 GB; o painel do Supabase avisa cota excedida e restrição a
partir de 23/11). As fotos aprovadas (180 em PNG ≈ 700 MB + 178 lâminas do carrossel ≈ 63 MB) NÃO vão para o Storage: cada marca ganha uma pasta
no Dropbox e o painel mostra um item "Fotos do combo" que abre o link. Migrations `20261129_arquivo_por_link.sql` e
`20261130_aviso_fotos_dia5.sql` (✅ aplicadas; testes `supabase/testes/arquivo-por-link.sql` e `aviso-fotos-dia5.sql` → `TESTE_OK`; reversão em `supabase/reverter/`).
- **`arquivos.url_externa`**: exatamente um entre `path` (Storage) e `url_externa`; só `https://…dropbox.com/…`. `get_arquivos_admin` devolve o link.
  Marca: `FotosOficiais.jsx` mostra "Abrir as fotos" (anchor `_blank`, `noopener`), sem Baixar/ZIP (`ehLinkExterno`, `lib/arquivosMarca.js`; `detalheDaFoto`
  diz "Pasta no Dropbox"). Equipe: `ArquivosOrg.jsx` abre o link e não oferece "Substituir".
- **Publicar SEM avisar:** o aviso por arquivo (`gerar_notificacoes`) só dispara no **INSERT já publicado**. Insira com `publicado_em` nulo e depois
  `update … set publicado_em = now()` — o UPDATE não avisa ninguém.
- **Aviso único em 05/11/2026 09:00 (Natal):** `avisar_fotos_do_combo()` por pg_cron (`scw-aviso-fotos-dia5`, `0 12 5 11 *` UTC). Só avisa marca com pasta publicada
  (arquivo de link, categoria `combo`) e que ainda não recebeu o aviso; depois do dia 5 desagenda o job. `avisar_fotos_do_combo(true)` força (teste).
- **Pastas no Dropbox:** `09_ENTREGAS/fotos-participantes/<marca>/` (só a versão mais nova de cada foto aprovada + `Carrossel com tarja/` com as lâminas 01–07; sem a
  08 de arte final, sem `_versoes-anteriores`). Links públicos criados NO DROPBOX (o conector do Claude só cria link privado por convite de e-mail, e o Dropbox avisaria
  a marca na hora). Os endereços ficam em `clientes/sweet-coffee-week-dados/` (fora do repositório público).
- Marlon ganhou o link também (03/11): continua com os 14 arquivos do Storage e agora tem a pasta no Dropbox como as outras 26 (27 marcas com link).
- **Prévia do cartão (03/11, Wilker: "tem como adicionar uma prévia das fotos?"):** `arquivos.previa_dados` (migration `20261131_arquivo_previa_dados.sql`, ✅ aplicada; teste
  `supabase/testes/arquivo-previa-dados.sql` → `TESTE_OK`; reversão em `supabase/reverter/`). É um MOSAICO WebP 640×480 (Combo grande + Doce, Salgado e Bebida empilhados;
  30–62 KB) guardado na linha como data URL — o `previa_path` não serve porque o link não tem arquivo no Storage. CHECK: só linha de link, só WebP, ≤ 150.000 caracteres.
  `Miniatura.jsx` desenha direto (sem assinar); sem prévia ou imagem que falha → ícone + nome. A marca lê pela tabela (`select=*`, só a linha dela); `get_arquivos_admin`
  NÃO devolve a coluna. Trocar a prévia é UPDATE (não notifica). **Para refazer:** gerar o mosaico das fotos originais da pasta do Dropbox (Pillow, cobrir/cortar; 4:5 → 384×480
  à esquerda e 3 células 251×156 à direita, vão de 5 px, fundo #F1DFC4, qualidade 74) e gravar por UPDATE em `arquivos.previa_dados` — o texto base64 passa de 1 MB no total,
  então NÃO cabe numa chamada SQL do MCP: use uma função temporária com token descartável (foi o que se fez; já desativada, `previa-upload-temp` responde 410 e pode ser apagada no painel).

#### Arquivos › Links dos combos — 04/11/2026 (pedido do Wilker)
"Uma seção com todos os links dos combos dos participantes, para todo mundo do painel ter acesso." Só tela, sem migration: a aba
`links` do módulo Arquivos (`vistas/LinksCombos.jsx`) lista, A–Z, as pastas de fotos no Dropbox que cada marca já vê em Fotos —
`arquivos` com `escopo = 'marca'`, `categoria = 'combo'` e `url_externa`, não arquivadas (`linksDosCombos` em `lib/arquivos.js`, teste em
`tests/painel-app-arquivos.test.mjs`). Mesma leitura (`get_arquivos_admin`) de Por participante: não há cópia, link novo ou trocado aparece
sozinho. Só leitura (abrir a pasta, copiar o link, "Copiar todos" = `marca: link` por linha); publicar ou trocar o link continua em
Por participante. Visível a toda a equipe da organização; a marca nunca vê os links das outras. ⚠️ Chave de rota nova `links`
(`ABA_ARQUIVOS` em `lib/rota.js`; o contrato de rotas do teste `painel-app-nomes-publicacao` ganhou `links`).

#### Balcão: vouchers e carimbos à mão — 05/11/2026 (pedido do Wilker)
"Deixar visíveis na abertura do painel o que a equipe usa no atendimento." Só front: nenhuma migration, RPC ou permissão nova.
Testes `tests/painel-app-balcao.test.mjs` e `node tests/painel-balcao-navegador.mjs` (de dentro de `tests/`; backend falso, 40 verificações, `CAPTURAS=` salva imagens).
- **Marca:** `vistas-marca/VouchersMarca.jsx` virou o bloco **Balcão** (`balcao` em `ordemDoInicio`, logo abaixo da identificação em TODAS as fases;
  o bloco `vouchers` antigo sumiu): três botões grandes (≥ 64 px) — **Escanear QR do voucher**, **Digitar código do voucher**, **Ajudar com carimbo**.
  O que já existia ficou como estava: a baixa é `marca_usar_voucher`, só pelo botão "Registrar uso" (ler QR e digitar só PREENCHEM o campo); o servidor
  confere marca, situação e permissão. Mudou: os atalhos aparecem antes da contagem carregar e com a leitura caída (`estadoDoBalcao` em `lib/vouchers.js`);
  só ficam desligados quando se SABE que não há voucher (total 0 ou função ausente), com a frase dizendo o motivo. `recadoDoVoucher` (mesmo arquivo)
  traduz usado, cancelado, não distribuído, não encontrado/de outra marca, fora da validade e **falha de rede** ("NÃO foi registrado").
- **Câmera:** `LerQrVoucher.jsx` agora só desenha a câmera enquanto `ativo`; o botão mora no Balcão. A câmera só é pedida no toque. Sem `BarcodeDetector`
  (iPhone) o botão continua e explica: abrir o QR do cliente com a câmera do celular (`?voucher=`) ou digitar. Permissão negada → mensagem + campo de digitação.
- **Ajudar com carimbo** (`vistas-marca/AjudaCarimbo.jsx`): folha só de ORIENTAÇÃO, sem chamar o servidor. O cliente carimba sozinho; sem GPS usa
  "Estou na casa e o GPS não funciona" (pedido de revisão de presença); a organização decide; a casa não aprova nem cria carimbo; ninguém pede a chave
  pessoal do cliente. ⛔ Não dar à marca poder sobre carimbo sem regra de produto e autorização específicas.
- **Organização:** `vistas/mesa/AtalhosBalcao.jsx` no topo da Visão geral (só com `dado.ler`): **Vouchers** → Contatos › Vouchers e **Pedidos de carimbo** →
  Edição › Carimbos › Pedidos de presença (`#edicao/carimbos?sub=presenca`), com a contagem de pendentes lida da fila existente (`caca_excecao_listar`).
  ⛔ A organização NÃO escaneia nem digita voucher: não há operação autorizada para esse papel (`marca_usar_voucher` exige a conta da marca) e criá-la
  pede permissão nova no banco — decisão do Wilker, não atalho.
- ⚠️ `tests/painel-marca-estados-navegador.mjs` S2 já falhava antes desta mudança ("Faltam 2" × "Faltam 3"): a fixture não tem `combo_descricao`, obrigatório
  desde 02/11. E `test:organizacao` tem 2 falhas do site (`horário da loja` e `estadoAgora` em `src/edicao`), alheias ao painel.
