import * as THREE from 'three';
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
  // Coordenadas locales al centro del equipo; z negativo es la cara trasera.
  puertos: Object.freeze([
    puerto('entrada-inferior', 'electrico', { x: 0, y: -0.92, z: -0.4 }, { x: 0, y: -1, z: -1 }),
    puerto('tierra', 'tierra', { x: 0.25, y: -0.92, z: -0.4 }, { x: 0, y: -1, z: -1 })
  ])
});

export function dibujarGabinete(componente, { THREE: three, materiales, fantasma }) {
  const { ancho, alto, profundidad } = componente.descriptor.dimensiones;
  const material = fantasma ? componente._materialFantasma ??= new three.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, depthWrite: false }) : new three.MeshStandardMaterial({ color: componente.descriptor.color, metalness: 0.24, roughness: 0.58 });
  const agregar = (geometria, posicion, materialMalla = material) => {
    const malla = new three.Mesh(geometria, materialMalla);
    malla.position.set(...posicion);
    malla.castShadow = !fantasma;
    malla.receiveShadow = !fantasma;
    componente.grupo.add(malla);
    return malla;
  };
  agregar(new three.BoxGeometry(ancho, alto, profundidad), [0, 0, 0]);
  const puertas = Math.max(1, Math.min(3, Math.round(componente.params.puertas ?? 1)));
  const anchoPuerta = ancho * 0.9 / puertas;
  for (let i = 0; i < puertas; i++) {
    agregar(new three.BoxGeometry(anchoPuerta, alto * 0.94, profundidad * 0.035), [-ancho * 0.45 + anchoPuerta * (i + 0.5), 0, profundidad / 2 + 0.02], fantasma ? material : materiales.estructura);
  }
  if (!fantasma) {
    agregar(new three.BoxGeometry(0.035, 0.28, 0.045), [ancho * 0.36, 0.05, profundidad / 2 + 0.045], materiales.oscuro);
    agregar(new three.SphereGeometry(0.035, 16, 12), [-ancho * 0.34, alto * 0.3, profundidad / 2 + 0.045], materiales.indicador);
  }
}
