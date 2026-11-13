// src/edicion/colocacion.js
import { CONFIG } from '../config.js';
import { obtenerDescriptor } from '../catalogo/catalogo.js';

/** Huella en planta (X/Z), con dimensiones ajustadas y rotación de 90° aplicada. */
export function huella(componente) {
  const descriptor = componente?.descriptor ?? (componente?.familia ? obtenerDescriptor(componente.familia) : null);
  const dimensiones = componente?.dimensiones ?? descriptor?.dimensiones ?? {};
  const params = componente?.params ?? {};
  let ancho = Number(dimensiones.ancho ?? params.ancho ?? 0.6);
  let fondo = Number(dimensiones.profundidad ?? params.fondo ?? params.diametro ?? 0.6);
  const rotacionY = Number(componente?.grupo?.rotation?.y ?? componente?.rotacionY ?? 0);
  if (Math.abs(Math.sin(rotacionY)) > 0.5) [ancho, fondo] = [fondo, ancho];
  return { ancho, fondo };
}

function caja(posicion, dim) {
  return {
    minX: posicion.x - dim.ancho / 2,
    maxX: posicion.x + dim.ancho / 2,
    minZ: posicion.z - dim.fondo / 2,
    maxZ: posicion.z + dim.fondo / 2
  };
}

/** true cuando la huella candidata colisiona con otro componente del grafo. */
export function solapa(grafo, familia, params = {}, posicion, rotacionY = 0) {
  if (!posicion) return false;
  const descriptor = typeof familia === 'string' ? obtenerDescriptor(familia) : familia?.descriptor ?? familia;
  const dimensiones = { ...(descriptor?.dimensiones ?? {}) };
  if (descriptor?.familia === 'gabinete' || descriptor?.tipo === 'gabinete') {
    dimensiones.ancho = Number(params.ancho ?? dimensiones.ancho);
    dimensiones.alto = Number(params.alto ?? dimensiones.alto);
    dimensiones.profundidad = Number(params.fondo ?? dimensiones.profundidad);
  }
  const candidato = { descriptor: { ...descriptor, dimensiones }, dimensiones, params, rotacionY };
  const dimNueva = huella(candidato);
  const centroNuevo = caja(posicion, dimNueva);
  const margen = CONFIG.edicion.margenSolape;

  // ADAPTADO PARA GRAFO V2: Iteramos sobre el Map de componentes
  for (const existente of grafo.componentes.values()) {
    const centroExistente = caja(existente.grupo.position, huella(existente));
    const intersecaX = centroNuevo.minX < centroExistente.maxX + margen && centroNuevo.maxX > centroExistente.minX - margen;
    const intersecaZ = centroNuevo.minZ < centroExistente.maxZ + margen && centroNuevo.maxZ > centroExistente.minZ - margen;
    if (intersecaX && intersecaZ) return true;
  }
  return false;
}

/** Ajusta X/Z a los bordes de equipos cercanos, manteniendo Y. */
export function ajustarAEquipos(grafo, posicion, dim) {
  const radio = CONFIG.edicion.radioSnap;
  const resultado = posicion.clone();
  let mejorX = null;
  let mejorZ = null;
  let distanciaX = radio;
  let distanciaZ = radio;

  // ADAPTADO PARA GRAFO V2: Iteramos sobre el Map de componentes
  for (const existente of grafo.componentes.values()) {
    const otra = caja(existente.grupo.position, huella(existente));
    const candidatosX = [otra.minX - dim.ancho / 2, otra.maxX + dim.ancho / 2];
    const candidatosZ = [otra.minZ - dim.fondo / 2, otra.maxZ + dim.fondo / 2];

    for (const x of candidatosX) {
      const distancia = Math.abs(resultado.x - x);
      const alineadoZ = resultado.z + dim.fondo / 2 > otra.minZ && resultado.z - dim.fondo / 2 < otra.maxZ;
      if (distancia < distanciaX && alineadoZ) { distanciaX = distancia; mejorX = x; }
    }
    for (const z of candidatosZ) {
      const distancia = Math.abs(resultado.z - z);
      const alineadoX = resultado.x + dim.ancho / 2 > otra.minX && resultado.x - dim.ancho / 2 < otra.maxX;
      if (distancia < distanciaZ && alineadoX) { distanciaZ = distancia; mejorZ = z; }
    }
  }

  if (mejorX !== null) resultado.x = mejorX;
  if (mejorZ !== null) resultado.z = mejorZ;
  return resultado;
}

export function ajustarAGrilla(valor) {
  const paso = CONFIG.edicion.pasoRejilla;
  return Math.round(valor / paso) * paso;
}
