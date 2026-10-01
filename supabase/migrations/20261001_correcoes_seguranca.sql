-- =============================================================================
-- Correções da revisão de bugs de 01/10/2026 (pedido do Wilker).
--
-- 1. A troca obrigatória de senha passa a valer no SERVIDOR.
--    `marcar_senha_trocada()` baixava `deve_trocar_senha` sem conferir nada:
--    quem tinha a senha entregue por WhatsApp chamava a RPC direto e o painel
--    passava a dizer "ativo" — o "bilhete de uso único" só existia na tela.
--    Agora o perfil guarda o hash da senha EMITIDA (coluna sem grant para
--    ninguém) e a flag só baixa se a senha no Auth for outra.
--    O retrato é tirado por gatilho, sempre que a trava liga ou a senha é
--    reemitida (`senha_emitida_em`) — cobre criar-conta-organizacao,
--    criar-acesso-marca, regerar-senha-conta e "forçar troca" sem tocar nelas.
--    Conta antiga sem retrato (null) segue como antes.
--
-- 2. Vincular conta de marca não sobrescreve nem deixa conta órfã.
--    Dois cliques em "Criar acesso" competiam: o segundo trocava o user_id do
--    primeiro (participante existente) ou ficava sem vínculo (candidatura).
--    Agora o vínculo só acontece se a marca ainda não tem conta; senão
--    `marca_ja_tem_conta`, e a Edge Function apaga o usuário recém-criado.
--
-- 3. Endpoint de push só de serviço de push conhecido.
--    A marca grava a própria assinatura e a Edge Function faz POST nesse
--    endereço — sem filtro, era um POST para qualquer host (SSRF cego).
-- =============================================================================

-- ── 1 ────────────────────────────────────────────────────────────────────────
alter table public.perfis add column if not exists senha_hash_emitida text;
revoke all (senha_hash_emitida) on public.perfis from public, anon, authenticated;

create or replace function public.perfis_retrato_senha()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.deve_trocar_senha then
    new.senha_hash_emitida := null;
  elsif tg_op = 'INSERT'
     or not old.deve_trocar_senha
     or new.senha_emitida_em is distinct from old.senha_emitida_em then
    new.senha_hash_emitida := (select u.encrypted_password from auth.users u where u.id = new.user_id);
  end if;
  return new;
end $$;
revoke execute on function public.perfis_retrato_senha() from public, anon, authenticated;

drop trigger if exists perfis_retrato_senha on public.perfis;
create trigger perfis_retrato_senha before insert or update on public.perfis
  for each row execute function public.perfis_retrato_senha();

-- Quem ainda está com a trava ligada ganha o retrato da senha de hoje: para
-- baixar a trava, vai precisar de fato trocar.
update public.perfis pf set senha_hash_emitida = u.encrypted_password
  from auth.users u where u.id = pf.user_id and pf.deve_trocar_senha;

create or replace function public.marcar_senha_trocada()
returns boolean language plpgsql security definer set search_path = public as $$
declare v_n int; v_papel text; v_part uuid; v_retrato text; v_atual text;
begin
  if auth.uid() is null then return false; end if;
  select pf.senha_hash_emitida, u.encrypted_password into v_retrato, v_atual
    from public.perfis pf join auth.users u on u.id = pf.user_id
   where pf.user_id = auth.uid();
  -- Mesma senha que foi entregue: não trocou. A trava continua.
  if v_retrato is not null and v_retrato = v_atual then return false; end if;
  update public.perfis set deve_trocar_senha = false, senha_trocada_em = now()
   where user_id = auth.uid() returning papel into v_papel;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    select id into v_part from public.participantes where user_id = auth.uid() limit 1;
    insert into public.auditoria (ator_user_id, ator_rotulo, acao, alvo_tabela, alvo_id, participante_id)
    values (auth.uid(), coalesce(v_papel, 'marca'), 'senha.trocada', 'perfis', auth.uid()::text, v_part);
  end if;
  return v_n > 0;
end $$;

-- ── 2 ────────────────────────────────────────────────────────────────────────
create or replace function public.vincular_conta_participante(p_user uuid, p_participante uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_ed text;
begin
  if p_user is null or p_participante is null then raise exception 'argumentos_obrigatorios'; end if;
  insert into public.perfis (user_id, papel) values (p_user, 'marca')
  on conflict (user_id) do update set ativo = true;
  -- `user_id is null` no próprio update: a checagem e a gravação são uma coisa só.
  update public.participantes set user_id = p_user where id = p_participante and user_id is null;
  if not found then
    if exists (select 1 from public.participantes where id = p_participante) then
      raise exception 'marca_ja_tem_conta';
    end if;
    raise exception 'participante_nao_encontrado';
  end if;
  insert into public.participantes_operacao (participante_id) values (p_participante)
  on conflict (participante_id) do nothing;
  select edicao_atual into v_ed from public.admin_config where id;
  perform public.abrir_participacao_interna(p_participante, v_ed);
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values ('criar_acesso_marca', 'participantes', p_participante::text, p_participante,
          jsonb_build_object('origem', 'estabelecimento_existente', 'user_id', p_user, 'edicao', v_ed));
  return p_participante;
end $$;

create or replace function public.vincular_conta_marca(p_user uuid, p_origem uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_dono uuid;
  v_q  public.quero_participar%rowtype;
  v_ed text;
begin
  if p_user is null or p_origem is null then
    raise exception 'argumentos_obrigatorios';
  end if;
  select * into v_q from public.quero_participar where id = p_origem;
  if not found then
    raise exception 'candidatura_nao_encontrada';
  end if;
  insert into public.perfis (user_id, papel)
       values (p_user, 'marca')
  on conflict (user_id) do update set ativo = true;
  insert into public.participantes
         (origem_id, user_id, nome_marca, responsavel, telefone, email,
          instagram, site, status_cadastro)
       values
         (p_origem, p_user, v_q.empresa, v_q.nome, v_q.telefone, v_q.email,
          v_q.instagram, v_q.site, 'aguardando_cadastro')
  on conflict (origem_id) do update
          set user_id = coalesce(participantes.user_id, excluded.user_id)
    returning id, user_id into v_id, v_dono;
  -- A candidatura já tinha conta: este usuário ficaria órfão. Desfaz tudo.
  if v_dono is distinct from p_user then
    raise exception 'marca_ja_tem_conta';
  end if;
  insert into public.participantes_operacao (participante_id)
       values (v_id)
  on conflict (participante_id) do nothing;
  select edicao_atual into v_ed from public.admin_config where id;
  perform public.abrir_participacao_interna(v_id, v_ed);
  update public.quero_participar
     set status = 'aguardando_cadastro'
   where id = p_origem
     and status <> 'cadastro_completo';
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
       values ('criar_acesso_marca', 'participantes', v_id::text,
               jsonb_build_object('origem_id', p_origem, 'user_id', p_user, 'edicao', v_ed));
  return v_id;
end $$;

-- ── 3 ────────────────────────────────────────────────────────────────────────
alter table public.push_subscriptions drop constraint if exists push_endpoint_conhecido;
alter table public.push_subscriptions add constraint push_endpoint_conhecido check (
  endpoint ~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|[a-z0-9.-]*push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
);
