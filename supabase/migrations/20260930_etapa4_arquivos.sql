-- =============================================================================
-- Reestruturação do painel · Etapa 4 — arquivos com categoria, editar,
-- substituir e arquivar (docs/superpowers/specs/2026-09-29-painel-reestruturacao-design.md).
--
-- Até aqui um arquivo só nascia (publicar_arquivo) e nunca mudava: não havia
-- como corrigir o nome, trocar por uma versão nova nem tirar do ar. E a marca
-- via uma lista corrida, sem saber o que era dela e o que era de todas.
--
-- · categoria: combo (fotos oficiais do combo) · identidade (marca do
--   festival) · guia · documento · outro. A marca vê os downloads agrupados.
-- · Geral × individual já existia (escopo 'geral' | 'marca'); só passa a ser
--   mostrado.
-- · Arquivar tira do painel da marca e guarda (decisão do Wilker: nada se
--   exclui). Substituir troca o caminho e sobe a versão.
-- =============================================================================

alter table public.arquivos
  add column if not exists categoria text not null default 'documento';
alter table public.arquivos drop constraint if exists arquivos_categoria_check;
alter table public.arquivos add constraint arquivos_categoria_check
  check (categoria in ('combo', 'identidade', 'guia', 'documento', 'outro'));
update public.arquivos set categoria = 'guia' where categoria = 'documento' and nome ilike '%guia%';

-- ── Lista da organização (inclui arquivados; a tela separa) ────────────────
drop function if exists public.get_arquivos_admin(text);
create or replace function public.get_arquivos_admin(p_secret text)
returns table (id uuid, escopo text, nome text, descricao text, versao text, path text,
  publicado_em timestamptz, arquivado boolean, exige_leitura boolean, marca text, leituras bigint,
  categoria text, mime text, tamanho bigint, participacao_id uuid, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.escopo, a.nome, a.descricao, a.versao, a.path,
         a.publicado_em, a.arquivado, a.exige_leitura,
         p.nome_marca,
         (select count(*) from public.arquivo_leitura l where l.arquivo_id = a.id),
         a.categoria, a.mime, a.tamanho, a.participacao_id, a.created_at
    from public.arquivos a
    left join public.participacoes pa on pa.id = a.participacao_id
    left join public.participantes p  on p.id = pa.participante_id
   where public.pode(p_secret, 'dado.ler')
   order by a.publicado_em desc nulls first;
$$;
revoke all on function public.get_arquivos_admin(text) from public, anon, authenticated;
grant execute on function public.get_arquivos_admin(text) to anon, authenticated;

-- ── Publicar ganha categoria (os parâmetros antigos seguem valendo) ────────
drop function if exists public.publicar_arquivo(text, text, text, text, uuid, text, text, text, bigint, boolean);
create or replace function public.publicar_arquivo(p_secret text, p_nome text, p_path text,
  p_escopo text default 'geral', p_participacao uuid default null, p_descricao text default null,
  p_versao text default null, p_mime text default null, p_tamanho bigint default null,
  p_exige_leitura boolean default false, p_categoria text default 'documento')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  if coalesce(trim(p_nome),'') = '' or coalesce(trim(p_path),'') = '' then
    raise exception 'nome_e_path_obrigatorios';
  end if;
  insert into public.arquivos
    (escopo, participacao_id, nome, descricao, versao, path, mime, tamanho,
     exige_leitura, publicado_em, criado_por, categoria)
  values (p_escopo, p_participacao, trim(p_nome), p_descricao, p_versao, trim(p_path),
          p_mime, p_tamanho, p_exige_leitura, now(), auth.uid(), coalesce(nullif(p_categoria, ''), 'documento'))
  returning id into v_id;
  insert into public.auditoria (ator_user_id, acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values (auth.uid(), 'publicar_arquivo', 'arquivos', v_id::text, p_participacao,
          jsonb_build_object('escopo', p_escopo, 'nome', trim(p_nome), 'categoria', p_categoria));
  return v_id;
end $$;

-- ── Editar nome, descrição, categoria, versão, leitura obrigatória ─────────
create or replace function public.atualizar_arquivo(p_secret text, p_id uuid, p_dados jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v public.arquivos%rowtype;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  select * into v from public.arquivos where id = p_id for update;
  if not found then raise exception 'arquivo_nao_encontrado'; end if;
  if p_dados ? 'nome' and coalesce(btrim(p_dados ->> 'nome'), '') = '' then raise exception 'nome_obrigatorio'; end if;
  update public.arquivos set
    nome = case when p_dados ? 'nome' then btrim(p_dados ->> 'nome') else nome end,
    descricao = case when p_dados ? 'descricao' then nullif(btrim(p_dados ->> 'descricao'), '') else descricao end,
    categoria = case when p_dados ? 'categoria' then p_dados ->> 'categoria' else categoria end,
    versao = case when p_dados ? 'versao' then nullif(btrim(p_dados ->> 'versao'), '') else versao end,
    exige_leitura = case when p_dados ? 'exige_leitura' then coalesce((p_dados ->> 'exige_leitura')::boolean, false) else exige_leitura end
   where id = p_id;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('arquivo.editado', 'arquivos', p_id::text, v.participacao_id,
          jsonb_build_object('nome', coalesce(p_dados ->> 'nome', v.nome), 'campos', (select jsonb_agg(k) from jsonb_object_keys(p_dados) k)));
end $$;

-- ── Substituir o arquivo (o upload já foi feito; aqui troca o caminho) ────
create or replace function public.substituir_arquivo(p_secret text, p_id uuid, p_path text,
  p_mime text default null, p_tamanho bigint default null, p_versao text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v public.arquivos%rowtype; v_nova text;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  select * into v from public.arquivos where id = p_id for update;
  if not found then raise exception 'arquivo_nao_encontrado'; end if;
  if coalesce(btrim(p_path), '') = '' then raise exception 'path_obrigatorio'; end if;
  -- O arquivo tem que ficar na MESMA pasta (geral/ ou a da participação):
  -- é a pasta que decide quem lê (policy do Storage).
  if split_part(btrim(p_path), '/', 1) <> split_part(v.path, '/', 1) then raise exception 'pasta_diferente'; end if;
  v_nova := coalesce(nullif(btrim(p_versao), ''),
                     case when v.versao ~ '^\d+$' then (v.versao::int + 1)::text else '2' end);
  update public.arquivos set path = btrim(p_path), mime = p_mime, tamanho = p_tamanho, versao = v_nova,
         publicado_em = now()
   where id = p_id;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values ('arquivo.substituido', 'arquivos', p_id::text, v.participacao_id,
          jsonb_build_object('nome', v.nome, 'versao_de', v.versao, 'versao_para', v_nova));
end $$;

-- ── Arquivar / restaurar ───────────────────────────────────────────────────
create or replace function public.arquivar_arquivo(p_secret text, p_id uuid, p_arquivar boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v public.arquivos%rowtype;
begin
  if not public.pode(p_secret, 'producao.gerir') then raise exception 'nao_autorizado'; end if;
  update public.arquivos set arquivado = coalesce(p_arquivar, true) where id = p_id returning * into v;
  if not found then raise exception 'arquivo_nao_encontrado'; end if;
  insert into public.auditoria (acao, alvo_tabela, alvo_id, participacao_id, detalhe)
  values (case when p_arquivar then 'arquivo.arquivado' else 'arquivo.restaurado' end, 'arquivos', p_id::text,
          v.participacao_id, jsonb_build_object('nome', v.nome));
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'publicar_arquivo(text, text, text, text, uuid, text, text, text, bigint, boolean, text)',
    'atualizar_arquivo(text, uuid, jsonb)',
    'substituir_arquivo(text, uuid, text, text, bigint, text)',
    'arquivar_arquivo(text, uuid, boolean)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
