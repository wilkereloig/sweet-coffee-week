-- Miniatura da logo do participante (26/10/2026, pedido do Wilker: "onde aparece a marca tem que acompanhar a logo").
-- A logo original pesa de 200 KB a 4 MB; avatar de 20–48 px no sino, na Atividade e nas listas não precisa disso.
-- `logos_marca.mini` guarda um WEBP de 96 × 96 px (recorte central, como o `cover` de .ui-logo) em data URI:
-- ~1 KB por logo, todas numa leitura só (`get_logos_mini`), sem pedido extra ao Storage.
-- Quem gera é o painel da equipe (navegador), uma vez por logo: `logo_definir_mini` só grava onde ainda está vazio,
-- então duas abas gerando ao mesmo tempo não brigam e ninguém troca a miniatura de uma logo que já tem.
-- Logo nova = linha nova em logos_marca = miniatura vazia = gerada na próxima abertura do painel.
-- Reversão: supabase/reverter/20261113_logos_mini.sql

alter table public.logos_marca add column if not exists mini text;
alter table public.logos_marca drop constraint if exists logos_marca_mini_check;
alter table public.logos_marca add constraint logos_marca_mini_check
  check (mini is null or (mini ~ '^data:image/webp;base64,[A-Za-z0-9+/]+=*$' and length(mini) <= 12000));

-- Logo oficial de cada participante com a miniatura. `user_id` é a conta da marca: o sino e a Atividade só têm o
-- autor (ator_user_id), não o participante.
create or replace function public.get_logos_mini(p_secret text)
 returns table(participante_id uuid, user_id uuid, logo_id uuid, path text, mini text)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
begin
  if not public.membro_org(p_secret) then return; end if;
  return query
    select p.id, p.user_id, l.id, l.path, l.mini
      from public.participantes p
      join public.logos_marca l on l.id = p.logo_id;
end $function$;
revoke all on function public.get_logos_mini(text) from public, anon, authenticated;
grant execute on function public.get_logos_mini(text) to anon, authenticated;

create or replace function public.logo_definir_mini(p_secret text, p_logo uuid, p_mini text)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.membro_org(p_secret) then raise exception 'nao_autorizado' using errcode = '42501'; end if;
  if p_mini is null or p_mini !~ '^data:image/webp;base64,[A-Za-z0-9+/]+=*$' or length(p_mini) > 12000 then
    raise exception 'mini_invalida';
  end if;
  update public.logos_marca set mini = p_mini where id = p_logo and mini is null;
  return found;
end $function$;
revoke all on function public.logo_definir_mini(text, uuid, text) from public, anon, authenticated;
grant execute on function public.logo_definir_mini(text, uuid, text) to anon, authenticated;
