# 15 · Caça aos Carimbos — contrato de identidade e recuperação

Migration `supabase/migrations/20261205_caca_identidade.sql` (aplicada) · teste `supabase/testes/caca-identidade.sql` ·
edge function `supabase/functions/caca-email` (publicada). Regra de produto: `15-caca-especificacao.md` §3 e §4.
Tudo é **aditivo**: `mapa_criar`, `mapa_ler`, `mapa_ler_v2`, chaves e mapas existentes não mudaram.

## Decisões

| # | Decisão |
|---|---|
| D1 | **Pessoa = e-mail normalizado** (`lower` + `btrim`). Ponto e `+alias` do Gmail **não** são colapsados: `a.b@gmail.com` e `ab@gmail.com` são duas pessoas. Isso permite burlar o limite de criação com aliases; fica registrado, não resolvido. |
| D2 | **Confirmar** (e recuperar) marca `email_confirmado_em` **só no mapa a que o código foi emitido** — o mapa principal (D8) —, não em todos os mapas do e-mail (mudou em 05/11/2026, migration 20261210). O status `confirmado` continua sendo da pessoa: vale se o mapa principal está confirmado. |
| D3 | **Recuperar** emite chave nova só para o mapa **principal** da pessoa (D8; antes era o mais recente). A chave antiga **desse mapa** deixa de valer no ato; os outros mapas da pessoa seguem com as chaves deles (como mapas secundários). Nenhum progresso se perde: ele é do principal. Recuperar também confirma o e-mail do principal (provou controle dele). |
| D4 | Código: 6 dígitos, vale **10 min**, **uso único**, **5 tentativas**, só em hash (sha256 com pepper guardado no banco, em tabela fechada). Pedido novo invalida o anterior da mesma finalidade. |
| D5 | Limite de pedidos de código: **1 por minuto e 5 por hora por e-mail**. Conta igual exista ou não mapa para o e-mail, então o limite não revela existência. ~~500 por hora no total~~ **saiu** (SEC-06): qualquer anônimo esgotava o balde e travava todo mundo. Resta um teto de **600 códigos emitidos por hora** (cota do provedor), que conta só e-mails com mapa e **não** devolve `limitado`. |
| D6 | Criação de mapa (`mapa_criar_v2`): **5 mapas por e-mail em 24 h** e, quando o cabeçalho `cf-connecting-ip` chega pelo PostgREST, **60 mapas por IP em 10 min** (guardado só como hash, em `mapa_criar_ip`, apagado após 2 dias). ~~300 por edição em 10 min~~ **saiu** (SEC-06). Sem o cabeçalho, só vale o limite por e-mail; limite global/por IP de verdade é da borda (Cloudflare/WAF), não do banco. |
| D8 | **Mapa principal** (`caca_mapa_principal(edicao, email)`, interna): entre os mapas do mesmo e-mail na edição, o **confirmado mais antigo**; se nenhum está confirmado, o **mais antigo**. Só ele tem os direitos "da pessoa": entra e age em grupos, dá o perfil do ranking (apelido, WhatsApp, `no_ranking`) e o contato do prêmio, recebe o código e a chave nova da recuperação, e conta como e-mail confirmado para o voucher. Mapa **secundário** (mesmo e-mail, não principal): `mapa_ler_v2` mostra só os carimbos do próprio mapa (sem posição), `caca_metas_ler` devolve 0, as RPCs de grupo respondem `negado`. Quem controla o e-mail sempre retoma o principal por "recuperar" (a chave do invasor morre). |
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
- `muitos_pedidos`: mais de 5 mapas do mesmo e-mail em 24 h, ou mais de 300 mapas na edição em 10 min. O front mostra "Muitos pedidos agora, tente de novo em alguns minutos".
- O e-mail é normalizado (`lower` + `btrim`). Não colapsa ponto/`+alias`.
- Mapa recém-criado vem com `email_confirmado_em = null`.

### `mapa_confirmar_email_status(p_chave text) -> jsonb`
Retorna `{ "confirmado": boolean, "valido": boolean }`.
- `valido=false` (e `confirmado=false`): chave desconhecida (por exemplo, trocada numa recuperação).
- `confirmado`: da pessoa (qualquer mapa do mesmo e-mail na edição).
- Efeito colateral: carimba `ultimo_acesso_em` do mapa (no máximo uma gravação por hora).
- Uso: decidir se mostra o lembrete discreto "confirme seu e-mail".

### `mapa_codigo_validar(p_edicao text, p_email text, p_codigo text, p_finalidade text) -> jsonb`
`p_finalidade`: `'confirmar'` ou `'recuperar'`. `p_codigo`: 6 dígitos (espaços nas pontas são ignorados). `p_email` é normalizado.
- Sucesso `confirmar`: `{ "ok": true, "finalidade": "confirmar" }`.
- Sucesso `recuperar`: `{ "ok": true, "finalidade": "recuperar", "chave": "<chave nova>", "apelido": "<apelido do mapa>" }`.
  A chave nova vem **uma única vez** e o front deve gravá-la como a chave do aparelho; ela funciona em `mapa_ler`, `mapa_ler_v2`, `mapa_carimbar` etc. A chave antiga daquele mapa passa a devolver `null` / `mapa_desconhecido`.
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
| `200 { "ok": true, "limitado": true }` | Limite do e-mail (D5) atingido. Também independe de existir mapa. O front pode mostrar "Aguarde um minuto antes de pedir outro" e manter o próprio contador de 60 s. |
| `200 { "ok": false, "motivo": "email_indisponivel" }` | Provedor de e-mail não configurado ou banco indisponível. **Nada foi gravado.** O front mostra a alternativa (ex.: "Não conseguimos enviar agora; use o aparelho onde criou o mapa ou fale com a organização"). |
| `400 { "ok": false, "motivo": "pedido_invalido" }` | JSON malformado, finalidade fora de `confirmar`/`recuperar`, edição vazia, e-mail com mais de 254 caracteres. |
| `405 { "ok": false, "motivo": "metodo_nao_permitido" }` | Método diferente de POST/OPTIONS. |

O e-mail só sai se houver mapa para o endereço (e, no caso `confirmar`, ainda não estiver confirmado). O front não deve inferir isso da resposta. Se o provedor recusar o envio, a resposta continua `{ok:true}` (senão revelaria que o e-mail tem mapa); o erro vai só para o log, sem dados pessoais.

**Estado atual do envio:** a função está publicada, mas responde `email_indisponivel` porque as variáveis do provedor ainda não existem no projeto (ver pendências). Quando existirem, o envio passa a funcionar sem nova publicação.

---

## Funções internas (somente `service_role`; nunca chamar do front)

### `mapa_codigo_emitir_interno(p_edicao text, p_email text, p_finalidade text) -> jsonb`
Núcleo do pedido, chamada pela edge function. Normaliza o e-mail, aplica o limite (D5), cria o código (hash), invalida o anterior aberto da mesma finalidade e devolve o código em claro **só aqui**.
- `{ "ok": true, "enviar": true, "codigo": "123456", "apelido": "...", "expira_em": "<timestamptz>" }` — enviar por e-mail.
- `{ "ok": true, "enviar": false }` — nada a enviar: entrada inválida, edição desconhecida, e-mail sem mapa, ou `confirmar` para e-mail já confirmado.
- `{ "ok": true, "enviar": false, "limitado": true }` — limite atingido.
- O código vai para o mapa **mais recente** da pessoa (relevante só para `recuperar`).
- Limpa pedidos e códigos com mais de 2 dias.

### `mapa_codigo_pedir(p_edicao text, p_email text, p_finalidade text) -> jsonb`
Fachada de resposta uniforme: executa o mesmo pedido e devolve só `{ "ok": true }` ou `{ "ok": true, "limitado": true }`, sem código. **Não é para o front** (um pedido sem entrega do código só queimaria o limite). Existe para testes e para chamadas de serviço que não precisam do código.

### `caca_email_confirmado(p_edicao text, p_email text) -> boolean`
`true` se algum mapa da pessoa (e-mail normalizado) na edição tem `email_confirmado_em` preenchido. **A função de vouchers/premiação deve usar esta** antes de entregar qualquer voucher: só e-mail confirmado recebe. Aceita e-mail com maiúsculas ou espaços.

### Utilitárias (sem grant para ninguém além do dono)
`caca_hash_texto(text) -> text` (sha256 com pepper) · `caca_igual_ct(text, text) -> boolean` (comparação de mesmo tamanho sem parar no primeiro byte diferente).

---

## Tabelas e colunas (todas fechadas: RLS ligado, `revoke all` de anon/authenticated)

- `mapas_lover.email_confirmado_em timestamptz null` — preenchida ao confirmar ou recuperar, em todos os mapas da pessoa na edição. Mapas antigos ficam `null` (nada retroativo).
- `mapas_lover.ultimo_acesso_em timestamptz null` — atualizada por `mapa_confirmar_email_status` e por `recuperar`.
- `mapa_codigo` — `id, mapa_id, finalidade, codigo_hash, expira_em, tentativas, usado_em, criado_em`.
- `mapa_codigo_pedido` — `email_hash, criado_em` (contagem do limite; sem e-mail em claro).
- `caca_segredo` — pepper do hash, gerado no banco; nunca sai dele.

## Variáveis de ambiente da edge function

`RESEND_API_KEY` e `CACA_EMAIL_FROM` (se faltar a segunda, usa `EMAIL_FROM`, a da `send-vote-email`). O domínio do remetente precisa estar verificado no provedor (DNS/SPF/DKIM). `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas pelo Supabase. Nenhum valor mora no repositório.

## O que o front precisa fazer

1. Criar mapa por `mapa_criar_v2` (tratar `muitos_pedidos`).
2. Mostrar o lembrete de e-mail pendente com `mapa_confirmar_email_status(chave)`; botão "enviar código" chama `caca-email` com `finalidade: 'confirmar'`; campo de 6 dígitos chama `mapa_codigo_validar`.
3. "Perdi meu mapa" / aparelho novo: pede e-mail, chama `caca-email` com `finalidade: 'recuperar'`, depois `mapa_codigo_validar`; guarda a `chave` devolvida.
4. Nunca mostrar chave, código ou e-mail em URL, log, analytics, ranking ou arte de compartilhamento.
