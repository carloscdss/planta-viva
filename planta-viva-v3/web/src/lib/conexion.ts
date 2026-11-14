// src/lib/conexion.ts — Modelo de conexiones por REFERENCIA (persistible) + geometría dinámica
import * as THREE from 'three';
import { CATALOGO } from './catalogo';
import type { Equipo } from './colocacion';

/** Lo que se guarda en BD: solo IDs, nada de clases THREE. */
export type ConexionPersistida = {
  id: string;
  equipoA: string;   // uuid del equipo origen
  puertoA: string;   // id del puerto origen
  equipoB: string;   // uuid del equipo destino
  puertoB: string;   // id del puerto destino
  activo?: boolean;
};

/** Lo que se dibuja: referencias + geometría resuelta en runtime. */
export type ConexionRuntime = {
  id: string;
  equipoA: string; puertoA: string;
  equipoB: string; puertoB: string;
  activo: boolean;
  posA: THREE.Vector3;
  posB: THREE.Vector3;
  radio: number;
  pendiente: boolean; // true si un equipo fue borrado (marca pending de v2)
};

/** Convierte puerto local de un equipo a coordenada global (rotación Y incluida). */
function puertoGlobal(eq: Equipo, posLocal: number[]): THREE.Vector3 {
  const cos = Math.cos(eq.rotacionY || 0);
  const sin = Math.sin(eq.rotacionY || 0);
  const [x, y, z] = posLocal;
  return new THREE.Vector3(
    x * cos - z * sin + eq.posicion[0],
    y + eq.posicion[1],
    x * sin + z * cos + eq.posicion[2]
  );
}

/** Resuelve una conexión persistida contra los equipos actuales. null = huérfana. */
export function resolverConexion(c: ConexionPersistida, equipos: Equipo[]): ConexionRuntime | null {
  const eqA = equipos.find(e => e.uuid === c.equipoA);
  const eqB = equipos.find(e => e.uuid === c.equipoB);
  if (!eqA || !eqB) return null;

  const descA = CATALOGO.find(d => d.descriptorId === eqA.descriptorId);
  const descB = CATALOGO.find(d => d.descriptorId === eqB.descriptorId);
  const pA = descA?.puertos.find(p => p.id === c.puertoA);
  const pB = descB?.puertos.find(p => p.id === c.puertoB);
  if (!pA || !pB) return null;

  return {
    id: c.id,
    equipoA: c.equipoA, puertoA: c.puertoA,
    equipoB: c.equipoB, puertoB: c.puertoB,
    activo: c.activo ?? false,
    posA: puertoGlobal(eqA, pA.pos),
    posB: puertoGlobal(eqB, pB.pos),
    radio: Math.max(0.05, (pA.diametro ?? 0.15) / 2),
    pendiente: false,
  };
}

/** Geometría del cilindro entre dos puntos globales. */
export function calcularGeometriaTuberia(pA: THREE.Vector3, pB: THREE.Vector3, radio: number) {
  const dir = new THREE.Vector3().subVectors(pB, pA);
  const longitud = dir.length();
  if (longitud < 0.001) return null;
  const centro = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return {
    posicion: centro.toArray() as [number, number, number],
    rotacion: [q.x, q.y, q.z, q.w] as [number, number, number, number],
    escala: [radio, longitud, radio] as [number, number, number],
    longitud,
  };
}