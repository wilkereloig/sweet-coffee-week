-- Teste de 20261114 (org_avisar_marca) e 20261113 (logo_definir_mini / get_logos_mini). Não deixa rastro: termina
-- em exceção. Esperado: "TESTE_OK". Precisa de 1 administrador ativo (conta pessoal) e de 1 marca.
do $$
declare
  adm uuid; part uuid; logo uuid; v_msg uuid; n int; v_tipo text; v_link text; v_titulo text; msg text;
  mini text := 'data:image/webp;base64,UklGRgQFAABXRUJQ';
begin
  select user_id into adm from public.perfis
   where funcao = 'administrador' and papel = 'organizacao' and ativo and bloqueado_em is null and not deve_trocar_senha limit 1;
  select p.id into part from public.participantes p order by p.created_at desc limit 1;
  if adm is null or part is null then raise exception 'preparo: faltou administrador ou marca'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', adm::text, true);
  set local role authenticated;

  -- 1. Cobrança: uma mensagem na conversa + UM aviso da marca com o link do campo (sem o genérico "Nova mensagem").
  v_msg := public.org_avisar_marca('', part, 'Falta 1 informação no seu cadastro', 'Olá! Falta dar um nome ao combo.', 'combo/3/combo_nome');
  reset role;  -- conferir como dono: a RLS esconde mensagens e avisos da conta da equipe
  select count(*) into n from public.mensagens where id = v_msg and de = 'organizacao' and participante_id = part;
  if n <> 1 then raise exception 'mensagem não gravada'; end if;
  select count(*) into n from public.notificacoes where participante_id = part and para = 'marca' and criada_em >= now();
  if n <> 1 then raise exception 'esperava 1 aviso, veio %', n; end if;
  select tipo, link, titulo into v_tipo, v_link, v_titulo from public.notificacoes where participante_id = part and para = 'marca' and criada_em >= now();
  if v_tipo <> 'pendencia' or v_link <> 'combo/3/combo_nome' then raise exception 'aviso errado: % %', v_tipo, v_link; end if;
  if not exists (select 1 from public.auditoria where acao = 'pendencia.cobrada' and alvo_id = v_msg::text) then raise exception 'sem auditoria'; end if;
  if coalesce(current_setting('scw.silencioso', true), '') = 'on' then raise exception 'silencioso ficou ligado'; end if;

  -- 2. Ajuste sem link: vai para a conversa.
  set local role authenticated;
  v_msg := public.org_avisar_marca('', part, 'A organização ajustou seu cadastro', 'Definimos o nome do combo.', null, 'ajuste');
  reset role;
  if not exists (select 1 from public.notificacoes where participante_id = part and tipo = 'ajuste' and link = 'mensagens' and criada_em >= now()) then
    raise exception 'ajuste sem link não foi para mensagens';
  end if;

  -- 3. Recusas.
  set local role authenticated;
  begin perform public.org_avisar_marca('', part, 'x', 'y', 'http://fora.com'); raise exception 'aceitou link de fora';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'link_invalido' then raise; end if; end;
  begin perform public.org_avisar_marca('', part, 'x', 'y', null, 'outro'); raise exception 'aceitou tipo';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'tipo_invalido' then raise; end if; end;
  begin perform public.org_avisar_marca('', part, 'x', '   '); raise exception 'aceitou vazio';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'mensagem_vazia' then raise; end if; end;

  -- 4. Miniatura: grava só onde está vazia e só no formato.
  reset role;
  select l.id into logo from public.logos_marca l limit 1;
  if logo is not null then
    update public.logos_marca set mini = null where id = logo;
    set local role authenticated;
    if not public.logo_definir_mini('', logo, mini) then raise exception 'mini não gravou'; end if;
    if public.logo_definir_mini('', logo, mini || 'AAAA') then raise exception 'mini sobrescreveu'; end if;
    begin perform public.logo_definir_mini('', logo, 'data:image/png;base64,AAAA'); raise exception 'aceitou png';
    exception when others then get stacked diagnostics msg = message_text; if msg <> 'mini_invalida' then raise; end if; end;
  end if;

  -- 5. Sem permissão (anon, sem senha): recusa.
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  begin perform public.org_avisar_marca('', part, 'x', 'y'); raise exception 'anon avisou';
  exception when others then get stacked diagnostics msg = message_text; if msg <> 'nao_autorizado' then raise; end if; end;

  raise exception 'TESTE_OK';
end $$;
