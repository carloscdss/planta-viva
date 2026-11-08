import * as THREE from 'three';

export class Puerto {
  constructor({ id, tipo, posicion = { x: 0, y: 0, z: 0 }, direccion = { x: 0, y: 0, z: 1 }, diametro = 0.1 }) {
    this.id = id;
    this.tipo = tipo;
    this.posicion = new THREE.Vector3(posicion.x, posicion.y, posicion.z);
    this.direccion = new THREE.Vector3(direccion.x, direccion.y, direccion.z).normalize();
    this.diametro = diametro;
    this.conectadoA = null;
  }

  aJSON(componenteId) {
    return { id: this.id, componenteId, tipo: this.tipo, posicion: this.posicion.toArray(), direccion: this.direccion.toArray(), diametro: this.diametro, conectadoA: this.conectadoA };
  }
}
