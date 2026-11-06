-- Lista de casas da edição para o painel escolher a casa de um imprevisto confirmado. Só id e nome (dado público do festival).
-- reverter: drop function if exists public.caca_avisos_casas(text, text);
create or replace function public.caca_avisos_casas(p_secret text, p_edicao text)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.pode(p_secret, 'dado.ler') then raise exception 'nao_autorizado'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'nome', x.nome) order by x.nome), '[]'::jsonb)
            from (select pa.id, pt.nome from public.participacoes pa join public.participantes pt on pt.id = pa.participante_id
                   where pa.edicao_codigo = p_edicao and pa.status_cadastro <> 'encerrado') x);
end $$;
revoke all on function public.caca_avisos_casas(text, text) from public, anon, authenticated;
grant execute on function public.caca_avisos_casas(text, text) to anon, authenticated;
