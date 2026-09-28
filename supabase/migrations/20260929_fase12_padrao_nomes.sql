-- =============================================================================
-- Padrão do nome do participante (pedido do Wilke, 29/09/2026):
-- "sempre padronize os nomes dos participantes, que devem ser o nome do
--  empreendimento. padronize a forma, gramática correta."
--
-- Regra, nesta ordem:
--   1. O nome é o do EMPREENDIMENTO (nome fantasia). Nunca o nome de uma
--      pessoa, nunca razão social (LTDA, ME, MEI, EIRELI saem).
--   2. Se o nome (ou um nome que a própria organização informou para a
--      marca) é a MESMA grafia de uma marca do acervo — mesmas letras, só
--      muda caixa, acento, espaço ou pontuação — vale a grafia canônica do
--      acervo, que é a do site (CLAUDE.md §9.3: "Paneer" → "Paneer Pâtisserie").
--      Isso é grafia, não vínculo: a participação anterior continua exigindo
--      confirmação humana (participante_vinculos).
--   3. Senão, grafia correta: maiúscula de título, conectivos em minúscula
--      (de, da, do, e…), acentos das palavras de ofício (Café, Bistrô,
--      Pâtisserie, Pão, Açaí), apóstrofo reto, espaço simples. Estilo próprio
--      da marca (Food&Coffee, McDonald's) e sigla num nome que já tem
--      minúsculas ficam como estão.
--   4. Marca que JÁ TEM CONTA não muda de nome por aqui se a mudança for além
--      da formatação: ela entra no painel digitando o nome, e o login é o slug
--      gravado na criação da conta.
--
-- O valor original nunca some: vira alias ("Nome anterior"), fica em
-- dados_originais e em participacoes.snapshot.nome_informado; a troca entra na
-- auditoria com de/para e a regra usada.
-- =============================================================================

create or replace function public.capitalizar_palavra(p text)
returns text language sql immutable parallel safe set search_path = pg_catalog, public as $$
  -- "d'água" → "D'Água"; "salgados-doces" → "Salgados-Doces"
  select string_agg(
           case when parte ~ '^[dl]''.' then upper(substr(parte, 1, 1)) || '''' || upper(substr(parte, 3, 1)) || substr(parte, 4)
                else upper(substr(parte, 1, 1)) || substr(parte, 2) end,
           '-' order by n)
    from unnest(string_to_array(p, '-')) with ordinality as t(parte, n)
$$;

create or replace function public.formatar_nome_empreendimento(p text)
returns text language plpgsql immutable parallel safe set search_path = pg_catalog, public as $$
declare
  s text; w text; base text; i int := 0; out text[] := '{}'; tem_minuscula boolean;
  conectivos text[] := array['de','da','do','das','dos','e','di','del','du','em','na','no','nas','nos',
                             'a','o','as','os','com','para','por','à','ao','aos'];
begin
  if p is null then return null; end if;
  s := regexp_replace(btrim(translate(p, '’‘`´', '''''''''')), '\s+', ' ', 'g');
  if s = '' then return null; end if;
  tem_minuscula := s ~ '[a-zà-ÿ]';
  foreach w in array string_to_array(s, ' ') loop
    i := i + 1;
    base := lower(w);
    if i > 1 and base = any(conectivos) then
      out := out || base;
    elsif w ~ '\d' or w !~ '[[:alpha:]]' then
      out := out || w;
    elsif tem_minuscula and w = upper(w) and length(w) <= 4 then
      out := out || w;                        -- sigla/estilo num nome que já tem minúsculas (WOW, SCW)
    elsif w = lower(w) or w = upper(w) then
      base := coalesce((select v from (values
                ('cafe', 'café'), ('cafes', 'cafés'), ('bistro', 'bistrô'), ('patisserie', 'pâtisserie'),
                ('pao', 'pão'), ('paes', 'pães'), ('acai', 'açaí'), ('pastelaria', 'pastelaria')) d(k, v)
               where k = base), base);
      out := out || public.capitalizar_palavra(base);
    else
      out := out || w;                        -- estilo misto da própria marca
    end if;
  end loop;
  return array_to_string(out, ' ');
end $$;

create or replace function public.sem_sufixo_societario(p text)
returns text language sql immutable parallel safe set search_path = pg_catalog, public as $$
  select btrim(regexp_replace(coalesce(p, ''), '[\s,.-]+(ltda|me|mei|eireli|epp|s\s*/?\s*a)\.?\s*$', '', 'i'))
$$;

revoke all on function public.capitalizar_palavra(text), public.formatar_nome_empreendimento(text),
  public.sem_sufixo_societario(text) from public, anon;

-- O nome que a regra propõe (não grava).
create or replace function public.padrao_nome_participante(p_participante uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.participantes%rowtype; nomes text[]; n text; canon text; eh_pessoa boolean;
begin
  select * into p from public.participantes where id = p_participante;
  if not found then return null; end if;
  -- Regra 1: nome fantasia igual ao nome da pessoa de contato não é nome de empreendimento.
  eh_pessoa := public.normalizar_nome(p.nome_marca) = public.normalizar_nome(p.responsavel);
  nomes := (case when eh_pessoa then '{}'::text[] else array[public.sem_sufixo_societario(p.nome_marca)] end)
        || coalesce((select array_agg(public.sem_sufixo_societario(a.alias) order by a.created_at, a.alias)
                       from public.participante_aliases a
                      where a.participante_id = p.id and a.fonte like 'Organização%'), '{}');
  -- Regra 2: mesma grafia de uma marca do acervo → a grafia do acervo.
  foreach n in array nomes loop
    continue when coalesce(public.imp_compacto(n), '') = '';
    select m.nome into canon
      from public.historico_aliases h join public.historico_marcas m on m.chave = h.chave
     where public.imp_compacto(h.alias) = public.imp_compacto(n)
     order by m.nome limit 1;
    if canon is not null then
      return jsonb_build_object('nome', canon, 'regra', 'acervo', 'anterior', p.nome_marca);
    end if;
  end loop;
  if coalesce(array_length(nomes, 1), 0) = 0 then
    return jsonb_build_object('nome', p.nome_marca, 'regra', 'revisar', 'anterior', p.nome_marca,
                              'motivo', 'o nome é de uma pessoa e não há outro nome do empreendimento');
  end if;
  -- Regra 3: grafia correta do nome do empreendimento.
  return jsonb_build_object('nome', public.formatar_nome_empreendimento(nomes[1]),
                            'regra', case when eh_pessoa then 'nome_informado_pela_organizacao' else 'grafia' end,
                            'anterior', p.nome_marca);
end $$;

-- Aplica a regra num participante (interna: quem chama já foi autorizado).
create or replace function public.aplicar_padrao_nome(p_participante uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; p public.participantes%rowtype;
begin
  r := public.padrao_nome_participante(p_participante);
  select * into p from public.participantes where id = p_participante;
  if r is null or r ->> 'regra' = 'revisar' or coalesce(r ->> 'nome', '') = '' or r ->> 'nome' = p.nome_marca then
    return r || jsonb_build_object('aplicado', false);
  end if;
  -- Regra 4: marca com conta entra digitando o nome — só formatação passa.
  if p.user_id is not null
     and public.imp_compacto(r ->> 'nome') is distinct from public.imp_compacto(p.nome_marca) then
    return r || jsonb_build_object('aplicado', false, 'motivo', 'a marca já tem conta e entra pelo nome atual');
  end if;
  update public.participantes set nome_marca = r ->> 'nome' where id = p_participante;
  insert into public.participante_aliases (participante_id, alias, fonte)
  values (p_participante, p.nome_marca, 'Nome anterior (padronização)')
  on conflict do nothing;
  update public.participacoes
     set snapshot = snapshot || jsonb_build_object('nome_marca', r ->> 'nome',
                      'nome_informado', coalesce(snapshot ->> 'nome_informado', p.nome_marca))
   where participante_id = p_participante and snapshot is not null;
  update public.revisao_pendencias
     set status = 'resolvida', resolucao = 'Nome padronizado: ' || (r ->> 'nome') || ' (regra: ' || (r ->> 'regra') || ')',
         resolvido_por = auth.uid(), resolvido_rotulo = public.ator_rotulo_atual(), resolvido_em = now()
   where participante_id = p_participante and status = 'aberta' and campo = 'nome_marca';
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participante_id, detalhe)
  values ('cadastro.nome_padronizado', 'participantes', p_participante::text, p_participante,
          jsonb_build_object('de', p.nome_marca, 'para', r ->> 'nome', 'regra', r ->> 'regra'));
  return r || jsonb_build_object('aplicado', true);
end $$;
revoke all on function public.padrao_nome_participante(uuid), public.aplicar_padrao_nome(uuid)
  from public, anon, authenticated;

-- Porta do painel: ver o que a regra propõe (dado.ler) ou aplicar (curadoria.decidir).
create or replace function public.padronizar_nomes(p_secret text, p_aplicar boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; lista jsonb := '[]'::jsonb; pid uuid;
begin
  if not public.pode(p_secret, case when p_aplicar then 'curadoria.decidir' else 'dado.ler' end) then
    raise exception 'nao_autorizado';
  end if;
  for pid in select id from public.participantes order by nome_marca loop
    r := case when p_aplicar then public.aplicar_padrao_nome(pid) else public.padrao_nome_participante(pid) end;
    if r is not null and (r ->> 'nome' is distinct from r ->> 'anterior' or r ->> 'regra' = 'revisar') then
      lista := lista || jsonb_build_array(r || jsonb_build_object('participante_id', pid));
    end if;
  end loop;
  return lista;
end $$;
revoke all on function public.padronizar_nomes(text, boolean) from public;
grant execute on function public.padronizar_nomes(text, boolean) to anon, authenticated;

-- "Sempre": toda gravação do nome passa pela grafia (regra 3), venha da
-- importação, do cadastro manual, da candidatura ou da própria marca. Só
-- formatação aqui — não troca o nome, então nunca muda o login.
create or replace function public.participantes_formatar_nome()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.nome_marca is distinct from old.nome_marca then
    new.nome_marca := coalesce(public.formatar_nome_empreendimento(new.nome_marca), new.nome_marca);
  end if;
  return new;
end $$;
revoke all on function public.participantes_formatar_nome() from public, anon, authenticated;
drop trigger if exists participantes_formatar_nome on public.participantes;
create trigger participantes_formatar_nome before insert or update of nome_marca on public.participantes
  for each row execute function public.participantes_formatar_nome();
