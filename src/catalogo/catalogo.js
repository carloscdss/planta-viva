import * as THREE from 'three';
import { materiales, crearMaterialFantasma } from '../nucleo/materiales.js';
import { Componente } from '../modelo/componente.js';

const puerto = (id, tipo, posicion, direccion) => Object.freeze({
  id, tipo, posicion: Object.freeze(posicion), direccion: Object.freeze(direccion), diametro: 0.12
});

export const catalogo = Object.freeze([
  Object.freeze({ id: 'bomba-centrifuga', tipo: 'bomba', nombre: 'Bomba centrífuga', tag: 'BOM', color: 0x38a9c7, dimensiones: Object.freeze({ ancho: 1.4, alto: 1.2, profundidad: 0.9 }), puertos: Object.freeze([puerto('succion', 'fluido', { x: -0.7, y: -0.15, z: 0 }, { x: -1, y: 0, z: 0 }), puerto('descarga', 'fluido', { x: 0, y: 0.6, z: 0 }, { x: 0, y: 1, z: 0 })]) }),
  Object.freeze({ id: 'valvula-control', tipo: 'valvula', nombre: 'Válvula', tag: 'VAL', color: 0xf0a34a, dimensiones: Object.freeze({ ancho: 1.2, alto: 1.3, profundidad: 0.7 }), puertos: Object.freeze([puerto('entrada', 'fluido', { x: -0.6, y: -0.15, z: 0 }, { x: -1, y: 0, z: 0 }), puerto('salida', 'fluido', { x: 0.6, y: -0.15, z: 0 }, { x: 1, y: 0, z: 0 })]) }),
  Object.freeze({ id: 'tanque-vertical', tipo: 'tanque', nombre: 'Tanque vertical', tag: 'TAN', color: 0x6abf83, dimensiones: Object.freeze({ ancho: 1.5, alto: 2.4, profundidad: 1.5 }), puertos: Object.freeze([puerto('entrada', 'fluido', { x: 0, y: 0.25, z: 0.75 }, { x: 0, y: 0, z: 1 }), puerto('salida', 'fluido', { x: 0, y: -1.2, z: 0 }, { x: 0, y: -1, z: 0 })]) }),
  Object.freeze({ id: 'intercambiador', tipo: 'intercambiador', nombre: 'Intercambiador', tag: 'INT', color: 0xa78bdb, dimensiones: Object.freeze({ ancho: 1.8, alto: 0.9, profundidad: 0.9 }), puertos: Object.freeze([puerto('entrada-a', 'fluido', { x: -0.9, y: 0.2, z: 0 }, { x: -1, y: 0, z: 0 }), puerto('salida-a', 'fluido', { x: 0.9, y: 0.2, z: 0 }, { x: 1, y: 0, z: 0 }), puerto('entrada-b', 'fluido', { x: -0.9, y: -0.2, z: 0 }, { x: -1, y: 0, z: 0 }), puerto('salida-b', 'fluido', { x: 0.9, y: -0.2, z: 0 }, { x: 1, y: 0, z: 0 })]) }),
  Object.freeze({ id: 'motor-electrico', tipo: 'motor', nombre: 'Motor eléctrico', tag: 'MOT', color: 0xe7d25d, dimensiones: Object.freeze({ ancho: 1.2, alto: 1, profundidad: 0.8 }), puertos: Object.freeze([puerto('alimentacion', 'electrico', { x: 0, y: 0.1, z: 0.4 }, { x: 0, y: 0, z: 1 }), puerto('eje', 'mecanico', { x: 0.6, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })]) }),
  Object.freeze({ id: 'gabinete-base', tipo: 'gabinete', nombre: 'Gabinete eléctrico', tag: 'GAB', color: 0x9aabb0, dimensiones: Object.freeze({ ancho: 1.2, alto: 2, profundidad: 0.8 }), puertos: Object.freeze([puerto('entrada-electrica', 'electrico', { x: 0, y: 0.25, z: 0.4 }, { x: 0, y: 0, z: 1 }), puerto('salida-electrica', 'electrico', { x: 0, y: 0.25, z: -0.4 }, { x: 0, y: 0, z: -1 })]) })
]);

export function obtenerDescriptor(id) {
  const descriptor = catalogo.find((item) => item.id === id);
  if (!descriptor) throw new Error(`No existe el elemento de catálogo "${id}".`);
  return descriptor;
}

function crearCuerpo(componente, fantasma) {
  const { tipo, dimensiones, color } = componente.descriptor;
  const { ancho, alto, profundidad } = dimensiones;
  const material = fantasma ? crearMaterialFantasma() : new THREE.MeshStandardMaterial({ color, metalness: 0.42, roughness: 0.36 });
  const add = (geometry, position = [0, 0, 0], materialOverride = material) => {
    const mesh = new THREE.Mesh(geometry, materialOverride);
    mesh.position.set(...position);
    mesh.castShadow = !fantasma;
    mesh.receiveShadow = !fantasma;
    componente.grupo.add(mesh);
    return mesh;
  };

  if (tipo === 'bomba') {
    add(new THREE.CylinderGeometry(0.42, 0.42, 0.48, 24), [0, 0, 0]);
    add(new THREE.SphereGeometry(0.38, 20, 16), [0, 0.18, 0]);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 16), [-0.55, -0.15, 0], materiales.oscuro).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 16), [0, 0.48, 0], materiales.oscuro);
  } else if (tipo === 'valvula') {
    add(new THREE.SphereGeometry(0.38, 20, 16));
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.38, 16), [0, 0.4, 0], materiales.oscuro);
    add(new THREE.TorusGeometry(0.27, 0.045, 10, 24), [0, 0.64, 0], materiales.estructura);
  } else if (tipo === 'tanque') {
    add(new THREE.CylinderGeometry(0.68, 0.68, 1.9, 28));
    add(new THREE.SphereGeometry(0.68, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.95, 0]);
    add(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 28), [0, -0.9, 0], materiales.estructura);
    for (const x of [-0.42, 0.42]) add(new THREE.BoxGeometry(0.12, 0.28, 0.12), [x, -1.08, 0], materiales.oscuro);
  } else if (tipo === 'intercambiador') {
    add(new THREE.CylinderGeometry(0.32, 0.32, ancho * 0.78, 24), [0, 0, 0]).rotation.z = Math.PI / 2;
    for (const x of [-0.42, -0.2, 0, 0.2, 0.42]) add(new THREE.TorusGeometry(0.34, 0.025, 8, 24), [x, 0, 0], materiales.estructura).rotation.y = Math.PI / 2;
    for (const x of [-0.62, 0.62]) add(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 12), [x, 0.3, 0], materiales.oscuro).rotation.z = Math.PI / 2;
  } else if (tipo === 'motor') {
    add(new THREE.CylinderGeometry(0.38, 0.38, 0.75, 24), [0, 0, 0]).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.32, 16), [0.5, 0, 0], materiales.oscuro).rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(0.48, 0.12, 0.55), [0, -0.43, 0], materiales.estructura);
    add(new THREE.BoxGeometry(0.35, 0.24, 0.35), [0, 0.42, 0], materiales.oscuro);
  } else {
    add(new THREE.BoxGeometry(ancho, alto, profundidad));
    add(new THREE.BoxGeometry(ancho * 0.9, alto * 0.94, profundidad * 0.035), [0, 0, profundidad / 2 + 0.02], fantasma ? material : materiales.estructura);
    if (!fantasma) {
      add(new THREE.BoxGeometry(0.035, 0.28, 0.045), [ancho * 0.36, 0.05, profundidad / 2 + 0.045], materiales.oscuro);
      add(new THREE.SphereGeometry(0.035, 16, 12), [-ancho * 0.34, alto * 0.3, profundidad / 2 + 0.045], materiales.indicador);
    }
  }

  for (const port of componente.puertos) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), fantasma ? new THREE.MeshBasicMaterial({ color: 0x85ffcb }) : new THREE.MeshStandardMaterial({ color: port.tipo === 'fluido' ? 0x39c5e6 : port.tipo === 'electrico' ? 0xffd75e : 0xe7a2ff, emissive: 0x182020 }));
    marker.position.copy(port.posicion);
    marker.userData.portId = port.id;
    componente.grupo.add(marker);
  }
}

export function crearComponente(catalogId, { fantasma = false } = {}) {
  const descriptor = obtenerDescriptor(catalogId);
  const componente = new Componente(descriptor);
  componente.descriptor = descriptor;
  crearCuerpo(componente, fantasma);
  componente.grupo.userData.fantasma = fantasma;
  return componente;
}
