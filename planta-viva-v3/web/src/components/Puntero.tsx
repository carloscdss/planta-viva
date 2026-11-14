'use client';
import { useThree } from '@react-three/fiber';
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

export function Puntero({ onMove }: { onMove: (x: number, z: number) => void }) {
  const { camera, gl } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plano = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const v = useMemo(() => new THREE.Vector2(), []);
  
  useEffect(() => {
    const el = gl.domElement;
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      v.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(v, camera);
      if (ray.ray.intersectPlane(plano, p)) onMove(p.x, p.z);
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, [camera, gl, ray, plano, p, v, onMove]);
  return null;
}