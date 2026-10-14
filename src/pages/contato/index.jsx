/*
 * PÁGINA INSTITUCIONAL — "Contato". Função: resolver a dúvida e, quando ela não
 * se resolve, encaminhar o contato para a porta certa.
 *
 *   01 Abertura   — a busca é a ação principal; escrever é a segunda
 *   02 Dúvidas    — central de 93 perguntas em 10 assuntos (faqCentral.js)
 *   03 Mensagem   — triagem ("Antes de escrever") + formulário, lado a lado
 *
 * O estado da central mora aqui porque DUAS seções escrevem nele: a busca do
 * herói e a da própria central, e o "Ver dúvidas de suporte" da triagem.
 *
 * Casca (cabeçalho, rodapé, abas) é global (App.jsx); a cor da página (bege)
 * vem de `body.route-contato` → `--scw-pagina`/`--scw-heroi`.
 */
import React from 'react'
import '../../styles/scw-contato.css'
import FAQ_DADOS from '../../data/faqCentral'
import { Marquee } from '../../components/Marquee'
import { useCentralDuvidas } from './useCentralDuvidas'
import { rolarPara } from './rolar'
import { Abertura } from './secoes/Abertura'
import { Duvidas } from './secoes/Duvidas'
import { Mensagem } from './secoes/Mensagem'

/* Schema FAQPage — da MESMA fonte que a tela, com as 93 perguntas (inclusive as
   que a lista ainda não mostrou: "Mostrar mais" é apresentação, não conteúdo). */
function useSchemaFaq() {
  React.useEffect(() => {
    const anterior = document.getElementById('faq-schema')
    if (anterior) anterior.remove()
    const tag = document.createElement('script')
    tag.type = 'application/ld+json'
    tag.id = 'faq-schema'
    tag.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_DADOS.perguntas.map((q) => ({
        '@type': 'Question',
        name: q.p,
        acceptedAnswer: { '@type': 'Answer', text: (q.r || []).join(' ') },
      })),
    })
    document.head.appendChild(tag)
    return () => tag.remove()
  }, [])
}

/* Faixa de palavras (14/10/2026, pedido do Wilker): os assuntos da central,
   derivados da base como no Awards — nada digitado aqui. */
const PALAVRAS = FAQ_DADOS.categorias.filter(([id]) => id !== 'todas').map(([, rotulo]) => rotulo)

export function ContatoPage() {
  const central = useCentralDuvidas()
  useSchemaFaq()

  // Triagem → um assunto da central (ex.: "Ver dúvidas de suporte").
  const verAssunto = (id) => {
    central.escolherCat(id)
    requestAnimationFrame(() => rolarPara('ctt-resultados', 'ctt-resultados-titulo'))
  }

  return (
    <>
      <Abertura central={central} />
      <Marquee palavras={PALAVRAS} />
      <Duvidas central={central} />
      <Mensagem verAssunto={verAssunto} />
    </>
  )
}

export default ContatoPage
