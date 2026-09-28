import React from 'react'
import { VistaCabeca } from '../VistaCabeca'
import { ICONE } from '../PainelShell'

/*
 * Guia de fotos dos combos — edição Cartoon. Vista só de leitura, para a
 * reunião com o fotógrafo e para consultar no set. Sem dado do banco.
 *
 * ⚠️ As fotos em /images/guia-fotos/ são exemplos gerados por IA (Magnific),
 * não produtos das casas — e a vista diz isso na tela. Não reaproveitar em
 * página pública (CLAUDE.md §6.12: nada gerado por IA entra como registro).
 */
const IMG = '/images/guia-fotos/'

const ENTREGAS = [
  'Combo completo: salgado, doce e bebida inteiros, fáceis de identificar, com espaço ao redor',
  'Salgado: foto individual, com o produto inteiro',
  'Doce: foto individual, com o produto inteiro',
  'Bebida: foto individual, no recipiente em que será servida',
  'Detalhe, quando o produto justificar (recheio, textura, cobertura, camadas, finalização). Complementa, nunca substitui a foto individual',
]

const PARES = [
  { titulo: 'Leitura clara do combo', fazer: ['combo-arranjo', 'Cada item visível, nenhum escondendo outro.'], evitar: ['evitar-leitura', 'Copo na frente do doce, guardanapo cobrindo o salgado.'] },
  { titulo: 'Margem ao redor', fazer: ['combo', 'Comida na área segura, com respiro para as adaptações.'], evitar: ['evitar-margem', 'Quadro cheio: pratos e doce cortados pelas bordas.'] },
  { titulo: 'Decoração em equilíbrio', fazer: ['combo-decoracao', 'O tema aparece e a comida continua protagonista.'], evitar: ['evitar-decoracao', 'Excesso de objetos: a comida se perde.'] },
  { titulo: 'Luz suave e controlada', fazer: ['combo-45', 'Luz difusa, sombras suaves, cor real.'], evitar: ['evitar-luz', 'Flash direto: áreas estouradas, reflexo e sombra dura.'] },
  { titulo: 'Cor próxima da real', fazer: ['doce', 'Tratamento natural.'], evitar: ['evitar-cor', 'Saturação, contraste e temperatura exagerados.'] },
  { titulo: 'Proporção equilibrada', fazer: ['combo', 'Os três itens em escala coerente.'], evitar: ['evitar-proporcao', 'Item colado na lente: parece enorme, o resto some.'] },
  { titulo: 'Bebida sem marca comercial', fazer: ['bebida', 'Bebida em copo neutro.'], evitar: ['evitar-marca', 'Lata e garrafa de marca como protagonistas.'] },
]

const LEMBRETES = [
  'Individual mostra o produto completo; detalhe aproxima para destacar algo. Foto muito fechada é detalhe.',
  'Deixe margem nas laterais, em cima e embaixo: a foto vai para feed, Stories, site, displays e peças.',
  'Composição e ângulo são escolha do fotógrafo: o que importa é a leitura clara dos três itens.',
  'Fundo e decoração podem ser livres, desde que não cubram nem compitam com a comida.',
  'Guia completo em PDF: Produção › Arquivos.',
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

export function GuiaFotos() {
  return (
    <section className="og-vista gf">
      <VistaCabeca acento="magenta" icone={ICONE.fotos} titulo="Guia de fotos" nota="combos da edição Cartoon · para o fotógrafo" />

      <p className="gf-tese">Todas as fotos fazem parte da entrega. A <strong>comida é sempre a protagonista</strong>.</p>

      <div className="gf-bloco">
        <h2 className="gf-h2">Em cada combo, fotografe</h2>
        <ul className="gf-entregas">
          {ENTREGAS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">Faça e evite</h2>
        <div className="gf-pares">
          {PARES.map((p) => (
            <article className="gf-par" key={p.titulo}>
              <h3 className="gf-par__titulo">{p.titulo}</h3>
              <div className="gf-par__fotos">
                <Foto arq={p.fazer[0]} lado="fazer" texto={p.fazer[1]} />
                <Foto arq={p.evitar[0]} lado="evitar" texto={p.evitar[1]} />
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">Para lembrar</h2>
        <ul className="gf-lembretes">
          {LEMBRETES.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <p className="gf-nota">Fotos de exemplo geradas por IA. Não são produtos das casas e não entram na divulgação.</p>
    </section>
  )
}
