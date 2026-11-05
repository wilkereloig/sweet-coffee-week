-- Caça aos Carimbos, rota do grupo só pelo mapa principal (versionamento da migration já aplicada no banco como 'caca_identidade_principal_rota_op').
-- Antes só existia no banco (aplicada em 05/11/2026 logo depois de 20261210_caca_identidade_principal.sql); este arquivo guarda o SQL real
-- de supabase_migrations.schema_migrations para o repositório não divergir do banco. Reaplicar é inofensivo (create or replace).
-- Não altera tabela nem apaga dado.
-- reverter: restaurar caca_grupo_rota_op da versão anterior, 20261206_caca_grupos.sql (create or replace function public.caca_grupo_rota_op ...).

create or replace function public.caca_grupo_rota_op(p_chave text, p_grupo uuid, p_op text, p_slug text, p_pos int, p_versao int)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype; g public.caca_grupo%rowtype; v_casa uuid; v_old int; v_n int; v_pos int; v_mudou boolean := false;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  if m.id is distinct from public.caca_mapa_principal(m.edicao_codigo, m.email_norm) then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if p_grupo is null then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  perform public.caca_grupo_lock(p_grupo);
  select * into g from public.caca_grupo where id = p_grupo and edicao_codigo = m.edicao_codigo;
  if g.id is null or not exists (select 1 from public.caca_grupo_membro gm
                                  where gm.grupo_id = p_grupo and gm.pessoa = m.email_norm and gm.saiu_em is null)
    then return jsonb_build_object('ok', false, 'motivo', 'negado'); end if;
  if p_versao is not null and p_versao <> g.rota_versao then
    return jsonb_build_object('ok', false, 'motivo', 'conflito', 'versao', g.rota_versao, 'rota', public.caca_grupo_rota_json(g.id));
  end if;
  select pa.id into v_casa from public.participacoes pa
   where pa.edicao_codigo = g.edicao_codigo and pa.slug_publico = v_slug and pa.status_cadastro <> 'encerrado'
     and (p_op <> 'adicionar' or exists (select 1 from public.publicacoes pb where pb.participacao_id = pa.id and pb.vigente));
  if v_casa is null then return jsonb_build_object('ok', false, 'motivo', 'casa_desconhecida'); end if;
  select r.posicao into v_old from public.caca_grupo_rota r where r.grupo_id = g.id and r.participacao_id = v_casa;

  if p_op = 'adicionar' then
    if v_old is null then
      insert into public.caca_grupo_rota (grupo_id, participacao_id, posicao, adicionado_por_pessoa)
      select g.id, v_casa, coalesce(max(r.posicao), 0) + 1, m.email_norm from public.caca_grupo_rota r where r.grupo_id = g.id;
      v_mudou := true;
    end if;
  elsif p_op = 'remover' then
    if v_old is not null then
      delete from public.caca_grupo_rota where grupo_id = g.id and participacao_id = v_casa;
      update public.caca_grupo_rota r set posicao = x.rn
        from (select r2.participacao_id, (row_number() over (order by r2.posicao))::int rn
                from public.caca_grupo_rota r2 where r2.grupo_id = g.id) x
       where r.grupo_id = g.id and r.participacao_id = x.participacao_id and r.posicao <> x.rn;
      v_mudou := true;
    end if;
  elsif p_op = 'mover' then
    if v_old is null then return jsonb_build_object('ok', false, 'motivo', 'nao_esta_na_rota'); end if;
    if p_pos is null or p_pos < 1 then return jsonb_build_object('ok', false, 'motivo', 'posicao_invalida'); end if;
    select count(*)::int into v_n from public.caca_grupo_rota where grupo_id = g.id;
    v_pos := least(p_pos, v_n);
    if v_pos <> v_old then
      update public.caca_grupo_rota r set posicao = x.rn
        from (select r2.participacao_id,
                     (row_number() over (order by case when r2.participacao_id = v_casa
                                                      then v_pos + case when v_pos < v_old then -0.5 else 0.5 end
                                                      else r2.posicao end))::int rn
                from public.caca_grupo_rota r2 where r2.grupo_id = g.id) x
       where r.grupo_id = g.id and r.participacao_id = x.participacao_id;
      v_mudou := true;
    end if;
  else
    return jsonb_build_object('ok', false, 'motivo', 'operacao_invalida');
  end if;

  if v_mudou then update public.caca_grupo set rota_versao = rota_versao + 1 where id = g.id returning rota_versao into g.rota_versao; end if;
  return jsonb_build_object('ok', true, 'mudou', v_mudou, 'versao', g.rota_versao, 'rota', public.caca_grupo_rota_json(g.id));
end $$;
