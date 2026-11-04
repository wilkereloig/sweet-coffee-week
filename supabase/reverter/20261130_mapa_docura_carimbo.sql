-- Reverte 20261130_mapa_docura_carimbo: apaga funções e tabelas do Mapa da Doçura (mapas, QR e carimbos SOMEM).
drop function if exists public.mapa_nova_chave(text, uuid), public.carimbo_qr_novo(text, uuid), public.get_carimbo_qr(text, text),
  public.carimbo_anular(text, uuid, text), public.get_mapa_carimbos(text, text), public.marca_carimbos_hoje(),
  public.ranking_mapa(text), public.mapa_apagar(text), public.mapa_carimbar(text, text, numeric, numeric, numeric),
  public.mapa_ler(text), public.mapa_criar(text, text, text, text, boolean, boolean),
  public.carimbo_distancia(float8, float8, float8, float8), public.carimbo_placar(text), public.mapa_hash(text),
  public.carimbo_codigo_novo();
drop table if exists public.carimbos, public.carimbo_qr, public.mapas_lover;
