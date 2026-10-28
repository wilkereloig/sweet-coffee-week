-- Teste de redes_rever_etapa com a postagem em "Aguardando aprovação" (20261027). Não deixa rastro: termina em
-- exceção. Esperado: "TESTE_OK". Precisa de um post "pronto" sem pendências e de uma conta da função social.
do $$
declare adm uuid; soc uuid; pid uuid; v0 int; v1 int; por uuid; n0 int; n1 int; n2 int;
begin
  select user_id into adm from public.perfis where funcao = 'administrador' and ativo limit 1;
  select user_id into soc from public.perfis where funcao = 'social' and ativo limit 1;
  select id into pid from public.redes_posts where situacao = 'pronto' and cardinality(array(select x from unnest(public.redes_pendencias(id)) x where x <> 'atrasada')) = 0 limit 1;
  if pid is null or soc is null then raise exception 'preparo: sem post pronto ou sem conta social'; end if;
  update public.redes_posts set situacao = 'aprovacao' where id = pid;
  select versao into v0 from public.redes_posts where id = pid;
  select count(*) into n0 from public.notificacoes;

  -- 1) a Social media muda a arte em "aguardando aprovação": a versão sobe, o carimbo é dela, os aprovadores são avisados
  perform set_config('request.jwt.claims', json_build_object('sub', soc, 'role', 'authenticated')::text, true);
  perform public.redes_rever_pronto(pid);
  select versao, atualizado_por_id into v1, por from public.redes_posts where id = pid;
  select count(*) into n1 from public.notificacoes;
  if v1 <= v0 then raise exception 'a versão não subiu (% → %)', v0, v1; end if;
  if por is distinct from soc then raise exception 'o carimbo não é de quem mudou'; end if;
  if n1 <= n0 then raise exception 'os aprovadores não foram avisados'; end if;

  -- 2) quem aprova e mexe: a versão sobe, mas não se avisa a si mesmo
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform public.redes_rever_pronto(pid);
  select count(*) into n2 from public.notificacoes;
  if (select versao from public.redes_posts where id = pid) <= v1 then raise exception 'a versão não subiu na 2ª mudança'; end if;
  if n2 <> n1 then raise exception 'avisou aprovador sobre a própria mudança (% → %)', n1, n2; end if;

  -- 3) aprovar com a versão antiga é recusado (a tela de quem aprova pode estar desatualizada)
  begin
    perform public.redes_travar(pid, v0);
    raise exception 'deveria recusar versão antiga';
  exception when sqlstate '40001' then null; end;
  raise exception 'TESTE_OK';
end $$;
