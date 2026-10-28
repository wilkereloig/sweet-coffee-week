-- ─────────────────────────────────────────────────────────────────────────────
-- Storage › bucket `arquivos`: a marca só lê o que a tabela `arquivos` lhe mostra (21/10/2026, auditoria).
-- Só ALTERA a política `arquivos_marca_le` (nada é apagado). Depende de 20260825_fase4_participacoes_solicitacoes_arquivos.sql.
--
-- Bug: a política liberava a QUALQUER conta logada qualquer objeto em `geral/*` (e o da própria participação), sem
-- olhar se o arquivo estava publicado ou arquivado nem se a conta estava ativa. A tabela `arquivos` escondia rascunho
-- e arquivado, mas o Storage não: quem soubesse o caminho assinava e baixava; marca bloqueada continuava baixando.
-- Agora: conta ativa (`conta_ativa()`: ativa, não bloqueada, senha já trocada) E o objeto corresponde a uma linha de
-- `arquivos` publicada e não arquivada que a marca pode ver (geral, ou da própria participação).
-- A organização lê pela Edge Function `arquivo-url` (service role), que não passa por esta política.
-- ─────────────────────────────────────────────────────────────────────────────

alter policy arquivos_marca_le on storage.objects using (
  bucket_id = 'arquivos' and public.conta_ativa() and exists (
    select 1 from public.arquivos a
     where a.path = storage.objects.name and a.publicado_em is not null and not a.arquivado
       and (a.escopo = 'geral' or exists (select 1 from public.participacoes pa join public.participantes p on p.id = pa.participante_id
                                            where pa.id = a.participacao_id and p.user_id = auth.uid()))));
