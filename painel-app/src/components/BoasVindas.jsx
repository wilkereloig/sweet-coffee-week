import React from 'react'
import { Icone } from './Icone'

/*
 * Tela de escolha do login duplo — porte de public/painel/index.html
 * (#pnEscolha, linhas 1030-1054). SVGs copiados byte a byte dos dois
 * cartões (mesmos ícones que LoginOrganizacao.jsx e LoginMarca.jsx usam
 * no próprio formulário).
 */
export function BoasVindas({ onEscolherOrg, onEscolherMarca, aviso }) {
  return (
    <div className="pn-porta" id="login">
      <div className="pn-porta__caixa">
        <img className="pn-porta__selo" src="/images/logo-seal-sweet-coffee.svg" alt="Sweet & Coffee Week" />
        <div>
          <h1 className="pn-porta__titulo">Bem-vindo ao Painel SCW</h1>
          <p className="pn-porta__lead">Entre com o login que você recebeu. Cada acesso abre uma área diferente.</p>
          {aviso && <div className="pn-erro" role="alert">{aviso}</div>}

          <div className="pn-porta__grade">
            <button type="button" className="pn-setor pn-setor--org pn-setor--escolha" onClick={onEscolherOrg}>
              <span className="pn-setor__disco" aria-hidden="true">
                <Icone nome="operacao" tamanho={24} />
              </span>
              <span>
                <span className="pn-setor__nome">Sou da organização</span>
                <span className="pn-setor__nota">Equipe do festival. Vê todas as marcas e move o caminho.</span>
              </span>
            </button>

            <button type="button" className="pn-setor pn-setor--marca pn-setor--escolha" onClick={onEscolherMarca}>
              <span className="pn-setor__disco" aria-hidden="true">
                <Icone nome="loja" tamanho={24} />
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
