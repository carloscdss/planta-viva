import * as THREE from 'three';
import { CONFIG } from '../config.js';

const puerto = (id, posicion, direccion) => Object.freeze({
  id,
  tipo: 'proceso',
  posicion: Object.freeze(posicion),
  direccion: Object.freeze(direccion),
  diametro: 0.2
});

export const descriptorBomba = Object.freeze({
  id: 'bomba-centrifuga',
  tipo: 'bomba',
  familia: 'bomba',
  nombre: 'Bomba centrífuga',
  codigo: 'BOM',
  tag: 'BOM',
  categoria: 'Proceso',
  descripcion: 'Bomba centrífuga horizontal con base, cuerpo hidráulico y motor eléctrico.',
  color: CONFIG.coloresRAL.acero9006,
  dimensiones: Object.freeze({ ancho: 1.8, alto: 1.3, profundidad: 0.9 }),
  campos: Object.freeze({}),
  puertos: Object.freeze([
    puerto('succion', { x: -0.82, y: -0.1, z: 0 }, { x: -1, y: 0, z: 0 }),
    puerto('descarga', { x: -0.05, y: 0.58, z: 0 }, { x: 0, y: 1, z: 0 })
  ])
});

export function dibujarBomba(componente, { THREE: three, materiales, fantasma }) {
  const material = fantasma ? componente._materialFantasma ??= new three.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, depthWrite: false }) : new three.MeshStandardMaterial({ color: componente.descriptor.color, metalness: 0.42, roughness: 0.48 });
  const agregar = (geometria, posicion = [0, 0, 0], materialMalla = material) => {
    const malla = new three.Mesh(geometria, materialMalla);
    malla.position.set(...posicion);
    malla.castShadow = !fantasma;
    malla.receiveShadow = !fantasma;
    componente.grupo.add(malla);
    return malla;
  };
  agregar(new three.BoxGeometry(1.5, 0.12, 0.72), [0, -0.52, 0], materiales.estructura);
  agregar(new three.SphereGeometry(0.36, 24, 18), [-0.08, -0.08, 0]);
  agregar(new three.CylinderGeometry(0.13, 0.13, 0.34, 20), [-0.47, -0.1, 0], materiales.oscuro).rotation.z = Math.PI / 2;
  agregar(new three.CylinderGeometry(0.12, 0.12, 0.42, 20), [-0.05, 0.28, 0], materiales.oscuro);
  agregar(new three.CylinderGeometry(0.24, 0.24, 0.64, 24), [0.55, 0.08, 0]).rotation.z = Math.PI / 2;
  agregar(new three.BoxGeometry(0.34, 0.12, 0.4), [0.55, -0.3, 0], materiales.oscuro);
}
