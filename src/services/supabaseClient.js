// Cliente do Supabase & Detector de Modo Local/Fallback
import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://pspmwhcteobbinyeeggs.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcG13aGN0ZW9iYmlueWVlZ2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NTUzODMsImV4cCI6MjA5MTAzMTM4M30.x5qjnYL18_yTUV6kuBHLPMrcEQTLYvNXnWrxNCcbif8';

// Leitura de variáveis do Vite com fallback seguro para carregamento direto do navegador
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ? import.meta.env.VITE_SUPABASE_URL : defaultUrl;
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ? import.meta.env.VITE_SUPABASE_ANON_KEY : defaultKey;

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
  console.warn('⚠️ Supabase não configurado. Ativando Modo Sandbox Local.');
}
