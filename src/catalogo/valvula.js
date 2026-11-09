import * as THREE from 'three';
import { CONFIG } from '../config.js';

const puerto = (id, posicion, direccion, diametro = 0.16) => Object.freeze({
  id, tipo: 'proceso', posicion: Object.freeze(posicion), direccion: Object.freeze(direccion), diametro
});

export const descriptorValvula = Object.freeze({
  id: 'valvula-manual', tipo: 'valvula', familia: 'valvula', nombre: 'Válvula manual',
  codigo: 'VLV', tag: 'VLV', categoria: 'Proceso',
  descripcion: 'Válvula manual con conexiones de entrada y salida y volante de operación.',
  color: CONFIG.coloresRAL.acero9006,
  dimensiones: Object.freeze({ ancho: 0.9, alto: 0.85, profundidad: 0.65 }),
  campos: Object.freeze({
    accionamiento: Object.freeze({ tipo: 'opcion', etiqueta: 'Accionamiento', defecto: 'volante', opciones: Object.freeze(['volante', 'palanca']) })
  }),
  puertos: Object.freeze([
    puerto('entrada', { x: -0.45, y: -0.05, z: 0 }, { x: -1, y: 0, z: 0 }),
    puerto('salida', { x: 0.45, y: -0.05, z: 0 }, { x: 1, y: 0, z: 0 })
  ])
});

export function dibujarValvula(componente, { THREE: three, materiales, fantasma }) {
  const material = fantasma ? componente._materialFantasma ??= new three.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, depthWrite: false }) : new three.MeshStandardMaterial({ color: componente.descriptor.color, metalness: 0.58, roughness: 0.38 });
  const agregar = (geometria, posicion = [0, 0, 0], materialMalla = material) => {
    const malla = new three.Mesh(geometria, materialMalla);
    malla.position.set(...posicion);
    malla.castShadow = !fantasma;
    malla.receiveShadow = !fantasma;
    componente.grupo.add(malla);
    return malla;
  };
  agregar(new three.CylinderGeometry(0.18, 0.18, 0.28, 24), [0, -0.05, 0]);
  agregar(new three.CylinderGeometry(0.12, 0.12, 0.9, 20), [0, -0.05, 0]).rotation.z = Math.PI / 2;
  agregar(new three.CylinderGeometry(0.065, 0.065, 0.3, 16), [0, 0.2, 0]);
  agregar(new three.CylinderGeometry(0.045, 0.045, 0.24, 12), [0, 0.42, 0]);
  if (componente.params.accionamiento === 'palanca') {
    agregar(new three.CylinderGeometry(0.035, 0.035, 0.42, 12), [0.15, 0.57, 0]).rotation.z = -Math.PI / 4;
    agregar(new three.SphereGeometry(0.07, 12, 10), [0.3, 0.72, 0], materiales.oscuro);
  } else {
    agregar(new three.TorusGeometry(0.2, 0.025, 8, 24), [0, 0.58, 0]);
    agregar(new three.CylinderGeometry(0.025, 0.025, 0.4, 10), [0, 0.58, 0]);
  }
}
