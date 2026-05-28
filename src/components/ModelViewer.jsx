'use client';

/**
 * ModelViewer — canvas WebGL singleton.
 *
 * Recebe { url, escala, offsetY, animacaoTipo } e anima o modelo GLB.
 * Quando url é null a cena fica vazia.
 *
 * animacaoTipo aceita: 'zoom' | 'rotation' | 'float' | 'pulse' | 'custom' | null
 *   null  → modelo estático no centro
 *   zoom  → avança, roda 360° e recua em loop
 */

import { useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Constantes de animação ───────────────────────────────────── */
const Z_START   = -40;
const Z_END     = -8;
const S_START   = 0.3;
const CYCLE_SEC = 4.0;
const T_IN      = 0.33;
const T_ROT     = 0.67;

function eio(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ─── Cena com animação ────────────────────────────────────────── */
function AnimScene({ url, escala, offsetY, animacaoTipo }) {
  const { scene, animations } = useGLTF(url);
  const groupRef  = useRef(null);
  const timeRef   = useRef(0);
  const { camera } = useThree();
  const { actions } = useAnimations(animations, groupRef);

  /* Inicia/para animações nativas do GLB */
  useEffect(() => {
    const all = Object.values(actions);
    if (animacaoTipo === 'custom') {
      all.forEach(a => a?.reset().play());
    } else {
      all.forEach(a => a?.stop());
    }
  }, [animacaoTipo, actions]);

  /* Reset do relógio e rotação ao mudar de tipo */
  useEffect(() => {
    timeRef.current = 0;
    if (groupRef.current) groupRef.current.rotation.y = 0;
  }, [animacaoTipo]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    switch (animacaoTipo) {
      case 'zoom': {
        const c = (t % CYCLE_SEC) / CYCLE_SEC;
        let posZ, sc, rotY;
        if (c < T_IN) {
          const p = eio(c / T_IN);
          posZ = THREE.MathUtils.lerp(Z_START, Z_END, p);
          sc   = THREE.MathUtils.lerp(S_START, escala, p);
          rotY = 0;
        } else if (c < T_ROT) {
          const p = (c - T_IN) / (T_ROT - T_IN);
          posZ = Z_END; sc = escala; rotY = p * Math.PI * 2;
        } else {
          const p = eio((c - T_ROT) / (1 - T_ROT));
          posZ = THREE.MathUtils.lerp(Z_END, Z_START, p);
          sc   = THREE.MathUtils.lerp(escala, S_START, p);
          rotY = Math.PI * 2;
        }
        groupRef.current.position.set(0, offsetY, posZ);
        groupRef.current.scale.setScalar(sc);
        groupRef.current.rotation.y = rotY;
        camera.lookAt(0, offsetY, posZ);
        break;
      }
      case 'rotation':
        groupRef.current.position.set(0, offsetY, Z_END);
        groupRef.current.scale.setScalar(escala);
        groupRef.current.rotation.y += delta * 1.5;
        camera.lookAt(0, offsetY, Z_END);
        break;
      case 'float':
        groupRef.current.position.set(0, offsetY + Math.sin(t * 1.5) * 0.5, Z_END);
        groupRef.current.scale.setScalar(escala);
        camera.lookAt(0, offsetY, Z_END);
        break;
      case 'pulse':
        groupRef.current.position.set(0, offsetY, Z_END);
        groupRef.current.scale.setScalar(escala + Math.sin(t * 2) * 0.1);
        camera.lookAt(0, offsetY, Z_END);
        break;
      default: /* null, 'none', 'custom' */
        groupRef.current.position.set(0, offsetY, Z_END);
        groupRef.current.scale.setScalar(escala);
        groupRef.current.rotation.y = 0;
        camera.lookAt(0, offsetY, Z_END);
        break;
    }
  });

  const initZ = animacaoTipo === 'zoom' ? Z_START : Z_END;
  const initS = animacaoTipo === 'zoom' ? S_START : escala;

  return (
    <group ref={groupRef} position={[0, offsetY, initZ]} scale={[initS, initS, initS]}>
      <primitive object={scene} />
    </group>
  );
}

/* ─── Canvas exportado ─────────────────────────────────────────── */
export default function ModelViewer({
  url          = null,
  escala       = 1.5,
  offsetY      = 0,
  animacaoTipo = null,
}) {
  return (
    <Canvas
      camera={{ position: [0, 1, 0], fov: 45, near: 0.1, far: 200 }}
      gl={{ alpha: true, antialias: true }}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
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

      {url && (
        <Suspense fallback={null}>
          <AnimScene
            key={url}
            url={url}
            escala={escala}
            offsetY={offsetY}
            animacaoTipo={animacaoTipo}
          />
        </Suspense>
      )}
    </Canvas>
  );
}
