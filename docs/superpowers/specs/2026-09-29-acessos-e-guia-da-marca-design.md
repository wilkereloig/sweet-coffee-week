# Acessos das marcas + guia da marca — design

29/09/2026. Pedido do Wilker Eloi: "Aprimoramento do sistema de acessos dos
participantes" e "Sistema de notificações, pendências e orientação do
participante". Decisões dele nesta conversa:

- aprovação = **cadastro inteiro**, com **pedido de correção num campo**;
- **Bloquear** (pausa) ≠ **Desativar** (conta encerrada), os dois reversíveis;
- navegação da marca: **Início · Meu cadastro · Meu combo · Fotos · Arquivos**;
- tudo (A, B, C) antes de publicar.

Estado de partida: as 18 marcas da 2026.2 já têm conta (lote de 29/09).

## O que já existe e fica

| Pedido | Já existe |
|---|---|
| Senha só em hash; admin nunca vê a definitiva | Supabase Auth (bcrypt). A temporária não é guardada em lugar nenhum |
| Troca obrigatória no 1º acesso | `perfis.deve_trocar_senha` + `DefinirSenha` + `marcar_senha_trocada` |
| Redefinir senha | Edge `regerar-senha-conta` |
| Desativar | `perfis.ativo` + `conta_ativa()` na RLS |
| Histórico sem senha | `auditoria` |
| Pendências campo a campo com link para o campo | `pendenciasCadastro` / `linkDaPendencia` |
| Sino | `Central` + `notificacoes` |
| Revisão do combo | `participacoes.combo_status` (rascunho · em_analise · correcao_solicitada · aprovado) + `combo_revisao_nota` |
| Pedido da organização ligado a bloco | `solicitacoes.bloco` |

## Limites ditos com todas as letras

- **Login é o nome do estabelecimento**, não e-mail. "Alterar login" = renomear
  a marca; a Edge Function troca o endereço interno junto. Continua proibido
  renomear marca com conta por outro caminho.
- **Encerrar sessões** corta a renovação na hora; o token já aberto vale até
  vencer (~1 h). A tela diz isso.
- **Mensagem configurável**: fica para depois (o pedido diz "futuramente").
- **Recuperar acesso** pela marca continua sendo pela organização (o login não
  tem caixa de entrada). A tela de login diz isso.
- **Entregue ≠ aberto**: abrir o WhatsApp registra "WhatsApp aberto", nunca
  "enviado". "Enviado" só por clique explícito do administrador.

## A · Acessos

### Banco (`20260930_acessos_marca.sql`)

- `perfis` + `bloqueado_em`, `bloqueado_motivo`, `senha_emitida_em`
  (quando a última senha temporária foi emitida).
- `conta_ativa()` passa a exigir também `bloqueado_em is null`.
- `acesso_envios (id, participante_id, user_id, canal in ('copiado',
  'whatsapp_aberto','enviado_manual'), at, ator_rotulo)` — RLS sem policy
  (só RPC).
- **Status do acesso**, derivado, uma função só (`status_acesso_marca`):
  `nao_criado` · `desativado` · `bloqueado` · `aguardando_envio` (senha
  emitida, nenhum envio depois dela) · `aguardando_primeiro_acesso` (envio
  registrado, senha ainda não trocada) · `ativo` (senha trocada).
  "Acesso gerado" do pedido = `aguardando_envio` (nasce assim).
- **Status do envio**: o último `acesso_envios` depois de `senha_emitida_em`,
  ou `nao_enviado`.
- RPCs (guardadas por `marca.liberar`, todas com `p_participantes uuid[]`
  para servirem à ficha e ao lote, todas gravando `auditoria`):
  `get_acessos_marcas` (status, envio, criado em/por, último acesso,
  senha trocada em), `registrar_envio_acesso(canal)`,
  `bloquear_acesso_marca(bloquear, motivo)`, `desativar_acesso_marca(ativo)`,
  `encerrar_sessoes_marca`, `forcar_troca_senha_marca`.
  Bloquear, desativar e forçar troca também encerram as sessões.
- Edge: `criar-acesso-marca` e `regerar-senha-conta` gravam
  `senha_emitida_em`; `regerar` encerra as sessões. Nova
  `alterar-login-marca` (renomeia marca + endereço interno, só marca com conta).

### Painel da organização

- **Lista de marcas**: caixa de seleção por linha, "selecionar todas as
  visíveis" e barra de ações em lote: Gerar acessos · Gerar novas senhas ·
  Copiar acessos · Marcar como enviado · Bloquear · Desbloquear · Forçar troca.
  Confirmação em toda ação que muda conta. Selo de status do acesso e do envio
  na linha; filtro por status do acesso.
- **Resultado do lote** (criar ou regerar): "N acessos criados", **Copiar todos
  os acessos** (formato do pedido: Estabelecimento / Responsável / Login /
  Senha temporária / Acesso), e tabela Participante · WhatsApp · Login · Senha ·
  Acesso · Envio · Ações (Copiar · WhatsApp · Marcar enviado · Gerenciar).
  Copiar e abrir o WhatsApp registram o envio.
- **Marca que já tem conta** nunca ganha segunda conta: no lote ela fica de
  fora de "Gerar acessos" e entra em "Gerar novas senhas" com o aviso
  "Esta marca já tem acesso ativo. Gerar nova senha temporária?".
- **Ficha › Acesso** vira a central: login, WhatsApp, status, criado em/por,
  último acesso, senha trocada em, envio; ações Copiar acesso · Enviar pelo
  WhatsApp · Gerar nova senha temporária · Alterar login · Bloquear/Desbloquear
  · Encerrar sessões · Forçar troca · Desativar/Reativar; e o histórico só das
  ações de acesso.
- **Mensagem do WhatsApp** (texto do pedido, com o nome do responsável).

### WhatsApp = telefone

- Rótulo "WhatsApp" nos dois formulários (marca e ficha), máscara
  `(84) 99999-9999` ao digitar, validação (DDD brasileiro válido, 10 ou 11
  dígitos, celular com 9). Grava formatado; `telefone_normalizado` (já gerado
  no banco) segue sendo a forma de máquina. `linkWhatsApp` já põe o 55.

### Marca

- Conta: "Alterar minha senha" (reusa `DefinirSenha`) além de avisos e sair.
- Conta bloqueada/desativada: ao entrar, tela "Seu acesso está pausado —
  fale com a organização", em vez de erro genérico.

## B · Guia da marca

### Navegação

`inicio · cadastro · combo · fotos · arquivos` (cinco, cabem no celular).
Ocultas (abertas do Início e do sino): `pedidos`, `mensagens`, `guia`.

- **Meu cadastro** = blocos A marca + Onde encontrar.
- **Meu combo** = O tema + Os três itens + Preço e detalhes.
  Os dois são o mesmo `Cadastro.jsx` com `blocos=[…]` — mesmo salvamento
  automático, mesmo "concluir".
- **Fotos** = sessão de fotos (sai do Cadastro), guia de fotos e fotos
  oficiais (arquivos da categoria combo; vazio vira "Ainda não disponíveis.
  Você será avisado quando forem liberadas.").
- **Arquivos** = os downloads de hoje, sem a categoria de fotos.
- Links antigos (`hoje`, `cadastro/2/…`, `pedidos/…`, `arquivos`) seguem
  valendo: `cadastro/<1|2|3>` vai para `combo`.

### Uma fonte para o estado da marca

`useResumoMarca()` (novo) carrega uma vez participação, itens, unidades,
correções, pedidos, sessões, arquivos e leituras, e entrega:
`progresso` (campos obrigatórios preenchidos ÷ obrigatórios — a lista é a de
`pendenciasCadastro`, nada de porcentagem inventada), `etapas` (Dados do
estabelecimento · Tema · Itens · Preço · Onde encontrar · Fotos · Análise),
`pendencias` (cadastro + correções + pedidos + arquivos para ler),
`proxima`, `contagem por vista` (os números das abas).
A casca usa para os números; o Início usa para tudo.

### Início, nesta ordem

1. Situação: "Olá, <responsável>" + "Seu cadastro está N% concluído" + etapas.
2. Ações necessárias: "Você tem N pendências", cada uma com o botão que abre o
   campo exato (e o comentário, se for correção).
3. Próxima ação: "Continue de onde parou: <campo>" [Continuar].
4. Status do combo (em preenchimento · em análise desde <data> · alteração
   solicitada · aprovado).
5. Avisos recentes (3 últimos do sino).
6. Arquivos disponíveis (contagem + link).
7. Atalhos: Meu cadastro · Meu combo · Fotos · Arquivos · Falar com a
   organização.
Depois, o que já existe: combos vendidos, vouchers, cronograma, minha história.
O que está concluído fica recolhido em "Concluído (N)".

### Sino

Nível por tipo (`NIVEL_NOTIFICACAO` na lib, ícone + rótulo, nunca só cor):
informação · atenção · pendência · alteração solicitada · aprovado · arquivo
disponível. Aviso com ação ganha botão ("Corrigir agora", "Ver arquivo",
"Responder") que abre o destino exato.

### Estado do campo

Ao lado do rótulo, com ícone + texto: Completo ✓ · Falta ! · Alteração
solicitada ↺ (com o comentário embaixo do campo) · Em análise · Aprovado.

### Feedback

Mensagens curtas e discretas: "Informações salvas", "Enviado para análise em
<data>", "Alterações enviadas novamente".

### Ícones

Os do próprio painel (traço fino, grade 24/32), acrescentando os que faltam no
mesmo desenho. Não entra `ScwIcon` (traço 3.2) no painel: seriam duas
linguagens na mesma tela.

## C · Correção por campo e pedido ligado a campo

- `correcoes_campo (id, participacao_id, campo, bloco, comentario, estado in
  ('aberta','corrigida','resolvida'), criada_em, criada_por_rotulo,
  corrigida_em, resolvida_em)`; a marca lê as suas (sem o nome de quem pediu).
- Organização, na ficha › Cadastro: "Pedir correção" em cada campo, com motivo
  → `pedir_correcao_campo`: cria, põe o combo em `correcao_solicitada`, avisa a
  marca com link para o campo.
- Marca: vê o motivo junto do campo; "Enviar novamente para análise"
  (`marca_reenviar_analise`) → correções `corrigida`, combo `em_analise`, avisa
  a organização.
- Aprovar o cadastro (a ação que já existe) resolve as correções abertas e
  avisa a marca ("Cadastro aprovado").
- `solicitacoes` + `campo` e `prioridade` (normal · importante): o pedido
  manual aparece no sino, nas pendências do Início e na seção do campo.

### Visão da organização

`get_participantes` passa a trazer `campos_faltando`, `campos_total`,
`correcoes_abertas`, `pedidos_abertos`, `ultima_atividade` (a lista de
obrigatórios sai da mesma função SQL que `marca_concluir_cadastro` usa).
Linha da marca: "Cadastro 85% · 2 pendências · atualizado 29/09".
Filtros novos: sem pendências · com pendências · cadastro incompleto ·
aguardando aprovação · alteração solicitada · sem atividade há 7 dias.

## Testes

- Unidade: status do acesso, máscara/validação do WhatsApp, progresso e
  etapas, níveis de aviso, mapeamento de links antigos, texto do "copiar
  todos".
- Banco: bloco `do` que termina em exceção (autorização por RPC, bloquear
  corta RLS, correção → reenvio → aprovação).
- Os testes de estrutura da casca da marca (`painel-infra`) mudam junto.

## Fora

Mensagem configurável; recuperação de senha pela própria marca; entrega
confirmada do WhatsApp (não existe como saber).
