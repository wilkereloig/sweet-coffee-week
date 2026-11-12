/*
 * Guia "Como carimbar" (09/11/2026, pedido do Wilker: as pessoas não entendem como participar nem como registrar o carimbo).
 * Cada frase descreve o fluxo REAL (Carimbo.jsx, mapa_carimbar, delivery, visita anterior, campanha do Sicredi) e as regras do
 * regulamento vigente (regulamento.js): mudou a regra, muda aqui. Nada promete prêmio nem carimbo antes da confirmação.
 */
import { CACA_CAMINHOS as RUA } from '../textos.js'

export const CHAVE_GUIA = 'scw_caca_guia' // 'visto' depois de abrir o guia ou dispensar a introdução; só neste aparelho

export const GUIA = {
  abrir: 'Como carimbar?',
  completo: 'Ver o guia completo e o que fazer se não der certo',
  titulo: 'Como carimbar',
  fechar: 'Fechar: Como carimbar',
  lead: 'Quem carimba é você, pelo celular, quando está na casa. Ninguém da casa precisa fazer nada.',
  passos: [
    { titulo: 'Crie o seu mapa', texto: 'Apelido e e-mail, sem senha. Ele fica guardado neste aparelho e junta os seus carimbos.' },
    { titulo: 'Vá a uma casa e peça o combo', texto: 'Escolha no Mapa da Doçura ou na lista de casas.' },
    { titulo: 'Carimbe ainda na casa', texto: 'Aponte a câmera para o QR do display de mesa: abre a página da casa. Toque em "Carimbar" e, na tela seguinte, em "Carimbar aqui", com a localização do celular ligada. Pelo mapa também dá: abra a casa e toque em "Carimbar aqui". O celular confere que você está lá; a posição não é guardada.' },
    { titulo: 'Avalie o combo daquela casa', texto: 'Use o mesmo e-mail do mapa. Na primeira vez em cada casa o carimbo fica pendente até a avaliação. Pode avaliar antes ou depois de carimbar.' },
    { titulo: 'Confira', texto: 'A tela mostra "Carimbado!" e a casa entra na sua conta de casas validadas, na sua Caça e no mapa.' },
  ],
  duvidasTitulo: 'Não deu certo? Veja o seu caso',
  duvidas: [
    { p: 'A localização não funcionou', r: 'Ligue a localização e a precisão do celular, fique perto da entrada e toque em "Tentar de novo". Depois de duas falhas seguidas, a própria tela oferece o pedido de revisão: a organização confere a sua visita.' },
    { p: 'Meu carimbo ficou pendente', r: 'Falta avaliar o combo daquela casa com o mesmo e-mail do mapa. O botão "Avaliar o combo" aparece na sua Caça e no mapa, em "Próximo passo".', acao: 'Abrir minha Caça', href: RUA.central },
    { p: 'Pedi o combo por delivery', r: 'Use "Carimbo do meu delivery". Você manda um código para a casa confirmar a entrega ou pede a análise da organização. Nada conta antes da confirmação, e a casa só vale depois da avaliação.', acao: 'Carimbo do meu delivery', href: RUA.delivery },
    { p: 'Fui à casa e não carimbei', r: 'Peça o carimbo da visita: a organização analisa o pedido e avisa o resultado.', acao: 'Pedir carimbo de uma visita', href: RUA.visitaAnterior },
    { p: 'Posso carimbar a mesma casa de novo?', r: 'Sim, depois de 12 horas. Vira um carimbo extra: não soma casa, serve de desempate e de peso no sorteio final.' },
    { p: 'Troquei de celular ou perdi o mapa', r: 'Recupere pelo e-mail que você usou no mapa.', acao: 'Recuperar meu mapa', href: RUA.recuperar },
    { p: 'E o carimbo Sicredi?', r: 'É o carimbo especial da campanha do patrocinador: você participa, envia o print e a organização aprova. A agência não conta como casa.', acao: 'Ver a campanha', href: RUA.sicredi },
  ],
  regulamento: 'Regulamento completo',
  // Introdução do primeiro acesso: um cartão na própria tela, nunca uma janela por cima.
  intro: {
    titulo: 'Primeira vez na Caça aos Carimbos?',
    texto: 'Vá a uma casa, peça o combo, carimbe pelo celular e avalie. São cinco passos curtos.',
    ver: 'Ver como carimbar',
    depois: 'Agora não',
  },
}

/*
 * Boas-vindas de quem ainda não tem mapa (12/11/2026, pedido do Wilker: "a tela de primeira vez precisa ser interessante, de querer fazer o mapa: uma
 * mensagem de bem-vindo, o que a pessoa pode ganhar, como carimbar; e quem já tem mapa, a opção de recuperar"). Antes eram dois cartões dizendo "primeira
 * vez" e "crie agora". O que a pessoa pode ganhar NÃO é escrito aqui: vem do banco pela mesma lista do pop-up "O que você disputa" (voucher do dia, prêmio
 * final, campanha do Sicredi), então só aparece o que está valendo. Os passos são a versão curta do guia acima (GUIA.passos): mudou o fluxo, muda nos dois.
 */
export const BOAS_VINDAS = {
  apoio: 'Boas-vindas, Sweet Lover!',
  titulo: 'Vamos caçar carimbos?',
  texto: 'Visite as casas do festival, peça o combo e carimbe pelo celular. Cada casa diferente vai para o seu mapa e conta para os prêmios.',
  jaTem: 'Já tem um mapa?',
  ganharTitulo: 'O que você pode ganhar',
  comoTitulo: 'Como carimbar, em quatro passos',
  passos: [
    { titulo: 'Crie seu mapa', texto: 'Só apelido e e-mail, sem senha. Ele junta os seus carimbos.', icone: 'mapa' },
    { titulo: 'Peça o combo', texto: 'Escolha uma casa no Mapa da Doçura e peça o combo lá.', icone: 'casas' },
    { titulo: 'Carimbe pelo celular', texto: 'Ainda na casa, aponte a câmera para o QR da mesa e toque em Carimbar.', icone: 'ja-fui' },
    { titulo: 'Avalie o combo', texto: 'A casa só entra no seu mapa depois da sua avaliação.', icone: 'avaliar' },
  ],
}
