-- Reverte 20261129. Apague antes as linhas com link (delete from public.arquivos where url_externa is not null), senão o NOT NULL falha.
drop function if exists public.get_arquivos_admin(text);
create function public.get_arquivos_admin(p_secret text)
 returns table(id uuid, escopo text, nome text, descricao text, versao text, path text, publicado_em timestamptz, arquivado boolean,
               exige_leitura boolean, marca text, leituras bigint, categoria text, mime text, tamanho bigint, participacao_id uuid, created_at timestamptz)
 language sql stable security definer set search_path to 'public'
as $function$
  select a.id, a.escopo, a.nome, a.descricao, a.versao, a.path, a.publicado_em, a.arquivado, a.exige_leitura, p.nome_marca,
         (select count(*) from public.arquivo_leitura l
           where l.arquivo_id = a.id and (a.publicado_em is null or l.lido_em >= a.publicado_em - interval '1 minute')),
         a.categoria, a.mime, a.tamanho, a.participacao_id, a.created_at
    from public.arquivos a
    left join public.participacoes pa on pa.id = a.participacao_id
    left join public.participantes p  on p.id = pa.participante_id
   where public.pode(p_secret, 'dado.ler')
   order by a.publicado_em desc nulls first;
$function$;
alter table public.arquivos drop constraint if exists arquivos_url_externa_check, drop constraint if exists arquivos_path_ou_link;
alter table public.arquivos drop column if exists url_externa;
alter table public.arquivos alter column path set not null;
