import * as THREE from 'three';

export class Conexion {
  constructor({ puertoA, puertoB, componenteA, componenteB }) {
    this.id = `${componenteA.id}:${puertoA.id}--${componenteB.id}:${puertoB.id}`;
    this.puertoA = puertoA;
    this.puertoB = puertoB;
    this.componenteA = componenteA;
    this.componenteB = componenteB;
    this.activo = false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(0, 0, 32, 64);

    this.textura = new THREE.CanvasTexture(canvas);
    this.textura.wrapS = THREE.RepeatWrapping;
    this.textura.wrapT = THREE.RepeatWrapping;
    this.textura.repeat.set(5, 1);

    this.materialNormal = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.4 });
    this.materialFlujo = new THREE.MeshStandardMaterial({ 
      map: this.textura, 
      emissive: 0x1e3a8a, 
      emissiveIntensity: 0.5,
      metalness: 0.2, 
      roughness: 0.6 
    });

    this.geometria = new THREE.CylinderGeometry(1, 1, 1, 12);
    this.malla = new THREE.Mesh(this.geometria, this.materialNormal);
    this.malla.userData.conexionId = this.id;
    
    this.actualizar();
  }

  actualizar() {
    const p1 = new THREE.Vector3().copy(this.puertoA.posicion);
    this.componenteA.grupo.localToWorld(p1);
    const p2 = new THREE.Vector3().copy(this.puertoB.posicion);
    this.componenteB.grupo.localToWorld(p2);

    const dir = new THREE.Vector3().subVectors(p2, p1);
    const longitud = dir.length();
    if (longitud === 0) return;

    const radio = Math.max(0.05, this.puertoA.diametro / 2);
    this.malla.scale.set(radio, longitud, radio);
    
    const centro = new THREE.Vector3().copy(p1).addScaledVector(dir, 0.5);
    this.malla.position.copy(centro);

    const ejeY = new THREE.Vector3(0, 1, 0);
    const cuaternion = new THREE.Quaternion().setFromUnitVectors(ejeY, dir.clone().normalize());
    this.malla.quaternion.copy(cuaternion);
  }

  animarFlujo(dt) {
    if (this.activo) {
      this.malla.material = this.materialFlujo;
      this.textura.offset.x -= dt * 1.5;
    } else {
      this.malla.material = this.materialNormal;
    }
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
