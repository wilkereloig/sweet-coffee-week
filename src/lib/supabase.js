import { createClient } from '@supabase/supabase-js'

// URL + publishable key do projeto Sweet Awards.
// A publishable key é PÚBLICA por design (vai no bundle do front); a segurança
// vem das regras (RLS) e das funções no banco. Pode sobrescrever via env.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dgfmoibynftadsyjcclg.supabase.co'
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_E6G4mwt0xFzz_Ob0dULd9g_NhlJpH2R'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
})
