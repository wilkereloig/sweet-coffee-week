-- =============================================================================
-- Auditoria de 01/10/2026 — três brechas de acesso fechadas no servidor.
--
-- 1. Troca de senha obrigatória valia só na tela. Agora conta com
--    `deve_trocar_senha` não passa em conta_ativa() (marca) nem em
--    pode()/pode_por_user() (organização). O que continua respondendo nesse
--    estado é só o necessário para trocar: a leitura do próprio perfil
--    (policy perfis_leitura_propria), minhas_permissoes() e
--    marcar_senha_trocada() — nenhuma das três depende dessas guardas.
--    pode() também passa a respeitar bloqueado_em, como conta_ativa().
-- 3. Cinco RPCs da marca (SECURITY DEFINER, sem RLS) ignoravam bloqueio e
--    desativação: agora acham a marca por meu_participante(), que exige
--    conta_ativa().
-- 4. corrigir_participante (curadoria.decidir) mexia em nome, razão social e
--    CNPJ, que são `cadastro.editar` (só Administrador), e trocava o nome de
--    marca com conta (o nome é o login). Agora esses três campos exigem
--    cadastro.editar e o nome segue a mesma regra `nome_com_conta` das
--    org_salvar_*.
--
-- `create or replace` preserva a ACL: nenhuma função aqui é nova.
-- =============================================================================

create or replace function public.conta_ativa()
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select coalesce((select ativo and bloqueado_em is null and not deve_trocar_senha
                     from public.perfis where user_id = auth.uid()), false)
$function$;

create or replace function public.pode(p_secret text default null::text, p_acao text default 'dado.ler'::text)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select
    exists (
      select 1
        from public.perfis pf
        join public.permissoes pm on pm.funcao = pf.funcao
       where pf.user_id = auth.uid()
         and pf.ativo
         and pf.bloqueado_em is null
         and not pf.deve_trocar_senha
         and pf.papel = 'organizacao'
         and pm.acao = p_acao
    )
    or (
      p_secret is not null and p_secret <> ''
      and coalesce((select senha_unica_ativa from public.admin_config where id), true)
      and not public.acesso_travado()
      and public.admin_ok(p_secret)
    );
$function$;

create or replace function public.pode_por_user(p_user uuid, p_acao text)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select exists (
    select 1
      from public.perfis pf
      join public.permissoes pm on pm.funcao = pf.funcao
     where pf.user_id = p_user
       and pf.ativo
       and pf.bloqueado_em is null
       and not pf.deve_trocar_senha
       and pf.papel = 'organizacao'
       and pm.acao = p_acao
  );
$function$;

-- ---- 3 · as cinco RPCs da marca ---------------------------------------------

create or replace function public.marca_enviar_mensagem(p_corpo text)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v_part uuid := public.meu_participante(); v_id uuid;
begin
  if v_part is null then raise exception 'sem_marca'; end if;
  if coalesce(trim(p_corpo), '') = '' then raise exception 'mensagem_vazia'; end if;
  insert into public.mensagens (participante_id, de, corpo)
  values (v_part, 'marca', trim(p_corpo)) returning id into v_id;
  return v_id;
end $function$;

create or replace function public.marca_ler_mensagens()
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v_n integer;
begin
  update public.mensagens m set lida_em = now()
   where m.de = 'organizacao' and m.lida_em is null
     and m.participante_id = public.meu_participante();
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

create or replace function public.marca_ler_notificacoes(p_ids uuid[] default null::uuid[])
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v_n integer;
begin
  update public.notificacoes n set lida_em = now()
   where n.para = 'marca' and n.lida_em is null
     and (p_ids is null or n.id = any(p_ids))
     and n.participante_id = public.meu_participante();
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

create or replace function public.marca_meus_vouchers()
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_pa uuid; v_ed text;
begin
  select pa.id, pa.edicao_codigo into v_pa, v_ed from public.participacoes pa
   where pa.participante_id = public.meu_participante() and pa.edicao_codigo = public.edicao_atual();
  if v_pa is null then return null; end if;
  return jsonb_build_object(
    'edicao', v_ed,
    'cota', (select vouchers_por_participante from public.edicoes where codigo = v_ed),
    'total', (select count(*) from public.vouchers where participacao_id = v_pa and status <> 'cancelado'),
    'distribuidos', (select count(*) from public.vouchers where participacao_id = v_pa and status in ('destinado','enviado','utilizado')),
    'utilizados', coalesce((select jsonb_agg(jsonb_build_object('codigo', codigo, 'utilizado_em', utilizado_em) order by utilizado_em desc)
                   from public.vouchers where participacao_id = v_pa and status = 'utilizado'), '[]'::jsonb));
end $function$;

create or replace function public.marca_responder_solicitacao(p_solicitacao uuid, p_resposta text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if coalesce(trim(p_resposta), '') = '' then raise exception 'resposta_vazia'; end if;
  update public.solicitacao_estado e set
    estado = 'respondido', respondido_em = now(), respondido_por = auth.uid(),
    resposta = left(trim(p_resposta), 4000)
   where e.solicitacao_id = p_solicitacao
     and exists (select 1 from public.participacoes pa
                  where pa.id = e.participacao_id and pa.participante_id = public.meu_participante());
  if not found then raise exception 'pedido_nao_encontrado'; end if;
end $function$;

-- ---- 4 · corrigir_participante ----------------------------------------------

create or replace function public.corrigir_participante(p_secret text, p_participante uuid, p_campo text, p_valor text, p_pendencia uuid default null::uuid)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_antes text; v_user uuid;
begin
  if not public.pode(p_secret, 'curadoria.decidir') then raise exception 'nao_autorizado'; end if;
  if p_campo not in ('nome_marca','razao_social','cnpj','responsavel','telefone','email','instagram','site') then
    raise exception 'campo_invalido';
  end if;
  -- Identidade da marca é cadastro.editar (só Administrador), como nas org_salvar_*.
  if p_campo in ('nome_marca','razao_social','cnpj') and not public.pode(p_secret, 'cadastro.editar') then
    raise exception 'nao_autorizado';
  end if;
  if p_campo = 'nome_marca' and coalesce(btrim(p_valor), '') = '' then raise exception 'nome_obrigatorio'; end if;
  execute format('select %I from public.participantes where id = $1', p_campo) into v_antes using p_participante;
  if p_campo = 'nome_marca' then
    select user_id into v_user from public.participantes where id = p_participante;
    if v_user is not null and public.normalizar_nome(btrim(p_valor)) is distinct from public.normalizar_nome(v_antes) then
      raise exception 'nome_com_conta';
    end if;
  end if;
  execute format('update public.participantes set %I = $1 where id = $2', p_campo)
    using nullif(btrim(p_valor), ''), p_participante;
  if p_pendencia is not null then
    update public.revisao_pendencias set status = 'resolvida',
           resolucao = 'Corrigido: ' || p_campo || ' = ' || coalesce(nullif(btrim(p_valor), ''), '(vazio)'),
           resolvido_por = auth.uid(), resolvido_rotulo = public.ator_rotulo_atual(), resolvido_em = now()
     where id = p_pendencia;
  end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values ('cadastro.corrigido', 'participantes', p_participante::text, p_participante,
          jsonb_build_object('campo', p_campo,
            'de', case when p_campo in ('cnpj','telefone') then public.mascarar(v_antes) else v_antes end,
            'para', case when p_campo in ('cnpj','telefone') then public.mascarar(p_valor) else p_valor end));
end $function$;
