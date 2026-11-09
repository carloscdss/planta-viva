import * as THREE from 'three';
import { CONFIG } from '../config.js';

const puerto = (id, posicion, direccion, diametro = 0.18) => Object.freeze({
  id, tipo: 'proceso', posicion: Object.freeze(posicion), direccion: Object.freeze(direccion), diametro
});

export const descriptorTanque = Object.freeze({
  id: 'tanque-vertical', tipo: 'tanque', familia: 'tanque', nombre: 'Tanque vertical',
  codigo: 'TNQ', tag: 'TNQ', categoria: 'Proceso',
  descripcion: 'Tanque cilíndrico vertical con techo y conexiones de proceso laterales.',
  color: CONFIG.coloresRAL.acero9006,
  dimensiones: Object.freeze({ ancho: 1.6, alto: 2.4, profundidad: 1.6 }),
  campos: Object.freeze({}),
  puertos: Object.freeze([
    puerto('entrada', { x: -0.8, y: 0.35, z: 0 }, { x: -1, y: 0, z: 0 }),
    puerto('salida', { x: 0.8, y: -0.65, z: 0 }, { x: 1, y: 0, z: 0 }),
    puerto('drenaje', { x: 0, y: -1.2, z: 0.35 }, { x: 0, y: -1, z: 0 })
  ])
});

export function dibujarTanque(componente, { THREE: three, fantasma }) {
  const { ancho, alto, profundidad } = componente.descriptor.dimensiones;
  const radio = Math.min(ancho, profundidad) / 2;
  const material = fantasma ? componente._materialFantasma ??= new three.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, depthWrite: false }) : new three.MeshStandardMaterial({ color: componente.descriptor.color, metalness: 0.62, roughness: 0.34 });
  const agregar = (geometria, posicion = [0, 0, 0]) => {
    const malla = new three.Mesh(geometria, material);
    malla.position.set(...posicion);
    malla.castShadow = !fantasma;
    malla.receiveShadow = !fantasma;
    componente.grupo.add(malla);
    return malla;
  };
  agregar(new three.CylinderGeometry(radio * 0.96, radio, alto * 0.82, 32), [0, 0, 0]);
  agregar(new three.CylinderGeometry(radio * 0.96, radio * 0.96, alto * 0.09, 32), [0, alto * 0.455, 0]);
  agregar(new three.SphereGeometry(radio * 0.96, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), [0, alto * 0.41, 0]);
  agregar(new three.CylinderGeometry(radio * 0.12, radio * 0.12, alto * 0.13, 16), [0, alto * 0.52, 0]);
  agregar(new three.CylinderGeometry(radio * 0.82, radio * 0.82, 0.06, 32), [0, -alto * 0.47, 0]);
}
