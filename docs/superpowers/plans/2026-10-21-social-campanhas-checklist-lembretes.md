# Social media — campanhas, checklist e lembretes — plano de implementação

> **Para quem executa:** superpowers:executing-plans (execução inline, na própria sessão). Passos com `- [ ]`.
> Spec: `docs/superpowers/specs/2026-10-21-social-campanhas-checklist-lembretes-design.md` (o comportamento está lá; aqui ficam
> arquivos, interfaces e a ordem).

**Objetivo:** campanhas (uma por postagem), checklist por postagem (avisa, não trava) e lembretes automáticos por `pg_cron`, no
módulo Social media do painel (`painel-app/`, Supabase `dgfmoibynftadsyjcclg` pelo MCP `supabase-scw`).

**Arquitetura:** três migrations aditivas, cada função existente substituída conferida contra a definição VIVA do banco (listada
abaixo); lógica pura em `lib/campanhas.js` e `lib/checklist.js` (testada em Node); telas em `Redes.jsx`/`RedesFicha.jsx` e dois
arquivos novos (`SocialCampanhas.jsx`, `ChecklistPostagem.jsx`); sinal de sincronização pelo gatilho genérico `sync_gatilho`.

**Stack:** Postgres (plpgsql, pg_cron), React 18 + Vite, node:test, Playwright (backend falso em `tests/helpers/backend-falso.mjs`).

## Restrições globais

- Branch `claude/sweet-coffee-week-panel-718a63`; **nada de `master`/deploy de produção sem a ordem do Wilker** — ele já
  mandou publicar tudo junto no fim deste lote (`HEAD:master` e `HEAD:dev/site-completo`), e só então.
- Migration só aditiva (sem `drop`/`delete from`); função substituída mantém assinatura e retorno.
- Toda RPC nova é classificada em `painel-app/src/lib/sync/dominios.js` (o teste reprova esquecimento).
- Cores de campanha = `CORES_PASTA` de `lib/pastas.js` (7 chaves); contraste de ícone já garantido ali.
- Fuso America/Fortaleza; "Salvo" só depois da resposta do servidor; caixa-alta só em `.ui-macro__rotulo`.
- Em Python de edição: `\n` vira quebra de verdade — escrever com `chr(92)` e conferir com `npx vite build --outDir "$TEMP/…"`.
- Build de verificação sempre fora do projeto, uma vez só. Commit só dos arquivos da tarefa (não commitar `AGENTS.md`).

## Definições vivas (base das substituições; md5 do `pg_get_functiondef` em 21/10/2026)

`redes_aplicar` 2c377174… · `redes_criar` 0f88a1f0… · `redes_duplicar` ce760332… · `redes_gravar` cc90ace5… ·
`redes_json` 38183028… · `redes_listar` 2cb4e1ce… · `redes_post` 8ca44aea… · `redes_pendencias` d66cb832… ·
`redes_salvar` = a de `20261028_social_resumo_e_responsavel.sql`.

## Mapa de arquivos

| Arquivo | Papel |
|---|---|
| `supabase/migrations/20261031_social_campanhas.sql` | tabela, coluna, RPCs, ajustes em aplicar/gravar/json/duplicar/salvar, gatilho de sinal |
| `supabase/migrations/20261101_social_checklist.sql` | modelos + itens, RPCs, cópia na criação/duplicação, `redes_json`/`redes_post`, gatilho de sinal |
| `supabase/migrations/20261102_social_lembretes.sql` | `redes_lembretes`, tabela de envios, job do `pg_cron` |
| `supabase/testes/social-campanhas.sql`, `social-checklist.sql`, `social-lembretes.sql` | testes de banco (terminam em exceção `TESTE_OK`) |
| `painel-app/src/lib/campanhas.js`, `lib/checklist.js` | lógica pura |
| `painel-app/src/components/vistas/SocialCampanhas.jsx` | aba Campanhas (lista, formulário, arquivadas) |
| `painel-app/src/components/vistas/ChecklistPostagem.jsx` | bloco do checklist na ficha + folha dos modelos |
| `Redes.jsx`, `RedesFicha.jsx`, `PainelShell.jsx`, `lib/rota.js`, `lib/sync/dominios.js` | ligações |
| `tests/painel-app-campanhas.test.mjs`, `painel-app-checklist.test.mjs`, `painel-social-aprovacao-navegador.mjs` | testes |

---

### Tarefa 1: Campanhas no banco

**Arquivos:** criar `supabase/migrations/20261031_social_campanhas.sql`, `supabase/testes/social-campanhas.sql`.

**Produz:** `redes_campanhas`; `redes_posts.campanha_id`; `redes_campanhas_listar(text)`, `redes_campanha_salvar(text, uuid, jsonb)`,
`redes_campanha_arquivar(text, uuid, boolean)`; `redes_json` com `campanha_id/campanha_nome/campanha_cor`.

- [ ] Escrever o teste de banco primeiro: cria campanha (nome repetido recusado, cor inválida recusada, período invertido
  recusado), liga a uma postagem por `redes_salvar`, confere `redes_json`, arquiva e confere que a postagem mantém a campanha mas
  postagem nova não a escolhe, conta `n_publicadas`/`n_atrasadas`, e que `redes_salvar` com troca de campanha não muda a situação
  de uma postagem `pronto`. Termina em `raise exception 'TESTE_OK'`.
- [ ] Rodar o teste antes da migration (`mcp__supabase-scw__execute_sql`): deve falhar (função/coluna inexistente).
- [ ] Escrever a migration (tabela com `check` de cor igual a `social_pastas_cor_check`; índice único `lower(nome)` onde
  `not arquivada`; RPCs; `redes_aplicar` com ramo `campanha_id` e validação `campanha_invalida`; `redes_gravar` grava a coluna;
  `redes_json` ganha os três campos; `redes_duplicar` copia `campanha_id`; `redes_salvar` entra com `campanha_id` nas duas tuplas
  de comparação e em `campos` do histórico; `revoke`/`grant` como as outras `redes_*`; gatilho `sync_redes_campanhas` com
  `sync_gatilho('redes', 'social', 'id')`).
- [ ] Aplicar com `mcp__supabase-scw__apply_migration`; conferir `md5` das funções substituídas contra o arquivo.
- [ ] Rodar o teste de banco: `TESTE_OK`.
- [ ] Commit: `feat(painel): campanhas do Social media — banco`.

### Tarefa 2: Lógica pura das campanhas

**Arquivos:** criar `painel-app/src/lib/campanhas.js`, `tests/painel-app-campanhas.test.mjs`.

**Produz:** `progressoCampanha(c) → { feitas, alvo, pct, rotulo }`, `validarCampanha(d) → { ok, erros }`, `ordenarCampanhas(lista)`,
`CAMPANHA_VAZIA`, `nomeCurto(nome, max=18)`, `campanhaDaPostagem(post) → { id, nome, cor } | null`.

- [ ] Teste: progresso com meta ("12 de 20 publicadas"), sem meta ("12 publicadas de 18 planejadas"), meta 0, sem postagens;
  validação (nome vazio/longo, cor fora da paleta, `fim < inicio`, meta negativa ou não inteira); ordem (ativas por início, sem
  início por nome, arquivadas por último); `nomeCurto` com reticências.
- [ ] Rodar: falha. Implementar. Rodar: passa (`node --test tests/painel-app-campanhas.test.mjs`).
- [ ] Commit.

### Tarefa 3: Campanhas na tela

**Arquivos:** criar `SocialCampanhas.jsx`; alterar `RedesFicha.jsx` (seletor + rótulo "Edição"), `Redes.jsx` (ponto no cartão,
filtro `camp`, atalho "Ver no calendário"), `PainelShell.jsx`/`lib/rota.js` (aba `social/campanhas`), `lib/sync/dominios.js`
(`redes_campanhas_listar` leitura; `redes_campanha_salvar` e `redes_campanha_arquivar` → `['redes']`), `styles/painel.css` (bloco
`.sc-*` antes do `prefers-reduced-motion` final), `lib/redes.js` (campo `campanha_id` na lista de chaves salváveis, filtro).

**Consome:** RPCs da tarefa 1; `CORES_PASTA`/`estiloPasta` de `lib/pastas.js`; `progressoCampanha` da tarefa 2.

- [ ] Ligar a aba (sem permissão `redes.ver` a aba não aparece); lista com cartão por campanha, barra de progresso, período,
  atrasadas, "Ver no calendário", editar, arquivar/restaurar; formulário em `Folha` com seletor de cor (radiogroup) igual ao de
  pasta; erros do banco traduzidos.
- [ ] Ficha: seletor "Campanha" + "Nova campanha…" (abre o formulário curto e volta com a nova escolhida).
- [ ] Cartão: ponto colorido + nome curto; Filtros: "Campanha" no endereço (`camp=<id>`).
- [ ] `npm run build` fora do projeto + `node --test tests/painel-app-*.test.mjs` (inclui sincronização ampliada).
- [ ] Commit.

### Tarefa 4: Checklist no banco

**Arquivos:** criar `supabase/migrations/20261101_social_checklist.sql`, `supabase/testes/social-checklist.sql`.

**Produz:** `redes_checklist_modelos`, `redes_checklist_itens`; `redes_checklist_modelos_listar(text)`,
`redes_checklist_modelo_salvar(text, text, jsonb)`, `redes_checklist_garantir(text, uuid)`, `redes_checklist_marcar(text, uuid, boolean)`,
`redes_checklist_item_salvar(text, uuid, text)`, `redes_checklist_item_remover(text, uuid)`; `redes_json` com
`checklist_total/checklist_feitos`; `redes_post` com `checklist` (itens); criar/duplicar copiam o modelo do formato.

- [ ] Teste de banco primeiro: modelos iniciais existem por formato; criar postagem copia os itens do formato; marcar grava quem
  e quando e NÃO sobe `versao` nem toca `atualizado_em`; acrescentar/remover; postagem fechada recusa (`post_fechado`); sem
  `redes.gerir` não edita modelo; `garantir` em postagem antiga cria uma vez só; mudar o formato não mexe nos itens.
- [ ] Rodar: falha. Escrever migration (inclui `insert` dos modelos iniciais do spec; ajustes em `redes_criar` e `redes_duplicar`
  chamando `redes_checklist_copiar(post_id)` interno; `redes_json` e `redes_post` recriados com os campos novos; gatilhos de sinal
  `sync_redes_checklist_itens` (`'redes','social','post_id'`) e `sync_redes_checklist_modelos` (`'redes','social',''`)).
- [ ] Aplicar, conferir `md5` das substituídas, rodar o teste: `TESTE_OK`. Commit.

### Tarefa 5: Lógica pura do checklist

**Arquivos:** criar `painel-app/src/lib/checklist.js`, `tests/painel-app-checklist.test.mjs`.

**Produz:** `contagem(itens) → { total, feitos, abertos }`, `rotuloContagem(itens) → '3/5' | ''`,
`textoConfirmacaoEnvio(itens) → string | null` (null = nada aberto), `validarItem(texto) → { ok, erro }`.

- [ ] Teste (lista vazia, tudo feito, abertos listados em ordem, texto longo cortado na confirmação, item vazio/>80). Falha →
  implementar → passa. Commit.

### Tarefa 6: Checklist na tela

**Arquivos:** criar `ChecklistPostagem.jsx`; alterar `RedesFicha.jsx` (bloco antes das gavetas; confirmação em "Enviar para
aprovação"), `Redes.jsx` (cartão "3/5"), `lib/sync/dominios.js` (leitura `redes_checklist_modelos_listar`, escritas →
`['redes']`), `painel.css`.

**Consome:** RPCs da tarefa 4; `lib/checklist.js`; `confirmar` de `components/Confirmar.jsx`.

- [ ] Bloco com caixa de marcar (alvo ≥ 44 px, `role`/rótulo corretos), "quem e quando", acrescentar e remover; "Salvo" só depois
  da resposta; postagem fechada em leitura.
- [ ] Envio para aprovação: `confirmar` com a lista dos abertos (laranja só se for o caso de perigo — aqui é aviso normal).
- [ ] Folha "Checklist padrão" (`redes.gerir`): lista por formato, editar texto/ordem/ativo, salvar o formato inteiro.
- [ ] Build + testes de Node. Commit.

### Tarefa 7: Lembretes

**Arquivos:** criar `supabase/migrations/20261102_social_lembretes.sql`, `supabase/testes/social-lembretes.sql`.

**Produz:** `redes_lembretes_enviados`; `redes_lembretes(p_agora timestamptz default now()) returns integer` (quantos avisos
emitiu); job `scw-redes-lembretes` (`*/10 * * * *`).

- [ ] Teste de banco primeiro, com `p_agora` simulado e 3 postagens montadas dentro da transação: (a) 07:30 → resumo ainda não;
  08:05 → um resumo por responsável, e 08:15 não repete; (b) 1 h antes sem aprovação avisa responsável e aprovadores uma vez;
  (c) 30 min depois sem confirmar avisa uma vez; (d) 2 dias antes sem arte/legenda avisa uma vez; (e) 23:00 não avisa nada;
  (f) reagendar a postagem libera aviso novo; (g) postagem `publicado`/`cancelado` e responsável sem acesso não avisam.
- [ ] Rodar: falha. Migration: `revoke execute … from public, anon, authenticated`; `cron.unschedule` por nome antes de agendar.
- [ ] Aplicar; conferir `cron.job`; rodar o teste: `TESTE_OK`. Commit.

### Tarefa 8: Fechamento

- [ ] Navegador: estender `tests/painel-social-aprovacao-navegador.mjs` (campanha no cartão e na ficha, checklist marcando,
  confirmação de envio com itens abertos) e rodar também `painel-sincronizacao-fumaca-navegador.mjs`,
  `painel-biblioteca-arrastar-navegador.mjs`, `painel-sincronizacao-navegador.mjs`, `painel-app-sync-vistas-navegador.mjs`.
- [ ] `painel-app/CLAUDE.md` (seção Social media: campanhas, checklist, lembretes, matriz de permissões), `NOVIDADES.txt`,
  Dropbox (relatório + `diario.md`), memória `progresso-scw.md`.
- [ ] Rodar tudo: `node --test tests/painel-app-*.test.mjs tests/painel-infra.test.mjs tests/painel-push-carga.test.mjs`, build fora
  do projeto, `npm run test:cartoon`.
- [ ] Commit; **publicar** `HEAD:master` e `HEAD:dev/site-completo` (ordem do Wilker: tudo junto no fim) e conferir
  `https://www.sweetcoffeeweek.com.br/painel/versao.json`.

## Autoverificação contra a spec

Campanhas (modelo, permissões, RPCs, ficha, cartão, filtro, aba, rótulo "Edição") → T1–T3. Checklist (modelos iniciais, cópia na
criação, garantir para antigas, RPCs, não sobe versão, bloco, cartão, confirmação, folha de modelos) → T4–T6. Lembretes (quatro
regras, janela 07–22 h, dedupe, destinatários, `p_agora`, cron) → T7. Sincronização/testes/documentação → T3, T6, T8.
