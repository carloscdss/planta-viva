import * as THREE from 'three';
import { exigirDescriptorValido } from './descriptor.js';
import { Puerto } from './puerto.js';

function crearId() {
  return globalThis.crypto?.randomUUID?.() ?? `componente-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class Componente {
  constructor(descriptor) {
    exigirDescriptorValido(descriptor);
    this.id = crearId();
    this.tag = `${descriptor.tag ?? descriptor.tipo.toUpperCase()}-${this.id.slice(-4)}`;
    this.tipo = descriptor.tipo;
    this.familia = descriptor.familia ?? descriptor.tipo;
    this.descriptorId = descriptor.id;
    this.dimensiones = { ...descriptor.dimensiones };
    this.params = {};
    this.area = Number((this.dimensiones.ancho * this.dimensiones.profundidad).toFixed(2));
    this.puertos = (descriptor.puertos ?? []).map((puerto) => new Puerto(puerto));
    this.grupo = new THREE.Group();
    this.grupo.name = this.tag;
    this.grupo.userData.componenteId = this.id;
    this.grupo.position.y = this.dimensiones.alto / 2;
  }

  aJSON() {
    return {
      id: this.id,
      familia: this.familia,
      tipo: this.tipo,
      descriptorId: this.descriptorId,
      tag: this.tag,
      params: { ...this.params },
      dimensiones: { ...this.dimensiones },
      posicion: this.grupo.position.toArray(),
      rotacionY: this.grupo.rotation.y,
      puertos: this.puertos.map((puerto) => puerto.aJSON(this.id)),
      area: this.area
    };
  }
}
