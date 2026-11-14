// src/lib/componentes/TuberiaDinamica.tsx
'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import { calcularGeometriaTuberia, type ConexionRuntime } from '../conexion';

export function TuberiaDinamica({ data }: { data: ConexionRuntime }) {
  const geo = useMemo(
    () => calcularGeometriaTuberia(data.posA, data.posB, data.radio),
    [data.posA, data.posB, data.radio]
  );
  if (!geo) return null;

  const material = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#60a5fa'; ctx.fillRect(0, 0, 32, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 1);
    return new THREE.MeshStandardMaterial({
      color: data.activo ? undefined : 0xaaaaaa,
      map: data.activo ? tex : undefined,
      emissive: data.activo ? 0x1e3a8a : undefined,
      emissiveIntensity: data.activo ? 0.5 : 0,
      metalness: 0.8, roughness: 0.4,
    });
  }, [data.activo]);

  // Flujo animado solo si está activo
  useMemo(() => {
    if (!data.activo || !material.map) return;
    let raf = 0;
    const tick = () => { (material.map as THREE.Texture).offset.x -= 0.02; raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [data.activo, material]);

  return (
    <mesh
      position={geo.posicion}
      quaternion={new THREE.Quaternion(...geo.rotacion)}
      scale={geo.escala}
      castShadow receiveShadow
    >
      <cylinderGeometry args={[1, 1, 1, 16]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}