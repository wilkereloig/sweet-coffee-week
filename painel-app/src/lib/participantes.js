/*
 * Vista Marcas — lógica pura, sem DOM. Porta fiel de public/painel/
 * index.html (COR_CADASTRO ~2517, slugPrevisto ~3044, RECADO_MANUAL ~3054,
 * o resumo de linha em renderParticipantes ~2591-2609, soDigitos ~2945,
 * montarRecado ~3308, opcoesMarcas ~3445).
 */
import { rotulos } from './status.js'

export const COR_CADASTRO = {
  aguardando_cadastro: '#FF4810', em_preenchimento: '#01AFCC',
  cadastro_completo: '#3D1308', encerrado: '#6A2C15',
  sem_participacao: '#6A2C15',
}

export const ROTULO_SESSAO = rotulos('sessao')

export const RECADO_MANUAL = {
  entrada_ambigua: 'Defeito do painel: mandou candidatura e cadastro manual juntos.',
  sem_nome_de_marca: 'O nome do estabelecimento é obrigatório: é ele que vira o login.',
  marca_ja_tem_acesso: 'Já existe uma marca com acesso usando esse nome.',
  existe_candidatura: 'Essa marca já se inscreveu pelo "Quero participar".',
  nao_autorizado: 'A sessão não vale mais. Saia e entre de novo.',
}

// Mesma slugificação da Edge Function `criar-acesso-marca` e de
// public/marca/index.html — as três TÊM que casar (CLAUDE.md §6.10-b/4).
// Aqui ela só PREVÊ o login antes de criar a conta.
export function slugPrevisto(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 48)
}

export function soDigitos(s) {
  return String(s || '').replace(/\D/g, '')
}

// A linha de meta de cada marca na lista — o que ela já preencheu, contado
// pelo BANCO. Number(): toda contagem que vem do Postgres é bigint e pode
// chegar como STRING ("1" === 1 é falso, a unidade única sairia no plural).
export function resumoParticipante(p) {
  const nUnidades = Number(p.unidades || 0)
  const nItens = Number(p.itens_prontos || 0)
  const nEdicoes = Number(p.edicoes || 0)
  const feito = [
    p.tema_combo || '',
    nItens ? nItens + ' de 3 itens' : '',
    nUnidades ? nUnidades + (nUnidades === 1 ? ' unidade' : ' unidades') : '',
  ].filter(Boolean).join(' · ')
  const edicao = p.edicao_codigo ? 'edição ' + p.edicao_codigo : 'sem edição aberta'
  const historico = nEdicoes > 1 ? ' · ' + nEdicoes + ' edições' : ''
  return edicao + historico + ' · ' + (feito || 'nada preenchido ainda')
}

// O recado é UM só para os dois botões (copiar e WhatsApp) — duas versões
// divergiriam na primeira correção. `origem` é injetado (não lê
// `location.origin` aqui) para a função continuar pura e testável sem DOM.
// Texto do pedido de 29/09/2026 ("Aprimoramento do sistema de acessos").
// O login é o nome do estabelecimento (o painel slugifica ao entrar).
export function montarRecado({ nomeMarca, responsavel, login, senha, origem }) {
  const nome = String(responsavel || '').trim().split(/\s+/)[0] || nomeMarca
  return [
    'Olá, ' + nome + '.',
    '',
    'Seu acesso ao painel do Sweet & Coffee Week está disponível.',
    '',
    'Login: ' + login,
    'Senha temporária: ' + senha,
    '',
    'Acesse: ' + origem + '/painel/',
    '',
    'No primeiro acesso, você vai definir sua nova senha.',
  ].join('\n')
}

// Bloco de uma marca no "Copiar todos os acessos" — para a equipe, não para a marca.
export function textoAcesso({ nomeMarca, responsavel, login, senha, origem }) {
  return [
    'Estabelecimento: ' + nomeMarca,
    'Responsável: ' + (responsavel || '—'),
    'Login: ' + login,
    senha ? 'Senha temporária: ' + senha : null,
    'Acesso: ' + origem + '/painel/',
  ].filter((l) => l !== null).join('\n')
}

export function textoTodosAcessos(lista, origem) {
  return lista.map((a) => textoAcesso({ ...a, origem })).join('\n\n---\n\n')
}

export function linkWhatsApp(telefone, texto) {
  const fone = soDigitos(telefone)
  if (!fone) return null
  const numero = fone.length <= 11 ? '55' + fone : fone
  return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto)
}

/*
 * WhatsApp = telefone de cadastro (29/09/2026). Máscara brasileira ao digitar,
 * validação de DDD e de dígitos. Grava formatado; a forma de máquina é
 * `participantes.telefone_normalizado`, gerada no banco.
 */
// DDDs em uso no Brasil (Anatel).
const DDDS = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75,
  77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99])

// Tira o 55 do país quando vier colado junto (13 ou 12 dígitos).
function nacional(d) {
  return (d.length === 13 || d.length === 12) && d.startsWith('55') ? d.slice(2) : d
}

export function mascaraWhatsApp(valor) {
  const d = nacional(soDigitos(valor)).slice(0, 11)
  if (d.length <= 2) return d ? '(' + d : ''
  const ddd = '(' + d.slice(0, 2) + ') '
  const resto = d.slice(2)
  if (resto.length <= 4) return ddd + resto
  const corte = resto.length === 9 ? 5 : 4
  return ddd + resto.slice(0, corte) + '-' + resto.slice(corte)
}

/** '' quando válido; senão o motivo, pronto para a tela. Vazio é válido (obrigatoriedade é outra regra). */
export function validarWhatsApp(valor) {
  const d = nacional(soDigitos(valor))
  if (!d) return ''
  if (d.length !== 10 && d.length !== 11) return 'Informe DDD + número (10 ou 11 dígitos).'
  if (!DDDS.has(Number(d.slice(0, 2)))) return 'DDD ' + d.slice(0, 2) + ' não existe.'
  if (d.length === 11 && d[2] !== '9') return 'Celular com 11 dígitos começa com 9 depois do DDD.'
  return ''
}

/** 55 + DDD + número, a forma que o wa.me entende. */
export function whatsappNormalizado(valor) {
  const d = nacional(soDigitos(valor))
  return d ? '55' + d : ''
}

// Opções de marca para os três formulários de Produção (pedido/arquivo/
// sessão) — só quem tem participação aberta pode receber pedido, arquivo ou
// sessão de fotos. Devolve dados, não JSX: a lib fica livre de framework.
export function marcasParaOpcoes(participantes) {
  return participantes
    .filter((p) => p.participacao_id)
    .map((p) => ({
      value: p.participacao_id,
      label: p.nome_marca + (p.edicao_codigo ? ' · ' + p.edicao_codigo : ''),
    }))
}
