-- 03/11/2026 (Wilker: "tem como adicionar uma prévia das fotos?" no cartão "Fotos do combo — pasta no Dropbox").
-- O link do Dropbox (20261129) não tem arquivo no Storage, então a prévia de `previa_path` não serve. A prévia do link é um MOSAICO
-- pequeno (WebP 640×480, dezenas de KB) guardado na própria linha, como data URL: `arquivos.previa_dados`.
--   · só para linha de link (`url_externa`), só WebP, até 150.000 caracteres — o CHECK recusa o resto;
--   · a leitura é a de sempre: a linha só chega à marca dona dela (`arquivos_marca_le`), então a prévia não fica pública;
--   · `get_arquivos_admin` NÃO devolve a coluna (lista da equipe não carrega imagem); a marca lê pela tabela (`select=*`);
--   · gravar/trocar a prévia não notifica ninguém (UPDATE não dispara `gerar_notificacoes`).
-- Reversão: supabase/reverter/20261131_arquivo_previa_dados.sql. Teste: supabase/testes/arquivo-previa-dados.sql.
alter table public.arquivos add column if not exists previa_dados text;
alter table public.arquivos drop constraint if exists arquivos_previa_dados_check;
alter table public.arquivos add constraint arquivos_previa_dados_check
  check (previa_dados is null or (url_externa is not null and length(previa_dados) <= 150000
         and previa_dados ~ '^data:image/webp;base64,[A-Za-z0-9+/]+=*$'));
