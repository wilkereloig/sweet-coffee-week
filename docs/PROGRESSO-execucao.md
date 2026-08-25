# Progresso da execução — `docs/COMANDO-claude-code.md`

Início: 25/08/2026. Atualizado a cada fase concluída.

---

## Fase 1 · Backup — ✅ FEITO em 25/08 (depois de duas falhas)

✅ **Backup íntegro em `../backups-supabase/scw-2026-08-25-0323/`** — 18 tabelas,
4.289 linhas, todos os JSON válidos, contagens do disco batendo com o manifesto.
`votos` 2.702 e `feedback_geral` 1.582, que faltavam no parcial de 22/08.

⚠️ **Falta o esquema.** O comando pedia `supabase db dump`, que é linhas **e**
esquema; existe só linhas. Nove migrations vivem apenas dentro do Supabase, então
esses 2.702 votos não teriam tabela onde ser recolocados. Caminho: CSV do SQL
Editor + `scripts/recuperar-migrations.mjs`. **Decisão tomada:** seguir sem ela —
tudo que está sendo mexido tem zero linhas, e `votos`/`feedback_geral` não são
tocados.

### Por que demorou, e o que quebrou no caminho

**Eu não posso gerar o backup.** Não é escolha nem atalho:

| Ferramenta | Estado |
|---|---|
| `supabase` (CLI) | ausente na máquina |
| `psql` | ausente |
| `pg_dump` | ausente |
| `docker` | ausente |
| `npm run backup` | existe, e **exige `SUPABASE_SERVICE_ROLE_KEY`** |

A chave de serviço não pode ser lida por mim (`CLAUDE.md` A5) nem recebida por
chat — chave colada em transcrição é chave vazada, e o remédio passa a ser
rotacioná-la. **Só o Eloi roda o backup.**

**E o script estava quebrado.** Na primeira execução real, `npm run backup`
morreu em `admin_config` com `42703: column admin_config.1 does not exist`: ele
paginava com `order=1`, esperando "ordene pela primeira coluna", e o PostgREST
não aceita posição ordinal — lê o `1` como *nome* de coluna. **Toda** tabela
falharia. O bug estava escondido atrás da trava da chave: script que ninguém
consegue rodar é script que ninguém descobre que está quebrado.

Corrigido em `a2c508d`: a coluna passa a sair da primeira linha da própria
tabela. Não de `spec.definitions`, porque o spec do PostgREST muda conforme o
papel que pergunta (com a chave publicável ele devolve **zero** tabelas) — e
correção apoiada em suposição não conferida é exatamente como o `order=1`
nasceu.

### O que foi feito nesta fase, mesmo bloqueada

✅ **`.gitignore` fechado para dump.** O item 1 manda conferir antes de gerar, e
não havia regra nenhuma. `scripts/backup-supabase.mjs` grava em
`../backups-supabase/` (fora do repositório) por padrão, mas aceita caminho por
argumento — um caminho passado à mão cairia dentro do repositório e um dump com
nome, e-mail e telefone de gente real entraria no git. Regras acrescentadas:
`backups-supabase/`, `*.dump`, `*.sql.gz`, `db-dump*.sql`, `dump-*.json`.
⚠️ **Nunca generalizar para `*.sql`** — apagaria `supabase/migrations/` do git.

### ⚠️ Declaração: uma migration foi aplicada ANTES deste comando existir

Em 24/08, algumas horas antes de `COMANDO-claude-code.md` ser escrito, a
migration **`cadastro_completo_marca`** foi aplicada em produção **sem backup**.
Ela criou `participantes_itens`, `avisos`, `sessoes_fotos`, 8 RPCs, um trigger e
o bucket privado `combos`.

Circunstância, para dimensionar o risco: **todas as tabelas envolvidas estavam
com zero linhas** e nenhum caminho existente foi alterado. Não houve dado em
risco. Mas a trava foi violada, e fica registrado.

⚠️ **Essa migration precisa ser refeita**, por decisão de modelagem posterior
(marca permanente × participação por edição): `participantes_itens` e
`sessoes_fotos` apontam para `participante_id`, que sob o modelo novo passa a
ser *participação*, não *marca*. Com zero linhas, refazer é barato.

---

## Fase 2 · Blindagem dos formulários públicos — ✅ CLIENTE PRONTO, trava aguarda deploy

### ✅ Pronto e testado de verdade

**Edge Function `enviar-formulario`** (`supabase/functions/enviar-formulario/`),
v2, ACTIVE, `verify_jwt: false`. É a porta única dos formulários públicos.

Ela existe porque **Postgres não consegue validar Turnstile** — não há como
chamar a Cloudflare de dentro de uma RPC — e captcha conferido só no navegador
não vale nada, porque o robô não roda o JavaScript: chama `/rest/v1/rpc/` direto.

A função **não conhece a assinatura de nenhuma RPC**. Recebe `corpo` já no
formato que a RPC espera e repassa verbatim. Copiar as assinaturas para dentro
dela criaria a segunda fonte de verdade que o `CLAUDE.md` §5.2 proíbe.

| Barreira | Estado |
|---|---|
| 1 · campo-armadilha | ✅ ativa, conferida no servidor |
| 2 · tempo mínimo (3s) e teto de sanidade (24h) | ✅ ativa |
| 3 · Turnstile | ✅ código pronto · **v6 no ar** e chave **pública** posta em 25/08 · **desligado** até `TURNSTILE_SECRET_KEY` + `TURNSTILE_HOSTNAMES` existirem |
| 4 · limite por origem | ❌ **não implementada** — exige tabela para contar; ver abaixo |
| 5 · descarte silencioso | ✅ ativo |

**Testes feitos chamando o endpoint direto, sem passar pela tela**, como o §7 do
comando exige:

| Caso | Resultado |
|---|---|
| formulário fora da allowlist | `400` |
| armadilha preenchida | `{"ok":true}` — e **nada gravado no banco** |
| envio em 0,0 s | `{"ok":true}` — e **nada gravado** |
| carimbo no futuro (+10 min) | `{"ok":true}` — e **nada gravado** |
| envio legítimo | `{"ok":true}` — **gravou** |
| RPC recusando (corpo errado) | `{"ok":false,"message":"…"}`, erro honesto |

Confirmado por consulta ao banco: das três tentativas de robô, **nenhuma linha
nasceu**; só a legítima gravou. As linhas de teste que criei foram removidas com
guarda dupla no `WHERE` (empresa **e** data), e a candidatura real de 20/08 está
intacta.

🐛 **Um bug meu, que o teste pegou e que já está corrigido.** A v1 devolvia
`{"ok":true}` no bloqueio e `{"ok":true,"dados":null}` no sucesso. **Formatos
distinguíveis destroem o descarte silencioso** — o robô lê a diferença, conclui
que foi barrado e tenta outra tática, que é exatamente o que a medida existe
para impedir. A v2 devolve `{"ok":true}` nos dois casos, byte a byte, e por isso
**o retorno da RPC não é mais repassado**.

**`public/quero-participar/index.html` ligado à porta nova.** A armadilha deixou
de barrar no navegador e passou a viajar para o servidor: barrando no cliente, o
robô que roda JavaScript vê o botão não fazer nada e sabe que foi pego; indo ao
servidor, ele recebe a mesma tela de sucesso de quem enviou de verdade.
`CONFIG.funcaoEnvio` vazio devolve o formulário ao caminho antigo — saída de
emergência se a função cair.

Build verde (2,15 s). **85/85 testes** em `quero-participar`, `marca` e
`organizacao`.

### ❌ Não feito nesta fase

✅ **Contato e Apoiar também passaram a entrar pela porta.** Módulo novo
`src/lib/enviarFormulario.js`, com a **mesma assinatura do supabase-js**
(`(nome, payload)` → `{ error }`) — que é o contrato que `contactRequest.js` e
`supportInterest.js` já esperavam. As libs não foram tocadas e seguem testáveis
offline. Mudou **uma linha em cada página**, e o import órfão de `supabase` saiu.

### 🔴 CORREÇÃO DE DECISÃO: o `revoke` NÃO estava travado pelo backup

Eu havia registrado que `revoke execute on function public.submit_* from anon`
dependia da fase 1. **Está errado, e o motivo é pior:** ele depende do
**deploy**. A produção de hoje (`master`) serve a versão antiga de
`/quero-participar/`, que chama a RPC direto. Revogar agora **derruba o
formulário que está publicado** — o único que o público alcança.

A ordem correta é: publicar a versão nova → confirmar que o envio funciona pela
Edge Function → só então revogar. Publicar é item 4.4 do comando, decisão do
Eloi.

**Até lá, a Edge Function é caminho alternativo, não trava:** o robô ainda pode
chamar `/rest/v1/rpc/submit_*` direto e pular as quatro barreiras.

⚠️ A **barreira 4 (limite por origem)** também continua fora: contar envios exige
uma tabela, e uma contagem em memória do isolate não serve — cada requisição pode
cair num isolate diferente, então o teto seria contornado sem ninguém tentar.
Agora que o backup existe, ela deixou de estar bloqueada e vira trabalho normal.

- **Campo-armadilha nas telas React:** `/quero-participar/` tem; Contato e Apoiar
  não têm o input. O módulo já aceita o valor (`opcoes.armadilha`), então falta só
  o campo em cada formulário.
- **Correção do §7.2 do briefing:** ele afirma que não existe campo-armadilha em
  lugar nenhum. **Existe, em `/quero-participar/`** desde antes desta sessão
  (campo `site-web`, oculto, `tabindex="-1"`, com descarte silencioso). Era 1 de
  4 formulários protegidos, não 0 de 4. Minha própria varredura por
  "honeypot|armadilha" não achou porque o campo tem outro nome — grep por
  conceito não encontra o que foi batizado de outro jeito.

---

## Fase 3 · Autenticação da organização — ✅ PRONTA NO BANCO

Permissão virou **dado**, não código (item 3.1 do comando): duas tabelas,
`funcoes` e `permissoes`, semeadas com as quatro funções e seis ações.

| Função | Ações |
|---|---|
| `administrador` | as 6 |
| `curadoria` | `dado.ler` · `triagem.editar` · `marca.liberar` |
| `producao` | `dado.ler` · `triagem.editar` · `producao.gerir` |
| `consulta` | `dado.ler` |

**O guard saiu de booleano para pergunta de duas dimensões:**
`pode(p_secret, p_acao)` — quem é você, e esta ação está na sua função?
`pode_organizacao` virou uma linha em cima dele, e **as 22 RPCs que a chamam
não foram tocadas**. Foi para isso que a ponte da Fase 2 existiu.

Também entrou: tranca global de tentativa na senha compartilhada
(`tentativas_acesso` + `acesso_travado()`, 20 falhas em 15 min), o interruptor
`senha_unica_ativa` para a senha compartilhada ter data de morte,
`deve_trocar_senha` com default `true`, e três RPCs de gestão de conta com
trava de último administrador.

**Provado em transação revertida, com senha temporária — a real nunca foi
lida, e foi confirmado depois que ela voltou ao lugar:**

| Prova | Resultado |
|---|---|
| senha compartilhada abre as 6 ações | ✅ |
| ponte da Fase 2 + `admin_ping` + RPC real | ✅ |
| senha errada / nula / vazia | ✅ nega as três |
| conta `consulta` vê candidaturas | ✅ 1 |
| conta `consulta` lista contas | ✅ **0** — negado, como deve |
| conta `administrador` lista contas | ✅ 2 |
| guard de apagar / atualizar trocado | ✅ `registro.apagar` / `triagem.editar` |
| Security Advisor | **zero ERROR** |
| painel abre depois do revoke | ✅ |

### 🐛 A armadilha do `revoke` — a regra do projeto estava pela metade

O `CLAUDE.md` §4.1 dizia que `revoke ... from public` não basta, porque o
Supabase concede EXECUTE a `anon` e `authenticated`. Verdade — e incompleta:
**`revoke ... from anon, authenticated` também não basta**, porque o Postgres
concede EXECUTE a **`PUBLIC`** por padrão em toda função nova, e `anon` herda.

São os três alvos na mesma linha. `pode` e `acesso_travado` ficaram expostas em
`/rest/v1/rpc/` por quatro tentativas seguidas, todas retornando sucesso —
`revoke` de permissão que o papel não tem diretamente não dá erro, só não faz
nada. Fechou quando `public` entrou na lista. Regra corrigida no `CLAUDE.md`.

⚠️ **Conferir por `has_function_privilege`, nunca por ter escrito a linha.**

---

## Fases 4 a 9 — ⛔ NÃO INICIADAS

✅ **O backup foi feito em 25/08** — 18 tabelas, 4.289 linhas, todos os JSON
válidos, contagens do disco batendo com o manifesto. A trava do item 1 caiu, e
por isso a Fase 3 pôde ser aplicada.

⚠️ **Falta a metade do esquema.** O comando pedia `supabase db dump`, que é
linhas **e** esquema; o que existe é só linhas. Nove das migrations existem
apenas dentro do Supabase, então os 2.702 votos não teriam tabela onde ser
recolocados. Caminho: CSV do SQL Editor + `scripts/recuperar-migrations.mjs`.
Decisão tomada: seguir sem ela, porque tudo que está sendo mexido tem zero
linhas e `votos`/`feedback_geral` não são tocados.

| Fase | O que falta |
|---|---|
| 4 · Modelo de dados | refazer sob marca × participação; solicitações, arquivos, delivery, push |
| 5 · Painel da marca | depende de 4 |
| 6 · Painel da organização | depende de 4 |
| 7 · App instalável e push | depende de 4 |
| 8 · Testes | depende de 5 e 6 |
| 9 · Revisão final | depende de tudo |

---

## Fase 4 · Modelo de dados — ✅ PRONTA NO BANCO

**Correção de vocabulário que o Eloi fez, e que simplificou tudo:**
`participantes` **é** a marca — mesma entidade, dois nomes. Não existe tabela
`marcas`. O que faltava era o vínculo com a **edição**.

Isso permitiu fazer a fase inteira de forma **aditiva**: `participantes` não
perdeu uma coluna, as colunas de combo que já existiam lá seguem servindo
`/marca/` como está hoje, e **nada quebrou**. Era exatamente o que tinha me
feito parar antes.

| Tabela nova | Papel |
|---|---|
| `participacoes` | a marca **naquela edição**: tema, justificativa, preço, status |
| `participacao_unidades` | loja: endereço, bairro, **horário do festival**, delivery e canais |
| `solicitacoes` | aviso geral **e** solicitação direcionada, com prazo e bloco alvo |
| `solicitacao_estado` | uma linha por participação: quem respondeu, quem não |
| `arquivos` + `arquivo_leitura` | geral e por marca, com versão e confirmação de leitura |
| `push_subscriptions` | inscrições de notificação |

Mais: `abrir_participacao()` (idempotente, copia as unidades da edição
anterior), `cnpj`/`razao_social` opcionais, e o bucket privado `arquivos`.

**`avisos` sumiu** e virou caso particular de solicitação — escopo `geral`,
bloco `livre`. Manter as duas seria duas telas, dois gatilhos de push e duas
respostas para "o que me pediram". Tinha zero linhas.

**Delivery ficou por unidade, não por marca:** loja de shopping e loja de rua
costumam ter páginas de aplicativo diferentes, e uma pode entregar e a outra
não. Não é detalhe operacional — Delivery/Takeaway é categoria premiada.

### Provado em transação revertida — 12 de 12

| Prova | Resultado |
|---|---|
| abrir participação | ✅ |
| segundo clique não abre duas | ✅ idempotente |
| trigger cria os 3 itens por participação | ✅ `doce, salgado, bebida` |
| mesma marca em duas edições | ✅ sem colidir, 6 itens |
| rascunho **não** alcança ninguém | ✅ 0 estados |
| publicar abre o leque só na edição certa | ✅ **2**, não 3 |
| republicar não duplica | ✅ 0 |
| cobrança: pendentes / respondidas | ✅ 2/0 → **1/1** ao marcar uma |

Estado depois: senha real restaurada, **zero resíduo**, 26 tabelas e **todas com
RLS**, nenhum guard aberto a `anon`.

---

## Fase 5 · Painel da marca — ✅ CONSTRUÍDO E PROVADO NO BANCO

`public/marca/index.html` deixou de ler `participantes` + `participantes_operacao`
e passou a ler a **participação**. A migration que faltava está em
`supabase/migrations/20260825_fase5_painel_da_marca.sql`, aplicada.

### A tela, bloco a bloco

| Bloco | O que grava | Onde |
|---|---|---|
| 01 · A marca | nome, responsável, telefone, e-mail, Instagram, site, **CNPJ, razão social** | `participantes` |
| 02 · O tema | tema escolhido e justificativa | `participacoes` |
| 03 · Os três itens | doce, salgado e bebida: nome, descrição, ingredientes, **vegano / sem glúten / sem lactose por item** | `participantes_itens` |
| 04 · Preço | valor do combo | `participacoes` |
| 05 · Unidades | endereço, bairro, **horário DURANTE o festival**, delivery e o link de cada canal | `participacao_unidades` |

Mais, fora do formulário: **pedidos e prazos** (com "faltam N dias" / "venceu em"),
**downloads** por URL assinada de vida curta, e a **sessão de fotos** em leitura.

**Autosave de 900 ms** nas quatro tabelas ao mesmo tempo. Unidade é a única peça
com ciclo de vida: sem `id` vira POST e **recebe o id de volta na hora** — sem
isso, cada tecla numa unidade nova criaria outra linha.

### Decisões que valem o cliente saber

- ⛔ **Não há mais botão "reabrir cadastro".** O formulário nunca sai da tela
  depois de concluído, então não há o que reabrir. O estado no banco segue
  `cadastro_completo` até ela concluir de novo: alguém mexeu ≠ alguém desfez.
- **Delivery ficou por unidade, com três canais fixos** — aplicativo, WhatsApp,
  site próprio, cada um com link. Link preenchido = canal ativo. Um construtor de
  lista custaria "adicionar/remover" inteiro para produzir as mesmas três linhas.
- **O painel incentiva as restrições, não só pergunta** (briefing §3.2): a frase
  diz que marcar vegano/sem glúten/sem lactose amplia o público que chega.
- **Nome e descrição do combo saíram da tela.** O briefing §3.2 lista tema,
  justificativa, preço e os três itens; as colunas seguem no banco, sem uso.

### 🐛 Três defeitos que estavam de pé e caíram aqui

1. **A trava de primeiro acesso nunca funcionou.** `precisaTrocarSenha()` lia
   `r.ok && r.dados[0]` num **array** — `api()` devolve o corpo, não
   `{ ok, dados }`. Achava `undefined` nos dois e devolvia `false` sempre. A
   Edge Function ligava `deve_trocar_senha`, e ninguém lia. A senha do WhatsApp
   era permanente.
2. **`marcarSenhaTrocada()` mandava `apikey: CFG.chave`** — a chave se chama
   `CFG.key`. A requisição saía sem chave e o `.catch` engolia.
3. **`marca_concluir_cadastro` lançava exceção em vez de dizer o que falta.**
   `text[] || 'literal'` é `malformed array literal` no Postgres; faltava
   `::text`. Só disparava quando havia campo em falta — o caminho que a função
   existe para servir.

### Provado em transação revertida — 19 + 14 + 2

| Prova | Resultado |
|---|---|
| edição nula não abre participação nenhuma | ✅ 0 |
| abrir participação, e o segundo clique não abrir duas | ✅ idempotente |
| gatilho cria os 3 itens | ✅ 3 |
| concluir vazio devolve a lista do que falta | ✅ 7 itens, sem exceção |
| item sem ingredientes barra a conclusão | ✅ nomeia qual item |
| concluir completo | ✅ `cadastro_completo` |
| outra marca conclui a minha | ✅ `nao_autorizado` |
| `abrir_participacao` com senha errada | ✅ `nao_autorizado` |
| helper interno executável por `anon`/`authenticated` | ✅ **false** nos dois |
| grant de coluna: `combo_foto_path` / `status_cadastro` / `foto_path` | ✅ **false** nos três |
| grant de coluna: `cnpj` / `tema_combo` | ✅ true |

**E o isolamento entre marcas, com RLS ligada e dois usuários de verdade**
(`set local role authenticated` + claims — a mesma porta da tela):

| A marca A enxerga | Resultado |
|---|---|
| participantes · participações · itens | 1 · 1 · 3 — nada da B |
| solicitações | **1**: a geral publicada. Fora o rascunho e a da B |
| arquivos | **1**: o geral publicado. Fora o não publicado e o da B |
| sessões de fotos | **0** — a única era da B |
| escrever o tema da B | **0 linhas atingidas**, e o tema da B intacto depois |
| declarar-se completa / escrever foto do item | negado pelo grant de coluna |
| criar unidade na participação da B | negado pela RLS |
| criar a própria unidade / registrar a própria leitura | ✅ funciona |

Suíte **124/124** (2 testes novos), build verde em 2,06 s, **zero ERROR** nos
Security Advisors.

### O primeiro teste real, e os dois defeitos que só ele encontrou

A tela foi aberta em 25/08/2026 e **travou duas vezes** antes de funcionar.
Nenhum dos dois defeitos aparecia em teste automatizado, e o segundo era mais
antigo e maior que a própria Fase 7.

🐛 **`Notification.requestPermission()` nunca rejeita e pode não resolver.** O
navegador costuma recolher o pedido num ícone da barra de endereço em vez de
abrir a caixa; enquanto ninguém responde, a promessa fica pendente para
sempre. As duas telas travavam em "Pedindo permissão…" sem dizer o que houve.
Corrigido em `a79b1a8`: recado que ensina onde o pedido se escondeu, prazo de
8 s que troca a mensagem sem afirmar que falhou, escuta de
`permissions.change` para não perder resposta tardia, e checagem da negativa
antes de pedir.

🔴 **`rpc()` quebrava em TODA função `returns void`.** O PostgREST responde
204 sem corpo e o painel chamava `r.json()` em cima do vazio — "Unexpected end
of JSON input", erro que parece de rede e é de leitura. São **sete** RPCs
`void` que o painel chama: além do "Ligar avisos", **cinco botões da Fase 6**
falhavam idêntico e nunca tinham sido apertados — `marcar_solicitacao`,
`registrar_foto_item`, `atualizar_sessao_fotos`, `definir_funcao_conta` e
`suspender_conta`. Corrigido em `7e3ffa4`.

⚠️ **A lição, e ela vale para as próximas provas:** a Fase 6 reportou "17 RPCs
chamadas por HTTP, zero `PGRST202`" — e passou. A chamada foi por `curl`, com
o corpo lido fora do painel; o `rpc()` nunca entrou na prova, e era ele que
estava quebrado. **Chamada por HTTP não é chamada pelo caminho do código.**

### O que ficou provado de ponta a ponta

| O quê | Como |
|---|---|
| Assinatura gravada | ✅ 1 linha ativa em `push_subscriptions`, papel `organizacao` |
| Serviço de push | ✅ **WNS da Microsoft** (`notify.windows.com`) — o navegador foi o Edge, não o Chrome, então a função vale nos dois |
| Assinatura VAPID aceita | ✅ a linha segue `ativo = true`: o envio não levou 404/410 |
| Notificação exibida | ✅ vista na tela pelo Eloi |

⚠️ **Falta o celular.** A assinatura é presa à origem: a de `localhost:3000`
não vale no Preview da Vercel nem em produção, e cada endereço pede "Ligar
avisos" de novo. O iPhone continua sem prova — lá o push só existe com o
painel instalado na tela inicial.

⚠️ **A versão em produção dos dois painéis é a do `master`, anterior às fases
5, 6 e 7** — 2.251 linhas atrás. As páginas estáticas estão no ar desde sempre
(a flag `COMING_SOON_PUBLICATION` não as alcança), mas o que está lá não tem
avisos, nem ficha, nem produção, nem equipe.

---

## Fase 8 · Testes — ✅ FEITA

**Arquivo novo:** `tests/comportamento.test.mjs` · **Suíte: 122 → 166**

### A mudança de método, e o motivo dela

Os testes das fases anteriores medem a **fonte** por expressão regular. É útil
— pegam chave secreta, arrow function, dado indo cru para `innerHTML` —, mas
não pegam comportamento. Em 25/08 o `rpc()` do painel quebrava em **toda**
função `returns void`, cinco botões da Fase 6 estavam mortos, e a suíte inteira
passava.

O arquivo novo **executa o código real**: as funções são recortadas do arquivo
de produção (as de Deno passam pelo esbuild só para tirar as anotações de tipo)
e rodadas com as dependências injetadas. **Nada é reimplementado** —
reimplementar provaria a reimplementação, que é o defeito clássico deste tipo
de teste.

| O que passou a ser executado | Casos |
|---|---|
| `rpc()` do painel | 204 sem corpo → `null`; corpo válido → convertido; `true`/`false`/`null`; corpo inválido **continua** estourando; motivo do servidor propagado; erro sem corpo legível |
| `caminhoValido` de `arquivo-url` | 3 caminhos legítimos, **11 recusas** — travessia, profundidade, pasta estranha, arquivo oculto, espaço, ponto e vírgula, UUID malformado, nome de 121 caracteres |
| Cifra do Web Push | round-trip completo; enquadramento (registro 4096, chave 65 bytes, delimitador `0x02`); par efêmero e salt diferentes a cada envio |
| Cabeçalho VAPID | JWT ES256 que **verifica**; `k=` é a chave que assinou; `aud` acompanha o serviço (FCM, **WNS**, Mozilla); validade dentro das 24 h do RFC |
| Regra de declaração | nenhuma arrow e exatamente um `<script>` nas três páginas estáticas |

### A prova de que os testes valem

**Teste de mutação:** o defeito do `rpc()` foi reintroduzido de propósito. A
suíte reprovou **exatamente um** teste — o que devia reprovar — e voltou a
166/166 com a correção restaurada. Teste que nunca falhou não prova nada.

---

## Fase 9 · Revisão final (§7 do comando) — ✅ FEITA

| Item do §7 | Resultado |
|---|---|
| Suíte inteira | ✅ **166/166** |
| Build | ✅ verde |
| Security Advisors | ✅ **zero ERROR** (92 WARN e 14 INFO, todos do padrão declarado) |
| Um `<script>` por página estática | ✅ 1, 1 e 1 |
| Nenhuma função em arrow | ⚠️ **duas encontradas** em `abrirFicha`, corrigidas — e agora há teste |
| Dado do banco para `innerHTML` sem `escapar()` | ✅ nenhum |
| Chave secreta fora de variável de ambiente | ✅ **nenhuma literal** em `public/`, `src/`, `supabase/` ou `scripts/` |
| Tabela sem RLS | ✅ **26 de 26** com RLS |
| Guards fechados | ✅ `pode`, `pode_organizacao`, `admin_ok`, `acesso_travado` e `abrir_participacao_interna` negam `anon` **e** `authenticated`, conferido por `has_function_privilege` |
| Marca não lê dado de outra marca | ✅ provado na Fase 5, com duas contas reais autenticadas |
| Marca não escreve `foto_path` | ✅ provado na Fase 5 (42501) |
| Barreiras anti-robô pelo endpoint direto | ✅ ver abaixo |
| Instalar nos dois celulares | ⛔ **não feito** — depende de aparelho |

### As barreiras anti-robô, medidas pelo banco

⚠️ Bloqueio e sucesso devolvem `{"ok":true}` **byte a byte idêntico**, de
propósito. A resposta não prova nada; quem prova é a linha que apareceu ou não.

**Sete requisições diretas ao endpoint, uma linha gravada:**

| Tentativa | Resposta | Gravou? |
|---|---|---|
| campo-armadilha preenchido | `200 {"ok":true}` | **não** |
| rápido demais (< 3 s) | `200 {"ok":true}` | **não** |
| antigo demais (> 24 h) | `200 {"ok":true}` | **não** |
| formulário desconhecido | `400 formulario_desconhecido` | não |
| RPC arbitrária (`submit_vote`) | `400 formulario_desconhecido` | não |
| corpo ausente | `400 corpo_invalido` | não |
| **legítimo, aberto há 30 s** | `200 {"ok":true}` | **sim** |

A lista de RPCs permitidas segura o caso que mais importa: **não dá para usar a
função como proxy para qualquer RPC do banco.**

⚠️ **A barreira 3 (Turnstile) não pôde ser testada** — ela está desligada por
falta do par de chaves, e sem segredo configurado devolve "não avaliado" e
deixa passar, por decisão declarada na Fase 2. As outras três seguram sozinhas
até as chaves existirem.

⚠️ **Ficou uma linha de teste em `contact_requests`** — "TESTE Fase 9",
`teste-fase9@exemplo.invalido`. É a prova do caminho legítimo e a única linha da
tabela. Apagar é decisão do Eloi (item 4 do comando); basta pedir.

---

## Revisão final da Fase 3 (§7) — registro histórico

| Item | Resultado |
|---|---|
| Suíte de testes inteira | ✅ **122/122** |
| Build | ✅ verde, 2,2 s |
| Security Advisors | ✅ **zero ERROR** (76 WARN, todos do padrão já existente) |
| Chave de serviço em `src/` ou `public/` | ✅ **nenhuma ocorrência** |
| Um `<script>` por página estática | ✅ 1 em cada uma das três |
| Toda tabela com RLS | ✅ **20 de 20** |
| Marca não lê dado de outra marca | ✅ provado autenticando como duas contas |
| Marca não escreve no campo de foto | ✅ provado por API — **42501** |
| Captcha rejeita envio sem token | ⚠️ Turnstile **desligado** (sem chaves). As outras 3 barreiras foram provadas chamando o endpoint direto |
| Instalar nos dois painéis em Android e iPhone | ❌ **não fiz** — exige aparelho |

### O que NÃO foi testado, e não deve ser dito como pronto

- Nenhuma tela nova foi construída, então nenhuma foi vista funcionando.
- O ciclo pelo navegador (entrar no painel com a senha real) segue sem prova de
  ponta a ponta — só o Eloi pode fazer.
- A Edge Function `enviar-formulario` foi provada por chamada direta, **não**
  pela tela: `/quero-participar/` aponta para ela no código, e isso não foi
  exercido num navegador.

---

## Onde parei, exatamente

**As nove fases estão fechadas.** O que resta não é código: é decisão sua e
aparelho na mão.

⚠️ **Falta o celular.** A assinatura de push é presa à origem, então a de
`localhost` não vale no Preview nem em produção. O iPhone continua sem prova:
lá o push só existe com o painel instalado na tela inicial.

⚠️ **A versão em produção dos dois painéis é a do `master`**, anterior às fases
5, 6 e 7 — 2.251 linhas atrás. As páginas estáticas estão no ar desde sempre (a
flag `COMING_SOON_PUBLICATION` não as alcança), mas o que está lá não tem
avisos, nem ficha, nem produção, nem equipe. **No dia em que a primeira marca
receber login, é essa versão que ela abre.**

⚠️ **`edicao_atual` está NULA**, e é decisão: a 17ª edição não foi anunciada e
inventar um código seria inventar dado (A4). Abrir é um campo em **equipe**.

⚠️ **Ninguém tem conta nominal ainda**, então `pode()` devolve `true` para as
seis ações e as funções não separam nada na prática. Elas passam a valer na
primeira conta criada.

---

## O que depende de você

1. 🔴 **Rodar o backup.** Destrava tudo.
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY="<Project Settings > API > service_role>"
   npm run backup
   ```
   Confirme que o destino ficou **fora** do repositório.
2. **Turnstile — a ordem importa, e inverter dói.**

   ✅ **Feito em 25/08/2026:** o widget existe na Cloudflare e a chave **pública**
   está em `CONFIG.turnstileSiteKey` (`public/quero-participar/index.html`).

   ⛔ **Falta, e é ação sua, nesta ordem:**

   1. ~~**Publicar a Edge Function `enviar-formulario`.**~~ ✅ **v6 no ar em 25/08/2026.** A versão no ar é a **v5**,
      e ela confere só `success` — **e chama o Turnstile para os quatro
      formulários**. A versão do repositório confere `success` + `action` +
      `hostname` e só exige token de quem desenha o widget (`EXIGE_TURNSTILE`).
      ```bash
      npx supabase login
      npx supabase functions deploy enviar-formulario --project-ref dgfmoibynftadsyjcclg --no-verify-jwt
      ```
   2. **É aqui que estamos.** As duas variáveis de ambiente da Function:
      `TURNSTILE_SECRET_KEY` (a privada, **nunca no repositório**) e
      `TURNSTILE_HOSTNAMES`.

   🔴 **Configurar a chave antes do deploy desliga Contato e Apoiar em silêncio.**
   Os dois mandam `token: ''` porque nenhum renderiza widget; na v5 isso vira
   `success: false`, e reprovado sai pela **mesma resposta do sucesso**. Os dois
   formulários passariam a engolir todo envio mostrando a tela de "enviado".

   ⚠️ **`TURNSTILE_HOSTNAMES` de produção NÃO inclui `localhost` nem `127.0.0.1`.**
   O widget cobre os dois automaticamente para o desenvolvimento funcionar — por
   isso quem separa produção de máquina de qualquer um é o servidor:
   ```
   sweetcoffeeweek.com.br,www.sweetcoffeeweek.com.br,site-sweet-coffee-week-git-dev-site-completo-eloidesignstudio.vercel.app
   ```

   ⚠️ **A Cloudflare criou TRÊS widgets** (o assistente Spin faz um por domínio).
   Vale o primeiro, `0x4AAAAAAEbvMJDS1YJpLY3b`, e os três domínios têm que estar
   **dentro dele** — a página tem uma site key só. Os outros dois ficam sem uso.

   ⚠️ **Depois de ligar, mande um pré-cadastro de verdade.** Chave errada por um
   caractere não quebra nada visível: o widget não renderiza, o token sai vazio e
   o servidor descarta. Desde 25/08 a página **barra esse caso na cara da pessoa**
   em vez de deixar seguir, mas quem prova que gravou é a linha em
   `quero_participar`, nunca a tela.

3. **Decisões que não são minhas** (item 4 do comando): prazo de descarte de
   candidatura não aproveitada, e onde o backup fica guardado.

---

## Achados que não batem com os documentos

| Documento | O que ele diz | O que o banco/código diz |
|---|---|---|
| `INSTRUCAO-marca-completa.md` §2.1 | `participantes.preco` e `participantes.horarios` existem | **não existem.** Preço é `participantes_operacao.combo_preco`; horário já vive por unidade, dentro do jsonb `unidades` |
| idem, §2.2 | policy sobre `p.status`, valor `revisao` | coluna é `status_cadastro`; `revisao` não é valor válido |
| idem, §2.4 e §2.6 | RPCs novas com `admin_ok` | a Fase 2 migrou as 14 RPCs para `pode_organizacao`; RPC nova com `admin_ok` nasce fora da ponte |
| Briefing §7.2 | nenhum formulário tem campo-armadilha | `/quero-participar/` tem, com descarte silencioso |
| Briefing §7.1 | "escrita sempre por caminho controlado" | as 7 RPCs de submit são chamáveis por `anon` direto, sem barreira |

---

## Marcações de design pendentes

O hook do `impeccable` apontou 5 achados em `public/quero-participar/index.html`
(borda lateral em dois cartões, escala tipográfica achatada, uso de travessão,
marcadores `01/02/03`). **Nenhum veio das minhas edições** — são design
pré-existente da página, e o comando é explícito: *"Não toque em
`/quero-participar/` além de acrescentar a proteção anti-robô."* Ficam
registrados, não corrigidos e não suprimidos.
