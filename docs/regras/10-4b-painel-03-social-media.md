<!-- Parte das regras do projeto. Índice: painel-app/CLAUDE.md. Movido sem reescrita de painel-app/CLAUDE.md em 10/11/2026. -->

#### Social media — planejamento, biblioteca e participantes — 16–17/10/2026 (`#social/…`)
Módulo próprio (era Operação › Redes sociais; `#operacao/redes…` e avisos antigos `operacao/redes/<id>` caem aqui —
`migrarRota`/`rotaDoLink` em `lib/rota.js`, e a barra de endereço é corrigida). **Um calendário só.** Abas:
**Planejamento** (`vistas/Redes.jsx` + `RedesFicha.jsx`) · **Biblioteca** (`SocialBiblioteca.jsx`) · **Participantes**
(`SocialParticipantes.jsx`, só com `editorial.ler`). A função `social` ("Social media") entra direto em
`#social/planejamento` (App.jsx, pela função; link direto e aviso têm prioridade) e só vê Visão geral + Social media
(`PODE_MODULO` no PainelShell: sem `dado.ler` os módulos de cadastro nem aparecem). ⛔ O painel **não publica** no
Instagram, não guarda senha de rede e não fala com a Meta. Não confundir com Edição › Publicação no site.
- **Banco, nesta ordem:** `20261017_equipe_perfis_avisos.sql` (foto, diretório, Meu perfil, avisos por pessoa) →
  `20261017_social_media.sql` → `20261017_social_media_ajustes.sql` (`search_path` + `push_pessoal = true`, que só vale
  com a `enviar-push` com `push_destinos` publicada — senão o aviso de uma pessoa iria a todos os aparelhos) →
  `20261018_social_aprovacao.sql` (aprovação, abaixo). Edge Functions `arquivo-url` (bucket `equipe`, materiais gerais
  para `redes.ver`) e `enviar-push` (`push_destinos`) publicadas em 17/10/2026.
- ✅ **Aprovação da Eline — 18/10/2026** (pedido do Wilker). Etapas: **Rascunho → Aguardando aprovação → Aprovado →
  Publicado** (gravado: `rascunho` · `aprovacao` · `pronto` · `publicado`; `preparacao` é legado, fica no CHECK e no
  rótulo, o banco não grava mais). "Enviar para aprovação" (`redes.editar`) exige as pendências do formato; "Aprovar" é
  `redes.aprovar` (só Administrador). O aviso "Aguardando sua aprovação" vai a `admin_config.redes_aprovadores` (Eline);
  vazio → todos com `redes.aprovar`. **Pedir ajuste** (comentário de ajuste) devolve para rascunho — ⚠️ sem tocar em
  `atualizado_em`, senão o selo "Ajuste pedido" some na hora. Mudou legenda, menções, formato ou arte de um APROVADO e
  quem mudou não aprova → volta para "Aguardando aprovação" e a Eline é avisada (`redes_rever_etapa`); horário e
  responsável não desfazem a aprovação. Confirmar publicação continua exigindo `pronto`. **Quem criou cancela a própria
  postagem** enquanto ela não foi aprovada (antes a Social media ficava sem saída); depois disso, só `redes.gerir`.
- **Guia** (`vistas/SocialGuia.jsx`, texto em `lib/socialGuia.js`; refeito em 17/10/2026 para não empurrar o
  calendário): na primeira visita deste aparelho, UMA linha (`GuiaPrimeiraVez`, `etapasResumo`: o caminho inteiro,
  com quem aprova e a publicação manual) + só "Entendi" (`scw_social_guia_visto`; quem escondeu o guia antigo —
  `scw_social_guia_recolhido` — não vê de novo; 23/10/2026: o segundo botão "Ver o passo a passo" saiu, era a mesma folha do "Como
  funciona"). Os seis passos moram numa FOLHA aberta por "Como funciona" no cabeçalho (`SocialGuia`).
- **Alertas e atalhos:** a conta vem de `redes_resumo` (TODAS as abertas), não do mês aberto na tela — antes
  dezembro mostrava "0 atrasadas" com atraso em outubro. À vista só os ALERTAS do perfil e só com algo
  (`alertasDoPerfil`: quem aprova vê para aprovar · atrasadas · com ajuste; quem publica vê com ajuste · a publicar ·
  atrasadas). ⛔ Contador zerado não vira bloco (23/10/2026: nem o `ResumoRedes`, que agora recebe o `resumo` já lido e
  `totalAlertas(contagem, { aprova })` é o número que a Visão geral usa). Os outros atalhos são "Lista rápida", agora na linha
  "Em todas as datas:" (chips cheios com seta, com o rótulo dizendo o escopo) fora de Filtros. Atalho ligado troca o período por
  uma faixa que DIZ o escopo (`escopoAtalho`: "de qualquer data… Não é a semana escolhida") com "Voltar ao calendário".
- **Nova postagem enxuta:** título (único obrigatório), formato, responsável (= quem cria), data, horário e legenda;
  o resto em "Mais detalhes (opcional)". No celular, os campos vêm antes da arte. "Criar postagem" do participante põe o
  @ da casa nas menções (`arrobaDe`) e leva `volta=part:<id>` no endereço: fechar (ou fechar a postagem criada) volta à
  ficha do participante. Escolher a arte na postagem nova cria o rascunho e sobe a arte em seguida
  (`ENVIOS_PENDENTES`). A postagem nova NÃO criada fica guardada neste aparelho (`scw_redes_rascunho_novo`, só o que a
  pessoa mudou); vindo do participante com uma guardada, a tela pergunta ("Continuar a de antes" / "Seguir com a do
  participante") — nunca troca em silêncio. Valor automático (responsável, edição atual) não conta como alteração.
- **Cor do módulo: verde** (`--scw-verde #22B573`, 10ª cor, SÓ do painel — pedido do Wilker, 18/10/2026; chocolate sobre
  ele 6,1:1). Antes repetia o laranja de Operação. ⛔ Não usar no site.
- **Barra do celular escolhida pela pessoa** (`lib/atalhosBarra.js`): Mais › "Escolher os atalhos da barra" marca até 4
  áreas; fica no aparelho, por conta (`scw_barra_<user_id>`). Padrão: Visão geral, Participantes, Social media, Operação
  (Contatos foi para "Mais"). Área que a pessoa deixou de ver sai sozinha da escolha. O painel da marca segue fixo.
- **Planejamento** (refinado em 17/10/2026 — percurso: ver a semana → escolher o dia → abrir o post → conferir arte e
  legenda → próxima ação). Reorganizado em 23/10/2026 (pedido do Wilker: "melhorar a construção e visualização"). Topo em
  TRÊS níveis: período (anterior · intervalo que abre o calendário do aparelho por `showPicker` · próximo · Hoje; rótulo curto
  no celular, `tituloCurto`) com as AÇÕES na mesma linha ("Como funciona", "Mais ações" › "Checklist padrão" — só com
  `redes.gerir` —, "Nova postagem"; o `<h2>Planejamento</h2>` só existe para o leitor de tela, a aba já é o título); alertas
  do perfil; e as ferramentas (Semana/Mês/Dia/Lista/**Sem data** num único segmentado — no estreito, caixa de seleção —,
  "Sem data" com a contagem, busca, "Filtros" com quantos estão ligados e "Limpar filtros"). Tudo no endereço, como antes.
  Abre na SEMANA, **segunda a domingo**. ⚠️ O arranjo segue a LARGURA DO CONTEÚDO, não a do aparelho
  (`useLargura` + `ResizeObserver` → `R.layoutSemana`): **colunas** (≥1040 px de conteúdo: sete colunas de cartões
  curtos, dia clicado abre embaixo) e **agenda** (abaixo disso, inclusive no celular: dias em linhas, postagens ao lado).
  O arranjo "linhas" (<600 px) e `LARGURA_AGENDA` saíram. Todo dia tem "Adicionar" (com postagem ou sem); acima do máximo por
  célula, "Ver todos (N)". 1024 px de tela com o menu lateral cai em agenda — sete colunas ali ficavam ilegíveis. Nenhuma
  rolagem automática; hoje destacado. ⚠️ A regra global `.og-vista > .pn-vista-cabeca:has(+ .ui-abas){margin-bottom:var(--e-5)}`
  (painel.css) vale para TODO módulo com abas, não só o Social media.
  ⚠️ **`container-type` contém posição fixa:** o container (`.rd-c`) envolve só o calendário; a ficha e o guia
  (folhas `position:fixed`) ficam FORA dele — dentro, a folha ficaria presa na caixa do calendário. Mesma regra em
  `.sb` (Biblioteca, sem folha) e nunca em `.sp` (Participantes abre folha).
  **Cartão** (`CartaoPost`): miniatura · título (até 2 linhas, sem hifenizar) · hora e formato · situação · responsável
  quando cabe; UM alerta, o mais urgente (`alertaDoCartao`: atrasada > ajuste > mesmo horário > pendências). O cartão
  inteiro é o botão (23/10/2026: a situação é um `Selo` — ícone + texto — e o nome do participante aparece quando há).
  Mês, Dia, Lista e Sem data continuam; filtro por **participante** (`part`). A tela "Sem data" é a fila das postagens
  sem horário programado (`ROTULO_MODO.fila = 'Sem data'`). O placeholder do título da postagem nova é "Ex.: Carrossel do
  combo, lançamento".
- **Ficha da postagem — leitura antes de formulário** (17/10/2026): arte → legenda → programação → "Próximo passo" →
  gavetas recolhidas (detalhes · arquivos e versões · comentários · histórico; nenhuma dentro da outra). Cada bloco
  edita NO LUGAR (`R.SECOES`: legenda sozinha — "Salvar" logo embaixo do campo, ao alcance com o teclado aberto —,
  menções e observações, programação, detalhes); bloco com alteração não salva fica aberto. Pendência leva ao bloco e
  ao campo (`ONDE_PENDENCIA`). A ÚNICA ação em destaque mora no rodapé (`R.proximaAcao`): criar · salvar (com
  alteração não salva é sempre salvar — nenhuma etapa anda com a versão antiga) · enviar para aprovação · aprovar (só
  `redes.aprovar`) · confirmar publicação. O raro fica em "Mais ações". Prévia: arte inteira (contain), altura
  controlada, posição "2 de 7", anterior/próximo e miniaturas (nada depende de gesto), "Ampliar" e "Baixar arte" só
  com ícone (25/10/2026), "Baixar as N (ZIP)" com texto; falha de download aparece com "Tentar de novo" (nunca `.catch(() => {})`).
  `Folha` ganhou duas props OPCIONAIS, só o Social media usa: `rodape` (barra fora da rolagem — sem sticky nem margem
  negativa; substituiu o `.rd-rodape` preso com `bottom:-40px`) e `cheia` (tela inteira no celular). As outras folhas
  não mudam.
  Também: "Última alteração: <avatar> nome · quando" e "criada por"; versão de cada arte (substituir sobe
  1, a anterior fica em "Versões anteriores"); origem (enviada aqui × da biblioteca); quem confirmou com avatar;
  comentário com **pedido de ajuste** (selo "Ajuste pedido" até a próxima alteração; avisa responsável e autor);
  "Ver participante e combo". ⛔ Arte enviada por OUTRA pessoa (o designer) só `redes.gerir` substitui ou remove — a
  Social media envia, associa, ordena e pede ajuste (`redes_exigir_dono`).
- **Biblioteca** (`social_biblioteca`): uma lista só, por REFERÊNCIA (nada copiado) — arte final (`redes_arquivos`,
  inclusive da biblioteca com `post_id` nulo, enviada por `redes.gerir`), foto do combo/loja (`midias_participacao`,
  bucket público `edicao-publico`), logo (`logos_marca`, "oficial" × "anterior"), material geral da campanha
  (`arquivos` de escopo geral). Filtros: tipo, edição, participante, situação (padrão "disponível"), busca. Associar a
  uma postagem (`redes_arquivo_associar`) grava bucket + caminho resolvidos NO SERVIDOR pelo id de origem: trocar a foto
  depois não muda a postagem. PDF e SVG ficam "só download". Privado continua privado: `redes` e `equipe` por
  `baixar_varios`, `arquivos` por `baixar` (só `geral/` para `redes.ver`), renovados (`lib/redesArquivos.js`; fonte =
  `{ bucket, path }`).
- **Biblioteca com PASTAS** (17/10/2026, `SocialBiblioteca.jsx` + `lib/pastas.js`). Migration
  `20261019_social_pastas.sql` ✅ **aplicada em 17/10/2026** pelo arquivo do commit `1086da5` (pg_net + sha256
  `1e16229e…` conferido), registrada como `20261019_social_pastas`; cópia das duas funções substituídas e o roteiro de
  reversão em `sweet-coffee-week-dados/backups-supabase/scw-2026-10-17-antes-pastas/`. Sem ela o painel mostraria a
  biblioteca sem pastas e um aviso; nada quebra. Organizar é serializado (`pg_advisory_xact_lock`) e a lista corta
  sempre pelos 300 MAIS RECENTES (a ordem por nome vem depois; a tela avisa quando bate no teto). Arte substituída
  numa postagem herda a pasta da versão anterior (gatilho `social_pasta_herdar_versao`). Pastas VIRTUAIS: `social_pastas` (hierarquia por `pai_id`,
  vínculo opcional a edição/participante, arquivar — nunca apagar) + `social_biblioteca_pasta_item` (`tipo`, `item_id`
  → pasta; sem linha = "Sem pasta") + `social_biblioteca_registro` (auditoria). Mover ou renomear NÃO toca no Storage,
  no caminho, nas versões nem nas postagens; a origem (foto, logo, material) fica intacta. O banco impede ciclo, nome
  vazio/com "/"/repetido no mesmo nível (índice único), pasta arquivada como destino e vínculo quebrado
  (`social_item_existe`). Arquivar pasta com conteúdo exige `p_confirmar` e sobe tudo para a pasta-mãe (ou "Sem pasta").
  Organizar = `redes.gerir`; a Social media navega, baixa e associa. Abre com as pastas primeiro, arquivos embaixo;
  atalhos Biblioteca · Sem pasta · Recentes; caminho + "Voltar" (= voltar do histórico: a casca troca "ir para a URL
  anterior" por `history.back()`); busca em tudo; ordem nome/atualização; seleção explícita ("Selecionar") com barra
  presa embaixo; "Mover para…" mostra a árvore sem a própria pasta nem as de dentro. Envio dentro da pasta aberta
  (`social_biblioteca_registrar` com `pasta_id`), "Enviado e registrado" só depois do banco. O seletor da postagem é o
  MESMO navegador (`NavegadorBiblioteca modo="seletor"`). Pasta, filtros e prévia (`ver=tipo:id`) no endereço.
- **Apagar e restaurar arte na Biblioteca** (21/10/2026, pedido do Wilker). Migration `20261023_social_biblioteca_apagar.sql`
  (✅ aplicada em 21/10/2026 pelo MCP `supabase-scw`; só acrescenta duas funções) + teste do banco
  `supabase/testes/social-biblioteca-apagar.sql` (termina em exceção `TESTE_OK`; nada fica). Segue a regra do painel (excluir =
  arquivar + restaurar): `social_biblioteca_apagar` marca `redes_arquivos.removido_em`/`removido_por_rotulo` (a MESMA marca de
  `redes_arquivo_remover`), nada sai do Storage, e `social_biblioteca_restaurar` desfaz. ⚠️ **Só `arte`** se apaga aqui: logo,
  foto do combo/loja e material da campanha têm arquivamento próprio (participante, Arquivos) e o banco recusa com
  `tipo_nao_apagavel` em vez de ignorar. Permissão `redes.gerir`. Arte presa a postagem já publicada/cancelada não sai
  (`post_fechado`, via `redes_post_aberto`); em postagem aberta sai também da postagem e o histórico dela registra. Versão
  anterior (`substituida`) não se apaga nem restaura. Na tela: "Apagar" na prévia e "Apagar…" na seleção (confirmação em
  laranja, `confirmar(…, { perigo: true })`); as apagadas ficam em Filtros › Situação › "Artes apagadas", onde aparece
  "Restaurar". Até 200 por vez. O sinal de sincronização é `['biblioteca', 'redes']` (já havia gatilho em `redes_arquivos`).
  🐛 **Contagem da pasta = o que a pasta mostra** (21/10/2026, migration `20261024_social_pastas_contagem.sql`, ✅ aplicada): o cartão dizia
  "84 arquivos" e a pasta tinha 30 — `n_itens` contava toda linha de `social_biblioteca_pasta_item`, inclusive arte já removida da postagem e a
  mesma arte repetida (mesmo caminho). `social_pastas_listar` agora devolve `n_itens` (disponíveis, uma arte por caminho) e `n_itens_todos` (bruto);
  arquivar pasta decide a confirmação por `n_itens_todos`. ⚠️ Quem mexer em `social_biblioteca` (o que conta como "disponível") tem que mexer
  também em `social_item_disponivel`, senão o número do cartão volta a divergir da lista.
- **Arrastar arquivo até uma pasta** (21/10/2026, pedido do Wilker). Soltar numa pasta é a MESMA operação de "Mover para…"
  (`moverItens` → `social_biblioteca_mover`, só uma chamada no arquivo; sem migration). Por PONTEIRO, não pelo arrastar nativo do HTML5
  (que não existe no celular): `lib/arrastar.js` (lógica pura: `destinoValido`, `itensDoArrasto`, rolagem) + `lib/arrastarReact.jsx`
  (`useArrasto`, `FantasmaArrasto`). **Mouse pega o cartão inteiro** (o clique simples continua abrindo a prévia: só vira arrasto depois de
  mexer 6 px, e o clique que o navegador dispara ao soltar é engolido); **toque só pela alça** (`.bb-arq__alca`, `touch-action:none` ali)
  para a rolagem da lista seguir livre. Alvos = elementos com `data-alvo-pasta` (id da pasta ou `raiz`): cartão da pasta, atalhos
  Biblioteca/Sem pasta e o caminho; "Recentes" não é alvo. Arrastar um arquivo MARCADO leva a seleção inteira. Perto da borda do quadro
  que rola (`.og-vista`) a lista rola sozinha; Esc cancela. A etiqueta que segue o dedo vai por portal ao `<body>`. Só quem organiza
  (`redes.gerir`, com as pastas ativas); o teclado segue com Selecionar + Mover…. ⚠️ Elemento novo que deva ser alvo precisa de
  `data-alvo-pasta`. Teste no navegador, mouse e toque de verdade (CDP): `node tests/painel-biblioteca-arrastar-navegador.mjs`
  (rodar de dentro de `tests/`); lógica em `tests/painel-app-arrastar.test.mjs`.
- **Cor da pasta** (21/10/2026, pedido do Wilker). Migration `20261025_social_pastas_cor.sql` (✅ aplicada pelo MCP `supabase-scw`; só acrescenta a
  coluna `social_pastas.cor` + as MESMAS três funções com `cor`) e teste `tests/painel-app-pastas-cor.test.mjs`. A cor é uma chave da PALETA da marca
  (`CORES_PASTA` em `lib/pastas.js` = `social_pastas_cor_check`: amarelo, laranja, magenta, roxo, ciano, verde, marrom) — **nunca cor livre**: o
  teste reprova divergência com o banco e exige contraste de ícone ≥ 3:1 (creme sobre roxo/marrom/magenta, chocolate sobre o resto). Sem cor, a pasta
  usa o acento do módulo (como antes). Menu da pasta › "Cor da pasta…" abre o seletor (`CorDaPasta`, radiogroup); "Padrão" manda cor vazia. A cor
  aparece no disco da pasta, num ponto no título da pasta aberta e na lista "Mover para…". Subpasta NÃO herda a cor da pasta-mãe (decisão simples;
  herdar é possível depois). Cenário no navegador em `tests/painel-biblioteca-arrastar-navegador.mjs`.
- **Auditoria geral — lote 1, 21/10/2026** (relatório em `…/00_PLANEJAMENTO/AUDITORIA-PAINEL-2026-10-21.md`, no Dropbox; não vai ao repositório público).
  Corrigido, com teste em `tests/painel-app-auditoria-21-10.test.mjs`: **criar acesso de candidatura** (variável `r` sombreada pelo rascunho da triagem:
  a conta nascia e a tela dizia "Não criou"; a lista agora também relê, `respostas` em `FUNCOES_ESCRITA`); **Sair encerra só este aparelho**
  (`logout?scope=local` — sem escopo o GoTrue encerra a conta em todos); **rascunhos do Social media** saem no "Sair"/troca de conta
  (`lib/rascunhosSocial.js`, módulo sem dependências para o `App` não puxar o de Redes); pedido arquivado não conta como "faltando resposta";
  sessão `remarcada` ocupa o horário na agenda de fotos; aprovar tema e "Gerar acessos" pedem confirmação; Biblioteca: a arte em uso não vira
  "Apagada" (`20261026_social_biblioteca_arte_em_uso.sql`, ordem do `distinct on (a.path)`). ⚠️ Toda variável nova num componente que usa
  `useRascunhoOrg` NÃO pode se chamar `r` (é o rascunho).
- **Aprovar o que se VIU — aprovação da Eline** (21/10/2026, achado da auditoria; lote 2). Antes, trocar/acrescentar/reordenar/remover arte (ou mexer na
  legenda) com a postagem em "Aguardando aprovação" NÃO subia a versão, e a tela de quem aprova se relê sozinha pelo sinal e passa a mandar a versão
  nova: dava para aprovar uma arte que não se conferiu. Duas camadas: **banco** (`20261027_social_aprovacao_versao.sql`, ✅ aplicada; `redes_rever_etapa`
  ganhou um ramo: em `aprovacao` + conteúdo mudou → `redes_carimbar` = versão +1 e "atualizado por/em" de quem mexeu, e `redes_avisar_aprovadores`, menos
  se quem mexeu é aprovador; teste `supabase/testes/social-aprovacao-versao.sql`); **tela** (`RedesFicha.jsx`): `vistaRef` guarda o que a pessoa viu ao abrir
  (`R.conteudoParaAprovar`: arte = id+versão na ordem, legenda, menções, formato, horário como instante, observações). Se outra pessoa muda isso e quem está
  na ficha tem `redes.aprovar`, aparece "<quem> mudou <o quê> às hh:mm depois que você abriu" e o botão principal vira "Conferi as mudanças" (idem
  "Aprovar direto" bloqueado); só depois volta "Aprovar", que manda a versão atual. Mudança da PRÓPRIA pessoa não pede conferência. O banco continua recusando
  versão antiga (`redes_travar`). Teste no navegador: `node tests/painel-social-aprovacao-navegador.mjs`. Não cobre texto alternativo (`redes_arquivo_alt`).
- **Auditoria geral — lote 3, 21/10/2026** (testes em `tests/painel-app-auditoria-21-10.test.mjs`). **Banco** (`20261028_social_resumo_e_responsavel.sql`, ✅ aplicada;
  teste `supabase/testes/social-resumo-e-responsavel.sql`): `redes_salvar` só confere o responsável quando ele MUDA (antes, responsável com senha redefinida travava toda
  gravação da postagem com `responsavel_invalido`); `redes_resumo.proximos_itens` é só de agora em diante (antes mostrava só os 5 atrasados mais antigos). **Tela**: Visão
  geral só diz "Tudo em dia"/"Nada pendente" depois de ler tudo (`extra.lidas`; com leitura caída diz que não dá para afirmar); cadastro da marca pede confirmação ao
  remover unidade, troca e horário do dia, e o "Salvo" diz o que ficou de fora por inválido (`camposInvalidosDaUnidade`: CEP, UF, WhatsApp); ficha da postagem: limite
  de 2200 conta legenda + menções por pontos de código (`R.contarCaracteres`), título/perfil vazios avisam em português, fechar com arte subindo/falha pergunta, e data
  digitada pela metade não apaga data e hora. ⚠️ Escrever `
` em Python de edição pode virar quebra de linha DE VERDADE dentro de um texto JS (build quebra) — conferir com
  `vite build` depois de editar texto com `
`.
- **Auditoria geral — lote 4 (segurança e lado da marca), 21/10/2026** (testes no mesmo `tests/painel-app-auditoria-21-10.test.mjs`). **Banco:** `20261029_storage_arquivos_politica.sql` (✅ aplicada; a política `arquivos_marca_le` do bucket `arquivos` só deixa a marca ler o que está publicado e não arquivado, com conta ativa — antes qualquer conta logada lia `geral/*`, até arquivado e de conta bloqueada) e `20261030_marca_complementar_resposta.sql` (✅ aplicada; teste `supabase/testes/marca-complementar-resposta.sql`): `marca_responder_solicitacao` passa a ACRESCENTAR o complemento à resposta anterior (com a data) e recusa passar de 4000 (`resposta_longa`); antes apagava a resposta. **Edge Functions** (✅ publicadas): `regerar-senha-conta` devolve `avisos` (`envio_nao_zerado`, `sessoes_nao_encerradas`) em vez de ignorar a falha — a senha JÁ mudou, então não é erro (`textoAvisosSenha` em `lib/cadastro.js`; Equipe e o lote de acessos mostram); `criar-acesso-marca` recusa candidatura que não esteja `aprovado`/`aguardando_cadastro` (`candidatura_nao_aprovada`, 409). **Tela:** link do canal de delivery só aceita http(s) (`linkWebSeguro`/`erroLinkCanal` em `lib/cadastro.js`; ficha e página pública conferem o dado antigo também); primeiro acesso da marca — `marcarSenhaTrocada` agora PROPAGA a falha, `DefinirSenha` tenta duas vezes e, se não der, fica em "Tentar de novo" só para essa parte (conta com `deve_trocar_senha` ligada não passa em `conta_ativa()` e o painel abria vazio); trocar a senha encerra as OUTRAS sessões (`logout?scope=others`, melhor esforço); `marcaApi.auth` e `api` têm tempo-limite (20 s e 30 s, `AbortSignal.timeout`); "Conferindo sua sessão" ganha "Sair" depois de 8 s e sessão que morreu em uso volta às boas-vindas com "Sua sessão terminou. Entre de novo."; login da marca ganha "Mostrar a senha". Operação: Edição › Configuração não diz "Nenhuma edição aberta" quando a LEITURA falhou (e trava trocar/fechar às cegas), trocar a edição aberta e mudar valor do combo ou datas em "Salvar edição" pedem confirmação; "Publicar arquivo" põe carimbo no nome (o Storage sobrescreve o mesmo caminho — `upsert`), reaproveitando o caminho só no reenvio de um envio que já subiu; "Publicar a casa" avisa que o combo no ar SAI; Biblioteca esvazia a lista ao trocar de pasta; a coluna "Completas" da Visão geral marca a casa encerrada. ⚠️ Fica de fora, por decisão: Realtime segue reconectando a cada 10 s no pior caso (recuo máximo), 401 em uso segue encerrando a sessão sem 2ª tentativa, horário do combo que passa da meia-noite segue recusado, `aria-live` do indicador de sincronização anuncia cada troca de estado.
- **Campanhas, checklist e lembretes — 21/10/2026** (spec `docs/superpowers/specs/2026-10-21-social-campanhas-checklist-lembretes-design.md`, plano `docs/superpowers/plans/…`). Três migrations aditivas, todas ✅ aplicadas, cada uma com teste de banco que termina em `TESTE_OK` (`supabase/testes/social-campanhas.sql`, `social-checklist.sql`, `social-lembretes.sql`) e teste de Node (`tests/painel-app-campanhas.test.mjs`, `painel-app-checklist.test.mjs`); o cenário de tela está em `tests/painel-social-aprovacao-navegador.mjs`.
  - **Campanhas** (`20261031_social_campanhas.sql`, `lib/campanhas.js`, aba `#social/campanhas` em `SocialCampanhas.jsx`, `FormularioCampanha.jsx`). Uma campanha por postagem (`redes_posts.campanha_id`, vazio = nenhuma). Tem nome (≤60, único entre as ativas sem diferenciar maiúscula), cor da MESMA paleta da pasta (`CORES_PASTA` = o CHECK do banco; o teste compara), descrição, período, meta e `arquivada` — nunca se apaga. `redes.editar` cria/edita/arquiva; `redes.ver` lê. `redes_campanhas_listar` devolve `n_total` (sem canceladas), `n_publicadas`, `n_abertas`, `n_atrasadas`; progresso = "12 de 20 publicadas" (com meta) ou "12 publicadas de 18 planejadas". Campanha arquivada não pode ser ESCOLHIDA (`campanha_invalida`), mas a postagem que já a tem continua com ela. Trocar de campanha entra no histórico (`conteudo` › `campanha`) e NÃO desfaz aprovação (fora da tupla de `redes_rever_etapa`). O campo "Edição ou campanha" virou "Edição" (é só a edição). Cartão: ponto colorido + nome curto; filtro `camp` no endereço; "Ver no calendário" abre o mês do início já filtrado. ⚠️ `redes_json` agora é recriado em DUAS migrations (campanha, depois checklist): quem mexer nele parte da definição viva do banco.
  - **Checklist** (`20261101_social_checklist.sql`, `lib/checklist.js`, `ChecklistPostagem.jsx`). AVISA, não trava (decisão do Wilker). `redes_checklist_modelos` (itens por formato, o administrador `redes.gerir` edita na folha "Checklist padrão") e `redes_checklist_itens` (cópia por postagem: feito, quem, quando). A postagem recebe a cópia ao ser criada/duplicada; postagem antiga recebe na primeira abertura por quem edita (`redes_checklist_garantir`, uma vez por abertura); mudar o formato ou o modelo depois NÃO mexe nos itens que já existem. Marcar/acrescentar/remover NÃO sobe a `versao`, não toca `atualizado_em` e não desfaz aprovação. ⛔ **Nada se apaga:** remover item e substituir o modelo de um formato são `removido_em` (a migration não tem `delete from`; o painel recusou aplicar uma versão com `delete`). Quem tirou TODOS os itens de propósito não os recebe de volta. "Enviar para aprovação" com item aberto pergunta ("Falta 1 item do checklist: … Enviar mesmo assim?") e deixa seguir. Cartão mostra "3/5" em postagem aberta.
  - **Lembretes** (`20261102_social_lembretes.sql` + `20261103_social_lembretes_cron.sql`). `redes_lembretes(p_agora)` roda no `pg_cron` a cada 10 min (job `scw-redes-lembretes`; desligar: `select cron.unschedule('scw-redes-lembretes')`) e fica quieto fora de **07h–22h de Fortaleza**. Quatro lembretes, cada um sino + push (pelo `avisar_pessoa`): **resumo do dia** (a partir das 08h, um por pessoa e dia, "N postagens para hoje · M atrasadas"); **1 h antes sem aprovação** (rascunho/aguardando: responsável + quem aprova); **passou 30 min do horário sem confirmar** (até 24 h: responsável, + quem aprova se não está aprovada); **faltando arte/legenda a 2 dias** (a partir das 08h). Sem responsável → quem criou. `redes_lembretes_enviados` (tipo, postagem, chave, pessoa) impede repetir; a chave é o horário PROGRAMADO, então reagendar libera aviso novo. Só o `pg_cron`/dono executam (`revoke` de `public`, `anon`, `authenticated`); o teste simula o relógio com `p_agora`. ⚠️ Nem todo aviso chega ao celular: o push só sai quando `admin_config.push_pessoal` está ligado e o aparelho está inscrito. Fora do lote: modelos de legenda/hashtags, duplicar com recorrência, visão por perfil/formato, desligar lembrete por pessoa.
- **Baixar e salvar** (17/10/2026, `components/vistas/BaixarArquivo.jsx` + `lib/entrega.js`): igual na Biblioteca e na
  ficha. "Baixar" busca o ORIGINAL (nunca a miniatura; nome, formato, resolução e transparência intactos), assina a URL
  na hora e, vencida, assina de novo uma vez; entrega por download direto na mesma aba (antes buckets que não eram
  `redes` abriam aba nova). Vários = UM ZIP sem compressão (`zipArmazenado`, CRC lido em pedaços), nunca downloads
  soltos; limites em `LIMITES` (ZIP 60 arquivos / 300 MB, 100 MB no celular). "Salvar ou compartilhar" só aparece com
  `navigator.canShare({ files })`: compartilha o ARQUIVO (nunca URL privada), até 10 / 60 MB; toque expirado →
  "Abrir opções para salvar" (um toque novo); cancelar = "Cancelado. Nada foi baixado." (sem download automático).
  ⛔ A tela nunca diz "salvo no aparelho" nem que foi para Fotos: diz "download iniciado" / "opções usadas".
  Carrossel sai numerado na ordem da postagem (`01-…`). Sem Web Share no celular: "Baixar" + orientação curta.
- **Participantes** (`editorial_*`): ficha EDITORIAL do mesmo registro, lida por `montar_publico` (a lista fechada de
  campos públicos — sem telefone, e-mail, CNPJ, custos, pagamento) + versão publicada (`publicacoes` vigente) + fotos,
  unidades, postagens ligadas e histórico com autor. "Criar postagem com a descrição" COPIA o texto na hora
  (sessionStorage `scw_social_nova_postagem`): a legenda nasce independente do combo.
- **Matriz de campos do combo** (Social media, `editorial.editar`, `editorial_salvar`):

  | Campo | Social media | Observação |
  |---|---|---|
  | `combo_nome` (≤80) | edita | aprovado → `alterado_apos_aprovacao`; o site não muda |
  | `combo_descricao` (≤400) | edita | idem |
  | `combo_proposta` (≤2000) | edita | não é pública |
  | componente `nome` (≤80) / `descricao` (≤400) | edita | só da mesma participação |
  | `combo_condicoes`, preço (`edicoes.valor_combo`), custos | ⛔ | comercial/edição |
  | tema, ingredientes, declarações alimentares, trocas | ⛔ | da marca e da curadoria |
  | status, revisão, publicação no site | ⛔ | `curadoria.decidir` |

  Trava: manda os valores LIDOS (`p_esperado`); se mudou no banco (a marca salvou) → `versao_desatualizada`, nada
  sobrescrito, e a tela compara e deixa decidir. Auditoria `combo.editorial` campo a campo (de/para, autor da sessão).
  A curadoria (`curadoria.decidir`) recebe "Combo editado", agrupado.
- **Matriz de permissões:**

  | Ação | Administrador | Social media | Outras funções |
  |---|---|---|---|
  | `redes.ver` — planejamento, fichas, biblioteca, baixar | ✓ | ✓ | — |
  | `redes.editar` — criar, editar, legenda, horário, responsável, duplicar, comentar, pedir ajuste, enviar para aprovação, cancelar a PRÓPRIA antes de aprovada | ✓ | ✓ | — |
  | `redes.aprovar` — aprovar (e pedir ajuste do que aguarda aprovação) | ✓ | — | — |
  | `redes.arquivos` — enviar à postagem, ordenar, texto alternativo, associar; substituir/remover o PRÓPRIO | ✓ | ✓ | — |
  | `redes.publicar` — confirmar a publicação | ✓ | ✓ | — |
  | `redes.gerir` — cancelar, reabrir, desfazer/corrigir execução, arte da biblioteca, mexer em arte alheia | ✓ | — | — |
  | `editorial.ler` / `editorial.editar` | ✓ | ✓ | — |
  | `dado.ler`, `acesso.gerir`, `cadastro.editar`, `curadoria.decidir`, `pagamento.gerir`, `relatorio.ler`, `edicao.gerir` | ✓ | — | conforme a função |

- Situação gravada: rascunho · aprovacao · pronto (= Aprovado) · publicado · cancelado (+ `preparacao` legado);
  **atrasada é calculada**; só `redes_confirmar` publica (data e hora reais, link opcional, Story sem link, uma
  confirmação para a sequência). Enviar para aprovação e aprovar exigem as pendências do formato (`redes_pendencias` =
  `pendencias()` em `lib/redes.js`); perder um requisito devolve para rascunho, com registro. `redes_salvar` recebe a `versao` lida e só as chaves mudadas; o não salvo
  fica em `sessionStorage` (`scw_redes_rascunho_<id>`). "Salvo às…" só depois da resposta. Fuso America/Fortaleza fixo
  (teste com TZ de Tóquio e Los Angeles). Conflito de horário = mesmo perfil a < 30 min: avisa, não bloqueia.
- **Avisos** (`redes_avisar` → `avisar_pessoa`): por PESSOA — responsável e quem criou, nunca quem fez; "atribuído" vai
  só ao novo responsável. Eventos: atribuído · arte adicionada/substituída · legenda · horário · pedido de ajuste ·
  comentário · pronto · cancelado · publicado · combo editado (curadoria). Link `social/planejamento/<id>`. Agrupa: mesmo
  autor, mesmo assunto, não lido, 30 min → atualiza o aviso (`n_agrupadas`, "3 alterações"). Gravado na MESMA transação
  da mudança (se a gravação falha, não há aviso). Push: ver a ordem segura acima; `push_destinos` manda o pessoal só aos
  aparelhos do destinatário e o geral só a quem pode ler o tipo; a trava `push_enviado_em` e a tag por aviso evitam
  duplicar; falha de push não desfaz nada. ⛔ Lembrete com o painel fechado NÃO existe (não há agendador).
- 🐛 Esc numa folha que pergunta antes de fechar: a pergunta aberta DURANTE a tecla era cancelada pelo próprio Esc.
  `fechar()` espera a tecla terminar (ficha da postagem e ficha editorial). Outras folhas podem ter o mesmo defeito.
- 🐛 Campo envolvendo `<textarea>` no `<label>`: o texto digitado entra no nome acessível. Rótulo por `htmlFor`.
- 🐛 Endereço traduzido (link antigo, módulo sem permissão) mostrava a tela nova com o endereço velho na barra: o
  `hashchange` do PainelShell agora corrige com `replaceState`.
- Testes: `tests/painel-app-redes.test.mjs` e `tests/painel-app-equipe.test.mjs` (em `test:organizacao`).

