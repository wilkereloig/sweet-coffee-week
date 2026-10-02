-- Valor do combo é da organização; a marca informa os custos (02/10/2026,
-- pedido do Wilker).
--
-- * edicoes.valor_combo: UM valor para todas as marcas da edição, definido em
--   Edição › Configuração (salvar_edicao). A marca vê e não muda.
-- * participacoes.custo_embalagem / custo_delivery: a marca preenche. Embalagem
--   é obrigatória quando o combo pode ser para viagem; delivery quando alguma
--   unidade faz delivery. Zero vale (o que conta é ter respondido).
-- * campos_cadastro e marca_concluir_cadastro trocam o preço pelos custos que
--   se aplicam — a MESMA regra de custosFaltando() em painel-app/src/lib/cadastro.js
--   e de camposObrigatorios() em guia.js. O total deixa de ser fixo: 16 + custos.
-- * participacoes.combo_preco fica no banco (histórico), mas sai da tela. A
--   permissão de a marca escrever nele cai na migration seguinte
--   (20261002_valor_combo_revoke.sql), depois de o painel novo estar no ar.

alter table public.edicoes add column if not exists valor_combo numeric(10,2)
  check (valor_combo is null or valor_combo > 0);
alter table public.participacoes add column if not exists custo_embalagem numeric(10,2)
  check (custo_embalagem is null or custo_embalagem >= 0);
alter table public.participacoes add column if not exists custo_delivery numeric(10,2)
  check (custo_delivery is null or custo_delivery >= 0);

grant update (custo_embalagem, custo_delivery) on public.participacoes to authenticated;

create or replace function public.campos_cadastro(p_participacao uuid)
 returns table(total integer, faltando integer)
 language sql stable security definer set search_path to 'public'
as $function$
  with pa as (select * from public.participacoes where id = p_participacao),
       p as (select pt.* from public.participantes pt join pa on pa.participante_id = pt.id),
       it as (select i.* from public.participantes_itens i where i.participacao_id = p_participacao),
       entrega as (select exists (select 1 from public.participacao_unidades u
                                   where u.participacao_id = p_participacao and u.faz_delivery) as sim),
       vazios as (
         select (case when coalesce(btrim(p.nome_marca), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(p.responsavel), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(p.telefone), '') = '' then 1 else 0 end)
              + (case when pa.logo_id is null then 1 else 0 end)
              + (case when coalesce(btrim(pa.tema_combo), '') = '' then 1 else 0 end)
              + (case when coalesce(btrim(pa.tema_justificativa), '') = '' then 1 else 0 end)
              + (case when pa.combo_para_viagem is true and pa.custo_embalagem is null then 1 else 0 end)
              + (case when (select sim from entrega) and pa.custo_delivery is null then 1 else 0 end)
              + (case when exists (select 1 from public.participacao_unidades u where u.participacao_id = p_participacao
                                      and coalesce(btrim(u.endereco), '') <> '') then 0 else 1 end) as n,
                16 + (case when pa.combo_para_viagem is true then 1 else 0 end)
                   + (case when (select sim from entrega) then 1 else 0 end) as t
           from pa, p)
  select (select t from vazios),
         (select n from vazios)
         + (select coalesce(sum((case when coalesce(btrim(nome), '') = '' then 1 else 0 end)
                              + (case when coalesce(btrim(descricao), '') = '' then 1 else 0 end)
                              + (case when coalesce(btrim(ingredientes), '') = '' then 1 else 0 end)), 0)::int from it)
         + 3 * greatest(0, 3 - (select count(*)::int from it))
$function$;

create or replace function public.marca_concluir_cadastro(p_participacao uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_pa public.participacoes%rowtype; v_p public.participantes%rowtype;
  v_faltando text[] := '{}'; v_unidades int; v_item record; v_entrega boolean;
begin
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then raise exception 'nao_autorizado'; end if;
  select * into v_p from public.participantes where id = v_pa.participante_id and user_id = auth.uid();
  if not found or not public.conta_ativa() then raise exception 'nao_autorizado'; end if;
  if coalesce(trim(v_p.nome_marca), '')          = '' then v_faltando := v_faltando || 'nome_marca'::text; end if;
  if coalesce(trim(v_p.responsavel), '')         = '' then v_faltando := v_faltando || 'responsavel'::text; end if;
  if coalesce(trim(v_p.telefone), '')            = '' then v_faltando := v_faltando || 'telefone'::text; end if;
  if coalesce(trim(v_pa.tema_combo), '')         = '' then v_faltando := v_faltando || 'tema_combo'::text; end if;
  if coalesce(trim(v_pa.tema_justificativa), '') = '' then v_faltando := v_faltando || 'tema_justificativa'::text; end if;
  if v_pa.combo_para_viagem is true and v_pa.custo_embalagem is null then v_faltando := v_faltando || 'custo_embalagem'::text; end if;
  select exists (select 1 from public.participacao_unidades where participacao_id = p_participacao and faz_delivery) into v_entrega;
  if v_entrega and v_pa.custo_delivery is null then v_faltando := v_faltando || 'custo_delivery'::text; end if;
  select count(*) into v_unidades from public.participacao_unidades
   where participacao_id = p_participacao and coalesce(trim(endereco), '') <> '';
  if v_unidades = 0 then v_faltando := v_faltando || 'unidades'::text; end if;
  for v_item in select tipo, posicao, nome, descricao, ingredientes from public.participantes_itens
                 where participacao_id = p_participacao order by posicao loop
    if coalesce(trim(v_item.nome), '') = '' or coalesce(trim(v_item.descricao), '') = ''
       or coalesce(trim(v_item.ingredientes), '') = '' then
      v_faltando := v_faltando || (case when v_item.posicao = 2 and v_item.tipo = 'doce' then 'item_segundo'
                                        else 'item_' || v_item.tipo end)::text;
    end if;
  end loop;
  if array_length(v_faltando, 1) is not null then
    return jsonb_build_object('ok', false, 'faltando', to_jsonb(v_faltando));
  end if;
  update public.participacoes set status_cadastro = 'cadastro_completo' where id = p_participacao;
  update public.quero_participar set status = 'cadastro_completo' where id = v_p.origem_id;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id)
       values ('concluir_cadastro', 'participacoes', p_participacao::text, p_participacao);
  return jsonb_build_object('ok', true);
end $function$;

-- A organização edita os custos na ficha (combo_preco segue aceito, sem uso na tela).
create or replace function public.org_salvar_participacao(p_secret text, p_participacao uuid, p_dados jsonb)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v public.participacoes%rowtype;
  k text; v_de text; v_para text; v_mud jsonb := '{}'::jsonb;
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  select * into v from public.participacoes where id = p_participacao for update;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
  for k in select jsonb_object_keys(coalesce(p_dados, '{}'::jsonb)) loop
    if k not in ('tema_combo','tema_justificativa','combo_preco','combo_para_viagem','combo_vegano','combo_diet',
                 'combo_delivery','combo_proposta','status_cadastro','custo_embalagem','custo_delivery') then
      raise exception 'campo_invalido';
    end if;
    v_para := nullif(btrim(p_dados ->> k), '');
    execute format('select %I::text from public.participacoes where id = $1', k) into v_de using p_participacao;
    if v_de is not distinct from v_para then continue; end if;
    if k = 'status_cadastro' and v_para is null then raise exception 'status_invalido'; end if;
    if k in ('combo_preco','custo_embalagem','custo_delivery') then
      execute format('update public.participacoes set %I = $1::numeric where id = $2', k) using v_para, p_participacao;
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
end $function$;

create or replace function public.salvar_edicao(p_secret text, p_dados jsonb)
 returns text language plpgsql security definer set search_path to 'public'
as $function$
declare v_cod text := btrim(coalesce(p_dados ->> 'codigo', ''));
begin
  if not public.pode(p_secret, 'edicao.gerir') then raise exception 'nao_autorizado'; end if;
  if v_cod !~ '^\d{4}(\.\d)?$' then raise exception 'codigo_invalido'; end if;
  insert into public.edicoes (codigo, ordem, nome, classificacao, fonte)
  values (v_cod, (select coalesce(max(ordem), 0) + 1 from public.edicoes),
          coalesce(nullif(btrim(p_dados ->> 'nome'), ''), 'Sweet & Coffee Week ' || v_cod),
          'atual_confirmado', 'Painel · ' || public.ator_rotulo_atual())
  on conflict (codigo) do nothing;
  update public.edicoes set
    nome                 = coalesce(nullif(btrim(p_dados ->> 'nome'), ''), nome),
    tema                 = case when p_dados ? 'tema' then nullif(btrim(p_dados ->> 'tema'), '') else tema end,
    festival_inicio      = case when p_dados ? 'festival_inicio' then (p_dados ->> 'festival_inicio')::date else festival_inicio end,
    festival_fim         = case when p_dados ? 'festival_fim' then (p_dados ->> 'festival_fim')::date else festival_fim end,
    taxa_inscricao       = case when p_dados ? 'taxa_inscricao' then (p_dados ->> 'taxa_inscricao')::numeric else taxa_inscricao end,
    valor_combo          = case when p_dados ? 'valor_combo' then nullif(p_dados ->> 'valor_combo', '')::numeric else valor_combo end,
    foto_exige_pagamento = coalesce((p_dados ->> 'foto_exige_pagamento')::boolean, foto_exige_pagamento),
    lembrete_vendas_hora = case when p_dados ? 'lembrete_vendas_hora' then (p_dados ->> 'lembrete_vendas_hora')::time else lembrete_vendas_hora end
   where codigo = v_cod;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('edicao.salva', 'edicoes', v_cod, p_dados);
  return v_cod;
end $function$;
