'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
  placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1
  focus:ring-[#4f9eff]/30 transition`;

/* ─── Modal genérico ─────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#13131a] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── Formulário de novo modelo ──────────────────────────────────── */
function NovoModeloForm({ onSave, onCancel, saving }) {
  const [titulo,    setTitulo]    = useState('');
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const fileRef = useRef();

  async function handleSave() {
    if (!file)          { setError('Seleciona um ficheiro GLB.'); return; }
    if (!titulo.trim()) { setError('O título é obrigatório.'); return; }

    setUploading(true);
    setError('');

    // Upload para R2
    const formData = new FormData();
    formData.append('file', file);
    const res  = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Erro no upload.');
      setUploading(false);
      return;
    }

    // Inserir no Supabase
    await onSave({ titulo: titulo.trim(), url: json.url });
    setUploading(false);
  }

  const isBusy = saving || uploading;

  return (
    <div className="space-y-4">
      {/* Upload GLB */}
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
          {file && (
            <button
              onClick={e => { e.stopPropagation(); setFile(null); fileRef.current.value = ''; }}
              className="text-white/25 hover:text-red-400 transition text-lg leading-none"
            >×</button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".glb"
          className="hidden"
          onChange={e => { setFile(e.target.files[0] ?? null); setError(''); }}
        />
      </div>

      {/* Título */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Título *</label>
        <input
          className={inputCls}
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="ex: Modelo de Personagem"
        />
      </div>

      {/* Erro */}
      {error && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2.5">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={isBusy}
          className="flex-1 rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white
                     hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'A fazer upload…' : saving ? 'A guardar…' : 'Guardar'}
        </button>
        <button
          onClick={onCancel}
          disabled={isBusy}
          className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                     text-white/50 hover:bg-white/5 hover:text-white/80 transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────────────────── */
export default function ModelosPage() {
  const [modelos,       setModelos]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [toast,         setToast]         = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  /* ─── Listar modelos ─────────────────────────────────────────── */
  const fetchModelos = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('tipo', 'modelo3d')
      .order('id_media_items', { ascending: false });

    if (error) showToast('Erro ao carregar: ' + error.message);
    setModelos(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchModelos(); }, [fetchModelos]);

  /* ─── Adicionar modelo ───────────────────────────────────────── */
  async function handleCreate({ titulo, url }) {
    setSaving(true);
    const supabase = createSupabaseBrowser();

    const { error } = await supabase
      .from('media_items')
      .insert([{
        titulo,
        url,
        tipo:        'modelo3d',
        escala:      1.5,
        offset_y:    0,
        loop:        true,
        id_programa: 1,
      }]);

    if (error) {
      showToast('Erro ao guardar: ' + error.message);
    } else {
      showToast('Modelo adicionado com sucesso!');
      setShowModal(false);
      fetchModelos();
    }
    setSaving(false);
  }

  /* ─── Eliminar modelo ────────────────────────────────────────── */
  async function handleDelete() {
    setDeleting(true);

    // Encontra o URL do modelo a eliminar
    const modelo = modelos.find(m => m.id_media_items === confirmDelete);

    // 1. Apaga o ficheiro do R2
    if (modelo?.url) {
      const res = await fetch('/api/delete-model', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: modelo.url }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast('Erro ao apagar ficheiro R2: ' + (json.error ?? res.statusText));
        setDeleting(false);
        return;
      }
    }

    // 2. Apaga o registo no Supabase
    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id_media_items', confirmDelete);

    if (error) {
      showToast('Ficheiro R2 apagado, mas erro no Supabase: ' + error.message);
    } else {
      showToast('Modelo eliminado.');
      fetchModelos();
    }
    setConfirmDelete(null);
    setDeleting(false);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-white/10 bg-[#13131a]
                        px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Modelos 3D</h1>
          <p className="text-sm text-white/35 mt-1">
            {loading ? '…' : `${modelos.length} modelo${modelos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#4f9eff] px-4 py-2.5 text-sm
                     font-semibold text-white hover:bg-[#3d8aef] transition"
        >
          <span className="text-lg leading-none">+</span>
          Novo Modelo
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-white/25">A carregar…</div>
        ) : modelos.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">
            Nenhum modelo encontrado. Faz o upload do primeiro!
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/30 border-b border-white/5 bg-white/2">
                <th className="text-left px-5 py-3 font-medium">Título</th>
                <th className="text-left px-5 py-3 font-medium">Escala</th>
                <th className="text-left px-5 py-3 font-medium">URL</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {modelos.map((m, i) => (
                <tr
                  key={m.id_media_items}
                  className={`transition hover:bg-white/2 ${i !== modelos.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🧊</span>
                      <p className="font-medium text-white/85">{m.titulo ?? '—'}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-white/45 font-mono text-xs">
                    {m.escala ?? 1.5}
                  </td>
                  <td className="px-5 py-3.5">
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#4f9eff]/60 hover:text-[#4f9eff] transition truncate block max-w-[200px]"
                      title={m.url}
                    >
                      {m.url?.split('/').pop() ?? m.url}
                    </a>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setConfirmDelete(m.id_media_items)}
                      className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs font-medium
                                 text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal — Novo Modelo */}
      {showModal && (
        <Modal title="Novo Modelo 3D" onClose={() => setShowModal(false)}>
          <NovoModeloForm
            onSave={handleCreate}
            onCancel={() => setShowModal(false)}
            saving={saving}
          />
        </Modal>
      )}

      {/* Modal — Confirmar eliminação */}
      {confirmDelete !== null && (
        <Modal title="Confirmar eliminação" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-white/60 mb-6">
            Tens a certeza que queres eliminar este modelo?
            O ficheiro no R2 não será eliminado automaticamente.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-lg bg-red-500/80 py-2.5 text-sm font-semibold text-white
                         hover:bg-red-500 transition disabled:opacity-50"
            >
              {deleting ? 'A eliminar…' : 'Eliminar'}
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                         text-white/50 hover:bg-white/5 transition"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
