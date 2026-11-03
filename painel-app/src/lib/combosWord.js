/*
 * "Baixar Word" de Social media › Participantes (31/10/2026): o mesmo documento entregue ao Wilker (v3.1) — capa com a lista e,
 * depois, uma página por participante com os campos fixos. Recebe a lista JÁ revisada (`paraTexto`). A biblioteca `docx`
 * só é baixada no clique (import dinâmico): quem não baixa Word não paga o peso dela.
 */
import {
  AGUARDANDO, NAO_INFORMADO, TIPOS, preenchido, arroba, real, selosEAlergenicos, trocasEOpcoes, ONDE_DESCRICAO,
  enderecoTexto, foneTexto, atendimentoTexto,
} from './combosTexto.js'

const t = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim()
const ROTULO_TIPO = Object.fromEntries(TIPOS)
const CHOCOLATE = '3B2416', MARROM = '7A5C47', LARANJA = 'C2410C', LINHA = 'D9C8B4', BEGE = 'F6EEE3', VERDE = '15803D'
const COR_TIPO = { doce: 'C2185B', salgado: 'A16207', bebida: '1D4ED8' }
const COR_STATUS = { aprovado: VERDE, em_analise: '1D4ED8', correcao_solicitada: LARANJA, rascunho: MARROM }

const SITUACAO = {
  aprovado: 'Combo aprovado pela organização',
  em_analise: 'Combo em análise',
  correcao_solicitada: 'Ajuste pedido à marca',
  rascunho: 'Combo em preenchimento (a marca ainda pode mudar)',
}
/** Situação por extenso, sem emoji (o Word é para ler). */
export function situacaoTexto(d) {
  if (!preenchido(d)) return 'Combo ainda não preenchido'
  return (SITUACAO[d.combo_status] || '') + (d.alterado_apos_aprovacao ? ' · a marca alterou depois de aprovado' : '')
}

/** Monta o .docx. `lista` = participantes revisados; `horario(u)` = frase do horário; devolve um Blob. */
export async function gerarWordCombos(lista, { edicao = null, posicao = '', horario = () => '' } = {}) {
  const D = await import('docx')
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType, HeadingLevel, Footer, PageNumber } = D
  const run = (text, o = {}) => new TextRun({ text, ...o })
  const W = [2300, 7338]
  const borda = { style: BorderStyle.SINGLE, size: 4, color: LINHA }
  const bordas = { top: borda, bottom: borda, left: borda, right: borda }
  const cel = (w, filhos, fill) => new TableCell({
    width: { size: w, type: WidthType.DXA }, borders: bordas, margins: { top: 70, bottom: 70, left: 110, right: 110 },
    shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
    children: [new Paragraph({ children: [].concat(filhos) })],
  })
  const v = (texto, vazio = AGUARDANDO, o = {}) => (t(texto) ? run(t(texto), o) : run(vazio, { italics: true, color: vazio === AGUARDANDO ? LARANJA : MARROM }))
  const linha = (rot, valor) => new TableRow({ cantSplit: true, children: [cel(W[0], run(rot, { bold: true, color: MARROM, size: 20 }), BEGE), cel(W[1], valor)] })
  const tabela = (linhas) => new Table({ width: { size: 9638, type: WidthType.DXA }, columnWidths: W, rows: linhas })
  const secao = (titulo, cor = CHOCOLATE) => new Paragraph({ keepNext: true, spacing: { before: 220, after: 80 }, children: [run(titulo, { bold: true, size: 24, color: cor })] })
  const valor = edicao && edicao.valor_combo != null ? real(edicao.valor_combo) : ''
  const ordem = [...lista].sort((a, b) => t(a.marca).localeCompare(t(b.marca), 'pt-BR'))

  function bloco(d, n) {
    const c = d.combo || {}
    const out = [
      new Paragraph({ heading: HeadingLevel.HEADING_2, pageBreakBefore: n > 1, keepNext: true, children: [run(n + '. ' + t(d.marca))] }),
      new Paragraph({ keepNext: true, spacing: { after: 60 }, children: [run(situacaoTexto(d), { bold: true, color: preenchido(d) ? COR_STATUS[d.combo_status] || MARROM : LARANJA })] }),
      secao('Participante'), tabela([linha('Instagram', v(arroba(d.instagram), NAO_INFORMADO)), linha('Tema', v(d.tema))]),
      secao('Combo'), tabela([
        linha('Nome do combo', v(c.nome, AGUARDANDO, { bold: true })),
        linha('Descrição', v(c.descricao)),
        linha('Condições', v(c.condicoes, 'Nenhuma informada')),
        linha('Para viagem', v(d.para_viagem === true ? 'Sim' : d.para_viagem === false ? 'Não' : '')),
        ...(valor ? [linha('Valor', run(valor + ' (definido pela organização)'))] : []),
      ]),
    ]
    for (const [tipo, rotulo] of TIPOS) {
      const i = (c.itens || []).find((x) => x.tipo === tipo) || {}
      const sa = selosEAlergenicos(i)
      out.push(secao(rotulo, COR_TIPO[tipo]), tabela([
        linha('Nome', v(i.nome, AGUARDANDO, { bold: true })),
        linha('Descrição', v(i.descricao)),
        linha('Ingredientes', v(i.ingredientes, NAO_INFORMADO)),
        linha('Selos', v(sa.selos, AGUARDANDO, { bold: true, color: VERDE })),
        linha('Alergênicos', v(sa.alergenicos)),
      ]))
    }
    const tr = trocasEOpcoes(d)
    out.push(secao('Trocas e opções'), tabela(tr.length
      ? tr.map((x) => linha(ROTULO_TIPO[x.tipo] || x.tipo, x.daDescricao
        ? [run(x.texto), new TextRun({ break: 1 }), run('Informado ' + ONDE_DESCRICAO[x.daDescricao] + '.', { italics: true, color: MARROM, size: 18 })]
        : run(x.texto)))
      : [linha('Trocas e opções', v('', 'Nenhuma troca ou opção informada'))]))
    const us = d.unidades || []
    out.push(secao(us.length > 1 ? 'Onde encontrar (' + us.length + ' unidades)' : 'Onde encontrar'))
    if (!us.length) out.push(tabela([linha('Unidade', v(''))]))
    us.forEach((u, k) => {
      out.push(tabela([
        linha('Unidade', v(u.nome, NAO_INFORMADO, { bold: true })),
        linha('Endereço', v(enderecoTexto(u.endereco))),
        linha('WhatsApp da loja', v(foneTexto(u.whatsapp), NAO_INFORMADO)),
        linha('Atendimento', v(atendimentoTexto(u))),
        linha('Horário no festival', v(horario(u))),
      ]))
      if (k < us.length - 1) out.push(new Paragraph({ spacing: { after: 80 }, children: [] }))
    })
    return out
  }

  const Wc = [600, 3400, 2900, 2738]
  const celC = (texto, i, o = {}) => new TableCell({
    width: { size: Wc[i], type: WidthType.DXA }, borders: bordas, margins: { top: 50, bottom: 50, left: 90, right: 90 },
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    children: [new Paragraph({ children: [run(texto, { bold: o.bold, color: o.color, size: 18 })] })],
  })
  const nPre = ordem.filter(preenchido).length
  const nomeEd = edicao ? ['Sweet & Coffee Week', t(edicao.nome), edicao.codigo ? '(' + edicao.codigo + ')' : ''].filter(Boolean).join(' ') : 'Sweet & Coffee Week'
  const capa = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [run('Combos dos participantes')] }),
    new Paragraph({ spacing: { after: 200 }, children: [run(nomeEd, { bold: true, size: 26, color: MARROM })] }),
    new Paragraph({ spacing: { after: 80 }, children: [run(ordem.length + ' participantes · ' + nPre + ' com combo preenchido · ' + (ordem.length - nPre) + ' ainda em branco' + (valor ? ' · valor do combo ' + valor : '') + (posicao ? ' · posição de ' + posicao : '') + ', dados do painel.')] }),
    new Paragraph({ spacing: { after: 80 }, children: [run('Todos os participantes têm os mesmos campos, na mesma ordem. O que a marca ainda não respondeu aparece no lugar como “' + AGUARDANDO + '”; campo opcional não respondido aparece como “' + NAO_INFORMADO + '”.', { color: MARROM })] }),
    new Paragraph({ spacing: { after: 240 }, children: [run('Os textos passaram por revisão de ortografia, pontuação e maiúsculas, sem mudar ingrediente, sabor, nome próprio nem alergênico. Selos e alergênicos são o que a própria marca declarou: confirme com ela antes de divulgar algo que pareça estranho.', { italics: true, color: MARROM })] }),
    new Table({
      width: { size: 9638, type: WidthType.DXA }, columnWidths: Wc,
      rows: [
        new TableRow({ tableHeader: true, children: ['Nº', 'Marca', 'Tema', 'Situação'].map((h, i) => celC(h, i, { bold: true, fill: BEGE, color: CHOCOLATE })) }),
        ...ordem.map((d, k) => new TableRow({ cantSplit: true, children: [celC(String(k + 1), 0), celC(t(d.marca), 1, { bold: true }), celC(t(d.tema) || AGUARDANDO, 2), celC(situacaoTexto(d), 3, { color: preenchido(d) ? COR_STATUS[d.combo_status] || MARROM : LARANJA })] })),
      ],
    }),
  ]
  const margem = { top: 1134, bottom: 1134, left: 1134, right: 1134 }
  const rodape = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('Combos ' + ((edicao && edicao.codigo) || '') + ' · página ', { size: 16, color: MARROM }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MARROM })] })] })
  const doc = new Document({
    creator: 'Sweet & Coffee Week', title: 'Combos dos participantes',
    styles: {
      default: { document: { run: { font: 'Arial', size: 21, color: CHOCOLATE }, paragraph: { spacing: { line: 264 } } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', run: { font: 'Arial', size: 44, bold: true, color: CHOCOLATE }, paragraph: { spacing: { after: 60 } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Arial', size: 32, bold: true, color: CHOCOLATE }, paragraph: { spacing: { after: 40 }, outlineLevel: 1, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: LINHA, space: 4 } } } },
      ],
    },
    sections: [
      { properties: { page: { margin: margem } }, footers: { default: rodape() }, children: capa },
      { properties: { page: { margin: margem } }, footers: { default: rodape() }, children: ordem.flatMap((d, k) => bloco(d, k + 1)) },
    ],
  })
  return Packer.toBlob(doc)
}
