// Carrega este design system no template.
//
// O caminho até o DS muda conforme onde o template está:
//   1. DENTRO do próprio design system, em templates/site-completo/  → '../..'
//   2. copiado para um projeto consumidor, com o DS vinculado         → '_ds/<pasta>'
//
// Antes isto era a constante fixa `const base = '../..'`. Funcionava no lugar de
// origem e quebrava em silêncio no destino: os três CSS retornavam 404 e a
// página abria sem estilo nenhum, sem nada no console além do erro do bundle.
// Agora a base é descoberta por sondagem, e a falha é visível.
//
// Se a detecção não servir, defina antes de carregar este arquivo:
//   <script>window.SCW_DS_BASE = '_ds/nome-da-pasta-do-ds'</script>
(() => {
  const CSS = ['fonts/fonts.css', '_ds_bundle.css', 'styles.css'];
  // Sonda com nome exclusivo do DS: 'styles.css' é genérico e um projeto
  // consumidor pode ter o seu na raiz, dando falso positivo em '.'.
  const SONDA = '_ds_bundle.css';

  /** Candidatos de base, do mais provável ao menos. */
  async function candidatos() {
    const fora = [];
    // Dentro do próprio DS o template mora em templates/<nome>/ — sondar '_ds/'
    // aqui só produziria um 404 no console, e ruído de rede é o que faz erro de
    // verdade passar despercebido. Pula direto pros caminhos fixos.
    const dentroDoDS = /\/templates\//.test(location.pathname);
    if (dentroDoDS) return ['../..', '..', '.'];
    // Projeto consumidor: o DS mora em _ds/<pasta>, e o nome carrega um uuid —
    // não dá pra adivinhar, então tenta descobrir pela listagem do diretório.
    try {
      const r = await fetch('_ds/');
      if (r.ok) {
        const txt = await r.text();
        for (const m of txt.matchAll(/href="([^"?#]+)"/g)) {
          const nome = m[1].replace(/^\.?\//, '').replace(/\/$/, '');
          if (nome && !nome.startsWith('.') && !nome.includes('/')) fora.push('_ds/' + nome);
        }
      }
    } catch (e) { /* sem listagem: segue pros caminhos fixos */ }
    // '../..' cobre o template dentro do DS; '.' e '..' cobrem cópias rasas.
    return fora.concat(['../..', '..', '.']);
  }

  /**
   * `r.ok` sozinho não basta: host estático com fallback de SPA devolve 200 com
   * o index.html para QUALQUER caminho inexistente, e '../..' escaparia pra
   * raiz do host aceitando uma base errada. Confere que veio CSS mesmo.
   */
  async function serveCss(url) {
    const r = await fetch(url);
    if (!r.ok) return false;
    const tipo = (r.headers.get('content-type') || '').toLowerCase();
    if (tipo.includes('html')) return false;
    return !(await r.text()).trimStart().startsWith('<');
  }

  async function acharBase() {
    if (typeof window !== 'undefined' && window.SCW_DS_BASE) return window.SCW_DS_BASE;
    for (const c of await candidatos()) {
      try {
        if (await serveCss(c + '/' + SONDA)) return c;
      } catch (e) { /* candidato inválido */ }
    }
    return null;
  }

  function avisar(msg) {
    console.error('ds-base.js: ' + msg);
    const el = document.createElement('div');
    el.setAttribute('role', 'alert');
    el.style.cssText = 'position:fixed;z-index:2147483647;inset:12px 12px auto 12px;' +
      'padding:14px 16px;border-radius:10px;background:#3D1308;color:#FEF0DD;' +
      'font:600 13px/1.5 ui-sans-serif,system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.4)';
    el.textContent = 'Design system não encontrado. ' + msg +
      ' Defina window.SCW_DS_BASE = "_ds/<pasta-do-ds>" antes de carregar ds-base.js.';
    (document.body || document.documentElement).appendChild(el);
  }

  (async () => {
    const base = await acharBase();
    if (!base) {
      avisar('Nenhum caminho candidato serviu ' + SONDA + '.');
      return;
    }

    for (const p of CSS) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = base + '/' + p;
      document.head.appendChild(l);
    }

    // O bundle lê window.React na inicialização — só carrega quando o React existir.
    const s = document.createElement('script');
    s.src = base + '/_ds_bundle.js';
    s.onerror = () => avisar('Falhou ao carregar ' + s.src + '.');

    let tentativas = 0;
    const carrega = () => {
      if (!window.React) {
        if (++tentativas > 200) return avisar('window.React nunca apareceu.');
        return setTimeout(carrega, 30);
      }
      document.head.appendChild(s);
    };
    carrega();
  })();
})();
