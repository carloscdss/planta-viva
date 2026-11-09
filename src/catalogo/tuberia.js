import { CONFIG } from '../config.js';

const puerto = (id, posicion, direccion) => Object.freeze({
  id,
  tipo: 'proceso',
  posicion: Object.freeze(posicion),
  direccion: Object.freeze(direccion),
  diametro: 0.15
});

export const descriptorTuberia = Object.freeze({
  id: 'tuberia',
  tipo: 'tuberia',
  familia: 'tuberia',
  nombre: 'Tubería',
  codigo: 'TUB',
  tag: 'TUB',
  categoria: 'Proceso',
  descripcion: 'Tramo recto paramétrico con diámetro configurable y puertos de entrada y salida.',
  color: CONFIG.coloresRAL.acero9006,
  dimensiones: Object.freeze({ ancho: 2, alto: 0.2, profundidad: 0.2 }),
  campos: Object.freeze({
    longitud: Object.freeze({ tipo: 'numero', etiqueta: 'Longitud', defecto: 2, min: 0.5, max: 8, paso: 0.25, unidad: 'm' }),
    diametro: Object.freeze({ tipo: 'numero', etiqueta: 'Diámetro', defecto: 0.2, min: 0.05, max: 0.6, paso: 0.05, unidad: 'm' })
  }),
  puertos: Object.freeze([
    puerto('entrada', { x: -1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }),
    puerto('salida', { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })
  ])
});
