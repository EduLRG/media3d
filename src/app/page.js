import { supabase } from '@/lib/supabase';
import DisciplinasGrid from '@/components/DisciplinasGrid';

/* ─── Fetches server-side (correm em paralelo) ─────────────────── */

async function getPrograma() {
  const { data, error } = await supabase
    .from('programa')
    .select('codigo, descricao, entidade!id_entidade(nome)')
    .limit(1)
    .single();

  if (error) {
    console.error('[Supabase] Erro ao carregar programa:', error.message);
    return null;
  }
  return data; // { codigo, descricao, entidade: { nome } }
}

async function getModulos() {
  const { data, error } = await supabase
    .from('modulo')
    .select(`
      id_modulo, id_programa, nome, codigo, descricao, ano, semestre,
      modulo_media ( media_items ( tipo, url ) )
    `)
    // Ordenação base no servidor: ano → semestre → nome
    .order('ano',      { ascending: true })
    .order('semestre', { ascending: true })
    .order('nome',     { ascending: true });

  if (error) {
    console.error('[Supabase] Erro ao carregar módulos:', error.message);
    return { data: [], error: error.message };
  }
  return { data: data ?? [], error: null };
}

/* ─── Metadata dinâmico ────────────────────────────────────────── */
export async function generateMetadata() {
  const programa = await getPrograma();
  const codigo = programa?.codigo ?? 'ECGM';
  return {
    title: `media3d — ${codigo}`,
    description: programa?.descricao ?? 'Plataforma de projetos do curso ECGM',
  };
}

/* ─── Página ────────────────────────────────────────────────────── */
export default async function HomePage() {
  // Ambos os fetches correm ao mesmo tempo
  const [programa, { data: modulos, error }] = await Promise.all([
    getPrograma(),
    getModulos(),
  ]);

  const codigoCurso = programa?.codigo        ?? 'ECGM';
  const descricao   = programa?.descricao     ?? 'Explora os trabalhos desenvolvidos pelos alunos em cada disciplina do programa.';
  const nomeEscola  = programa?.entidade?.nome ?? '';

  return (
    <main className="min-h-screen bg-[#0c0c0f] text-white">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0c0c0f]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

          {/* Esquerda: logo + código do curso */}
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-bold tracking-tight text-white">media3d</span>
            {codigoCurso && (
              <>
                <span className="text-white/15 select-none">/</span>
                <span className="text-sm font-semibold text-[#4f9eff] tracking-wide">
                  {codigoCurso}
                </span>
              </>
            )}
          </div>

          {/* Direita: nome da escola + link admin */}
          <div className="flex items-center gap-4">
            {nomeEscola && (
              <span className="text-xs text-white/25 hidden md:block">{nomeEscola}</span>
            )}
            <a
              href="/admin/login"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs
                         font-medium text-white/50 transition hover:border-white/20 hover:text-white/80"
            >
              Área Admin
            </a>
          </div>

        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="px-6 pb-10 pt-20 text-center">
        <div className="mx-auto max-w-2xl">

          {/* Pill com o nome da escola */}
          {nomeEscola && (
            <span className="mb-6 inline-block rounded-full border border-[#4f9eff]/25 bg-[#4f9eff]/10
                             px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#4f9eff]">
              {nomeEscola}
            </span>
          )}

          {/* Título: só o código do curso */}
          <h1 className="mt-4 text-6xl font-bold leading-none tracking-tight text-white">
            <span className="text-[#4f9eff]">{codigoCurso}</span>
          </h1>

          {/* Descrição do programa */}
          {descricao && (
            <p className="mt-5 text-lg text-white/45 leading-relaxed max-w-xl mx-auto">
              {descricao}
            </p>
          )}

        </div>
      </section>

      {/* ── Grelha com filtros ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">

        {/* Banner de erro */}
        {error && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-semibold text-red-400 mb-1">⚠ Erro ao ligar ao Supabase</p>
            <p className="text-xs font-mono text-red-300/70 break-all">{error}</p>
            <p className="mt-2 text-xs text-red-300/50">
              Verifica as variáveis{' '}
              <code className="bg-white/5 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
              <code className="bg-white/5 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
              no <code className="bg-white/5 px-1 rounded">.env.local</code> e reinicia o servidor.
            </p>
          </div>
        )}

        {!error && (
          <DisciplinasGrid modulos={modulos} />
        )}

      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span className="text-xs text-white/20">
            © {new Date().getFullYear()} {nomeEscola || 'ECGM'} — media3d
          </span>
          <span className="text-xs text-white/15">Next.js · Supabase · Three.js</span>
        </div>
      </footer>

    </main>
  );
}
