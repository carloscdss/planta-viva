import * as THREE from 'three';

export class Conexion {
  constructor({ puertoA, puertoB, componenteA, componenteB }) {
    this.id = `${componenteA.id}:${puertoA.id}--${componenteB.id}:${puertoB.id}`;
    this.puertoA = puertoA;
    this.puertoB = puertoB;
    this.componenteA = componenteA;
    this.componenteB = componenteB;
    this.material = new THREE.LineBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.95
    });
    this.geometria = new THREE.BufferGeometry();
    this.linea = new THREE.Line(this.geometria, this.material);
    this.linea.userData.conexionId = this.id;
    this.actualizar();
  }

  actualizar() {
    const p1 = this.componenteA.grupo.localToWorld(this.puertoA.posicion.clone());
    const p2 = this.componenteB.grupo.localToWorld(this.puertoB.posicion.clone());
    this.geometria.setFromPoints([p1, p2]);
    this.linea.geometry.computeBoundingSphere();
  }

  aJSON() {
    return {
      id: this.id,
      componenteA: this.componenteA.id,
      puertoA: this.puertoA.id,
      componenteB: this.componenteB.id,
      puertoB: this.puertoB.id,
      tipo: this.puertoA.tipo,
      distancia: this.puertoA.posicion.distanceTo(this.puertoB.posicion)
    };
  }
}
