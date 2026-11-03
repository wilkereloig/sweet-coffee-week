-- 20261129 · Galeria por item na projeção pública (docs/cartoon-2026-2/13-lista-para-publicar.md, P3 e B2).
--
-- Até aqui montar_publico devolvia UMA foto por item (`foto`, a primeira aprovada). O site agora mostra a
-- galeria do item (principal + detalhe partido + outras opções): a projeção passa a levar também `fotos`, todas
-- as aprovadas do item em ordem, cada uma com `rotulo` ("Detalhe", "Outra opção") — coluna nova, opcional.
-- `foto` continua (painel, Social, Word e o site antigo leem dela).
--
-- Mesmo padrão de 20261123_trocas_completas: lê a definição em vigor e troca só o trecho, idempotente.
-- Reverter: supabase/reverter/20261129_item_fotos_publicas.sql.

alter table public.midias_participacao add column if not exists rotulo text
  check (rotulo is null or char_length(rotulo) <= 40);

do $patch$
declare f text;
  antes text := $a$'foto', (select jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura)$a$;
begin
  f := pg_get_functiondef('public.montar_publico(uuid,text)'::regprocedure);
  if strpos(f, $a$'fotos', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('path', m.path$a$) > 0 then return; end if;
  if strpos(f, antes) = 0 then raise exception 'item_fotos_publicas: trecho da foto do item em montar_publico não encontrado'; end if;
  execute replace(f, antes, $a$'fotos', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('path', m.path, 'alt', m.alt, 'largura', m.largura, 'altura', m.altura, 'rotulo', m.rotulo)) order by m.ordem)
                         from public.midias_participacao m
                        where m.item_id = i.id and m.papel = 'item' and m.estado = 'aprovada'),
             $a$ || antes);
end $patch$;
