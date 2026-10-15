// URL + publishable key do projeto (Sweet Awards / painel / edição).
// A publishable key é PÚBLICA por design (vai no bundle do front); a segurança
// vem das regras (RLS) e das funções no banco. Pode sobrescrever via env.
// Separado de supabase.js (14/10/2026) para a camada de edição ler a projeção
// pública com fetch, sem baixar o supabase-js.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dgfmoibynftadsyjcclg.supabase.co'
export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_E6G4mwt0xFzz_Ob0dULd9g_NhlJpH2R'
