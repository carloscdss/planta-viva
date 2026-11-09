import * as THREE from 'three';
import { materiales, crearMaterialFantasma } from '../nucleo/materiales.js';
import { Componente } from '../modelo/componente.js';
import { CONFIG } from '../config.js';
import { descriptorGabinete, dibujarGabinete } from './gabinete.js';
import { descriptorBomba, dibujarBomba } from './bomba.js';
import { descriptorTuberia, dibujarTuberia } from './tuberia.js';
import { descriptorTanque, dibujarTanque } from './tanque.js';
import { descriptorValvula, dibujarValvula } from './valvula.js';
import { descriptorIntercambiador, dibujarIntercambiador } from './intercambiador.js';
import { descriptorMotor, dibujarMotor } from './motor.js';

// Registro central: cada familia conserva su descriptor y su dibujo en su propio módulo.
const definicionesIniciales = [
  descriptorGabinete,
  descriptorBomba,
  descriptorTuberia,
  descriptorTanque,
  descriptorValvula,
  descriptorIntercambiador,
  descriptorMotor
];
export const catalogo = [...definicionesIniciales];
const porId = new Map();
const porFamilia = new Map();
const dibujantes = new Map([
  ['gabinete', dibujarGabinete],
  ['bomba', dibujarBomba],
  ['tuberia', dibujarTuberia],
  ['tanque', dibujarTanque],
  ['valvula', dibujarValvula],
  ['intercambiador', dibujarIntercambiador],
  ['motor', dibujarMotor]
]);

function indexar(definicion) {
  porId.set(definicion.id, definicion);
  porFamilia.set(definicion.familia ?? definicion.tipo, definicion);
}
definicionesIniciales.forEach(indexar);

export function registrarFamilia(definicion) {
  if (!definicion || typeof definicion !== 'object' || !definicion.id || !definicion.tipo) {
    throw new TypeError('La familia requiere al menos id y tipo.');
  }
  if (porId.has(definicion.id) || porFamilia.has(definicion.familia ?? definicion.tipo)) {
    throw new Error(`La familia "${definicion.familia ?? definicion.tipo}" ya está registrada.`);
  }
  const registrada = Object.freeze({
    categoria: 'Otros', codigo: definicion.tipo.toUpperCase(), nombre: definicion.nombre ?? definicion.tipo,
    descripcion: '', campos: Object.freeze({}), puertos: Object.freeze([]), ...definicion,
    familia: definicion.familia ?? definicion.tipo
  });
  catalogo.push(registrada);
  indexar(registrada);
  return registrada;
}

export function buscarFamilias(consulta = '') {
  const termino = String(consulta).trim().toLocaleLowerCase();
  return catalogo.filter((item) => !termino || `${item.id} ${item.familia} ${item.tipo} ${item.nombre} ${item.codigo} ${item.categoria} ${item.descripcion}`.toLocaleLowerCase().includes(termino));
}

export function obtenerDescriptor(id) {
  const descriptor = porId.get(id) ?? porFamilia.get(id);
  if (!descriptor) throw new Error(`No existe el elemento de catálogo "${id}".`);
  return descriptor;
}

function agregarPuerto(componente, puertoDef) {
  const marcador = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(0.045, (puertoDef.diametro ?? 0.1) * 0.55), 12, 10),
    new THREE.MeshBasicMaterial({ color: CONFIG.puertos[puertoDef.tipo] ?? 0xffffff, depthTest: false })
  );
  marcador.position.set(puertoDef.posicion.x, puertoDef.posicion.y, puertoDef.posicion.z);
  marcador.userData.portId = puertoDef.id;
  marcador.userData.puerto = true;
  marcador.userData.esPuerto = true;
  marcador.visible = false;
  componente.grupo.add(marcador);
}

function crearCuerpo(componente, fantasma) {
  const dibujar = dibujantes.get(componente.familia);
  if (!dibujar) throw new Error(`No hay un dibujante registrado para "${componente.familia}".`);
  dibujar(componente, { THREE, materiales, crearMaterialFantasma, fantasma });
  for (const puerto of componente.puertos) agregarPuerto(componente, puerto);
}

export function crearComponente(catalogId, { fantasma = false, params = {} } = {}) {
  const base = obtenerDescriptor(catalogId);
  const dimensiones = { ...base.dimensiones };
  if (base.familia === 'gabinete') {
    dimensiones.ancho = Number(params.ancho ?? dimensiones.ancho);
    dimensiones.alto = Number(params.alto ?? dimensiones.alto);
    dimensiones.profundidad = Number(params.fondo ?? dimensiones.profundidad);
  } else if (base.familia === 'tuberia') {
    dimensiones.ancho = Number(params.longitud ?? dimensiones.ancho);
    dimensiones.alto = Number(params.diametro ?? dimensiones.alto);
    dimensiones.profundidad = dimensiones.alto;
  }
  const puertos = base.familia === 'gabinete'
    ? base.puertos.map((item) => ({ ...item, posicion: { ...item.posicion, z: -dimensiones.profundidad / 2 } }))
    : base.familia === 'tuberia'
      ? base.puertos.map((item) => ({ ...item, posicion: { ...item.posicion, x: (item.id === 'entrada' ? -1 : 1) * dimensiones.ancho / 2 }, diametro: dimensiones.alto }))
      : base.puertos;
  const descriptor = { ...base, dimensiones, puertos };
  const componente = new Componente(descriptor);
  componente.descriptor = descriptor;
  componente.familia = base.familia;
  componente.nombre = base.nombre;
  componente.params = { ...Object.fromEntries(Object.entries(base.campos ?? {}).map(([clave, spec]) => [clave, spec.defecto])), ...params };
  if (componente.familia === 'bomba' && componente.params.encendida === undefined) componente.params.encendida = false;
  if (componente.familia === 'valvula' && componente.params.abierta === undefined) componente.params.abierta = true;
  componente.area = Number((dimensiones.ancho * dimensiones.profundidad).toFixed(2));
  crearCuerpo(componente, fantasma);
  componente.grupo.userData.fantasma = fantasma;
  return componente;
}
