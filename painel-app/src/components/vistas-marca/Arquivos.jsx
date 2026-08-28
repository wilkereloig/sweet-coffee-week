import React from 'react'
import { api, assinarDownload } from '../../lib/marcaApi'
import { bytesDaChave, VAPID_PUBLICA } from '../../lib/avisos'

/*
 * Vista Arquivos (marca) — porta fiel de public/painel/index.html: downloads
 * publicados pela organização (desenharArquivos/baixar, ~5144-5194) e avisos
 * push deste aparelho (bytesDaChave.../desligarAvisos, ~4426-4590). As duas
 * coisas moram na mesma aba, diferente do lado organização (Equipe.jsx),
 * onde avisos é seção própria.
 *
 * `arquivos` e o id do participante são leituras À PARTE, cada uma com o
 * próprio catch — mesma regra de Producao.jsx/Marcas.jsx (CLAUDE.md
 * §10.4-b): uma falhar não pode apagar a outra.
 */

const ONDE_ESTA_O_AVISO =
  'Se nada apareceu, o navegador pode ter recolhido o pedido: procure o ícone ' +
  'de sino ou de cadeado na barra de endereço e responda por lá.'

// Três coisas separadas, e confundi-las é o que gera "liguei e não chega":
// suporte do navegador, permissão da pessoa, e assinatura registrada no banco.
function avisoSuportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function assinaturaDoAparelho() {
  if (!avisoSuportado()) return null
  try {
    const reg = await navigator.serviceWorker.ready
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

export function Arquivos() {
  const [arquivos, setArquivos] = React.useState(null)
  const [erro, setErro] = React.useState(null)
  const [participanteId, setParticipanteId] = React.useState(null)
  const [baixando, setBaixando] = React.useState(null)
  const [avisoBaixar, setAvisoBaixar] = React.useState(null)

  const [assinatura, setAssinatura] = React.useState(null)
  const [negado, setNegado] = React.useState(false)
  const [avisoPush, setAvisoPush] = React.useState(null)

  React.useEffect(() => {
    let ativo = true
    api('arquivos?select=*&order=created_at.desc')
      .then((linhas) => { if (ativo) setArquivos(linhas || []) })
      .catch((e) => {
        if (!ativo) return
        if (e && e.message === 'sessao_expirada') return
        setErro(e.message)
      })
    return () => { ativo = false }
  }, [])

  React.useEffect(() => {
    let ativo = true
    api('participantes?select=id&order=created_at.desc&limit=1')
      .then((linhas) => { if (ativo) setParticipanteId((linhas && linhas[0] && linhas[0].id) || null) })
      .catch(() => { if (ativo) setParticipanteId(null) })
    return () => { ativo = false }
  }, [])

  const atualizarStatusPush = React.useCallback(async () => {
    if (!avisoSuportado()) { setAssinatura(null); setNegado(false); return }
    setNegado(Notification.permission === 'denied')
    setAssinatura(await assinaturaDoAparelho())
  }, [])

  React.useEffect(() => { atualizarStatusPush() }, [atualizarStatusPush])

  async function baixar(path) {
    setBaixando(path)
    setAvisoBaixar(null)
    try {
      const url = await assinarDownload(path)
      window.open(url, '_blank', 'noopener')
    } catch {
      setAvisoBaixar('Não deu para abrir o arquivo agora. Tente de novo em instantes.')
    } finally {
      setBaixando(null)
    }
  }

  async function ligarAvisos() {
    if (!participanteId) { setAvisoPush({ texto: 'Entre primeiro.', tom: 'erro' }); return }
    if (Notification.permission === 'denied') {
      setAvisoPush({
        texto: 'A permissão já está negada para este site. Reabrir depende das ' +
          'configurações do navegador: esta página não consegue pedir de novo.',
        tom: 'erro',
      })
      return
    }

    setAvisoPush({ texto: 'Pedindo permissão… ' + ONDE_ESTA_O_AVISO, tom: '' })
    const lembrete = setTimeout(() => {
      setAvisoPush({ texto: 'Ainda esperando sua resposta. ' + ONDE_ESTA_O_AVISO, tom: '' })
    }, 8000)

    // Resposta tardia não se perde: quando a permissão muda, a tela se
    // redesenha sozinha, mesmo que a promessa abaixo tenha ficado para trás.
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'notifications' })
        .then((p) => { p.onchange = () => atualizarStatusPush() })
        .catch(() => { /* navegador sem a API: o caminho normal segue */ })
    }

    try {
      const permissao = await Notification.requestPermission()
      clearTimeout(lembrete)
      if (permissao !== 'granted') {
        setAvisoPush({
          texto: permissao === 'denied'
            ? 'Permissão negada. Nada pode ser enviado para este aparelho.'
            : 'Você fechou o aviso sem responder. Clique em "Ligar avisos" de novo.',
          tom: 'erro',
        })
        await atualizarStatusPush()
        return
      }

      const reg = await navigator.serviceWorker.ready
      // `userVisibleOnly: true` é obrigatório nos navegadores que importam:
      // não existe push silencioso na web, e é bom que não exista.
      const nova = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytesDaChave(VAPID_PUBLICA),
      })
      const bruto = nova.toJSON()

      // O endpoint é UNIQUE e `update` está revogado de propósito — não dá
      // para resolver com upsert. Apaga a linha antiga deste mesmo endpoint
      // antes de gravar; a RLS só deixa apagar o que é desta marca.
      await api('push_subscriptions?endpoint=eq.' + encodeURIComponent(bruto.endpoint), { metodo: 'DELETE' }).catch(() => null)
      await api('push_subscriptions', {
        metodo: 'POST',
        prefer: 'return=minimal',
        corpo: {
          papel: 'marca',
          participante_id: participanteId,
          endpoint: bruto.endpoint,
          p256dh: bruto.keys.p256dh,
          auth_chave: bruto.keys.auth,
          user_agent: navigator.userAgent.slice(0, 300),
        },
      })

      // Só afirma "ligado" depois que o banco confirmar. Assinatura que
      // existe no navegador e não existe no banco é aparelho que nunca vai
      // receber nada — e que jura que está ligado.
      await atualizarStatusPush()
      setAvisoPush({ texto: 'Avisos ligados neste aparelho.', tom: 'ok' })
    } catch (e) {
      clearTimeout(lembrete)
      setAvisoPush({ texto: 'Não consegui ligar: ' + e.message, tom: 'erro' })
    }
  }

  async function desligarAvisos() {
    setAvisoPush({ texto: 'Desligando…', tom: '' })
    try {
      const atual = await assinaturaDoAparelho()
      if (atual) {
        // Banco primeiro: se a rede caísse depois do unsubscribe, o endpoint
        // ficaria vivo no banco apontando para uma assinatura morta.
        await api('push_subscriptions?endpoint=eq.' + encodeURIComponent(atual.endpoint), { metodo: 'DELETE' })
        await atual.unsubscribe()
      }
      await atualizarStatusPush()
      setAvisoPush({ texto: 'Avisos desligados neste aparelho.', tom: 'ok' })
    } catch (e) {
      setAvisoPush({ texto: 'Não consegui desligar: ' + e.message, tom: 'erro' })
    }
  }

  const suportado = avisoSuportado()
  const mostrarBotao = suportado && (!!assinatura || !negado)

  return (
    <section id="mvArquivos">
      <div className="pn-vista-cabeca" data-acento="roxo">
        <span className="pn-acento-disco" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 5v14.4" /><path d="M9.4 13.6 16 20.2l6.6-6.6" /><path d="M6 25.8h20" />
          </svg>
        </span>
        <span className="pn-vista-cabeca__texto">
          <span className="pn-vista-cabeca__titulo">Arquivos</span>
          <span className="pn-vista-cabeca__nota">Downloads e avisos deste aparelho</span>
        </span>
      </div>

      {erro && <p className="nota">{erro}</p>}

      {arquivos && arquivos.length > 0 && (
        <div className="card">
          <p className="rotulo">Downloads</p>
          <h2>Arquivos da organização</h2>
          <div>
            {arquivos.map((a) => {
              const detalhe = [a.versao ? 'versão ' + a.versao : '', a.descricao || ''].filter(Boolean).join(' · ')
              return (
                <div className="linha" key={a.id}>
                  <div className="corpo">
                    <b>{a.nome}</b>
                    {detalhe && <span>{detalhe}</span>}
                  </div>
                  <div className="lado">
                    <button className="link" type="button" disabled={baixando === a.path} onClick={() => baixar(a.path)}>
                      {baixando === a.path ? 'abrindo…' : 'baixar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {avisoBaixar && <p className="nota" style={{ color: '#FF4810' }}>{avisoBaixar}</p>}
        </div>
      )}

      <div className="card" style={{ marginTop: 22 }}>
        <p className="rotulo">Neste aparelho</p>
        <h2>Avisos</h2>
        <p className="nota">
          Ligue para saber na hora quando a organização pedir algo ou publicar um arquivo,
          mesmo com esta página fechada.
        </p>

        {!suportado && (
          <p className="nota" style={{ marginTop: 14 }}>
            <b>Este navegador não recebe avisos.</b> No iPhone, instale esta área primeiro:
            botão de compartilhar do Safari, depois "Adicionar à Tela de Início". Abra pelo
            ícone e volte aqui.
          </p>
        )}

        {suportado && (
          <>
            <p style={{ marginTop: 14 }}>
              <b>{assinatura ? 'Ligados neste aparelho' : (negado ? 'Bloqueados no navegador' : 'Desligados neste aparelho')}</b>
            </p>
            {negado && !assinatura && (
              <p className="nota">
                A permissão foi negada. Reabrir depende das configurações do navegador para
                este site: esta página não consegue pedir de novo.
              </p>
            )}
            {avisoPush && (
              <p className="nota" style={avisoPush.tom === 'erro' ? { color: '#FF4810' } : undefined}>{avisoPush.texto}</p>
            )}
            {mostrarBotao && (
              <button className="btn" type="button" onClick={assinatura ? desligarAvisos : ligarAvisos}>
                {assinatura ? 'Desligar avisos' : 'Ligar avisos'}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
