import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase para componentes client-side ('use client').
 * Usa @supabase/ssr para gerir sessão em cookies (compatível com middleware).
 */
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
