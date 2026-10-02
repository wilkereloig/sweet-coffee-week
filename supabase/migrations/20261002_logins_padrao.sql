-- Logins padronizados (02/10/2026, pedido do Wilker). Só o LOGIN muda; as
-- senhas ficam como estão.
--
-- Marca: o nome do estabelecimento sem hífen nem nada que não seja letra ou
-- número (caffe-basilico-s → caffebasilicos). É a mesma regra nova de
-- slugificar() em src/lib/marcaAccess.js e na Edge Function
-- criar-acesso-marca; o login digitado passa pela mesma regra, então
-- "Caffè Basilico's" e "caffebasilicos" entram na mesma conta.
--
-- Equipe: nome e sobrenome juntos + ponto + sigla da função
-- (wilkereloi.adm), no domínio interno equipe.sweetcoffeeweek.com.br — a regra
-- de usuarioDaEquipe() em src/lib/orgAccess.js. O e-mail real de quem entrava
-- por e-mail fica guardado em raw_user_meta_data.email_anterior.
--
-- A acentuação é tirada por translate() (o banco não tem unaccent): cobre o
-- que o português usa, o mesmo que o NFD do navegador tira.
-- Para antes de qualquer escrita se dois logins novos colidirem.

do $$
declare
  v_colisoes int;
begin
  -- ── Marcas ────────────────────────────────────────────────────────────────
  select count(*) into v_colisoes from (
    select regexp_replace(slug, '[^a-z0-9]', '', 'g') as novo from public.participantes
    group by 1 having count(*) > 1) x;
  if v_colisoes > 0 then raise exception 'logins de marca colidem: %', v_colisoes; end if;

  update auth.users u set
    email = n.novo || '@marcas.sweetcoffeeweek.com.br',
    raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('login', n.novo),
    updated_at = now()
  from (select user_id, regexp_replace(slug, '[^a-z0-9]', '', 'g') as novo
          from public.participantes where user_id is not null) n
  where u.id = n.user_id and u.email <> n.novo || '@marcas.sweetcoffeeweek.com.br';

  update public.participantes set slug = regexp_replace(slug, '[^a-z0-9]', '', 'g')
   where slug ~ '[^a-z0-9]';

  -- ── Equipe ────────────────────────────────────────────────────────────────
  create temp table _equipe on commit drop as
  select p.user_id, u.email as antigo,
         left(regexp_replace(lower(translate(p.nome,
              'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
              'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')), '[^a-z0-9]', '', 'g'),
              30 - 1 - length(s.sigla)) || '.' || s.sigla as novo
    from public.perfis p
    join auth.users u on u.id = p.user_id
    join (values ('administrador','adm'),('curadoria','cur'),('producao','prod'),('comercial','com'),('consulta','cons'))
         as s(funcao, sigla) on s.funcao = p.funcao
   where p.papel = 'organizacao' and coalesce(btrim(p.nome), '') <> '';

  select count(*) into v_colisoes from (select novo from _equipe group by 1 having count(*) > 1) x;
  if v_colisoes > 0 then raise exception 'logins da equipe colidem: %', v_colisoes; end if;

  update auth.users u set
    email = e.novo || '@equipe.sweetcoffeeweek.com.br',
    raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
      || case when e.antigo not like '%@equipe.sweetcoffeeweek.com.br'
              then jsonb_build_object('email_anterior', e.antigo) else '{}'::jsonb end,
    updated_at = now()
  from _equipe e
  where u.id = e.user_id and u.email <> e.novo || '@equipe.sweetcoffeeweek.com.br';

  -- ── Identidade de e-mail do Auth acompanha (provider_id é o id do usuário) ─
  update auth.identities i set
    identity_data = i.identity_data || jsonb_build_object('email', u.email),
    updated_at = now()
  from auth.users u
  where i.user_id = u.id and i.provider = 'email'
    and i.identity_data ->> 'email' is distinct from u.email;
end $$;
