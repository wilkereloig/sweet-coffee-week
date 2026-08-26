# INSTRUÇÃO — Construir o Painel SCW (organização + participante)

Fonte de verdade deste documento: `Painel SCW app.dc.html` (protótipo funcional,
lido linha a linha em 26/08/2026) e `handoff/painel-scw.html` (a mesma coisa,
exportada). Se os dois divergirem, o `.dc.html` é o mais recente. Este arquivo
descreve **o que construir e por quê**; `handoff/APLICAR.md` descreve **as
regras mecânicas do repositório** (formato de arquivo, testes, caminhos,
tokens). Os dois valem ao mesmo tempo — não escolher um.

É um aplicativo só, para dois públicos. Depois do login a casca é a mesma;
muda o que cada papel vê dentro dela.

---

## 0. Tradução de padrão — de componente para HTML estático

O protótipo é escrito em componente (`{{ valor }}`, listas que se repetem,
estado). O destino são dois arquivos de função-e-`innerHTML`, como
`public/organizacao/index.html` e `public/marca/index.html` já são. Ao portar:

| No protótipo | No arquivo real |
| --- | --- |
| bloco condicional (mostra/esconde por estado) | alternar `hidden` no elemento, como `ver()` já faz nos dois arquivos reais |
| lista que se repete | função que monta `innerHTML` a partir do array, com `escapar()` em todo campo de banco — como `desenharUnidades()`, `montarItem()` |
| estado (o que está aberto, o que já foi lido) | variável no topo do `&lt;script&gt;` + uma função `render*()` chamada depois de toda mudança, como `render()` já existe em `public/organizacao/index.html` |
| clique num elemento | `addEventListener` ou atributo montado junto do `innerHTML`, nunca inline `onclick=""` com string concatenada (risco do mesmo tipo que `escapar()` previne) |

Não trazer React/JSX para dentro de `public/painel/index.html`. A casca visual
e a interação vêm do protótipo; a técnica de implementação vem dos dois
arquivos reais.

---

## 1. Tela de login

Fundo chocolate (`--scw-choco`), texto creme. Não é uma tela neutra de
"sign in" — é a porta do aplicativo do festival, então tem peso de marca:
selo grande no topo, título e texto que nomeiam o Sweet & Coffee Week (o
protótipo hoje só diz "Área de acesso" — reforçar o nome do festival no texto,
não só no logo, para valer como "boas-vindas de aplicativo").

**Estrutura:**
1. Selo do festival, título "Área de acesso" (ou equivalente que nomeie o
   Sweet & Coffee Week), uma linha de boas-vindas.
2. Erro de login (se houver): faixa laranja (`--scw-laranja`), ícone de alerta,
   "Senha não confere. Tente de novo ou peça uma nova à organização."
3. **Dois cartões lado a lado**, mesma forma, cor de acento diferente:

| | Organização | Participante |
| --- | --- | --- |
| Ícone (fundo) | pessoas · `--scw-amarelo` | sacola · `--scw-cyan` |
| Título | "Organização" | "Participante" |
| Descrição | "Equipe do Sweet & Coffee Week. Vê todas as marcas e move o caminho." | "Sua casa. Cadastro do combo, pedidos e a venda de cada dia." |
| Campo | senha da equipe (password) | login da marca (texto — nome do estabelecimento, não e-mail) |
| Botão | "Entrar no painel", chapado amarelo | "Entrar no painel", chapado cyan |

4. Rodapé: link "Primeiro acesso da marca" + "Perdeu o acesso? Fale com a
   organização no WhatsApp."

**Tela "Primeiro acesso"** (fundo creme): título, uma linha explicando que a
senha da organização deixa de valer, dois campos de senha nova, nota "pelo
menos 8 caracteres", botão "Salvar e entrar", link "Voltar ao login".

**Autenticação real** (não a do protótipo):
- Organização: hoje é senha única compartilhada
  (`docs/INSTRUCAO-painel-fase2.md`). Se as contas por função já existirem
  (`docs/COMANDO-claude-code.md` §3.1 — administrador/curadoria/produção/
  consulta), o cartão ganha um campo de e-mail além da senha; a forma do
  cartão não muda.
- Participante: login pelo **nome do estabelecimento**, convertido em e-mail
  sintético por `slugificar()` — a função já existe em
  `public/marca/index.html`, copiar de lá.

---

## 2. Casca do aplicativo (compartilhada pelos dois papéis)

- **Desktop (&gt;900px):** rail de 72px fixo à esquerda — logo, 4-5 botões de
  ícone (52×52, `border-radius:17px`), botão Sair no rodapé do rail.
- **Celular (≤900px):** rail some, vira barra de abas fixa embaixo (mesmos
  destinos, ícone + rótulo minúsculo, indicador de fundo atrás do item ativo).
  Cabeçalho muda de creme/texto-chocolate para chocolate/texto-creme.
- **Cabeçalho:** título (peso 900) + subtítulo (peso 500) à esquerda; sino de
  notificação com contador à direita. No celular, logo pequeno à esquerda e
  botão Sair explícito (no desktop o Sair mora no rail).
- **Atalhos de teclado:** teclas 1–5 trocam de vista (quando o foco não está
  em campo de texto); `Esc` fecha a gaveta aberta.
- **Gaveta (drawer):** desktop = painel de 410px deslizando da direita;
  celular = folha subindo da base (86svh, cantos 24px). Quatro conteúdos
  possíveis — nunca dois ao mesmo tempo: notificações, ficha, responder pedido,
  formulário novo.
- Badge numérico (contagem nova) é sempre magenta (`--scw-magenta`), com anel
  na cor de fundo por trás (chocolate no rail, creme/chocolate no sino
  conforme o cabeçalho).

Botões de navegação ativos: fundo `--scw-amarelo`, ícone/texto chocolate.
Inativos: transparente, ícone/texto creme a 60-72% de opacidade.

---

## 3. Painel da Organização — cinco vistas

### 3.1 Mesa
Kanban de 6 colunas fixas, cada uma com legenda e contagem:

`Novas` (chegaram pelo site) → `Em análise` (a equipe está lendo) →
`Contatadas` (conversa aberta) → `Aprovadas` (entram na edição) →
`Com acesso` (preenchendo o cadastro) → `Completas` (combo fechado).

Cada card: nome da marca, tipo, data, bolinha magenta se for novo. Clique abre
a gaveta **ficha**. Scroll horizontal.

### 3.2 Respostas
Filtro por origem em abas-pílula: `tudo` · `Quero participar` (cyan) ·
`Participar` (amarelo) · `Apoiar` (laranja) · `Contato` (roxo) — cada aba com
contagem. Lista abaixo: nome + indicador novo, meta (`origem · responsável ·
tipo`), selo da etapa atual, data. Clique abre **ficha**.

### 3.3 Marcas
Só quem já está em "Com acesso" ou "Completas". Botão "Cadastrar marca" no
topo (abre **formulário** tipo marca — cria conta e acesso direto, sem passar
pelo funil de Respostas). Grade de cards: ícone, nome, meta, três chips
coloridos (doce/salgado/bebida — preenchido = bege/chocolate, vazio = tom
apagado/marrom) e nota de progresso ("combo fechado" / "falta um item" /
"faltam N itens").

### 3.4 Produção
**Agenda de fotos** — bloco em destaque (bege), com dois modos alternáveis
por botão segmentado:
- **Abrir vagas:** clique num horário alterna aberto ↔ fechado. Reservado
  **não fecha por clique neste modo** (é a marca quem escolheu).
- **Marcar eu mesma:** clique alterna reservado (atribuído por quem organiza)
  ↔ aberto.

Grade de 4 dias × 4 horários (09h/11h/14h/16h), cor por estado (aberto cyan,
reservado chocolate, fechado só contorno) + legenda.

Abaixo, três blocos de lista, cada um com botão "+ Novo…" que abre o
**formulário** correspondente:
- **Pedidos e prazos** — o que foi pedido, para quem, até quando, selo
  Aberto/Respondido.
- **Arquivos** — documentos publicados, selo Publicado.
- **Sessões de fotos** — marca, local, data/hora, selo Agendada/Realizada.

### 3.5 Equipe
Card em destaque (chocolate): qual é a edição aberta (campo de texto do
código, ex. `2026.2`) + botão Salvar — é o que decide se uma marca nova tem o
que preencher ao entrar. Abaixo, lista de contas da organização: nome, e-mail,
função (badge — Admin/Produção/Curadoria/Consulta).

---

## 4. Painel do Participante — quatro vistas

### 4.1 Hoje
- **Combos vendidos** (bloco chocolate): se a edição está **em curso**, campo
  numérico do dia + botão Salvar/Atualizar + total acumulado da edição +
  faixa com os últimos dias lançados. Se **ainda não abriu**, aviso "o
  lançamento abre no primeiro dia da edição" no lugar do campo — os dois
  estados não coexistem.
- **Pendências do cadastro:** se falta algo, lista cada bloco faltante com
  prazo e link direto; se está tudo entregue, mensagem de confirmação.

### 4.2 Cadastro
Barra de progresso segmentada (uma faixa por bloco) + "N de 5 prontos".
Acordeão de blocos — abrir um fecha o anterior; salvar um bloco abre
automaticamente o próximo pendente. Cada bloco tem ícone, selo (pronto / prazo
restante) e os campos daquele bloco. **Os nomes e campos dos blocos seguem os
cinco blocos reais do cadastro** (ver `handoff/APLICAR.md`, seção "Os cinco
blocos do cadastro"), não os cinco do protótipo — o protótipo foi desenhado
antes de ler `public/marca/index.html` e por isso simplifica: falta o bloco de
tema (02) inteiro, falta preço (04) inteiro, e trata endereço como um campo
único em vez de uma lista de unidades repetível. **Isto não é uma divergência
para perguntar — o dado real é mais completo e já está em produção; seguir
ele.** O padrão visual do acordeão (ícone, selo, abrir/fechar, avançar
sozinho) é o que se mantém do protótipo.

O bloco de fotos é especial: em vez de campos, mostra as vagas abertas pela
organização (dia + horário) e um botão "Confirmar horário"; sem vaga aberta,
mostra aviso.

### 4.3 Pedidos
Lista do que a organização pediu: ícone (relógio = pendente, check = feito),
nome, nota, selo de prazo (cor por urgência: ≤3 dias laranja, ≤7 dias amarelo,
mais que isso neutro), botão "Responder" nos pendentes — abre a gaveta
**responder**.

### 4.4 Arquivos
Grade do que a organização publicou para essa marca ou para geral: ícone,
nome, meta (tipo/versão).

---

## 5. Sistemas compartilhados (moram na gaveta)

### 5.1 Notificações
**Sempre derivadas dos mesmos dados que already aparecem nas vistas — nunca
texto fixo.** Replicar a lógica de `_notificacoes()`:

- **Organização vê:** marca atrasada num pedido (prazo vencido), marca que
  acabou de completar o combo, quantidade de respostas novas por origem,
  sessão de foto confirmada de alguma marca, marca que fez o primeiro acesso.
- **Marca vê:** lembrete de lançar a venda de ontem (só se a edição está em
  curso), pedido pendente mais antigo, status da própria sessão de fotos
  (confirmada, ou quantas vagas há abertas), item do combo recém-aprovado,
  quantos blocos do cadastro faltam, arquivo novo publicado.

Clique num item leva à vista correspondente e marca como lida. Badge do sino
**pulsa 3 vezes e para** (nunca continua pulsando). "Marcar todas como lidas"
só existe dentro da própria gaveta de notificações.

### 5.2 Ficha (detalhe da marca/resposta) — só organização
Ações no topo: WhatsApp (sempre), "Mover para [próxima etapa]" (sempre,
exceto já em Completas), "Criar acesso" (**só a partir de "Aprovadas" —
nunca antes**). Criar acesso mostra login+senha **uma única vez** com aviso
"copie agora, não volta a aparecer" + botão copiar. Abaixo, grade de campos
(responsável, tipo, origem, contato, etapa, carro-chefe), nota interna (só a
equipe vê) e, por fim, "apagar registro" isolado visualmente (contorno
laranja) como zona de risco.

### 5.3 Responder pedido — só marca
Faixa com o prazo (cor por urgência), a nota do pedido, campo de resposta,
opção de anexo, botão enviar.

### 5.4 Formulário novo — só organização
Um único componente de gaveta serve quatro finalidades — cadastrar marca,
novo pedido, agendar sessão, publicar arquivo — trocando só os campos e o
texto do botão conforme o que abriu.

---

## 6. Seis regras já decididas — não redecidir

| Regra | Onde vive |
| --- | --- |
| Notificação é sempre derivada do dado real, nunca string fixa | função de notificações |
| A agenda é dona da data da sessão — a notificação de "sessão confirmada" lê o horário reservado, não um campo solto | leitura do slot da agenda |
| Chip de item do combo (preenchido/vazio) usa cor sólida diferente, nunca a mesma cor com opacidade variável | chip do combo, nas vistas Marcas e Cadastro |
| "Criar acesso" só aparece a partir de "Aprovadas" — nunca em etapa anterior | ficha |
| No modo "abrir vagas" da agenda, clicar num horário reservado não o desmarca — só o modo "marcar" desmarca | agenda |
| O badge de notificação pulsa 3 vezes e para, nunca continua | sino do cabeçalho |

Mais duas coisas de arquitetura que também não mudam: os dois momentos da
edição (antes de abrir / em curso) nunca coexistem na mesma tela; e a casca
(rail, cabeçalho, gaveta) é uma só para os dois papéis — o que muda é o
conteúdo dentro dela, não a moldura.

---

## 7. Visual — cores

Nove tokens, fechados — nenhum hex fora destes (ver `handoff/APLICAR.md` para
o bloco `:root`):

| Tom | Hex | Uso observado no protótipo |
| --- | --- | --- |
| Creme | `#FEF0DD` | fundo geral, texto sobre chocolate |
| Bege | `#F8E4C1` | colunas do kanban, chips preenchidos, seções de destaque neutras |
| Chocolate | `#3D1308` | rail, tab bar, cabeçalho estreito, blocos de destaque (agenda, hoje, equipe), texto principal |
| Marrom | `#6A2C15` | texto de apoio, legendas, metadados |
| Amarelo | `#FDBB1A` | acento da **Organização** (login, nav ativa, CTAs principais) |
| Cyan | `#01AFCC` | acento do **Participante** (login), vaga aberta na agenda, notificação tipo "info" |
| Roxo | `#4D257E` | só a tag de origem "Contato" — uso raro, não expandir sem motivo |
| Magenta | `#F10767` | indicador "novo", badges de contagem — nunca decorativo |
| Laranja | `#FF4810` | erro, alerta, prazo urgente (≤3 dias), zona de risco |

Regra de fundo: cada papel tem sua cor de identidade (amarelo = organização,
cyan = participante) usada com moderação — no login, e como toque de destaque
dentro do próprio painel. O resto do painel é neutro (creme/bege/chocolate).

## 8. Visual — ícones

Todos os ícones são desenhados à mão, inline, **não** um sprite nem biblioteca:
`viewBox="0 0 32 32"`, `stroke="currentColor"`, `stroke-width` entre 2.6 e 3,
`stroke-linecap`/`stroke-linejoin="round"`, `fill="none"` — exceto pequenos
detalhes sólidos (um ponto, uma cabeça de figura), preenchidos com
`currentColor`. **Copiar o `&lt;svg&gt;` de cada botão verbatim** do protótipo — não
redesenhar. Não importar `ScwIcon` (é React; estas páginas não passam pelo
Vite — mesma regra já registrada em `docs/INSTRUCAO-painel-app-shell.md` §3.3).

## 9. Visual — tipografia, forma, movimento

- Fonte única Nexa Slab em todos os pesos: 500 corpo, 700–800 rótulos/UI, 900
  títulos, com `letter-spacing` negativo nos títulos grandes.
- Botões são chapados (fundo sólido), nunca `box-shadow` — estado neutro usa
  anel `inset` fino. Hover sobe 2px.
- Cantos: 13–14px em itens de lista, 16–20px em cards e seções, 999px (pílula)
  em badges, chips e abas.
- Trilho de conteúdo: `max-width:1500px`, padding responsivo com `clamp()`.
- Movimento: entrada de vista com fade + subida leve (200ms), acordeão abre
  com a mesma curva, gaveta desliza da direita no desktop e sobe como folha no
  celular. Tudo desliga com `prefers-reduced-motion`.

---

## 10. Dados — do mock do protótipo para o banco real

| Nome no protótipo | É | Vira |
| --- | --- | --- |
| `BASE` | respostas dos formulários públicos + participantes já aprovados | junção de `quero_participar`/`participar`/`apoiar`/`contato` com `participantes`/`participacoes`, filtrada por RLS |
| `ETAPAS` (6 estágios) | funil completo, do formulário público até o combo fechado | **ver `handoff/APLICAR.md` — divergência com os 4 estados reais de `participacoes.status_cadastro`, não decidir sozinho** |
| `BLOCOS` (5, do cadastro) | conteúdo do acordeão da marca | os 5 blocos reais (seção 4.2 acima) — **esta parte já está resolvida, seguir o dado real** |
| `PEDIDOS` | pedidos com prazo | `solicitacoes` + `solicitacao_estado` |
| `ARQUIVOS` | arquivos para baixar | `arquivos` |
| `AGENDA_BASE` | slots de sessão de foto | `sessoes_fotos` |
| `CONTAS` | contas da organização | tabela de contas por função (`docs/COMANDO-claude-code.md` §3.1) |
| `FORMULARIOS` | não é dado — é a configuração de campos dos 4 formulários de criação | fica como configuração de UI mesmo; só os campos e o `POST` de destino viram reais |

Leitura é REST direto sob RLS, não Edge Function — padrão completo em
`handoff/APLICAR.md`, seção "Dados".
