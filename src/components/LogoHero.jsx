'use client';

import dynamic from 'next/dynamic';

const LogoModelo3D = dynamic(() => import('@/components/LogoModelo3D'), { ssr: false });

export default function LogoHero({ url, escala = 1.0, animacao = 'rotation', width = 300, height = 300 }) {
  return <LogoModelo3D url={url} escala={escala} animacao={animacao} width={width} height={height} />;
}
