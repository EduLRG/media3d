'use client';

import { useEffect, useState, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import LogoModelo3D from '@/components/LogoModelo3D';

const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
  placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1
  focus:ring-[#4f9eff]/30 transition`;

const ANIM_OPTS = [
  { value: 'none',     label: 'Sem Animação' },
  { value: 'rotation', label: 'Rotação'      },
  { value: 'float',    label: 'Flutuação'    },
];

function AnimPicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {ANIM_OPTS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition
            ${value === opt.value
              ? 'border-[#4f9eff] bg-[#4f9eff]/10 text-[#4f9eff]'
              : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function LogoPage() {
  const [entidades,   setEntidades]   = useState([]);
  const [entidadeId,  setEntidadeId]  = useState('');
  const [programas,   setProgramas]   = useState([]);
  const [programaId,  setProgramaId]  = useState('');
  const [logoExistente, setLogoExistente] = useState(null);
  const [status,      setStatus]      = useState('idle'); // idle | loading | loaded
  const [toggle,      setToggle]      = useState(false);
  const [file,        setFile]        = useState(null);
  const [fileUrl,     setFileUrl]     = useState('');
  const [escala,      setEscala]      = useState(1.0);
  const [animacao,    setAnimacao]    = useState('rotation');
  const [editAnimacao, setEditAnimacao] = useState('rotation');
  const [savingAnim,  setSavingAnim]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [toast,       setToast]       = useState('');
  const fileRef = useRef();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  /* ─── Carregar entidades ─────────────────────────────────────── */
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.from('entidade').select('id_entidade, nome').order('nome').then(({ data }) => {
      setEntidades(data || []);
    });
  }, []);

  /* ─── Carregar programas ao mudar entidade ───────────────────── */
  useEffect(() => {
    if (!entidadeId) { setProgramas([]); return; }
    const supabase = createSupabaseBrowser();
    supabase
      .from('programa')
      .select('id_programa, nome, codigo')
      .eq('id_entidade', entidadeId)
      .order('codigo')
      .then(({ data }) => setProgramas(data || []));
  }, [entidadeId]);

  /* ─── Carregar logo3d ao mudar programa ──────────────────────── */
  useEffect(() => {
    if (!programaId) { setLogoExistente(null); setStatus('idle'); return; }
    setStatus('loading');
    const supabase = createSupabaseBrowser();
    supabase
      .from('media_items')
      .select('*')
      .eq('tipo', 'logo3d')
      .eq('id_programa', programaId)
      .maybeSingle()
      .then(({ data }) => {
        setLogoExistente(data ?? null);
        setEditAnimacao(data?.animacao_tipo ?? 'rotation');
        setStatus('loaded');
      });
  }, [programaId]);

  function handleFileChange(e) {
    const f = e.target.files[0] ?? null;
    setFile(f);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(f ? URL.createObjectURL(f) : '');
  }

  async function handleSalvarAnimacao() {
    if (!logoExistente) return;
    setSavingAnim(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from('media_items')
      .update({ animacao_tipo: editAnimacao })
      .eq('id_media_items', logoExistente.id_media_items);
    if (error) {
      showToast('Erro ao guardar animação: ' + error.message);
    } else {
      showToast('Animação guardada!');
      setLogoExistente({ ...logoExistente, animacao_tipo: editAnimacao });
    }
    setSavingAnim(false);
  }

  function resetForm() {
    setFile(null);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl('');
    setEscala(1.0);
    setToggle(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleGuardar() {
    if (!file || !programaId) return;
    setSaving(true);

    const formData = new FormData();
    formData.append('file', file);
    const res  = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await res.json();

    if (!res.ok) {
      showToast('Erro no upload: ' + (json.error ?? res.statusText));
      setSaving(false);
      return;
    }

    const supabase = createSupabaseBrowser();
    const { error } = await supabase.from('media_items').insert([{
      tipo:         'logo3d',
      url:          json.url,
      escala,
      animacao_tipo: animacao,
      id_programa:  Number(programaId),
    }]);

    if (error) {
      showToast('Erro ao guardar logo: ' + error.message);
    } else {
      showToast('Logo guardado com sucesso!');
      resetForm();
      setStatus('loading');
      const { data } = await supabase
        .from('media_items')
        .select('*')
        .eq('tipo', 'logo3d')
        .eq('id_programa', programaId)
        .maybeSingle();
      setLogoExistente(data ?? null);
      setEditAnimacao(data?.animacao_tipo ?? 'rotation');
      setStatus('loaded');
    }
    setSaving(false);
  }

  async function handleEliminar() {
    if (!logoExistente) return;
    setDeleting(true);

    if (logoExistente.url) {
      const res = await fetch('/api/delete-model', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: logoExistente.url }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast('Erro ao apagar ficheiro: ' + (json.error ?? res.statusText));
        setDeleting(false);
        return;
      }
    }

    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id_media_items', logoExistente.id_media_items);

    if (error) {
      showToast('Erro ao apagar no Supabase: ' + error.message);
    } else {
      showToast('Logo eliminado.');
      setLogoExistente(null);
    }
    setDeleting(false);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-white/10 bg-[#13131a]
                        px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Logo do Programa</h1>
        <p className="text-sm text-white/35 mt-1">
          Associa um modelo 3D como logótipo de um programa. Substitui o texto do código no hero da página pública.
        </p>
      </div>

      {/* Card principal */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] p-6 space-y-6">

        {/* Selects encadeados */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Entidade</label>
            <select
              className={inputCls}
              value={entidadeId}
              onChange={e => {
                setEntidadeId(e.target.value);
                setProgramaId('');
                setLogoExistente(null);
                setStatus('idle');
                resetForm();
              }}
            >
              <option value="">Seleciona entidade…</option>
              {entidades.map(ent => (
                <option key={ent.id_entidade} value={ent.id_entidade}>{ent.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Programa</label>
            <select
              className={inputCls}
              value={programaId}
              onChange={e => { setProgramaId(e.target.value); resetForm(); }}
              disabled={!entidadeId || programas.length === 0}
            >
              <option value="">Seleciona programa…</option>
              {programas.map(p => (
                <option key={p.id_programa} value={p.id_programa}>
                  {p.codigo} — {p.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* A carregar */}
        {status === 'loading' && (
          <p className="text-xs text-white/25 text-center py-6">A carregar…</p>
        )}

        {/* Logo existente */}
        {status === 'loaded' && logoExistente && (
          <div className="space-y-4">
            <div className="flex items-start gap-6 p-4 rounded-lg border border-white/8 bg-white/2">
              <div
                className="rounded-lg border border-white/8 bg-[#0c0c0f] overflow-hidden flex-shrink-0"
                style={{ width: 200, height: 200 }}
              >
                <LogoModelo3D
                  url={logoExistente.url}
                  escala={logoExistente.escala ?? 1.0}
                  animacao={editAnimacao}
                  width={200}
                  height={200}
                />
              </div>
              <div className="flex-1 space-y-4 pt-1">
                <div>
                  <p className="text-xs text-white/35 mb-1">URL do ficheiro</p>
                  <a
                    href={logoExistente.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#4f9eff]/60 hover:text-[#4f9eff] break-all transition"
                  >
                    {logoExistente.url}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-white/35 mb-2">Animação</p>
                  <AnimPicker value={editAnimacao} onChange={setEditAnimacao} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSalvarAnimacao}
                    disabled={savingAnim || editAnimacao === (logoExistente.animacao_tipo ?? 'rotation')}
                    className="rounded-lg bg-[#4f9eff] px-4 py-2 text-xs font-semibold text-white
                               hover:bg-[#3d8aef] transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingAnim ? 'A guardar…' : 'Guardar animação'}
                  </button>
                  <button
                    onClick={handleEliminar}
                    disabled={deleting}
                    className="rounded-lg border border-red-500/20 px-4 py-2 text-xs font-medium
                               text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'A eliminar…' : 'Eliminar logo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sem logo */}
        {status === 'loaded' && !logoExistente && (
          <div className="space-y-4">

            {/* Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setToggle(v => { if (v) resetForm(); return !v; })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition
                  ${toggle ? 'bg-[#4f9eff]' : 'bg-white/10'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition
                  ${toggle ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-white/50">Usar modelo 3D como logo</span>
            </div>

            {/* Formulário de upload */}
            {toggle && (
              <div className="space-y-5 pt-1">

                {/* File picker */}
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Ficheiro GLB *</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 cursor-pointer transition
                      ${file ? 'border-[#4f9eff]/40 bg-[#4f9eff]/5' : 'border-white/10 hover:border-white/20'}`}
                  >
                    <span className="text-2xl">{file ? '🧊' : '📁'}</span>
                    <div className="flex-1 min-w-0">
                      {file ? (
                        <>
                          <p className="text-sm font-medium text-white/80 truncate">{file.name}</p>
                          <p className="text-xs text-white/30">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </>
                      ) : (
                        <p className="text-sm text-white/30">Clica para selecionar um ficheiro .glb</p>
                      )}
                    </div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".glb"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Preview + Slider */}
                {fileUrl && (
                  <div className="flex items-start gap-6">
                    <div
                      className="rounded-lg border border-white/8 bg-[#0c0c0f] overflow-hidden flex-shrink-0"
                      style={{ width: 200, height: 200 }}
                    >
                      <LogoModelo3D url={fileUrl} escala={escala} width={200} height={200} />
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-white/50">Escala</label>
                        <span className="text-xs font-mono text-[#4f9eff]">{escala.toFixed(1)}</span>
                      </div>
                      <input
                        type="range" min={0.1} max={5} step={0.1}
                        value={escala}
                        onChange={e => setEscala(parseFloat(e.target.value))}
                        className="w-full accent-[#4f9eff] cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Animação */}
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">Animação</label>
                  <AnimPicker value={animacao} onChange={setAnimacao} />
                </div>

                {/* Botões */}
                <div className="flex gap-3">
                  <button
                    onClick={handleGuardar}
                    disabled={saving || !file}
                    className="rounded-lg bg-[#4f9eff] px-5 py-2.5 text-sm font-semibold text-white
                               hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'A guardar…' : 'Guardar Logo'}
                  </button>
                  <button
                    onClick={resetForm}
                    disabled={saving}
                    className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium
                               text-white/50 hover:bg-white/5 hover:text-white/80 transition"
                  >
                    Remover
                  </button>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Placeholder */}
        {status === 'idle' && (
          <p className="text-xs text-white/20 text-center py-6">
            Seleciona uma entidade e um programa para gerir o logo 3D.
          </p>
        )}

      </div>
    </div>
  );
}
