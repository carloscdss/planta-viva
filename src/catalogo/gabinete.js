import { CONFIG } from '../config.js';

const puerto = (id, tipo, posicion, direccion, diametro = 0.08) => Object.freeze({
  id,
  tipo,
  posicion: Object.freeze(posicion),
  direccion: Object.freeze(direccion),
  diametro
});

export const descriptorGabinete = Object.freeze({
  id: 'gabinete-base',
  tipo: 'gabinete',
  familia: 'gabinete',
  nombre: 'Gabinete eléctrico',
  codigo: 'GAB',
  tag: 'GAB',
  categoria: 'Eléctrico',
  descripcion: 'Gabinete autoportante de chapa pintada RAL 7035. Las entradas eléctricas se ubican en la parte posterior e inferior.',
  color: CONFIG.coloresRAL.gris7035,
  dimensiones: Object.freeze({ ancho: 1.2, alto: 2, profundidad: 0.8 }),
  campos: Object.freeze({
    ancho: Object.freeze({ tipo: 'numero', etiqueta: 'Ancho', defecto: 1.2, min: 0.4, max: 1.8, paso: 0.05, unidad: 'm' }),
    alto: Object.freeze({ tipo: 'numero', etiqueta: 'Alto', defecto: 2, min: 1.2, max: 2.6, paso: 0.05, unidad: 'm' }),
    fondo: Object.freeze({ tipo: 'numero', etiqueta: 'Fondo', defecto: 0.8, min: 0.25, max: 1.2, paso: 0.05, unidad: 'm' }),
    puertas: Object.freeze({ tipo: 'numero', etiqueta: 'Puertas', defecto: 1, min: 1, max: 3, paso: 1, unidad: 'u' }),
    montaje: Object.freeze({ tipo: 'opcion', etiqueta: 'Montaje', defecto: 'piso', opciones: Object.freeze(['piso', 'adosado', 'colgado']) })
  }),
  // Coordenadas locales al centro del gabinete: cara trasera = z negativo, zona baja.
  puertos: Object.freeze([
    puerto('entrada-inferior', 'electrico', { x: 0, y: -0.92, z: -0.34 }, { x: 0, y: -1, z: -1 }),
    puerto('tierra', 'tierra', { x: 0.25, y: -0.92, z: -0.34 }, { x: 0, y: -1, z: -1 })
  ])
});
