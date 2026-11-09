import * as THREE from 'three';
import { CONFIG } from '../config.js';

const puerto = (id, posicion, direccion) => Object.freeze({
  id,
  tipo: 'proceso',
  posicion: Object.freeze(posicion),
  direccion: Object.freeze(direccion),
  diametro: 0.15
});

export const descriptorTuberia = Object.freeze({
  id: 'tuberia',
  tipo: 'tuberia',
  familia: 'tuberia',
  nombre: 'Tubería',
  codigo: 'TUB',
  tag: 'TUB',
  categoria: 'Proceso',
  descripcion: 'Tramo recto paramétrico con diámetro configurable y puertos de entrada y salida.',
  color: CONFIG.coloresRAL.acero9006,
  dimensiones: Object.freeze({ ancho: 2, alto: 0.2, profundidad: 0.2 }),
  campos: Object.freeze({
    longitud: Object.freeze({ tipo: 'numero', etiqueta: 'Longitud', defecto: 2, min: 0.5, max: 8, paso: 0.25, unidad: 'm' }),
    diametro: Object.freeze({ tipo: 'numero', etiqueta: 'Diámetro', defecto: 0.2, min: 0.05, max: 0.6, paso: 0.05, unidad: 'm' })
  }),
  puertos: Object.freeze([
    puerto('entrada', { x: -1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }),
    puerto('salida', { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })
  ])
});

export function dibujarTuberia(componente, { THREE: three, materiales, fantasma }) {
  const radio = Number(componente.params.diametro ?? componente.descriptor.dimensiones.alto) / 2;
  const longitud = Number(componente.params.longitud ?? componente.descriptor.dimensiones.ancho);
  const material = fantasma ? componente._materialFantasma ??= new three.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, depthWrite: false }) : new three.MeshStandardMaterial({ color: componente.descriptor.color, metalness: 0.42, roughness: 0.48 });
  const agregar = (geometria, posicion = [0, 0, 0], materialMalla = material) => {
    const malla = new three.Mesh(geometria, materialMalla);
    malla.position.set(...posicion);
    malla.castShadow = !fantasma;
    malla.receiveShadow = !fantasma;
    componente.grupo.add(malla);
    return malla;
  };
  agregar(new three.CylinderGeometry(radio, radio, longitud, 24), [0, 0, 0]).rotation.z = Math.PI / 2;
  for (const x of [-longitud / 2, longitud / 2]) {
    agregar(new three.CylinderGeometry(radio * 1.35, radio * 1.35, 0.08, 24), [x, 0, 0], materiales.estructura).rotation.z = Math.PI / 2;
  }
}
