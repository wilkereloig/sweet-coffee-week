// Equipe (17/10/2026): autoria honesta, iniciais, recorte da foto e o contrato
// com o banco (supabase/migrations/20261017_equipe_perfis_avisos.sql).
// ⚠️ O comportamento das funções SQL foi validado num Postgres local (PGlite);
// aqui ficam os invariantes que dá para conferir sem banco.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tipoAutor, nomeAutor, areaRecorte, validarFoto, caminhoFoto, iniciais, FOTO_LADO } from '../painel-app/src/lib/equipe.js'

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const SQL = ler('supabase/migrations/20261017_equipe_perfis_avisos.sql')
const corpo = (f) => SQL.slice(SQL.indexOf('function public.' + f), SQL.indexOf('$$;', SQL.indexOf('function public.' + f) + 30))

test('autoria: registro sem id nunca vira pessoa; compartilhado, sistema e marca são honestos', () => {
  const id = '7d1c0f5e-3b2a-4c8e-9f10-2a3b4c5d6e7f'
  assert.equal(tipoAutor(id, 'Eline Eulalia'), 'pessoa')
  assert.equal(tipoAutor(null, 'Acesso compartilhado'), 'compartilhado')
  assert.equal(tipoAutor(null, 'senha-compartilhada'), 'compartilhado')
  assert.equal(tipoAutor(null, null), 'compartilhado')
  assert.equal(tipoAutor(null, 'Importação 2026.1'), 'sistema')
  assert.equal(tipoAutor(null, 'Marca · Jolie'), 'marca')
  // Nome mostrado = o gravado no registro (renomear depois não reescreve).
  assert.equal(nomeAutor(id, 'Nome Antigo', { nome: 'Nome Novo' }), 'Nome Antigo')
  assert.equal(nomeAutor(id, '', { nome: 'Nome Novo' }), 'Nome Novo')
  assert.equal(nomeAutor(null, 'senha-compartilhada'), 'Acesso compartilhado')
  assert.equal(nomeAutor(id, '', null), 'Conta removida')
  assert.equal(iniciais('Eline Eulalia'), 'EE')
  assert.equal(iniciais('Wilker Eloi'), 'WE')
})

test('recorte: quadrado dentro da foto, sem esticar, nos limites', () => {
  assert.deepEqual(areaRecorte(1200, 800), { sx: 200, sy: 0, lado: 800 })
  assert.deepEqual(areaRecorte(1200, 800, { x: -1 }), { sx: 0, sy: 0, lado: 800 })
  assert.deepEqual(areaRecorte(1200, 800, { x: 1 }), { sx: 400, sy: 0, lado: 800 })
  assert.deepEqual(areaRecorte(800, 1200, { y: 1 }), { sx: 0, sy: 400, lado: 800 })
  assert.deepEqual(areaRecorte(1000, 1000, { zoom: 2, x: 1, y: -1 }), { sx: 500, sy: 0, lado: 500 })
  // Fora da faixa: preso aos limites (nunca sai da foto).
  const r = areaRecorte(1000, 600, { zoom: 9, x: 5, y: -5 })
  assert.ok(r.sx + r.lado <= 1000 && r.sy >= 0 && r.lado === 150)
  assert.equal(FOTO_LADO, 512)
})

test('foto: tipo, tamanho e bytes; caminho = pasta da pessoa', () => {
  const jpg = [0xff, 0xd8, 0xff, 0xe0]
  assert.equal(validarFoto({ tipo: 'image/jpeg', tamanho: 1000, cabecalho: jpg }).ok, true)
  assert.equal(validarFoto({ tipo: 'image/gif', tamanho: 1000 }).ok, false)
  assert.equal(validarFoto({ tipo: 'image/png', tamanho: 1000, cabecalho: jpg }).ok, false, 'png renomeado')
  assert.equal(validarFoto({ tipo: 'image/jpeg', tamanho: 16 * 1024 * 1024, cabecalho: jpg }).ok, false)
  assert.equal(validarFoto({ tipo: 'image/jpeg', tamanho: 0 }).ok, false)
  const u = '7d1c0f5e-3b2a-4c8e-9f10-2a3b4c5d6e7f'
  assert.match(caminhoFoto(u, u, 'webp'), /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/)
})

test('banco: foto só da própria pasta (ou acesso.gerir); nome não toca login, função nem ativação', () => {
  assert.match(SQL, /'equipe', 'equipe', false, 2097152/)
  assert.doesNotMatch(SQL, /create policy/i)
  const aut = corpo('perfil_autorizar_foto')
  assert.match(aut, /if v_alvo = auth\.uid\(\) then/)
  assert.match(aut, /elsif not public\.pode\(p_secret, 'acesso\.gerir'\)/)
  const def = corpo('perfil_foto_definir')
  assert.match(def, /split_part\(p_path, '\/', 1\) <> v_alvo::text/)
  assert.match(def, /storage\.objects o where o\.bucket_id = 'equipe'/)
  const nome = corpo('meu_nome_definir')
  assert.match(nome, /update public\.perfis set nome = v_nome where user_id = auth\.uid\(\)/)
  assert.doesNotMatch(nome, /funcao|ativo =|email|auth\.users/)
  // Remover a foto não apaga o objeto.
  assert.doesNotMatch(SQL, /delete from storage\.objects/)
  // Diretório sem e-mail; inclui desativadas (o histórico antigo continua identificado).
  const dir = corpo('equipe_diretorio')
  assert.doesNotMatch(dir, /email/)
  assert.doesNotMatch(dir, /where pf\.papel = 'organizacao' and pf\.ativo/)
})

test('banco: aviso pessoal só para o destinatário; quem fez não é avisado; ler não exige dado.ler', () => {
  const ler = corpo('get_notificacoes_org')
  assert.match(ler, /when n\.para_user_id is not null then n\.para_user_id = v_eu/)
  // Permissão calculada UMA vez por chamada (pode() com senha compartilhada é bcrypt), nunca por linha.
  assert.match(ler, /v_dl boolean := public\.pode\(p_secret, 'dado\.ler'\)/)
  assert.doesNotMatch(ler.slice(ler.indexOf('return query')), /public\.pode\(/)
  assert.match(corpo('conta_org_ativa'), /not pf\.deve_trocar_senha/)
  assert.match(corpo('avisar_pessoa'), /p_user is not distinct from auth\.uid\(\)/)
  assert.match(corpo('ler_notificacoes_org'), /if not \(v_dl or v_rv\) then raise exception 'nao_autorizado'/)
  assert.match(corpo('registrar_push_organizacao'), /membro_org\(p_secret\)/)
  // Autor do aviso por id vem da sessão (default auth.uid()), nunca do navegador.
  assert.match(SQL, /add column if not exists ator_user_id uuid default auth\.uid\(\)/)
  assert.doesNotMatch(SQL, /p_ator_user_id|p_autor/)
})
