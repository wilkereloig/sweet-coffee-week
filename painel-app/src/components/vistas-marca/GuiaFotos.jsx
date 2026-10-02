import React from 'react'
import { ParesFotos, BaixarGuias } from '../vistas/GuiaFotos'
import { VistaCabeca } from '../VistaCabeca'

/*
 * Guia de fotos — lado da MARCA: como preparar o combo para a sessão de
 * fotos ("Da foto para a mesa"). Só leitura, sem dado do banco. O texto
 * resume o PDF (fonte em docs/guia-fotos-cartoon/guia-participantes.html),
 * que a vista oferece para baixar. Pares e botão vêm da vista irmã da
 * organização, para as duas não divergirem no desenho.
 *
 * As imagens (participantes/) são geradas por IA com um combo e um desenho
 * inventados (02/10/2026): o guia é público e vai para todas as marcas, e o
 * combo real de uma casa não pode aparecer antes do festival.
 */
const IMG = '/images/guia-fotos/participantes/'

const REGRAS = [
  'O que aparece na foto é o que o cliente recebe: mesma receita, recheio, cobertura e porção.',
  'Mesmo jeito de servir: prato, copo, xícara ou taça. Café na xícara não chega ao cliente em copo plástico.',
  'Para viagem, se houver: embalagem própria, definida e organizada para o cliente levar o combo.',
  'Tem substituição ou opção vegana? Ela também é fotografada.',
  'Nada de marca de refrigerante ou de café. Se a sua xícara tem marca, use uma xícara neutra.',
  'Mudou algo depois das fotos? Avise a organização.',
]

const PROCESSO = [
  'A organização troca o fundo e a luz por uma cena de estúdio e mantém a decoração do seu desenho.',
  'A comida nunca muda: receita, recheio, porção e louça são as da foto. Por isso o produto chega perfeito à sessão.',
  'Fotos obrigatórias: o combo, cada item separado e cada um aberto ou cortado mostrando o recheio.',
]

const PARES = [
  { titulo: 'O recipiente da casa', fazer: ['participantes/bebida', 'O copo em que o cliente recebe.'], evitar: ['participantes/evitar-copo-plastico', 'Copo plástico no lugar do copo da casa.'] },
  { titulo: 'Xícara neutra', fazer: ['participantes/xicara-neutra', 'Xícara sem marca.'], evitar: ['participantes/evitar-xicara-marca', 'Xícara e sachê com marca.'] },
  { titulo: 'Louça e acabamento', fazer: ['participantes/doce', 'Prato limpo, produto bem acabado.'], evitar: ['participantes/evitar-louca', 'Prato lascado, talher manchado, calda escorrendo.'] },
  { titulo: 'Decoração atrás da comida', fazer: ['participantes/combo', 'Desenho presente, comida em destaque.'], evitar: ['participantes/evitar-decoracao', 'Decoração na frente e em cima da comida.'] },
]

const SESSAO = [
  'Traga a decoração do seu desenho. Ela fica atrás e ao lado da comida, nunca na frente nem em cima.',
  'Tenha unidades extras do que derrete, murcha ou precisa ser cortado para mostrar o recheio.',
  'Recheio na quantidade e no padrão que o cliente recebe.',
  'Combine com o fotógrafo a hora de preparar bebidas com espuma, gelo ou gás.',
  'Libere uma mesa e tenha na sessão alguém que conheça a receita e o jeito de servir.',
]

function Etapa({ arq, rotulo, texto }) {
  return (
    <figure className="gf-foto">
      <div className="gf-foto__img gf-foto__img--quadrada">
        <img src={IMG + arq + '.jpg'} alt={rotulo + ': ' + texto} loading="lazy" decoding="async" width={1400} height={1400} />
        <span className="gf-selo gf-selo--etapa">{rotulo}</span>
      </div>
      <figcaption>{texto}</figcaption>
    </figure>
  )
}

export function GuiaFotos() {
  return (
    <section className="gf">
      <VistaCabeca acento="magenta" icone="fotos" titulo="Guia de fotos" nota="Como preparar o seu combo para a sessão" />

      <div className="gf-topo">
        <p className="gf-tese">Da foto para a mesa: <strong>a mesma experiência</strong>.</p>
        <BaixarGuias deQuem="participante" />
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">Como sua foto vira arte</h2>
        <div className="gf-par__fotos">
          <Etapa arq="bastidor" rotulo="Na sessão" texto="O combo real, fotografado na sua casa." />
          <Etapa arq="combo" rotulo="Arte final" texto="A mesma comida, com fundo, luz e acabamento de estúdio." />
        </div>
        <ul className="gf-lembretes">
          {PROCESSO.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">A regra principal</h2>
        <ul className="gf-lembretes">
          {REGRAS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">Faça e evite</h2>
        <ParesFotos pares={PARES} />
      </div>

      <div className="gf-bloco">
        <h2 className="gf-h2">Na sessão de fotos</h2>
        <ul className="gf-lembretes">
          {SESSAO.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <p className="gf-nota">Imagens de exemplo geradas por IA, com um combo e um desenho inventados. Não são produtos nem personagens das casas e não entram na divulgação.</p>
    </section>
  )
}
