-- Reverte supabase/migrations/20270131_mapa_chaves_antigas.sql: restaura mapa_hash, mapa_codigo_validar e mapa_nova_chave EXATAMENTE como estavam (a
-- migration tirou uma cópia das definições em public.mapa_funcoes_20270131) e apaga as duas tabelas. Depois disto recuperar volta a derrubar a chave dos outros
-- aparelhos, e as chaves antigas guardadas deixam de valer.
-- Rode inteiro, numa transação só.

do $$
declare d text;
begin
  if (select count(*) from public.mapa_funcoes_20270131) < 3 then
    raise exception 'copia_das_funcoes_incompleta: nada foi revertido';
  end if;
  -- mapa_hash primeiro (a versão nova depende da tabela que vai ser apagada); depois as outras duas
  for d in select definicao from public.mapa_funcoes_20270131 order by case nome when 'mapa_hash' then 0 else 1 end, nome loop
    execute d;
  end loop;
end $$;

drop table if exists public.mapa_chaves_antigas;
drop table if exists public.mapa_funcoes_20270131;
