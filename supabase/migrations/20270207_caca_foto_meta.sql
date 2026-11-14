-- 14/11/2026 (pedido do Wilker): guardar os metadados da foto ORIGINAL dos pedidos de visita anterior e de delivery,
-- para a organização pesar a confiança de cada foto na conferência final (não decide nada sozinho).
-- O site reduz a foto no aparelho e regrava em WebP, o que apaga o EXIF; por isso o navegador lê os metadados ANTES de reduzir
-- e manda aqui depois que o anexo deu certo. Conteúdo (montado em src/edicao/caca/delivery/imagem.js): tipo, bytes, nome do
-- arquivo, data de modificação, dimensões originais e, se JPEG, marca/modelo/software/data da câmera e se havia GPS
-- (só sim/não: a localização não é guardada, como diz o regulamento). É informação declarada pelo aparelho: pista, não prova.
-- Grava uma vez só (não sobrescreve). Reverter: supabase/reverter/20270207_caca_foto_meta.sql
alter table public.caca_carimbo_excecao add column if not exists imagem_meta jsonb;

create or replace function public.caca_foto_meta(p_chave text, p_id uuid, p_meta jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare m public.mapas_lover%rowtype;
begin
  if p_meta is null or jsonb_typeof(p_meta) <> 'object' or octet_length(p_meta::text) > 2048 then
    return jsonb_build_object('ok', false, 'motivo', 'meta_invalida');
  end if;
  select * into m from public.mapas_lover where chave_hash = public.mapa_hash(p_chave);
  if m.id is null then return jsonb_build_object('ok', false, 'motivo', 'mapa_desconhecido'); end if;
  update public.caca_carimbo_excecao
     set imagem_meta = p_meta || jsonb_build_object('recebido_em', now())
   where id = p_id and edicao_codigo = m.edicao_codigo and pessoa = m.email_norm
     and imagem_path is not null and imagem_meta is null;
  return jsonb_build_object('ok', found);
end $$;
revoke all on function public.caca_foto_meta(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.caca_foto_meta(text, uuid, jsonb) to anon, authenticated;
