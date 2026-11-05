/*
 * caca-email — parte PURA (sem rede, sem Deno): montagem do e-mail, escape, remetente e política de nova tentativa.
 * Fica em .js para a edge function (Deno) e os testes (node --test tests/cartoon-caca-email.test.mjs) importarem o mesmo arquivo.
 *
 * O e-mail NÃO leva o apelido do mapa nem qualquer dado dele: o apelido é texto livre da pessoa e, num e-mail que sai do
 * nosso domínio para um terceiro, viraria canal para injetar frase ou link (alguém cria mapa com o e-mail da vítima).
 * O único dado dinâmico é o código, que só passa se forem exatamente 6 dígitos.
 */

export const VALIDADE_MIN = 10

/** Escape de HTML para qualquer texto dinâmico que um dia entre no corpo. */
export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export const codigoValido = (c) => typeof c === 'string' && /^\d{6}$/.test(c)


/*
 * Visual da edição Cartoon (paleta do manual v03, src/styles/scw-cartoon.css): faixa amarela com o selo, caixa de traço grosso e sombra
 * dura de gibi, rodapé chocolate. Tudo em tabela + estilo inline (e-mail não aceita CSS externo nem a fonte Grandstander: o título cai para
 * Arial Black). A imagem é PNG (Outlook não lê WebP) e mora no site; `alt` descreve a marca para quem bloqueia imagem. Nenhum <a> aqui.
 */
export const ARTE_SELO = `${'https://www.sweetcoffeeweek.com.br'}/images/email/selo-cartoon-email.png`
const FONTE = 'Helvetica,Arial,sans-serif'
const FONTE_TITULO = "'Arial Black',Arial,Helvetica,sans-serif"

/** Moldura comum dos e-mails da Caça. `corpo` já vem escapado (só texto da casa, nunca dado do mapa). */
function moldura (assunto, corpo) {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background:#FDF0DE;font-family:${FONTE};color:#3A150F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDF0DE;"><tr><td align="center" style="padding:28px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#FCFCFC;border:3px solid #3A150F;border-radius:18px;box-shadow:6px 6px 0 #3A150F;overflow:hidden;">
      <tr><td style="background:#FDB901;border-bottom:3px solid #3A150F;padding:14px 22px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td width="84" style="padding-right:14px;"><img src="${ARTE_SELO}" width="84" height="83" alt="Sweet &amp; Coffee Week Cartoon" style="display:block;border:0;width:84px;height:auto;"></td>
          <td style="font-family:${FONTE_TITULO};font-size:22px;line-height:1.15;color:#3A150F;font-weight:900;">Caça aos<br>Carimbos</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:26px 26px 8px;font-size:16px;line-height:1.6;color:#3A150F;">
        <p style="margin:0 0 14px;font-family:${FONTE_TITULO};font-weight:900;font-size:22px;color:#E8195A;">Oi, Sweet Lover!</p>
${corpo}
      </td></tr>
      <tr><td style="background:#3A150F;padding:14px 26px;font-size:13px;line-height:1.5;color:#FDF0DE;">Sweet &amp; Coffee Week · edição Cartoon</td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

const nota = (t) => `<p style="margin:0 0 14px;color:#5a4038;font-size:14px;">${esc(t)}</p>`

const FINALIDADES = {
  recuperar: {
    acao: 'abrir de novo o seu mapa da Caça aos Carimbos neste aparelho',
    aviso: 'Ao abrir o mapa com este código, o link antigo deste mapa deixa de funcionar.',
  },
  confirmar: {
    acao: 'confirmar o seu e-mail na Caça aos Carimbos',
    aviso: '',
  },
}

/** `{ assunto, html, texto }` ou `null` se finalidade/código forem inválidos (nunca monta e-mail com dado estranho). */
export function montarEmail (finalidade, codigo) {
  const f = FINALIDADES[finalidade]
  if (!f || !codigoValido(codigo)) return null
  const assunto = `${codigo} é o seu código da Caça aos Carimbos`
  const tempo = `Ele vale por ${VALIDADE_MIN} minutos e só pode ser usado uma vez.`
  const ignore = 'Se não foi você quem pediu, ignore este e-mail. Ninguém acessa o seu mapa só com o seu e-mail.'
  const html = moldura(assunto, `        <p style="margin:0 0 16px;">Use este código para ${esc(f.acao)}:</p>
        <p style="margin:0 0 18px;text-align:center;"><span style="display:inline-block;background:#FDB901;border:3px solid #3A150F;border-radius:14px;box-shadow:4px 4px 0 #3A150F;padding:10px 22px;font-family:${FONTE_TITULO};font-size:38px;letter-spacing:8px;font-weight:900;color:#3A150F;">${esc(codigo)}</span></p>
        <p style="margin:0 0 14px;">${esc(tempo)}</p>
        ${f.aviso ? `<p style="margin:0 0 14px;padding:10px 14px;background:#FDF0DE;border:3px solid #E8195A;border-radius:14px;font-size:15px;font-weight:700;">${esc(f.aviso)}</p>` : ''}
        ${nota(ignore)}`)
  const texto = ['Oi, Sweet Lover!', '', `Use este código para ${f.acao}: ${codigo}`, '', tempo, ...(f.aviso ? [f.aviso] : []), '', ignore, '', 'Sweet & Coffee Week, edição Cartoon'].join('\n')
  return { assunto, html, texto }
}

/**
 * LINK PESSOAL por e-mail (05/11/2026), só depois do e-mail confirmado (a edge confere no banco). O link é uma CREDENCIAL:
 * vai como TEXTO PURO, sem <a>, para o provedor não reescrever o endereço em link de contagem de cliques (a chave passaria
 * por servidor de terceiro). Só entra chave de exatamente 32 caracteres [A-Za-z0-9_-]; qualquer outra coisa não monta e-mail.
 * Mesmo formato de src/edicao/rota/carimbo.js (linkDoMapa) e FORMATO_CHAVE.
 */
export const SITE_ORIGEM = 'https://www.sweetcoffeeweek.com.br'
export const chaveDoMapaValida = (c) => typeof c === 'string' && /^[A-Za-z0-9_-]{32}$/.test(c)
export const linkDoMapaPorEmail = (chave) => (chaveDoMapaValida(chave) ? `${SITE_ORIGEM}/cartoon/mapa#mapa=${chave}` : null)

/** `{ assunto, html, texto }` ou `null` se a chave for inválida. */
export function montarEmailLink (chave) {
  const link = linkDoMapaPorEmail(chave)
  if (!link) return null
  const assunto = 'O link do seu mapa da Caça aos Carimbos'
  const aviso = 'Este link é como uma senha: quem tiver o link abre o seu mapa. Guarde só para você e não poste nem mande para outras pessoas.'
  const uso = 'Para abrir o seu mapa em outro celular, copie o endereço abaixo e cole no navegador.'
  const validade = 'Este link vale até você recuperar o mapa em outro aparelho: aí ele é trocado por um novo.'
  const ignore = 'Se não foi você quem pediu, ignore este e-mail. Se você perder o acesso, dá para recuperar o mapa com o código que enviamos para este e-mail.'
  const html = moldura(assunto, `        <p style="margin:0 0 14px;">Seu e-mail foi confirmado. ${esc(uso)}</p>
        <p style="margin:0 0 16px;padding:12px 14px;background:#FDF0DE;border:3px solid #3A150F;border-radius:14px;font-size:15px;word-break:break-all;color:#6424AB;font-weight:700;">${esc(link)}</p>
        <p style="margin:0 0 14px;padding:10px 14px;background:#FDF0DE;border:3px solid #E8195A;border-radius:14px;font-size:15px;font-weight:700;">${esc(aviso)}</p>
        ${nota(validade)}
        ${nota(ignore)}`)
  const texto = ['Oi, Sweet Lover!', '', `Seu e-mail foi confirmado. ${uso}`, '', link, '', aviso, '', validade, '', ignore, '', 'Sweet & Coffee Week, edição Cartoon'].join('\n')
  return { assunto, html, texto }
}

/** `"Nome <a@b.com>"` ou `"a@b.com"` → `{ nome, email }`; qualquer outra coisa → null. */
export function parseRemetente (bruto) {
  const s = String(bruto ?? '').trim()
  const m = /^(?:(.*?)\s*)?<([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>$/.exec(s) || /^()([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)$/.exec(s)
  if (!m) return null
  return { nome: (m[1] || '').replace(/^"|"$/g, '').trim(), email: m[2] }
}

/**
 * Remetente padrão (endereço público da marca, não é segredo): vale quando CACA_EMAIL_FROM/EMAIL_FROM não existem.
 * O domínio precisa estar verificado no provedor; se não estiver, o provedor recusa (403) e o log mostra — aí basta
 * definir CACA_EMAIL_FROM com um remetente verificado. Mesmo endereço do exemplo da send-vote-email.
 */
export const REMETENTE_PADRAO = 'Sweet & Coffee Week <ola@sweetcoffeeweek.com.br>'

/**
 * Nomes (nunca valores) das variáveis que faltam. Resend precisa de RESEND_API_KEY + remetente; Brevo de BREVO_API_KEY + remetente.
 * `env` é um objeto simples { NOME: valor } — a function monta com Deno.env.get.
 */
export function provedorEscolhido (env) {
  const bruto = env.CACA_EMAIL_FROM || env.EMAIL_FROM || REMETENTE_PADRAO
  const remetente = parseRemetente(bruto)
  const faltam = []
  if (!remetente) faltam.push('CACA_EMAIL_FROM (ou EMAIL_FROM) válido')
  if (!env.RESEND_API_KEY && !env.BREVO_API_KEY) faltam.push('RESEND_API_KEY')
  if (faltam.length) return { provedor: null, faltam }
  return { provedor: env.RESEND_API_KEY ? 'resend' : 'brevo', remetente, bruto, faltam: [] }
}

/** Política de nova tentativa por status HTTP do provedor (0 = rede/timeout). Uma única repetição, nunca em 4xx de pedido. */
export function politicaFalha (status) {
  if (status === 0 || status === 408 || status === 429 || status >= 500) return { repetir: true, espera: status === 429 ? 2000 : 800 }
  return { repetir: false, espera: 0 }
}

/**
 * Mensagem de erro do provedor, limpa para o log: sem e-mail, sem sequência longa de dígitos/letras (chave, código), até 120
 * caracteres. Serve para a organização saber a ação certa (ex.: "chave não encontrada" × "IP não autorizado") sem expor dado.
 */
export function mensagemParaLog (msg) {
  return String(msg ?? '')
    .replace(/[^\s@]+@[^\s@]+/g, '[email]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[token]')
    .replace(/\d{6,}/g, '[num]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

/** O front só fala de motivos conhecidos; motivo estranho vira 'rede'. Mantido aqui para o teste travar a lista. */
export const MOTIVOS_PUBLICOS = ['email_indisponivel', 'falha_temporaria', 'pedido_invalido', 'metodo_nao_permitido']

/**
 * Endereço entregável: só caracteres seguros na parte local e no domínio (nada de vírgula, aspas, <>, espaço ou ';'). O valor vai
 * direto ao campo "to" do provedor; um endereço como `a,b@x.com` poderia virar dois destinatários. SEC-07, 05/11/2026.
 * Espelha o regex do banco (migration 20261220). Endereço com acentos ou aspas na parte local fica de fora de propósito.
 */
export const EMAIL_ENTREGAVEL = /^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$/
export const emailEntregavel = (e) => typeof e === 'string' && e.length <= 254 && EMAIL_ENTREGAVEL.test(e.trim().toLowerCase())

/**
 * Tempo mínimo (ms) de toda resposta aceita, mais um acréscimo aleatório: a RPC faz mais escritas quando há mapa do que quando não
 * há, e a diferença de milissegundos não pode virar canal para descobrir quem tem mapa. `sorteio` ∈ [0,1) (injetável no teste).
 */
export const PISO_RESPOSTA_MS = 600
export const JITTER_RESPOSTA_MS = 200
export const esperaParaPiso = (decorridoMs, sorteio = Math.random()) =>
  Math.max(0, PISO_RESPOSTA_MS - Math.max(0, Number(decorridoMs) || 0)) + Math.floor(Math.min(Math.max(sorteio, 0), 0.999999) * JITTER_RESPOSTA_MS)
