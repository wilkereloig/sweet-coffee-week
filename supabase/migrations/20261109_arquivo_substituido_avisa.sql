-- Arquivo SUBSTITUÍDO (23/10/2026): quem já tinha confirmado a leitura é avisado de que precisa confirmar de novo.
-- `substituir_arquivo` renova `publicado_em`; desde 20261105 isso faz a leitura anterior deixar de valer (a marca vê o arquivo
-- de volta em "Para ler"), mas o gatilho de avisos de `arquivos` só dispara em INSERT — a marca não receberia sino nem push.
-- Gatilho SEPARADO (não mexe no gerar_notificacoes): só arquivos que exigem leitura, só quem JÁ confirmou uma versão anterior
-- (quem nunca leu já tem o "Novo arquivo" e a pendência). A mesma tolerância de 1 minuto da regra de "versão atual".
create or replace function public.arquivo_substituido_avisa()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  perform public.notificar('marca', p.id, 'arquivo', 'Arquivo atualizado: ' || new.nome,
            'Confirme a leitura de novo.', 'arquivos/' || new.id)
     from public.participantes p
    where exists (select 1
                    from public.arquivo_leitura l
                    join public.participacoes pa on pa.id = l.participacao_id
                   where l.arquivo_id = new.id and pa.participante_id = p.id
                     and l.lido_em < new.publicado_em - interval '1 minute');
  return null;
end
$function$;
revoke all on function public.arquivo_substituido_avisa() from public, anon, authenticated;

create or replace trigger arquivo_substituido_avisa
  after update of publicado_em on public.arquivos
  for each row
  when (old.publicado_em is not null and new.publicado_em is not null and new.publicado_em > old.publicado_em
        and new.exige_leitura and not new.arquivado)
  execute function public.arquivo_substituido_avisa();
