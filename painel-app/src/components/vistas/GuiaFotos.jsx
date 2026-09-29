import React from 'react'

/*
 * Guia de fotos dos combos — edição Cartoon, lado da ORGANIZAÇÃO (para o
 * fotógrafo). Vista só de leitura, sem dado do banco. O texto acompanha o
 * PDF (fonte em docs/guia-fotos-cartoon/guia.html), que a vista oferece
 * para baixar. A marca tem a vista irmã em vistas-marca/GuiaFotos.jsx, que
 * reusa ParesFotos e BaixarPdf daqui.
 *
 * ⚠️ As fotos em /images/guia-fotos/ são exemplos gerados por IA, não
 * produtos das casas — e a vista diz isso na tela. Não reaproveitar em
 * página pública (CLAUDE.md §6.12: nada gerado por IA entra como registro).
 */
const IMG = '/images/guia-fotos/'
export const PDF_FOTOGRAFO = '/guias/guia-de-fotos-fotografo.pdf'

const ENTREGAS = [
  'Combo completo: salgado, doce e bebida inteiros, fáceis de identificar, com espaço ao redor',
  'Salgado: foto individual, com o produto inteiro',
  'Doce: foto individual, com o produto inteiro',
  'Bebida: foto individual, no recipiente em que será servida',
  'Opções e substituições (ex.: opção vegana): cada uma com a sua foto individual',
  'Detalhe, quando o produto justificar (recheio, textura, cobertura, camadas). Complementa, nunca substitui a foto individual',
]

const COMBO_REAL = [
  'Fotografe o combo como ele será servido: mesma receita, recheio, porção e recipiente da casa.',
  'Nada de versão especial só para a foto. Se a montagem estiver diferente, alinhe com a casa antes.',
  'Um responsável da casa acompanha a sessão. Peça unidades extras do que derrete ou precisa ser cortado.',
  'Combine o momento de preparar bebidas com espuma, gelo ou gás. Antes do clique: bordas limpas, sem respingos.',
  'Para viagem: se for relevante, a embalagem também pode ser registrada.',
]

const PARES = [
  { titulo: 'Leitura clara do combo', fazer: ['combo-arranjo', 'Cada item visível, nenhum escondendo outro.'], evitar: ['evitar-leitura', 'Copo na frente do doce, guardanapo cobrindo o salgado.'] },
  { titulo: 'Margem ao redor', fazer: ['combo', 'Comida na área segura, com respiro para as adaptações.'], evitar: ['evitar-margem', 'Quadro cheio: pratos e doce cortados pelas bordas.'] },
  { titulo: 'Recipiente real', fazer: ['bebida', 'O copo em que a bebida é servida.'], evitar: ['evitar-copo-plastico', 'Copo plástico no lugar do recipiente da casa.'] },
  { titulo: 'Louça e acabamento', fazer: ['doce', 'Prato limpo, produto bem acabado.'], evitar: ['evitar-louca', 'Prato lascado, talher manchado, calda escorrendo.'] },
  { titulo: 'Decoração em equilíbrio', fazer: ['combo-decoracao', 'O tema aparece e a comida continua protagonista.'], evitar: ['evitar-decoracao', 'Excesso de objetos: a comida se perde.'] },
  { titulo: 'Luz suave e controlada', fazer: ['combo-45', 'Luz difusa, sombras suaves, cor real.'], evitar: ['evitar-luz', 'Flash direto: áreas estouradas, reflexo e sombra dura.'] },
  { titulo: 'Cor próxima da real', fazer: ['doce', 'Tratamento natural.'], evitar: ['evitar-cor', 'Saturação, contraste e temperatura exagerados.'] },
  { titulo: 'Proporção equilibrada', fazer: ['combo', 'Os três itens em escala coerente.'], evitar: ['evitar-proporcao', 'Item colado na lente: parece enorme, o resto some.'] },
  { titulo: 'Sem marca de terceiros', fazer: ['bebida', 'Bebida servida no copo.'], evitar: ['evitar-marca', 'Lata e garrafa de marca como protagonistas.'] },
]

const LEMBRETES = [
  'Individual mostra o produto completo; detalhe aproxima para destacar algo. Foto muito fechada é detalhe.',
  'Deixe margem nas laterais, em cima e embaixo: a foto vai para feed, Stories, site, displays e peças.',
  'Composição e ângulo são escolha do fotógrafo: o que importa é a leitura clara dos três itens.',
  'Fundo e decoração podem ser livres, desde que não cubram nem compitam com a comida.',
  'Xícara com marca de café vira xícara neutra; confira sachês, guardanapos e copos promocionais.',
]

function Foto({ arq, lado, texto }) {
  const fazer = lado === 'fazer'
  return (
    <figure className="gf-foto">
      <div className="gf-foto__img">
        <img src={IMG + arq + '.jpg'} alt={(fazer ? 'Faça: ' : 'Evite: ') + texto}
          loading="lazy" decoding="async" width={1400} height={1738} />
        <span className={'gf-selo gf-selo--' + lado}>{fazer ? '✓ Faça' : '✕ Evite'}</span>
      </div>
      <figcaption>{texto}</figcaption>
    </figure>
  )
}

export function ParesFotos({ pares }) {
  return (
    <div className="gf-pares">
      {pares.map((p) => (
        <article className="gf-par" key={p.titulo}>
          <h3 className="gf-par__titulo">{p.titulo}</h3>
          <div className="gf-par__fotos">
            <Foto arq={p.fazer[0]} lado="fazer" texto={p.fazer[1]} />
            <Foto arq={p.evitar[0]} lado="evitar" texto={p.evitar[1]} />
          </div>
        </article>
      ))}
    </div>
  )
}

export function BaixarPdf({ href, rotulo }) {
  return (
    <a className="og-btn gf-baixar" href={href} download>
      <svg width="18" height="18" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 5v14.4" /><path d="M9.4 13.6 16 20.2l6.6-6.6" /><path d="M6 25.8h20" />
      </svg>
      {rotulo}
    </a>
  )
}

export function GuiaFotos() {
  return (
    <div className="og-embutida gf">
      <h2 className="gf-h2">Guia de fotos · para o fotógrafo</h2>

      <div className="gf-topo">
        <p className="gf-tese">Todas as fotos fazem parte da entrega. A <strong>comida é sempre a protagonista</strong>.</p>
        <BaixarPdf href={PDF_FOTOGRAFO} rotulo="Baixar o guia em PDF" />
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">Em cada combo, fotografe</h2>
        <ul className="gf-entregas">
          {ENTREGAS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">O combo real</h2>
        <ul className="gf-lembretes">
          {COMBO_REAL.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">Faça e evite</h2>
        <ParesFotos pares={PARES} />
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">Para lembrar</h2>
        <ul className="gf-lembretes">
          {LEMBRETES.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <p className="gf-nota">Fotos de exemplo geradas por IA. Não são produtos das casas e não entram na divulgação.</p>
    </div>
  )
}
