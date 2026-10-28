-- Marca que desistiu da edição (participacoes.status_cadastro = 'encerrado') aparecia em três listas e recebia
-- vouchers (26/10/2026, achado do Wilker: Delas Café Bistrô e Docinhos da Lalá na tabela de vendas).
-- Regra, a mesma da Visão geral (lib/mesa.js · participaDaEdicao): encerrada sai da lista — MENOS quando já tem dado
-- naquela lista (venda lançada, voucher, postagem), para o histórico não sumir.
--   · get_vendas_resumo.marcas · get_vouchers.marcas · editorial_participantes (Social media › Participantes)
--   · gerar_vouchers: não gera para encerrada.
-- get_temas e get_materiais já só listam linhas que existem (tema proposto, material): não mudam.
-- Reversão: supabase/reverter/20261115_encerradas_fora_das_listas.sql

create or replace function public.get_vendas_resumo(p_secret text, p_edicao text DEFAULT NULL::text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_ed text := coalesce(p_edicao, public.edicao_atual()); v_hoje date := (now() at time zone 'America/Fortaleza')::date;
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return jsonb_build_object(
    'edicao', v_ed, 'hoje', v_hoje,
    'festival_inicio', (select festival_inicio from public.edicoes where codigo = v_ed),
    'festival_fim', (select festival_fim from public.edicoes where codigo = v_ed),
    'marcas', coalesce((select jsonb_agg(jsonb_build_object(
        'participacao_id', pa.id, 'participante_id', p.id, 'marca', p.nome_marca, 'tem_conta', p.user_id is not null,
        'total', coalesce((select sum(quantidade) from public.vendas_diarias v where v.participacao_id = pa.id), 0),
        'registrou_hoje', exists (select 1 from public.vendas_diarias v where v.participacao_id = pa.id and v.dia = v_hoje),
        'dias', coalesce((select jsonb_object_agg(v.dia, v.quantidade) from public.vendas_diarias v where v.participacao_id = pa.id), '{}'::jsonb),
        'corrigidas', (select count(*) from public.auditoria a where a.participacao_id = pa.id and a.acao = 'venda.corrigida'))
      order by p.nome_marca)
      from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.edicao_codigo = v_ed
       and (pa.status_cadastro is distinct from 'encerrado'
            or exists (select 1 from public.vendas_diarias v where v.participacao_id = pa.id))), '[]'::jsonb));
end $function$;

create or replace function public.get_vouchers(p_secret text, p_edicao text DEFAULT NULL::text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_ed text := coalesce(p_edicao, public.edicao_atual());
begin
  if not public.pode(p_secret, 'dado.ler') then return null; end if;
  return jsonb_build_object(
    'edicao', v_ed,
    'cota', (select vouchers_por_participante from public.edicoes where codigo = v_ed),
    'vouchers', coalesce((select jsonb_agg(to_jsonb(v) || jsonb_build_object(
        'marca', p.nome_marca, 'participante_id', p.id, 'contato', c.nome, 'contato_instagram', c.instagram)
        order by p.nome_marca, v.created_at)
      from public.vouchers v
      join public.participacoes pa on pa.id = v.participacao_id
      join public.participantes p on p.id = pa.participante_id
      left join public.contatos_relacionamento c on c.id = v.contato_id
     where v.edicao_codigo = v_ed), '[]'::jsonb),
    'marcas', coalesce((select jsonb_agg(jsonb_build_object('participacao_id', pa.id, 'participante_id', p.id, 'marca', p.nome_marca)
        order by p.nome_marca)
      from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.edicao_codigo = v_ed and p.arquivado_em is null
       and (pa.status_cadastro is distinct from 'encerrado'
            or exists (select 1 from public.vouchers v where v.participacao_id = pa.id))), '[]'::jsonb));
end $function$;

create or replace function public.gerar_vouchers(p_secret text, p_edicao text DEFAULT NULL::text)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_ed text := coalesce(p_edicao, public.edicao_atual()); v_cota int; r record; n int := 0; i int;
begin
  if not public.pode(p_secret, 'relacionamento.gerir') then raise exception 'nao_autorizado'; end if;
  select vouchers_por_participante into v_cota from public.edicoes where codigo = v_ed;
  if v_cota is null then raise exception 'edicao_nao_encontrada'; end if;
  for r in
    select pa.id, v_cota - (select count(*) from public.vouchers v where v.participacao_id = pa.id and v.status <> 'cancelado') falta
      from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.edicao_codigo = v_ed and p.arquivado_em is null and pa.status_cadastro is distinct from 'encerrado'
  loop
    for i in 1..greatest(r.falta, 0) loop
      insert into public.vouchers (codigo, edicao_codigo, participacao_id) values (public.novo_codigo_voucher(), v_ed, r.id);
      n := n + 1;
    end loop;
  end loop;
  if n > 0 then
    insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
    values ('vouchers.gerados', 'vouchers', v_ed, jsonb_build_object('edicao', v_ed, 'quantidade', n, 'cota', v_cota));
  end if;
  return n;
end $function$;

create or replace function public.editorial_participantes(p_secret text, p_edicao text DEFAULT NULL::text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v_ed text;
begin
  perform public.redes_exigir(p_secret, 'editorial.ler');
  v_ed := coalesce(nullif(p_edicao, ''), (select edicao_atual from public.admin_config limit 1));
  return jsonb_build_object('edicao', v_ed, 'participantes', coalesce((
    select jsonb_agg(jsonb_build_object(
             'participacao_id', pa.id, 'participante_id', pt.id, 'marca', pt.nome_marca,
             'logo', (select path from public.logos_marca l where l.id = coalesce(pa.logo_id, pt.logo_id)),
             'tema', pa.tema_combo, 'combo_nome', pa.combo_nome, 'combo_status', pa.combo_status,
             'alterado_apos_aprovacao', pa.alterado_apos_aprovacao,
             'no_site', exists (select 1 from public.publicacoes pu where pu.participacao_id = pa.id and pu.vigente),
             'foto', (select m.path from public.midias_participacao m where m.participacao_id = pa.id
                        and m.papel = 'combo_principal' and m.estado <> 'recusada' order by (m.estado = 'aprovada') desc limit 1),
             'n_posts', (select count(*) from public.redes_posts r where r.participante_id = pt.id and r.situacao <> 'cancelado'))
           order by pt.nome_marca)
      from public.participacoes pa join public.participantes pt on pt.id = pa.participante_id
     where pa.edicao_codigo = v_ed
       and (pa.status_cadastro is distinct from 'encerrado'
            or exists (select 1 from public.redes_posts r where r.participante_id = pt.id and r.situacao <> 'cancelado'))), '[]'::jsonb));
end $function$;
