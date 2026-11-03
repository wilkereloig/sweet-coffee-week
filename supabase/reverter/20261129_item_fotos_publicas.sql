-- Reverte 20261129_item_fotos_publicas: tira `fotos` da projeção do item e a coluna `rotulo` das mídias.
do $patch$
declare f text; ini int; fim int;
  marca text := $a$'fotos', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('path', m.path$a$;
  depois text := $a$'foto', (select jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura)$a$;
begin
  f := pg_get_functiondef('public.montar_publico(uuid,text)'::regprocedure);
  ini := strpos(f, marca);
  if ini = 0 then return; end if;
  fim := strpos(substr(f, ini), depois);
  if fim = 0 then raise exception 'reverter item_fotos_publicas: fim do trecho não encontrado'; end if;
  execute substr(f, 1, ini - 1) || substr(f, ini + fim - 1);
end $patch$;

alter table public.midias_participacao drop column if exists rotulo;
