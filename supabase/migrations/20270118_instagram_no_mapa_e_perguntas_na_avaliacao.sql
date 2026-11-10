-- 10/11/2026 (pedido do Wilker): Instagram no cadastro da Caça aos Carimbos e três perguntas abertas na avaliação do combo.
--
-- ADITIVA. Nenhuma função existente muda de assinatura (o site publicado continua chamando mapa_criar_v2 e submit_avaliacao como
-- sempre): os dados novos entram por duas funções próprias, chamadas logo depois do cadastro e do envio da avaliação.
--   · mapas_lover.instagram + mapa_definir_instagram(chave, instagram): opcional; guarda só o nome do perfil (sem @ nem endereço).
--   · avaliacoes.comentario_evento / sugestao_festival + avaliacao_complementar(...): opcionais; só completam a avaliação que a
--     própria pessoa acabou de enviar (mesmo e-mail, mesma casa, nos últimos 30 minutos). O comentário sobre o combo segue em
--     avaliacoes.comentario, que já existia.
-- A leitura da organização (get_avaliacoes_dados) passa a trazer os dois campos novos.

alter table public.mapas_lover add column if not exists instagram text;
alter table public.avaliacoes add column if not exists comentario_evento text, add column if not exists sugestao_festival text;

create or replace function public.mapa_definir_instagram(p_chave text, p_instagram text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v text := lower(btrim(coalesce(p_instagram, '')));
begin
  v := regexp_replace(v, '^(https?://)?(www\.)?instagram\.com/', '');
  v := regexp_replace(v, '[/?#].*$', '');
  v := regexp_replace(v, '^@+', '');
  if v <> '' and v !~ '^[a-z0-9._]{1,30}$' then return jsonb_build_object('ok', false, 'motivo', 'instagram_invalido'); end if;
  update public.mapas_lover set instagram = nullif(v, '') where chave_hash = public.mapa_hash(p_chave);
  if not found then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  return jsonb_build_object('ok', true, 'instagram', nullif(v, ''));
end $$;

create or replace function public.avaliacao_complementar(p_edicao text, p_slug text, p_email text, p_evento text, p_sugestao text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  update public.avaliacoes av
     set comentario_evento = nullif(left(btrim(coalesce(p_evento, '')), 600), ''),
         sugestao_festival = nullif(left(btrim(coalesce(p_sugestao, '')), 600), '')
    from public.participacoes pa
   where pa.id = av.participacao_id and pa.slug_publico = p_slug and av.edicao_codigo = p_edicao
     and av.email_norm = lower(btrim(coalesce(p_email, '')))
     and greatest(av.criado_em, coalesce(av.atualizado_em, av.criado_em)) > now() - interval '30 minutes';
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n > 0);
end $$;

revoke all on function public.mapa_definir_instagram(text, text), public.avaliacao_complementar(text, text, text, text, text) from public;
grant execute on function public.mapa_definir_instagram(text, text), public.avaliacao_complementar(text, text, text, text, text) to anon, authenticated, service_role;

create or replace function public.get_avaliacoes_dados(p_secret text, p_edicao text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not public.pode(p_secret, 'relatorio.ler') then raise exception 'nao_autorizado'; end if;
  return (select coalesce(jsonb_agg(x order by x ->> 'casa', x ->> 'criado_em'), '[]'::jsonb) from (
    select jsonb_build_object('casa', pt.nome_marca, 'slug', pa.slug_publico, 'unidade', coalesce(u.nome_unidade, pu.id_publico),
             'notas', av.notas, 'comentario', av.comentario, 'comentario_evento', av.comentario_evento,
             'sugestao_festival', av.sugestao_festival, 'substituicoes', av.substituicoes,
             'criado_em', av.criado_em, 'atualizado_em', av.atualizado_em) x
      from public.avaliacoes av
      join public.participacoes pa on pa.id = av.participacao_id
      join public.participantes pt on pt.id = pa.participante_id
      left join public.participacao_unidades pu on pu.id = av.participacao_unidade_id
      left join public.unidades u on u.id = pu.unidade_id
     where av.edicao_codigo = p_edicao) s);
end $function$;
