// Correções da revisão de código de 06/11/2026 na Caça: limite da resposta "e-mail já tem mapa", aviso do link do e-mail e texto de quem
// cai no mapa de outra pessoa. Só texto/arquivos: nada aqui fala com o banco.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { CACA } from '../src/edicao/caca/textos.js'
import { montarEmailLink } from '../supabase/functions/caca-email/montar.js'

const fonte = (c) => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8')

test('migration 20261228: segundo limite por IP só na resposta "já tem mapa"; corpo seguro e com reverter', () => {
  const sql = fonte('supabase/migrations/20261228_caca_email_ja_tem_mapa_limite.sql')
  assert.match(sql, /security definer set search_path to 'public'/)
  assert.match(sql, /caca_hash_texto\('ja:' \|\| v_ip\)/)
  assert.match(sql, /interval '10 minutes'\) >= 10 then\s+raise exception 'muitos_pedidos'/)
  assert.match(sql, /'motivo', 'email_ja_tem_mapa'/, 'a tela continua recebendo o motivo')
  assert.match(sql, /mapa_criar\(p_edicao, p_apelido, p_email, p_whatsapp, p_ranking, p_aceite\)/, 'a criação segue passando por mapa_criar')
  assert.ok(existsSync(new URL('../supabase/reverter/20261228_caca_email_ja_tem_mapa_limite.sql', import.meta.url)))
  assert.ok(existsSync(new URL('../supabase/testes/caca-email-ja-tem-mapa-limite.sql', import.meta.url)))
})

test('e-mail do link avisa que ele muda quando o mapa é recuperado em outro aparelho (HTML e texto)', () => {
  const m = montarEmailLink('A'.repeat(32))
  assert.match(m.texto, /vale até você recuperar o mapa em outro aparelho/)
  assert.match(m.html, /vale até você recuperar o mapa em outro aparelho/)
})

test('quem cai no mapa de outra pessoa sabe como sair: entrar pelo código, apagar e criar o seu', () => {
  assert.match(CACA.criar.jaTemMapa.texto, /Apagar meu mapa/)
})

test('reverters das migrations 20261223 e 20261227 existem', () => {
  assert.match(fonte('supabase/reverter/20261223_caca_premios_publico.sql'), /drop function if exists public\.caca_premios_publico\(text\)/)
  assert.match(fonte('supabase/reverter/20261227_caca_visita_anterior_prazo_ate_06_11.sql'), /2026-11-06 00:00:00/)
})
