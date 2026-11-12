# 15 · Caça aos Carimbos — contrato de identidade e recuperação

Migration `supabase/migrations/20261205_caca_identidade.sql` (aplicada) · teste `supabase/testes/caca-identidade.sql` ·
edge function `supabase/functions/caca-email` (publicada). Regra de produto: `15-caca-especificacao.md` §3 e §4.
Tudo é **aditivo**: `mapa_criar`, `mapa_ler`, `mapa_ler_v2`, chaves e mapas existentes não mudaram.

## Decisões

| # | Decisão |
|---|---|
| D1 | **Pessoa = e-mail normalizado** (`lower` + `btrim`). Ponto e `+alias` do Gmail **não** são colapsados: `a.b@gmail.com` e `ab@gmail.com` são duas pessoas. Isso permite burlar o limite de criação com aliases; fica registrado, não resolvido. |
| D2 | **Confirmar** (e recuperar) marca `email_confirmado_em` **só no mapa a que o código foi emitido** — o mapa principal (D8) —, não em todos os mapas do e-mail (mudou em 05/11/2026, migration 20261210). O status `confirmado` continua sendo da pessoa: vale se o mapa principal está confirmado. |
| D3 | **Recuperar** emite chave nova só para o mapa **principal** da pessoa (D8; antes era o mais recente). A chave antiga **desse mapa NÃO deixa de valer** (migration 20270131, 12/11/2026, pedido do Wilker: "os dados salvos têm que ficar salvos"): vai para `mapa_chaves_antigas` (até 10 por mapa) e `mapa_hash` a resolve para o hash atual do mapa, então os outros aparelhos, navegadores e o app instalado seguem abertos e ninguém entra em vai e vem de recuperar. Só a organização revoga (`mapa_nova_chave` apaga as chaves antigas). Antes de 20270131 valia o contrário (a antiga deixava de valer no ato). Os outros mapas da pessoa seguem com as chaves deles (como mapas secundários). Nenhum progresso se perde: ele é do principal. Recuperar também confirma o e-mail do principal (provou controle dele). |
| D4 | Código: 6 dígitos, vale **10 min**, **uso único**, **5 tentativas**, só em hash (sha256 com pepper guardado no banco, em tabela fechada). Pedido novo **não** invalida o anterior ainda aberto (20261216): a validação confere os 3 códigos abertos mais novos. |
| D5 | Limite de pedidos de código: **1 por minuto e 5 por hora**, por **mapa** em `confirmar` (só quem tem a chave) e por **e-mail** em `recuperar` (conta igual exista ou não mapa, então o limite não revela existência); mais **40 pedidos por 10 min por IP** (hash). `limitado` vale para o minuto e para a hora, então o texto da tela não promete "um minuto" (C13). ~~500 por hora no total~~ **saiu** (SEC-06): qualquer anônimo esgotava o balde e travava todo mundo. Resta um teto de **600 códigos emitidos por hora** (cota do provedor), que conta só e-mails com mapa e **não** devolve `limitado`. |
| D6 | Criação de mapa (`mapa_criar_v2`): **5 mapas por e-mail em 24 h**, **só endereço de formato seguro** (`^[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,}# 15 · Caça aos Carimbos — contrato de identidade e recuperação

Migration `supabase/migrations/20261205_caca_identidade.sql` (aplicada) · teste `supabase/testes/caca-identidade.sql` ·
edge function `supabase/functions/caca-email` (publicada). Regra de produto: `15-caca-especificacao.md` §3 e §4.
Tudo é **aditivo**: `mapa_criar`, `mapa_ler`, `mapa_ler_v2`, chaves e mapas existentes não mudaram.

## Decisões

| # | Decisão |
|---|---|
| D1 | **Pessoa = e-mail normalizado** (`lower` + `btrim`). Ponto e `+alias` do Gmail **não** são colapsados: `a.b@gmail.com` e `ab@gmail.com` são duas pessoas. Isso permite burlar o limite de criação com aliases; fica registrado, não resolvido. |
| D2 | **Confirmar** (e recuperar) marca `email_confirmado_em` **só no mapa a que o código foi emitido** — o mapa principal (D8) —, não em todos os mapas do e-mail (mudou em 05/11/2026, migration 20261210). O status `confirmado` continua sendo da pessoa: vale se o mapa principal está confirmado. |
| D3 | **Recuperar** emite chave nova só para o mapa **principal** da pessoa (D8; antes era o mais recente). A chave antiga **desse mapa NÃO deixa de valer** (migration 20270131, 12/11/2026, pedido do Wilker: "os dados salvos têm que ficar salvos"): vai para `mapa_chaves_antigas` (até 10 por mapa) e `mapa_hash` a resolve para o hash atual do mapa, então os outros aparelhos, navegadores e o app instalado seguem abertos e ninguém entra em vai e vem de recuperar. Só a organização revoga (`mapa_nova_chave` apaga as chaves antigas). Antes de 20270131 valia o contrário (a antiga deixava de valer no ato). Os outros mapas da pessoa seguem com as chaves deles (como mapas secundários). Nenhum progresso se perde: ele é do principal. Recuperar também confirma o e-mail do principal (provou controle dele). |
| D4 | Código: 6 dígitos, vale **10 min**, **uso único**, **5 tentativas**, só em hash (sha256 com pepper guardado no banco, em tabela fechada). Pedido novo **não** invalida o anterior ainda aberto (20261216): a validação confere os 3 códigos abertos mais novos. |
| D5 | Limite de pedidos de código: **1 por minuto e 5 por hora**, por **mapa** em `confirmar` (só quem tem a chave) e por **e-mail** em `recuperar` (conta igual exista ou não mapa, então o limite não revela existência); mais **40 pedidos por 10 min por IP** (hash). `limitado` vale para o minuto e para a hora, então o texto da tela não promete "um minuto" (C13). ~~500 por hora no total~~ **saiu** (SEC-06): qualquer anônimo esgotava o balde e travava todo mundo. Resta um teto de **600 códigos emitidos por hora** (cota do provedor), que conta só e-mails com mapa e **não** devolve `limitado`. |
| D6 | Criação de mapa (`mapa_criar_v2`): ; vírgula, aspas, `<>` e acentos dão `email_invalido`, 20261220) e, quando o cabeçalho `cf-connecting-ip` chega pelo PostgREST, **60 mapas por IP em 10 min** (guardado só como hash, em `mapa_criar_ip`, apagado após 2 dias). ~~300 por edição em 10 min~~ **saiu** (SEC-06). Sem o cabeçalho, só vale o limite por e-mail; limite global/por IP de verdade é da borda (Cloudflare/WAF), não do banco. |
| D8 | **Mapa principal** (`caca_mapa_principal(edicao, email)`, interna), regra de 20261216: o **confirmado mais antigo** do e-mail; sem nenhum confirmado, só há principal se o e-mail tem **um único mapa**. Com 2 ou mais mapas e nenhum confirmado a identidade está **em disputa** e ninguém é principal (cada mapa lê só os próprios carimbos, fica fora do ranking e dos grupos) até alguém provar o e-mail. Só o principal tem os direitos "da pessoa": entra e age em grupos, dá o perfil do ranking (apelido, WhatsApp, `no_ranking`) e o contato do prêmio, e conta como e-mail confirmado para voucher, prêmio e pedido de presença. Mapa **secundário** (ou em disputa): `mapa_ler_v2` mostra só os carimbos do próprio mapa (sem posição), `caca_metas_ler` devolve 0, as RPCs de grupo respondem `negado`. A recuperação (código no e-mail) entrega a chave nova do principal (em disputa, do mapa com mais carimbos; empate, o mais antigo) e confirma esse mapa. |
| D9 | `mapa_criar` (v1) **não é mais executável** por `anon`/`authenticated` (SEC-02): só `mapa_criar_v2` a chama. O front já usa a v2. |
| D7 | Toda falha de `mapa_codigo_validar` responde igual (`codigo_invalido`): errado, vencido, usado, tentativas esgotadas, sem pedido, e-mail sem mapa. O front diz "Código inválido ou vencido. Peça um novo." |

## Riscos conhecidos (leia antes de programar o front e a premiação)

1. **E-mail alheio.** Avaliação e carimbo se ligam pelo e-mail em texto, sem prova de posse: quem cria um mapa com o e-mail de outra pessoa soma o próprio carimbo ao progresso **dela**. Desde 20261210 isso **não rende mais nada além disso**: perfil público, contato do prêmio, grupos, e-mail confirmado e recuperação pertencem ao **mapa principal** (D8), que um mapa novo não toma. **Resíduo:** quem cria mapa com o e-mail de alguém **antes** de a pessoa se cadastrar é o principal até o dono do e-mail pedir "recuperar" (isso mata a chave do invasor). O voucher segue só para e-mail confirmado (`caca_premio_email_ok` = o principal está confirmado).
2. **Bloqueio por terceiro.** Quem sabe o e-mail de alguém pode gastar os 5 pedidos/hora dele e impedir o código de chegar por um tempo. Não dá acesso ao mapa. Mitigação futura: Turnstile na tela de recuperação (não implementado).
3. **Recuperar derruba o aparelho antigo** daquele mapa (decisão D3, prevista na especificação §4). Se o criminoso controla o e-mail, ele toma o mapa; é inerente a recuperação por e-mail.
4. Código de 6 dígitos tem 1 milhão de combinações; com 5 tentativas por código e 5 códigos por hora, adivinhar é inviável.
5. Gmail com ponto/`+` (D1).

## O que conta no progresso (migration 20261211)

- **Fonte única das casas:** `caca_casas_conta(edicao)` = casa não encerrada com publicação vigente **de nível `marca_e_combo`** (a mesma exigência de `submit_avaliacao`). O total (`caca_total_casas`, `caca_grupo_total`, `mapa_ler_v2`, `caca_metas_ler`, apuração) e as casas validadas (`caca_placar_v2`, `caca_grupo_casas`) saem dela. Encerrar uma casa já carimbada tira os carimbos dela do progresso junto com o total. Casa só `marca` não entra no total (hoje 26 de 27 enquanto `caroli-douces` não vira `marca_e_combo`; volta a 27 sozinho).
- **Carimbo em casa sem combo:** `mapa_carimbar_casa` e `mapa_carimbar` respondem `{ok:false, motivo:'casa_sem_combo', slug}` (motivo **novo**; o front cai no texto genérico até ganhar uma frase própria).
- **GPS (SEC-03):** `mapa_carimbar_casa` escolhe **sempre** a unidade com coordenada conferida primeiro; sem localização do celular ela responde `sem_localizacao`. Carimbo com `origem = 'unidade_sem_coordenada'` só conta quando a casa **não tem nenhuma** unidade conferida (`caca_carimbo_conta`). Hoje 9 das 27 casas estão nesse caso; conferir as coordenadas delas, ou decidir a exceção (`15-caca-gps-excecao.md`), fecha o resto. A revisão `caca_carimbo_revisao_listar` segue listando esses carimbos.
- `mapa_ler_v2` ganhou `principal: boolean`; `mapa_confirmar_email_status` ganhou `principal: boolean`.

## Visão geral do fluxo

```
Front ──POST──> edge caca-email {edicao,email,finalidade} ──service_role──> mapa_codigo_emitir_interno ──> (código em claro)
                         └─ envia o e-mail pelo provedor ─ responde {ok:true}
Front ──RPC anon──> mapa_codigo_validar {edicao,email,codigo,finalidade} ──> {ok, chave?}
```

O front **nunca** chama `mapa_codigo_pedir` nem `mapa_codigo_emitir_interno` (são só do service_role). O pedido do código é sempre pela edge function.

---

## Funções públicas (anon e authenticated, via `supabase.rpc`)

### `mapa_criar_v2(p_edicao text, p_apelido text, p_email text, p_whatsapp text, p_ranking boolean, p_aceite boolean) -> jsonb`
Igual a `mapa_criar` (mesmos argumentos, mesmo retorno) com limite de abuso. O front de criação deve passar a chamar esta.
- Sucesso: `{ "chave": "<32 caracteres base64url>" }` — a chave aparece **uma única vez**; só o hash fica no banco.
- Erros (a RPC levanta exceção, `error.message` do PostgREST, código `P0001`):
  `muitos_pedidos` (novo) · `edicao_desconhecida` · `aceite_obrigatorio` · `apelido_invalido` (2 a 24 caracteres) · `email_invalido` · `whatsapp_invalido`.
- `muitos_pedidos`: mais de 5 mapas do mesmo e-mail em 24 h, ou mais de 60 mapas do mesmo IP em 10 min (o teto de 300 por edição saiu). O front mostra "Muitos pedidos agora, tente de novo em alguns minutos".
- O e-mail é normalizado (`lower` + `btrim`). Não colapsa ponto/`+alias`.
- Mapa recém-criado vem com `email_confirmado_em = null`.

### `mapa_confirmar_email_status(p_chave text) -> jsonb`
Retorna `{ "confirmado": boolean, "valido": boolean }`.
- `valido=false` (e `confirmado=false`): chave desconhecida (por exemplo, trocada numa recuperação).
- `confirmado`: da pessoa, isto é, o **mapa principal** do e-mail está confirmado (um mapa não confirmado de invasor lê `confirmado: true`, mas `principal: false`).
- Efeito colateral: carimba `ultimo_acesso_em` do mapa (no máximo uma gravação por hora).
- Uso: decidir se mostra o lembrete discreto "confirme seu e-mail".

### `mapa_codigo_validar(p_edicao text, p_email text, p_codigo text, p_finalidade text) -> jsonb`
`p_finalidade`: `'confirmar'` ou `'recuperar'`. `p_codigo`: 6 dígitos (espaços nas pontas são ignorados). `p_email` é normalizado.
- Sucesso `confirmar`: `{ "ok": true, "finalidade": "confirmar" }`.
- Sucesso `recuperar`: `{ "ok": true, "finalidade": "recuperar", "chave": "<chave nova>", "apelido": "<apelido do mapa>" }`.
  A chave nova vem **uma única vez** e o front deve gravá-la como a chave do aparelho; ela funciona em `mapa_ler`, `mapa_ler_v2`, `mapa_carimbar` etc. A chave antiga daquele mapa **continua valendo** (20270131; até 10 chaves antigas por mapa, as mais velhas saem). Chave que o banco não conhece devolve `null` / `mapa_desconhecido`: o front só a solta depois de duas leituras e a guarda numa quarentena (15-caca-front.md, "A chave do mapa não se perde").
- Falha (qualquer causa, D7): `{ "ok": false, "motivo": "codigo_invalido" }`. Não há outra mensagem de erro; formato de entrada ruim também cai aqui.
- Cada erro de código conta uma tentativa; após 5 o código morre e é preciso pedir outro. Código usado com sucesso não vale de novo.
- Não levanta exceção.

---

## Edge function `caca-email` (POST, sem JWT)

`POST https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/caca-email` · `Content-Type: application/json`

Corpo: `{ "edicao": "2026.2", "email": "pessoa@exemplo.com", "finalidade": "confirmar" | "recuperar" }`

| Resposta | Quando |
|---|---|
| `200 { "ok": true }` | Pedido aceito. **Idêntica** exista ou não mapa para o e-mail, esteja ele confirmado ou não. Não significa que o e-mail foi enviado. |
| `200 { "ok": true, "limitado": true }` | Limite (D5) atingido, no minuto ou na hora; independe de existir mapa. O front mostra `CACA.codigo.limitado` ("muitos pedidos por agora; espere um pouco, até 1 hora, ou use o último código") e mantém o contador de 60 s. |
| `200 { "ok": false, "motivo": "email_indisponivel" }` | Provedor de e-mail não configurado. **Nada foi gravado.** O front mostra a alternativa (copiar o link pessoal, colar o link, falar com a organização). |
| `200 { "ok": false, "motivo": "falha_temporaria" }` | Banco lento ou fora (a emissão do código falhou). **Nada foi enviado.** Independe de o e-mail ter mapa, então pode ser dita. O front mostra "Tentar de novo". |
| `400 { "ok": false, "motivo": "pedido_invalido" }` | JSON malformado, finalidade fora de `confirmar`/`recuperar`, edição vazia. |
| `400 { "ok": false, "motivo": "email_invalido" }` | E-mail com mais de 254 caracteres ou fora do formato seguro (o valor vai direto ao campo `to` do provedor). |
| `405 { "ok": false, "motivo": "metodo_nao_permitido" }` | Método diferente de POST/OPTIONS. |

O e-mail só sai se houver mapa para o endereço (e, no caso `confirmar`, ainda não estiver confirmado). O front não deve inferir isso da resposta.

**Resposta uniforme, no conteúdo e no tempo.** A função responde assim que o código é emitido e envia o e-mail em segundo plano (`EdgeRuntime.waitUntil`), então exista ou não mapa a resposta é a mesma e demora o mesmo. Por isso uma falha do **provedor** não pode ser dita ao front (revelaria que o e-mail tem mapa): a tela ensina o que fazer quando o código não chega ("Não chegou?": spam, pedir outro depois de 60 s, copiar/colar o link pessoal, falar com a organização). Só o que **não** depende do e-mail vira motivo próprio: `email_indisponivel` (configuração) e `falha_temporaria` (banco).

**Envio:** uma nova tentativa em rede, timeout, 429 ou 5xx (espera 0,8 s; 2 s no 429), com `Idempotency-Key` no Resend para não duplicar; 4xx de pedido não repete. Cada chamada tem timeout de 8 s. O log guarda só `caca_email_enviado <provedor> <status>` ou `caca_email_provedor_falhou <provedor> status <n> <nome do erro> <mensagem limpa>` (sem e-mail, token ou número longo) e `caca_email_sem_configuracao faltam: <NOMES>`; nunca endereço, código ou corpo.

**Conteúdo do e-mail** (`supabase/functions/caca-email/montar.js`, testado em `tests/cartoon-caca-email.test.mjs`): assunto `<código> é o seu código da Caça aos Carimbos`, código de 6 dígitos, validade de 10 min, uso único, "Se não foi você quem pediu, ignore este e-mail". **Não leva o apelido nem dado do mapa**: o apelido é texto livre e, num e-mail que sai do nosso domínio para um terceiro, seria canal de injeção (alguém cria mapa com o e-mail da vítima e um apelido com frase ou link). O código só entra se forem exatamente 6 dígitos; todo texto dinâmico passa por `esc`.

**Estado do envio (05/11/2026, verificado):** função publicada (v6, 05/11/2026). O projeto tem `BREVO_API_KEY`, mas **não** tem `RESEND_API_KEY`; o Brevo respondeu `401 API Key is not enabled` (a chave existe e está **desativada** no Brevo). Sem remetente definido, a função usa o padrão `Sweet & Coffee Week <ola@sweetcoffeeweek.com.br>`. Enquanto não houver uma chave ativa, o pedido de código responde `{ok:true}` e **nada chega** (a tela mostra "Não chegou?" e as alternativas); nada quebra e nenhum dado é perdido. Para ligar, é ação externa (ver abaixo).

---

## Funções internas (somente `service_role`; nunca chamar do front)

### `mapa_codigo_emitir_interno(p_edicao text, p_email text, p_finalidade text) -> jsonb`
Núcleo do pedido, chamada pela edge function. Normaliza o e-mail, aplica o limite (D5), cria o código (hash), **sem** invalidar o anterior ainda aberto, e devolve o código em claro **só aqui**.
- `{ "ok": true, "enviar": true, "codigo": "123456", "apelido": "...", "expira_em": "<timestamptz>" }` — enviar por e-mail.
- `{ "ok": true, "enviar": false }` — nada a enviar: entrada inválida, edição desconhecida, e-mail sem mapa, ou `confirmar` para e-mail já confirmado.
- `{ "ok": true, "enviar": false, "limitado": true }` — limite atingido.
- O código **nunca** vai para "o mapa mais recente" da pessoa: `confirmar` vai ao mapa da `chave` enviada (que precisa ser do mesmo e-mail); `recuperar` vai ao mapa principal e, com a identidade em disputa (2+ mapas, nenhum confirmado), ao mapa com **mais carimbos ativos** (empate: o mais antigo; 20261220).
- Sem nada a enviar (sem mapa, chave que não é do e-mail, `confirmar` já confirmado) a RPC faz o mesmo trabalho do envio (código, hash, uma linha de enchimento em `mapa_codigo_pedido`); a borda soma um piso de 600 ms mais até 200 ms aleatórios (SEC-07). Só endereço de formato seguro chega aqui.
- Limpa pedidos e códigos com mais de 2 dias.

### `mapa_codigo_pedir(p_edicao text, p_email text, p_finalidade text) -> jsonb`
Fachada de resposta uniforme: executa o mesmo pedido e devolve só `{ "ok": true }` ou `{ "ok": true, "limitado": true }`, sem código. **Não é para o front** (um pedido sem entrega do código só queimaria o limite). Existe para testes e para chamadas de serviço que não precisam do código.

### `caca_email_confirmado(p_edicao text, p_email text) -> boolean`
`true` se o mapa **principal** da pessoa (D8; e-mail normalizado) na edição tem `email_confirmado_em` preenchido. Mapa irmão confirmado não conta, e sem principal (identidade em disputa) devolve `false`. **A função de vouchers/premiação deve usar esta** antes de entregar qualquer voucher: só e-mail confirmado recebe. Aceita e-mail com maiúsculas ou espaços.

### Utilitárias (sem grant para ninguém além do dono)
`caca_hash_texto(text) -> text` (sha256 com pepper) · `caca_igual_ct(text, text) -> boolean` (comparação de mesmo tamanho sem parar no primeiro byte diferente).

---

## Tabelas e colunas (todas fechadas: RLS ligado, `revoke all` de anon/authenticated)

- `mapas_lover.email_confirmado_em timestamptz null` — preenchida ao confirmar ou recuperar, **só no mapa a que o código foi emitido** (o principal, D8), não em todos os mapas da pessoa. Mapas antigos ficam `null` (nada retroativo).
- `mapas_lover.ultimo_acesso_em timestamptz null` — atualizada por `mapa_confirmar_email_status` e por `recuperar`.
- `mapa_codigo` — `id, mapa_id, finalidade, codigo_hash, expira_em, tentativas, usado_em, criado_em`.
- `mapa_codigo_pedido` — `email_hash, criado_em` (contagem do limite; sem e-mail em claro).
- `caca_segredo` — pepper do hash, gerado no banco; nunca sai dele.

## Variáveis de ambiente da edge function

Provedor, nesta ordem: **Resend** (`RESEND_API_KEY`) → **Brevo** (`BREVO_API_KEY`, a mesma da `sync-brevo-contacts`; só entra se não houver Resend). Remetente: `CACA_EMAIL_FROM`, senão `EMAIL_FROM` (a da `send-vote-email`), senão o padrão do código (`REMETENTE_PADRAO`). O domínio/endereço do remetente precisa estar verificado no provedor (DNS/SPF/DKIM no Resend; remetente validado no Brevo). `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas pelo Supabase. Nenhum valor mora no repositório.

**Como ligar (qualquer um destes, sem nova publicação):** (a) criar uma `RESEND_API_KEY` com o domínio `sweetcoffeeweek.com.br` verificado no Resend; ou (b) reativar a `BREVO_API_KEY` no painel do Brevo (Configurações → Chaves de API) e validar o remetente `ola@sweetcoffeeweek.com.br` em Remetentes. Depois peça um código para um mapa de teste e confira o log `caca_email_enviado`. Se aparecer `caca_email_provedor_falhou ... 403` ou `400`, o remetente não está verificado: defina `CACA_EMAIL_FROM` com um que esteja.

## O que o front precisa fazer

1. Criar mapa por `mapa_criar_v2` (tratar `muitos_pedidos`).
2. Mostrar o lembrete de e-mail pendente com `mapa_confirmar_email_status(chave)`; botão "enviar código" chama `caca-email` com `finalidade: 'confirmar'`; campo de 6 dígitos chama `mapa_codigo_validar`.
3. "Perdi meu mapa" / aparelho novo: pede e-mail, chama `caca-email` com `finalidade: 'recuperar'`, depois `mapa_codigo_validar`; guarda a `chave` devolvida.
4. Nunca mostrar chave, código ou e-mail em URL, log, analytics, ranking ou arte de compartilhamento.

## Atualização 05/11/2026 (migration 20261216, achados SEC-01 e SEC-03)

- **Confirmar leva a chave.** `caca-email` recebe `{ edicao, email, finalidade: 'confirmar', chave }`; o código é emitido para o mapa dessa chave (que precisa ser do mesmo e-mail) e `mapa_codigo_validar(edicao, email, codigo, 'confirmar', chave)` só olha os códigos emitidos àquele mapa. Digitar o código que um invasor pediu (com a chave dele) para o e-mail da vítima NÃO confirma nem o mapa dela nem o dele. `recuperar` não usa chave (a pessoa a perdeu).
- **Código novo não derruba o anterior.** A validação confere os 3 códigos abertos mais novos da finalidade; cada código segue com 5 tentativas.
- **Limites:** 1/min e 5/h por MAPA em `confirmar` e por E-MAIL em `recuperar`; 40 pedidos/10 min por IP (hash, `mapa_criar_ip`); teto de 600 códigos/h por finalidade (ao estourar, a RPC devolve `teto: true` e a edge function loga `caca_codigo_teto_atingido`).
- **Apagar o mapa** (`mapa_apagar`): sendo o último mapa do e-mail na edição, remove o integrante de todos os grupos (e-mail e apelido), passa a posse ao integrante ativo mais antigo, apaga o grupo que ficar sem ninguém e anonimiza (`'removido'`) o que a pessoa adicionou de rota/convite nos grupos que ficam. Com outro mapa vivo do mesmo e-mail, a pessoa segue nos grupos.
- **Resíduo conhecido:** quem cria um mapa com o e-mail de outra pessoa pode gerar até 5 e-mails por hora para ela (limite por mapa × 5 mapas por e-mail/24 h × limite por IP) e, se for o único mapa do e-mail até a vítima criar o dela, a disputa só se resolve quando alguém confirma. Nenhum dado da vítima fica visível ao invasor.

## Atualização 05/11/2026 (migration 20261220, fechamento de SEC-01/SEC-03/SEC-07/E2E-2)

- **Principal só com prova.** Confirmado: o mais antigo. Nenhum confirmado: só há principal se o e-mail tem **um único** mapa (nada de outro mapa para herdar). Com 2+ mapas e nenhum confirmado ninguém é principal: cada mapa lê só os próprios carimbos, sem posição, fora do ranking, dos grupos e do prêmio, até alguém provar o e-mail. Ao confirmar, o mapa confirmado vira o principal e o apelido do ranking é o dele. *Decisão consciente:* um mapa único não confirmado continua principal porque, sem confirmação possível hoje (provedor), exigir confirmação esvaziaria ranking e grupos; o custo é que um segundo mapa criado por terceiro tira a pessoa do ranking até ela confirmar.
- **Mapa "mais recente" não existe mais** em nenhuma regra de identidade: `confirmar` = mapa da chave; `recuperar` = principal (em disputa: mais carimbos, depois o mais antigo); confirmar marca só o mapa que recebeu o código; `caca_email_confirmado` olha só o principal.
- **E-mail entregável (SEC-07).** `mapa_criar_v2` e a emissão exigem `^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}.[a-z]{2,24}$`; a edge function responde `400 email_invalido` antes de qualquer RPC. Canal lateral: enchimento na RPC e piso de tempo na borda (D5/emitir).
- **Apagar o mapa** só mantém a pessoa nos grupos se sobrar **outro mapa com e-mail confirmado**; um mapa irmão não confirmado (pode ser de invasor) não herda grupo nem posse. O registro de prêmio já sorteado fica (`caca_premio` não tem FK), como diz o regulamento.
- Teste novo: `supabase/testes/caca-identidade-sequestro.sql` (atacante primeiro, recuperar em disputa, ranking, grupos, prêmio, apagar). Edge function `caca-email` v6.

## Atualização 05/11/2026 — link pessoal por e-mail (pedido do Wilker)

Depois de confirmar o e-mail, o app manda o **link pessoal** do mapa para esse e-mail; a central ganha o botão "Receber meu link por e-mail" (só com e-mail confirmado).

- **Por que a chave vai no pedido:** o banco guarda só o hash (`chave_hash`), então não reconstrói o link. O app manda `{ edicao, email, finalidade: 'link', chave }` à `caca-email`.
- **Trava (migration `20261222_caca_link_por_email`, função interna `mapa_link_validar_interno`, só `service_role`):** só envia se a chave é de um mapa da edição, o e-mail do pedido é o do mapa **e esse e-mail já foi confirmado por código**. Quem cria mapa com o e-mail de outra pessoa não lê o código, então nunca recebe (nem a vítima recebe um link de mapa alheio, porque o e-mail vai ao dono do mapa confirmado).
- **Limites:** 1 por minuto e 5 por hora por mapa; 40 por 10 minutos por IP (hash). Resposta uniforme (`{ ok: true }` ou `{ ok: true, limitado: true }`), igual exista ou não mapa.
- **E-mail:** o link vai como **texto puro, sem `<a>`**, para o provedor não reescrever em link de contagem de cliques (a chave passaria por servidor de terceiro). Aviso "é como uma senha". Sem apelido nem dado do mapa. `montarEmailLink` em `supabase/functions/caca-email/montar.js`.
- **Risco aceito:** quem acessar a caixa de e-mail abre o mapa. Já era verdade pela recuperação por código.
- **Para ligar (nada disto foi aplicado ainda):** aplicar a migration, fazer deploy da `caca-email` e publicar o app. Sem a migration, o envio do link responde `falha_temporaria` e o app mostra "Não deu para enviar o link agora".
- **Reverter:** `supabase/reverter/20261222_caca_link_por_email.sql` (e voltar a edge function à versão anterior).
