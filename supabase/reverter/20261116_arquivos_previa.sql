-- Reversão de 20261116_arquivos_previa.sql: a marca volta a ler só o próprio arquivo; some a prévia (os .webp ficam
-- no bucket, sem ninguém apontar para eles).
alter policy arquivos_marca_le on storage.objects using (
  bucket_id = 'arquivos' and public.conta_ativa() and exists (
    select 1 from public.arquivos a
     where a.path = objects.name
       and a.publicado_em is not null and not a.arquivado
       and (a.escopo = 'geral' or exists (
             select 1 from public.participacoes pa join public.participantes p on p.id = pa.participante_id
              where pa.id = a.participacao_id and p.user_id = auth.uid()))));
drop function if exists public.get_arquivos_previas(text);
drop function if exists public.arquivo_definir_previa(text, uuid, text);
drop trigger if exists arquivos_previa_do_arquivo on public.arquivos;
drop function if exists public.arquivos_previa_do_arquivo();
alter table public.arquivos drop constraint if exists arquivos_previa_path_check;
alter table public.arquivos drop column if exists previa_path;
