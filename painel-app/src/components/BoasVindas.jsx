import React from 'react'

/*
 * Tela de escolha do login duplo — porte de public/painel/index.html
 * (#pnEscolha, linhas 1030-1054). SVGs copiados byte a byte dos dois
 * cartões (mesmos ícones que LoginOrganizacao.jsx e LoginMarca.jsx usam
 * no próprio formulário).
 */
export function BoasVindas({ onEscolherOrg, onEscolherMarca }) {
  return (
    <div className="pn-porta" id="login">
      <div className="pn-porta__caixa">
        <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <div>
          <h1 className="pn-porta__titulo">Bem-vindo ao Painel SCW</h1>
          <p className="pn-porta__lead">Entre com o login que você recebeu. Cada acesso abre uma área diferente.</p>

          <div className="pn-porta__grade">
            <button type="button" className="pn-setor pn-setor--org pn-setor--escolha" onClick={onEscolherOrg}>
              <span className="pn-setor__disco" aria-hidden="true">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12.4" cy="10.6" r="5" fill="currentColor" stroke="none" />
                  <path d="M4.6 25.6c0-4.4 3.5-7.8 7.8-7.8s7.8 3.4 7.8 7.8" />
                  <circle cx="23.4" cy="13" r="3.4" fill="currentColor" stroke="none" />
                  <path d="M21.8 19.6c3.4.6 5.8 3.2 5.8 6.4" />
                </svg>
              </span>
              <span>
                <span className="pn-setor__nome">Sou da organização</span>
                <span className="pn-setor__nota">Equipe do festival. Vê todas as marcas e move o caminho.</span>
              </span>
            </button>

            <button type="button" className="pn-setor pn-setor--marca pn-setor--escolha" onClick={onEscolherMarca}>
              <span className="pn-setor__disco" aria-hidden="true">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.6 11.4h18.8l-1.4 14a2.2 2.2 0 0 1-2.2 2H10.2a2.2 2.2 0 0 1-2.2-2Z" />
                  <path d="M11.8 11.4V9a4.2 4.2 0 0 1 8.4 0v2.4" />
                </svg>
              </span>
              <span>
                <span className="pn-setor__nome">Sou participante</span>
                <span className="pn-setor__nota">Sua casa. Cadastro do combo, pedidos e a venda de cada dia.</span>
              </span>
            </button>
          </div>

          <div className="pn-porta__pe">
            <span className="pn-porta__nota">
              Ainda não tem acesso? Ele é criado pela organização depois que a inscrição é aprovada, e chega pelo
              mesmo canal em que vocês já falam.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
