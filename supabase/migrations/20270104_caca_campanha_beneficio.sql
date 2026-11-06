-- Mantém as regras da campanha; destaca o prêmio sem prometer seleção.
do $$
declare v_def text; v_nova text;
begin
  select pg_get_functiondef('public.caca_campanha_gerar(timestamptz)'::regprocedure) into v_def;
  v_nova := replace(v_def, '''Último dia: Ter com quem contar''', '''Último dia para concorrer a 2 vouchers''');
  v_nova := replace(v_nova, '''Ter com quem contar''', '''Concorra a 2 vouchers para o festival''');
  if v_nova = v_def or position('Último dia para concorrer a 2 vouchers' in v_nova) = 0
     or position('Concorra a 2 vouchers para o festival' in v_nova) = 0 then
    raise exception 'Texto esperado da campanha não encontrado; revisão necessária';
  end if;
  execute v_nova;
end $$;
