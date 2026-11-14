// src/lib/componentes/TuberiaDinamica.tsx — sin warns de material undefined
'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { calcularGeometriaTuberia, type ConexionRuntime } from '../conexion';

export function TuberiaDinamica({ data }: { data: ConexionRuntime }) {
  const geo = useMemo(
    () => calcularGeometriaTuberia(data.posA, data.posB, data.radio),
    [data.posA, data.posB, data.radio]
  );

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.4 });
    if (data.activo) {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#60a5fa'; ctx.fillRect(0, 0, 32, 64);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(5, 1);
      m.map = tex;
      m.emissive = new THREE.Color(0x1e3a8a);
      m.emissiveIntensity = 0.5;
      m.metalness = 0.2;
      m.roughness = 0.6;
    }
    return m;
  }, [data.activo]);

  // Animación de flujo (solo si activo), con limpieza correcta
  useEffect(() => {
    if (!data.activo || !material.map) return;
    let raf = 0;
    const tick = () => {
      (material.map as THREE.Texture).offset.x -= 0.02;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [data.activo, material]);

  useEffect(() => () => material.dispose(), [material]);

  if (!geo) return null;

  return (
    <mesh
      position={geo.posicion}
      quaternion={new THREE.Quaternion(...geo.rotacion)}
      scale={geo.escala}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[1, 1, 1, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}