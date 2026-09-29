-- =============================================================================
-- Reestruturação do painel · Etapa 3 — o administrador edita o cadastro da marca
-- (docs/superpowers/specs/2026-09-29-painel-reestruturacao-design.md).
--
-- Até aqui o cadastro (itens do combo, preço, unidades, delivery) só era
-- escrito pela própria marca, sob RLS. O administrador passa a completar e
-- corrigir tudo pelo painel — por RPC security definer, guardada pela ação
-- nova `cadastro.editar` (só a função Administrador), e cada mudança vai para
-- a auditoria com o antes e o depois.
--
-- Excluir participante continua proibido: arquivar tira da lista e restaurar
-- devolve (decisão do Wilker, 29/09/2026). `arquivado_em` fica na marca.
--
-- ⚠️ Nome de marca COM conta não muda de grafia de fato: o login é o nome
-- do estabelecimento (slug → e-mail interno). Trocar o nome deixaria a marca
-- sem conseguir entrar — a RPC recusa com `nome_com_conta`; só formatação
-- (mesma forma normalizada) passa. Mesma regra de padronizar_nomes (Fase 12).
-- =============================================================================

insert into public.permissoes (funcao, acao) values ('administrador', 'cadastro.editar')
on conflict do nothing;

alter table public.participantes
  add column if not exists arquivado_em timestamptz,
  add column if not exists arquivado_rotulo text;

-- ── Lista de marcas: arquivadas só quando pedidas ───────────────────────────
drop function if exists public.get_participantes(text);
create or replace function public.get_participantes(p_secret text, p_arquivados boolean default false)
returns table (id uuid, created_at timestamptz, updated_at timestamptz, origem_id uuid, user_id uuid, slug text,
  nome_marca text, responsavel text, telefone text, email text, instagram text, site text, cnpj text,
  razao_social text, participacao_id uuid, edicao_codigo text, status_cadastro text, tema_combo text,
  combo_preco numeric, unidades bigint, itens_prontos bigint, edicoes bigint, historico_status text,
  foto_liberacao text, pagamento_status text, combo_status text, pendencias bigint,
  sessao_fotos timestamptz, participacoes_acervo bigint, arquivado_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_ed text;
begin
  if not public.pode(p_secret, 'dado.ler') then return; end if;
  select c.edicao_atual into v_ed from public.admin_config c where c.id;
  return query
    select p.id, p.created_at, p.updated_at, p.origem_id, p.user_id, p.slug,
           p.nome_marca, p.responsavel, p.telefone, p.email, p.instagram, p.site, p.cnpj, p.razao_social,
           pa.id, pa.edicao_codigo, coalesce(pa.status_cadastro, 'sem_participacao'), pa.tema_combo, pa.combo_preco,
           (select count(*) from public.participacao_unidades u
             where u.participacao_id = pa.id and coalesce(trim(u.endereco), '') <> ''),
           (select count(*) from public.participantes_itens i
             where i.participacao_id = pa.id and coalesce(trim(i.nome), '') <> ''
               and coalesce(trim(i.descricao), '') <> '' and coalesce(trim(i.ingredientes), '') <> ''),
           (select count(*) from public.participacoes t where t.participante_id = p.id),
           p.historico_status, pa.foto_liberacao, pa.pagamento_status, pa.combo_status,
           (select count(*) from public.revisao_pendencias r where r.participante_id = p.id and r.status = 'aberta'),
           (select min(s.data_hora) from public.sessoes_fotos s where s.participacao_id = pa.id
             and s.status in ('agendada','remarcada')),
           (select count(distinct h.edicao_codigo) from public.historico_participacoes h
             join public.participante_vinculos v on v.chave = h.chave
            where v.participante_id = p.id and v.status = 'confirmado'),
           p.arquivado_em
      from public.participantes p
      left join lateral (
        select pp.* from public.participacoes pp where pp.participante_id = p.id
         order by (pp.edicao_codigo is not distinct from v_ed) desc, pp.edicao_codigo desc, pp.created_at desc
         limit 1) pa on true
     where (p.arquivado_em is null) <> coalesce(p_arquivados, false)
     order by p.created_at desc;
end $$;
revoke all on function public.get_participantes(text, boolean) from public;
grant execute on function public.get_participantes(text, boolean) to anon, authenticated;

-- ── Auxiliar: antes/depois de um campo, com dado sensível mascarado ─────────
create or replace function public.campo_auditado(p_campo text, p_de text, p_para text)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(p_campo, jsonb_build_object(
    'de', case when p_campo in ('cnpj','telefone') then public.mascarar(p_de) else p_de end,
    'para', case when p_campo in ('cnpj','telefone') then public.mascarar(p_para) else p_para end))
$$;
revoke all on function public.campo_auditado(text, text, text) from public, anon, authenticated;

-- ── A marca (dados que atravessam as edições) ───────────────────────────────
create or replace function public.org_salvar_participante(p_secret text, p_participante uuid, p_dados jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.participantes%rowtype;
  k text; v_de text; v_para text; v_mud jsonb := '{}'::jsonb;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select * into v from public.participantes where id = p_participante for update;
  if not found then raise exception 'participante_nao_encontrado'; end if;
  for k in select jsonb_object_keys(coalesce(p_dados, '{}'::jsonb)) loop
    if k not in ('nome_marca','responsavel','telefone','email','instagram','site','cnpj','razao_social') then
      raise exception 'campo_invalido';
    end if;
    v_para := nullif(btrim(p_dados ->> k), '');
    execute format('select %I from public.participantes where id = $1', k) into v_de using p_participante;
    if v_de is not distinct from v_para then continue; end if;
    if k = 'nome_marca' then
      if v_para is null then raise exception 'nome_obrigatorio'; end if;
      if v.user_id is not null and public.normalizar_nome(v_para) is distinct from public.normalizar_nome(v_de) then
        raise exception 'nome_com_conta';
      end if;
    end if;
    execute format('update public.participantes set %I = $1 where id = $2', k) using v_para, p_participante;
    -- cnpj_normalizado e telefone_normalizado são colunas geradas: acompanham sozinhas.
    v_mud := v_mud || public.campo_auditado(k, v_de, v_para);
  end loop;
  if v_mud <> '{}'::jsonb then
    insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
    values ('cadastro.editado', 'participantes', p_participante::text, p_participante,
            jsonb_build_object('bloco', 'marca', 'campos', v_mud));
  end if;
end $$;

-- ── A participação (tema, preço, detalhes, status) ──────────────────────────
create or replace function public.org_salvar_participacao(p_secret text, p_participacao uuid, p_dados jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.participacoes%rowtype;
  k text; v_de text; v_para text; v_mud jsonb := '{}'::jsonb;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select * into v from public.participacoes where id = p_participacao for update;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
  for k in select jsonb_object_keys(coalesce(p_dados, '{}'::jsonb)) loop
    if k not in ('tema_combo','tema_justificativa','combo_preco','combo_para_viagem','combo_vegano','combo_diet',
                 'combo_delivery','combo_proposta','status_cadastro') then
      raise exception 'campo_invalido';
    end if;
    v_para := nullif(btrim(p_dados ->> k), '');
    execute format('select %I::text from public.participacoes where id = $1', k) into v_de using p_participacao;
    if v_de is not distinct from v_para then continue; end if;
    if k = 'status_cadastro' and v_para is null then raise exception 'status_invalido'; end if;
    if k = 'combo_preco' then
      update public.participacoes set combo_preco = v_para::numeric where id = p_participacao;
    elsif k in ('combo_para_viagem','combo_vegano','combo_diet') then
      execute format('update public.participacoes set %I = $1::boolean where id = $2', k) using v_para, p_participacao;
    else
      execute format('update public.participacoes set %I = $1 where id = $2', k) using v_para, p_participacao;
    end if;
    v_mud := v_mud || public.campo_auditado(k, v_de, v_para);
  end loop;
  if v_mud <> '{}'::jsonb then
    insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
    values ('cadastro.editado', 'participacoes', p_participacao::text, v.participante_id, p_participacao,
            jsonb_build_object('bloco', 'participacao', 'campos', v_mud));
  end if;
end $$;

-- ── Um item do combo (cria se faltar) ───────────────────────────────────────
create or replace function public.org_salvar_item(p_secret text, p_participacao uuid, p_posicao int, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_pa public.participacoes%rowtype;
  v_id uuid; v_antes jsonb; v_depois jsonb;
  v_tipo text := coalesce(nullif(p_dados ->> 'tipo', ''), case p_posicao when 1 then 'doce' when 2 then 'salgado' else 'bebida' end);
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  if p_posicao not in (1, 2, 3) then raise exception 'posicao_invalida'; end if;
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
  select id, to_jsonb(i) into v_id, v_antes from public.participantes_itens i
   where participacao_id = p_participacao and posicao = p_posicao limit 1;
  if v_id is null then
    insert into public.participantes_itens (participacao_id, participante_id, tipo, posicao)
    values (p_participacao, v_pa.participante_id, v_tipo, p_posicao) returning id into v_id;
  end if;
  update public.participantes_itens set
    tipo = v_tipo,
    nome = case when p_dados ? 'nome' then nullif(btrim(p_dados ->> 'nome'), '') else nome end,
    descricao = case when p_dados ? 'descricao' then nullif(btrim(p_dados ->> 'descricao'), '') else descricao end,
    ingredientes = case when p_dados ? 'ingredientes' then nullif(btrim(p_dados ->> 'ingredientes'), '') else ingredientes end,
    vegano = case when p_dados ? 'vegano' then coalesce((p_dados ->> 'vegano')::boolean, false) else vegano end,
    sem_gluten = case when p_dados ? 'sem_gluten' then coalesce((p_dados ->> 'sem_gluten')::boolean, false) else sem_gluten end,
    sem_lactose = case when p_dados ? 'sem_lactose' then coalesce((p_dados ->> 'sem_lactose')::boolean, false) else sem_lactose end
   where id = v_id
  returning to_jsonb(participantes_itens) into v_depois;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('cadastro.editado', 'participantes_itens', v_id::text, v_pa.participante_id, p_participacao,
          jsonb_build_object('bloco', 'item', 'posicao', p_posicao, 'tipo', v_tipo,
            'nome_de', v_antes ->> 'nome', 'nome_para', v_depois ->> 'nome'));
  return v_id;
end $$;

-- ── Unidades (onde encontrar) ───────────────────────────────────────────────
create or replace function public.org_salvar_unidade(p_secret text, p_participacao uuid, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_pa public.participacoes%rowtype;
  v_id uuid := nullif(p_dados ->> 'id', '')::uuid;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
  if v_id is null then
    insert into public.participacao_unidades (participacao_id, ordem, faz_delivery, canais_delivery, so_delivery)
    values (p_participacao,
            coalesce((select max(ordem) from public.participacao_unidades where participacao_id = p_participacao), 0) + 1,
            false, '[]'::jsonb, false)
    returning id into v_id;
  elsif not exists (select 1 from public.participacao_unidades where id = v_id and participacao_id = p_participacao) then
    raise exception 'unidade_nao_encontrada';
  end if;
  update public.participacao_unidades set
    endereco = case when p_dados ? 'endereco' then nullif(btrim(p_dados ->> 'endereco'), '') else endereco end,
    bairro = case when p_dados ? 'bairro' then nullif(btrim(p_dados ->> 'bairro'), '') else bairro end,
    horarios = case when p_dados ? 'horarios' then nullif(btrim(p_dados ->> 'horarios'), '') else horarios end,
    faz_delivery = case when p_dados ? 'faz_delivery' then coalesce((p_dados ->> 'faz_delivery')::boolean, false) else faz_delivery end,
    so_delivery = case when p_dados ? 'so_delivery' then coalesce((p_dados ->> 'so_delivery')::boolean, false) else so_delivery end,
    mesas = case when p_dados ? 'mesas' then nullif(p_dados ->> 'mesas', '')::int else mesas end,
    canais_delivery = case when p_dados ? 'canais_delivery' then coalesce(p_dados -> 'canais_delivery', '[]'::jsonb) else canais_delivery end
   where id = v_id;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('cadastro.editado', 'participacao_unidades', v_id::text, v_pa.participante_id, p_participacao,
          jsonb_build_object('bloco', 'unidade', 'endereco', p_dados ->> 'endereco'));
  return v_id;
end $$;

create or replace function public.org_remover_unidade(p_secret text, p_unidade uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.participacao_unidades%rowtype; v_part uuid;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select * into v from public.participacao_unidades where id = p_unidade;
  if not found then return; end if;
  select participante_id into v_part from public.participacoes where id = v.participacao_id;
  delete from public.participacao_unidades where id = p_unidade;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('cadastro.unidade_removida', 'participacao_unidades', p_unidade::text, v_part, v.participacao_id,
          jsonb_build_object('endereco', v.endereco, 'bairro', v.bairro));
end $$;

-- ── Arquivar / restaurar a marca ────────────────────────────────────────────
create or replace function public.org_arquivar_participante(p_secret text, p_participante uuid, p_arquivar boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  update public.participantes
     set arquivado_em = case when p_arquivar then coalesce(arquivado_em, now()) end,
         arquivado_rotulo = case when p_arquivar then public.ator_rotulo_atual() end
   where id = p_participante;
  if not found then raise exception 'participante_nao_encontrado'; end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values (case when p_arquivar then 'participante.arquivado' else 'participante.restaurado' end,
          'participantes', p_participante::text, p_participante, '{}'::jsonb);
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'org_salvar_participante(text, uuid, jsonb)', 'org_salvar_participacao(text, uuid, jsonb)',
    'org_salvar_item(text, uuid, int, jsonb)', 'org_salvar_unidade(text, uuid, jsonb)',
    'org_remover_unidade(text, uuid)', 'org_arquivar_participante(text, uuid, boolean)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
