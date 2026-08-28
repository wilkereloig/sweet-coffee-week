import React from 'react'
import { NotificacoesOrg } from './NotificacoesOrg'

export const DESTINOS = ['mesa', 'respostas', 'participantes', 'producao', 'equipe']

export const TITULOS = {
  mesa: ['A mesa', 'onde cada marca está'],
  respostas: ['Respostas', 'dos formulários do site'],
  participantes: ['Marcas', 'com acesso ao cadastro'],
  producao: ['Produção', 'pedidos, arquivos e fotos'],
  equipe: ['Equipe', 'edição e contas'],
}

// Uma cor da paleta fechada por vista, nunca repetida (CLAUDE.md §6.3).
const ACENTO_VISTA = { mesa: 'amarelo', respostas: 'cyan', participantes: 'roxo', producao: 'laranja', equipe: 'marrom' }

// Exportado: é a mesma peça que VistaCabeca usa no topo de cada vista
// (§5.3 — não duplicar o SVG por página).
export const ICONE = {
  mesa: <><path d="M5 20V11" /><path d="M12 20V5" /><path d="M19 20v-6" /><path d="M3.5 20h17" /></>,
  respostas: <><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.1A7.5 7.5 0 1 1 20 12Z" /><path d="M9 11h6" /><path d="M9 14.5h3.5" /></>,
  // Copiado de public/painel/index.html (#vista-participantes, ~1245).
  participantes: <><path d="M4 20v-1.5A4.5 4.5 0 0 1 8.5 14h3A4.5 4.5 0 0 1 16 18.5V20" /><circle cx="10" cy="7.5" r="3.5" /><path d="M17.5 13.5h4" /><path d="M19.5 11.5v4" /></>,
  // Copiado de public/painel/index.html (#vista-producao, ~1269).
  producao: <><path d="M8 4H6.5A1.5 1.5 0 0 0 5 5.5v14A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-14A1.5 1.5 0 0 0 17.5 4H16" /><rect x="8.5" y="2.5" width="7" height="3.5" rx="1.2" /><path d="m8.5 12 2 2 3.5-3.5" /><path d="M8.5 17h5" /></>,
  // equipe: ícone real, copiado de public/painel/index.html (#vista-equipe).
  equipe: <>
    <circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2" />
    <circle cx="16.5" cy="15.5" r="2.5" /><path d="M16.5 11.5v1.2" /><path d="M16.5 18.3v1.2" />
    <path d="m13.6 13.2.9.6" /><path d="m18.5 16.7.9.6" />
  </>,
}

function aplicarAcento(vista) {
  const cor = ACENTO_VISTA[vista] || 'amarelo'
  const escura = cor === 'roxo' || cor === 'marrom'
  document.body.style.setProperty('--pn-acento', 'var(--scw-' + cor + ')')
  document.body.style.setProperty('--pn-acento-tinta', 'var(--scw-' + (escura ? 'creme' : 'choco') + ')')
  document.body.style.setProperty('--pn-acento-escuro', 'var(--scw-' + (escura ? 'amarelo' : cor) + ')')
}

export function PainelShell({ vistas, onSair, permissoes = null }) {
  // Fase 3 do plano de funções da organização (27/08/2026): a UI reflete o
  // que a sessão pode fazer. `permissoes === null` é a senha única — o banco
  // libera qualquer ação por ela (pode(), segunda perna do OR), então a UI
  // não pode mentir mostrando restrição que não existe. `permissoes` é o
  // array `acoes` de `minhas_permissoes()` (Fase 1) só pra sessão nominal.
  // ⚠️ A UI é conveniência, não segurança — todo botão aqui desabilitado
  // continua protegido pela RPC/guard correspondente, que é quem decide de
  // verdade (CLAUDE.md, este mesmo princípio vale pra todo o painel).
  // (Inline, não extraído num "hook" à parte: um nome fora do padrão
  // `use*` chamando `useCallback` por dentro engana ferramenta de lint —
  // achado de revisão adversarial. Único chamador, não valia a indireção.)
  const pode = React.useCallback((acao) => permissoes === null || permissoes.includes(acao), [permissoes])
  // Equipe é a única vista inteiramente administrativa (plano, Fase 3, item
  // 3) — some da navegação pra quem não tem acesso.gerir, em vez de aparecer
  // com botão desabilitado. As outras quatro continuam visíveis: elas têm
  // leitura útil pra todo mundo, só a ESCRITA é que varia por ação.
  const visiveis = pode('acesso.gerir') ? DESTINOS : DESTINOS.filter((d) => d !== 'equipe')

  // 'mesa' é a vista inicial de verdade (public/painel/index.html, irPara()).
  const [vista, setVista] = React.useState('mesa')
  // A vista ativa "registra" sua própria função de recarregar aqui — é o
  // botão "atualizar" do cabeçalho que chama, sem o shell saber como cada
  // vista busca os próprios dados (abrirFolha é a mesma ideia: uma função
  // central em vez de cada chamador reimplementar o gesto, §5.3).
  const atualizarRef = React.useRef(null)
  // Dados que cada vista carrega, por chave (`dados`/`solicitacoes`/`sessoes`/
  // `participantes`) — é o que NotificacoesOrg deriva. Estado de verdade, não
  // ref: precisa re-renderizar o sino quando a vista termina de carregar.
  const [estadoNotif, setEstadoNotif] = React.useState({})

  React.useEffect(() => { aplicarAcento(vista) }, [vista])

  const [titulo, sub] = TITULOS[vista] || TITULOS.respostas
  const Vista = vistas[vista]

  function registrarAtualizar(fn) { atualizarRef.current = fn }
  function atualizar() { if (atualizarRef.current) atualizarRef.current() }
  const reportarEstado = React.useCallback((parcial) => {
    setEstadoNotif((atual) => ({ ...atual, ...parcial }))
  }, [])

  // ⚠️ Reset síncrono, não em useEffect: efeito do FILHO (Respostas
  // registrando `carregar`) dispara antes do efeito do PAI no mesmo commit
  // (ordem post-order do React) — um `useEffect(() => ref.current = null,
  // [vista])` aqui apagaria o registro que o filho acabou de fazer no mount,
  // e o botão "Atualizar" nunca funcionaria. Zerar antes de trocar de vista
  // evita chamar a função da vista antiga sem depender da ordem de efeitos.
  function irPara(v) {
    atualizarRef.current = null
    setVista(v)
  }

  return (
    // O CSS copiado (Task 7) tem um seletor de ID, `#painel{display:grid;
    // grid-template-rows:auto 1fr auto}`, que rege a casca inteira: linha 1
    // cabeçalho, linha 2 conteúdo, linha 3 barra de abas do celular. Sem
    // este `<div id="painel">` envolvendo tudo, nenhuma dessas regras se
    // aplica — a rail vira uma barra full-width em vez de coluna de 72px.
    // Achado na revisão da Task 7 (CSS correto, JSX incompleto).
    <div id="painel">
      <nav className="pn-rail" aria-label="Seções do painel">
        <img className="pn-rail__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        {visiveis.map((d) => (
          <button
            key={d}
            className="pn-rail__btn"
            type="button"
            title={TITULOS[d][0]}
            // O estado ativo do rail é por atributo, não por classe — é
            // `.pn-rail__btn[aria-current="page"]` no CSS copiado, não
            // `.is-ativa` (essa classe é da OUTRA peça, `.og-abaapp`, da
            // barra de abas do celular logo abaixo).
            aria-current={d === vista ? 'page' : undefined}
            onClick={() => irPara(d)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONE[d]}
            </svg>
          </button>
        ))}
        {/* Sair do desktop mora na rail (≤900px a rail some, então esta
            peça some com ela) — o do cabeçalho abaixo é só para o celular,
            escondido acima de 900px por `#btn-sair` em painel.css. */}
        <button className="pn-rail__sair" type="button" title="Sair" onClick={onSair}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8.6 17.6 15 11l-6.4-6.6" /><path d="M15 11H3.4" /><path d="M18.6 4.4v13.2" />
          </svg>
        </button>
      </nav>

      <header className="pn-cabeca">
        <img className="pn-cabeca__marca" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <div className="pn-cabeca__texto">
          <p className="pn-cabeca__titulo">{titulo}</p>
          <p className="pn-cabeca__sub">{sub}</p>
        </div>
        <div className="pn-cabeca__dir">
          <button className="pn-cabeca__btn" type="button" aria-label="Atualizar" onClick={atualizar}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4.6 12a7.4 7.4 0 0 1 12.6-5.2l1.8 1.7" /><path d="M19 4.6v4.4h-4.4" />
              <path d="M19.4 12a7.4 7.4 0 0 1-12.6 5.2l-1.8-1.7" /><path d="M5 19.4V15h4.4" />
            </svg>
          </button>
          <NotificacoesOrg estado={estadoNotif} onNavegar={irPara} />
          {/* Sair só aparece aqui ≤900px (CSS por id) — no desktop a rail já tem o dela. */}
          <button className="pn-cabeca__btn" type="button" id="btn-sair" aria-label="Sair" onClick={onSair}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8.6 17.6 15 11l-6.4-6.6" /><path d="M15 11H3.4" /><path d="M18.6 4.4v13.2" />
            </svg>
          </button>
        </div>
      </header>

      <main className="og-corpo">
        {Vista ? <Vista registrarAtualizar={registrarAtualizar} reportarEstado={reportarEstado} pode={pode} /> : <p>Em construção — chega na Fase 2.</p>}
      </main>

      {/* Barra de abas do celular (≤900px) — equivalente mobile da rail.
          Faltava inteira: sem ela, o celular não tinha navegação nenhuma
          (a rail já se esconde em ≤900px por CSS). Markup e classes
          copiados de public/painel/index.html:1377-1410, mesmo padrão de
          MobileTabBar.jsx do site (indicador de 3px por --og-i). */}
      <nav className="og-abasapp" aria-label="Seções do painel">
        <div className="og-abasapp__grade" style={{ '--og-i': visiveis.indexOf(vista), '--og-cols': visiveis.length }}>
          <span className="og-abasapp__indicador" aria-hidden="true" />
          {visiveis.map((d) => (
            <button
              key={d}
              className={'og-abaapp' + (d === vista ? ' is-ativa' : '')}
              type="button"
              aria-current={d === vista ? 'page' : undefined}
              onClick={() => irPara(d)}
            >
              <svg className="og-abaapp__icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONE[d]}
              </svg>
              <span className="og-abaapp__rotulo">{TITULOS[d][0].split(' ').pop().toLowerCase()}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
