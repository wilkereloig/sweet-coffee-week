/*
 * Textos do mapa da Caça aos Carimbos (CLAUDE.md §5.6: conteúdo fora do JSX). Tom de Sweet Lovers, direto.
 * Regras: nunca "voto/votação" (as pessoas "avaliam"); nunca "Sweet" sozinho; a surpresa do prêmio final nunca é
 * revelada ("uma surpresa"); nenhum prêmio por meta é prometido; o Sicredi é "o Sicredi", rótulo "Patrocinador".
 */
import { CACA_CAMINHOS } from '../textos.js'

export const ESTADO_TEXTO = {
  'nao-visitada': { curto: 'Ainda não visitada', rotulo: 'Ainda não visitada', explica: 'Para conquistar: carimbe na casa e avalie o combo dela. Avaliar sozinho não cria carimbo.' },
  pendente: { curto: 'Falta avaliar', rotulo: 'Carimbo pendente: falta avaliar', explica: 'Você já carimbou aqui. Avalie o combo desta casa para validar o carimbo.' },
  conquistada: { curto: 'Conquistada', rotulo: 'Conquistada', explica: 'Carimbo e avaliação validados. Voltar aqui rende carimbos extras.' },
}

export const MAPA_CACA = {
  caminhos: CACA_CAMINHOS,
  // Progresso pessoal
  progressoTitulo: 'Seu progresso',
  progresso: (x, n) => `${x} de ${n} ${n === 1 ? 'casa validada' : 'casas validadas'}`,
  progressoDetalhe: (pendentes, extras) => [
    pendentes > 0 && (pendentes === 1 ? '1 carimbo esperando avaliação' : `${pendentes} carimbos esperando avaliação`),
    extras > 0 && (extras === 1 ? '1 carimbo extra' : `${extras} carimbos extras`),
  ].filter(Boolean).join(' · '),
  semMapa: 'Crie seu mapa para carimbar as casas e acompanhar o progresso aqui.',
  criarMapa: 'Criar meu mapa',
  lendoMapa: 'Lendo o seu mapa…',
  falhaMapa: 'Não deu para ler o seu mapa agora. As casas seguem no mapa, sem o seu progresso.',
  tentarDeNovo: 'Tentar de novo',
  // Próximo passo
  proximoTitulo: 'Próximo passo',
  proximo: {
    avaliar: (nome) => `Falta avaliar o combo de ${nome} para validar o seu carimbo.`,
    rota: (nome) => `A próxima parada da sua rota é ${nome}.`,
    visitar: (nome) => `Que tal conhecer ${nome}? É a próxima casa do caminho que você ainda não visitou.`,
    completo: 'Mapa completo! Você validou todas as casas e concorre ao prêmio final: uma surpresa.',
  },
  acaoProximo: { avaliar: 'Avaliar agora', rota: 'Ver no mapa', visitar: 'Ver no mapa' },
  // Cartão da casa
  verCombo: 'Ver o combo',
  avaliarCombo: 'Avaliar o combo',
  avaliarValidar: 'Avaliar e validar o carimbo',
  // Estados
  estadosTitulo: 'Como ler os pins',
  filtroEstado: 'Meu progresso',
  filtroEstados: { pendente: 'Falta avaliar', 'nao-visitada': 'Não visitadas', conquistada: 'Conquistadas' },
  revisitas: (n) => (n === 1 ? '1 revisita' : `${n} revisitas`),
  revisitaCurta: (n) => `+${n}`,
  legendaRevisita: 'Revisita: carimbo extra depois de a casa estar conquistada (+N)',
  legendaParada: 'Número no balão turquesa: parada da sua rota',
  proximaMarca: 'Próxima',
  proximaRotulo: 'Sua próxima casa',
  // Mundo
  avisoIlustrado: 'Mapa ilustrativo: não mostra posições reais. Para chegar, use "Como chegar" ou o Mapa real.',
  avisoTrilha: 'A linha pontilhada liga as paradas na ordem que você escolheu. Não é o caminho de carro.',
  previa: 'Prévia com a arte provisória: só aparece no ambiente de desenvolvimento.',
  regiao: 'Mundo da Doçura: Natal desenhada com as casas da Cartoon. A lista abaixo tem as mesmas casas.',
  zoom: 'Zoom do desenho',
  aproximar: 'Aproximar',
  afastar: 'Afastar',
  teclado: 'Com o desenho em foco: setas movem, + e − dão zoom, 0 volta ao mundo inteiro.',
  credito: 'Base geográfica © colaboradores do OpenStreetMap',
  casaNoMundo: ({ numero, titulo, tema, estado, revisitas, parada, proxima }) => [
    `${numero}. ${titulo}`,
    tema && `tema ${tema}`,
    estado && ESTADO_TEXTO[estado].rotulo.toLowerCase(),
    revisitas > 0 && (revisitas === 1 ? '1 revisita' : `${revisitas} revisitas`),
    parada && `parada ${parada} da sua rota`,
    proxima && 'sua próxima casa',
  ].filter(Boolean).join(', '),
  // Conquista
  conquistou: (nome) => `Casa conquistada: ${nome}!`,
  // Lista rápida (abaixo do desenho)
  listaRapida: (n) => `Casas em lista (${n})`,
  listaRapidaAjuda: 'Prefere não procurar a bandeirinha? Escolha a casa aqui e o desenho vai até ela.',
  irParaNoMapa: 'Ver no desenho',
  // Mapa real
  cobertura: ({ conferidas, aproximadas, sem }) => [
    `${conferidas} ${conferidas === 1 ? 'unidade com localização conferida' : 'unidades com localização conferida'}`,
    aproximadas > 0 && `${aproximadas} com localização aproximada`,
    sem > 0 && `${sem} sem localização no mapa`,
  ].filter(Boolean).join(' · '),
  semLocalizacaoTitulo: 'Ainda sem localização no mapa',
  semLocalizacaoAjuda: 'Estas unidades estão na lista e têm endereço; o ponto delas no mapa ainda está em conferência.',
  carregandoReal: 'Carregando o mapa real…',
  // Sicredi
  sicrediRotulo: 'Patrocinador',
  sicrediTitulo: 'Agências do Sicredi',
  sicrediAviso: 'O Sicredi é o patrocinador da Cartoon. As agências aparecem no mapa para você conhecer, mas não contam como casa nem como carimbo.',
  sicrediNoMundo: (nome, endereco) => `${nome}, agência do patrocinador Sicredi${endereco ? `: ${endereco}` : ''}. Não conta como casa nem como carimbo`,
  sicrediPonto: { confirmada: 'Localização conferida', aproximada: 'Localização aproximada', 'nao-informada': 'Localização não informada' },
  sicrediNumero: 'O número do endereço está em conferência com a agência.',
  sicrediComoChegar: 'Como chegar',
  sicrediNomeMarcador: (nome, aproximada) => `${nome}, patrocinador${aproximada ? ', ponto aproximado' : ''}, não conta como casa`,
  sicrediLegenda: 'Agência do Sicredi (patrocinador, não conta como casa)',
  sicrediSemEndereco: 'Endereço não informado.',
  sicrediNaoConta: 'Não conta como casa nem como carimbo',
}
