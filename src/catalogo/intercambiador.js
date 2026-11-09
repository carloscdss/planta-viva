import * as THREE from 'three';
import { CONFIG } from '../config.js';

const puerto = (id, posicion, direccion, diametro = 0.16) => Object.freeze({
  id, tipo: 'proceso', posicion: Object.freeze(posicion), direccion: Object.freeze(direccion), diametro
});

export const descriptorIntercambiador = Object.freeze({
  id: 'intercambiador-tubular', tipo: 'intercambiador', familia: 'intercambiador',
  nombre: 'Intercambiador de calor', codigo: 'INT', tag: 'INT', categoria: 'Proceso',
  descripcion: 'Intercambiador tubular horizontal con conexiones de proceso en sus extremos.',
  color: CONFIG.coloresRAL.acero9006,
  dimensiones: Object.freeze({ ancho: 1.8, alto: 0.9, profundidad: 0.9 }),
  campos: Object.freeze({}),
  puertos: Object.freeze([
    puerto('proceso-entrada', { x: -0.9, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }),
    puerto('proceso-salida', { x: 0.9, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }),
    puerto('servicio-entrada', { x: -0.35, y: 0.45, z: 0 }, { x: 0, y: 1, z: 0 }),
    puerto('servicio-salida', { x: 0.35, y: 0.45, z: 0 }, { x: 0, y: 1, z: 0 })
  ])
});

export function dibujarIntercambiador(componente, { THREE: three, materiales, fantasma }) {
  const { ancho, alto, profundidad } = componente.descriptor.dimensiones;
  const radio = Math.min(alto, profundidad) * 0.36;
  const material = fantasma ? componente._materialFantasma ??= new three.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, depthWrite: false }) : new three.MeshStandardMaterial({ color: componente.descriptor.color, metalness: 0.66, roughness: 0.32 });
  const agregar = (geometria, posicion = [0, 0, 0], materialMalla = material) => {
    const malla = new three.Mesh(geometria, materialMalla);
    malla.position.set(...posicion);
    malla.castShadow = !fantasma;
    malla.receiveShadow = !fantasma;
    componente.grupo.add(malla);
    return malla;
  };
  agregar(new three.CylinderGeometry(radio, radio, ancho * 0.78, 28), [0, 0, 0]).rotation.z = Math.PI / 2;
  for (const x of [-ancho * 0.4, ancho * 0.4]) {
    agregar(new three.CylinderGeometry(radio * 1.18, radio * 1.18, 0.08, 28), [x, 0, 0]).rotation.z = Math.PI / 2;
  }
  for (const x of [-ancho * 0.25, ancho * 0.25]) {
    agregar(new three.CylinderGeometry(0.075, 0.075, alto * 0.32, 16), [x, alto * 0.22, 0], materiales.estructura);
    agregar(new three.CylinderGeometry(0.055, 0.055, 0.16, 12), [x, alto * 0.42, 0]);
  }
  agregar(new three.BoxGeometry(ancho * 0.7, 0.08, profundidad * 0.72), [0, -alto * 0.46, 0], materiales.estructura);
}
