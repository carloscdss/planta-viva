import * as THREE from 'three';

export const materiales = Object.freeze({
  estructura: new THREE.MeshStandardMaterial({ color: 0x607d8b, metalness: 0.72, roughness: 0.3 }),
  panel: new THREE.MeshStandardMaterial({ color: 0x9aabb0, metalness: 0.48, roughness: 0.38 }),
  oscuro: new THREE.MeshStandardMaterial({ color: 0x27343a, metalness: 0.6, roughness: 0.42 }),
  indicador: new THREE.MeshStandardMaterial({ color: 0x53d6a4, emissive: 0x164c3a, roughness: 0.28 }),
  suelo: new THREE.MeshStandardMaterial({ color: 0x182329, roughness: 0.9 })
});

export function crearMaterialFantasma() {
  return new THREE.MeshStandardMaterial({ color: 0x53d6a4, transparent: true, opacity: 0.38, metalness: 0.25, roughness: 0.45, depthWrite: false });
}
