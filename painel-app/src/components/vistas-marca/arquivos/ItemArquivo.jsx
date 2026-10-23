import React from 'react'
import { dataHoraExtensa } from '../../../lib/central'
import { detalhesDoArquivo, publicadoEm, ehNovo, acoesDoArquivo, leituraVale } from '../../../lib/arquivosMarca'
import { Icone } from '../../Icone'
import { Selo } from '../../ui'
import { AvisoComFoco } from '../AvisoComFoco'

/*
 * Uma linha de arquivo da marca: nome, formato · tamanho · versão (só o que o dado tem), o que a leitura pede e as
 * ações. Quem grava (confirmar leitura) e quem pede o link (abrir/baixar) é Arquivos.jsx; aqui só se desenha.
 * `textos` traz as palavras da leitura (arquivo × foto oficial). `lido` = quando a marca confirmou (ou undefined);
 * `leituraConhecida` = a leitura das confirmações deu certo — sem ela não se afirma "pendente" e o botão de confirmar não
 * aparece (quem talvez já confirmou não é convidado a confirmar de novo, e o clique cairia em "participação não aberta").
 * `retorno` = o resultado da ação neste item; ele recebe o foco (o botão tocado pode ter sumido).
 */
export function ItemArquivo({ a, lido, leituraConhecida, textos, agora, destacado, ocupado, confirmando, retorno, aoAcessar, aoConfirmar }) {
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (destacado && ref.current) ref.current.scrollIntoView({ block: 'center' })
  }, [destacado])

  const acoes = acoesDoArquivo(a)
  const pub = publicadoEm(a)
  // Leitura de uma versão anterior (o arquivo foi substituído depois) não vale: pede confirmar de novo.
  const vale = leituraVale(a, lido)
  const pendente = !!a.exige_leitura && !vale && !!leituraConhecida
  const ocupadoAqui = ocupado && ocupado.id === a.id
  const meta = [...detalhesDoArquivo(a), pub ? 'publicado em ' + pub : ''].filter(Boolean).join(' · ')

  return (
    <li ref={ref} className={'am-item' + (destacado ? ' is-destaque' : '')}>
      <div className="am-item__corpo">
        <p className="am-item__nome"><b>{a.nome}</b>{ehNovo(a, agora) && <Selo tom="andamento">Novo</Selo>}</p>
        {meta && <p className="am-item__meta">{meta}</p>}
        {a.descricao && <p className="am-item__desc">{a.descricao}</p>}
        <div className="am-item__selos">
          <Selo tom={a.escopo === 'marca' ? 'andamento' : 'neutro'}>{a.escopo === 'marca' ? 'Só para você' : 'Para todos os participantes'}</Selo>
          {a.exige_leitura && (vale
            ? <span className="am-item__lido"><Icone nome="sucesso" tamanho={16} />{textos.lido}{dataHoraExtensa(lido)}</span>
            : leituraConhecida
              ? <Selo tom="atencao">{textos.pedeLer}</Selo>
              : <Selo tom="neutro">Confirmação não verificada</Selo>)}
        </div>
        {a.exige_leitura && lido && !vale && (
          <p className="am-item__dica">Esta versão foi publicada em {pub}, depois da sua leitura de {dataHoraExtensa(lido)}. Abra, confira o que mudou e confirme a leitura de novo.</p>
        )}
        {!acoes.abrir && <p className="am-item__dica">{acoes.dica}</p>}
      </div>
      <div className="am-item__acoes">
        {acoes.abrir && (
          <button className="og-btn og-btn--vazado og-btn--mini" type="button" aria-label={'Abrir ' + a.nome} disabled={ocupadoAqui} onClick={() => aoAcessar(a, 'abrir')}>
            <Icone nome="link-externo" tamanho={16} />{ocupadoAqui && ocupado.modo === 'abrir' ? 'Abrindo…' : 'Abrir'}
          </button>
        )}
        <button className="og-btn og-btn--vazado og-btn--mini" type="button" aria-label={'Baixar ' + a.nome} disabled={ocupadoAqui} onClick={() => aoAcessar(a, 'baixar')}>
          <Icone nome="baixar" tamanho={16} />{ocupadoAqui && ocupado.modo === 'baixar' ? 'Preparando…' : 'Baixar'}
        </button>
        {pendente && (
          <button className="og-btn og-btn--mini" type="button" aria-label={textos.botaoLer + ': ' + a.nome} disabled={confirmando === a.id} onClick={() => aoConfirmar(a)}>
            <Icone nome="feito" tamanho={16} />{confirmando === a.id ? 'Registrando…' : textos.botaoLer}
          </button>
        )}
      </div>
      <AvisoComFoco aviso={retorno} className="am-item__retorno" />
    </li>
  )
}
