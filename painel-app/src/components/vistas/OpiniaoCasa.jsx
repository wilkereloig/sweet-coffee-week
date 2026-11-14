import React from 'react'
import { rpc } from '../../lib/rpc'
import { dataCurta } from '../../lib/respostas'
import { CHAVE_SESSAO } from '../../../../src/lib/adminAccess'
import { ROTULO_TEMA, ROTULO_INTERESSE, opiniaoTemConteudo } from '../../lib/opiniaoCasa'
import { Modulo, Selo, Erro } from '../ui'

const lerSenha = () => sessionStorage.getItem(CHAVE_SESSAO) || ''

/*
 * Opinião da casa sobre a edição, na ficha (vista Comunicação). Só leitura: quem
 * escreve é a casa, em /painel/#opiniao. Lê pela RPC org_opinioes_casas ('dado.ler').
 */
export function OpiniaoCasa({ participante }) {
  const [o, setO] = React.useState(undefined)   // undefined = carregando; null = sem resposta
  const [erro, setErro] = React.useState(null)
  const ler = React.useCallback(async () => {
    setErro(null)
    try {
      const l = (await rpc('org_opinioes_casas', { p_secret: lerSenha(), p_participante: participante.id })) || []
      setO(l[0] || null)
    } catch (e) { setErro(e.message) }
  }, [participante.id])
  React.useEffect(() => { ler() }, [ler])

  const tem = opiniaoTemConteudo(o)
  return (
    <Modulo icone="depoimento" titulo="Opinião da casa sobre a edição" sub="O que a casa respondeu em Sua opinião, no painel dela."
      status={erro ? <Selo tom="atencao">Não carregou</Selo> : o === undefined ? null : tem ? <Selo tom="ok">Respondeu em {dataCurta(o.atualizado_em)}</Selo> : <Selo tom="neutro">Ainda não respondeu</Selo>}>
      {erro && <Erro texto={erro} onTentar={ler} />}
      {tem && (
        <dl className="ui-dados">
          {[
            ['Recomendaria participar (0 a 10)', o.recomendacao],
            ['Interesse nas próximas edições', o.interesse && (ROTULO_INTERESSE[o.interesse] || o.interesse)],
            ['O que funcionou', o.funcionou],
            ['Pode melhorar (marcados)', (o.melhorar_temas || []).map((t) => ROTULO_TEMA[t] || t).join(', ')],
            ['O que pode melhorar', o.melhorar],
            ['Tema sugerido', o.tema_sugerido],
            ['Mais alguma coisa', o.livre],
          ].filter(([, v]) => v !== null && v !== undefined && v !== '').map(([r, v]) => (
            <div className="ui-dado" key={r}><dt>{r}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      )}
    </Modulo>
  )
}
