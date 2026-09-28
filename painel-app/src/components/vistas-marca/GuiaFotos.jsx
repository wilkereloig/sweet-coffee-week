import React from 'react'
import { ParesFotos, BaixarPdf } from '../vistas/GuiaFotos'
import { ICONE } from '../PainelShell'

/*
 * Guia de fotos — lado da MARCA: como preparar o combo para a sessão de
 * fotos ("Da foto para a mesa"). Só leitura, sem dado do banco. O texto
 * resume o PDF (fonte em docs/guia-fotos-cartoon/guia-participantes.html),
 * que a vista oferece para baixar. Pares e botão vêm da vista irmã da
 * organização, para as duas não divergirem no desenho.
 */
const PDF_PARTICIPANTES = '/guias/guia-de-fotos-participantes.pdf'

const REGRAS = [
  'O que aparece na foto é o que o cliente recebe: mesma receita, recheio, cobertura e porção.',
  'Mesmo jeito de servir: prato, copo, xícara ou taça. Café na xícara não chega ao cliente em copo plástico.',
  'Para viagem, se houver: embalagem própria, definida e organizada para o cliente levar o combo.',
  'Tem substituição ou opção vegana? Ela também é fotografada.',
  'Nada de marca de refrigerante ou de café. Se a sua xícara tem marca, use uma xícara neutra.',
  'Mudou algo depois das fotos? Avise a organização.',
]

const PARES = [
  { titulo: 'O recipiente da casa', fazer: ['bebida', 'O copo em que o cliente recebe.'], evitar: ['evitar-copo-plastico', 'Copo plástico no lugar do copo da casa.'] },
  { titulo: 'Xícara neutra', fazer: ['xicara-neutra', 'Xícara sem marca.'], evitar: ['evitar-xicara-marca', 'Xícara e sachê com marca.'] },
  { titulo: 'Louça e acabamento', fazer: ['doce', 'Prato limpo, produto bem acabado.'], evitar: ['evitar-louca', 'Prato lascado, talher manchado, calda escorrendo.'] },
  { titulo: 'A comida é a protagonista', fazer: ['combo-decoracao', 'Tema presente, comida em destaque.'], evitar: ['evitar-decoracao', 'Decoração sufocando a comida.'] },
]

const SESSAO = [
  'Tenha unidades extras do que derrete, murcha ou precisa ser cortado para mostrar o recheio.',
  'Recheio na quantidade e no padrão que o cliente recebe.',
  'Combine com o fotógrafo a hora de preparar bebidas com espuma, gelo ou gás.',
  'Libere uma mesa e tenha na sessão alguém que conheça a receita e o jeito de servir.',
  'O fotógrafo cuida da luz, da cor real, do ângulo e do espaço ao redor, e pode sugerir ajustes na montagem.',
]

export function GuiaFotos() {
  return (
    <section className="gf">
      <div className="pn-vista-cabeca" data-acento="magenta">
        <span className="pn-acento-disco" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {ICONE.fotos}
          </svg>
        </span>
        <span className="pn-vista-cabeca__texto">
          <span className="pn-vista-cabeca__titulo">Guia de fotos</span>
          <span className="pn-vista-cabeca__nota">Como preparar o seu combo para a sessão</span>
        </span>
      </div>

      <div className="gf-topo">
        <p className="gf-tese">Da foto para a mesa: <strong>a mesma experiência</strong>.</p>
        <BaixarPdf href={PDF_PARTICIPANTES} rotulo="Baixar o guia em PDF" />
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

      <p className="gf-nota">Fotos de exemplo geradas por IA. Não são produtos das casas e não entram na divulgação.</p>
    </section>
  )
}
