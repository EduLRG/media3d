'use client';

/**
 * Wrapper client-side para o layout do Next.js (App Router).
 *
 * O layout.js é um Server Component — não pode usar Context directamente.
 * Este ficheiro exporta um Client Component que:
 *   1. Fornece o ModelViewerProvider a toda a árvore.
 *   2. Renderiza o ModelViewerGlobal (canvas singleton) uma única vez.
 */

import { ModelViewerProvider } from '@/context/ModelViewerContext';
import ModelViewerGlobal from './ModelViewerGlobal';

export default function Providers({ children }) {
  return (
    <ModelViewerProvider>
      {/* Canvas WebGL único, sempre montado após o primeiro hover */}
      <ModelViewerGlobal />
      {children}
    </ModelViewerProvider>
  );
}
