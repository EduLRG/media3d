'use client';

/**
 * ModelViewer — canvas WebGL singleton.
 *
 * Recebe { url, escala, offsetY } e anima o modelo GLB correspondente.
 * Quando url é null, a cena fica vazia e useFrame não actualiza nada.
 *
 * ATENÇÃO: pointerEvents: 'none' está aplicado DIRECTAMENTE no <Canvas>,
 * não apenas no div pai. O React Three Fiber injeta os seus próprios estilos
 * no elemento canvas e não herda pointer-events do ancestral.
 */

import { useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Constantes de animação ───────────────────────────────────── */
const Z_START   = -40;   // posição inicial (longe da câmara)
const Z_END     = -8;    // posição final   (perto da câmara)
const S_START   = 0.3;   // escala mínima (início/fim do ciclo)
const CYCLE_SEC = 4.0;   // duração de um ciclo completo em segundos
const T_IN      = 0.33;  // fracção do ciclo: fim do zoom-in
const T_ROT     = 0.67;  // fracção do ciclo: fim da rotação 360°

/** easeInOut cúbico */
function eio(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ─── Modelo GLB ───────────────────────────────────────────────── */
function GlbModel({ url }) {
  const { scene } = useGLTF(url);
  /* Clone para não partilhar estado de transform entre renders diferentes */
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} />;
}

/* ─── Cena com animação ────────────────────────────────────────── */
/**
 * @param {string}  url      URL do ficheiro GLB
 * @param {number}  escala   Escala máxima do modelo (substitui S_END)
 * @param {number}  offsetY  Deslocamento vertical do modelo
 */
function AnimScene({ url, escala, offsetY }) {
  const groupRef = useRef(null);
  const timeRef  = useRef(0);
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    /* Avança o relógio em loop */
    timeRef.current = (timeRef.current + delta) % CYCLE_SEC;
    const t = timeRef.current / CYCLE_SEC; // 0 → 1

    let posZ, scale, rotY;

    if (t < T_IN) {
      /* Fase 1 — zoom-in */
      const p = eio(t / T_IN);
      posZ  = THREE.MathUtils.lerp(Z_START, Z_END, p);
      scale = THREE.MathUtils.lerp(S_START, escala, p);
      rotY  = 0;
    } else if (t < T_ROT) {
      /* Fase 2 — rotação 360° */
      const p = (t - T_IN) / (T_ROT - T_IN);
      posZ  = Z_END;
      scale = escala;
      rotY  = p * Math.PI * 2;
    } else {
      /* Fase 3 — recuo */
      const p = eio((t - T_ROT) / (1 - T_ROT));
      posZ  = THREE.MathUtils.lerp(Z_END, Z_START, p);
      scale = THREE.MathUtils.lerp(escala, S_START, p);
      rotY  = Math.PI * 2;
    }

    groupRef.current.position.set(0, offsetY, posZ);
    groupRef.current.scale.setScalar(scale);
    groupRef.current.rotation.y = rotY;

    /* Câmara sempre a apontar para o modelo */
    camera.lookAt(0, offsetY, posZ);
  });

  return (
    /* Posição e escala iniciais evitam flash antes do primeiro useFrame */
    <group ref={groupRef} position={[0, offsetY, Z_START]} scale={[S_START, S_START, S_START]}>
      <Suspense fallback={null}>
        <GlbModel url={url} />
      </Suspense>
    </group>
  );
}

/* ─── Canvas exportado ─────────────────────────────────────────── */
/**
 * @param {string|null} url     URL do GLB activo (null = sem modelo)
 * @param {number}      escala  Escala máxima da animação (default 1.5)
 * @param {number}      offsetY Offset Y do modelo (default 0)
 */
export default function ModelViewer({ url = null, escala = 1.5, offsetY = 0 }) {
  return (
    <Canvas
      camera={{ position: [0, 1, 0], fov: 45, near: 0.1, far: 200 }}
      gl={{ alpha: true, antialias: true }}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        /* ↓ CRÍTICO: o R3F injeta estilos directamente no <canvas> e não
           herda pointer-events do div pai. Tem de ser definido aqui. */
        pointerEvents: 'none',
      }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <pointLight
        position={[0, 4, Z_END]}
        color="#4f9eff"
        intensity={3}
        distance={60}
      />

      {/*
        Só monta AnimScene quando há URL activo.
        - Quando url é null: cena vazia, useFrame não corre, GPU em repouso.
        - key={url}: remonta (e reinicia animação) sempre que o URL muda.
      */}
      {url && (
        <AnimScene
          key={url}
          url={url}
          escala={escala}
          offsetY={offsetY}
        />
      )}
    </Canvas>
  );
}
