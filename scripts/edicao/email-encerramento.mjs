/*
 * E-mails de encerramento da edição Cartoon (2026.2): agradecimento aos jogadores da Caça e aviso de quem disputa o prêmio final.
 * Saem do contato@ pela fila `email_fila` + edge `org-email` (migration 20270206). O SQL do envio troca os marcadores {{...}} por
 * linha; o e-mail NUNCA leva apelido nem outro texto livre do mapa (mesma regra de supabase/functions/caca-email/montar.js).
 *
 *   node scripts/edicao/email-encerramento.mjs herois   → arte do topo em public/images/email/encerramento/ (Playwright + Grandstander)
 *   node scripts/edicao/email-encerramento.mjs previa   → prévias em docs/cartoon-2026-2/previas-email/encerramento-*.{html,png}
 *   node scripts/edicao/email-encerramento.mjs modelo <obrigado|disputa>  → JSON { assunto, html, texto } com os marcadores, para o SQL
 *   node scripts/edicao/email-encerramento.mjs casas    → texto da mensagem às casas (painel)
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SITE = 'https://www.sweetcoffeeweek.com.br'
const IMG = { selo: '/images/email/selo-cartoon-email.png', apoios: '/images/email/apoios-email.png', obrigado: '/images/email/encerramento/obrigado.jpg', disputa: '/images/email/encerramento/disputa.jpg', revisao: '/images/email/encerramento/revisao.jpg' }
// Cenário de Natal colorido (o mesmo do prisma "Você decide!" e do adesivo). Mora no Dropbox da edição; só a arte final vai para o site.
const CENARIO = 'F:/F2 Experience Dropbox/Criação ELOI Design/SWEET&COFFEE WEEK/2026.2 SCW CARTOONS/06_MATERIAIS_PDV/01_ADESIVO_45X45/_bastidores/cenario-natal-colorido.png'
const CONTATO = 'contato@sweetcoffeeweek.com.br'

const F = 'Helvetica,Arial,sans-serif'
const FT = "'Arial Black',Arial,Helvetica,sans-serif"
const C = { creme: '#FDF0DE', amarelo: '#FDB901', choco: '#3A150F', rosa: '#E8195A', roxo: '#6424AB', vermelho: '#ED1C20', branco: '#FCFCFC' }

/* ---------- arte do topo (imagem: e-mail não carrega a Grandstander) ---------- */
const HEROIS = {
  obrigado: { fundo: C.amarelo, ponto: 'rgba(58,21,15,.13)', etiqueta: 'CAÇA AOS CARIMBOS', linhas: ['OBRIGADO,', 'SWEET LOVER!'], letra: C.rosa, sombra: C.choco },
  disputa: { fundo: C.roxo, ponto: 'rgba(253,240,222,.16)', etiqueta: 'PRÊMIO FINAL', linhas: ['TÁ NA', 'DISPUTA!'], letra: C.amarelo, sombra: C.vermelho },
  revisao: { fundo: C.creme, ponto: 'rgba(58,21,15,.10)', etiqueta: 'CAÇA AOS CARIMBOS', linhas: ['SOBRE O', 'SEU MAPA'], letra: C.roxo, sombra: C.amarelo },
}

function heroiHTML (h, cenario, fonte) {
  const giro = (s) => [...s].map((_, i) => [-5, 3, -2, 4, -3, 2, -4, 3][i % 8]).join(' ')
  const linha = (t, y, tam) => `
    <text x="276" y="${y + 10}" font-size="${tam}" fill="${C.choco}" stroke="${C.choco}" stroke-width="9" stroke-linejoin="round" rotate="${giro(t)}">${t}</text>
    <text x="273" y="${y + 5}" font-size="${tam}" fill="${h.sombra}" stroke="${h.sombra}" stroke-width="9" stroke-linejoin="round" rotate="${giro(t)}">${t}</text>
    <text x="270" y="${y}" font-size="${tam}" fill="${h.letra}" stroke="${C.choco}" stroke-width="9" stroke-linejoin="round" paint-order="stroke" rotate="${giro(t)}">${t}</text>`
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face { font-family: G; src: url('${fonte}') format('woff2'); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 540px; height: 400px; overflow: hidden; }
.h { position: relative; width: 540px; height: 400px; background: ${h.fundo}; background-image: radial-gradient(circle, ${h.ponto} 1.7px, transparent 2.1px); background-size: 11px 11px; }
.selo { position: absolute; left: 22px; top: 18px; width: 82px; filter: drop-shadow(3px 3px 0 ${C.choco}); }
.tag { position: absolute; left: 118px; top: 40px; font: 900 17px/1 G; letter-spacing: .5px; color: ${C.choco}; background: ${C.creme}; border: 3px solid ${C.choco}; border-radius: 10px; padding: 8px 14px 7px; box-shadow: 3px 3px 0 ${C.choco}; transform: rotate(-2deg); }
svg { position: absolute; left: 0; top: 104px; font-family: G; font-weight: 900; text-anchor: middle; }
.cid { position: absolute; left: -10px; bottom: -2px; width: 560px; }
</style></head><body><div class="h">
  <img class="cid" src="${cenario}">
  <img class="selo" src="${pathToFileURL(join(RAIZ, 'public', IMG.selo)).href}">
  <span class="tag">${h.etiqueta}</span>
  <svg width="540" height="150" viewBox="0 0 540 150">${linha(h.linhas[0], 50, 48)}${linha(h.linhas[1], 116, 56)}</svg>
</div></body></html>`
}

async function gerarHerois () {
  const { chromium } = await import('playwright')
  const dir = join(RAIZ, 'public', 'images', 'email', 'encerramento')
  mkdirSync(dir, { recursive: true })
  const b = await chromium.launch()
  const pg = await b.newPage({ viewport: { width: 540, height: 400 }, deviceScaleFactor: 2 })
  for (const [nome, h] of Object.entries(HEROIS)) {
    // Página em arquivo (não setContent): só uma página file:// carrega a fonte e as imagens locais.
    const tmp = join(tmpdir(), `scw-heroi-${nome}.html`)
    writeFileSync(tmp, heroiHTML(h, pathToFileURL(CENARIO).href, pathToFileURL(join(RAIZ, 'public', 'fonts', 'grandstander', 'grandstander-latin.woff2')).href))
    await pg.goto(pathToFileURL(tmp).href)
    await pg.waitForLoadState('networkidle')
    await pg.evaluate(() => document.fonts.ready)
    await pg.waitForTimeout(150)
    await pg.screenshot({ path: join(dir, `${nome}.jpg`), type: 'jpeg', quality: 88 })
  }
  await b.close()
}

/* ---------- corpo ---------- */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const p = (t, extra = '') => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${C.choco};${extra}">${t}</p>`
const titulo = (t, cor = C.rosa) => `<p style="margin:0 0 14px;font-family:${FT};font-weight:900;font-size:24px;line-height:1.2;color:${cor};">${t}</p>`
const subtitulo = (t) => `<p style="margin:6px 0 10px;font-family:${FT};font-weight:900;font-size:18px;line-height:1.25;color:${C.choco};">${t}</p>`
const caixa = (dentro, borda = C.choco, fundo = C.creme) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;"><tr><td style="background:${fundo};border:3px solid ${borda};border-radius:16px;padding:14px 18px;">${dentro}</td></tr></table>`

function moldura ({ assunto, previa, heroi, alt, corpo }) {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background:${C.creme};font-family:${F};color:${C.choco};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.creme};"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.branco};border:3px solid ${C.choco};border-radius:20px;box-shadow:6px 6px 0 ${C.choco};overflow:hidden;">
    <tr><td style="border-bottom:3px solid ${C.choco};font-size:0;line-height:0;"><img src="${SITE}${heroi}" width="560" alt="${esc(alt)}" style="display:block;width:100%;max-width:560px;height:auto;border:0;"></td></tr>
    <tr><td style="padding:28px 26px 10px;">
${corpo}
    </td></tr>
    <tr><td align="center" style="padding:6px 26px 22px;border-top:3px dashed #e9d6bd;"><img src="${SITE}${IMG.apoios}" width="400" alt="Realização F2 Experience · Patrocinador Sicredi · Apoios Faculdade Senac RN, Senac Fecomércio Sesc e Espaço Reduzido" style="display:block;width:100%;max-width:400px;height:auto;border:0;margin-top:16px;"></td></tr>
    <tr><td style="background:${C.choco};padding:16px 26px;font-size:13px;line-height:1.55;color:${C.creme};">
      <strong>Sweet &amp; Coffee Week · edição Cartoon</strong><br>5 a 15 de novembro de 2026 · Natal/RN<br>
      <span style="color:#d9c3a8;font-size:12px;">Você recebeu este e-mail porque participou da Caça aos Carimbos.</span>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`
}

const MAILTO = `mailto:${CONTATO}?subject=${encodeURIComponent('Como foi a minha Caça aos Carimbos')}`
// Assinatura (Wilker, 14/11): a Eline é a cara do festival; nome, cargo e @ conferidos no perfil dela (bio: "Curadora de @sweetcoffeeweek").
const ELINE = { nome: 'Eline Eulália', cargo: 'Curadora do Sweet & Coffee Week', insta: 'linelalia' }
const assinatura = () => `<p style="margin:4px 0 6px;font-size:16px;line-height:1.6;color:${C.choco};">Um abraço doce,</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr><td style="border-left:5px solid ${C.rosa};padding:2px 0 2px 14px;font-size:14px;line-height:1.55;color:#5a4038;">
<span style="font-family:${FT};font-weight:900;font-size:19px;color:${C.rosa};">${ELINE.nome}</span><br>
${ELINE.cargo} · <a href="https://www.instagram.com/${ELINE.insta}/" style="color:${C.roxo};font-weight:700;text-decoration:none;">@${ELINE.insta}</a><br>
e toda a equipe do festival</td></tr></table>`
const ASSINATURA_TEXTO = ['Um abraço doce,', `${ELINE.nome} (@${ELINE.insta})`, ELINE.cargo, 'e toda a equipe do festival']

/** Mensagem às casas (painel › Mensagens, texto puro), aprovada pelo Wilker em 14/11. */
export const MENSAGEM_CASAS = [
  'Oi, pessoal! A edição Cartoon do Sweet & Coffee Week chegou ao fim, e a gente quer começar agradecendo de verdade: pelo combo pensado com tanto carinho, pela equipe que recebeu cada Sweet Lover e por toparem entrar nessa com a gente.',
  '',
  'Agora queremos ouvir vocês. Como foi participar? O que funcionou bem, o que deu trabalho, o que vocês mudariam? Pode mandar elogio, crítica ou sugestão, do jeito que vier: cada comentário é lido e analisado pela organização e faz muita diferença para as próximas edições.',
  '',
  'Separamos um espaço no painel só para isso: "Sua opinião", no Início (ou direto em https://www.sweetcoffeeweek.com.br/painel/#opiniao). Leva poucos minutos. Se preferir, pode responder aqui mesmo, nas mensagens.',
  '',
  'E o que vem por aí:',
  '• O Sweet Awards vai ser apurado agora, e o resultado sai em breve.',
  '• Depois do resultado, cada casa recebe um relatório só seu, com o resumo das avaliações dos Sweet Lovers.',
  '',
  'Obrigado por fazer parte!',
  '',
  ...ASSINATURA_TEXTO,
].join('\n')
const botao = (t, href) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 14px;"><tr><td style="background:${C.amarelo};border:3px solid ${C.choco};border-radius:14px;box-shadow:4px 4px 0 ${C.choco};"><a href="${href}" style="display:inline-block;padding:13px 24px;font-family:${FT};font-weight:900;font-size:17px;color:${C.choco};text-decoration:none;">${t}</a></td></tr></table>`

/** Modelos com marcadores. obrigado: {{CASAS_TEXTO}} ("1 casa carimbada" / "12 casas carimbadas"). disputa: {{WPP_HTML}} e {{WPP_TEXTO}} (vazios quando há WhatsApp). */
export const MODELOS = {
  obrigado () {
    const assunto = 'Obrigado por caçar carimbos com a gente!'
    const html = moldura({
      assunto, previa: 'A edição Cartoon terminou, e a gente quer saber como foi para você.', heroi: IMG.obrigado,
      alt: 'Obrigado, Sweet Lover! Caça aos Carimbos, edição Cartoon do Sweet & Coffee Week',
      corpo: [
        titulo('Oi, Sweet Lover!'),
        p('A edição Cartoon do Sweet &amp; Coffee Week terminou, e a gente não podia deixar passar sem dizer obrigado. Foram onze dias de combos novos, casas descobertas e carimbo atrás de carimbo, e você fez parte disso.'),
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="background:${C.rosa};border:3px solid ${C.choco};border-radius:999px;box-shadow:3px 3px 0 ${C.choco};padding:9px 18px;font-family:${FT};font-weight:900;font-size:15px;color:${C.branco};">Seu mapa terminou com {{CASAS_TEXTO}}</td></tr></table>`,
        subtitulo('Agora é a sua vez de falar'),
        p('Como foi a Caça para você? O que você amou, o que deu errado, o que faria diferente? Pode mandar elogio, crítica ou ideia, do jeito que vier. Cada mensagem é lida com calma pela nossa equipe e ajuda a deixar o festival ainda melhor.'),
        botao('Contar como foi', MAILTO),
        p(`Se preferir, é só responder este e-mail. Ele chega direto em <strong>${CONTATO}</strong>.`, 'font-size:14px;color:#5a4038;'),
        assinatura(),
      ].join('\n'),
    })
    const texto = ['Oi, Sweet Lover!', '', 'A edição Cartoon do Sweet & Coffee Week terminou, e a gente não podia deixar passar sem dizer obrigado. Foram onze dias de combos novos, casas descobertas e carimbo atrás de carimbo, e você fez parte disso.', '', 'Seu mapa terminou com {{CASAS_TEXTO}}.', '', 'Agora é a sua vez de falar: como foi a Caça para você? O que você amou, o que deu errado, o que faria diferente? Pode mandar elogio, crítica ou ideia, do jeito que vier. Cada mensagem é lida com calma pela nossa equipe e ajuda a deixar o festival ainda melhor.', '', `É só responder este e-mail ou escrever para ${CONTATO}.`, '', ...ASSINATURA_TEXTO].join('\n')
    return { assunto, html, texto }
  },
  disputa () {
    const assunto = 'Você está na disputa do prêmio final da Caça aos Carimbos'
    const html = moldura({
      assunto, previa: 'O resultado sai nesta segunda, 16/11.', heroi: IMG.disputa,
      alt: 'Tá na disputa! Prêmio final da Caça aos Carimbos, edição Cartoon do Sweet & Coffee Week',
      corpo: [
        titulo('Oi, Sweet Lover!'),
        p('Que caminhada! Você chegou ao fim da Caça aos Carimbos entre as pessoas que disputam o prêmio final: <strong>o press kit oficial da edição Cartoon + uma surpresa</strong>.'),
        caixa([
          subtitulo('Como fica daqui pra frente'),
          p('<strong>O resultado sai nesta segunda, 16/11.</strong> Antes de divulgar, a nossa equipe confere tudo com cuidado.', 'margin-bottom:10px;'),
          p('<strong>A forma de entrega do prêmio ainda está sendo definida.</strong> Quem ganhar recebe o nosso contato com todos os detalhes.', 'margin-bottom:4px;'),
        ].join('')),
        '{{WPP_HTML}}',
        p('E, ganhando ou não, obrigado por ter ido tão longe com a gente. Você foi uma das pessoas que mais aproveitaram esta edição.'),
        p('<strong>Torcendo por você!</strong>'),
        assinatura(),
      ].join('\n'),
    })
    const texto = ['Oi, Sweet Lover!', '', 'Que caminhada! Você chegou ao fim da Caça aos Carimbos entre as pessoas que disputam o prêmio final: o press kit oficial da edição Cartoon + uma surpresa.', '', 'Como fica daqui pra frente:', '- O resultado sai nesta segunda, 16/11. Antes de divulgar, a nossa equipe confere tudo com cuidado.', '- A forma de entrega do prêmio ainda está sendo definida. Quem ganhar recebe o nosso contato com todos os detalhes.', '{{WPP_TEXTO}}', 'E, ganhando ou não, obrigado por ter ido tão longe com a gente. Você foi uma das pessoas que mais aproveitaram esta edição.', '', 'Torcendo por você!', '', ...ASSINATURA_TEXTO].join('\n')
    return { assunto, html, texto }
  },
}

/**
 * Anulação de carimbos na conferência final (Wilker, 14/11): texto respeitoso, motivo, base no regulamento, direito de contestar.
 * Marcadores: {{MOTIVO_HTML}}/{{MOTIVO_TEXTO}} (MOTIVOS abaixo) e {{CASAS_HTML}}/{{CASAS_TEXTO}} (lista das casas anuladas).
 */
MODELOS.anulacao = function () {
  const assunto = 'Sobre alguns carimbos do seu mapa na Caça aos Carimbos'
  const resposta = `mailto:${CONTATO}?subject=${encodeURIComponent('Revisão dos meus carimbos')}`
  const html = moldura({
    assunto, previa: 'Na conferência final, alguns carimbos do seu mapa não puderam ser mantidos. Explicamos aqui.', heroi: IMG.revisao,
    alt: 'Sobre o seu mapa. Caça aos Carimbos, edição Cartoon do Sweet & Coffee Week',
    corpo: [
      titulo('Oi, Sweet Lover!', C.roxo),
      p('Antes de tudo, obrigado por ter entrado na Caça aos Carimbos da edição Cartoon. Foi muito bom ver tanta gente rodando a cidade atrás dos combos.'),
      p('Antes de divulgar os ganhadores, a nossa equipe confere todos os mapas, carimbo por carimbo. Nessa conferência, <strong>alguns carimbos do seu mapa precisaram ser anulados</strong>, e a gente quer explicar o porquê com transparência.'),
      caixa([subtitulo('O que aconteceu'), '{{MOTIVO_HTML}}', subtitulo('Carimbos anulados'), '{{CASAS_HTML}}'].join('')),
      p('O regulamento da Caça já previa essa etapa: a organização confere os mapas antes do resultado e pode anular carimbos que não comprovam a visita. Os outros carimbos do seu mapa continuam valendo normalmente.'),
      subtitulo('Acha que foi um engano?'),
      p('Pode contestar, sim. Responda este e-mail contando como foi a visita e, se tiver, mande a foto original, tirada por você na casa. A gente analisa cada caso com atenção e, se a visita se confirmar, o carimbo volta para o seu mapa. Como o resultado do prêmio final sai na segunda, 16/11, quanto antes você escrever, melhor.'),
      botao('Pedir revisão', resposta),
      p('Obrigado pela compreensão e por fazer parte desta edição com a gente.'),
      `<p style="margin:4px 0 18px;font-size:16px;line-height:1.6;color:${C.choco};">Um abraço,<br><strong>Equipe Sweet &amp; Coffee Week</strong><br><span style="font-size:14px;color:#5a4038;">${CONTATO}</span></p>`,
    ].join('\n'),
  })
  const texto = ['Oi, Sweet Lover!', '', 'Antes de tudo, obrigado por ter entrado na Caça aos Carimbos da edição Cartoon. Foi muito bom ver tanta gente rodando a cidade atrás dos combos.', '', 'Antes de divulgar os ganhadores, a nossa equipe confere todos os mapas, carimbo por carimbo. Nessa conferência, alguns carimbos do seu mapa precisaram ser anulados, e a gente quer explicar o porquê com transparência.', '', 'O que aconteceu:', '{{MOTIVO_TEXTO}}', '', 'Carimbos anulados:', '{{CASAS_TEXTO}}', '', 'O regulamento da Caça já previa essa etapa: a organização confere os mapas antes do resultado e pode anular carimbos que não comprovam a visita. Os outros carimbos do seu mapa continuam valendo normalmente.', '', 'Acha que foi um engano? Pode contestar, sim. Responda este e-mail contando como foi a visita e, se tiver, mande a foto original, tirada por você na casa. A gente analisa cada caso com atenção e, se a visita se confirmar, o carimbo volta para o seu mapa. Como o resultado do prêmio final sai na segunda, 16/11, quanto antes você escrever, melhor.', '', 'Obrigado pela compreensão e por fazer parte desta edição com a gente.', '', 'Um abraço,', 'Equipe Sweet & Coffee Week', CONTATO].join('\n')
  return { assunto, html, texto }
}
/** Motivo por tipo de anulação (texto curto, sem acusar; o HTML vai dentro da caixa). */
export const MOTIVOS = {
  print: 'Estes carimbos vieram de pedidos de visita com uma foto que é uma captura de tela (print) de outra imagem, sem nenhum relato da visita. Um print não mostra que a visita foi sua, então ele não comprova a presença na casa.',
  sem_prova: 'Estes carimbos vieram de pedidos aprovados sem foto e sem nenhum relato da visita. Na conferência final, só continuam valendo os carimbos feitos na casa com a localização conferida e os pedidos com foto ou relato da visita.',
  gps: 'Estes carimbos foram feitos com uma localização que não é a real do celular (aplicativo de GPS falso ou simulador): todos chegaram com a mesma precisão de 1 metro, um sinal que o GPS de verdade não dá.',
}
export const motivoHTML = (tipos) => tipos.map((t) => p(esc(MOTIVOS[t]), 'margin-bottom:10px;')).join('')
export const motivoTexto = (tipos) => tipos.map((t) => MOTIVOS[t]).join('\n\n')
export const casasHTML = (casas) => `<ul style="margin:0 0 4px;padding-left:20px;font-size:16px;line-height:1.6;color:${C.choco};">${casas.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`
export const casasTextoLista = (casas) => casas.map((c) => `- ${c}`).join('\n')

export const WPP_HTML = caixa(p('<strong>Falta só uma coisa:</strong> não temos o seu WhatsApp. Responda este e-mail com o seu número para a gente conseguir falar com você.', 'margin:0;'), C.rosa)
export const WPP_TEXTO = '\nFalta só uma coisa: não temos o seu WhatsApp. Responda este e-mail com o seu número para a gente conseguir falar com você.\n'
export const casasTexto = (n) => (n === 1 ? '1 casa carimbada' : `${n} casas carimbadas`)

/* ---------- prévias locais ---------- */
async function previa () {
  const { chromium } = await import('playwright')
  const dir = join(RAIZ, 'docs', 'cartoon-2026-2', 'previas-email')
  const local = (h) => h.replaceAll(SITE + '/images/', pathToFileURL(join(RAIZ, 'public', 'images')).href + '/')
  const pecas = {
    'encerramento-obrigado': MODELOS.obrigado().html.replace('{{CASAS_TEXTO}}', casasTexto(12)),
    'encerramento-disputa': MODELOS.disputa().html.replace('{{WPP_HTML}}', ''),
    'encerramento-disputa-sem-whatsapp': MODELOS.disputa().html.replace('{{WPP_HTML}}', WPP_HTML),
    'anulacao-print': MODELOS.anulacao().html.replace('{{MOTIVO_HTML}}', motivoHTML(['print'])).replace('{{CASAS_HTML}}', casasHTML(['Jolie Café Pâtisserie', 'Mangai'])),
  }
  const b = await chromium.launch()
  for (const [nome, html] of Object.entries(pecas)) {
    writeFileSync(join(dir, `${nome}.html`), local(html))
    for (const [tela, w] of [['', 640], ['-celular', 390]]) {
      const pg = await b.newPage({ viewport: { width: w, height: 800 }, deviceScaleFactor: tela ? 2 : 1 })
      await pg.goto(pathToFileURL(join(dir, `${nome}.html`)).href)
      await pg.waitForLoadState('networkidle')
      await pg.screenshot({ path: join(dir, `${nome}${tela}.png`), fullPage: true })
      await pg.close()
    }
  }
  await b.close()
}

const [cmd, arg] = process.argv.slice(2)
if (cmd === 'herois') await gerarHerois()
else if (cmd === 'previa') await previa()
else if (cmd === 'modelo' && MODELOS[arg]) process.stdout.write(JSON.stringify(MODELOS[arg]()))
else if (cmd === 'casas') process.stdout.write(MENSAGEM_CASAS)
else if (cmd) { console.error('uso: herois | previa | modelo <obrigado|disputa|anulacao> | casas'); process.exit(1) }
