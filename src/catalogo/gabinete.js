import * as THREE from 'three';
import { materiales, crearMaterialFantasma } from '../nucleo/materiales.js';
import { Componente } from '../modelo/componente.js';

export const descriptorGabinete = Object.freeze({
  id: 'gabinete-base',
  tipo: 'gabinete',
  tag: 'GAB-001',
  dimensiones: Object.freeze({ ancho: 1.2, alto: 2, profundidad: 0.8 }),
  puertos: Object.freeze([
    Object.freeze({ id: 'entrada', tipo: 'electrico', posicion: Object.freeze({ x: 0, y: 0.25, z: 0.4 }), direccion: Object.freeze({ x: 0, y: 0, z: 1 }), diametro: 0.08 }),
    Object.freeze({ id: 'salida', tipo: 'electrico', posicion: Object.freeze({ x: 0, y: 0.25, z: -0.4 }), direccion: Object.freeze({ x: 0, y: 0, z: -1 }), diametro: 0.08 })
  ])
});

export function crearGabinete({ fantasma = false } = {}) {
  const componente = new Componente(descriptorGabinete);
  const { ancho, alto, profundidad } = componente.dimensiones;
  const material = fantasma ? crearMaterialFantasma() : materiales.panel;
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, profundidad), material);
  cuerpo.castShadow = !fantasma;
  cuerpo.receiveShadow = !fantasma;
  cuerpo.position.y = 0;
  cuerpo.name = 'cuerpo-gabinete';
  componente.grupo.add(cuerpo);

  const marcoMaterial = fantasma ? material : materiales.estructura;
  const marco = new THREE.Mesh(new THREE.BoxGeometry(ancho * 0.9, alto * 0.94, profundidad * 0.035), marcoMaterial);
  marco.position.set(0, 0, profundidad / 2 + 0.018);
  componente.grupo.add(marco);

  if (!fantasma) {
    const manija = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.28, 0.045), materiales.oscuro);
    manija.position.set(ancho * 0.36, 0.05, profundidad / 2 + 0.045);
    manija.castShadow = true;
    componente.grupo.add(manija);
    const indicador = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), materiales.indicador);
    indicador.position.set(-ancho * 0.34, alto * 0.3, profundidad / 2 + 0.045);
    componente.grupo.add(indicador);
  }
  componente.grupo.userData.fantasma = fantasma;
  return componente;
}
