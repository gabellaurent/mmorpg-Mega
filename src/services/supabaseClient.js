// Cliente do Supabase & Detector de Modo Local/Fallback
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verifica se as credenciais do Supabase foram preenchidas corretamente
export const isSupabaseConfigured = 
  supabaseUrl.length > 0 && 
  !supabaseUrl.includes('YOUR_SUPABASE') &&
  supabaseAnonKey.length > 0 && 
  !supabaseAnonKey.includes('YOUR_SUPABASE');

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (isSupabaseConfigured) {
  console.log('✅ Supabase conectado com sucesso em:', supabaseUrl);
} else {
  console.warn('⚠️ Supabase não configurado ou credenciais pendentes. Ativando Modo Sandbox Local (Multi-Aba em Tempo Real).');
}
