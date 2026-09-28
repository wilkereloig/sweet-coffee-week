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
  'Combo completo, os 3 itens inteiros',
  'Combo com espaço livre para texto',
  'Versão vertical para Stories',
  'Salgado inteiro e aberto, se tiver recheio',
  'Doce inteiro e cortado, se fizer sentido',
  'Bebida no copo em que será servida',
  'Um detalhe que dá vontade: textura, recheio, calda',
]

const PARES = [
  { titulo: 'Os 3 itens à vista', arq: '01-combo',
    fazer: 'Cada item inteiro, com espaço próprio.', evitar: 'Copo e guardanapo escondendo a comida.' },
  { titulo: 'Luz suave', arq: '02-luz',
    fazer: 'Luz difusa de lado: textura e brilho.', evitar: 'Flash direto: sombra dura e reflexo estourado.' },
  { titulo: 'Tema sem exagero', arq: '03-cenario',
    fazer: 'O cenário sugere o tema, a comida lidera.', evitar: 'Adereço demais: a comida some.' },
  { titulo: 'Margem para recortar', arq: '04-quadro', alto: true,
    fazer: 'Folga em volta: serve ao feed e ao Stories.', evitar: 'Fechado demais: prato e copo cortados.' },
  { titulo: 'Bebida sem marca', arq: '05-bebida',
    fazer: 'No copo, como o público vai receber.', evitar: 'Lata ou rótulo de marca à vista.' },
  { titulo: 'Recheio bem mostrado', arq: '06-corte',
    fazer: 'Corte limpo, recheio para a câmera.', evitar: 'Massa esmagada e migalha espalhada.' },
]

const LEMBRETES = [
  'Fotografe tudo intacto antes de cortar.',
  'Cor real da comida: acerte o branco com cartão cinza.',
  'Sem personagem, super-herói ou logo de terceiros.',
  'Na vertical, com folga. O design recorta para 4:5 e 9:16.',
  'Entregue os originais em resolução máxima, sem texto.',
]

function Foto({ arq, lado, alto, texto }) {
  const fazer = lado === 'fazer'
  return (
    <figure className="gf-foto">
      <div className={'gf-foto__img' + (alto ? ' gf-foto__img--alto' : '')}>
        <img src={IMG + arq + '-' + lado + '.webp'} alt={(fazer ? 'Faça: ' : 'Evite: ') + texto}
          loading="lazy" decoding="async" width={alto ? 893 : 900} height={alto ? 1600 : 1117} />
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

      <p className="gf-tese">O público precisa <strong>reconhecer os 3 itens</strong> de relance e <strong>querer provar</strong>.</p>

      <div className="gf-bloco">
        <h2 className="gf-h2">Por combo, fotografe</h2>
        <ul className="gf-entregas">
          {ENTREGAS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">Faça e evite</h2>
        <div className="gf-pares">
          {PARES.map((p) => (
            <article className="gf-par" key={p.arq}>
              <h3 className="gf-par__titulo">{p.titulo}</h3>
              <div className="gf-par__fotos">
                <Foto arq={p.arq} lado="fazer" alto={p.alto} texto={p.fazer} />
                <Foto arq={p.arq} lado="evitar" alto={p.alto} texto={p.evitar} />
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">No set, lembre</h2>
        <ul className="gf-lembretes">
          {LEMBRETES.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <p className="gf-nota">Fotos de exemplo geradas por IA. Não são produtos das casas e não entram na divulgação.</p>
    </section>
  )
}
