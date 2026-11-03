-- Reverte 20261131_arquivo_previa_dados.sql: apaga a coluna (e as prévias gravadas nela). O cartão volta ao ícone.
alter table public.arquivos drop constraint if exists arquivos_previa_dados_check;
alter table public.arquivos drop column if exists previa_dados;
