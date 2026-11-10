<!-- Parte das regras do projeto. Índice: painel-app/CLAUDE.md. Movido sem reescrita de painel-app/CLAUDE.md em 10/11/2026. -->

#### Cartoon 2026.2 — organização (14/10/2026)

Plano: `docs/cartoon-2026-2/04-painel.md` §4.4–4.5 e `02-arquitetura-rotas-fases.md`
§2.6–2.8. Contrato: migrations `20261014_cartoon_02_publicacao.sql` e `_03_revisao.sql`
(e `_04_avaliacao.sql` para o resumo). O que passou a valer:

- **Publicação é dimensão separada da revisão.** `status.js` ganhou `publicacao`
  (não publicada · publicada · retirada · alteração em análise — derivado, não CHECK),
  `midia` e `fase_edicao` (CHECKs, conferidos no teste de status). Toda a lógica pura
  (diferença vigente × atual, tradução das pendências, espelho dos CHECKs de
  `edicao_publicacao`, fuso de Fortaleza, coordenada de Natal, erros) mora em
  `lib/publicacao.js`, testada em `tests/painel-app-publicacao.test.mjs`.
- **Participantes › Publicação** (`vistas/Publicacao.jsx`, `ListaPublicacao`): uma linha
  por casa (`get_publicacoes_edicao`), filtro no endereço (`situacao`); abre a ficha na
  aba **Publicação** (`AbaPublicacao`): publicar a casa / casa e combo
  (`publicar_participacao`, `curadoria.decidir`), retirar com motivo, pendências
  traduzidas, diferença campo a campo, prévia, endereço público (só antes da 1ª
  publicação, `cadastro.editar`), coordenada conferida (`producao.gerir`) e fotos
  (aprovar exige texto alternativo).
- **Prévia = o componente do site.** `vistas/edicao/PreviaPublica.jsx` importa
  `FichaParticipante` e `scw-cartoon.css` por `React.lazy`. ⚠️ Fica numa pasta
  `edicao/` de propósito: `tests/rotas-edicao.test.mjs` reprova o estilo da edição fora
  de pasta de edição. ⛔ Não escrever as classes da edição em `edicao-org.css`.
- **Edição › Publicação no site** (`vistas/PublicacaoEdicao.jsx`, `ChavesEdicao`): fase,
  as 4 chaves e a janela da avaliação (`definir_publicacao_edicao`, `edicao.gerir`).
  O botão desliga com o motivo quando a mudança violaria um CHECK; ligar pede
  confirmação; desligar não. **Edição › Avaliações** (`relatorio.ler`): números por
  casa, nenhum dado pessoal.
- ⚠️ **Foto oficial ainda não sobe**: `arquivo-url` só aceita os buckets `arquivos`,
  `combos` e `logos` e caminho `<pasta>/<arquivo>`. A tela já envia
  `{ bucket: 'edicao-publico', path: '<edição>/<participação>/<uuid>.webp' }`; falta a
  função aceitar esse bucket e esse formato de caminho (subir com `producao.gerir`,
  sem `upsert`). Até lá a tela mostra o erro traduzido.

#### Cadastro da marca na camada de edição (Cartoon 2026.2) — 14/10/2026 (fase 3, lado da marca)

Plano: `docs/cartoon-2026-2/04-painel.md` §4.2–4.4. Contrato do banco: migrations
`20261014_cartoon_01..03` (⚠️ **ainda não aplicadas** — o código as segue à letra; sem elas
o cadastro abre e os blocos novos dizem "Esta etapa abre quando…", por `seFaltar` na
leitura de `unidades`). O que passou a valer:

- **Blocos 0 a 7, as duas abas do mesmo `Cadastro.jsx`:** Meu cadastro = 0 marca · 4
  unidades · 6 atendimento e horário no festival (· 7 fotos, sem tela aqui); Meu combo = 1
  tema · 2 itens · 3 combo · 5 informações alimentares e trocas. `vistaDoBloco` (guia.js)
  espelha `link_campo_marca`; os blocos 5 e 6 entram na aba certa sem o `App.jsx` listá-los.
- **Peças em `components/vistas-marca/edicao/`** (Unidades, Atendimento, Alimentar, Envio,
  campos) e **lógica pura em `lib/edicaoMarca.js`** (teste `painel-app-edicao-marca`).
  Estilo em `styles/edicao-marca.css` (prefixo `em-`).
- **Unidade = duas linhas:** `unidades` (permanente: endereço estruturado e o **WhatsApp da
  loja** — um por unidade; preenchido = vai para o site, sem caixa de autorização; a tela grava
  `whatsapp_autorizado` junto do número, e número antigo sem autorização só vai quando a marca
  salva a unidade, 23/10/2026; o contato PESSOAL do responsável é outro dado e segue privado)
  + `participacao_unidades` (`participa`, modos em
  três estados, canais, regiões, taxa, observação). Nova = POST `unidades` → POST
  `participacao_unidades` com `unidade_id`. Unidade de outra edição aparece como **sugestão**
  ("Usar nesta edição"), nunca copiada sozinha. `endereco`/`bairro`/`faz_delivery` da
  participação seguem preenchidos como **espelho** para quem ainda os lê. ⛔ A marca não
  grava `lat/lng` e, desde 28/10/2026, também não vê nada do mapa (ver "Endereço completo e fila de localizações").
- **Horário no festival** (`participacao_unidades.horario_festival`, jsonb `[{data, abre, fecha}]`;
  23/10/2026, pedido do Wilker: UMA pergunta — como a unidade funciona em cada dia do festival —, sem
  "horário da loja" × "horário do combo" nem horário comercial): até 2 períodos por dia, `24:00` =
  meia-noite (só em `fecha`), horas de 05:00 a 23:30 de meia em meia hora, **dia sem período = não abre**,
  **`[]` = ainda não respondido** (pendência `unidade:<id>:horario`). O banco valida em qualquer gravação
  (gatilho `horario_festival_validar`; erros `horario_invalido`/`data_fora_do_festival`, traduzidos em
  `traduzirErro`). Migrations `20261107_horario_festival*.sql` (✅ aplicadas; teste
  `supabase/testes/horario-festival.sql`; reversão em `supabase/reverter/`). Seletor ÚNICO
  `components/HorarioFestival.jsx` (+ `styles/horario-festival.css`), usado na marca e na ficha da equipe, e — em
  cópia ES5 com teste de paridade — em `/preencher`; a regra mora em `src/edicao/dados/horarioFestival.js`
  (`painel-app/src/lib/horarioFestival.js` só reexporta): "Igual todos os dias" · "Muda conforme o dia"
  (Segunda a sexta · Sábado · Domingo → "Detalhar dia a dia"), Abre/Não abre, "Das … às …", "Incluir
  intervalo", resumo vivo "Fica assim"/"Falta responder". O seletor guarda o RASCUNHO e só entrega `linhas`
  quando está COMPLETO (`onChange({ linhas, completo, faltando })`; incompleto = `linhas: null`, e quem usa NÃO
  mexe em `valor`: mexer em `valor` de fora é o que refaz o rascunho). **Marca:** `Cadastro.jsx` grava por PATCH
  em `participacao_unidades`, só horário completo e diferente da base (comparação por
  `linhasCanonicas`/`mesmasLinhas` — o jsonb volta com as chaves em outra ordem); ⚠️ o INSERT de
  `participacao_unidades` NÃO tem grant da coluna (vai sem ela e o PATCH vem em seguida); rascunho incompleto fica
  em `_horarioPendente` (nunca vai ao banco nem à mesclagem) e o salvamento diz "O horário de X não foi salvo:
  falta responder …"; "Ver como" desabilita o seletor. **Equipe:** `HorarioDaUnidade` (`vistas/FichaCadastro.jsx`),
  "Salvar horário" próprio por `org_salvar_horario_unidade` (`cadastro.editar`, auditoria antes/depois; domínios
  `['unidades','participantes']`). O texto antigo (`participacao_unidades.horarios`) só aparece como "Hoje está: …"
  até a marca confirmar; `unidades.horario_loja_texto` e a tabela `unidade_disponibilidade` ficaram SEM USO
  (legado só de leitura; nada novo lê nem grava). **Frases:** `frasesDeLinhas(linhas, datas)` (módulo) é a ÚNICA função que
  transforma linhas em texto (painel `textoHorarioFestival`, site `horarioNoFestival`, prévia, diff de publicação,
  `resumoDeLinhas`): com as datas da edição e ao menos uma linha dentro delas, o resumo completo; SEM elas (o Social media não lê
  a edição) só do primeiro ao último dia citado, dia a dia, e nunca "todos os dias". As telas da equipe que não recebem a edição
  leem as datas por `useDatasDoFestival(codigo)` (`lib/festivalReact.js`: `datas`, `periodo`, `carregando`, `falhou`,
  `tentarDeNovo`). **Seletor:** a releitura que traz o MESMO horário numa lista nova NÃO refaz o rascunho (`aoMudarValor`:
  `servidor` = último valor de fora, `conhecido` = último que a tela avisou); "Igual todos os dias" com horários diferentes pede
  confirmação (`Confirmar`) e usa o estado de DEPOIS do diálogo; "Hoje está: …" fica até o horário estar completo; sem hora depois
  de "meia-noite" (a grade vai a 24:00; o apoio diz "Fecha depois da meia-noite? Escolha “meia-noite”"); "Incluir intervalo" não
  aparece quando o 1º período fecha em 24:00; o foco vai ao select só em clique de ponteiro. **Marca:** horário incompleto é
  trabalho pela metade (`registrarPendencia('cadastro-horario')`: atualizar versão, convite e fechar a aba perguntam); o
  Atendimento/canais/horário NÃO publicam o WhatsApp antigo (`editarUnidade(u, m, { liberaLegado: false })`: o aviso "este número
  vai para o site" só existe no bloco 4); cadastro que já estava completo antes desta leva é concluído sozinho ao abrir
  (`ConcluirSozinho` → `concluirSeFaltar`: lê o servidor e chama `marca_concluir_cadastro` só se ainda em preenchimento — em
  23/10/2026 eram 7 marcas); `situacaoDaMarca` com a organização e `faltam > 0` diz "A organização está conferindo · falta informação".
  Teste de navegador: `node tests/painel-horario-navegador.mjs` (de dentro de `tests/`; H1–H6 no Cadastro real, backend falso).
- **Declarações alimentares:** linha ausente = não respondido, **nunca** "não contém"; a
  tela nunca pré-marca. Grava por PATCH no `id` ou POST (o `on_conflict` do PostgREST não
  usa o índice único parcial). "Outro" sem dizer qual não grava (check do banco).
- **Trocas** (`substituicoes`): acréscimo vazio = não informado, `0` = sem custo;
  modalidades/unidades vazias = todas.
- **Legado que deixou de ser escrito:** selos vegano/sem glúten/sem lactose e a
  substituição em texto dos itens; vegano/diet/"sobre o delivery" do combo. "Para viagem"
  fica (decide o custo da embalagem).
- **"Faltam N informações para completar o cadastro"** (era "…itens para enviar") = campos
  obrigatórios (menos a logo) + `pendenciasEdicao`, espelho de `pendencias_publicacao` (mesmos
  códigos; o teste confere a lista de alergênicos contra o SQL). A leitura traduz os códigos
  novos (`unidade:<id>:…`, `item:<n>:alimentar`) com o NOME da unidade e leva ao campo (ids
  `campo-unidade-endereco`, `-2`, `-3`…).
- **A prévia "Ver como fica no site" saiu do cadastro** (23/10/2026, pedido do Wilker; `FichaPrevia.jsx`
  apagado). Fica o link "Ver a página no site" para a página já publicada; a prévia da EQUIPE
  (`Publicacao`/`PreviaPublica.jsx`) não mudou.
- **Publicação ≠ revisão:** `marca_minha_publicacao` dá a linha "Sua página está publicada
  (versão N)" com o link; `alterado_apos_aprovacao` mostra "Alterações salvas · a organização vai
  atualizar o site". A marca nunca publica.
- ⚠️ Ficou de fora: tela de fotos do bloco 7, declarações da alternativa de uma troca,
  seletor de edição com duas participações abertas, e o Início (`resumoMarca`) ainda não
  conta as pendências da camada de edição — só a barra do próprio cadastro.

#### Tudo que o site mostra se edita no painel — 09/11/2026 (pedido do Wilker)
Regra: **campo exibido na página pública do participante tem que ter input no painel (marca e/ou equipe) e gravar a coluna que
`montar_publico_base` lê.** Auditoria achou e fechou (migration `20270116_equipe_edita_o_que_o_site_mostra.sql`, ✅ aplicada;
teste `supabase/testes/equipe-edita-site.sql` → `TESTE_OK`; reversão em `supabase/reverter/`):
- **Ingredientes** voltaram a ser editáveis (marca em Meu combo; equipe na ficha) — saíram do formulário em 19/10 e o site seguiu exibindo.
- **Informações alimentares e trocas pela equipe** (`vistas/AlimentarEquipe.jsx`, o mesmo `<Alimentar>` da marca): `org_salvar_alimentar`
  grava `declaracoes_alimentares` e `substituicoes`; lê por `get_alimentar_participacao`. ⛔ Os selos legados (`vegano`, `sem_gluten`,
  `sem_lactose`, `tem_substituicao`, `substituicao` em `participantes_itens`) saíram da ficha: o site não os lê.
- **Unidade pela equipe** (`org_salvar_unidade_site`): nome, endereço completo, WhatsApp da loja (preenchido = autorizado) e atendimento
  (modos, delivery, taxa, regiões, observação, `faz_delivery`); o espelho `participacao_unidades.endereco/bairro` acompanha. A ficha
  (`get_ficha_participacao`) traz a permanente em `unidade._un`. **Apresentação da casa** (`org_salvar_participante`) e **texto do combo**
  (nome, descrição, condições, por `org_salvar_dados_publicos`) também têm campo na ficha.
- **Marca:** taxa/regiões/canais de delivery aparecem também com `faz_delivery` (ligado pela equipe); responder o delivery do combo
  "sim/não" liga/desliga `faz_delivery` junto (`Atendimento.jsx`).
- ⚠️ Fora do painel ainda: `casa.logo_desenhada` (herdada da publicação anterior, vem de `scripts/edicao/logos-desenhadas.py`) e o foco da foto
  (`foco_x/y`, sem uso no site).

#### Ficha geral do participante — 15/10/2026 (pedido do Wilker)

Clicar no participante abre a **Visão do participante**: tudo o que foi preenchido, numa
página só, para LER. As dez abas (Resumo, Cadastro, Combo, Unidades, Operação, Publicação,
Mensagens, Trajetória, Acesso, Histórico) viraram **quatro vistas**: Visão do participante ·
Comunicação · Histórico · Gestão. ⛔ Não recriar aba por assunto nem o "Resumo" de cards-atalho.

- **Composição pura em `lib/fichaGeral.js`** (teste `painel-app-ficha-geral`). Quatro
  LEITURAS, estado próprio por fonte (carregando · ok · erro · sem_permissao ·
  sem_participacao): `get_ficha_360` (já contém `get_ficha_participacao` — não pedir os
  dois), `get_publicacao` (camada Cartoon: `montar_publico` com alergênicos, trocas,
  unidades e horários; fotos; versão no ar), `get_correcoes`, `get_edicoes` (tema GERAL da
  edição). `criarCarregadorFicha` descarta resposta velha ao trocar de marca; o hook
  `useFichaGeral` (`vistas/FichaVisao.jsx`) guarda de qual participação é o estado.
  ⛔ Abrir a visão não grava nada: a conversa (`ler_mensagens_org`) só monta em Comunicação
  (o teste confere).
- **Regras de leitura que não se negociam:** declaração ausente = "Sem resposta", nunca
  "não contém"; "não sei" gravado ≠ sem resposta; leite (alergênico) ≠ lactose
  (característica); selos vegano/sem glúten/sem lactose e substituição em texto saem como
  "cadastro anterior, não confirmado"; custo/acréscimo vazio = não informado, `0` = sem
  custo; preço da edição (`edicoes.valor_combo`) separado dos custos da marca; foto
  recebida ≠ aprovada ≠ publicada (está no `vigente.conteudo`); papel da foto é o gravado.
  Tema: `tema_combo` × `temas_propostos` — quando discordam a ficha diz ("mudou depois da
  última proposta"), não escolhe um.
- **Pendências** (`pendenciasDaFicha`): uma por chave estável (a mesma falta de duas
  fontes conta uma vez); campos vazios agrupados por seção; fonte com erro vira "não
  consegui verificar", nunca "nada pendente". Cada item leva à seção.
- **Editar = o editor de sempre, no lugar da seção** (`EdicaoNaSecao` em
  `FichaMarcaPagina.jsx`): `AbaCadastroMarca`, `AbaCombo`, `AbaUnidades`, `AbaOperacao`,
  `AbaPublicacao`, `ConferirLocalizacao` e `RevisarFotos` (exportados de `Publicacao.jsx`).
  Formulário com digitação não enviada pergunta antes de sair (e `beforeunload`).
  Concluir recarrega as fontes. Ações por função em `acoesDaSecao` — o banco decide de novo.
- **Endereço:** `sub` vazio = visão; seção = âncora (`sub=unidades`, gravado sem empilhar);
  `comunicacao`/`historico`/`gestao`. Os `sub` antigos são traduzidos em
  `lib/rota.js` (`destinoNaFicha`): mensagens → Comunicação, acesso → Gestão, trajetoria →
  Histórico (âncora), cadastro/combo/tema/unidades/operacao/publicacao → seção da visão.
- **Lista de Marcas:** busca no endereço (`busca`), clique abre sempre a visão, posição da
  lista volta ao fechar a ficha (`.og-vista` é quem rola).
- **Logo no cabeçalho da ficha é `contain`** (logo inteira, pedido de 15/10/2026) — exceção
  local ao `cover` de `.ui-logo`, só em `.fg-logo`.
- ⚠️ Ficou de fora (lacuna de backend/UI, nada alterado no banco): a organização não edita
  pelo painel os campos da camada Cartoon (nome/descrição/condições do combo — o RPC
  `org_salvar_dados_publicos` aceita, falta a tela —, declarações alimentares, trocas,
  unidade permanente e modos) — quem preenche é a marca. ✅ O **horário no festival a equipe EDITA** (23/10/2026): card da
  unidade em Editar unidades › "Editar horário" (`HorarioDaUnidade`, o mesmo seletor, `org_salvar_horario_unidade`). O WhatsApp
  de unidade com `whatsapp_autorizado = false` (cópia antiga da página) não chega à organização (`montar_publico` só devolve o autorizado); pagamento aparece na visão só para
  `pagamento.gerir`, mas `get_ficha_360` entrega `pagamento_status` a qualquer `dado.ler`
  (restringir é migration). Voltar do navegador com editor sujo não pergunta (só os botões).

#### Início e formulário da marca mais claros — 22/10/2026 (revisão de organização e usabilidade)
Pedido do Wilker com o painel indo para os participantes. Só interface: nenhuma RPC, tabela ou validação mudou (o servidor segue
autoridade do envio). Análise em três frentes (UX, frontend, QA) + revisão independente de 3 lentes com cético por achado; os 20
achados confirmados estão corrigidos e cobertos por teste.
- **Uma leitura, um vocabulário de cadastro** (`lib/guia.js › resumoMarca`): `envio = { faltam, itens, pronto, conhecido }` (23/10/2026:
  sem `podeEnviar` — a marca não envia mais; ver "A marca só salva" abaixo).
  - O Início passou a ler o que a camada de edição exige (`marca_previa_publica().faltando`, em `useResumoMarca`, junto com
    `marca_minha_publicacao`); `conhecido: false` = o banco ainda não tem a leitura → não se afirma nada sobre isso. ⛔ Falha
    de leitura nunca vira "tudo pronto".
  - **Não existe mais "enviar" (23/10/2026):** `resumoMarca` não tem `podeEnviar` nem a pendência `enviar`. Combo `aprovado` com
    `alterado_apos_aprovacao` é vez da organização ("Alterações salvas · a organização vai atualizar o site"); `correcao_solicitada`
    fica aberta até a equipe decidir ("Corrigir agora"). A logo não trava a conclusão (conta no %, não em `envio`).
  - A mesma falta de endereço (campo básico × `unidade:<id>:endereco`/`sem_unidade` do servidor) conta UMA vez, e vale a do servidor
    (aponta a unidade certa). ⚠️ `participacao_unidades` é lida COM `order=ordem` no resumo — o id do campo (`…-endereco-2`) é a
    posição; sem a ordem o link cai na unidade errada (teste reprova).
  - `%` = **"dos dados básicos"** (campos obrigatórios de `campos_cadastro`, com a logo), nunca "concluído": o alcance está escrito em
    todo lugar (cabeçalho, Início, formulário); o que falta para COMPLETAR é a linha "Faltam N informações para completar o cadastro" (`envio`).
  - `etapas[].detalhe` = frase pronta ("aguardando liberação da organização", "em análise pela organização"…): nunca só "falta".
  - `proxima.critica` (mesma referência da pendência): correção > pedido importante ou com prazo ≤ `PRAZO_URGENTE_DIAS` (3) ou vencido >
    campo. `agruparPendencias` reúne por assunto (Meu cadastro, Meu combo, Fotos, Solicitações, Documentos) sem perder nem
    repetir; `qtd` conta arquivos/fotos para ler na aba.
- **Início** (`vistas-marca/Hoje.jsx` + `hoje/*.jsx` + `lib/inicioMarca.js`, estilo `styles/inicio-marca.css`, prefixo `im-`): identificação
  compacta (só ≤900px; no computador o topo já identifica) → **O que fazer agora** → pendências por assunto → acompanhamento →
  comunicação e prazos → materiais e história. Decisões:
  - mensagem nova só é o destaque se NÃO houver ação crítica (nem cadastro pendente com o prazo de preenchimento do cronograma em até
    3 dias — `prazoDoCadastro`); senão fica logo abaixo;
  - sem tarefa, diz o que está com a organização ("Aguardando a organização") — ou "Falta lançar os combos de hoje" durante o
    festival, ou "A edição terminou"; depois do festival não se espera sessão de fotos;
  - "Seu preenchimento" (selo **Preenchido**, neutro) é separado de "Com a organização" (tema, combo, fotos, página: **Concluído** só
    aqui) — tema aprovado ≠ combo aprovado ≠ página publicada;
  - durante o festival "Combos vendidos" sobe logo abaixo do destaque; os blocos têm `key` própria, então mudar a ordem MOVE e não
    remonta (o digitado nas vendas fica). Antes do festival a venda não aparece.
  - `dataBr`: instante com hora (prazo de pedido, UTC) vira data LOCAL; dia puro (`AAAA-MM-DD`) fica como veio.
- **Formulário** (`Cadastro.jsx` + `edicao/*` + `lib/edicaoMarca.js`, `edicao-marca.css`): numeração visível LOCAL por aba (Meu cadastro 1–3,
  Meu combo 1–4; os ids `bloco-N`/`data-bloco`/`campo-*` e os links gravados NÃO mudaram); cabeçalho do bloco = um `<button>` com título,
  estado em ícone+texto (`estadoDoBloco`: o tema segue `temas_propostos`, não o combo) e, recolhido, o resumo; salvamento:
  `rotuloSalvamento` ("Salvando…" fora do leitor de tela, "Alterações salvas" só depois da resposta do servidor, erro numa voz só),
  a nota "Tudo o que você salva chega para a organização, que atualiza o site." e **UM botão "Salvar" no fim** (o último bloco não
  tem "Continuar", para não haver dois "Salvar" colados); faltando algo, a linha "Faltam N informações para completar o cadastro" com
  "Ir para o que falta" (`faltasDoCadastro`, cada falta leva ao campo mesmo na outra aba); "Continuar" só navega e põe o foco no cabeçalho do próximo bloco;
  alimentar por item com progresso ("5 de 8 alergênicos"), item com correção abre sozinho; ausência de resposta NUNCA vira "não contém".
  ⚠️ A barra presa `.mc-resumo` mede ~117–144px no celular de 360px: `scroll-margin-top` dos blocos e a altura reservada da linha de
  salvamento estão em `edicao-marca.css` (medido, não calculado).
- **Arquivos**: o botão só grava `arquivo_leitura` → "Li e confirmo a leitura" / "Conferi as fotos" (nunca "de acordo": não é aceite formal).
- **Convite do aparelho — 23/10/2026 (decisão do Wilker; revoga a regra da "2ª visita" de 22/10):** o convite de instalar/ligar avisos
  (`ConviteAparelho`) abre **já na 1ª visita**, 2,5 s depois de o tour fechar (`liberado={!tour.aberto}`), e de novo no app instalado enquanto os
  avisos estiverem desligados. "Agora não" adia 7 dias, **separado para o navegador e para o app** (chave `conta` × `conta-app`: dispensar no
  navegador não cala o app aberto pelo ícone sem avisos). `contarVisita` ficou sem uso (só um teste a cobre; apagar junto com ele).
  ⚠️ Aviso de atualização continua com prioridade própria (`telaOcupada`).
- **Fotos, Arquivos e Solicitações da marca** (mesma rodada, 22/10/2026; só interface, sem RPC/tabela nova — tudo cabe na lista do "Ver como"):
  - **Fotos** (`vistas-marca/Fotos.jsx` + `fotos/*.jsx` + `lib/fotosMarca.js` + `fotos-marca.css`, prefixo `fm-`): três blocos — agendamento, preparação
    (link para o Guia de fotos, sem duplicar conteúdo) e fotos oficiais. Sessão marcada mostra dia da semana + data, hora e local ("a organização ainda
    vai confirmar" se faltar, nunca inventa); vagas agrupadas por dia, hora no fuso de quem abre; estados em palavras+ícone (aguardando liberação · sem
    horários · escolha um horário · agendada · remarcada · realizada). Reservar pede confirmação (a marca não desfaz sozinha); vaga tomada por outra marca
    diz "Esse horário acabou de ser escolhido por outra marca" e relê as vagas. Miniaturas das fotos oficiais usam as URLs assinadas que o código já
    obtinha (carregamento preguiçoso; falha numa miniatura não derruba a lista). **Baixar todas (ZIP) e "Salvar ou compartilhar"** (23/10/2026, com 2 ou mais fotos
    oficiais): o MESMO `useEntrega` da equipe (`vistas/BaixarArquivo.jsx`), com `obter = obterArquivoMarca` (`marcaApi.js`: assina por
    `assinarDownload` — no "Ver como", pela organização — e busca os bytes na hora; rede caída = `rede`, resposta ruim = `download_<status>`).
    O `rotuloBaixar` de quem chama vira o nome acessível do botão (efeito colateral: "Baixar as N (ZIP)" da ficha da postagem perdeu o aria-label
    longo). `useEntrega({ obter, quem })`: `quem: 'marca'` troca "escolha menos arquivos" por "baixe uma de cada vez" (a marca não escolhe o conjunto) e o
    erro de sessão por "entre de novo"; o erro diz QUAL arquivo falhou; "Cancelar" aparece enquanto prepara (`AbortController` por conjunto: nada é
    entregue depois de cancelar); o nome final do arquivo só existe depois do download, então repetidos ("Foto" e "Foto.jpg") são renomeados com
    `nomeLivre` antes de entrar no ZIP; no iPhone/iPad, sem toque ativo depois da espera, mostra "Baixar agora" (um toque novo) em vez de dizer
    "download iniciado" sem ter baixado; o resultado leva o foco. ⚠️ O ZIP no navegador da marca não foi visto num iPhone real (memória).
  - **Arquivos** (`Arquivos.jsx` + `arquivos/ItemArquivo.jsx` + `lib/arquivosMarca.js` + `arquivos-marca.css`, `am-`): os que exigem leitura e não foram lidos
    sobem num bloco "Para ler e confirmar"; "Novo" = publicado há até 7 dias (o banco não guarda quem abriu o quê). Formato, tamanho e versão só quando o
    dado existe. **Abrir × Baixar**: "Abrir" só para PDF/imagem/MP4 (nova aba); "Baixar" sempre (link assinado com `download`); uma nota diz o que acontece
    no iPhone/Android/computador e a tela nunca diz "salvo". Leitura que falha ao ler = "Confirmação não verificada", nunca "pendente". ⚠️ Arquivo
    SUBSTITUÍDO depois da leitura volta a pedir a confirmação (23/10/2026): `marca_confirmar_leitura(p_arquivo, p_participacao)` (SECURITY DEFINER;
    migration `20261105_marca_confirmar_leitura.sql`, ✅ aplicada; teste `supabase/testes/marca-confirmar-leitura.sql`) é o único caminho de gravação do
    painel — primeira vez insere, já confirmada ESTA versão não faz nada, versão anterior renova `lido_em`. "Versão atual" = `lido_em >= publicado_em − 1
    min` (a mesma tolerância de `publicadoDepoisDaLeitura` e de `get_arquivos_admin`, cujo "N confirmaram" só conta a versão atual); `useResumoMarca` lê
    `lido_em`. A aba lista também as solicitações de bloco `arquivo`. `arquivo_leitura` traz UMA linha por participação: `mapaDeLeituras` fica com a
    leitura mais recente de cada arquivo (com "o último ganha", uma leitura antiga reabria a pendência), e a RPC recebe `a.participacao_id ||
    participação atual` (arquivo só desta marca em edição antiga confirma por ela). A EQUIPE usa a mesma regra: `get_ficha_participacao` passou a
    entregar `publicado_em` (migration `20261108_ficha_arquivo_publicado_em.sql`, ✅) e `FichaCadastro`/`FichaVisao` dizem pela `leituraNaFicha`
    ("leu em X" · "leu a versão anterior em X; falta confirmar a atual" · "ainda não confirmou a leitura"). Substituir o arquivo AVISA quem já tinha
    confirmado (sino + push): gatilho `arquivo_substituido_avisa` (`20261109_arquivo_substituido_avisa.sql`, ✅; teste
    `supabase/testes/arquivo-substituido-avisa.sql`) — só `exige_leitura`, só quem tinha lido uma versão anterior. ⚠️ Conhecidos e aceitos: a
    policy `leitura_marca_registra` ainda deixa o painel ANTIGO gravar `arquivo_leitura` direto (trocar por `with check (false)` quando ele sumir);
    a tolerância de 1 min deixa uma troca feita até 60 s depois da leitura contar como "versão atual".
  - **Solicitações** (a tela que era "Pedidos"; `Pedidos.jsx` + `pedidos/PedidoLinha.jsx` + `lib/pedidosMarca.js` + `pedidos-marca.css`, `pm-`): cada
    linha tem título, "O que é pedido" (`solicitacoes.texto`), onde fica no painel, prazo em palavras com data local, situação e a ação (Responder ·
    Continuar resposta · Ver resposta). Pendentes em cima (importante e prazo ≤3 dias primeiro), respondidas recolhidas em "Respondidas (N)"; "em andamento"
    = resposta começada neste aparelho (o banco só tem pendente/respondido). O contador "Para responder (N)" bate com o do Início (teste contra `resumoMarca`).
    O nome do destino na barra passou a ser **Solicitações** (a chave de rota segue `pedidos`, links gravados valem).
  - **Ajuda no celular:** o botão de conversa mostra "Conversa" EMPILHADO sob o ícone (≤1100px; abaixo de 380px só o ícone, nome completo no `aria-label`).
    ⛔ Não voltar ao rótulo ao lado do ícone: tomava a largura do título da página ("Solici…", "Arqui…"); há teste de navegador que mede o título.
- **Painel da equipe — Visão geral e nomes** (22/10/2026):
  - **Visão geral** (`vistas/Mesa.jsx` + `vistas/mesa/*.jsx` + `lib/visaoGeral.js` + `mesa-org.css`, `ms-`), três áreas nesta ordem: **Ações da equipe**
    (cartões de decisão por urgência: mensagens, aprovação, temas, pedidos, candidaturas, revisão, respostas do site, marcas sem acesso; a **agenda** sobe ao
    topo quando um prazo vence hoje/amanhã) · **Situação das marcas** (a esteira e as barras da edição) · **Atividade recente** (5, "Ver mais" até 12).
    Cada cartão é o `Modulo` do painel com o destino dito no pé; **o número é o tamanho da lista que ele abre** (testado contra o filtro real de
    `Marcas.jsx` e `respostas.js › filtrados`). Cartão cuja ação exige permissão (`mensagem.enviar`, `curadoria.decidir`, `producao.gerir`…) não aparece
    sem ela; quem só tem pendência de outra função lê "Nada que a sua função possa resolver agora". "Nada precisa da equipe agora" só depois de ler tudo,
    sem falha e sem pendência oculta (`estadoDasAcoes`); leitura que caiu é dita NO BLOCO que ela alimenta. 23/10/2026: o Social media entra na
    conta — a Mesa lê `redes_resumo` (só com `redes.ver`; `LEITURA.redes`) e, havendo algo para o perfil (`R.totalAlertas`: atrasadas, com ajuste,
    para aprovar ou a publicar), `estadoDasAcoes({ redes })` devolve `{ tipo: 'redes', texto: '' }`: o "Nada precisa da equipe agora" não aparece
    ao lado do bloco do Social media com "N atrasadas" (cenário V8 de `tests/painel-visao-geral-navegador.mjs`).
  - **Temas**: o cartão conta propostas `proposto`; a aba Temas (Edição.jsx › `AbaTemas`) abre em **"Esperando decisão (N)"** (mesmo N) com a opção "Todos".
  - **Os três "publicar"** têm nomes distintos, fonte única em `lib/nomesPublicacao.js`: Participantes › **Páginas das marcas** (revisar e publicar a
    página de CADA marca) · Edição › **Liberação no site** (chaves e fase da edição INTEIRA) · Social media › **Planejamento** (posts do Instagram). Só os
    NOMES mudaram; chaves de rota (`publicacao`, `planejamento`), `sub` da ficha e links gravados valem. `lib/rota.js` ganhou as abas `publicacao` e
    `preenchimento` (Participantes) e `publicacao`/`avaliacoes` (Edição) — antes `participantes/publicacao` caía na lista de Marcas.
  - **Ficha da marca**: uma nota sob as abas diz que "Visão do participante" só LÊ e que "Ver como participante" (só `acesso.gerir`) abre o painel real da
    marca em outra aba (o item do menu tem `title`); a edição aparece nas ações de publicação. Tour da equipe reescrito (passo "Social media" só com `redes.ver`).
  - **CSS morto removido de `painel.css`** (grade antiga da Mesa, `ui-resumo__*` sem uso, `ui-pedido*`/`ui-arquivo*`/`ui-resposta*`) — conferido por
    script em todo `painel-app/src`, `tests/` e `public/painel` antes. ⚠️ Rotas antigas e a tela "Ver como" não mudaram.
  - Testes: `painel-app-fotos-marca`, `arquivos-marca`, `pedidos-marca`, `visao-geral`, `nomes-publicacao`; navegador (backend falso, rodar de dentro de
    `tests/`): `painel-marca-estados-navegador.mjs` (S1–S9 e rolagem horizontal em Início, formulário, Fotos, Arquivos e Solicitações) e
    `painel-visao-geral-navegador.mjs` (V1–V4: áreas, número = lista, permissão, leitura que cai).
- **Revisão independente desta rodada** (4 lentes + cético por achado): 25 achados confirmados, todos corrigidos e cobertos por teste. O que ficou como regra:
  - **Marca.** Foco e feedback: resultado de reservar/confirmar/responder vive num `AvisoComFoco` (`<p tabIndex=-1>` com `role` status/alert que recebe o foco uma
    vez por aviso) — item que muda de lugar não pode largar o leitor de tela no vazio; o arquivo recém-confirmado fica em "Para ler" (parâmetro `mantidos` de
    `organizarArquivos`) até reabrir a tela. Botão de confirmar leitura só com `leituraConhecida` (falha ao ler `arquivo_leitura` = "Confirmação não
    verificada", nunca "pendente"). Abrir/Baixar de arquivos E de fotos oficiais usam o mesmo `useAcessoArquivo` (`urlParaBaixar`, `nomeArquivo`,
    `notaDeAbertura`). Reserva de foto aplica a linha devolvida pelo PATCH antes de reler (a vaga conquistada sai da lista mesmo se a releitura cair). No modo
    "Ver como", `modo_visualizacao` vira a frase do modo (`traduzirErro`). Solicitação de bloco `fotos` entra na lista da aba Fotos. O **rascunho de resposta**
    de uma solicitação fica no `sessionStorage` por participação (sem ir ao banco), é declarado com `usePendencia` e **apagado no logout e na troca de conta**
    (`limparRascunhosPedidos` em `App.jsx › sairMarca/trocaLocal`). ⚠️ O texto visível ao participante diz **"solicitação"** em todo lugar (guia, Início, tour,
    avisos de mudança em `sincMarca.js`); "pedido" só sobrou em nomes de função, chave de rota e na organização.
  - **Equipe.** Leitura que cai NUNCA vira zeros/"sem edição": `Mesa.jsx` guarda `marcasLidas` e `edicaoLida` ("leu ao menos uma vez" — a releitura silenciosa que
    falha mantém o dado antigo) e `estadoDaEdicao` escolhe o texto ("Não consegui ler as marcas/a edição atual…"); com as marcas nunca lidas a esteira vira uma
    nota (senão sobrariam contadores "0"). `estadoDasAcoes` ganhou `agendaUrgente`: "Nada precisa da equipe agora" não aparece junto de prazo que vence
    hoje/amanhã. **Marca encerrada não conta em "Cadastros para aprovar"** (`aguardandoAprovacao` e o filtro `aguardando_aprovacao` de `Marcas.jsx` exigem
    `participaDaEdicao`, os dois juntos). Aba Temas: grupo com tema já aprovado e propostas de outras marcas mostra "Já aprovado para <marca>: …precisam trocar de
    tema" (a aprovada continua visível; "N marcas pediram" só em grupo sem aprovada). O cartão de pedidos soma respostas que faltam e o destino ("Quem falta")
    lista TODAS as marcas do pedido, pendentes primeiro — por isso o texto não promete "mesmo número" ali.
  - **Botão de conversa**: o nome acessível é "Conversa: falar com a organização (N mensagens novas)" — contém o rótulo longo (computador) e o curto (celular), WCAG 2.5.3
    (teste em `painel-app-inicio`).
  - ✅ Resolvido em 23/10/2026: o bloco de Social media da Visão geral (`ResumoRedes`) não mostra mais "N atrasadas" ao lado de "Nada precisa da equipe
    agora" — a Mesa lê `redes_resumo` (com `redes.ver`; `LEITURA.redes` em `lib/visaoGeral.js`) e `estadoDasAcoes({ redes })` entra na conta; a aba Arquivos
    da marca lista as solicitações de bloco `arquivo`; o modo `fotos` morto de `<Arquivos>` saiu.
- ⚠️ **Ainda não validado** (nada disto foi feito): iPhone/Android reais (o `download` virar anexo, aba que fecha sozinha, `IntersectionObserver` do Safari,
  zoom 200%), miniaturas com URLs assinadas reais, o fluxo completo de primeiro acesso + troca de senha em aparelho, reserva de foto por duas marcas ao mesmo
  tempo (só o erro traduzido está coberto), e a Visão geral com dados reais. Testes: `tests/painel-app-guia-estados`, `painel-app-inicio`, `painel-app-edicao-marca`; navegador (backend falso):
  `node tests/painel-horario-navegador.mjs` (H1–H6: o seletor dentro do Cadastro real) e `node tests/painel-convite-navegador.mjs` (C1–C4: convite do app
  e "Avisos neste aparelho" do sino, iPhone só emulado), ambos com backend falso;
  `node tests/painel-marca-estados-navegador.mjs` (de dentro de `tests/`; `CAPTURAS=<pasta>` salva imagens em 360/390/768/1280/1440).

#### A marca só salva; a organização é avisada — 23/10/2026 (pedido do Wilker)
"Coloca só o botão salvar, não precisa ter o botão enviar para a conferência, enviar para aprovação. Se ele fez alguma alteração […] a
gente precisa ser notificado para atualizar no sistema e atualizar nas informações do site." Migration `20261106_marca_salvar_avisa.sql`
(✅ aplicada; teste `supabase/testes/marca-salvar-avisa.sql` → `TESTE_OK`; reversão em `supabase/reverter/`).
- **Só "Salvar".** Saíram o envio inteiro (`concluir`, "Revisar e enviar", `<Revisao>`, a nota e o botão de envio) e a prévia "Ver como fica
  no site" (`FichaPrevia.jsx` apagado). Fica o link "Ver a página no site" para a página já publicada. **A equipe confere e publica**
  (Aprovar e Publicar seguem como eram): o cadastro COMPLETO vai sozinho para a conferência.
- **Quem leva o cadastro à conferência é o banco:** o gatilho `marca_alterou` chama `marca_concluir_cadastro` quando a marca grava e a
  participação está com combo `rascunho` e cadastro `aguardando_cadastro`/`em_preenchimento` (incompleto: não faz nada). Combo `aprovado` NÃO
  volta para análise (fica `aprovado` com `alterado_apos_aprovacao`, para a equipe republicar); `correcao_solicitada` fica aberta até a equipe decidir
  (a marca corrige e salva; o Início segue com "Corrigir agora"). Gravação feita só pela equipe não conclui — espera o próximo salvamento da marca.
- **Toda alteração da marca avisa a organização** (sino + push): `avisar_alteracao_marca` mantém UM aviso ABERTO por marca (`chave_grupo =
  'marca:<participante>:alterou'`, para todos, link `marcas/<id>/publicacao`, "<Marca> alterou o cadastro", texto = as áreas). Áreas (lista
  fechada): Dados da marca · Logo · Tema · Combo e custos · Itens do combo · Alergênicos e trocas · Unidades e atendimento · Horário no festival.
  Área nova acumula no mesmo aviso (sem push novo); área repetida não grava nada (o salvamento automático grava a cada ~1 s); depois que
  alguém da organização lê, a próxima alteração abre outro. Dispara SÓ a marca (`meu_participante()`): organização (`org_salvar_*`, "Aplicar" do
  /preencher), importação, `pg_cron` e "Ver como participante" não. Cada parte tem `exception`: falha do aviso/conclusão NUNCA derruba o salvamento.
  `marca_definir_logo` perdeu o `notificar` próprio (a troca de logo passa pelo gatilho, área "Logo"). ⚠️ Cadastro que fica completo gera dois
  avisos com push ("alterou o cadastro" e "concluiu o cadastro"); a primeira escolha de tema ainda manda "informou o tema" (`temas_sincronizar`).
- ⛔ **Painel novo e migration andam juntos:** sem a migration, nenhum cadastro conclui e ninguém é avisado. Com a migration e o painel antigo
  (que ainda tem "Enviar"), o botão antigo funciona: o gatilho ignora essa gravação (só mexe em status).
- **WhatsApp da loja:** um por unidade, "(opcional) aparece no site"; sem a caixa "Autorizo publicar este WhatsApp no site". Preenchido =
  publicável: a tela grava `whatsapp_autorizado` junto do número (`E.editarUnidade`/`corpoUnidade`) e o "Aplicar" do /preencher também
  (`org_preenchimento_decidir`: só um `false` explícito de uma cópia antiga da página mantém o número fora). Número antigo sem autorização (24
  unidades) só vai ao site quando a marca salva a unidade ("Este número vai para o site quando você salvar esta unidade."). O WhatsApp
  PESSOAL do responsável (`participantes.telefone`, usado pela organização) é outro dado e continua privado.
- **Manual de fotos:** `guia-de-fotos-cartoon.pdf` foi arquivado (reversível: Arquivos › Arquivados › Restaurar; a RLS esconde arquivado da marca);
  o cartão "Um arquivo para ler" é a pendência calculada de arquivos que exigem leitura, então sumiu sozinho.
- ⚠️ Sobras conhecidas: `lib/hoje.js › proximosPassos` não foi apagado (dois testes de outras áreas o importam); o aviso de "tema informado" duplica.

#### Botões só com ícone — 25/10/2026 (pedido do Wilker)
"Simplifica todos esses botões com textos e deixa o ícone apropriado… Só deixa o que realmente precisa do texto." Teste
`tests/painel-app-botoes-icone.test.mjs`.
- **A regra.** Vira só ícone a ação SECUNDÁRIA de desenho UNIVERSAL: baixar, compartilhar, mover para pasta, apagar,
  editar (lápis), copiar, fechar/descartar/limpar (X), abrir fora, ampliar, mais ações (⋯), ajuda (?), voltar, "›" que
  abre o item, "+" repetido em lista/célula, arquivar/restaurar em linha de lista. **Fica com texto:** a ação principal
  da tela, decisão (Aprovar, Publicar, Pedir ajuste, Bloquear…), confirmação, o Cancelar de formulário, WhatsApp (sem
  glifo oficial), botão com número ("Baixar ZIP (12)", "Filtros (2)"), login/convite/tour e o "Tentar de novo" de erro.
  Na marca, mais conservador: só o Baixar virou seta. ⚠️ No toque não há dica — por isso só o desenho universal.
- **As peças (`ui.jsx`):** `Botao soIcone` (o texto, string, vira `aria-label` e `data-rotulo`; `aria-label` de quem
  chama, mais longo, vale; `aria-busy` troca pelo "carregando"), `LinkIcone` (o mesmo para `<a>`: baixar, abrir fora) e
  `MaisAcoes` (sempre só os três pontos; `rotulo` é string). Mesma variante de antes (contorno, amarelo, laranja), num
  círculo de 44 px (`.og-btn--icone`; `max-width` segura a fileira que estica botões com `flex:1`). Dica em cima, no
  mouse (`@media (hover:hover)`) e no foco do teclado; nas pontas da fileira ela encosta na borda. `BotaoIcone` (sem
  contorno) segue nas listas que já o usavam.
- **`BotoesEntrega`:** um arquivo = só os ícones; vários = o texto diz ZIP e quantos. `EstadoEntrega`: Cancelar e Fechar
  viraram X.
- **Ícones novos:** `mover-pasta`, `ampliar`, `subir` (enviar arquivo; o envio de logo usava a seta de baixar), `olho`
  (Ver prévia; usava o desenho de "Visão geral") e `compartilhar-ios`. ⚠️ Compartilhar abre as opções DO APARELHO:
  `ICONE_COMPARTILHAR` (`Icone.jsx`) = quadrado com seta no iPhone/iPad, três pontos no resto.
- Texto que citava o botão pelo nome passou a dizer o desenho ("use o botão de baixar", "“Baixar” (a seta para baixo)",
  "Mais ações (os três pontos)"). Botão novo: siga a regra acima; com `soIcone`, escreva o nome entre as tags.

#### Voltar + Telas recentes e o Voltar do sistema — 24/10/2026 (pedido do Wilker)
"Às vezes eu tô em algum canto e para voltar… preciso ir para o início de tudo" — no app instalado do iPhone não há botão Voltar
do navegador, e no Android o Voltar do SISTEMA anda pelo histórico. Teste `tests/painel-app-historico.test.mjs` (janela falsa com
`go()` assíncrono) e `node tests/painel-voltar-navegador.mjs` (de dentro de `tests/`; iPhone e Android EMULADOS, `page.goBack()` = o
Voltar do sistema; não prova o aparelho real).
- **Um dono do histórico: `lib/historico.js`.** ⛔ `history.pushState/back/go` fora dele não passa no teste. Cada tela é uma entrada
  com `scwId` no `history.state`; o modelo (entradas, posição, telas recentes, nomes) vive no sessionStorage por painel
  (`scw_historico_org` / `_marca`; `historico.limpar` no Sair e na troca de conta). `irPara(h, { substituir })` decide: substitui
  (filtro/busca), volta (se `h` é a tela de onde veio — o antigo `voltarPara`) ou empilha.
- **As cascas não ouvem `popstate`**: ouvem `historico.aoMudarEndereco` (só quando o endereço muda de fato) + `hashchange`.
- **Camadas:** `Folha` e `Confirmar` empilham uma entrada com o MESMO endereço ao abrir (`abrirCamada`). O Voltar do sistema tira essa
  entrada e chama o `onFechar` (fecha a folha, não a tela de baixo); se a folha continuar aberta (a pessoa desistiu de descartar) e
  ninguém navegou, a entrada volta. Fechar pela tela tira a entrada sem chamar nada (`fecharCamada`) — sem "voltar morto".
  ⚠️ Navegar com camada aberta primeiro tira as entradas das camadas (`history.go(-k)`) e SÓ ENTÃO empilha: a operação espera o
  popstate numa fila (senão o go() atrasado desfaria o push). Folha que mora no endereço (postagem, contato, resposta): o X navega
  para a lista e o histórico volta direto, sem passar pela ficha.
- **Sair do item para a lista do mesmo lugar nunca empilha** (`irPara(h, { fechar: true })`, que o `navegar` da organização marca
  sozinho quando só o `item` some): se a lista é de onde veio, volta; senão a entrada do item VIRA a lista. Empilhar a lista por cima
  fazia o Voltar reabrir o item — e, com a folha da ficha aberta de FORA da lista (aviso, link), o Voltar do sistema entrava em laço
  (achado da revisão independente, 24/10/2026).
- **Recarga com folha aberta** ("Atualizar agora", F5): a entrada da folha volta sem a folha. `iniciar` desce para a página gêmea
  (`scwN` = quantas camadas até a página) em vez de criar uma página duplicada (Voltar morto); o Avançar do computador que cai numa
  camada que já fechou faz o mesmo. `iniciar` roda em `useLayoutEffect` nas cascas e só uma vez por carga (`iniciado`): a folha que
  abre antes dele espera na fila (`antesDoInicio`).
- **Tela:** `components/Trilha.jsx` + `styles/trilha.css`. "‹ <tela anterior>" (um toque volta um passo) e a seta "Telas recentes"
  (folha com até 8 telas da sessão, a atual marcada, "há N min"). Computador: no lugar de "Painel SCW · …" na barra creme. Celular: no
  chocolate, abaixo do título, no lugar da descrição — o selo sai quando o Voltar aparece (`.pn-cabeca--trilha`), a altura do cabeçalho
  não muda, o toque tem 44 px por fora (`::before`). Trabalho pela metade (`lib/pendencias.js`, menos o que guarda rascunho) pergunta antes.
- **Nomes:** `useNomeDaTela(vista, item, nome)` nas fichas (marca, contato, postagem, resposta, participante do Social media) e
  `useRotulosDasAbas` no `Modulo`. A aba que abre o módulo não aparece ("‹ Participantes", não "‹ Marcas"); as outras sim ("‹ Fotos").
  Item sem nome registrado cai no nome da aba/módulo. Tela nova com item no endereço: chamar `useNomeDaTela` com o nome que ela mostra.
- **Mesma tela nas Recentes** = módulo + aba + item (a seção da ficha e os filtros não contam); marca = a vista.

#### "Ver como participante" — 22/10/2026 (pedido do Wilker)
O administrador vê o painel da marca EXATAMENTE como ela vê, sem gravar e sem usar nem tocar a sessão dela. Ficha › Mais ações ›
"Ver como participante" (só `acesso.gerir`) abre `/painel/?ver_como=<participante>` numa aba nova (`VerComoParticipante.jsx`, estado
`ver-como` do `App`, exige conta pessoal da organização). Migration `20261104_ver_como_participante.sql`; testes
`tests/painel-app-ver-como.test.mjs`, `tests/painel-ver-como-navegador.mjs` e `supabase/testes/ver-como-participante.sql`.
- **Um desvio só, no cliente da marca** (`lib/marcaApi.js`, `ativarVerComo`): `api()` manda GET para `org_ver_como_ler` (o caminho
  do PostgREST vira consulta por `consultaDoCaminho`) e as funções de leitura (`RPC_LEITURA_MARCA`, a mesma lista do banco) também;
  QUALQUER outra coisa (PATCH/POST/DELETE, `marca_*` que grava, `auth()`, `subirLogo`) lança `modo_visualizacao`. Download vai pela
  `arquivo-url` da organização. Sem tempo real, sem tour automático, sem convite de aparelho, sem marcar aviso/mensagem como lido.
- **No banco:** `org_ver_como_ler` é STABLE e SECURITY INVOKER — o Postgres recusa escrita dentro dela. Confere o administrador
  (`ver_como_alvo`: conta pessoal + `acesso.gerir`) e só então troca a identidade DA TRANSAÇÃO para a conta da marca
  (`request.jwt.claims`/`claim.sub`): a mesma RLS e as mesmas `marca_*`. Tabelas e funções em lista fechada; identificador validado
  e citado, valor como literal. Abrir registra `participante.ver_como` na auditoria (`org_ver_como_iniciar`).
- ⚠️ **`conta_ativa()` tem uma exceção**: com a chave `scw_ver_como` nas claims (= id de quem tem `acesso.gerir`) ela é verdadeira
  mesmo com senha temporária — senão o administrador veria tudo vazio. Só função do banco escreve `request.jwt.claims`; JWT de
  verdade não traz essa chave no topo. ⛔ Nunca ler a senha da marca: ela não é recuperável (hash) e o caminho é gerar outra.
- Tela nova da marca que GRAVA não precisa de nada: o desvio já recusa. Tela nova que LÊ tabela fora da lista do banco aparece vazia
  no modo — acrescentar a tabela em `org_ver_como_ler` (e conferir se a marca lê pela RLS dela).

#### Logos oficiais da Cartoon — 15/10/2026
As 26 logos de `10_LOGOS_PARTICIPANTES/PRINCIPAIS` (Dropbox da edição) são as oficiais, conferidas pelo Wilker; não recriar nem
questionar. No painel elas entram como logo **do acervo** (`logos_marca.origem = 'acervo'`, caminho `/logos/participants/<slug>.png`,
registrada por `registrar_logo`), que `urlLogo` (`lib/logos.js`) já serve como arquivo do site. Fluxo para trocar uma logo: ver
`src/CLAUDE.md` §6.12 (script `scripts/sincronizar-logos-oficiais.py` + `scripts/acervo-logos-para-sql.mjs`).

#### Logo da marca em todo lugar + miniatura — 26/10/2026 (pedido do Wilker)
"Onde aparece a marca tem que acompanhar a logo." Migration `20261113_logos_mini.sql` (✅ aplicada; reversão em `supabase/reverter/`),
lógica em `lib/logosMini.js`, teste `tests/painel-app-logos-mini.test.mjs`.
- **Miniatura no banco, não no Storage:** `logos_marca.mini` = WEBP 96 × 96 (recorte central, o `cover` de `.ui-logo`) em data URI, ~1 KB
  (a original pesa 200 KB a 4 MB). `get_logos_mini` (`membro_org`) traz todas numa leitura só; o `PainelShell` põe no `LogosMiniContexto`.
- **Quem gera é o painel da equipe**, uma vez por logo: logo sem `mini` é baixada, recortada e gravada por `logo_definir_mini` (só grava onde
  está vazio, então abas simultâneas não brigam). Uma de cada vez, até 60 por sessão; não roda no Safari (não codifica WEBP) nem com economia
  de dados. Logo nova = linha nova em `logos_marca` = miniatura gerada na próxima abertura num computador.
- **`LogoMarca` com `participanteId` (ou `conta`)** usa a miniatura até 48 px (`TAMANHO_MINI`) e a original acima; miniatura que falha cai
  na original; sem nada, iniciais. `MarcaComLogo` = nome + logo decorativa (alt vazio: o nome visível identifica). O `Avatar` de autor
  "Marca · …" (sino, Atividade, históricos) acha a logo pela conta (`ator_user_id`).
- ⚠️ Ficam sem logo: listas que só trazem `participacao_id` (Arquivos › Para, Materiais, vouchers do contato, quem respondeu uma
  solicitação, Avaliações) e `get_solicitacoes_admin` (só o nome). Resolver = a RPC devolver `participante_id`. O painel da MARCA continua
  com a logo original (uma só, 36 px).

#### Pendências: resolver ou cobrar do participante — 26/10/2026 (pedido do Wilker)
"Ou eu mesmo resolvo e notifico o participante do que fiz, ou envio a pendência como notificação — uma, várias, ou de
várias marcas." Migration `20261114_avisar_marca_pendencias.sql` (✅ aplicada; teste `supabase/testes/avisar-marca-pendencias.sql`
→ `TESTE_OK`; reversão em `supabase/reverter/`), lógica em `lib/pendenciasAviso.js`, telas em `vistas/CobrarPendencias.jsx`,
teste `tests/painel-app-pendencias-aviso.test.mjs`.
- **Um aviso = `org_avisar_marca`** (`mensagem.enviar`): sino + push no painel da marca com o toque levando ao CAMPO
  (`link` no formato do `?ir=`), e o mesmo texto na conversa. A mensagem entra com `scw.silencioso` para não sair também o
  genérico "Nova mensagem da organização". Tipos: `pendencia` (nível "pendência" no sino da marca) e `ajuste` ("fizemos por você").
- **Cada pendência de `pendenciasDaFicha` pode ter** `paraMarca` (a frase escrita PARA a marca), `link` (`linkDoCampo`) e
  `resolver` (editor da ficha). `cobravel` = tem os dois primeiros; erro de leitura e o que é da equipe (tema em análise,
  foto a revisar, publicar) não são cobráveis. `podeResolver` confere a permissão do editor (`PERMISSAO_DO_EDITOR`).
- **Cartão Pendências:** o texto leva à seção (como antes); lápis = "Resolver agora" (abre o editor no lugar da seção); sino =
  cobrar essa; com 2+ cobráveis, caixas + "Cobrar N marcadas"/"Cobrar todas" — UM aviso, link da primeira.
- **Resolver com aviso:** "Nome do combo" (editor `nomeCombo`, `org_salvar_dados_publicos`) e a conferência de localização
  aberta pela ficha (`ConferirLocalizacao participante={p}`) mostram a `CaixaAviso` já marcada com o texto pronto
  (`avisoNomeCombo`/`avisoLocalizacao`), editável ou desmarcável. Salvar não depende do aviso: se o aviso falha, a tela diz.
- **Lote (Marcas › selecionar › "Cobrar pendências")**: `lerPendenciasLote` lê as MESMAS quatro fontes da ficha, 4 marcas por
  vez (barra "Conferindo N de M"), e a folha mostra por marca o que cobrar, com um recado comum opcional. Um aviso por marca.
  ⚠️ Não calcular as pendências no banco: a regra mora em `pendenciasDaFicha`, e o lote tem que bater com a ficha.

#### Prévia das imagens em Arquivos — 27/10/2026 (pedido do Wilker)
"Mostra a prévia desses arquivos de download." Migration `20261116_arquivos_previa.sql` (✅ aplicada; reversão em
`supabase/reverter/`), lógica em `lib/arquivosPrevia.js`, peça `components/PreviaArquivo.jsx` (`PreviaArquivo` + `AmpliarPrevia`),
teste `tests/painel-app-arquivos-previa.test.mjs`.
- **Prévia ≠ original.** A logo Cartoon em alta tem 16 MB; a miniatura usa `arquivos.previa_path`: WEBP de até 960 px na MESMA
  pasta do bucket privado `arquivos` (CHECK). Sem prévia, o original só vira miniatura até 3 MB; acima, ícone. Baixar continua
  entregando o original. Tocar na miniatura abre a imagem grande (a própria prévia) numa folha, com "Baixar o original".
- **Quem gera é a equipe** (`producao.gerir`, `arquivo_definir_previa`): ao publicar (Producao › FolhaNovoArquivo) e ao
  substituir (ArquivosOrg), do arquivo na mão; o que já estava publicado, uma vez, ao abrir Arquivos num navegador que codifica
  WEBP (`useGerarPreviasFaltando`, uma por vez, até 60 MB). Trocar o arquivo limpa a prévia antiga (gatilho
  `arquivos_previa_do_arquivo`).
- **Quem lê:** a marca assina a prévia com a própria sessão (policy `arquivos_marca_le` aceita `previa_path` do arquivo que ela
  já lê); a equipe pela `arquivo-url`, uma por miniatura, só quando chega perto da tela. A equipe lê as prévias por
  `get_arquivos_previas` (à parte: `get_arquivos_admin` tem formato fixo e mudar exigiria recriá-la).

#### Press Kit: retirar da lista e desfazer — 28/10/2026 (pedido do Wilker)
"Se eu seleciono algum contato, eu não consigo retirar mais da lista." Só tela, sem migration: `definir_presskit` já aceitava os 7 status
e voltar de um para o outro (é upsert). Lógica pura em `lib/presskit.js`, teste `tests/painel-app-presskit.test.mjs`.
- **Retirar = status `cancelado`** (rótulo agora "Retirado da lista"): nada se apaga, a pessoa sai da lista e dos contadores, o endereço e as
  datas ficam, e "Colocar de volta" a leva para Selecionado. Quem já saiu para entrega (`enviado`/`entregue`/`nao_entregue`) pede confirmação.
- **Botões à vista em cada linha, embaixo do nome** (`og-item--acoes`): "Voltar para …" (um passo: ANTERIOR) e "Retirar da lista", com o nome
  da pessoa no `aria-label`. O aviso depois de cada mudança traz "Desfazer" (guarda o status de antes só na tela). Na ficha da pessoa
  (Contatos › Pessoas): "Retirar da lista" / "Colocar de volta na lista".
- **Sugestões:** "Selecionar", "Só sugerir" e "Não incluir nesta edição" à vista; "Não incluir" cria o registro `cancelado` e tira a pessoa das
  sugestões (aparece em "Retirado da lista"). ⚠️ Esse caso não tem "Desfazer": antes dele não havia registro, e o painel não apaga.
- ⛔ **Nada de menu ⋯ (`MaisAcoes`) dentro de `og-lista`.** A 1ª versão (28/10) pôs as ações num menu: a lista é um card com
  `overflow:hidden`, o menu abre para baixo e foi cortado (numa lista de uma pessoa não aparecia nada), e no celular ainda saía pela esquerda
  (`.og-item__dir` alinha à esquerda e o menu ancora à direita). Corrigido no mesmo dia; `tests/painel-app-presskit.test.mjs` reprova a volta.
  Menu ⋯ só em card solto, cabeça de página ou barra — como nas pastas, campanhas e postagens.
- ⚠️ **Texto do aviso de atualização:** a 1ª linha de `painel-app/NOVIDADES.txt` é o que "Atualização disponível" mostra. Mudança que a pessoa
  vai ver troca essa linha no mesmo commit (ficou desatualizada em 28/10 e o aviso descrevia outra coisa).
- O total do título conta só quem está na lista (retirados ficam de fora); a lista vazia diz qual situação está vazia.

#### Endereço completo e fila de localizações — 28/10/2026 (pedido do Wilker)
"O participante coloca todos os dados do endereço; conferir o ponto no mapa é comigo, só confirmo." Migration
`20261120_endereco_completo_e_fila_de_localizacao.sql` (reversão em `supabase/reverter/`, teste do banco
`supabase/testes/localizacoes-endereco.sql` → `TESTE_OK`), lógica em `lib/localizacoes.js`, tela `vistas/Localizacoes.jsx`,
testes `tests/painel-app-localizacoes.test.mjs` e `painel-app-edicao-marca.test.mjs`.
- **Endereço completo = rua, número, bairro, cidade e CEP** (antes só rua, bairro e cidade). Mesma regra em três lugares, que andam
  juntos: `pendencias_publicacao` (banco), `pendenciasEdicao` (`lib/edicaoMarca.js`) e o `/preencher` (`data-obrigatorio` de número e CEP;
  o CEP saiu do bloco recolhido). Marca sem número escreve **S/N**. O código da pendência não mudou (`unidade:<id>:endereco`).
  ⚠️ A migration faz ~24 unidades que já tinham o cadastro "completo" voltarem a ter pendência (faltava CEP): é o efeito pedido, e o lembrete
  diário passa a cobrar. Painel novo e migration andam juntos.
- **O participante não vê mais nada do mapa:** saiu o aviso "Localização no mapa: em conferência…" de Meu cadastro › Unidades.
- **Participantes › Localizações** (`#participantes/localizacoes`): fila única com as unidades que participam da edição (leitura
  `get_localizacoes_unidades`, `dado.ler`). Cada uma mostra o endereço como o participante escreveu, "Abrir o endereço no Google Maps" (por
  ENDEREÇO, com CEP) e "Ver o ponto salvo". A administração cola o par "latitude, longitude" e confirma — `org_verificar_coordenada`, a mesma da
  ficha (`producao.gerir`); com ponto já salvo, o botão vira "Confirmar este ponto". Filtro "A conferir" (padrão) · "Conferidas" · "Todas". Mudar
  o endereço no cadastro tira a conferência (o banco já fazia) e a unidade volta à fila. A conferência por ficha (Publicação) continua valendo.
- ⚠️ **Não há sugestão automática do ponto** (decisão do Wilker): o painel não geocodifica; o ponto vem do Google Maps, colado à mão. O
  OpenStreetMap foi avaliado e descartado — em Natal ele erra a casa (testado com a Carcará: 4,8 km de diferença).
- ⚠️ Ficou de fora: card "Localizações a conferir" na Visão geral; `verificada` segue no estado da unidade da marca, sem uso na tela.

#### Trocas completas e bloco "O combo" — 02/11/2026 (pedido do Wilker)
"Se tiver troca, nome e descrição do item da troca; mais de uma, adiciona outra; e as perguntas de alergênicos também para esse
outro item" (o Marlon: cachorro-quente e, de troca, o vegetariano). Migration `20261123_trocas_completas` (APLICADA, TESTE_OK).
- **Troca = item completo:** `substituicoes.alternativa` é o NOME da troca, `descricao` (nova, ≤600) a descrição, e os alergênicos e
  características ficam em `declaracoes_alimentares.substituicao_id` (mesmas perguntas do item). Várias por item, em `ordem`.
  `original` não é mais perguntado: grava o nome do próprio item (coluna segue NOT NULL). Registro antigo com original diferente do
  item continua aparecendo "original → alternativa" (`combosTexto.nomeDaTroca`).
- **/preencher:** cards "Opção de troca N" (nome, descrição, alergênicos do template compartilhado `tpl-alimentar`, disponibilidade),
  "+ Adicionar outra opção de troca", Remover. Envio: `trocas: [{alternativa, descricao, disponibilidade, alimentar, outro_alergenico}]`
  — sem `troca`/`original`. `preenchimento_estado` devolve `trocas` (e `troca`, a 1ª, para rascunho/envio antigo); o "Aplicar"
  (`org_preenchimento_decidir`) troca a lista INTEIRA do item e aceita o envio antigo (`troca`) como lista de um.
- **Painel da marca (Meu combo, bloco 5):** o mesmo modelo; o componente de alergênicos é o do item com `id` da troca. Pendências
  `troca:<pos>:<n>:descricao|alimentar` (só tela da marca) e `combo_descricao` (bloco 3).
- **O combo:** no /preencher virou bloco próprio entre Tema e Os três itens, nome e descrição OBRIGATÓRIOS; `campos_cadastro` passou a
  15 campos-base (conta os dois).
- **% e Início alinhados (mesmo dia):** `guia.js camposObrigatorios` conta `combo_nome`/`combo_descricao` (bloco 3; 15 campos, igual a
  `campos_cadastro`); o que o servidor já lista não conta de novo (`resumoMarca.duplicado`, `pendEdicao` no Cadastro). O Início lê
  `marca_previa_publica.faltando` = `pendencias_marca` (20261124): `pendencias_publicacao` + `combo_descricao` + `troca:<pos>:<n>:descricao|alimentar`.
  ⚠️ `pendencias_publicacao` NÃO ganhou essas: ela trava `publicar_participacao` e `marca_concluir_cadastro`, e as trocas antigas não têm
  descrição — o site de ninguém deixa de publicar por isso.

#### Social media › Participantes completo — 31/10/2026 (pedido do Wilker; substitui a aba "Combos" do mesmo dia)
"Em sequência, ordem alfabética, cada participante no seu card com tudo à vista; quando o participante atualizar, mostra aqui com uma
sinalização no campo." Migration `20261122_social_participantes_completo.sql` (reversão em `supabase/reverter/`, teste do banco
`supabase/testes/social-participantes-completo.sql` → `TESTE_OK`), lógica em `lib/alteracoesCampo.js` + `lib/combosTexto.js` +
`lib/combosWord.js`, cartão `vistas/social/CartaoParticipante.jsx`, estilo `styles/social-combos.css` (`scb-`), testes
`tests/painel-app-combos.test.mjs` e `node tests/painel-social-participantes-navegador.mjs` (de dentro de `tests/`; `DADOS=` fixture
local, `CAPTURAS=` prints 1440/390).
- **Onde:** Social media › Participantes (só `editorial.ler`: administrador e Social media/Micka). Um cartão por participante, A–Z
  (ordenado NA TELA), e "Abrir ficha" segue abrindo a ficha editorial (editar textos, criar postagem). A aba Combos saiu;
  `#social/combos` cai em Participantes (`migrarRota`).
- **Campos FIXOS, na mesma ordem para todos** (cartão, texto do WhatsApp e Word): Participante (Instagram, Tema) · Combo (nome,
  descrição, condições, para viagem, valor) · Doce/Salgado/Bebida (nome, descrição, ingredientes, selos, alergênicos) · Trocas e
  opções · Onde encontrar (unidade, endereço, WhatsApp da loja, atendimento, horário no festival). Obrigatório sem resposta =
  "Aguardando informação" NO LUGAR do campo; opcional vazio = "Não informado". ⛔ A lista "Ainda sem: …" no fim não volta.
- **Texto revisado à parte** (`revisoes_texto`): ortografia, pontuação e maiúsculas, conferidas palavra a palavra contra o original.
  O cadastro e o site continuam com o que a marca escreveu; a tela mostra a revisão SÓ enquanto o original for o mesmo (`revisar`:
  mudou o original → `caducas`, volta o texto da marca). Duas revisões especiais: `opcao:<onde>:<n>` (troca/opção que a marca
  escreveu DENTRO de uma descrição: aparece em "Trocas e opções" com "Informado na descrição de …") e `ocultar:<tipo>.troca<k>`
  (troca repetida em outro item). A carga inicial (133 linhas, Word v3.1) fica FORA do repositório
  (`sweet-coffee-week-dados/revisoes-combos-2026-2-carga.sql`): texto de marca não vai ao GitHub público.
- **"Novo / Alterado" por campo** (`alteracoes_campo`): gatilho `alteracao_campo_marca` nas 7 tabelas, SÓ quando quem grava é a
  marca (`meu_participante()`), fora de `scw.silencioso` e do "Ver como". Guarda o antes e o depois; gravações do mesmo campo em
  10 min viram uma linha (salvamento automático). ⚠️ O "Aplicar" do /preencher é gravação da equipe e NÃO marca. A marcação some
  por PESSOA com "Marquei como visto" (`editorial_marcar_visto`, `editorial_vistos`; só conta pessoal); filtro "Só com alterações".
  Falha do gatilho vira `warning` e nunca derruba o salvamento da marca.
- **Copiar e baixar:** "Copiar texto de todos" (WhatsApp) e "Baixar Word" (o mesmo documento do v3.1, gerado no navegador; a
  biblioteca `docx` só carrega no clique) usam o que está na tela (busca e filtro).
#### Link de preenchimento das marcas — 16/10/2026 (pedido do Wilker)
As marcas da edição **não** recebem acesso ao painel agora. Cada participação ganha um link único
`/preencher/#<código>` (página estática `public/preencher/index.html`, mesmo padrão do `/quero-participar`):
manual curto da edição (tudo de `edicoes` + `edicao_cronograma`) e formulário pré-preenchido em 6 blocos
(contato, tema, combo, 3 itens, lojas, observações), cada um com "Conferi". Migration
`20261016_link_preenchimento.sql`; lógica pura em `lib/preenchimento.js`; telas em `vistas/Preenchimento.jsx`;
teste `tests/painel-app-preenchimento.test.mjs`.
- ⛔ **O envio não grava no cadastro** (decisão do Wilker: "passa por revisão"). Vira `preenchimento_envios`
  `pendente`; a organização vê a diferença campo a campo na ficha › **Gestão** e aplica ou descarta
  (`org_preenchimento_decidir`, `cadastro.editar`). Aplicar chama as MESMAS `org_salvar_*` do editor; lojas
  gravam `unidades` + `participacao_unidades` (espelho `endereco`/`bairro`/`faz_delivery`). Nome da marca fica
  de fora (é login): a marca avisa em "Observações".
- O código mora no **fragmento** (`#`), não vai ao servidor nem ao Referer; página `noindex` e `no-referrer`.
  Tabelas sem policy; anon só alcança `preenchimento_ler`/`preenchimento_enviar`, que exigem o código.
  Envio novo substitui o pendente; 15 s entre envios; 40 por link; 60 KB.
- **Participantes › Preenchimento** lista a edição atual: gerar os links que faltam, copiar todas as mensagens,
  WhatsApp por marca. A mensagem diz "obrigatório e urgente" com o prazo do cronograma (`chave = 'preenchimento'`,
  24/10/2026). ⛔ Prazo é dado da edição, não constante no front.
- Trocar o link revoga o anterior (`p_novo`). Link vence em `festival_fim + 15 dias`.
- **Link curto e domínio oficial (22/10/2026, pedido do Wilker):** o link sai como `/preencher/#<22 caracteres>` — os MESMOS 128 bits do código de 32 hex, em base64url (`codigoCurto`/`codigoLongo` em `lib/preenchimento.js`; a página decodifica em `codigoDoLink`). Sem tabela nem servidor no meio, código continua no fragmento; links longos já enviados seguem valendo. ⚠️ A forma curta diferencia maiúscula: só o código longo passa por `toLowerCase`. Todo texto que vai para fora do painel (mensagens, link, formulários do site) usa `ORIGEM_PUBLICA` (`lib/origem.js`, `https://www.sweetcoffeeweek.com.br`), nunca o endereço da barra — aberto na prévia do Vercel, o painel copiava `…-eloidesignstudio.vercel.app`. O teste reprova `window.location.origin` em `painel-app/src`.
- ⚠️ Fica de fora do formulário: canais de delivery (declarações alimentares e trocas entraram na v2). O horário entra dia a
  dia em `participacao_unidades.horario_festival` (v4, 23/10/2026); alergias vêm em "Observações".
- **v2 (16/10/2026, pedido do Wilker: "o jeito mais fácil de preencher"):** topo com 3 fatos (datas,
  combo, valor) + prazo, sem agenda; uma confirmação só no fim; opcionais recolhidos em `<details>`;
  ícones do registro (`<!--icone:…-->`, página listada em `icones/especificacao.json` › `estaticos`).
  Quase tudo por seleção: alergênicos (contém / "Nenhum" / traços), características (vegano,
  vegetariano, sem lactose, sem açúcar), troca por item (Sim/Não, disponibilidade, acréscimo em
  valores prontos), custos em valores prontos + "Outro", cidade (Natal/Parnamirim/Outra), bairro com
  sugestões, horários por dias + "das/às" (v4, 23/10/2026: hoje é o seletor do horário no festival, abaixo).
  Migration `20261016_link_preenchimento_alimentar.sql`: o retrato e o "Aplicar" passam a cobrir
  `declaracoes_alimentares` e `substituicoes`. ⛔ Desmarcar selo não grava "não": vira `nao_informado`
  só se antes estava marcado; alergênico só vira `nao_contem` quando a pessoa respondeu a pergunta.

- **v3 (22/10/2026, pedido do Wilker: "horários diferentes por dia" e "facilite ao máximo", mobile e Nexa):**
  - ~~Horário por dia~~ (texto `Seg a Sex, 10h às 22h; …` em `horarios`/`horario_loja_texto`, corte em 300/200
    caracteres, "a loja abre igual ao combo?") — **superado pela v4**: hoje é uma lista de períodos em
    `horario_festival`, uma pergunta só. O texto antigo só aparece como "Hoje está: …".
  - **Contador ao vivo** no rodapé fixo (`faltas(false)` conta, `faltas()` pinta). Máscaras de WhatsApp, CEP
    e CNPJ **só ao digitar** (nunca reescrevem o que já veio salvo); Instagram vira `@usuario`; número,
    e-mail e CEP malformados entram na lista do que falta.
  - **Tipografia: duas vozes** (§6.5) — Slab nos títulos, Nexa na interface (rótulo, opção, botão), Nexa Text
    na leitura e nos campos; só 400 e 700 na sem serifa (`font-synthesis: none`). O kit carrega pelo JS,
    dentro do script único da página (o teste exige UM `<script>`).

- **v4 (23/10/2026, pedido do Wilker: "a gente tem que saber o horário em que a loja vai funcionar durante o festival"):**
  uma pergunta só por loja — "Como esta unidade funciona nos dias do festival?" — com o mesmo desenho do seletor do painel
  (Igual todos os dias · Muda conforme o dia → Segunda a sexta/Sábado/Domingo → Detalhar dia a dia; Abre/Não abre; até 2
  períodos; resumo "Fica assim"/"Falta responder"). A página carrega uma CÓPIA ES5 do módulo
  `src/edicao/dados/horarioFestival.js` (bloco marcado por comentário); `tests/preencher-horario.test.mjs` prova a paridade em
  `node:vm` e reprova se o HTML ainda perguntar `horario_loja`/`horario_combo`. As datas vêm de `info.edicao.inicio/fim`
  (nunca no código). O envio manda `unidades[].horario_festival = [{data, abre, fecha}]` só COMPLETO (incompleto entra em
  "Faltam N itens", com o foco no ponto certo). `preenchimento_estado` devolve `horario_festival` e o texto antigo
  `horario_combo` (só para "Hoje está: …"); não devolve mais `horario_loja`. Envio ANTIGO (texto) segue aceito:
  `horario_festival_de_texto` o converte no "Aplicar". A equipe lê o envio como "Horário no festival" em frases
  (`diferencasEnvio(atual, enviado, edicao)`: sem `edicao` nunca diz "todos os dias"; o "WhatsApp no site: Não → Sim" volta como linha da
  revisão e o `<details>` da loja abre quando o número vem preenchido e sem autorização). O rascunho local (iPhone: a aba recarrega ao voltar do
  WhatsApp) guarda o estado do seletor por loja em `horario_rascunho` (`{ modo, dias }`, mesmo incompleto; só quando `coletar(true)` monta o rascunho,
  nunca no envio) e vale mais que o gravado; "Igual todos os dias" com horários diferentes avisa "Usei o horário de <dia> em todos os dias" com
  "Desfazer" (a página não tem modal); `alvo()` da lista "Faltam N itens" é resolvido no clique; botões e legendas levam o dia/loja no nome acessível.
  Site: `estadoAgora(u, agora, periodo)` — dentro do festival, dia sem linha = `sem_horario_hoje`; "fora do período" só fora dele.
  Teste de navegador: `node tests/preencher-navegador.mjs` (de dentro de `tests/`; P1–P6 na página real, backend falso).
  - ⚠️ **O kit `ngx4uek` baixa ~90 arquivos / ~3 MB** (dezenas de famílias sem uso): a Nexa chega em ~3,5 s
    em 4G e ~17 s em 3G, e até lá a página aparece em Slab (sem texto invisível). Enxugar o kit no Adobe Fonts
    (só Nexa e Nexa Text) resolve a página, o painel e o site de uma vez. `events:false` não adianta.
