-- =============================================================================
-- Refinamento do painel — 01/10/2026. Rodar inteiro no SQL Editor (uma vez;
-- tudo aqui é idempotente).
--
-- 1. Substituição por item do combo (tem_substituicao + substituicao).
-- 2. Reserva de vaga de fotos: só marca liberada, só vaga futura, uma sessão
--    ativa por participação.
-- 3. Abrir a conversa marca como lido o aviso de mensagem do sino.
-- 4. Logo nova da marca avisa a organização (continua valendo na hora).
-- 5. Sessão de fotos realizada avisa a marca.
-- 6. Push por aparelho (item 5 da auditoria): a assinatura passa a ter dono;
--    outra conta no mesmo aparelho substitui a anterior; conta desativada ou
--    bloqueada para de receber e volta ao ser reativada.
--
-- `create or replace` preserva a ACL. As funções NOVAS são fechadas com
-- revoke de public, anon, authenticated (§4.1 do CLAUDE.md).
-- =============================================================================

-- ---- 1 · substituição por item ----------------------------------------------

alter table public.participantes_itens
  add column if not exists tem_substituicao boolean not null default false,
  add column if not exists substituicao text;

do $$ begin
  alter table public.participantes_itens
    add constraint participantes_itens_substituicao_tamanho check (char_length(substituicao) <= 500);
exception when duplicate_object then null; end $$;

grant update (tem_substituicao, substituicao) on public.participantes_itens to authenticated;

create or replace function public.org_salvar_item(p_secret text, p_participacao uuid, p_posicao integer, p_dados jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_pa public.participacoes%rowtype;
  v_id uuid; v_antes jsonb; v_depois jsonb;
  v_tipo text := coalesce(nullif(p_dados ->> 'tipo', ''), case p_posicao when 1 then 'doce' when 2 then 'salgado' else 'bebida' end);
begin
  if not public.pode(p_secret, 'cadastro.editar') then raise exception 'nao_autorizado'; end if;
  if p_posicao not in (1, 2, 3) then raise exception 'posicao_invalida'; end if;
  select * into v_pa from public.participacoes where id = p_participacao;
  if not found then raise exception 'participacao_nao_encontrada'; end if;
  select id, to_jsonb(i) into v_id, v_antes from public.participantes_itens i
   where participacao_id = p_participacao and posicao = p_posicao limit 1;
  if v_id is null then
    insert into public.participantes_itens (participacao_id, participante_id, tipo, posicao)
    values (p_participacao, v_pa.participante_id, v_tipo, p_posicao) returning id into v_id;
  end if;
  update public.participantes_itens set
    tipo = v_tipo,
    nome = case when p_dados ? 'nome' then nullif(btrim(p_dados ->> 'nome'), '') else nome end,
    descricao = case when p_dados ? 'descricao' then nullif(btrim(p_dados ->> 'descricao'), '') else descricao end,
    ingredientes = case when p_dados ? 'ingredientes' then nullif(btrim(p_dados ->> 'ingredientes'), '') else ingredientes end,
    vegano = case when p_dados ? 'vegano' then coalesce((p_dados ->> 'vegano')::boolean, false) else vegano end,
    sem_gluten = case when p_dados ? 'sem_gluten' then coalesce((p_dados ->> 'sem_gluten')::boolean, false) else sem_gluten end,
    sem_lactose = case when p_dados ? 'sem_lactose' then coalesce((p_dados ->> 'sem_lactose')::boolean, false) else sem_lactose end,
    tem_substituicao = case when p_dados ? 'tem_substituicao' then coalesce((p_dados ->> 'tem_substituicao')::boolean, false) else tem_substituicao end,
    substituicao = case when p_dados ? 'substituicao' then left(nullif(btrim(p_dados ->> 'substituicao'), ''), 500) else substituicao end
   where id = v_id
  returning to_jsonb(participantes_itens) into v_depois;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, participacao_id, detalhe)
  values ('cadastro.editado', 'participantes_itens', v_id::text, v_pa.participante_id, p_participacao,
          jsonb_build_object('bloco', 'item', 'posicao', p_posicao, 'tipo', v_tipo,
            'nome_de', v_antes ->> 'nome', 'nome_para', v_depois ->> 'nome',
            'substituicao_de', v_antes ->> 'substituicao', 'substituicao_para', v_depois ->> 'substituicao'));
  return v_id;
end $function$;

-- ---- 2 · reserva de vaga de fotos -------------------------------------------
-- Antes: qualquer marca da edição reservava, liberada ou não, vaga vencida
-- inclusive, e quantas quisesse. Só a tela segurava.

drop policy if exists fotos_marca_reserva on public.sessoes_fotos;
create policy fotos_marca_reserva on public.sessoes_fotos for update to authenticated
using (
  status = 'aberto' and data_hora > now()
  and exists (select 1 from public.participacoes pa join public.participantes p on p.id = pa.participante_id
               where p.user_id = auth.uid() and pa.edicao_codigo = sessoes_fotos.edicao_codigo
                 and pa.foto_liberacao = 'liberado')
)
with check (
  status = 'agendada'
  and exists (select 1 from public.participacoes pa join public.participantes p on p.id = pa.participante_id
               where p.user_id = auth.uid() and pa.id = sessoes_fotos.participacao_id
                 and pa.edicao_codigo = sessoes_fotos.edicao_codigo and p.id = sessoes_fotos.participante_id
                 and pa.foto_liberacao = 'liberado')
);

-- Uma sessão ativa por participação. Índice, não policy: policy que consulta a
-- própria tabela recursa. Conferido antes: nenhuma participação tem duas.
create unique index if not exists sessoes_fotos_uma_ativa
  on public.sessoes_fotos (participacao_id) where status in ('agendada', 'remarcada');

-- ---- 3 · conversa lida também limpa o sino ----------------------------------

create or replace function public.marca_ler_mensagens()
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v_n integer; v_part uuid := public.meu_participante();
begin
  update public.mensagens m set lida_em = now()
   where m.de = 'organizacao' and m.lida_em is null and m.participante_id = v_part;
  get diagnostics v_n = row_count;
  update public.notificacoes n set lida_em = now()
   where n.para = 'marca' and n.tipo = 'mensagem' and n.lida_em is null and n.participante_id = v_part;
  return v_n;
end $function$;

-- ---- 4 · logo nova avisa a organização --------------------------------------

create or replace function public.marca_definir_logo(p_dados jsonb)
 returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare v_p uuid := public.meu_participante(); v_id uuid;
begin
  if v_p is null then raise exception 'sem_marca'; end if;
  v_id := public.registrar_logo(v_p, p_dados, 'participante');
  perform public.notificar('organizacao', null, 'cadastro',
    (select nome_marca from public.participantes where id = v_p) || ' enviou uma nova logo',
    'Já está valendo. Confira e peça correção se precisar.', 'marcas/' || v_p || '/cadastro');
  return v_id;
end $function$;

-- ---- 5 · gerar_notificacoes: + sessão realizada ------------------------------
-- Igual à versão anterior; a única linha nova é o `when 'realizada'`.

create or replace function public.gerar_notificacoes()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_marca text; v_part uuid; v_titulo text; v_eh_marca boolean;
begin
  v_eh_marca := exists (select 1 from public.participantes where user_id = auth.uid());

  if tg_table_name = 'mensagens' then
    select nome_marca into v_marca from public.participantes where id = new.participante_id;
    insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
    values ('mensagem.enviada', 'mensagens', new.id::text, new.participante_id,
            jsonb_build_object('de', new.de, 'trecho', left(new.corpo, 200)));
    if new.de = 'organizacao' then
      perform public.notificar('marca', new.participante_id, 'mensagem',
        'Nova mensagem da organização', left(new.corpo, 140), 'mensagens');
    else
      perform public.notificar('organizacao', null, 'mensagem',
        v_marca || ' enviou uma mensagem', left(new.corpo, 140), 'marcas/' || new.participante_id || '/mensagens');
    end if;

  elsif tg_table_name = 'solicitacao_estado' then
    select pa.participante_id, p.nome_marca into v_part, v_marca
      from public.participacoes pa join public.participantes p on p.id = pa.participante_id
     where pa.id = new.participacao_id;
    select titulo into v_titulo from public.solicitacoes where id = new.solicitacao_id;
    if tg_op = 'INSERT' then
      perform public.notificar('marca', v_part, 'pedido', 'Novo pedido: ' || v_titulo,
        (select case when prazo_em is null then 'Sem prazo'
                     else 'Prazo: ' || to_char(prazo_em at time zone 'America/Fortaleza', 'DD/MM') end
           from public.solicitacoes where id = new.solicitacao_id),
        'pedidos/' || new.solicitacao_id);
    elsif new.estado = 'respondido' and old.estado is distinct from 'respondido' and v_eh_marca then
      perform public.notificar('organizacao', null, 'pedido', v_marca || ' respondeu: ' || v_titulo,
        left(coalesce(new.resposta, ''), 140), 'producao/pedido/' || new.solicitacao_id);
    end if;

  elsif tg_table_name = 'arquivos' then
    if new.publicado_em is not null and not new.arquivado then
      if new.escopo = 'marca' then
        perform public.notificar('marca', pa.participante_id, 'arquivo', 'Novo arquivo: ' || new.nome,
          new.descricao, 'arquivos/' || new.id)
          from public.participacoes pa where pa.id = new.participacao_id;
      else
        perform public.notificar('marca', p.id, 'arquivo', 'Novo arquivo: ' || new.nome,
          new.descricao, 'arquivos/' || new.id)
          from public.participantes p where p.user_id is not null;
      end if;
    end if;

  elsif tg_table_name = 'sessoes_fotos' then
    if new.participante_id is not null then
      select nome_marca into v_marca from public.participantes where id = new.participante_id;
      if tg_op = 'UPDATE' and old.participante_id is null and v_eh_marca then
        perform public.notificar('organizacao', null, 'fotos', v_marca || ' reservou uma vaga de fotos',
          to_char(new.data_hora at time zone 'America/Fortaleza', 'DD/MM "às" HH24:MI'), 'producao/fotos');
      elsif not v_eh_marca and (tg_op = 'INSERT' or new.status is distinct from old.status
                                or new.data_hora is distinct from old.data_hora) then
        v_titulo := case new.status
          when 'agendada' then 'Sessão de fotos marcada'
          when 'remarcada' then 'Sessão de fotos remarcada'
          when 'cancelada' then 'Sessão de fotos cancelada'
          when 'realizada' then 'Sessão de fotos realizada'
          else null end;
        if v_titulo is not null then
          perform public.notificar('marca', new.participante_id, 'fotos', v_titulo,
            to_char(new.data_hora at time zone 'America/Fortaleza', 'DD/MM "às" HH24:MI')
              || coalesce(' · ' || nullif(new.local, ''), ''), 'cadastro/fotos');
        end if;
      end if;
    end if;

  elsif tg_table_name = 'participacoes' then
    if new.status_cadastro = 'cadastro_completo' and old.status_cadastro is distinct from 'cadastro_completo' then
      select nome_marca into v_marca from public.participantes where id = new.participante_id;
      perform public.notificar('organizacao', null, 'cadastro', v_marca || ' concluiu o cadastro',
        'Edição ' || new.edicao_codigo, 'marcas/' || new.participante_id);
    end if;

  elsif tg_table_name = 'quero_participar' then
    perform public.notificar('organizacao', null, 'formulario', 'Nova candidatura: ' || new.empresa,
      new.nome, 'respostas/quero_participar/' || new.id);
  elsif tg_table_name = 'contact_requests' then
    perform public.notificar('organizacao', null, 'formulario', 'Novo contato: ' || new.name,
      left(coalesce(new.subject, new.message, ''), 140), 'respostas/contato/' || new.id);
  elsif tg_table_name = 'support_interests' then
    perform public.notificar('organizacao', null, 'formulario', 'Interesse em apoiar: ' || coalesce(new.empresa, new.nome),
      new.nome, 'respostas/apoiar/' || new.id);
  end if;
  return new;
end $function$;

-- ---- 6 · push com dono -------------------------------------------------------

alter table public.push_subscriptions add column if not exists user_id uuid default auth.uid();

-- Outra conta no mesmo aparelho: a marca B não enxerga (nem apaga) a linha da
-- marca A pela RLS, e o insert batia no unique(endpoint) — o aparelho seguia
-- recebendo os avisos de A. O endpoint é do aparelho: quem assina por último é
-- o dono.
create or replace function public.push_substitui_aparelho()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  delete from public.push_subscriptions where endpoint = new.endpoint;
  return new;
end $function$;
revoke all on function public.push_substitui_aparelho() from public, anon, authenticated;

drop trigger if exists push_substitui_aparelho on public.push_subscriptions;
create trigger push_substitui_aparelho before insert on public.push_subscriptions
  for each row execute function public.push_substitui_aparelho();

create or replace function public.registrar_push_organizacao(p_secret text, p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null::text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  insert into public.push_subscriptions (papel, participante_id, endpoint, p256dh, auth_chave, user_agent, user_id)
  values ('organizacao', null, p_endpoint, p_p256dh, p_auth, p_user_agent, auth.uid());
end;
$function$;

-- Conta desativada ou bloqueada para de receber; reativada, volta.
-- ponytail: reativar também religa assinaturas que o envio tinha marcado como
-- mortas; o próximo envio as marca de novo. Coluna própria se isso incomodar.
create or replace function public.push_segue_conta()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if (new.ativo and new.bloqueado_em is null) is distinct from (old.ativo and old.bloqueado_em is null) then
    update public.push_subscriptions s set ativo = (new.ativo and new.bloqueado_em is null)
     where s.user_id = new.user_id
        or s.participante_id in (select p.id from public.participantes p where p.user_id = new.user_id);
  end if;
  return new;
end $function$;
revoke all on function public.push_segue_conta() from public, anon, authenticated;

drop trigger if exists push_segue_conta on public.perfis;
create trigger push_segue_conta after update of ativo, bloqueado_em on public.perfis
  for each row execute function public.push_segue_conta();
