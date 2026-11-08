import * as THREE from 'three';
import { CONFIG } from '../config.js';

export const materiales = Object.freeze({
  estructura: new THREE.MeshStandardMaterial({ color: 0x525d63, metalness: 0.58, roughness: 0.42 }),
  panel: new THREE.MeshStandardMaterial({ color: CONFIG.coloresRAL.gris7035, metalness: 0.24, roughness: 0.58 }),
  puerta: new THREE.MeshStandardMaterial({ color: CONFIG.coloresRAL.gris7035, metalness: 0.2, roughness: 0.62 }),
  oscuro: new THREE.MeshStandardMaterial({ color: 0x27343a, metalness: 0.42, roughness: 0.48 }),
  indicador: new THREE.MeshStandardMaterial({ color: 0x53d6a4, emissive: 0x164c3a, roughness: 0.28 }),
  suelo: new THREE.MeshStandardMaterial({ color: 0x182329, roughness: 0.9 })
});

export function crearMaterialFantasma(valido = true) {
  return new THREE.MeshStandardMaterial({ color: valido ? 0x53d6a4 : 0xe05555, transparent: true, opacity: 0.38, metalness: 0.12, roughness: 0.55, depthWrite: false });
}
