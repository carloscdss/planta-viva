import * as THREE from 'three';
import { CONFIG } from '../config.js';

export const descriptorMotor = Object.freeze({
  id: 'motor-electrico', tipo: 'motor', familia: 'motor', nombre: 'Motor eléctrico',
  codigo: 'MOT', tag: 'MOT', categoria: 'Eléctrico',
  descripcion: 'Motor eléctrico industrial con carcasa aleteada, eje y caja de conexiones.',
  color: CONFIG.coloresRAL.acero9006,
  dimensiones: Object.freeze({ ancho: 1.1, alto: 0.85, profundidad: 0.75 }),
  campos: Object.freeze({}),
  puertos: Object.freeze([
    Object.freeze({ id: 'alimentacion', tipo: 'electrico', posicion: Object.freeze({ x: 0, y: 0.35, z: -0.25 }), direccion: Object.freeze({ x: 0, y: 1, z: 0 }), diametro: 0.08 })
  ])
});

export function dibujarMotor(componente, { THREE: three, materiales, fantasma }) {
  const { ancho, alto, profundidad } = componente.descriptor.dimensiones;
  const radio = Math.min(alto, profundidad) * 0.37;
  const material = fantasma ? componente._materialFantasma ??= new three.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, depthWrite: false }) : new three.MeshStandardMaterial({ color: componente.descriptor.color, metalness: 0.55, roughness: 0.4 });
  const agregar = (geometria, posicion = [0, 0, 0], materialMalla = material) => {
    const malla = new three.Mesh(geometria, materialMalla);
    malla.position.set(...posicion);
    malla.castShadow = !fantasma;
    malla.receiveShadow = !fantasma;
    componente.grupo.add(malla);
    return malla;
  };
  agregar(new three.CylinderGeometry(radio, radio, ancho * 0.62, 24), [0, 0, 0]).rotation.z = Math.PI / 2;
  for (let x = -ancho * 0.25; x <= ancho * 0.25; x += 0.11) {
    agregar(new three.CylinderGeometry(radio * 1.04, radio * 1.04, 0.035, 24), [x, 0, 0]).rotation.z = Math.PI / 2;
  }
  agregar(new three.CylinderGeometry(radio * 0.46, radio * 0.46, 0.16, 20), [-ancho * 0.38, 0, 0]).rotation.z = Math.PI / 2;
  agregar(new three.CylinderGeometry(0.07, 0.07, 0.24, 16), [-ancho * 0.52, 0, 0]).rotation.z = Math.PI / 2;
  agregar(new three.BoxGeometry(0.34, 0.18, 0.3), [0.12, alto * 0.48, 0], materiales.estructura);
  agregar(new three.BoxGeometry(ancho * 0.68, 0.07, profundidad * 0.7), [0, -alto * 0.45, 0], materiales.estructura);
}
