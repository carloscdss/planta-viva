import * as THREE from 'three';

export class Conexion {
  constructor({ puertoA, puertoB, componenteA, componenteB }) {
    this.id = `${componenteA.id}:${puertoA.id}--${componenteB.id}:${puertoB.id}`;
    this.puertoA = puertoA;
    this.puertoB = puertoB;
    this.componenteA = componenteA;
    this.componenteB = componenteB;
    
    // Material del tubo (acero inoxidable)
    this.material = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.8,
      roughness: 0.4
    });
    
    // Creamos una geometría inicial vacía
    this.geometria = new THREE.CylinderGeometry(1, 1, 1, 12);
    this.malla = new THREE.Mesh(this.geometria, this.material);
    this.malla.userData.conexionId = this.id;
    
    this.actualizar();
  }

  actualizar() {
    // Obtener las posiciones reales en el mundo 3D
    const p1 = new THREE.Vector3().copy(this.puertoA.posicion);
    this.componenteA.grupo.localToWorld(p1);

    const p2 = new THREE.Vector3().copy(this.puertoB.posicion);
    this.componenteB.grupo.localToWorld(p2);

    const dir = new THREE.Vector3().subVectors(p2, p1);
    const longitud = dir.length();
    
    if (longitud === 0) return;

    // Ajustar el tamaño del tubo (radio 0.05m o el diámetro del puerto)
    const radio = Math.max(0.05, this.puertoA.diametro / 2);
    this.malla.scale.set(radio, longitud, radio);
    
    // Posicionar en el punto medio
    const centro = new THREE.Vector3().copy(p1).addScaledVector(dir, 0.5);
    this.malla.position.copy(centro);

    // Rotar para que apunte hacia el otro puerto
    const ejeY = new THREE.Vector3(0, 1, 0);
    const cuaternion = new THREE.Quaternion().setFromUnitVectors(ejeY, dir.clone().normalize());
    this.malla.quaternion.copy(cuaternion);
  }

  aJSON() {
    return {
      id: this.id,
      componenteA: this.componenteA.id,
      puertoA: this.puertoA.id,
      componenteB: this.componenteB.id,
      puertoB: this.puertoB.id,
      tipo: this.puertoA.tipo
    };
  }
}
