import { CONFIG } from '../config.js';

const puerto = (id, posicion, direccion) => Object.freeze({
  id,
  tipo: 'proceso',
  posicion: Object.freeze(posicion),
  direccion: Object.freeze(direccion),
  diametro: 0.2
});

export const descriptorBomba = Object.freeze({
  id: 'bomba-centrifuga',
  tipo: 'bomba',
  familia: 'bomba',
  nombre: 'Bomba centrífuga',
  codigo: 'BOM',
  tag: 'BOM',
  categoria: 'Proceso',
  descripcion: 'Bomba centrífuga horizontal con base, cuerpo hidráulico y motor eléctrico.',
  color: CONFIG.coloresRAL.acero9006,
  dimensiones: Object.freeze({ ancho: 1.8, alto: 1.3, profundidad: 0.9 }),
  campos: Object.freeze({}),
  puertos: Object.freeze([
    puerto('succion', { x: -0.82, y: -0.1, z: 0 }, { x: -1, y: 0, z: 0 }),
    puerto('descarga', { x: -0.05, y: 0.58, z: 0 }, { x: 0, y: 1, z: 0 })
  ])
});
