-- Varredura de bugs 25/10/2026 — três defeitos das solicitações e um da contagem de itens:
-- 1. get_participantes.itens_prontos ainda exigia `ingredientes`, opcional desde 20261021: a lista de Marcas e a
--    Visão geral mostravam "0 de 3 itens" para quem já tinha os três prontos.
-- 2. get_participantes.pedidos_abertos contava estado 'pendente' de solicitação ARQUIVADA e ignorava pedido geral
--    sem linha de estado: o número do cartão não batia com a ficha. Passa a usar a mesma regra de
--    get_ficha_participacao (publicada, não arquivada, da participação ou geral; sem linha = pendente).
-- 3. Participação criada DEPOIS de um pedido geral publicado não ganhava a linha de solicitacao_estado: a marca via
--    "Responder" e recebia `pedido_nao_encontrado` para sempre. Gatilho cria a linha, com o mesmo alcance de
--    publicar_solicitacao; e a resposta da marca cria a linha se ainda faltar.
-- 4. marca_responder_solicitacao reescrevia a resposta em TODAS as participações da marca (pedido geral sem
--    edição): responder em 2026.2 apagava a resposta de 2026.1. Passa a gravar numa participação só: a da edição do
--    pedido, senão a mais recente.
-- Reversão: supabase/reverter/20261112_pedidos_contagem_e_estado.sql

create or replace function public.get_participantes(p_secret text, p_arquivados boolean DEFAULT false)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, origem_id uuid, user_id uuid, slug text, nome_marca text, responsavel text, telefone text, email text, instagram text, site text, cnpj text, razao_social text, participacao_id uuid, edicao_codigo text, status_cadastro text, tema_combo text, combo_preco numeric, unidades bigint, itens_prontos bigint, edicoes bigint, historico_status text, foto_liberacao text, pagamento_status text, combo_status text, pendencias bigint, sessao_fotos timestamp with time zone, participacoes_acervo bigint, arquivado_em timestamp with time zone, campos_total integer, campos_faltando integer, correcoes_abertas bigint, pedidos_abertos bigint, ultima_atividade timestamp with time zone, status_acesso text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_ed text;
begin
  if not public.pode(p_secret, 'dado.ler') then return; end if;
  select c.edicao_atual into v_ed from public.admin_config c where c.id;
  return query
    select p.id, p.created_at, p.updated_at, p.origem_id, p.user_id, p.slug,
           p.nome_marca, p.responsavel, p.telefone, p.email, p.instagram, p.site, p.cnpj, p.razao_social,
           pa.id, pa.edicao_codigo, coalesce(pa.status_cadastro, 'sem_participacao'), pa.tema_combo, pa.combo_preco,
           (select count(*) from public.participacao_unidades u
             where u.participacao_id = pa.id and coalesce(trim(u.endereco), '') <> ''),
           (select count(*) from public.participantes_itens i
             where i.participacao_id = pa.id and coalesce(trim(i.nome), '') <> ''
               and coalesce(trim(i.descricao), '') <> ''),
           (select count(*) from public.participacoes t where t.participante_id = p.id),
           p.historico_status, pa.foto_liberacao, pa.pagamento_status, pa.combo_status,
           (select count(*) from public.revisao_pendencias r where r.participante_id = p.id and r.status = 'aberta'),
           (select min(s.data_hora) from public.sessoes_fotos s where s.participacao_id = pa.id
             and s.status in ('agendada','remarcada')),
           (select count(distinct h.edicao_codigo) from public.historico_participacoes h
             join public.participante_vinculos v on v.chave = h.chave
            where v.participante_id = p.id and v.status = 'confirmado'),
           p.arquivado_em,
           cc.total, cc.faltando,
           (select count(*) from public.correcoes_campo c where c.participacao_id = pa.id and c.estado = 'aberta'),
           (select count(*) from public.solicitacoes s
              left join public.solicitacao_estado e on e.solicitacao_id = s.id and e.participacao_id = pa.id
             where pa.id is not null and s.publicada_em is not null and not s.arquivada
               and (s.participacao_id = pa.id or s.escopo = 'geral')
               and coalesce(e.estado, 'pendente') = 'pendente'),
           greatest(p.updated_at, pa.updated_at,
                    (select max(a.at) from public.auditoria a where a.participante_id = p.id)),
           public.status_acesso_marca(p.user_id)
      from public.participantes p
      left join lateral (
        select pp.* from public.participacoes pp where pp.participante_id = p.id
         order by (pp.edicao_codigo is not distinct from v_ed) desc, pp.edicao_codigo desc, pp.created_at desc
         limit 1) pa on true
      left join lateral (select * from public.campos_cadastro(pa.id)) cc on pa.id is not null
     where (p.arquivado_em is null) <> coalesce(p_arquivados, false)
     order by p.created_at desc;
end $function$;

-- 3. A participação nova recebe os pedidos gerais já publicados (mesmo alcance de publicar_solicitacao).
create or replace function public.solicitacoes_para_participacao_nova()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.solicitacao_estado (solicitacao_id, participacao_id)
  select s.id, new.id
    from public.solicitacoes s
   where s.escopo = 'geral' and s.publicada_em is not null and not s.arquivada
     and (s.edicao_codigo is null or s.edicao_codigo = new.edicao_codigo)
  on conflict (solicitacao_id, participacao_id) do nothing;
  return null;
end $function$;
revoke all on function public.solicitacoes_para_participacao_nova() from public, anon, authenticated;

create or replace trigger solicitacoes_participacao_nova after insert on public.participacoes
  for each row execute function public.solicitacoes_para_participacao_nova();

-- 3 + 4. A resposta grava numa participação só (a da edição do pedido, senão a mais recente) e cria a linha se faltar.
create or replace function public.marca_responder_solicitacao(p_solicitacao uuid, p_resposta text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  novo text := trim(coalesce(p_resposta, ''));
  v_pa uuid;
  anterior text;
  junto text;
begin
  if novo = '' then raise exception 'resposta_vazia'; end if;

  select pa.id into v_pa
    from public.solicitacoes s
    join public.participacoes pa on pa.participante_id = public.meu_participante()
   where s.id = p_solicitacao and s.publicada_em is not null and not s.arquivada
     and ((s.escopo = 'marca' and pa.id = s.participacao_id)
       or (s.escopo = 'geral' and (s.edicao_codigo is null or pa.edicao_codigo = s.edicao_codigo)))
   order by (pa.edicao_codigo is not distinct from s.edicao_codigo) desc, pa.edicao_codigo desc nulls last, pa.created_at desc
   limit 1;
  if v_pa is null then raise exception 'pedido_nao_encontrado'; end if;

  insert into public.solicitacao_estado (solicitacao_id, participacao_id) values (p_solicitacao, v_pa)
  on conflict (solicitacao_id, participacao_id) do nothing;

  select nullif(trim(coalesce(e.resposta, '')), '') into anterior
    from public.solicitacao_estado e
   where e.solicitacao_id = p_solicitacao and e.participacao_id = v_pa;

  junto := case when anterior is null then novo
                else anterior || E'\n\n— Complemento de ' || to_char(now() at time zone 'America/Fortaleza', 'DD/MM "às" HH24:MI') || E' —\n' || novo end;
  if char_length(junto) > 4000 then raise exception 'resposta_longa'; end if;

  update public.solicitacao_estado e set
    estado = 'respondido', respondido_em = now(), respondido_por = auth.uid(), resposta = junto
   where e.solicitacao_id = p_solicitacao and e.participacao_id = v_pa;
end $function$;
