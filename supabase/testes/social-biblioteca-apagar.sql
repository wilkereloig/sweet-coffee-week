-- Teste de social_biblioteca_apagar / social_biblioteca_restaurar (20261023). Não deixa rastro:
-- tudo roda numa transação que termina em exceção. Esperado: "TESTE_OK" na mensagem final.
do $$
declare adm uuid; soc uuid; arq uuid; r jsonb; v_removido timestamptz; v_msg text;
begin
  select user_id into adm from public.perfis where funcao = 'administrador' and ativo limit 1;
  select user_id into soc from public.perfis where funcao = 'social' and ativo limit 1;
  select a.id into arq from public.redes_arquivos a join public.redes_posts p on p.id = a.post_id
   where a.bucket = 'redes' and a.removido_em is null and p.situacao not in ('publicado', 'cancelado') limit 1;
  if adm is null or arq is null then raise exception 'preparo: sem administrador ou sem arte em postagem aberta'; end if;

  -- 1) quem não tem redes.gerir é recusado (Social media não organiza a biblioteca)
  if soc is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', soc, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin
      perform public.social_biblioteca_apagar('', jsonb_build_array(jsonb_build_object('tipo', 'arte', 'id', arq)));
      raise exception 'deveria recusar a Social media';
    exception when sqlstate '42501' then null; end;
    reset role;
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 2) tipo que não é arte: recusado, sem ignorar em silêncio
  begin
    perform public.social_biblioteca_apagar('', jsonb_build_array(jsonb_build_object('tipo', 'logo', 'id', arq)));
    raise exception 'deveria recusar logo';
  exception when sqlstate '22023' then get stacked diagnostics v_msg = message_text; if v_msg <> 'tipo_nao_apagavel' then raise; end if; end;

  -- 3) lista vazia e id que não existe
  begin perform public.social_biblioteca_apagar('', '[]'::jsonb); raise exception 'deveria recusar vazio';
  exception when sqlstate '22023' then null; end;
  begin perform public.social_biblioteca_apagar('', jsonb_build_array(jsonb_build_object('tipo', 'arte', 'id', gen_random_uuid())));
    raise exception 'deveria recusar inexistente';
  exception when sqlstate 'P0002' then null; end;

  -- 4) apagar: marca removido_em; apagar de novo não conta
  r := public.social_biblioteca_apagar('', jsonb_build_array(jsonb_build_object('tipo', 'arte', 'id', arq)));
  if (r->>'apagados')::int <> 1 then raise exception 'apagar devolveu %', r; end if;
  reset role;
  select removido_em into v_removido from public.redes_arquivos where id = arq;
  if v_removido is null then raise exception 'removido_em não foi gravado'; end if;
  set local role authenticated;
  r := public.social_biblioteca_apagar('', jsonb_build_array(jsonb_build_object('tipo', 'arte', 'id', arq)));
  if (r->>'apagados')::int <> 0 then raise exception 'apagar duas vezes contou: %', r; end if;

  -- 5) restaurar volta ao normal; restaurar de novo não conta
  r := public.social_biblioteca_restaurar('', jsonb_build_array(jsonb_build_object('tipo', 'arte', 'id', arq)));
  if (r->>'restaurados')::int <> 1 then raise exception 'restaurar devolveu %', r; end if;
  r := public.social_biblioteca_restaurar('', jsonb_build_array(jsonb_build_object('tipo', 'arte', 'id', arq)));
  if (r->>'restaurados')::int <> 0 then raise exception 'restaurar duas vezes contou: %', r; end if;
  reset role;
  if (select removido_em from public.redes_arquivos where id = arq) is not null then raise exception 'removido_em não voltou a nulo'; end if;

  raise exception 'TESTE_OK';
end $$;
