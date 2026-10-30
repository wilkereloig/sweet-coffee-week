-- Teste de 20261120 (endereço completo + fila de localizações). Não deixa rastro: termina em exceção.
-- Esperado: "TESTE_OK". Precisa de 1 administrador ativo (conta pessoal), de 1 conta de marca e de uma unidade da edição atual
-- (que participa, de marca não encerrada) com rua, bairro e cidade preenchidos.
do $$
declare
  adm uuid; marca uuid; ed text; n_lido int; n_esperado int; msg text;
  pa uuid; pu uuid; v_un uuid; v_pub text; codigo text; f text[];
begin
  select user_id into adm from public.perfis
   where funcao = 'administrador' and papel = 'organizacao' and ativo and bloqueado_em is null and not deve_trocar_senha limit 1;
  select p.user_id into marca from public.participantes p where p.user_id is not null limit 1;
  ed := public.edicao_atual();
  if adm is null or marca is null or ed is null then raise exception 'preparo: faltou administrador, conta de marca ou edição atual'; end if;
  select pu_.id, pu_.participacao_id, pu_.unidade_id, pu_.id_publico into pu, pa, v_un, v_pub
    from public.participacao_unidades pu_
    join public.participacoes pa_ on pa_.id = pu_.participacao_id
    join public.unidades u on u.id = pu_.unidade_id
   where pa_.edicao_codigo = ed and pa_.status_cadastro <> 'encerrado' and pu_.participa
     and coalesce(btrim(u.logradouro), '') <> '' and coalesce(btrim(u.bairro), '') <> '' and coalesce(btrim(u.cidade), '') <> ''
   order by pu_.id limit 1;
  if pu is null then raise exception 'preparo: nenhuma unidade com rua, bairro e cidade na edição atual'; end if;
  codigo := 'unidade:' || v_pub || ':endereco';

  -- 1) o endereço só está completo com rua, número, bairro, cidade e CEP
  update public.unidades set numero = '10', cep = '59000000' where id = v_un;
  if codigo = any (public.pendencias_publicacao(pa)) then raise exception 'endereço completo não podia pedir nada'; end if;
  update public.unidades set cep = null where id = v_un;
  if not (codigo = any (public.pendencias_publicacao(pa))) then raise exception 'sem CEP devia faltar'; end if;
  update public.unidades set cep = '59000000', numero = '  ' where id = v_un;
  if not (codigo = any (public.pendencias_publicacao(pa))) then raise exception 'sem número devia faltar'; end if;
  update public.unidades set numero = 'S/N' where id = v_un;
  if codigo = any (public.pendencias_publicacao(pa)) then raise exception 'S/N vale como número'; end if;

  -- 2) a fila: o administrador lê todas as unidades que participam; a marca é recusada
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  set local role authenticated;
  select count(*) into n_lido from public.get_localizacoes_unidades(null, ed);
  reset role;
  select count(*) into n_esperado
    from public.participacao_unidades pu_
    join public.participacoes pa_ on pa_.id = pu_.participacao_id
    join public.participantes pt on pt.id = pa_.participante_id
   where pa_.edicao_codigo = ed and pa_.status_cadastro <> 'encerrado' and pt.arquivado_em is null and pu_.participa and pu_.unidade_id is not null;
  if n_lido <> n_esperado or n_lido = 0 then raise exception 'a fila trouxe % unidades e o esperado era %', n_lido, n_esperado; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', marca, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', marca::text, true);
  set local role authenticated;
  begin
    perform * from public.get_localizacoes_unidades(null, ed);
    raise exception 'a marca não podia ler a fila';
  exception when others then
    get stacked diagnostics msg = message_text;
    if msg <> 'nao_autorizado' then raise exception 'esperava nao_autorizado e veio %', msg; end if;
  end;
  reset role;

  -- 3) conferir o ponto tira a unidade de "a conferir"; mudar o ponto de novo continua valendo (mesma RPC da ficha)
  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  set local role authenticated;
  perform public.org_verificar_coordenada(null, v_un, -5.8123, -35.2012);
  if not exists (select 1 from public.get_localizacoes_unidades(null, ed) l where l.unidade_id = v_un and l.coordenada_verificada_em is not null) then
    raise exception 'a unidade conferida devia aparecer como conferida na fila';
  end if;
  reset role;

  raise exception 'TESTE_OK';
end $$;
