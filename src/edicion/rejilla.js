import * as THREE from 'three';
import { CONFIG } from '../config.js';

export function crearRejilla(scene) {
  const grid = new THREE.GridHelper(CONFIG.gridSize, CONFIG.gridDivisions, 0x52665f, 0x2d3b3d);
  grid.position.y = 0.005;
  grid.material.opacity = 0.32;
  grid.material.transparent = true;
  scene.add(grid);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.gridSize, CONFIG.gridSize), new THREE.MeshStandardMaterial({ color: 0x20272a, roughness: 0.96, metalness: 0.02 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -0.02;
  suelo.receiveShadow = true;
  scene.add(suelo);
  return { grid, suelo };
}
