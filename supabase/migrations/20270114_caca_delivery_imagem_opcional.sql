-- Permite que a organização decida pedidos destinados a ela mesmo sem imagem.
-- Atualiza as definições existentes, abortando caso tenham mudado desde a revisão.
do $migration$
declare
  decisao text := pg_get_functiondef('public.caca_excecao_decidir(text,uuid,text,text)'::regprocedure);
  lista text := pg_get_functiondef('public.caca_excecao_listar(text,text,text)'::regprocedure);
  antigo text := $old$if v_delivery and e.via <> 'imagem' then raise exception 'aguarda_casa'; end if;$old$;
  prova text := $old$if v_delivery and v_dec = 'aprovar' and (e.imagem_path is null or e.imagem_removida_em is not null) then raise exception 'sem_imagem'; end if;$old$;
  condicao text := $old$not (e.motivo = 'delivery' and e.via = 'casa')$old$;
  pend_delivery text := $old$e.motivo = 'delivery' and e.via = 'imagem'$old$;
  flag_casa text := $old$then e.via = 'casa' end$old$;
begin
  if position(antigo in decisao) = 0 or position(prova in decisao) = 0
     or position(condicao in lista) = 0 or position(pend_delivery in lista) = 0 or position(flag_casa in lista) = 0 then
    raise exception 'funções de delivery divergiram; revisão necessária';
  end if;
  decisao := replace(decisao, antigo, $new$if v_delivery and e.via <> 'imagem' and coalesce(e.delivery_via_pretendida, 'casa') <> 'imagem' then raise exception 'aguarda_casa'; end if;$new$);
  decisao := replace(decisao, prova, '-- Imagem é opcional para pedidos encaminhados à organização.');
  lista := replace(lista, condicao, $new$not (e.motivo = 'delivery' and e.via = 'casa' and coalesce(e.delivery_via_pretendida, 'casa') = 'casa')$new$);
  lista := replace(lista, pend_delivery, $new$e.motivo = 'delivery' and (e.via = 'imagem' or e.delivery_via_pretendida = 'imagem')$new$);
  lista := replace(lista, flag_casa, $new$then e.via = 'casa' and coalesce(e.delivery_via_pretendida, 'casa') = 'casa' end$new$);
  execute decisao;
  execute lista;
end
$migration$;
