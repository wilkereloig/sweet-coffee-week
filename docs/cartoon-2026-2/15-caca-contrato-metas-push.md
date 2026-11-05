# 15 · Caça — contrato: metas, origem do carimbo, revisão e push

Migration `supabase/migrations/20261207_caca_metas_push.sql` (aplicada no projeto `dgfmoibynftadsyjcclg`) · teste `supabase/testes/caca-metas-push.sql`
(termina em `TESTE_OK`) · edge function `supabase/functions/caca-push/index.ts` (publicada, **só simula por padrão**).
Regra: `15-caca-especificacao.md` §12 e §13. Todas as RPCs abaixo são chamadas com a chave anônima do projeto (`supabase.rpc`).

Convenções: **chave** = a chave pessoal do mapa (a mesma de `mapa_ler_v2`). Chave desconhecida em `caca_metas_ler` devolve `null`;
nas RPCs de push devolve `{ ok:false, motivo:'mapa_desconhecido' }` (nunca exceção). Nenhuma RPC devolve endpoint, `p256dh` ou `auth`.

## 1. `caca_metas_ler(p_chave text) → jsonb | null`
Quem pode: qualquer visitante com a chave.

```
{
  total_casas: int,                 // casas da edição que contam (caca_casas_conta: não encerradas, com combo; mesma conta de mapa_ler_v2)
  casas_validadas: int,             // casas diferentes validadas da PESSOA (e-mail), via caca_ranking_v2
  metas: [ { casas:int, titulo:text, exemplo:bool, alcancada:bool, faltam:int } ],   // ordenadas por casas, sem repetir
  alcancadas: [ ...as metas com alcancada=true ],
  proxima: { ...a primeira meta não alcançada } | null    // null = todas alcançadas (ou sem metas)
}
```
- Metas vêm de `caca_config.chave='metas'` (array de `{casas, titulo, exemplo?}`). Meta com `casas` fora de `1..total_casas`, sem número
  ou repetida é ignorada; valor de configuração que não é array vira `metas: []`.
- ⚠️ **Os marcos 5/10/20/27 e seus títulos são EXEMPLO** (`exemplo: true`): o Wilker não decidiu os números. O front não deve
  prometer prêmio por meta. Para mudar: `update caca_config set valor = '[...]' where chave='metas'` (sem migration).

## 2. Origem do carimbo (sem RPC nova)
Coluna `carimbos.origem` (`'gps' | 'unidade_sem_coordenada' | 'excecao_painel'`), definida por **trigger BEFORE INSERT** a partir
de `conferido`: `true → 'gps'`, `false → 'unidade_sem_coordenada'`. Quem insere não escolhe (valor inventado é normalizado).
`'excecao_painel'` está reservada e **nenhuma função a grava hoje** (não há exceção ao GPS — ver `15-caca-gps-excecao.md`).
`mapa_carimbar` e `mapa_carimbar_casa` não mudaram; o JSON que devolvem é o mesmo.

## 3. `caca_carimbo_revisao_listar(p_secret text, p_edicao text) → jsonb` (painel)
Quem pode: `pode(p_secret,'dado.ler')`; senão levanta exceção `nao_autorizado`. E-mail e WhatsApp só com `relatorio.ler`.

```
{
  total: int,                        // carimbos não anulados com origem <> 'gps' (pode ser > carimbos.length)
  carimbos: [ {                      // mais recentes primeiro, até 500; chaves nulas omitidas
    carimbo_id: uuid, mapa_id: uuid, apelido: text, criado_em: timestamptz,
    origem: 'unidade_sem_coordenada' | 'excecao_painel', casa: text, slug: text, nome_unidade?: text,
    distancia_m?: int, precisao_m?: int,
    email?: text, whatsapp?: text    // só com relatorio.ler
  } ]
}
```
Para anular: `carimbo_anular(p_secret, p_carimbo uuid, p_motivo text) → boolean` (já existente; exige `producao.gerir`; `false` se já estava anulado).
O carimbo anulado some desta lista e do placar.

## 4. Push do visitante (sem login) — preferências
Chaves de preferência (todas booleanas): `avaliacao_pendente`, `meta`, `grupo`, `edicao`. Outras chaves ou valores não booleanos são ignorados.
Padrão do servidor na primeira assinatura: `avaliacao_pendente=true`, `meta=true`, `grupo=true`, **`edicao=false`** (divulgação só por escolha).
Um aparelho novo herda as preferências já gravadas para o mapa; o que o front enviar na chamada prevalece.

### 4.1 `caca_push_registrar(p_chave text, p_subscription jsonb, p_prefs jsonb default null) → jsonb`
`p_subscription` = o `PushSubscription.toJSON()` do navegador: `{ endpoint, keys:{ p256dh, auth } }`.
- Sucesso: `{ ok:true, prefs:{...as 4 chaves}, dispositivos:int }` (aparelhos ativos do mapa, incluindo este).
- `{ ok:false, motivo }`: `mapa_desconhecido` · `assinatura_invalida` · `limite_dispositivos` (máx. 5 aparelhos ativos por mapa).
- `assinatura_invalida` cobre: endpoint que não seja **https** num serviço de push conhecido (`fcm.googleapis.com`, `android.googleapis.com`,
  `*.push.services.mozilla.com`, `*.push.apple.com`, `*.notify.windows.com`), chaves fora do formato base64url, JSON que não é objeto.
- Idempotente: registrar o mesmo endpoint de novo atualiza e reativa. Se o endpoint já pertencia a **outro mapa**, ele passa para este
  (o aparelho é de quem registrou por último; nunca fica duplicado).
- O consentimento é o ato de chamar esta RPC depois do "Permitir" do navegador; chamar sem pedir permissão ao usuário é erro do front.

### 4.2 `caca_push_prefs(p_chave text, p_prefs jsonb) → jsonb`
Atualiza as preferências (merge: chaves não enviadas ficam) em **todos os aparelhos ativos do mapa**.
- Sucesso: `{ ok:true, prefs, dispositivos:int }` · `{ ok:false, motivo:'mapa_desconhecido' | 'sem_assinatura' }`.

### 4.3 `caca_push_remover(p_chave text, p_endpoint text) → jsonb`
Apaga a assinatura deste aparelho **se for deste mapa**. `p_endpoint = null` apaga todos os aparelhos do mapa (recusar tudo / sair).
- `{ ok:true, removidos:int }` (0 se o endpoint é de outro mapa ou não existe) · `{ ok:false, motivo:'mapa_desconhecido' }`.
- Apagar o mapa (`mapa_apagar`) leva as assinaturas junto (cascade).
- O front deve também chamar `subscription.unsubscribe()` no navegador.

### Alternativa para quem não pode ou não quer push (spec §13)
Sem RPC nova: o aviso fica **dentro da Central da Caça** (o mesmo estado que `mapa_ler_v2` e `caca_metas_ler` já devolvem —
avaliação pendente = casa com `estado:'pendente'`; meta = `proxima`/`alcancadas`). O front mostra esses avisos na central ao abrir.

## 5. Edge function `caca-push` (envio — fora do alcance do front público)
`POST https://dgfmoibynftadsyjcclg.supabase.co/functions/v1/caca-push` · `verify_jwt=false`, autenticação própria.
Corpo: `{ secret? , tipo:'avaliacao_pendente'|'meta'|'grupo'|'edicao', dry_run?:boolean, titulo, corpo, url?, mapa_ids?:uuid[] }`.
- Autenticação **de organização sempre** (inclusive para simular): `secret` válido para `pode(…,'producao.gerir')`, ou JWT nominal em
  `Authorization`. Sem isso: `401 {erro:'nao_autorizado'}`.
- **Simulação é o padrão**: só `dry_run:false` (booleano) envia. Simulação devolve `{ ok:true, dry_run:true, destinatarios:int, vapid_configurado:bool }`
  e não manda nada.
- Envio real (`dry_run:false`): `titulo` ≤ 80, `corpo` ≤ 240, `url` caminho interno (`/…`, sem `//` nem domínio, padrão `/`), até 500
  aparelhos por chamada. Devolve `{ ok:true, dry_run:false, destinatarios, enviados, falharam, removidos, limitado:bool }`.
  Erros: `tipo_invalido` 400 · `mapa_ids_invalido`/`titulo_invalido`/`corpo_invalido`/`url_invalida` 422 · `vapid_ausente` 503.
- Destinatários = `ativo` e `prefs->>tipo = 'true'` (e, se vier `mapa_ids`, só desses mapas). Assinatura que o serviço de push
  responde 404/410 é desativada (`ativo=false`).
- Carga enviada ao aparelho: `{ titulo, corpo, url, tag:'scw-caca-<tipo>', tipo:'caca' }` — o service worker da Caça trata `tipo:'caca'`.
  Nunca vão apelido, e-mail, chave ou link de recuperação.
- Sem agendamento, sem gatilho e sem botão no painel: nada chama esta função sozinho. **Nunca disparar envio real em teste.**
- Variáveis de ambiente usadas (nomes; já existem para o `enviar-push`): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
