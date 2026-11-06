# 15 · Caça — contrato: metas, origem do carimbo, revisão e push

Migration `supabase/migrations/20261207_caca_metas_push.sql` (aplicada no projeto `dgfmoibynftadsyjcclg`) · teste `supabase/testes/caca-metas-push.sql`
(termina em `TESTE_OK`) · edge function `supabase/functions/caca-push/index.ts` (publicada, **só simula por padrão**).
Regra: `15-caca-especificacao.md` §12 e §13. Todas as RPCs abaixo são chamadas com a chave anônima do projeto (`supabase.rpc`).

Convenções: **chave** = a chave pessoal do mapa (a mesma de `mapa_ler_v2`). Chave desconhecida em `caca_metas_ler` devolve `null`;
nas RPCs de push devolve `{ ok:false, motivo:'mapa_desconhecido' }` (nunca exceção). Nenhuma RPC devolve endpoint, `p256dh` ou `auth`.

## 1. Marcos de progresso (migration `20261213_caca_metas_marcos.sql`, aplicada em `dgfmoibynftadsyjcclg`; teste `supabase/testes/caca-metas-marcos.sql`)
Substitui os marcos de exemplo antigos (números absolutos escritos à mão). **Decisão técnica revisável** (Wilker mandou decidir em 05/11/2026): marcos RELATIVOS ao total de casas, que só
comemoram. **Nenhum prêmio por marco**: os benefícios continuam sendo os vouchers diários e o prêmio final (`15-caca-especificacao.md`).

Configuração (`caca_config.chave='metas'`, array de 1 a 20 marcos; cada um é `{ titulo }` mais UM de):
- `casas: int` (1 a 200): número absoluto de casas diferentes;
- `fracao: 0.01..0.99`: parte do total, `round(total × fração)`, nunca menos que 1;
- `casas: 'todas'`: o mapa completo = o total da edição (acompanha o total, nunca fica à mão em 27). Só um, e o último.

Valores de partida: `Primeiro carimbo` (1) · `Pegou o jeito` (fração 0,33) · `Quase lá` (fração 0,67) · `Mapa completo` (todas). Com 27 casas: 1, 9, 18, 27;
com 26 (hoje, porque `caroli-douces` ainda é só "marca"): 1, 9, 17, 26. A migration só troca o valor se ele ainda for o exemplo antigo (nunca sobrescreve
uma gravação da organização). `caca_config` ganhou `nota` e `atualizado_por`.

Resolução (interna `caca_metas_resolver(cfg, total)`, uma só para o visitante e o painel): ordena por casas resolvidas; marcos que caem no mesmo número viram um
(o `todas` vence); marco absoluto acima do total some até o total chegar lá; configuração torta vira lista vazia, nunca exceção.

### `caca_metas_ler(p_chave text) → jsonb | null` (visitante, qualquer pessoa com a chave)
```
{
  total_casas: int,                 // caca_total_casas: não encerradas, com combo
  casas_validadas: int,             // casas diferentes validadas da PESSOA (mapa principal), via caca_ranking_v2
  metas: [ { casas:int, titulo:text, completa:bool, alcancada:bool, faltam:int } ],   // ordenadas por casas, sem repetir; completa = "todas as casas"
  alcancadas: [ ...as metas com alcancada=true ],
  proxima: { ...a primeira meta não alcançada } | null
}
```
Chave desconhecida devolve `null`. O front lê `completa` para escrever "Todas as casas (N)"; o rótulo `exemplo` não existe mais.

### `caca_metas_painel_ler(p_secret text, p_edicao text) → jsonb` (painel; `dado.ler`)
`{ total_casas, marcos (como gravados), resolvidos: [{casas,titulo,tipo}], nota, atualizado_em, atualizado_por }`.

### `caca_metas_gravar(p_secret text, p_metas jsonb) → { ok:true, metas }` (painel; `edicao.gerir`)
Valida de novo no banco e **recusa** (exceção): `nao_autorizado` · `metas_invalidas` (não é lista de 1..20, item que não é objeto, campo além de `casas`/`fracao`/`titulo`)
· `metas_titulo` (vazio ou > 40) · `metas_casas` · `metas_fracao` · `metas_ordem` (a ordem é conferida contra o total atual, ou 27 se a edição ainda não tem casas; não repete)
· `metas_todas_so_no_fim`. Grava, apaga a `nota` ("decisão técnica"), registra `atualizado_por`, audita em `caca_evento` (`metas_gravar`, antes/depois) e o gatilho
`sync_caca_config` avisa os painéis abertos (domínio `carimbos`). O painel (Edição › Carimbos › Metas) edita por linhas (número de casas, parte em % ou todas) e mostra
"Hoje: N casas" para cada marco.

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

## 6. Central de avisos, comunicados e limites (30/12/2026, migration `20261230_caca_avisos`)

**Uma fonte por conceito.** Dispositivos e preferências seguem em `caca_push`; o aviso mora em `caca_aviso`; quem recebe cada aviso (lista da central, visto/novo, estado do push) em `caca_aviso_entrega`, única por `(aviso, mapa)` — é a idempotência. Tabelas sem policy e sem grant.

- **Preferências (6 chaves):** `avaliacao_pendente`, `meta`, `grupo` (ligadas), `imprevisto` (ligada), `edicao` e `voucher` (divulgação: desligadas até a pessoa escolher). Toda categoria de aviso é uma preferência que a pessoa controla.
- **Central (visitante, pela chave do mapa):** `caca_avisos_ler(p_chave)` → `{ avisos[], novos }` (só os avisos DESTE mapa, novo/visto, sem dado de ninguém) e `caca_avisos_visto(p_chave, p_ids)`. Funciona com ou sem push.
- **Comunicados (painel, `producao.gerir` no banco):** `caca_aviso_criar` (rascunho/agendado; título ≤80, texto ≤240; sem e-mail/telefone/`#mapa=`; destino só `/cartoon/caca…`; vigência futura), `caca_aviso_estimar` (contagens), `caca_aviso_enviar` (ação explícita; materializa a central, audita quem e quando), `caca_aviso_cancelar` (só antes do envio), `caca_aviso_listar` (só contagens), `caca_avisos_casas`.
- **Imprevisto:** exige casa + dia, é urgente e só vai a membros ativos de grupo com a casa na rota (`casa_na_rota`). Rota individual fica só no aparelho: não é dado do servidor, então não é público possível. Nada é inferido: o texto vem de fatos escritos por quem confirmou.
- **Limites** (`caca_config.avisos_limites`, fuso `America/Fortaleza`): janela 08h–21h, no máximo 2 lembretes por pessoa/dia e 1 por categoria/dia. Urgente ignora janela e teto de lembretes, nunca a duplicata. Decisão por entrega: `preferencia`, `sem_aparelho`, `limite`, `adiado` (volta na próxima rodada), `enviado`, `falhou`.
- **Push do aviso:** `caca-push` v4, `{ aviso_id, dry_run }`. Título, corpo e destino vêm do banco; `dry_run` é o padrão; real só com `dry_run:false` + `producao.gerir`. Lotes de 200, repetir enquanto `restam > 0`.
- **Automáticos (meta e avaliação pendente):** `caca_avisos_gerar_automaticos()` cria um aviso por evento (`chave_dedupe`: `meta:<mapa>:<casas>`, `pendente:<mapa>:<casa>`); lembrete só se a avaliação continua pendente; nasce DESLIGADO (`caca_config.avisos_auto`). ⚠️ **Não há agendador criado**: ligar o interruptor (`caca_avisos_auto_definir`) não faz nada até alguém agendar a função e o processamento do push. Voucher e imprevisto nunca são automáticos (voucher só por comunicado, porque `caca_premio` está vazia e não se anuncia resultado antes da apuração).
- **Testes:** `supabase/testes/caca-avisos.sql` (rollback, `TESTE_OK`), `tests/cartoon-caca-avisos.test.mjs`, `tests/painel-app-caca-avisos.test.mjs`. Nenhum push real foi enviado.
