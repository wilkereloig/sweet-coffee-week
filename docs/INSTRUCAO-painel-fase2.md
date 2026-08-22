# Instrução — Fechar a Fase 1 e iniciar a Fase 2 (autenticação da organização)
### Para o Claude Code · preparada em 22/08/2026, a partir de verificação direta no Supabase

---

## 0. Contexto — leia antes de tudo

- **A Fase 1 (contas de marca) já está em produção.** `docs/PLANO-painel-contas-participantes.md`
  descreve isso como "não aplicado" (migration não aplicada, Edge Function não implantada) —
  isso ficou **desatualizado**, não está errado: foi escrito antes de alguém aplicar tudo,
  ainda em 22/08. Confirmado agora, direto no banco: migration `contas_marcas_fase1` aplicada,
  Edge Function `criar-acesso-marca` ativa (v3), as quatro tabelas novas existem com RLS e já
  têm 1 linha cada — uma marca já foi vinculada.
- Há também três migrations novas, aplicadas ainda em 22/08 e não narradas em nenhum
  documento: `organizacao_apagar_registro`, `marcar_senha_trocada`, `vincular_marca_manual`.
  Leia o `pg_get_functiondef` das três antes de mexer em qualquer coisa relacionada — este
  documento não repete o corpo delas.
- **Decisões do Eloi, 22/08/2026:**
  1. A Fase 2 (unificar a autenticação da organização) entra **agora**, não depois.
  2. Os campos do formulário de `/marca/` (`public/marca/index.html`) estão confirmados como
     finais — não mexer nisso nesta tarefa.
  3. O projeto Supabase fica no plano **Free** — sem backup automático, sem proteção contra
     senha vazada (HaveIBeenPwned). Isso torna o passo 2 abaixo obrigatório, não opcional.
- Referência de modelo de dados, riscos e o desenho original da Fase 2: continua em
  `docs/PLANO-painel-contas-participantes.md`, §2 e §7 — não repetido aqui.

---

## 1. Absolutos — não negociar

- Trabalhe só em `dev/site-completo`. Nunca em `master`.
- `service_role` nunca em `public/` nem em `src/` — só como variável de ambiente de Edge
  Function.
- Qualquer migration nova: teste primeiro dentro de `begin; ... rollback;` no SQL Editor
  antes de aplicar de verdade. Erro de sintaxe aparece sem nada persistir.
- **Confirme com o Eloi antes de aplicar a migration da Fase 2 de verdade em produção** — isso
  muda como o painel da organização autentica, com dados reais em jogo.
- Não remova `admin_ok` nem a tela de senha única nesta fase. Fica funcionando em paralelo
  até o Eloi confirmar que todo mundo da organização migrou para conta nominal.
- Não toque nos campos do formulário de `/marca/` — já confirmados como finais (seção 0).

---

## 2. Passo obrigatório antes de qualquer coisa: backup

Pendente desde o plano anterior, e agora mais urgente — o banco já guarda uma conta
autenticada real, não só respostas de formulário. Sem CLI/Docker/psql local: use o SQL
Editor do Supabase Dashboard, ou peça ao Eloi para rodar `supabase db dump` na máquina dele.
Guarde o resultado **fora do Supabase**. Isto bloqueia o resto deste documento — não
continue sem isso feito, ou sem confirmação explícita do Eloi de que pode seguir sem.

---

## 3. Verificar o ciclo ponta a ponta, antes de mexer em autenticação

O único registro hoje em `participantes` está com `quero_participar.status = aprovado`, não
`aguardando_cadastro` — sinal de que não passou pelo clique real de "Criar acesso" no painel.

- Rode `select origem_id, criado_em from public.participantes;` e confira se essa linha é um
  teste ou uma marca real. **Não apague nem edite sem perguntar ao Eloi** — pode ser dado
  real de alguém.
- Crie uma candidatura de teste em `/quero-participar/`, aprove no painel, clique em "Criar
  acesso" de verdade, confirme que o link de convite é gerado e que o status muda para
  `aguardando_cadastro`.
- Se algo nesse caminho quebrar, é isso que precisa ser corrigido **antes** da Fase 2 —
  autenticação nova em cima de um caminho não verificado só multiplica o problema.

---

## 4. Teste de RLS entre contas

Não existe ainda — nem no plano anterior, nem depois (não dava para escrever sem banco;
agora dá).

- Crie dois usuários de teste no Supabase Auth, cada um vinculado a um `participantes`
  diferente.
- Autenticado como o usuário A, tente ler e editar a linha do usuário B em `participantes`,
  `participantes_operacao` e `perfis`. Espera-se zero linhas / erro de permissão nos três
  casos.
- Formalize como teste automatizado. `tests/marca.test.mjs` e `tests/organizacao.test.mjs`
  hoje só analisam o script inline de forma estática — este é diferente, precisa rodar
  contra o banco de verdade. Documente isso claramente e limpe os dados de teste ao final.

---

## 5. Confirmar as três ações da ficha do painel da organização

O plano anterior (§6.1) previa quatro ações na ficha de um participante em `/organizacao/`:
reenviar convite, gerar acesso temporário, aprovar cadastro, suspender. Não ficou registrado
se as três últimas já estão implementadas — abra `public/organizacao/index.html` e confirme.
Se faltar alguma, implemente seguindo o padrão das que já existem: HTML+CSS+JS inline, sem
dependência externa, com o teste correspondente adicionado a `tests/organizacao.test.mjs`.

**Nota:** "reenviar convite" não existe por decisão deliberada — a Edge Function
`criar-acesso-marca` é idempotente e devolve 409 se chamada de novo para o mesmo
`origem_id`. O caminho é a marca pedir um novo link em "esqueci a senha", no login de
`/marca/`. Não implemente um botão de reenvio.

---

## 6. Fase 2 — unificar a autenticação da organização

Objetivo: a organização passa a ter contas nominais no Supabase Auth
(`perfis.papel = 'organizacao'`), com `admin_ok` continuando a funcionar em paralelo até
todo mundo migrar.

### 6.1 Criar a função-ponte

```sql
create or replace function public.pode_organizacao(p_secret text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.perfis
       where user_id = auth.uid() and papel = 'organizacao' and ativo
    )
    or (p_secret is not null and public.admin_ok(p_secret));
$$;
```

Teste isolado (`begin; ... rollback;`) antes de aplicar de verdade.

### 6.2 Trocar o guard nas RPCs existentes

Levantamento feito agora via Security Advisor do Supabase — RPCs que hoje checam
`admin_ok(p_secret)` e são candidatas a usar `pode_organizacao` no lugar.
**Confirme lendo o `pg_get_functiondef` de cada uma antes de mexer** — pode haver mais, ou
alguma pode ter uma razão específica para não migrar:

- `get_audit_report(p_secret)`
- `get_contact_requests(p_secret)`
- `get_feedback_admin(p_secret)`
- `get_feedback_report(p_secret)`
- `get_organizacao_resumo(p_secret)`
- `get_participantes(p_secret)`
- `get_participation_interests(p_secret)`
- `get_pesquisa_report(p_secret)`
- `get_quero_participar(p_secret)`
- `get_rankings_admin(p_secret)`
- `get_support_interests(p_secret)`
- `get_suspicious_votes(p_secret)`
- `organizacao_apagar_registro(p_secret, p_origem, p_id)`
- `organizacao_atualizar_registro(p_secret, p_origem, p_id, p_status, p_nota)`

**Fora do escopo, de propósito:** `admin_ping(p_secret)` (é o próprio teste de senha, não
migra), `get_rankings()` (pública, sem `p_secret` — não mexer), e todas as `submit_*`
(formulários públicos, sempre abertos a `anon`).

Para cada função da lista: troque a checagem de `admin_ok(p_secret)` para
`pode_organizacao(p_secret)`, mantendo `p_secret` na assinatura (compatibilidade com quem
ainda usa a senha única). Não precisa mexer no resto do corpo.

### 6.3 Contas nominais para a organização

- Decida com o Eloi quem entra primeiro — provavelmente ele mesmo, para testar.
- Criação de conta segue o padrão da Edge Function `criar-acesso-marca`:
  `admin.auth.admin.createUser` + `generateLink` (tipo `recovery`) — não
  `inviteUserByEmail` (o SMTP embutido do Supabase entrega só 2 e-mails/hora no projeto
  inteiro). Pode reaproveitar a função existente como referência, ou criar uma nova
  (`criar-acesso-organizacao`) se as regras divergirem — não depende de uma candidatura
  aprovada, por exemplo.
- Insere em `perfis` com `papel = 'organizacao'`.
- **Não mexa no front de `/organizacao/` para forçar login nominal ainda.** O objetivo desta
  etapa é só abrir a porta nova, com a porta velha (senha única) continuando a funcionar.
  Migrar a UI de login é uma etapa separada, só depois que `pode_organizacao` estiver
  validada em produção com o Eloi de verdade.

### 6.4 O que não fazer nesta fase

- Não remover `admin_ok` nem a UI de senha única.
- Não migrar `/organizacao/` inteiro para exigir `supabase-js`/sessão — ele segue com fetch
  direto; a sessão de auth da organização passa a existir como opção, não como obrigação.
- Não apagar a linha de teste em `participantes` sem confirmar com o Eloi (seção 3).

---

## 7. Depois de aplicar

- Rode os Security Advisors de novo (tipo `security`) e confira o quadro de RPCs
  chamáveis por `anon` — ele não distingue `admin_ok` de `pode_organizacao`, então as
  mesmas funções continuam aparecendo; o que muda é que agora existe um segundo caminho de
  acesso, nominal e auditável, ao lado do antigo.
- Atualize `docs/PLANO-painel-contas-participantes.md`: marque os itens da Fase 1 (§8) como
  aplicados de verdade (não só escritos), e reconcilie o §9 — duas das quatro perguntas já
  foram respondidas (Pro: não; `/marca/` estática: sim, já construída) e não deveriam
  continuar aparecendo como em aberto.
- Registre a decisão de priorizar a Fase 2 — e a data — em `CLAUDE.md`, seguindo a
  convenção de log de decisões que o próprio arquivo já usa.
- Volte para o Eloi com o que foi feito, o que ficou faltando, e qualquer coisa que não
  bateu com o que este documento previu.
