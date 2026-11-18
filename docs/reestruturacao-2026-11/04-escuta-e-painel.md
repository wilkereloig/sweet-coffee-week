# 04 · Escuta e painel

## 1. O que já existe (e está subaproveitado)

| Canal | Quem escreve | Onde cai | A organização lê onde | Problema |
|---|---|---|---|---|
| Contato, assunto "Sugestão ou feedback" | público | `contact_requests` | Contatos › Recebidos do site | misturado com dúvida e imprensa |
| Avaliação de combos: "O que você está achando do festival?" e "Tem alguma sugestão?" | público | `avaliacoes.comentario_evento` e `.sugestao_festival` | **em lugar nenhum** | 1.001 comentários e 565 sugestões gravados sem tela |
| "Sua opinião" das casas (`/painel/#opiniao`) | casas | `feedback_casa` | só ficha a ficha, em Comunicação | não há lista geral nem resumo |
| Temas propostos | casas | `temas_propostos` | Participantes › Temas | separado dos temas sugeridos pelo público |
| Mensagens | casas ⇄ organização | `mensagens` | Marcas e Mesa | funciona |
| Pesquisa e feedback da Lovers | público | `feedback_geral`, `pesquisa_lovers` | só por função de leitura, sem tela | legado esquecido |

Não existe: página pública de opinião, fila de moderação, consentimento para publicar texto, aviso por
e-mail à equipe quando chega mensagem, confirmação para quem enviou.

## 2. O desenho

**O público fala pelo Contato** (assunto "Sugestão ou feedback") e pela avaliação de combos; **as casas falam
no painel** (já existe); **uma tela só para a organização ler tudo** (painel › Escuta).
Sem página própria de opinião: decisão D4 do Wilker, 18/11/2026.

Princípios:

1. **Ler antes de publicar.** Nada enviado pelo público aparece no site sem a organização pedir autorização
   a quem escreveu, por e-mail, antes.
2. **Uma leitura, várias origens.** A tela "Escuta" junta o que vem do Contato e da avaliação de combos. Nada é copiado de tabela: é uma consulta que une as duas.
3. **Fechar o ciclo.** O que foi pedido e virou mudança aparece em "Você pediu, o festival fez". É o que
   prova que a escuta existe.
4. **Casa não é público.** A opinião da casa fala de operação, venda e materiais; fica privada e nunca vai
   para o site.

## 3. Público: sem página própria (D4)

O Wilker decidiu em 18/11/2026 manter só o Contato. Sai do plano: a página `/sua-opiniao`, a tabela
`opinioes`, o envio próprio e os e-mails de confirmação. O que fica: o assunto "Sugestão ou feedback" do
Contato, separado na tela "Escuta" de dúvida e imprensa.

## 4. Casas: o que muda

O formulário "Sua opinião sobre a edição" continua como está. Entram:

1. **Lista geral no painel** (hoje só dá para ler abrindo ficha por ficha).
2. **Resumo:** quantas casas responderam, média de recomendação, quantas querem voltar (sim, talvez, não),
   os marcadores mais citados em "o que pode melhorar".
3. **Lembrete:** quem não respondeu recebe uma mensagem no painel uma semana depois do fim da edição.
4. **Antes da edição:** as casas confirmadas respondem a uma pergunta só, "O que você precisa da organização
   nesta edição?", na tela inicial do painel. Usa a mesma tabela, com um campo `momento` (antes/depois).
5. **Casas interessadas:** as duas perguntas novas do registro de interesse (`03-textos.md` §6.8) entram em
   `quero_participar.payload`, que já aceita campos extras.

## 5. Painel: o módulo "Escuta"

Novo item no menu da organização, entre Contatos e Operação. Permissão: `dado.ler` para ler; para mudar estado
e publicar, a mesma permissão de escrita que hoje vale para Contatos › Recebidos do site.

| Aba | Mostra | Ações |
|---|---|---|
| **Público** | comentários e sugestões da avaliação + "Sugestão ou feedback" do Contato, com filtro por assunto, edição, estado e origem | marcar como lida, responder por e-mail, arquivar, anotar |
| **Casas** | a lista geral de `feedback_casa` e o resumo do item 4 | abrir a ficha da casa, exportar |
| **Temas** | todos os temas sugeridos, de público e de casas, agrupados por tema igual, com contagem | marcar "em estudo", "usado", "descartado" |
| **Casas indicadas** | indicações do público, agrupadas por casa, com contagem e se a casa já registrou interesse | abrir a candidatura, convidar |
| **Para publicar** | só textos com autorização | recortar o trecho, publicar, retirar |
| **Você pediu, o festival fez** | a lista que alimenta a seção 8.4 da página | criar, editar, ordenar, ocultar |

O que a aba **Público** resolve de imediato: os 1.001 comentários e as 565 sugestões da Cartoon passam a ter
tela. Eles **não têm autorização de publicação** (a pergunta não existia), então entram só como leitura e
contagem; nunca vão para "Para publicar".

Também entram, por já estarem pagos pelo mesmo trabalho:
- **Contatos › Recebidos do site** ganha aviso diário por e-mail (hoje ninguém é avisado).
- **Edição › Avaliações**: a exportação passa a levar os dois textos que hoje ficam de fora.

## 6. Apoiadores

Sem tabela nova. A lista já está em `sweetCoffeeHistory.js` (`patrocinadores.parceiros`, por edição) e os
logos da Cartoon em `imageLibrary.js`. O site passa a ler a última edição dali. Regras:

- Só a **última edição** aparece em Apoiar e na Home, sempre com a edição e o mês.
- Na página de cada edição, "Quem apoiou esta edição" só aparece onde a base tem registro.
- Logo oficial, sem recolorir. Sem logo oficial, só o nome.
- Interesses de apoio continuam em `support_interests` e em Contatos › Recebidos do site.

## 7. Privacidade e termos: o que precisa entrar

Hoje nenhum documento prevê publicar texto enviado pelo público. Antes de publicar o primeiro trecho:

**Política de Privacidade**
- Dizer que mensagens do Contato podem ser usadas para planejar edições e, só com autorização pedida antes,
  publicadas em trecho.
- Incluir a avaliação de combos e os seus comentários, que hoje só aparecem de passagem.
- Incluir a "Sua opinião" das casas.
- Incluir Brevo e Resend na lista de fornecedores.

**Termos de Uso**
- Autorização de publicação: quem responde "sim" ao pedido da organização autoriza o festival a publicar o texto, inteiro ou em
  trecho, no site e nas redes, com o primeiro nome, sem remuneração.
- Moderação: o festival escolhe o que publica e pode recusar ou retirar.
- Retirada: quem escreveu pode pedir a retirada a qualquer momento pelo Contato.
- O que não é aceito: ofensa, dado pessoal de terceiros, propaganda, acusação a uma casa (esta vai para o
  suporte, não para a página).

**Uso de imagem**
- A página passa a se chamar "Uso de imagem e de texto", com o mesmo caminho de retirada.

## 8. O que fica de fora de propósito

- **Mural aberto, comentário público sem moderação, curtida e resposta entre usuários:** risco de ofensa e de
  acusação a casas, e exige moderação diária. Entra só se a página provar volume.
- **Avaliação de casas fora da edição:** o site não vira guia de notas.
- **Login para o público:** nenhum. Nome e e-mail são opcionais.
- **Resposta automática por IA:** nenhuma. Quem responde é a organização.

## 9. Primeiro passo que não depende de nada

Ler o que já chegou. As 565 sugestões e os 1.001 comentários da Cartoon estão no banco. Um resumo por
assunto (o que mais pediram, o que mais elogiaram, o que mais atrapalhou), junto das respostas das casas em
`feedback_casa`, dá o material da primeira lista "Você pediu, o festival fez" e orienta a próxima edição
antes de qualquer tela nova.
