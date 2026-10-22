-- Agenda os lembretes do Social media: a cada 10 min (a própria função fica quieta fora de 07h–22h de Fortaleza).
-- Desligar: select cron.unschedule('scw-redes-lembretes');
select cron.unschedule(jobid) from cron.job where jobname = 'scw-redes-lembretes';
select cron.schedule('scw-redes-lembretes', '*/10 * * * *', 'select public.redes_lembretes()');
