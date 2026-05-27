'use client';

/**
 * ModelViewerContext — estado partilhado entre os DisciplinaCards e o ModelViewerGlobal.
 *
 * activeModel:
 *   {
 *     url:      string,   — URL do ficheiro GLB
 *     escala:   number,   — escala máxima da animação (vinda da BD, default 1.5)
 *     offset_y: number,   — deslocamento vertical do modelo (vinda da BD, default 0)
 *     rect: {             — âncora do canvas (calculada em getBoundingClientRect)
 *       centerX: number,    — centro horizontal do card no viewport
 *       centerY: number,    — centro vertical do card no viewport
 *       canvasSize: number, — lado do canvas quadrado (2× maior lado do card)
 *     }
 *   }
 *   | null  →  nenhum card em hover
 */

import { createContext, useContext, useState } from 'react';

const ModelViewerCtx = createContext(null);

export function ModelViewerProvider({ children }) {
  const [activeModel, setActiveModel] = useState(null);

  return (
    <ModelViewerCtx.Provider value={{ activeModel, setActiveModel }}>
      {children}
    </ModelViewerCtx.Provider>
  );
}

/** Hook para ler/escrever o modelo activo. Lança erro se usado fora do Provider. */
export function useModelViewer() {
  const ctx = useContext(ModelViewerCtx);
  if (!ctx) throw new Error('useModelViewer deve ser usado dentro de <ModelViewerProvider>');
  return ctx;
}
