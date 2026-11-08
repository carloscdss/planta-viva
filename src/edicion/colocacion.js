import { CONFIG } from '../config.js';

function huella(componente) {
  const dimensiones = componente.dimensiones ?? componente.descriptor?.dimensiones ?? {};
  let ancho = Number(dimensiones.ancho ?? 0.6);
  let fondo = Number(dimensiones.profundidad ?? dimensiones.fondo ?? dimensiones.diametro ?? 0.6);
  const rotacionY = componente.grupo?.rotation?.y ?? componente.rotacionY ?? 0;
  if (Math.abs(Math.sin(rotacionY)) > 0.5) [ancho, fondo] = [fondo, ancho];
  return { ancho, fondo };
}

function caja(posicion, dimensiones) {
  return {
    minX: posicion.x - dimensiones.ancho / 2,
    maxX: posicion.x + dimensiones.ancho / 2,
    minZ: posicion.z - dimensiones.fondo / 2,
    maxZ: posicion.z + dimensiones.fondo / 2
  };
}

/** Devuelve el componente que colisiona, o null si la huella está libre. */
export function solapa(grafo, candidato, posicion, idExcluido = null) {
  const nueva = caja(posicion, huella(candidato));
  const margen = CONFIG.edicion.margenSolape;

  for (const existente of grafo.listar()) {
    if (existente.id === idExcluido) continue;
    const otra = caja(existente.grupo.position, huella(existente));
    const intersecaX = nueva.minX < otra.maxX + margen && nueva.maxX > otra.minX - margen;
    const intersecaZ = nueva.minZ < otra.maxZ + margen && nueva.maxZ > otra.minZ - margen;
    if (intersecaX && intersecaZ) return existente;
  }
  return null;
}

/** Ajusta los ejes X/Z a los bordes de equipos cercanos sin mover la altura. */
export function ajustarAEquipos(grafo, posicion, dimensiones) {
  const radio = CONFIG.edicion.radioSnap;
  const resultado = posicion.clone();
  let mejorX = null;
  let mejorZ = null;
  let distanciaX = radio;
  let distanciaZ = radio;

  for (const existente of grafo.listar()) {
    const otra = caja(existente.grupo.position, huella(existente));
    const xCandidatos = [otra.minX - dimensiones.ancho / 2, otra.maxX + dimensiones.ancho / 2];
    const zCandidatos = [otra.minZ - dimensiones.fondo / 2, otra.maxZ + dimensiones.fondo / 2];

    for (const x of xCandidatos) {
      const distancia = Math.abs(resultado.x - x);
      const alineadoZ = resultado.z + dimensiones.fondo / 2 > otra.minZ && resultado.z - dimensiones.fondo / 2 < otra.maxZ;
      if (distancia < distanciaX && alineadoZ) { distanciaX = distancia; mejorX = x; }
    }
    for (const z of zCandidatos) {
      const distancia = Math.abs(resultado.z - z);
      const alineadoX = resultado.x + dimensiones.ancho / 2 > otra.minX && resultado.x - dimensiones.ancho / 2 < otra.maxX;
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

export { huella };
