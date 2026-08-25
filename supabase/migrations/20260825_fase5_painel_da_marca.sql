-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 5 · O painel da marca passa a viver na PARTICIPAÇÃO · 25/08/2026
--
-- A Fase 4 criou `participacoes` sem tocar em `/marca/`, de propósito: a tela
-- continuou lendo as colunas antigas de `participantes` e nada quebrou. Esta
-- migration é a outra metade — o que falta no BANCO para a tela migrar.
--
-- Sete coisas, e nenhuma delas é tabela nova:
--   1. `admin_config.edicao_atual` — sem ela, ninguém sabe qual participação
--      abrir quando uma conta nasce, e a marca entra num painel vazio.
--   2. o helper `abrir_participacao_interna` — a lógica de abrir (idempotência
--      + cópia das unidades do ano anterior) passa a ter UM dono, chamado por
--      três portas: a RPC da organização e as duas de vincular conta.
--   3. as duas `vincular_*` abrem a participação da edição corrente.
--   4. `participacoes` ganha o gatilho de progresso que `participantes` já
--      tinha: a marca digitar move 'aguardando_cadastro' → 'em_preenchimento'.
--   5. o grant de coluna de `participantes` perde `combo_foto_path` e ganha
--      `cnpj`/`razao_social`.
--   6. `marca_concluir_cadastro` valida o modelo NOVO — tema, justificativa,
--      preço, três itens e ao menos uma unidade com endereço.
--   7. o bucket `combos` passa a ser endereçado por participação.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Qual edição está aberta ───────────────────────────────────────────
-- Fica em `admin_config` (uma linha só, `id` boolean default true) porque é
-- exatamente o mesmo tipo de dado que `senha_unica_ativa`: configuração do
-- sistema, não conteúdo. Nasce NULA de propósito — a 17ª edição não foi
-- anunciada, e inventar um código aqui seria inventar dado (CLAUDE.md A4).
alter table public.admin_config add column if not exists edicao_atual text;

create or replace function public.definir_edicao_atual(p_secret text, p_codigo text)
returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  v := nullif(btrim(coalesce(p_codigo, '')), '');
  update public.admin_config set edicao_atual = v where id;
  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'definir_edicao_atual', 'admin_config', 'config',
          jsonb_build_object('edicao', v));
  return v;
end;
$$;

-- ── 2 · Abrir participação: uma implementação, três portas ────────────────
-- Sem este helper, `vincular_conta_marca`, `vincular_marca_manual` e
-- `abrir_participacao` teriam cada uma a sua cópia do "copie as unidades do
-- ano passado" — e a terceira cópia é onde as três começam a divergir
-- (CLAUDE.md §5.2). O guard fica FORA: quem chama de dentro do banco já foi
-- autorizado; quem chama de fora passa por `abrir_participacao`.
create or replace function public.abrir_participacao_interna(
  p_participante uuid, p_edicao text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_anterior uuid;
begin
  if p_participante is null or coalesce(btrim(coalesce(p_edicao, '')), '') = '' then
    return null;
  end if;

  insert into public.participacoes (participante_id, edicao_codigo)
  values (p_participante, btrim(p_edicao))
  on conflict (participante_id, edicao_codigo) do nothing
  returning id into v_id;

  -- Conflito: a participação já existia. Devolve a que existe — dois cliques
  -- não abrem duas, e o chamador não precisa saber por qual dos dois caminhos
  -- passou.
  if v_id is null then
    select id into v_id from public.participacoes
     where participante_id = p_participante and edicao_codigo = btrim(p_edicao);
    return v_id;
  end if;

  select id into v_anterior from public.participacoes
   where participante_id = p_participante and id <> v_id
   order by created_at desc limit 1;

  if v_anterior is not null then
    insert into public.participacao_unidades
      (participacao_id, ordem, endereco, bairro, horarios, faz_delivery, canais_delivery)
    select v_id, ordem, endereco, bairro, horarios, faz_delivery, canais_delivery
      from public.participacao_unidades where participacao_id = v_anterior;
  end if;

  return v_id;
end;
$$;

-- Helper não é superfície de API. Os TRÊS alvos na mesma linha: `public`
-- porque o Postgres concede EXECUTE a PUBLIC em toda função nova, e `anon`
-- herda de lá (CLAUDE.md §4.1, a regra que custou quatro tentativas).
revoke all on function public.abrir_participacao_interna(uuid, text)
  from public, anon, authenticated;

create or replace function public.abrir_participacao(
  p_secret text, p_participante uuid, p_edicao text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.pode(p_secret, 'marca.liberar') then raise exception 'nao_autorizado'; end if;

  v_id := public.abrir_participacao_interna(p_participante, p_edicao);

  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, detalhe)
  values (auth.uid(), 'abrir_participacao', 'participacoes', v_id::text,
          jsonb_build_object('edicao', p_edicao, 'participante', p_participante));

  return v_id;
end;
$$;

-- ── 3 · A conta nova já nasce com a participação da edição aberta ─────────
-- Sem isto a marca entra, autentica, e encontra um painel sem nada para
-- preencher — porque a participação dela só existiria depois de a organização
-- clicar em algo. O acesso é criado JUSTAMENTE para ela preencher.
-- Se `edicao_atual` for nula, nada é aberto e a tela diz isso com todas as
-- letras. Ausência honesta, nunca edição inventada.
create or replace function public.vincular_conta_marca(p_user uuid, p_origem uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_q  public.quero_participar%rowtype;
  v_ed text;
begin
  if p_user is null or p_origem is null then
    raise exception 'argumentos_obrigatorios';
  end if;

  select * into v_q from public.quero_participar where id = p_origem;
  if not found then
    raise exception 'candidatura_nao_encontrada';
  end if;

  insert into public.perfis (user_id, papel)
       values (p_user, 'marca')
  on conflict (user_id) do update set ativo = true;

  insert into public.participantes
         (origem_id, user_id, nome_marca, responsavel, telefone, email,
          instagram, site, status_cadastro)
       values
         (p_origem, p_user, v_q.empresa, v_q.nome, v_q.telefone, v_q.email,
          v_q.instagram, v_q.site, 'aguardando_cadastro')
  on conflict (origem_id) do update
          set user_id = coalesce(participantes.user_id, excluded.user_id)
    returning id into v_id;

  insert into public.participantes_operacao (participante_id)
       values (v_id)
  on conflict (participante_id) do nothing;

  select edicao_atual into v_ed from public.admin_config where id;
  perform public.abrir_participacao_interna(v_id, v_ed);

  update public.quero_participar
     set status = 'aguardando_cadastro'
   where id = p_origem
     and status <> 'cadastro_completo';

  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
       values ('criar_acesso_marca', 'participantes', v_id::text,
               jsonb_build_object('origem_id', p_origem, 'user_id', p_user,
                                  'edicao', v_ed));

  return v_id;
end;
$$;

create or replace function public.vincular_marca_manual(
  p_user uuid, p_nome text, p_responsavel text default null,
  p_telefone text default null, p_email text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ed text;
begin
  if p_user is null or coalesce(btrim(p_nome), '') = '' then
    raise exception 'dados_insuficientes';
  end if;

  -- `papel` fixo em 'marca', igual à irmã: esta função NUNCA cria organização.
  insert into public.perfis (user_id, papel)
       values (p_user, 'marca')
  on conflict (user_id) do update set ativo = true;

  insert into public.participantes
         (origem_id, user_id, nome_marca, responsavel, telefone, email, status_cadastro)
       values
         (null, p_user, btrim(p_nome), nullif(btrim(coalesce(p_responsavel,'')), ''),
          nullif(btrim(coalesce(p_telefone,'')), ''),
          nullif(lower(btrim(coalesce(p_email,''))), ''), 'aguardando_cadastro')
    returning id into v_id;

  insert into public.participantes_operacao (participante_id)
       values (v_id)
  on conflict (participante_id) do nothing;

  select edicao_atual into v_ed from public.admin_config where id;
  perform public.abrir_participacao_interna(v_id, v_ed);

  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
       values ('criar_acesso_marca', 'participantes', v_id::text,
               jsonb_build_object('origem', 'manual', 'user_id', p_user,
                                  'edicao', v_ed));

  return v_id;
end;
$$;

-- ── 4 · Progresso da participação ─────────────────────────────────────────
-- `participantes` já tinha este gatilho; a participação nasceu sem. Sem ele a
-- organização não distingue "recebeu o acesso e não abriu" de "está
-- preenchendo" — que é a diferença entre cobrar e esperar.
-- Substitui `participacoes_touch`: os dois mexem em `updated_at` no mesmo
-- BEFORE UPDATE, e dois gatilhos disputando a mesma coluna é a fonte dupla do
-- §5.2 em miniatura.
create or replace function public.participacoes_progresso()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if old.status_cadastro = 'aguardando_cadastro'
     and new.status_cadastro = old.status_cadastro
     and auth.uid() is not null then
    new.status_cadastro := 'em_preenchimento';
  end if;
  return new;
end;
$$;

drop trigger if exists participacoes_touch on public.participacoes;
drop trigger if exists participacoes_progresso on public.participacoes;
create trigger participacoes_progresso before update on public.participacoes
  for each row execute function public.participacoes_progresso();

-- ── 5 · O grant de coluna de `participantes` ──────────────────────────────
-- SAI `combo_foto_path`: o briefing §3.5 é explícito — a marca não envia foto
-- do combo. A trava de coluna existia nos itens e faltava aqui; escrever o
-- caminho não sobe arquivo nenhum (o bucket é service_role), mas apontar para
-- o arquivo de outra participação basta para trocar a foto na tela.
-- ENTRAM `cnpj` e `razao_social`, opcionais (item 3.4 do comando).
-- `combo_nome`/`combo_descricao` ficam: a coluna segue existindo e a tela
-- deixou de usá-la, o que é diferente de tirar o direito de escrever nela.
revoke update on public.participantes from authenticated;
grant update (nome_marca, responsavel, telefone, email, instagram, site,
              combo_nome, combo_descricao, cnpj, razao_social)
  on public.participantes to authenticated;

-- ── 6 · Concluir cadastro, no modelo novo ─────────────────────────────────
-- Assinatura nova (`p_participacao`), então a antiga é derrubada: `create or
-- replace` não troca o nome de um argumento, e deixar as duas vivas seria
-- deixar de pé a porta que valida o modelo velho.
drop function if exists public.marca_concluir_cadastro(uuid);

create or replace function public.marca_concluir_cadastro(p_participacao uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_pa       public.participacoes%rowtype;
  v_p        public.participantes%rowtype;
  v_faltando text[] := '{}';
  v_unidades int;
  v_item     record;
begin
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then raise exception 'nao_autorizado'; end if;

  select * into v_p from public.participantes
   where id = v_pa.participante_id and user_id = auth.uid();
  if not found then raise exception 'nao_autorizado'; end if;

  if coalesce(trim(v_p.nome_marca), '')          = '' then v_faltando := v_faltando || 'nome_marca'::text; end if;
  if coalesce(trim(v_p.responsavel), '')         = '' then v_faltando := v_faltando || 'responsavel'::text; end if;
  if coalesce(trim(v_p.telefone), '')            = '' then v_faltando := v_faltando || 'telefone'::text; end if;
  if coalesce(trim(v_pa.tema_combo), '')         = '' then v_faltando := v_faltando || 'tema_combo'::text; end if;
  if coalesce(trim(v_pa.tema_justificativa), '') = '' then v_faltando := v_faltando || 'tema_justificativa'::text; end if;
  if v_pa.combo_preco is null or v_pa.combo_preco <= 0 then v_faltando := v_faltando || 'combo_preco'::text; end if;

  select count(*) into v_unidades from public.participacao_unidades
   where participacao_id = p_participacao and coalesce(trim(endereco), '') <> '';
  if v_unidades = 0 then v_faltando := v_faltando || 'unidades'::text; end if;

  -- Os três itens vêm do gatilho, então existem sempre; o que falta é o
  -- conteúdo. Um item por vez, para a tela poder dizer QUAL está incompleto —
  -- "falta o combo" manda a pessoa procurar.
  for v_item in
    select tipo, nome, descricao, ingredientes from public.participantes_itens
     where participacao_id = p_participacao
     order by array_position(array['doce','salgado','bebida'], tipo)
  loop
    if coalesce(trim(v_item.nome), '') = ''
       or coalesce(trim(v_item.descricao), '') = ''
       or coalesce(trim(v_item.ingredientes), '') = '' then
      v_faltando := v_faltando || ('item_' || v_item.tipo)::text;
    end if;
  end loop;

  if array_length(v_faltando, 1) is not null then
    return jsonb_build_object('ok', false, 'faltando', to_jsonb(v_faltando));
  end if;

  update public.participacoes
     set status_cadastro = 'cadastro_completo'
   where id = p_participacao;

  update public.quero_participar
     set status = 'cadastro_completo'
   where id = v_p.origem_id;

  insert into public.auditoria (ator_user_id, ator_rotulo, acao, alvo_tabela, alvo_id)
       values (auth.uid(), 'marca', 'concluir_cadastro', 'participacoes', p_participacao::text);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.marca_concluir_cadastro(uuid) from public, anon;
grant execute on function public.marca_concluir_cadastro(uuid) to authenticated;

-- ── 7 · O bucket das fotos segue a participação ───────────────────────────
-- Caminho passa a ser {participacao_id}/{tipo}.<ext>, igual ao bucket
-- `arquivos`. Foto de combo é fato DA EDIÇÃO: a mesma marca em duas edições
-- tem dois doces diferentes, e `{participante_id}/doce.jpg` só tem lugar para
-- um. Zero objetos no bucket hoje — trocar agora é de graça.
drop policy if exists combos_marca_le on storage.objects;
create policy combos_marca_le on storage.objects
  for select to authenticated
  using (
    bucket_id = 'combos'
    and exists (select 1 from public.participacoes pa
                  join public.participantes p on p.id = pa.participante_id
                 where pa.id::text = (storage.foldername(name))[1]
                   and p.user_id = auth.uid())
  );
