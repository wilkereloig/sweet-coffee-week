-- montar_publico original vira _base; o novo wrapper acrescenta casa.tema (de participacoes.tema_combo)
-- e casa.logo_desenhada (herdada da última publicação que a tinha), para republicar não apagar os dois.
-- (Já aplicada no banco em 05/11/2026 pelo MCP; este arquivo é o registro no repositório.)
alter function public.montar_publico(uuid, text) rename to montar_publico_base;
revoke all on function public.montar_publico_base(uuid, text) from public, anon, authenticated;
grant execute on function public.montar_publico_base(uuid, text) to service_role;

create or replace function public.montar_publico(p_participacao uuid, p_nivel text default 'marca_e_combo')
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v jsonb; v_tema text; v_ld jsonb;
begin
  v := public.montar_publico_base(p_participacao, p_nivel);
  if v is null then return null; end if;
  select nullif(btrim(tema_combo), '') into v_tema from public.participacoes where id = p_participacao;
  select conteudo->'casa'->'logo_desenhada' into v_ld
    from public.publicacoes
   where participacao_id = p_participacao and (conteudo->'casa') ? 'logo_desenhada'
   order by versao desc limit 1;
  return jsonb_set(v, '{casa}',
    coalesce(v->'casa', '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object('tema', v_tema, 'logo_desenhada', v_ld)));
end $function$;
revoke all on function public.montar_publico(uuid, text) from public, anon, authenticated;
grant execute on function public.montar_publico(uuid, text) to service_role;
