/*
 * Textos do mapa da Caça aos Carimbos (CLAUDE.md §5.6: conteúdo fora do JSX). Tom de Sweet Lovers, direto.
 * Regras: nunca "voto/votação" (as pessoas "avaliam"); nunca "Sweet" sozinho; a surpresa do prêmio final nunca é
 * revelada ("uma surpresa"); nenhum prêmio por meta é prometido; o Sicredi é "o Sicredi", rótulo "Patrocinador".
 */
import { CACA_CAMINHOS } from '../textos.js'

/** "a 350 m" / "a 1,2 km" — distância em linha reta, arredondada (o celular não dá precisão de metro). */
export const distanciaCurta = (km) => (km < 1 ? `a ${Math.max(10, Math.round(km * 100) * 10)} m` : `a ${km.toFixed(1).replace('.', ',')} km`)

export const ESTADO_TEXTO = {
  'nao-visitada': { curto: 'Ainda não visitada', rotulo: 'Ainda não visitada', explica: 'Para conquistar: carimbe na casa e avalie o combo dela. Avaliar sozinho não cria carimbo.' },
  pendente: { curto: 'Falta avaliar', rotulo: 'Carimbo pendente: falta avaliar', explica: 'Você já carimbou aqui. Avalie o combo desta casa para validar o carimbo.' },
  conquistada: { curto: 'Conquistada', rotulo: 'Conquistada', explica: 'Carimbo e avaliação validados. Voltar aqui rende carimbos extras.' },
}

export const MAPA_CACA = {
  caminhos: CACA_CAMINHOS,
  // Progresso pessoal
  progressoTitulo: 'Seu progresso',
  conviteEtiqueta: 'Caça aos Carimbos',
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
    visitar: (nome, km) => (Number.isFinite(km)
      ? `Que tal conhecer ${nome}? É a casa que você ainda não visitou mais perto de você, ${distanciaCurta(km)} em linha reta.`
      : `Que tal conhecer ${nome}? É a próxima casa do caminho que você ainda não visitou.`),
    completo: 'Mapa completo! Você validou todas as casas e concorre ao prêmio final: uma surpresa.',
  },
  // O botão do próximo passo diz a ação inteira (sem frase em volta): é a ação principal da tela. `proximo` (a frase) segue
  // como o texto longo — título do botão e testes.
  proximoAcao: {
    avaliar: (nome) => `Avaliar o combo de ${nome}`,
    rota: (nome) => `Ver ${nome} no mapa`,
    visitar: (nome, km) => (Number.isFinite(km) ? `Conhecer ${nome} · ${distanciaCurta(km)}` : `Conhecer ${nome}`),
  },
  // Sem a posição do celular o próximo passo cai na ordem do mapa; a linha abaixo diz como ter a casa mais perto.
  pertoDica: {
    disponivel: 'Toque no mapa e permita a localização para ver a casa mais perto de você.',
    negada: 'A localização está bloqueada. Libere nas configurações do navegador para ver a casa mais perto de você.',
  },
  // Cartão da casa
  verCombo: 'Ver o combo',
  carimbarAqui: 'Carimbar aqui',
  avaliarCombo: 'Avaliar o combo',
  avaliarValidar: 'Avaliar o combo', // o mesmo nome em todo lugar; o estado "Falta avaliar" já diz que isso valida o carimbo
  // Depois de "Já fui": o próximo passo certo para cada pessoa. "Já fui" é anotação; quem valida é o carimbo.
  jaFuiPasso: {
    semMapa: 'Anotado só para você. Quer que a casa valha na Caça aos Carimbos? Carimbe na casa e avalie o combo.',
    'nao-visitada': 'Já provou? Carimbe na casa para ela valer na Caça.',
    pendente: 'Carimbo registrado. Falta avaliar o combo para validar a casa.',
  },
  conhecerCaca: 'Conhecer a Caça',
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
  infoMapa: 'Sobre este mapa',
  avisoIlustrado: 'Mapa ilustrativo: não mostra posições reais. Para chegar, use "Como chegar" ou o Mapa real.',
  avisoTrilha: 'A linha pontilhada liga as paradas na ordem que você escolheu. Não é o caminho de carro.',
  previa: 'Prévia com a arte provisória: só aparece no ambiente de desenvolvimento.',
  regiao: 'Mundo da Doçura: Natal desenhada com as casas da Cartoon. A lista abaixo tem as mesmas casas.',
  zoom: 'Zoom do desenho',
  aproximar: 'Aproximar',
  afastar: 'Afastar',
  teclado: 'Com o desenho em foco: setas movem, + e − dão zoom, 0 volta à vista de abertura. Também dá para arrastar, usar a pinça e os botões de zoom, ou escolher a casa na lista.',
  credito: 'Base geográfica © colaboradores do OpenStreetMap',
  casaNoMundo: ({ numero, titulo, nomeCasa, enderecos, tema, estado, revisitas, parada, proxima, abertura }) => [
    `${numero}. ${nomeCasa || titulo}`,
    tema && `tema ${tema}`,
    enderecos > 1 && `${enderecos} endereços`,
    estado && ESTADO_TEXTO[estado].rotulo.toLowerCase(),
    revisitas > 0 && (revisitas === 1 ? '1 revisita' : `${revisitas} revisitas`),
    parada && `parada ${parada} da sua rota`,
    proxima && 'sua próxima casa',
    abertura, // horário de hoje (indicadores.js), vazio quando não dá para afirmar
  ].filter(Boolean).join(', '),
  // Página do mapa compacta (redesign de 06/11/2026): vistas, filtros, tela cheia, rota e cartão em folha
  vistaMundoVisivel: 'Ilustrado',
  vistaMundoOculto: 'Mapa ',
  buscaCurta: 'Casa ou bairro',
  filtros: 'Filtros',
  filtrosTitulo: 'Filtros do mapa',
  filtrosAtivos: (n) => (n === 1 ? '1 filtro ativo' : `${n} filtros ativos`),
  filtrosVer: (n) => (n === 1 ? 'Ver 1 endereço' : `Ver ${n} endereços`),
  filtrosLimpar: 'Limpar filtros',
  fecharFiltros: 'Fechar os filtros',
  telaCheiaAbrir: 'Abrir mapa em tela cheia',
  telaCheiaAbrirCurto: 'Tela cheia',
  telaCheiaFechar: 'Sair do mapa',
  telaCheiaFecharCurto: 'Sair',
  telaCheiaRegiao: 'Mapa em tela cheia',
  minhaRota: 'Minha rota',
  // Perto de mim (06/11/2026): botão na barra; o resultado e os erros aparecem num aviso ao lado do mapa, com "tentar de novo".
  perto: {
    rotulo: 'Perto de mim',
    buscando: 'Procurando sua localização…',
    negada: 'Sem acesso à sua localização. O navegador bloqueou o acesso: libere a localização para este site nas configurações do navegador e tente de novo. A lista segue por bairro.',
    indisponivel: 'Não deu para descobrir onde você está agora. Confira se o GPS está ligado e tente de novo.',
    demorou: 'A localização demorou demais. Tente de novo, de preferência em local aberto.',
    inseguro: 'Este endereço não permite usar a localização. Abra o site pelo endereço seguro (https).',
    suporte: 'Este navegador não informa a localização. A lista segue por bairro.',
    tentar: 'Tentar de novo',
    sair: 'Voltar à ordem normal',
    fechar: 'Fechar',
    ordenado: 'Ordenado pela distância em linha reta até você. Sua posição não sai deste aparelho.',
    maisPerto: 'Mais perto de você',
    longe: (km) => `Você parece estar longe das casas: a mais perto fica a cerca de ${km} km em linha reta.`,
    nenhuma: 'Nenhuma unidade com localização confirmada para calcular a distância.',
    semCoordenada: (n) => (n === 1 ? '1 endereço ainda sem localização confirmada fica no fim da lista.' : `${n} endereços ainda sem localização confirmada ficam no fim da lista.`),
    imprecisa: (m) => `Sua posição é aproximada (margem de ${m}).`,
    ilustrado: 'Os pontos do desenho não são exatos: por isso sua posição não aparece nele.',
    verReal: 'Ver no mapa real',
    verLista: 'Ver em lista',
    escolher: (nome) => `Ver ${nome}`,
    // Painel sobre o mapa (07/11/2026): as 5 casas mais perto, em carrossel.
    titulo: 'Mais perto de você',
    ordem: '1ª é a mais perto',
    listaAria: (n) => `${n === 1 ? '1 casa' : `${n} casas`} mais perto de você, da mais perto para a mais longe`,
    fecharPainel: 'Fechar as casas perto de mim',
    cartaoAria: (rank, nome, unidade, dist, aprox) => `${rank}ª mais perto: ${nome}${unidade ? `, unidade ${unidade}` : ''}, ${aprox ? 'cerca de ' : ''}${dist} em linha reta${aprox ? ', local aproximado' : ''}. Toque para ver os detalhes`,
    ilustradoCurto: 'Pontos do desenho ilustrativos; a distância vem do endereço real.',
    semCoordenadaCurta: (n) => (n === 1 ? '1 casa sem localização confirmada fica de fora.' : `${n} casas sem localização confirmada ficam de fora.`),
    nenhumaCurta: 'Nenhuma casa com localização confirmada para calcular a distância.',
  },
  minhaRotaConta: (n) => (n === 0 ? 'Minha rota, sem paradas' : n === 1 ? 'Minha rota, 1 parada' : `Minha rota, ${n} paradas`),
  fecharPainel: 'Fechar o painel da rota',
  casasEnderecos: (casas, enderecos, valem = null) => {
    const c = casas === 1 ? '1 casa' : `${casas} casas`
    const v = Number.isFinite(valem) && valem > 0 && valem < casas ? ` (${valem} valem carimbo)` : '' // o total da Caça vem do servidor; casa sem combo aparece no mapa mas não conta
    const e = enderecos === 1 ? '1 endereço' : `${enderecos} endereços`
    return enderecos > casas ? `${c}${v} · ${e}` : `${c}${v}`
  },
  casasEnderecosCurta: 'Cada casa vale 1 carimbo',
  casasEnderecosNota: 'Cada casa vale um carimbo, mesmo com mais de um endereço.',
  mostrando: (n, total) => (n === total ? '' : `Mostrando ${n} de ${total} endereços`),
  maisDetalhes: 'Mais detalhes',
  menosDetalhes: 'Menos detalhes',
  maisCurto: 'Mais',
  menosCurto: 'Menos',
  outrosEnderecos: (n) => (n === 1 ? 'Esta casa tem mais 1 endereço' : `Esta casa tem mais ${n} endereços`),
  outrosEnderecosNota: 'Os endereços contam como uma casa só na Caça.',
  // Atalhos do jogo (tela cheia, 06/11/2026): UM botão compacto sobre o mapa que abre uma lista curta; cada item abre uma folha.
  atalhos: 'Atalhos',
  atalhosLista: 'Atalhos do jogo',
  atalhosNome: (resumo) => (resumo ? `Atalhos do jogo, ${resumo}` : 'Atalhos do jogo'),
  atalhosResumo: (feitas, total) => `${feitas} de ${total} ${total === 1 ? 'casa validada' : 'casas validadas'}`,
  atalho: { progresso: 'Progresso', casas: 'Casas', rota: 'Rota', premios: 'Prêmios', ranking: 'Ranking', grupos: 'Grupos', visitaAnterior: 'Pedir carimbo' },
  atalhoTitulo: { progresso: 'Progresso e carimbos', casas: 'Casas', rota: 'Minha rota', premios: 'Prêmios', ranking: 'Ranking', grupos: 'Grupos', visitaAnterior: 'Pedir carimbo de uma visita' },
  atalhoFechar: (titulo) => `Fechar: ${titulo}`,
  atalhoCarregando: 'Carregando…',
  atalhoGruposSemMapa: 'Crie seu mapa para jogar com amigos: o ranking dos grupos e a rota coletiva usam o seu progresso.',
  // Conquista
  conquistou: (nome) => `Casa conquistada: ${nome}!`,
  // Lista rápida (abaixo do desenho)
  listaRapida: (n) => `Casas em lista (${n})`,
  listaRapidaAjuda: 'Prefere não procurar no desenho? Escolha a casa aqui e o desenho vai até ela.',
  enderecosNaCasa: (n) => `${n} endereços`,
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
  sicrediAviso: 'O Sicredi é patrocinador da Cartoon, não uma casa do mapa. Ao participar da campanha e enviar o print do vídeo publicado, você pode ganhar um carimbo Sicredi após aprovação da organização.',
  sicrediNoMundo: (nome, endereco) => `${nome}, agência do patrocinador Sicredi${endereco ? `: ${endereco}` : ''}. A agência não conta como casa; o carimbo especial é concedido após aprovação do print da campanha`,
  sicrediPonto: { confirmada: 'Localização conferida', aproximada: 'Localização aproximada', 'nao-informada': 'Localização não informada' },
  sicrediComoChegar: 'Como chegar',
  sicrediNomeMarcador: (nome, aproximada) => `${nome}, patrocinador${aproximada ? ', ponto aproximado' : ''}, não conta como casa`,
  // Pins colados demais para afastar todos (zoom da cidade): um selo com a contagem que, ao tocar, aproxima o mapa.
  grupoSelo: (n) => `${n} locais muito próximos aqui. Tocar aproxima o mapa para escolher`,
  grupoSeloCurto: (n) => String(n),
  sicrediLegenda: 'Agência do Sicredi (patrocinador, não conta como casa)',
  sicrediSemEndereco: 'Endereço não informado.',
  sicrediNaoConta: 'Agência não conta como casa. O carimbo especial é concedido após aprovação do print da campanha.',
}
