-- Prévia das imagens em Arquivos (27/10/2026, pedido do Wilker: "mostra a prévia desses arquivos de download").
-- A logo Cartoon em alta tem 16 MB: mostrar o original como miniatura travaria o celular. Cada imagem ganha uma
-- PRÉVIA WEBP de até 960 px no lado maior (dezenas de KB), na MESMA pasta do bucket privado `arquivos` (a pasta é que
-- decide quem lê). Quem gera é o painel da equipe: ao publicar/substituir (do arquivo na mão) e, para o que já estava
-- publicado, uma vez, ao abrir Arquivos num computador.
--   · arquivos.previa_path + CHECK (mesma pasta do arquivo, .webp)
--   · gatilho: trocar o arquivo (path novo) apaga a referência da prévia antiga — ela era do arquivo anterior
--   · arquivo_definir_previa (producao.gerir, o mesmo de publicar) · get_arquivos_previas (dado.ler)
--   · policy arquivos_marca_le: a marca lê a prévia do arquivo que ela já pode ler, e só ela
-- Reversão: supabase/reverter/20261116_arquivos_previa.sql

alter table public.arquivos add column if not exists previa_path text;
alter table public.arquivos drop constraint if exists arquivos_previa_path_check;
alter table public.arquivos add constraint arquivos_previa_path_check
  check (previa_path is null or (split_part(previa_path, '/', 1) = split_part(path, '/', 1) and previa_path ~ '^[^/]+/[A-Za-z0-9._-]+\.webp$'));

create or replace function public.arquivos_previa_do_arquivo()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if new.path is distinct from old.path and new.previa_path is not distinct from old.previa_path then
    new.previa_path := null;
  end if;
  return new;
end $function$;

create or replace trigger arquivos_previa_do_arquivo before update of path on public.arquivos
  for each row execute function public.arquivos_previa_do_arquivo();

create or replace function public.arquivo_definir_previa(p_secret text, p_arquivo uuid, p_path text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v public.arquivos%rowtype; v_path text := btrim(coalesce(p_path, ''));
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  select * into v from public.arquivos where id = p_arquivo for update;
  if not found then raise exception 'arquivo_nao_encontrado'; end if;
  if split_part(v_path, '/', 1) <> split_part(v.path, '/', 1) or v_path !~ '^[^/]+/[A-Za-z0-9._-]+\.webp$' then
    raise exception 'previa_invalida';
  end if;
  -- Sem auditoria: é dado derivado (a imagem é a mesma), não uma decisão de ninguém.
  update public.arquivos set previa_path = v_path where id = p_arquivo;
end $function$;
revoke all on function public.arquivo_definir_previa(text, uuid, text) from public, anon, authenticated;
grant execute on function public.arquivo_definir_previa(text, uuid, text) to anon, authenticated;

create or replace function public.get_arquivos_previas(p_secret text)
 returns table(id uuid, previa_path text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select a.id, a.previa_path from public.arquivos a where public.pode(p_secret, 'dado.ler');
$function$;
revoke all on function public.get_arquivos_previas(text) from public, anon, authenticated;
grant execute on function public.get_arquivos_previas(text) to anon, authenticated;

alter policy arquivos_marca_le on storage.objects using (
  bucket_id = 'arquivos' and public.conta_ativa() and exists (
    select 1 from public.arquivos a
     where (a.path = objects.name or a.previa_path = objects.name)
       and a.publicado_em is not null and not a.arquivado
       and (a.escopo = 'geral' or exists (
             select 1 from public.participacoes pa join public.participantes p on p.id = pa.participante_id
              where pa.id = a.participacao_id and p.user_id = auth.uid()))));
