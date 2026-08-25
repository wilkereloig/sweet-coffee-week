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
| 3 · Turnstile | ✅ código pronto, **desligado por bandeira** — falta o par de chaves |
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

## Revisão final (§7 do comando) — o que foi conferido

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

**Fases 1, 2 e 3 fechadas.** Fases 4 a 9 não começaram.

A fase 4 (modelo de dados) é a próxima, e ela **não podia ser começada e
deixada pela metade**: reestruturar `participantes` em marca × participação
quebra, na mesma leva, a Edge Function `criar-acesso-marca`, quatro RPCs,
`public/marca/index.html` e a ficha do painel. Começar sem terminar deixaria
uma tela quebrada — o que o item 5 do comando proíbe explicitamente.

**Ordem de retomada:**

1. Fase 4 · modelo de dados — `participacoes`, `participacao_unidades` (com
   delivery), repontar `participantes_itens` e `sessoes_fotos`, `solicitacoes` +
   `solicitacao_estado`, `arquivos` + confirmação de leitura, CNPJ/razão social
   opcionais, `push_subscriptions`.
2. Fase 5 e 6 · as duas telas.
3. Fase 7 · instalável em `/marca/` + push.
4. Fase 8 · testes.

⚠️ **A migration `cadastro_completo_marca` (24/08) precisa ser refeita na fase
4**, porque `participantes_itens` e `sessoes_fotos` apontam para
`participante_id` — que sob o modelo decidido vira *participação*, não *marca*.
Com zero linhas, é barato. Com a 17ª edição dentro, não seria.

---

## O que depende de você

1. 🔴 **Rodar o backup.** Destrava tudo.
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY="<Project Settings > API > service_role>"
   npm run backup
   ```
   Confirme que o destino ficou **fora** do repositório.
2. **Chaves do Turnstile** (gratuitas, em dash.cloudflare.com → Turnstile):
   - a **pública** vai em `CONFIG.turnstileSiteKey`, em `public/quero-participar/index.html`;
   - a **privada** vai como variável de ambiente `TURNSTILE_SECRET_KEY` da Edge
     Function, **nunca no repositório**.
   Preencher só uma das duas não liga barreira nenhuma — é preciso o par.
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
