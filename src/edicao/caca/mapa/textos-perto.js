/*
 * Textos do convite de localização e da sugestão "perto de você" (CLAUDE.md §5.6: conteúdo fora do JSX).
 * Regras: a sugestão ajuda a escolher — nunca diz que marca visita, carimbo ou avaliação; nunca promete aviso com o app fechado;
 * nunca chama de "aberta" uma casa sem horário confirmado; a posição fica só neste aparelho.
 */
export const PERTO_SUGESTAO = {
  convite: {
    titulo: 'Achar casas e combos perto de você',
    texto: 'Com a sua localização eu mostro as casas mais perto e ajudo no carimbo na casa. Ela fica só neste aparelho, e você pode seguir pelo mapa sem liberar.',
    usar: 'Usar minha localização',
    agoraNao: 'Agora não',
    buscando: 'Procurando sua localização…',
  },
  sugestao: {
    titulo: { sozinha: 'Uma casa perto de você', opcao: 'Outra opção perto de você' },
    rotuloAria: 'Sugestão de casa perto de você',
    avisoSoSugestao: 'É só uma sugestão: ela não marca visita nem cria carimbo.',
    avisoRota: 'A sua rota continua como está.',
    horarioAConfirmar: 'Horário do combo a confirmar com a casa.',
    pontoAproximado: 'Local aproximado no mapa: confira o endereço antes de sair.',
    semDistancia: 'Sua posição está aproximada demais para eu dizer a distância.',
    comoChegar: 'Como chegar',
    verCombo: 'Ver combo',
    verNoMapa: 'Ver no mapa',
    agoraNaoCasa: 'Agora não',
    agoraNaoCasaConta: (nome) => `Agora não, dispensar ${nome} por hoje`,
    desligar: 'Desligar sugestões',
    desligarConta: 'Desligar as sugestões de casas perto de mim',
    fotoAlt: (combo, casa) => `Combo ${combo ? `${combo} ` : ''}de ${casa}`,
  },
  vazio: {
    // Só aparecem quando a pessoa tocou em "Perto de mim" ou liberou a localização e não há o que sugerir.
    'todas-conquistadas': 'Você já validou todas as casas que tenho com localização por aqui. Parabéns!',
    'todas-fechadas': 'As casas perto de você não estão com o combo hoje. Veja outros horários na lista.',
    'so-na-rota': 'As casas perto de você já estão na sua rota.',
    longe: 'Você parece estar longe das casas da edição, então não sugiro uma casa “perto”.',
    dispensadas: 'Você dispensou as casas perto de você por hoje. Elas voltam amanhã.',
  },
  interruptor: {
    rotulo: 'Sugerir casas perto de mim',
    ajuda: 'Mostra uma casa para descobrir enquanto o mapa está aberto. A posição não sai do aparelho e não vira aviso com o app fechado.',
    ligado: 'Sugestões ligadas',
    desligado: 'Sugestões desligadas',
  },
}
