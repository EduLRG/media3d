'use client';

/**
 * DisciplinaCard — sem renderer próprio.
 *
 * No mouseenter passa ao ModelViewerGlobal:
 *   • url      — ficheiro GLB
 *   • escala   — lida da BD (media_items.escala); fallback 1.5
 *   • offset_y — lida da BD (media_items.offset_y); fallback 0
 *   • rect     — bounding box do card no viewport para o canvas ficar centrado
 *
 * @prop {string} basePath  — prefixo do link, ex: '/ipvc/ecgm'.
 *   Constrói o link como `${basePath}/${id_modulo}`.
 */

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { useModelViewer } from '@/context/ModelViewerContext';

export default function DisciplinaCard({ disciplina, basePath = '' }) {
  const { setActiveModel } = useModelViewer();
  const isHoveredRef = useRef(false);
  const divRef       = useRef(null);

  const { id_modulo, nome, codigo, descricao, ano, semestre, modulo_media } = disciplina;

  /* Encontra o primeiro item GLB do módulo (modulo_media → media_items) */
  const glbItem = modulo_media
    ?.flatMap(mm => (mm.media_items ? [mm.media_items] : []))
    .find(mi =>
      mi?.url?.toLowerCase().endsWith('.glb') ||
      mi?.tipo?.toLowerCase() === 'glb'
    ) ?? null;

  const glbUrl  = glbItem?.url    ?? null;
  const ESCALA  = glbItem?.escala   ?? 10;
  const OFFSET_Y = glbItem?.offset_y ?? 0;

  /* ─── Handlers de hover ────────────────────────────────────────── */
  function onEnter() {
    if (!glbUrl || !divRef.current) return;

    const r = divRef.current.getBoundingClientRect();

    isHoveredRef.current = true;
    setActiveModel({
      url:      glbUrl,
      escala:   ESCALA,
      offset_y: OFFSET_Y,
      rect: {
        centerX:    r.left + r.width  / 2,
        centerY:    r.top  + r.height / 2,
        canvasSize: Math.max(r.width, r.height) * 2,
      },
    });
  }

  function onLeave() {
    isHoveredRef.current = false;
    setActiveModel(null);
  }

  /* Cleanup: se o card desmontar enquanto está em hover, limpa o estado global */
  useEffect(() => {
    return () => {
      if (isHoveredRef.current) setActiveModel(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Link href={`${basePath}/${id_modulo}`} className="block group">
      <div
        ref={divRef}
        className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#13131a]
                   cursor-pointer transition-all duration-300
                   hover:border-[#4f9eff]/40 hover:shadow-xl hover:shadow-[#4f9eff]/10
                   hover:-translate-y-1"
        style={{ minHeight: '220px' }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {/* ── Conteúdo ────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col justify-between h-full p-6"
             style={{ minHeight: '220px' }}>

          {/* Badges ano / semestre */}
          <div className="flex items-center gap-2 flex-wrap">
            {ano != null && (
              <span className="rounded-full border border-[#4f9eff]/25 bg-[#4f9eff]/10
                               px-3 py-0.5 text-xs font-semibold text-[#4f9eff] tracking-wide">
                {ano}º Ano
              </span>
            )}
            {semestre != null && (
              <span className="rounded-full border border-white/8 bg-white/5
                               px-3 py-0.5 text-xs font-medium text-white/40 tracking-wide">
                {isNaN(Number(semestre)) ? semestre : `${semestre}º Sem`}
              </span>
            )}
            {/* Indicador visual se tem modelo 3D */}
            {glbUrl && (
              <span className="ml-auto rounded-full border border-white/8 bg-white/5
                               px-2.5 py-0.5 text-xs text-white/25 tracking-wide">
                3D
              </span>
            )}
          </div>

          {/* Nome + descrição */}
          <div className="mt-auto pt-6">
            {codigo && (
              <span className="text-xs font-mono text-white/25 tracking-widest uppercase mb-1 block">
                {codigo}
              </span>
            )}
            <h2 className="text-base font-semibold text-white leading-snug mb-2
                           group-hover:text-[#4f9eff] transition-colors duration-200">
              {nome}
            </h2>
            <p className="text-sm text-white/45 leading-relaxed line-clamp-2">
              {descricao}
            </p>

            {/* CTA */}
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium
                            text-[#4f9eff]/50 group-hover:text-[#4f9eff] transition-colors duration-200">
              <span>Ver projetos</span>
              <svg
                className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
