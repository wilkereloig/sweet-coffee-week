-- 03/11/2026 (Wilker: "uma forma de disponibilizar essas fotos sem ocupar espaço" — o Supabase free já passa de 1 GB).
-- Um arquivo do painel pode ser um LINK (pasta do Dropbox) em vez de um arquivo no Storage: `arquivos.url_externa`.
--   · exatamente um dos dois: `path` (Storage) OU `url_externa`; o link só vale https://…dropbox.com/…;
--   · a marca lê pela mesma policy de sempre (`arquivos_marca_le`); o aviso por arquivo (`gerar_notificacoes`) só dispara no INSERT já
--     publicado — quem quiser publicar SEM avisar insere com publicado_em nulo e depois atualiza (o UPDATE não avisa);
--   · `get_arquivos_admin` passa a devolver `url_externa` (muda o tipo de retorno: drop + create).
-- Reversão: supabase/reverter/20261129_arquivo_por_link.sql. Teste: supabase/testes/arquivo-por-link.sql.
alter table public.arquivos alter column path drop not null;
alter table public.arquivos add column if not exists url_externa text;
alter table public.arquivos drop constraint if exists arquivos_path_ou_link;
alter table public.arquivos add constraint arquivos_path_ou_link check ((path is not null) <> (url_externa is not null));
alter table public.arquivos drop constraint if exists arquivos_url_externa_check;
alter table public.arquivos add constraint arquivos_url_externa_check
  check (url_externa is null or url_externa ~ '^https://([a-z0-9-]+\.)?dropbox\.com/[^[:space:]]+$');

drop function if exists public.get_arquivos_admin(text);
create function public.get_arquivos_admin(p_secret text)
 returns table(id uuid, escopo text, nome text, descricao text, versao text, path text, publicado_em timestamptz, arquivado boolean,
               exige_leitura boolean, marca text, leituras bigint, categoria text, mime text, tamanho bigint, participacao_id uuid,
               created_at timestamptz, url_externa text)
 language sql stable security definer set search_path to 'public'
as $function$
  select a.id, a.escopo, a.nome, a.descricao, a.versao, a.path,
         a.publicado_em, a.arquivado, a.exige_leitura,
         p.nome_marca,
         -- só quem confirmou a versão ATUAL (a mesma tolerância de 1 min de marca_confirmar_leitura)
         (select count(*) from public.arquivo_leitura l
           where l.arquivo_id = a.id and (a.publicado_em is null or l.lido_em >= a.publicado_em - interval '1 minute')),
         a.categoria, a.mime, a.tamanho, a.participacao_id, a.created_at, a.url_externa
    from public.arquivos a
    left join public.participacoes pa on pa.id = a.participacao_id
    left join public.participantes p  on p.id = pa.participante_id
   where public.pode(p_secret, 'dado.ler')
   order by a.publicado_em desc nulls first;
$function$;
