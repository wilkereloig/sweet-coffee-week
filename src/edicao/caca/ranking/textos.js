/* Textos do ranking da Caça (CLAUDE.md §5.6). Tom de Sweet Lovers; nunca "voto/votação"; só apelido e progresso. */
import { rotuloPosicao } from './regras.js'

export const RANKING = {
  regra: {
    titulo: 'Como o ranking funciona',
    itens: [
      'Vence quem conheceu mais casas diferentes.',
      'Se o número de casas for igual, os carimbos extras desempatam. Eles incluem revisitas validadas e o carimbo especial Sicredi aprovado pela organização.',
      'Continuou igual? Vocês ficam empatados, na mesma posição. Não desempatamos por horário.',
    ],
    privacidade: 'Apelido e progresso aparecem só para quem autorizou. Posições sem identificação são mantidas no ranking.',
  },
  carregando: 'Buscando o ranking…',
  falha: { titulo: 'Não conseguimos abrir o ranking agora', texto: 'Confira a conexão e tente de novo.' },
  vazio: { titulo: 'O ranking ainda está vazio', texto: 'Quando alguém que escolheu aparecer validar a primeira casa, ele entra aqui. Que tal ser você?' },
  lista: { titulo: 'Quem mais conheceu casas', vazia: 'Ninguém para mostrar ainda.' },
  verMais: 'Ver mais',
  atualizado: (quando) => `Atualizado ${quando}. O ranking se atualiza sozinho enquanto esta tela está aberta.`,
  atualizar: 'Atualizar agora',
  atualizando: 'Atualizando…',
  semRede: 'Sem conexão: mostrando o último ranking que chegou.',
  ritmo: {
    titulo: (horas) => `Quem mais avançou nas últimas ${horas} horas`,
    nota: 'Mostra só o avanço recente de quem autorizou aparecer. Não muda a classificação nem vale prêmio.',
    casas: (n) => `+${n} ${n === 1 ? 'casa' : 'casas'}`,
    extras: (n) => `+${n} ${n === 1 ? 'extra' : 'extras'}`,
  },
  carregandoMais: 'Buscando…',
  voce: 'você',
  nomeOculto: 'Nome não divulgado',
  dadosOcultos: 'Dados preservados por privacidade',
  empatado: 'empatado',
  empatadoEm: (p) => `empatado em ${rotuloPosicao(p)}`,
  semPosicao: 'ainda sem casa validada',
  minha: {
    titulo: 'Sua posição',
    posicao: (p, comEmpate) => (comEmpate > 0
      ? `Você está empatado em ${rotuloPosicao(p)} lugar com mais ${comEmpate} ${comEmpate === 1 ? 'pessoa' : 'pessoas'}.`
      : `Você está em ${rotuloPosicao(p)} lugar.`),
    semPosicao: 'Valide sua primeira casa para ganhar uma posição no ranking.',
    foraDaLista: 'Seu mapa não aparece na lista pública, mas a sua posição é essa. Só você vê.',
    semMapa: 'Crie seu mapa para ver a sua posição.',
    criarMapa: 'Criar meu mapa',
    abrirMapa: 'Abrir o mapa',
  },
}
