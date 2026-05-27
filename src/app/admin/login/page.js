'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Credenciais inválidas. Verifica o email e a password.');
      setLoading(false);
      return;
    }

    router.push('/admin/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / Título */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">media3d</span>
          <span className="text-[#4f9eff] mx-2 text-white/15">/</span>
          <span className="text-lg font-semibold text-[#4f9eff]">admin</span>
          <p className="mt-2 text-sm text-white/35">Acede ao painel de administração</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-[#13131a] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@exemplo.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5
                           text-sm text-white placeholder-white/20
                           focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30
                           transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5
                           text-sm text-white placeholder-white/20
                           focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30
                           transition"
              />
            </div>

            {/* Erro */}
            {error && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2.5">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#4f9eff] px-4 py-2.5 text-sm font-semibold
                         text-white transition hover:bg-[#3d8aef] active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'A entrar…' : 'Entrar'}
            </button>

          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/20">
          media3d — Painel de Administração
        </p>
      </div>
    </div>
  );
}
