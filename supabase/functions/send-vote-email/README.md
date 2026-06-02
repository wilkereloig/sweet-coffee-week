# send-vote-email

E-mail de agradecimento após o voto no Sweet Awards. **1 envio por e-mail**
(dedup via tabela `public.vote_emails`), mesmo que a pessoa vote em vários
participantes.

## Fluxo

1. `Votar.jsx` → após `submit_vote` com sucesso → `supabase.functions.invoke('send-vote-email', { body: { email, nome } })` (best-effort, não trava o voto).
2. A função tenta `insert` em `vote_emails`:
   - **novo e-mail** → envia via Resend.
   - **já existe** (`23505`) → não reenvia (`skipped: already_sent`).
3. Sem provedor configurado → grava o dedup e responde `queued` (não envia, não quebra).

## Pré-requisitos no banco

Rode o `supabase/schema.sql` atualizado (cria a tabela `vote_emails`).

## Variáveis de ambiente (secrets da função)

| Secret | Obrigatória | Descrição |
|---|---|---|
| `RESEND_API_KEY` | sim (p/ enviar) | Chave da API [Resend](https://resend.com). Sem ela, a função só faz o dedup e não envia. |
| `EMAIL_FROM` | sim (p/ enviar) | Remetente verificado no Resend, ex: `Sweet & Coffee Week <ola@sweetcoffeeweek.com.br>`. |
| `SUPABASE_URL` | automática | Injetada pelo Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | automática | Injetada pelo Supabase. |

> O domínio do `EMAIL_FROM` precisa estar verificado no Resend (DNS/SPF/DKIM).

## Deploy

```bash
# 1. setar secrets
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set EMAIL_FROM="Sweet & Coffee Week <ola@sweetcoffeeweek.com.br>"

# 2. publicar a função
supabase functions deploy send-vote-email
```

## Teste rápido

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/send-vote-email" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","nome":"Ana"}'
```

Respostas possíveis: `{"sent":true}`, `{"skipped":"already_sent"}`,
`{"queued":true,"note":"email_provider_nao_configurado"}`.

## Trocar de provedor

O envio está isolado no `fetch` para `api.resend.com`. Para usar outro provedor
(SendGrid, SES, SMTP via serviço), troque só esse bloco em `index.ts`.
