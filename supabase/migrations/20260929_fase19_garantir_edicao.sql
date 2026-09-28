-- =============================================================================
-- Fase 19 — compatibilidade com o painel publicado (master)
--
-- A Fase 3 ligou `edicao_codigo` a `edicoes` por chave estrangeira. O painel
-- publicado define a edição atual e abre vagas/participações digitando um
-- código ("2027.1"); sem esta peça, um código novo daria erro de FK. O gatilho
-- cria a edição que ainda não existe — com nome provisório, para a
-- organização completar em Edição — antes da gravação. Um lugar só para as
-- quatro tabelas que apontam para `edicoes`.
-- Código fora do padrão AAAA ou AAAA.N não é criado: a FK recusa, de propósito.
-- =============================================================================
create or replace function public.garantir_edicao()
returns trigger language plpgsql security definer set search_path = public as $$
-- Por jsonb: admin_config não tem edicao_codigo, e ler campo inexistente de NEW quebra.
declare v text := to_jsonb(new) ->> case tg_table_name when 'admin_config' then 'edicao_atual' else 'edicao_codigo' end;
begin
  if v is not null and v ~ '^\d{4}(\.\d)?$' and not exists (select 1 from public.edicoes where codigo = v) then
    insert into public.edicoes (codigo, ordem, nome, classificacao, fonte)
    values (v, (select coalesce(max(ordem), 0) + 1 from public.edicoes), 'Sweet & Coffee Week ' || v,
            'atual_confirmado', 'Criada ao ser usada pela primeira vez · ' || public.ator_rotulo_atual())
    on conflict (codigo) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.garantir_edicao() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['participacoes','sessoes_fotos','solicitacoes','admin_config'] loop
    execute format('drop trigger if exists garantir_edicao on public.%I', t);
    execute format('create trigger garantir_edicao before insert or update on public.%I
                    for each row execute function public.garantir_edicao()', t);
  end loop;
end $$;
