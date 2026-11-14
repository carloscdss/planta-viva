// src/lib/catalogo.tsx — Catálogo v2 portado a R3F + Puertos Clickeables
'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { Dimensiones, Equipo } from './colocacion';

export type Descriptor = {
  descriptorId: string;
  familia: string;
  tag: string;
  nombre: string;
  categoria: string;
  color: string;
  dimensiones: Dimensiones;
  precio: number;
  puertos: { id: string; tipo: string; pos: [number, number, number]; dir?: [number, number, number]; diametro?: number }[];
};

export const CATALOGO: Descriptor[] = [
  { descriptorId: 'tanque-vertical', familia: 'tanque', tag: 'TNQ', nombre: 'Tanque vertical', categoria: 'Proceso',
    color: '#a5a5a5', dimensiones: { ancho: 1.6, alto: 2.4, profundidad: 1.6 }, precio: 1000,
    puertos: [{ id: 'entrada', tipo: 'proceso', pos: [-0.8, 0.35, 0] }, { id: 'salida', tipo: 'proceso', pos: [0.8, -0.65, 0] }, { id: 'drenaje', tipo: 'proceso', pos: [0, -1.2, 0.35] }] },
  { descriptorId: 'bomba-centrifuga', familia: 'bomba', tag: 'BOM', nombre: 'Bomba centrífuga', categoria: 'Proceso',
    color: '#a5a5a5', dimensiones: { ancho: 1.8, alto: 1.3, profundidad: 0.9 }, precio: 500,
    puertos: [{ id: 'succion', tipo: 'proceso', pos: [-0.82, -0.1, 0] }, { id: 'descarga', tipo: 'proceso', pos: [-0.05, 0.58, 0] }] },
  { descriptorId: 'valvula-manual', familia: 'valvula', tag: 'VLV', nombre: 'Válvula manual', categoria: 'Proceso',
    color: '#a5a5a5', dimensiones: { ancho: 0.9, alto: 0.85, profundidad: 0.65 }, precio: 200,
    puertos: [{ id: 'entrada', tipo: 'proceso', pos: [-0.45, -0.05, 0] }, { id: 'salida', tipo: 'proceso', pos: [0.45, -0.05, 0] }] },
  { descriptorId: 'tuberia', familia: 'tuberia', tag: 'TUB', nombre: 'Tubería', categoria: 'Proceso',
    color: '#a5a5a5', dimensiones: { ancho: 2, alto: 0.2, profundidad: 0.2 }, precio: 120,
    puertos: [{ id: 'entrada', tipo: 'proceso', pos: [-1, 0, 0] }, { id: 'salida', tipo: 'proceso', pos: [1, 0, 0] }] },
  { descriptorId: 'intercambiador-tubular', familia: 'intercambiador', tag: 'INT', nombre: 'Intercambiador', categoria: 'Proceso',
    color: '#a5a5a5', dimensiones: { ancho: 1.8, alto: 0.9, profundidad: 0.9 }, precio: 1500,
    puertos: [{ id: 'proceso-entrada', tipo: 'proceso', pos: [-0.9, 0, 0] }, { id: 'proceso-salida', tipo: 'proceso', pos: [0.9, 0, 0] }] },
  { descriptorId: 'gabinete-base', familia: 'gabinete', tag: 'GAB', nombre: 'Gabinete eléctrico', categoria: 'Eléctrico',
    color: '#d7d7d7', dimensiones: { ancho: 1.2, alto: 2, profundidad: 0.8 }, precio: 800,
    puertos: [{ id: 'entrada-inferior', tipo: 'electrico', pos: [0, -0.92, -0.4] }, { id: 'tierra', tipo: 'tierra', pos: [0.25, -0.92, -0.4] }] },
  { descriptorId: 'motor-electrico', familia: 'motor', tag: 'MOT', nombre: 'Motor eléctrico', categoria: 'Eléctrico',
    color: '#a5a5a5', dimensiones: { ancho: 1.1, alto: 0.85, profundidad: 0.75 }, precio: 600,
    puertos: [{ id: 'alimentacion', tipo: 'electrico', pos: [0, 0.35, -0.25] }] },
];

const M = { acero: { metalness: 0.6, roughness: 0.38 }, estructura: { color: '#525d63', metalness: 0.58, roughness: 0.42 }, oscuro: { color: '#27343a', metalness: 0.42, roughness: 0.48 } };

function Mat({ ghost, color }: { ghost: boolean; color: string }) {
  const mat = useMemo(() => {
    if (ghost) return new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false });
    return new THREE.MeshStandardMaterial({ color, ...M.acero });
  }, [ghost, color]);
  return mat;
}

// Componente auxiliar para renderizar puertos clickeables
function PuertosVisibles({ descriptorId, uuid, onPortClick }: { descriptorId: string; uuid: string; onPortClick?: (u: string, p: string) => void }) {
  if (!onPortClick) return null;
  const desc = CATALOGO.find(d => d.descriptorId === descriptorId);
  if (!desc?.puertos) return null;
  
  return (
    <>
      {desc.puertos.map(p => (
        <mesh key={p.id} position={[p.pos[0], p.pos[1], p.pos[2]]} 
              onClick={(e) => { e.stopPropagation(); onPortClick(uuid, p.id); }}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

export function Equipo3D({ data, ghost = false, onPortClick }: { 
  data: Equipo; ghost?: boolean; onPortClick?: (uuid: string, portId: string) => void 
}) {
  const material = Mat({ ghost, color: data.color });
  const sombras = !ghost;
  const d = data.dimensiones;
  const G = (props: any) => <mesh material={material} castShadow={sombras} receiveShadow={sombras} {...props} />;
  const E = (props: any) => <mesh material={new THREE.MeshStandardMaterial(ghost ? { color: data.color, transparent: true, opacity: 0.35, depthWrite: false } : M.estructura)} castShadow={sombras} {...props} />;

  let cuerpo: JSX.Element | null = null;

  if (data.familia === 'tanque') {
    const r = d.ancho / 2, h = d.alto;
    cuerpo = (<><G position={[0, 0, 0]}><cylinderGeometry args={[r * 0.96, r, h * 0.82, 32]} /></G>
      <G position={[0, h * 0.455, 0]}><cylinderGeometry args={[r * 0.96, r * 0.96, h * 0.09, 32]} /></G>
      <G position={[0, h * 0.41, 0]}><sphereGeometry args={[r * 0.96, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></G>
      <G position={[0, h * 0.52, 0]}><cylinderGeometry args={[r * 0.12, r * 0.12, h * 0.13, 16]} /></G>
      <E position={[0, -h * 0.47, 0]}><cylinderGeometry args={[r * 0.82, r * 0.82, 0.06, 32]} /></E></>);
  } else if (data.familia === 'bomba') {
    cuerpo = (<><E position={[0, -0.52, 0]}><boxGeometry args={[1.5, 0.12, 0.72]} /></E>
      <G position={[-0.08, -0.08, 0]}><sphereGeometry args={[0.36, 24, 18]} /></G>
      <G position={[-0.47, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.13, 0.13, 0.34, 20]} /></G>
      <G position={[-0.05, 0.28, 0]}><cylinderGeometry args={[0.12, 0.12, 0.42, 20]} /></G>
      <G position={[0.55, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.24, 0.24, 0.64, 24]} /></G>
      <E position={[0.55, -0.3, 0]}><boxGeometry args={[0.34, 0.12, 0.4]} /></E></>);
  } else if (data.familia === 'valvula') {
    cuerpo = (<><G position={[0, -0.05, 0]}><cylinderGeometry args={[0.18, 0.18, 0.28, 24]} /></G>
      <G position={[0, -0.05, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 0.9, 20]} /></G>
      <G position={[0, 0.2, 0]}><cylinderGeometry args={[0.065, 0.065, 0.3, 16]} /></G>
      <G position={[0, 0.58, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2, 0.025, 8, 24]} /></G></>);
  } else if (data.familia === 'tuberia') {
    const r = d.alto / 2, L = d.ancho;
    cuerpo = (<><G rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r, r, L, 24]} /></G>
      <E position={[-L / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 1.35, r * 1.35, 0.08, 24]} /></E>
      <E position={[L / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 1.35, r * 1.35, 0.08, 24]} /></E></>);
  } else if (data.familia === 'intercambiador') {
    const r = Math.min(d.alto, d.profundidad) * 0.36;
    cuerpo = (<><G rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r, r, d.ancho * 0.78, 28]} /></G>
      <G position={[-d.ancho * 0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 1.18, r * 1.18, 0.08, 28]} /></G>
      <G position={[d.ancho * 0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * 1.18, r * 1.18, 0.08, 28]} /></G>
      <E position={[0, -d.alto * 0.46, 0]}><boxGeometry args={[d.ancho * 0.7, 0.08, d.profundidad * 0.72]} /></E></>);
  } else if (data.familia === 'gabinete') {
    cuerpo = (<><G><boxGeometry args={[d.ancho, d.alto, d.profundidad]} /></G>
      <E position={[0, 0, d.profundidad / 2 + 0.02]}><boxGeometry args={[d.ancho * 0.85, d.alto * 0.94, 0.035]} /></E>
      <mesh position={[d.ancho * 0.3, 0.05, d.profundidad / 2 + 0.05]} material={new THREE.MeshStandardMaterial(M.oscuro)}><boxGeometry args={[0.035, 0.28, 0.045]} /></mesh>
      <mesh position={[-d.ancho * 0.3, d.alto * 0.3, d.profundidad / 2 + 0.05]} material={new THREE.MeshStandardMaterial({ color: '#53d6a4', emissive: '#164c3a', roughness: 0.28 })}><sphereGeometry args={[0.035, 16, 12]} /></mesh></>);
  } else if (data.familia === 'motor') {
    const r = Math.min(d.alto, d.profundidad) * 0.37;
    cuerpo = (<><G rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r, r, d.ancho * 0.62, 24]} /></G>
      <G position={[-d.ancho * 0.52, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.24, 16]} /></G>
      <E position={[0.12, d.alto * 0.48, 0]}><boxGeometry args={[0.34, 0.18, 0.3]} /></E>
      <E position={[0, -d.alto * 0.45, 0]}><boxGeometry args={[d.ancho * 0.68, 0.07, d.profundidad * 0.7]} /></E></>);
  }

  return (
    <group position={data.posicion} rotation={[0, data.rotacionY || 0, 0]}>
      {cuerpo}
      {/* PUERTOS VISUALES SOLO EN MODO CONEXIÓN */}
      <PuertosVisibles descriptorId={data.descriptorId} uuid={data.uuid} onPortClick={onPortClick} />
    </group>
  );
}