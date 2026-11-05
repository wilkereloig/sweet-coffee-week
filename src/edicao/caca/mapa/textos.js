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
  teclado: 'Com o desenho em foco: setas movem, + e − dão zoom, 0 volta à vista de abertura. Também dá para arrastar, usar a pinça e os botões de zoom, ou escolher a casa na lista.',
  credito: 'Base geográfica © colaboradores do OpenStreetMap',
  casaNoMundo: ({ numero, titulo, nomeCasa, enderecos, tema, estado, revisitas, parada, proxima }) => [
    `${numero}. ${nomeCasa || titulo}`,
    tema && `tema ${tema}`,
    enderecos > 1 && `${enderecos} endereços`,
    estado && ESTADO_TEXTO[estado].rotulo.toLowerCase(),
    revisitas > 0 && (revisitas === 1 ? '1 revisita' : `${revisitas} revisitas`),
    parada && `parada ${parada} da sua rota`,
    proxima && 'sua próxima casa',
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
  telaCheiaFechar: 'Fechar tela cheia',
  telaCheiaFecharCurto: 'Fechar',
  telaCheiaRegiao: 'Mapa em tela cheia',
  minhaRota: 'Minha rota',
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
  atalho: { progresso: 'Progresso', casas: 'Casas', rota: 'Rota', ranking: 'Ranking', grupos: 'Grupos' },
  atalhoTitulo: { progresso: 'Progresso e carimbos', casas: 'Casas', rota: 'Minha rota', ranking: 'Ranking', grupos: 'Grupos' },
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
