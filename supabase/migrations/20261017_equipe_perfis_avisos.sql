-- ─────────────────────────────────────────────────────────────────────────────
-- Equipe: foto de perfil, autoria com identificador e avisos por pessoa
-- 17/10/2026 — base da área Social media (20261017_social_media.sql, que
-- depende desta). Só ACRESCENTA: colunas, bucket, funções. Nada é apagado.
--
-- 1. Foto de perfil (perfis.avatar_path) num bucket PRIVADO `equipe`, sem
--    policy: só a Edge Function arquivo-url assina, e só na pasta da própria
--    pessoa (ou de qualquer uma, com acesso.gerir). Caminho <user_id>/<uuid>.
--    Cada foto é um objeto novo — trocar ou remover não apaga a anterior.
-- 2. Diretório da equipe (equipe_diretorio): nome, função, situação e foto de
--    TODA conta da organização, inclusive desativada — é o que deixa o
--    histórico antigo mostrar quem fez. Sem e-mail, sem login.
-- 3. "Meu perfil": a própria pessoa consulta os dados, troca/remove a foto e
--    edita o nome de exibição. Função, ativação e permissões continuam só com
--    quem tem acesso.gerir (definir_funcao_conta / suspender_conta).
--    ⚠️ O nome não é a credencial: o login (e-mail interno) não muda, e os
--    registros guardam user_id + o rótulo do momento — renomear não reescreve
--    o passado.
-- 4. Avisos com destinatário (notificacoes.para_user_id): quem precisa saber,
--    não a equipe inteira. Autor por id (ator_user_id, da SESSÃO — nunca do
--    navegador). Alterações próximas do mesmo autor no mesmo assunto viram UM
--    aviso (chave_grupo), não um por gravação.
--    Push por pessoa fica DESLIGADO até a Edge Function enviar-push nova estar
--    publicada (admin_config.push_pessoal): a versão antiga mandaria o aviso
--    pessoal para todos os aparelhos da organização.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Foto de perfil ───────────────────────────────────────────────────────
alter table public.perfis
  add column if not exists avatar_path text
    check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'),
  add column if not exists avatar_em timestamptz;

-- 2 MB: o painel já entrega a foto recortada em 512 px (webp ≈ 40–120 KB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipe', 'equipe', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Conta da organização em condição de agir (mesmas condições de pode()).
create or replace function public.conta_org_ativa(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_user is not null and exists (select 1 from public.perfis pf
   where pf.user_id = p_user and pf.papel = 'organizacao' and pf.ativo and pf.bloqueado_em is null
     and not pf.deve_trocar_senha)
$$;
revoke all on function public.conta_org_ativa(uuid) from public, anon, authenticated;

-- Quem trabalha no painel: qualquer uma das portas de leitura.
create or replace function public.membro_org(p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.pode(p_secret, 'dado.ler') or public.pode(p_secret, 'redes.ver')
$$;
revoke all on function public.membro_org(text) from public, anon, authenticated;

-- ── 2. Diretório ────────────────────────────────────────────────────────────
create or replace function public.equipe_diretorio(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.membro_org(p_secret) then raise exception 'nao_autorizado' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'user_id', pf.user_id,
             'nome', coalesce(nullif(btrim(pf.nome), ''), 'Conta sem nome'),
             'funcao', f.rotulo,
             'ativo', pf.ativo and pf.bloqueado_em is null,
             'avatar_path', pf.avatar_path,
             'avatar_em', pf.avatar_em)
           order by coalesce(nullif(btrim(pf.nome), ''), 'Conta sem nome'))
      from public.perfis pf left join public.funcoes f on f.codigo = pf.funcao
     where pf.papel = 'organizacao'), '[]'::jsonb);
end $$;

-- ── 3. Meu perfil ───────────────────────────────────────────────────────────
-- Só conta nominal (o acesso compartilhado não é uma pessoa): devolve null.
create or replace function public.meu_perfil()
returns jsonb language sql stable security definer set search_path = public, auth as $$
  select jsonb_build_object(
           'user_id', pf.user_id,
           'nome', pf.nome,
           -- O login é o próprio endereço da pessoa; conta da equipe mostra só a parte antes do @.
           'login', case when u.email like '%@equipe.sweetcoffeeweek.com.br' then split_part(u.email, '@', 1) else u.email end,
           'funcao', pf.funcao,
           'funcao_rotulo', f.rotulo,
           'ativo', pf.ativo and pf.bloqueado_em is null,
           'avatar_path', pf.avatar_path,
           'avatar_em', pf.avatar_em,
           'desde', pf.created_at)
    from public.perfis pf
    join auth.users u on u.id = pf.user_id
    left join public.funcoes f on f.codigo = pf.funcao
   where pf.user_id = auth.uid() and pf.papel = 'organizacao'
$$;

-- Nome de exibição pela própria pessoa: mesma regra do atualizar_conta (texto
-- aparado) + tamanho (2–60). Não toca em login, função nem ativação.
create or replace function public.meu_nome_definir(p_nome text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_antes text; v_nome text := btrim(coalesce(p_nome, ''));
begin
  if not public.conta_org_ativa(auth.uid()) then raise exception 'nao_autorizado' using errcode = '42501'; end if;
  if char_length(v_nome) not between 2 and 60 then raise exception 'nome_invalido' using errcode = '22023'; end if;
  select nome into v_antes from public.perfis where user_id = auth.uid();
  if v_antes is not distinct from v_nome then return public.meu_perfil(); end if;
  update public.perfis set nome = v_nome where user_id = auth.uid();
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('conta.nome', 'perfis', auth.uid()::text, jsonb_build_object('de', v_antes, 'para', v_nome, 'pela_propria_pessoa', true));
  return public.meu_perfil();
end $$;

/*
 * Foto: a própria pessoa (p_user nulo ou o próprio id), ou quem tem
 * acesso.gerir para outra conta. Confere o objeto JÁ enviado ao bucket
 * `equipe`, na pasta da pessoa, com tipo e tamanho permitidos — a foto de
 * outra pessoa não entra por aqui, e um envio que não chegou não vira foto.
 */
create or replace function public.perfil_autorizar_foto(p_secret text, p_user uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_alvo uuid := coalesce(p_user, auth.uid());
begin
  if v_alvo is null then raise exception 'sem_conta' using errcode = '22023'; end if;
  if v_alvo = auth.uid() then
    if not public.conta_org_ativa(v_alvo) then raise exception 'nao_autorizado' using errcode = '42501'; end if;
  elsif not public.pode(p_secret, 'acesso.gerir') then
    raise exception 'nao_autorizado' using errcode = '42501';
  end if;
  if not exists (select 1 from public.perfis where user_id = v_alvo and papel = 'organizacao') then
    raise exception 'conta_nao_encontrada' using errcode = 'P0002';
  end if;
  return v_alvo;
end $$;
revoke all on function public.perfil_autorizar_foto(text, uuid) from public, anon, authenticated;

create or replace function public.perfil_foto_definir(p_secret text, p_user uuid, p_path text)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare v_alvo uuid; v_tam bigint; v_mime text;
begin
  v_alvo := public.perfil_autorizar_foto(p_secret, p_user);
  if p_path is null or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$' or split_part(p_path, '/', 1) <> v_alvo::text then
    raise exception 'caminho_invalido' using errcode = '22023';
  end if;
  select (o.metadata->>'size')::bigint, o.metadata->>'mimetype' into v_tam, v_mime
    from storage.objects o where o.bucket_id = 'equipe' and o.name = p_path;
  if not found then raise exception 'arquivo_nao_recebido' using errcode = 'P0002'; end if;
  if v_tam is null or v_tam <= 0 or v_tam > 2097152 then raise exception 'arquivo_invalido' using errcode = '22023'; end if;
  if v_mime is not null and v_mime not in ('image/webp', 'image/jpeg') then raise exception 'arquivo_invalido' using errcode = '22023'; end if;
  update public.perfis set avatar_path = p_path, avatar_em = now() where user_id = v_alvo;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
  values ('conta.foto', 'perfis', v_alvo::text, jsonb_build_object('acao', 'definida', 'pela_propria_pessoa', v_alvo = auth.uid()));
  return jsonb_build_object('user_id', v_alvo, 'avatar_path', p_path);
end $$;

-- Remover = tirar a referência. O objeto fica (nada se apaga); sem foto, iniciais.
create or replace function public.perfil_foto_remover(p_secret text, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_alvo uuid;
begin
  v_alvo := public.perfil_autorizar_foto(p_secret, p_user);
  update public.perfis set avatar_path = null, avatar_em = now() where user_id = v_alvo and avatar_path is not null;
  if found then
    insert into public.auditoria (acao, alvo_tabela, alvo_id, detalhe)
    values ('conta.foto', 'perfis', v_alvo::text, jsonb_build_object('acao', 'removida', 'pela_propria_pessoa', v_alvo = auth.uid()));
  end if;
  return jsonb_build_object('user_id', v_alvo, 'avatar_path', null);
end $$;

-- ── 4. Avisos por pessoa ────────────────────────────────────────────────────
alter table public.notificacoes
  add column if not exists ator_user_id uuid default auth.uid(),
  add column if not exists para_user_id uuid references public.perfis(user_id) on delete cascade,
  add column if not exists chave_grupo text,
  add column if not exists atualizada_em timestamptz,
  add column if not exists n_agrupadas integer not null default 1;
create index if not exists notificacoes_pessoa on public.notificacoes (para_user_id, criada_em desc) where para_user_id is not null;

alter table public.admin_config add column if not exists push_pessoal boolean not null default false;

/*
 * Aviso para UMA pessoa. Não avisa quem fez (p_user = sessão) nem conta
 * inativa. Com `p_chave`: um aviso ainda não lido do MESMO autor, no mesmo
 * assunto, nos últimos 30 minutos é ATUALIZADO (título, texto, contagem) em
 * vez de virar outro — salvar a legenda três vezes seguidas é um aviso só.
 * Chamada dentro da mesma transação da alteração: se a gravação falhar, o
 * aviso some junto (nunca se avisa uma mudança que não aconteceu).
 */
create or replace function public.avisar_pessoa(p_user uuid, p_tipo text, p_titulo text, p_texto text,
  p_link text, p_chave text default null, p_participante uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if current_setting('scw.silencioso', true) = 'on' then return; end if;
  if p_user is null or p_user is not distinct from auth.uid() or not public.conta_org_ativa(p_user) then return; end if;
  if p_chave is not null then
    update public.notificacoes n set
      titulo = left(p_titulo, 120), texto = left(p_texto, 240), link = p_link,
      atualizada_em = now(), n_agrupadas = n.n_agrupadas + 1, ator_rotulo = public.ator_rotulo_atual()
     where n.para_user_id = p_user and n.chave_grupo = p_chave
       and n.ator_user_id is not distinct from auth.uid()
       and coalesce(n.atualizada_em, n.criada_em) > now() - interval '30 minutes'
       and not exists (select 1 from public.notificacao_leitura l where l.notificacao_id = n.id and l.leitor = p_user::text)
    returning n.id into v_id;
    if v_id is not null then return; end if;
  end if;
  insert into public.notificacoes (para, participante_id, tipo, titulo, texto, link, ator_rotulo, ator_user_id,
                                   para_user_id, chave_grupo, push_enviado_em)
  values ('organizacao', p_participante, p_tipo, left(p_titulo, 120), left(p_texto, 240), p_link,
          public.ator_rotulo_atual(), auth.uid(), p_user, p_chave,
          -- Trava já preenchida = enviar-push pula (push pessoal ainda desligado).
          case when coalesce((select bool_or(push_pessoal) from public.admin_config), false) then null else now() end);
end $$;

-- Para todas as contas ativas com uma permissão (ex.: curadoria.decidir).
create or replace function public.avisar_quem_pode(p_acao text, p_tipo text, p_titulo text, p_texto text,
  p_link text, p_chave text default null, p_participante uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select pf.user_id from public.perfis pf
            where pf.papel = 'organizacao' and public.pode_por_user(pf.user_id, p_acao) loop
    perform public.avisar_pessoa(r.user_id, p_tipo, p_titulo, p_texto, p_link, p_chave, p_participante);
  end loop;
end $$;
revoke all on function public.avisar_pessoa(uuid, text, text, text, text, text, uuid),
  public.avisar_quem_pode(text, text, text, text, text, text, uuid) from public, anon, authenticated;

/*
 * Quem vê um aviso da organização:
 *   · pessoal → só o destinatário, enquanto tiver alguma porta de leitura;
 *   · de redes (geral, o modelo antigo) → quem tem redes.ver;
 *   · o resto → quem tem dado.ler (como sempre).
 * ⚠️ As permissões são calculadas UMA vez por chamada (pode() com a senha
 *    compartilhada paga bcrypt): nunca por linha.
 */
-- Novas colunas na leitura (autor por id, agrupamento): muda o tipo de retorno.
drop function if exists public.get_notificacoes_org(text, integer);
create function public.get_notificacoes_org(p_secret text, p_limite integer default 60)
returns table(id uuid, criada_em timestamptz, tipo text, titulo text, texto text, link text, ator_rotulo text, lida boolean,
              ator_user_id uuid, pessoal boolean, atualizada_em timestamptz, n_agrupadas integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_dl boolean := public.pode(p_secret, 'dado.ler');
  v_rv boolean := public.pode(p_secret, 'redes.ver');
  v_eu uuid := auth.uid();
  v_leitor text := coalesce(auth.uid()::text, 'compartilhada');
begin
  if not (v_dl or v_rv) then return; end if;
  return query
  select n.id, n.criada_em, n.tipo, n.titulo, n.texto, n.link, n.ator_rotulo,
         exists (select 1 from public.notificacao_leitura l where l.notificacao_id = n.id and l.leitor = v_leitor),
         n.ator_user_id, n.para_user_id is not null, n.atualizada_em, n.n_agrupadas
    from public.notificacoes n
   where n.para = 'organizacao'
     and case when n.para_user_id is not null then n.para_user_id = v_eu
              when n.tipo = 'redes' then v_rv else v_dl end
   order by coalesce(n.atualizada_em, n.criada_em) desc
   limit least(greatest(coalesce(p_limite, 60), 1), 200);
end $$;

-- Marcar como lido: qualquer porta de leitura (antes só dado.ler — a função
-- Social media via o aviso e não conseguia marcá-lo), e só o que a pessoa vê.
create or replace function public.ler_notificacoes_org(p_secret text, p_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_n integer;
  v_dl boolean := public.pode(p_secret, 'dado.ler');
  v_rv boolean := public.pode(p_secret, 'redes.ver');
  v_eu uuid := auth.uid();
begin
  if not (v_dl or v_rv) then raise exception 'nao_autorizado'; end if;
  insert into public.notificacao_leitura (notificacao_id, leitor)
  select n.id, coalesce(v_eu::text, 'compartilhada')
    from public.notificacoes n
   where n.para = 'organizacao' and (p_ids is null or n.id = any(p_ids))
     and case when n.para_user_id is not null then n.para_user_id = v_eu
              when n.tipo = 'redes' then v_rv else v_dl end
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

/*
 * Aparelhos que recebem o push de um aviso (chamada só pela enviar-push, com
 * service_role). Marca: os da marca. Pessoal: só os da conta destinatária.
 * Geral da organização: aparelhos sem dono (acesso compartilhado antigo) e
 * os de quem pode ler aquele tipo — o push de uma mensagem de marca não vai
 * para o celular de quem só cuida das redes.
 */
create or replace function public.push_destinos(p_notificacao uuid)
returns table(id uuid, endpoint text, p256dh text, auth_chave text)
language sql stable security definer set search_path = public as $$
  select s.id, s.endpoint, s.p256dh, s.auth_chave
    from public.notificacoes n
    join public.push_subscriptions s on s.papel = n.para and s.ativo
   where n.id = p_notificacao
     and case
       when n.para = 'marca' then s.participante_id = n.participante_id
       when n.para_user_id is not null then s.user_id = n.para_user_id
       else s.user_id is null or public.pode_por_user(s.user_id, case when n.tipo = 'redes' then 'redes.ver' else 'dado.ler' end)
     end
$$;
revoke all on function public.push_destinos(uuid) from public, anon, authenticated;
grant execute on function public.push_destinos(uuid) to service_role;

-- Ligar/desligar avisos no aparelho: qualquer porta de leitura (antes só
-- dado.ler — a Social media não conseguia ligar os próprios avisos). Mesmo
-- corpo de 20261001_painel_refinamento / 20260928, só a condição muda.
create or replace function public.registrar_push_organizacao(p_secret text, p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null::text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.membro_org(p_secret) then raise exception 'nao_autorizado'; end if;
  insert into public.push_subscriptions (papel, participante_id, endpoint, p256dh, auth_chave, user_agent, user_id)
  values ('organizacao', null, p_endpoint, p_p256dh, p_auth, p_user_agent, auth.uid());
end $$;

create or replace function public.remover_push_organizacao(p_secret text, p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.membro_org(p_secret) then raise exception 'nao_autorizado'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and papel = 'organizacao';
end $$;

-- ── Grants ──────────────────────────────────────────────────────────────────
revoke all on function public.equipe_diretorio(text), public.meu_perfil(), public.meu_nome_definir(text),
  public.perfil_foto_definir(text, uuid, text), public.perfil_foto_remover(text, uuid),
  public.get_notificacoes_org(text, integer), public.ler_notificacoes_org(text, uuid[])
  from public;
revoke all on function public.meu_perfil(), public.meu_nome_definir(text) from anon;
grant execute on function public.equipe_diretorio(text), public.perfil_foto_definir(text, uuid, text),
  public.perfil_foto_remover(text, uuid), public.get_notificacoes_org(text, integer),
  public.ler_notificacoes_org(text, uuid[]) to anon, authenticated;
-- Sem sessão nominal não há "meu": só authenticated.
grant execute on function public.meu_perfil(), public.meu_nome_definir(text) to authenticated;
