-- Cobrar pendência e avisar ajuste ao participante (26/10/2026, pedido do Wilker).
-- A organização escolhe na ficha (ou no lote da lista de Marcas) as pendências de uma marca e manda UM aviso:
-- sino + push no painel da marca, com o toque levando direto ao campo, e o mesmo texto na conversa
-- (fica registrado). Também serve para "fizemos isto por você" depois que a organização resolve algo no lugar
-- da marca (nome do combo, localização no mapa) — tipo `ajuste`.
-- A mensagem entra com `scw.silencioso` para não gerar o aviso genérico "Nova mensagem da organização" (que
-- levaria à conversa, não ao campo); o aviso é o desta função, com o link certo.
-- Reversão: supabase/reverter/20261114_avisar_marca_pendencias.sql

create or replace function public.org_avisar_marca(p_secret text, p_participante uuid, p_titulo text, p_texto text,
                                                    p_link text default null, p_tipo text default 'pendencia')
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_texto text := btrim(coalesce(p_texto, ''));
  v_link text := nullif(btrim(coalesce(p_link, '')), '');
  v_antes text := current_setting('scw.silencioso', true);
begin
  if not public.pode(p_secret, 'mensagem.enviar') then raise exception 'nao_autorizado'; end if;
  if p_tipo not in ('pendencia', 'ajuste') then raise exception 'tipo_invalido'; end if;
  if v_titulo = '' or char_length(v_titulo) > 120 then raise exception 'titulo_invalido'; end if;
  if v_texto = '' then raise exception 'mensagem_vazia'; end if;
  if char_length(v_texto) > 4000 then raise exception 'mensagem_longa'; end if;
  -- Mesmo formato que o painel da marca aceita no ?ir= do push (lib/central.js · lerIrDaUrl).
  if v_link is not null and v_link !~ '^[a-z_]+(/[A-Za-z0-9_-]+){0,2}$' then raise exception 'link_invalido'; end if;
  if not exists (select 1 from public.participantes where id = p_participante) then raise exception 'marca_nao_encontrada'; end if;

  perform set_config('scw.silencioso', 'on', true);
  insert into public.mensagens (participante_id, de, corpo)
  values (p_participante, 'organizacao', v_texto) returning id into v_id;
  perform set_config('scw.silencioso', coalesce(v_antes, ''), true);

  perform public.notificar('marca', p_participante, p_tipo, v_titulo, v_texto, coalesce(v_link, 'mensagens'));

  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values (case p_tipo when 'ajuste' then 'ajuste.avisado' else 'pendencia.cobrada' end, 'mensagens', v_id::text, p_participante,
          jsonb_build_object('titulo', v_titulo, 'link', v_link, 'trecho', left(v_texto, 200)));
  return v_id;
end $function$;
revoke all on function public.org_avisar_marca(text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.org_avisar_marca(text, uuid, text, text, text, text) to anon, authenticated;
