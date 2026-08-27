/*
 * Vista Marcas — lógica pura, sem DOM. Porta fiel de public/painel/
 * index.html (COR_CADASTRO ~2517, slugPrevisto ~3044, RECADO_MANUAL ~3054,
 * o resumo de linha em renderParticipantes ~2591-2609, soDigitos ~2945,
 * montarRecado ~3308, opcoesMarcas ~3445).
 */
import { preco } from './painelFormat.js'

export const COR_CADASTRO = {
  aguardando_cadastro: '#FF4810', em_preenchimento: '#01AFCC',
  cadastro_completo: '#3D1308', encerrado: '#6A2C15',
  sem_participacao: '#6A2C15',
}

export const ROTULO_SESSAO = {
  agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada', remarcada: 'Remarcada',
  aberto: 'Vaga aberta',
}

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
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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
    preco(p.combo_preco),
  ].filter(Boolean).join(' · ')
  const edicao = p.edicao_codigo ? 'edição ' + p.edicao_codigo : 'sem edição aberta'
  const historico = nEdicoes > 1 ? ' · ' + nEdicoes + ' edições' : ''
  return edicao + historico + ' · ' + (feito || 'nada preenchido ainda')
}

// O recado é UM só para os dois botões (copiar e WhatsApp) — duas versões
// divergiriam na primeira correção. `origem` é injetado (não lê
// `location.origin` aqui) para a função continuar pura e testável sem DOM.
export function montarRecado({ nomeMarca, login, senha, origem }) {
  return [
    'Oi, ' + nomeMarca + '! Seu acesso ao Sweet & Coffee Week está pronto.',
    '',
    'Endereço: ' + origem + '/marca/',
    'Login: ' + login,
    'Senha: ' + senha,
    '',
    'No primeiro acesso você vai trocar essa senha por uma sua. ' +
    'Depois disso, esta aqui deixa de valer.',
  ].join('\n')
}

export function linkWhatsApp(telefone, texto) {
  const fone = soDigitos(telefone)
  if (!fone) return null
  const numero = fone.length <= 11 ? '55' + fone : fone
  return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto)
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
