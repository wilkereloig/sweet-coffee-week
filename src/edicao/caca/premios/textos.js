/*
 * Textos da aba "Prêmios" (mapa). Regras na linguagem do regulamento (src/edicao/cartoon/regulamento.js, vouchers e prêmio final);
 * NENHUMA data, hora, validade ou quantidade de ganhadores é escrita aqui: entram por parâmetro, vindas de `caca_premios_publico`.
 */
export const PREMIOS = {
  titulo: 'Prêmios',
  intro: 'Valide casas diferentes para concorrer a vouchers durante o festival e ao prêmio final.',
  // Voucher do dia
  vouchersTitulo: 'Vouchers durante o festival',
  vouchersResumo: (n) => (n === 1 ? '1 dia com voucher em disputa' : `${n} dias com voucher em disputa`),
  proximoRotulo: { em_disputa: 'Em disputa agora', proximo: 'Próximo voucher', em_apuracao: 'Em apuração', resultado: 'Último resultado' },
  diaTitulo: (d) => `${d.semana[0].toUpperCase()}${d.semana.slice(1)}, ${d.longa}`,
  // A quantidade do dia vem do servidor (`vouchers`): 1 nos primeiros dias, 2 depois.
  qVouchers: (n) => (n === 1 ? '1 voucher em disputa' : `${n} vouchers em disputa`),
  vouchersCurto: (n) => (n === 1 ? '1 voucher' : `${n} vouchers`),
  retirada: (r) => `Voucher físico: quem ganha retira no ${r.local}${r.endereco ? ` (${r.endereco})` : ''}.`,
  // Estado EXIBIDO do dia (logica.js › estadoExibido): 'andamento' = Caça aberta (os carimbos validados já contam para o corte do dia);
  // 'em_breve' = a Caça ainda não abriu; 'agendado' = sem informação do período (nada é afirmado).
  estado: { em_breve: 'Em breve', andamento: 'Disputa em andamento', agendado: 'Dia de voucher', em_apuracao: 'Em apuração', resultado: 'Resultado confirmado' },
  estadoDica: {
    em_breve: 'A disputa deste dia ainda não começou.',
    andamento: 'A disputa já está aberta: você já pode acumular carimbos para este voucher.',
    agendado: 'Neste dia há voucher em disputa. As regras estão logo abaixo.',
    em_apuracao: 'O dia encerrou. A organização apura e confirma o resultado; ainda não há confirmação.',
    resultado: 'A organização já confirmou o voucher deste dia. Quem ganhou recebe o aviso no app e pelo contato do mapa.',
  },
  comoConcorre: (corte) => `Conta quem tem mais casas diferentes validadas até ${corte ? `as ${corte}` : 'o fim'} do dia (horário de Natal).`,
  fimDoDia: (corte) => `Quem tiver mais casas diferentes validadas${corte ? ` até as ${corte}` : ' até o corte'} (horário de Natal) concorre ao voucher do dia, e o sorteio é à noite. Em caso de empate, desempatam os carimbos extras e, se ainda empatar, há sorteio entre as pessoas empatadas.`,
  hoje: 'É hoje: a disputa está aberta e você ainda pode acumular carimbos até o corte.',
  comecaEm: (d) => `Os carimbos passam a valer em ${d.longa}.`,
  periodo: (i, f) => `A Caça aos Carimbos acontece de ${i.longa} a ${f.longa}.`,
  encerrada: (f) => `A Caça aos Carimbos encerrou em ${f.longa}.`,
  apurando: (d) => `O dia ${d.curta} encerrou e está em apuração. Ainda não há resultado confirmado.`,
  verTodos: 'Ver todos os dias',
  todosTitulo: 'Todos os dias de voucher',
  semDias: 'Os dias dos vouchers não estão disponíveis agora. Tente de novo em instantes.',
  tentar: 'Tentar de novo',
  carregando: 'Carregando os prêmios…',
  regrasTitulo: 'Como o voucher do dia é decidido',
  regras: (corte, validade, periodo, retirada) => [
    ...(periodo ? [`A Caça aos Carimbos acontece de ${periodo.inicio.longa} a ${periodo.fim.longa}.`] : []),
    `A classificação considera primeiro quem tem mais casas diferentes validadas até ${corte ? `as ${corte}` : 'o fim'} do dia.`,
    'Empate: os carimbos extras de revisitas desempatam. Se ainda empatar, há sorteio entre as pessoas empatadas.',
    'Cada pessoa ganha no máximo um voucher por dia, e continua na Caça e no prêmio final.',
    'Uma casa só conta na apuração quando o carimbo está validado pela avaliação. Carimbo pendente ainda não conta.',
    `A apuração fecha${corte ? ` às ${corte}` : ' no horário de corte'} e o sorteio acontece à noite do mesmo dia.`,
    validade ? `Os vouchers desta ação valem até ${validade.longa}.` : 'A validade dos vouchers está no regulamento.',
    ...(retirada ? [`${retirada.desde ? `A partir de ${retirada.desde.longa}, o` : 'O'} voucher é físico: quem ganha é avisado e retira no ${retirada.local}${retirada.endereco ? `, ${retirada.endereco}` : ''}.`] : []),
  ],
  // Voucher físico do ganhador: onde retirar e a confirmação de que ele viu o aviso. Data e horário entram por parâmetro.
  ganho: {
    titulo: 'Você ganhou um voucher!',
    dia: (d) => `Resultado do dia ${d}`,
    retire: 'Retire seu voucher',
    separado: 'Ele já está separado para você.',
    validade: (v) => `Válido até ${v}`,
    comoChegar: 'Como chegar',
    confirmaTitulo: 'Avise a organização',
    confirmaTexto: 'Toque no botão para dizer que você viu o aviso e sabe que ganhou. Assim a gente fica tranquilo.',
    confirmar: 'Vi o aviso e confirmo que ganhei',
    confirmando: 'Registrando…',
    confirmado: (quando) => `Confirmado em ${quando}. A organização já sabe que você viu.`,
  },
  // Prêmio final
  finalTitulo: 'Prêmio final',
  finalMeta: (total) => `Complete as ${total} casas`,
  finalSemTotal: 'Complete todas as casas do mapa',
  finalTexto: (ganhadores) => `Quem valida todas as casas concorre ao sorteio principal. ${ganhadores ? (ganhadores === 1 ? 'Há 1 ganhador previsto' : `Há ${ganhadores} ganhadores previstos`) : 'Há ganhadores previstos'}, e cada um leva o press kit oficial da edição e uma surpresa.`,
  finalExtras: 'Carimbos extras dão uma pequena vantagem no sorteio entre mapas completos. É uma vantagem pequena, não uma chance garantida.',
  finalRegras: 'Se houver poucos mapas completos, as vagas restantes seguem uma regra própria. Está no regulamento.',
  regulamento: 'Ler o regulamento',
  // Progresso pessoal
  progresso: (feitas, total) => `${feitas} de ${total} casas validadas`,
  faltam: (n) => (n === 0 ? 'Mapa completo!' : n === 1 ? 'Falta 1 casa' : `Faltam ${n} casas`),
  completo: 'Mapa completo: você concorre ao prêmio final.',
  pendentes: (n) => (n === 1 ? '1 carimbo aguarda avaliação. Só conta quando for validado.' : `${n} carimbos aguardam avaliação. Só contam quando forem validados.`),
  extras: (n) => (n === 1 ? '1 carimbo extra' : `${n} carimbos extras`),
  vouchersNaoTiram: 'Ganhar um voucher não tira você do prêmio final.',
  // Sem mapa / vazio
  semMapa: 'Crie seu mapa para acompanhar sua posição. Dá para conhecer os prêmios antes.',
  criarMapa: 'Criar meu mapa',
  vazio: 'Seu mapa está vazio. A primeira casa validada já entra na disputa dos vouchers.',
  // Diferenças
  diferencaTitulo: 'O que conta e o que não conta',
  diferenca: [
    ['Casa validada', 'Carimbo aprovado pela avaliação numa casa diferente. É o que conta para vouchers e prêmio final.'],
    ['Carimbo extra', 'Revisita a uma casa já validada. Não soma casa; só desempata e dá peso no sorteio final.'],
    ['Já fui', 'Anotação sua. Não conta casa, carimbo nem prêmio.'],
  ],
  // Metas
  metasTitulo: 'Metas comemorativas',
  metasNota: 'As metas comemoram seu caminho e não dão prêmio. O que vale como prêmio são os vouchers e o prêmio final.',
  metaProxima: (titulo, faltam) => `${titulo}: ${faltam === 1 ? 'falta 1 casa' : `faltam ${faltam} casas`}`,
  metasTodas: 'Você alcançou todas as metas!',
}
