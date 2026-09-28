# Evolução estrutural do painel — 28–29/09/2026

Pedido: "PROJETO: EVOLUÇÃO COMPLETA DO PAINEL SWEET & COFFEE WEEK" (fases 0–20).
Este arquivo é o relatório único: base, mapa, divergências, o que cada fase
entregou, o que ficou pendente e por quê. Complementa
`docs/AUDITORIA-PAINEL-2026-09-28.md` (a revisão anterior, do mesmo dia).

---

## Fase 0 — Base do projeto

| Item | Estado conferido |
|---|---|
| Branch de trabalho | `dev/site-completo` |
| Produção (Vercel) | `master` @ `69a74fd`, deployment `dpl_Ftjzay9myE6ESHCby88ZLCnfUra6` (READY) |
| Distância | `dev` 13 commits à frente de `master` no início; `master` sem nada que `dev` não tenha |
| Banco | Supabase `dgfmoibynftadsyjcclg` — **o mesmo para produção e desenvolvimento** |
| Ponto de rollback do código | tag `base-2026-09-28-pre-evolucao` (= `d5824b8`) |
| Backup de dados | `ELOI SITES/scw-backups/backup-dados-public-2026-09-28.json` (todas as tabelas `public`, contagens conferidas; sha256 `9d2d96a5…`) |
| Retrato do esquema | `ELOI SITES/scw-backups/esquema-public-2026-09-28.json` + `esquema-funcoes-2026-09-28.sql` (83 funções, 26 gatilhos, 24 políticas, grants) |
| Planilha original | Google Drive "SCW 2026.2 - NOVEMBRO- Informações GERAIS" (dono: F2); cópia intacta em `ELOI SITES/scw-dados-importacao/` (sha256 `cd719de8…`) |

⚠️ **Os backups e a planilha ficam FORA do repositório de propósito: o repositório é público** (`wilkereloig/sweet-coffee-week`) e os arquivos têm dado pessoal (telefone, e-mail, CNPJ, endereço de influenciador). A pasta `ELOI SITES/` não é versionada.

Estado do banco no início: 0 marcas, 0 participações, 3 candidaturas, 1 conta nominal da organização, 2.702 votos e 1.582 feedbacks históricos (intocados).

## Fase 1 — Mapa: pedido × o que existia × o que foi feito

| Conceito do pedido | Já existia | Decisão |
|---|---|---|
| ESTABLISHMENT | `participantes` | reusado; ganhou `historico_status`, `cnpj_normalizado`, `telefone_normalizado`, `dados_originais`, lote de origem |
| ESTABLISHMENT_ALIAS | — | `participante_aliases` |
| ESTABLISHMENT_LOCATION | `participacao_unidades` (por participação) | reusado; ganhou `mesas`, `so_delivery` — mesas por unidade **e** por edição |
| USER / ORGANIZATION_USER / ROLE | `perfis`, `funcoes`, `permissoes` | reusado (Fase 11 de 28/09); ações novas: `edicao.gerir`, `importacao.gerir`, `curadoria.decidir`, `pagamento.gerir`, `relacionamento.gerir` |
| EDITION | só o texto `admin_config.edicao_atual` | `edicoes` (17 linhas: 16 do acervo + 2026.2) com FKs em participações, sessões e pedidos |
| EDITION_SCHEDULE | — | `edicao_cronograma` (8 itens da 2026.2, editáveis) |
| EDITION_PARTICIPATION | `participacoes` | reusado; ganhou liberação de foto, pagamento, combo (campos + status + nota), classificação, snapshot |
| THEME | `participacoes.tema_combo` | reusado + `temas_propostos` (ordem de chegada, decisão, conflito) |
| COMBO | `participacoes` + `participantes_itens` | reusado; itens por **posição** 1–3 (item 2 doce ou salgado) |
| AWARD | só em `src/data` | `premiacoes` (271 colocações, geradas da fonte) |
| Histórico das edições | só em `src/data` | `historico_marcas` (123), `historico_aliases` (198), `historico_participacoes` (410) |
| PHOTO_SESSION | `sessoes_fotos` | reusado; responsáveis dos dois lados, lote de origem |
| MATERIAL_ALLOCATION | — | `materiais` |
| DAILY_COMBO_SALE | `vendas_diarias` (única por participação+dia) | reusado; autoria e correção auditada |
| MESSAGE / NOTIFICATION / AUDIT | `mensagens`, `notificacoes`, `auditoria` | reusados |
| RELATIONSHIP_CONTACT | — | `contatos_relacionamento` |
| PRESS_KIT_RECEIPT_HISTORY | — | `presskit_envios` (histórico **e** lista da edição atual, uma tabela só) |
| IMPORT_BATCH / IMPORT_ROW_ISSUE | — | `import_lotes`, `import_linhas`, `revisao_pendencias` (fila de revisão) |

### Divergências entre o pedido e o sistema (documentadas, não escolhidas em silêncio)

| # | Comportamento anterior | Esperado | Solução |
|---|---|---|---|
| D1 | Item 2 do combo só podia ser salgado (`unique(participação, tipo)`) | planilha: "ITEM 2 — Doce ou Salgado" | posição 1–3; item 2 aceita doce |
| D2 | "LIBERADO FOTO" seria um booleano | não presumir que é pagamento | `foto_liberacao` + motivo **e** `pagamento_status` separado; a edição guarda "foto exige pagamento" como aviso, não bloqueio automático |
| D3 | `vincular_marca_manual` sempre cria marca nova | marca importada não pode duplicar | `vincular_conta_participante` + modo `{ participante_id }` na Edge Function (publicação pendente) |
| D4 | Tema livre, sem regra | não repetir; prioridade: chegada + pagamento em dia | propostas com prioridade calculada; unicidade só na APROVAÇÃO |
| D5 | Abas HORÁRIOS e MATERIAIS da planilha 2026.2 | — | são da edição de junho (só 8/21 e 7/24 linhas citam marcas da 2026.2): guardadas como histórico incerto, nada importado |
| D6 | "Press Kit 2024" / "JUN26" | edição quando conhecida | 2024 → `2024`; JUN26 → `2026.1` (a edição de junho); o rótulo da aba fica em `edicao_texto` |
| D7 | Status das listas antigas de Press Kit | "recebeu" | a planilha diz quem **constou na lista**, não quem recebeu: status `constou_na_lista` |
| D8 | Tema da 2026.2 | — | o guia de fotos fala em "edição Cartoon", mas nada confirma que é o nome oficial: `edicoes.tema` ficou vazio para a organização preencher |

## Fase 2 — Segurança crítica

Nenhum risco crítico encontrado: nenhuma chave secreta no front nem no histórico do git; RLS em todas as tabelas; toda política da marca por `auth.uid()`; funções da organização guardadas por `pode()`.

Corrigido: **conta de marca desativada continuava lendo/gravando** com o JWT que já tinha. Agora a política de `participantes` exige `perfis.ativo` e todas as outras herdam (subconsulta respeita RLS). Migration `20260929_fase2_seguranca_conta_ativa.sql`.

## Fase 3 — Modelo

`20260929_fase3_modelo_edicoes_historico_operacao.sql` — tudo aditivo; o painel publicado (`master`) segue funcionando com o banco novo. Aplicado byte a byte igual ao arquivo (sha256 conferido no banco).

## Fase 4 — Usuários internos e auditoria

Base de 28/09 (contas nominais, funções, autoria pela sessão, observações internas, histórico com filtros). Acrescentado: rótulo de autoria por transação para operações em lote (`scw.ator_rotulo`, só funções internas definem) e auditoria de liberação de foto, pagamento, tema, combo, correção de cadastro (antes/depois, CNPJ e telefone mascarados), venda corrigida, material, contato e Press Kit.

## Fases 5–7 — Importação, 2026.2 e revisão

Motor: `scripts/importacao/planilha_para_json.py` (linhas cruas) → `importacao_criar_lote_interna` → `importacao_analisar_interna` → conferência → `importacao_promover_interna` → (`importacao_reverter_interna`). Colunas achadas pelo cabeçalho; nada é corrigido sozinho.

**Lote `b66a8b1e-144b-4152-9b05-c3bd7bc048c5` — conferência exata com o pedido:**

| | Pedido | Obtido |
|---|---|---|
| Participantes | 16 | 16 |
| Liberados para foto | 14 | 14 |
| Agendamentos | 12 | 12 (todos casados, regra registrada por linha) |
| Liberados sem agendamento | DELAS, DIVA | DELAS CAFÉ BISTRÔ, DIVA DO CAFÉ |
| Não liberados | Parma, Canuto's | Parma Doces, Canuto’s |
| Tema / combo / vendas | 0 / 0 / 0 | 0 / 0 / 0 |
| Press Kit 2024 / JUN26 / NOV26 | 45 / 36 / vazio | 45 / 36 / 0 |

Promovido: 16 estabelecimentos + participação 2026.2, 12 sessões de foto (horário de Natal), 67 contatos únicos (79 presenças em listas). Sweet Duo (nome fantasia = nome da pessoa) e Paneer (razão social com texto colado) viraram pendência com o valor original. 23 avisos na fila; nenhum bloqueio. Sem aviso nem push durante a importação.

## Fase 8 — Histórico e identidade

Carga gerada de `src/data` por `scripts/historico-para-sql.mjs` (não digitada), aplicada pelo banco buscando o arquivo do commit e conferindo o sha256. Números canônicos no banco: 16 edições, 123 marcas, 410 participações, 271 colocações, 11 edições premiadas, 44 marcas no pódio.

Vínculo estabelecimento × acervo: 10 das 16 marcas ganharam **sugestão** (nome parecido), nenhuma confirmada. 6 ficaram "sem correspondência no acervo" — **não** "novas". Recorrente e "primeira edição" só por decisão de uma pessoa (ficha → Trajetória).

## Fases 9–14 — Configuração da edição, operação, comunicação e telas

| Fase | Entregue |
|---|---|
| 9 Configuração | vista **Edição**: dados, datas, taxa, regra de foto, horário do lembrete, cronograma editável |
| 10 Fluxo | ficha **Operação**: liberação de foto, pagamento, tema (aprovar/pedir outro), combo (análise, ajuste com nota, aprovado), materiais, sessões; vendas por marca e dia com registro pela organização |
| 11 Comunicação | avisos novos: tema informado, conflito de tema, tema aprovado/recusado, combo aprovado/ajuste, foto liberada, lembrete de venda, prazo chegando — todos pelo mesmo `notificar()` → sino → push |
| 12 Participante | **Hoje**: boas-vindas recorrente/primeira/neutra (só com trajetória confirmada), Minha história, cronograma real, momento da edição (antes/durante/depois), próxima ação estendida (tema, combo, foto, prazo do combo, venda do dia) |
| 13 Painel 360 | ficha com Cadastro, Operação, Mensagens, Trajetória, Histórico, Acesso; Mesa com prazos chegando, temas em conflito, dados para revisar |
| 14 Relacionamento | vista **Contatos**: cadastro consolidado, histórico por pessoa, filtros de apoio (todos, influenciadores, já/nunca receberam, receberam na última, cadastro incompleto, selecionados), lista da edição atual. Sem páginas de Press Kits antigos |

## Fase 15 — Responsividade e UI

A base fluida é de 28/09 (sem coluna presa). As telas novas usam o mesmo vocabulário (`Secao`, listas sem caixa, formulários em duas colunas a partir de 760px, tabela de vendas que rola dentro dela, números sem hover quando não navegam). Barra do celular com 8 destinos (48px cada em 390px).

## Fase 16 — PWA, push e lembretes

PWA e push da revisão de 28/09. Novo: `pg_cron` com `lembrar_vendas` (de hora em hora, só no festival, a partir do horário configurado; sem horário, nada) e `lembrar_prazos` (9h de Natal; tema e combo com prazo em 2 dias ou hoje). Um aviso por marca por dia.

## Fase 17 — Hardening

- `vercel.json`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, HSTS, `Permissions-Policy`, CSP **em modo relatório** (não bloqueia; ver o console antes de ativar).
- Security Advisor: `search_path` fixo nas utilidades novas. Os avisos restantes são o padrão do projeto (funções `SECURITY DEFINER` guardadas por senha/`pode()`) e um ajuste do painel do Supabase (ver pendências).

## Fase 18 — Testes

- `npm run test:organizacao` 197 (13 novos em `tests/painel-app-operacao.test.mjs`), `npm test` 8, `test:redesign` 23, `test:imagens` 9 — todos passam; build ok.
- Banco: `supabase/testes/verificacao-2026-09-29.sql` — autorização (marca A × B, conta desativada, curadoria × administrador, anônimo) e ponta a ponta (tema → conflito → aprovação → duplicata bloqueada → combo → ajuste → vínculo → história → lembrete). Rodado em 29/09 com o resultado esperado; tudo desfeito ao fim.
- Sem teste visual/navegador (regra do projeto): a conferência visual é do Wilker.

## Fases 19–20 — Cutover e documentação

- Dados da 2026.2 **já estão no banco de produção** (o banco é um só). O painel publicado (`master`) enxerga as 16 marcas e as 12 sessões; as telas novas só aparecem com o merge `dev/site-completo` → `master` (**decisão do Wilker, A2**).
- Compatibilidade com o painel publicado: o gatilho `garantir_edicao` cria a edição quando um código novo aparece (definir edição atual, abrir vaga, abrir participação), para a chave estrangeira nova não quebrar o fluxo antigo. Código fora do padrão AAAA/AAAA.N continua recusado. As RPCs que mudaram de retorno (`get_participantes`, `get_sessoes_fotos`) só ganharam colunas no fim; os códigos de "falta" do cadastro foram mantidos.
- Documentação: este arquivo, `CLAUDE.md` §10.4-b (Fase 12), `docs/PAINEL-REACT-MAPA.md`.

---

## Pendências que dependem do Wilker

1. **Publicar 4 Edge Functions** (o conector MCP recusa o deploy): `enviar-push`, `regerar-senha-conta`, `criar-conta-organizacao`, `criar-acesso-marca` — `supabase functions deploy <nome> --no-verify-jwt`. Sem a última, "Criar acesso" de marca importada mostra o recado de publicação pendente (não cria duplicata).
2. **Merge em `master`** quando aprovar (A2).
3. **Revisão de dados** (Edição → Revisão): 22 avisos — Paneer (razão social), 8 "instagram" que são veículos, 4 contatos sem endereço, 2 "Indicacao Suzi", duplicidades Arthur e Valeska / Diana Petta, observação "2 pontos (confirmar)" da Paneer.
4. **Trajetória**: confirmar ou descartar as 10 sugestões de acervo (Bolomania, Caffè Basilico's, Canuto's, Casa 1190, Just, Sweet Duo, Marlon Vinicius, Padoca, Paneer, Parma).
5. **Edição**: preencher o tema (se for "Cartoon", confirmar), a taxa e o horário do lembrete de venda.
6. **Supabase → Authentication → Leaked password protection**: ligar (configuração de segurança do projeto; não é algo que eu mude).
7. MFA para a equipe: o Supabase Auth suporta TOTP; exigir exige tela de cadastro do segundo fator e checagem de `aal2` em `pode()` — proposta para a próxima rodada.
8. As 9 migrations de junho sem arquivo: CSV do SQL Editor (regra: não transcrever).

## Nomes dos participantes (pedido de 29/09/2026)

"Sempre padronize os nomes dos participantes, que devem ser o nome do empreendimento." Regra no banco (`20260929_fase12_padrao_nomes.sql`) — ver `CLAUDE.md` §10.4-b. Aplicada às 16 marcas:

| Na planilha | Padronizado | Regra |
|---|---|---|
| BOLDFOOD CONFEITARIA INCLUSIVA | Boldfood Confeitaria Inclusiva | grafia |
| BOLOMANIA | Bolomania | acervo |
| Caffè Basilicos | Caffè Basilico's | acervo |
| Canuto’s | Canuto's | acervo |
| Casa Alice doceria | Casa Alice Doceria | grafia |
| COOKITOS | Cookitos | grafia |
| DELAS CAFÉ BISTRÔ | Delas Café Bistrô | grafia |
| DIVA DO CAFÉ | Diva do Café | grafia |
| JUST Food&Coffee | Just Food&Coffee | acervo |
| Mariana machado ramalho da silva | Sweet Duo Confeitaria | nome do empreendimento (era nome de pessoa) |
| Mariana’s confeitaria | Mariana's Confeitaria | grafia |
| PADOCA DO BOSQUE | Padoca do Bosque | acervo |
| Paneer | Paneer Pâtisserie | acervo (§9.3, forma longa) |
| Casa 1190 Restaurante e Coffee · Marlon Vinicius - Confeitaria e Café · Parma Doces | sem mudança | já no padrão |

**Para o Wilker decidir:** o site grafa "Casa 1190 - Restaurant e Coffee" e "Marlon Vinicius"; a planilha, "Casa 1190 Restaurante e Coffee" e "Marlon Vinicius - Confeitaria e Café". Enquanto não houver decisão, vale o nome declarado pela marca. Decidido, corrige-se num lugar só (o acervo em `src/data` ou a ficha da marca) e a regra passa a usá-lo.

## Deixado de fora, com motivo

- **Aceite formal versionado (§34)**: não há aceite formal hoje; criar tabela sem processo real seria estrutura vazia. Quando existir o termo, entra como `termos` + `aceites` (edição, versão, conteúdo, quem, quando).
- **Envio de arte pela marca (§33)**: o fluxo de pedido + resposta existe; subir arquivo pela marca exige política de Storage nova — próxima rodada.
- **Upload da planilha pelo painel**: exigiria biblioteca de xlsx no navegador; a importação é por script (uma vez por edição), com rastreabilidade completa no banco.
- **CSP bloqueante**: só depois de observar o relatório no navegador.
- **Restrição de tipo de arquivo no bucket `arquivos`**: hoje só a organização sobe (URL assinada); restringir sem saber os formatos usados (ex.: `.ai`) poderia travar o trabalho.

## Rollback

- Código: `git checkout base-2026-09-28-pre-evolucao` (ou reverter os commits de 29/09).
- Importação: `select public.importacao_reverter_interna('b66a8b1e-144b-4152-9b05-c3bd7bc048c5')` — recusa se alguma marca do lote já tiver conta.
- Esquema: tudo aditivo; remover = `drop` das tabelas novas (lista na Fase 1) e das colunas novas. Lembretes: `select cron.unschedule('scw-lembrar-vendas'); select cron.unschedule('scw-lembrar-prazos');`.
- Dados anteriores: `scw-backups/backup-dados-public-2026-09-28.json`.

## LGPD — mapa de dados (fatos, não política jurídica)

| Dado | Onde | Finalidade | Quem acessa |
|---|---|---|---|
| Responsável, telefone, e-mail, CNPJ, razão social da marca | `participantes` | operação da edição e contrato | organização (RPC) e a própria marca (RLS) |
| Endereços e horários das unidades | `participacao_unidades` | divulgação e rota | idem |
| Nome, @, telefone e **endereço residencial** de influenciadores/convidados | `contatos_relacionamento`, `presskit_envios` | entrega de Press Kit | só organização (sem política para `authenticated`/`anon`) |
| Valores originais importados | `import_linhas.dados_originais`, `*.dados_originais` | auditoria da importação | só organização (importação: só administrador) |
| Autoria e histórico | `auditoria` | rastreabilidade | organização; CNPJ/telefone mascarados nas correções |
| Votos e feedback históricos | `votos`, `feedback_geral` | Sweet Awards | intocados nesta rodada |

Correção: pelo painel (campo a campo, com histórico). Exclusão/anonimização: não há tela — hoje é SQL manual, e precisa de decisão sobre prazo de retenção (não inventado aqui). Fornecedores: Supabase (banco, Auth, Storage, Edge Functions), Vercel (site), Google (Analytics com consentimento, Drive da planilha), Cloudflare (Turnstile).

## Resposta a incidente

1. **Conta da equipe comprometida**: Equipe → desativar (efeito imediato em `pode()`); gerar senha nova.
2. **Conta de marca comprometida**: desativar o perfil (`suspender_conta` ou `update perfis set ativo=false`) — efeito imediato pela RLS; depois senha nova pela ficha (Acesso).
3. **Senha compartilhada vazou**: Equipe → desligar acesso compartilhado (exige administrador nominal), ou `select public.set_admin_secret($$…$$)`.
4. **Chave de serviço / VAPID**: trocar no painel do Supabase (VAPID: as duas metades juntas, ver memória `chaves-vapid-scw`).
5. **Consultar o que houve**: Equipe → Histórico (filtros por pessoa, ação, período, marca) ou `get_atividade`.
6. **Parar automações**: `cron.unschedule` dos dois lembretes; desligar o gatilho `disparar_push` se o push for o problema.
7. **Restaurar**: plano free não tem backup automático — usar o JSON de `scw-backups` e reverter lotes de importação pela função própria.
