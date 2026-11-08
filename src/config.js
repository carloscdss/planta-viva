export const CONFIG = {
  // Colores, puertos y parámetros de edición de la Fase 1.
  coloresRAL: {
    gris7035: 0xd7d7d7,
    amarillo1003: 0xf7b500,
    rojo3020: 0xcc0605,
    verde6032: 0x317f43,
    acero9006: 0xa5a5a5,
    concreto: 0xcccccc
  },
  puertos: {
    proceso: 0x3b82f6,
    electrico: 0xf59e0b,
    senal: 0x22d3ee,
    tierra: 0x84cc16
  },
  edicion: {
    pasoRejilla: 0.25,
    margenSolape: 0.05,
    radioSnap: 0.6
  },

  // Parámetros generales requeridos por el renderizador, cámara y catálogo.
  background: 0x101820,
  gridSize: 40,
  gridDivisions: 160,
  cameraPosition: [8, 7, 9],
  cameraFov: 45,
  minComponentDimension: 0.05,
  maxComponentDimension: 100,
  snapDistance: 0.75
};
