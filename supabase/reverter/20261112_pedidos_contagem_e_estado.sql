-- Reversão de 20261112_pedidos_contagem_e_estado.sql: itens prontos voltam a exigir ingredientes, pedidos abertos
-- voltam a contar só as linhas de estado, sai o gatilho da participação nova e a resposta volta a valer para todas as
-- participações da marca.

drop trigger if exists solicitacoes_participacao_nova on public.participacoes;
drop function if exists public.solicitacoes_para_participacao_nova();

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
               and coalesce(trim(i.descricao), '') <> '' and coalesce(trim(i.ingredientes), '') <> ''),
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
           (select count(*) from public.solicitacao_estado se where se.participacao_id = pa.id and se.estado = 'pendente'),
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

create or replace function public.marca_responder_solicitacao(p_solicitacao uuid, p_resposta text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  novo text := trim(coalesce(p_resposta, ''));
  anterior text;
  junto text;
begin
  if novo = '' then raise exception 'resposta_vazia'; end if;

  select nullif(trim(coalesce(e.resposta, '')), '') into anterior
    from public.solicitacao_estado e
   where e.solicitacao_id = p_solicitacao
     and exists (select 1 from public.participacoes pa
                  where pa.id = e.participacao_id and pa.participante_id = public.meu_participante());
  if not found then raise exception 'pedido_nao_encontrado'; end if;

  junto := case when anterior is null then novo
                else anterior || E'\n\n— Complemento de ' || to_char(now() at time zone 'America/Fortaleza', 'DD/MM "às" HH24:MI') || E' —\n' || novo end;
  if char_length(junto) > 4000 then raise exception 'resposta_longa'; end if;

  update public.solicitacao_estado e set
    estado = 'respondido', respondido_em = now(), respondido_por = auth.uid(), resposta = junto
   where e.solicitacao_id = p_solicitacao
     and exists (select 1 from public.participacoes pa
                  where pa.id = e.participacao_id and pa.participante_id = public.meu_participante());
end $function$;
