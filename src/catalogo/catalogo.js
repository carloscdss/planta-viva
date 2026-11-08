import * as THREE from 'three';
import { materiales, crearMaterialFantasma } from '../nucleo/materiales.js';
import { Componente } from '../modelo/componente.js';
import { CONFIG } from '../config.js';
import { descriptorGabinete } from './gabinete.js';

const puerto = (id, tipo, posicion, direccion, diametro = 0.12) => Object.freeze({ id, tipo, posicion: Object.freeze(posicion), direccion: Object.freeze(direccion), diametro });
const campo = (tipo, etiqueta, defecto, extra = {}) => Object.freeze({ tipo, etiqueta, defecto, ...extra });

const definicionesIniciales = [
  Object.freeze({ id: 'bomba-centrifuga', tipo: 'bomba', familia: 'bomba', nombre: 'Bomba centrífuga', codigo: 'BOM', categoria: 'Proceso', descripcion: 'Bomba centrífuga horizontal para transferencia de fluidos.', color: 0x38a9c7, dimensiones: Object.freeze({ ancho: 1.4, alto: 1.2, profundidad: 0.9 }), campos: Object.freeze({ caudal: campo('numero', 'Caudal', 25, { min: 1, max: 120, paso: 1, unidad: 'm³/h' }), potencia: campo('numero', 'Potencia', 7.5, { min: 0.5, max: 75, paso: 0.5, unidad: 'kW' }) }), puertos: Object.freeze([puerto('succion', 'proceso', { x: -0.55, y: -0.15, z: 0 }, { x: -1, y: 0, z: 0 }), puerto('descarga', 'proceso', { x: 0, y: 0.48, z: 0 }, { x: 0, y: 1, z: 0 }), puerto('alimentacion', 'electrico', { x: 0.45, y: 0.3, z: -0.2 }, { x: 0, y: 0, z: -1 })]) }),
  Object.freeze({ id: 'valvula-control', tipo: 'valvula', familia: 'valvula', nombre: 'Válvula de control', codigo: 'VAL', categoria: 'Proceso', descripcion: 'Válvula de control con actuador y puertos de proceso alineados.', color: 0xf0a34a, dimensiones: Object.freeze({ ancho: 1.2, alto: 1.3, profundidad: 0.7 }), campos: Object.freeze({ diametro: campo('numero', 'Diámetro nominal', 0.15, { min: 0.025, max: 0.6, paso: 0.025, unidad: 'm' }), apertura: campo('numero', 'Apertura', 100, { min: 0, max: 100, paso: 1, unidad: '%' }) }), puertos: Object.freeze([puerto('entrada', 'proceso', { x: -0.5, y: -0.1, z: 0 }, { x: -1, y: 0, z: 0 }), puerto('salida', 'proceso', { x: 0.5, y: -0.1, z: 0 }, { x: 1, y: 0, z: 0 }), puerto('senal', 'senal', { x: 0, y: 0.5, z: 0 }, { x: 0, y: 1, z: 0 })]) }),
  Object.freeze({ id: 'tanque-vertical', tipo: 'tanque', familia: 'tanque', nombre: 'Tanque vertical', codigo: 'TAN', categoria: 'Proceso', descripcion: 'Tanque vertical con conexiones de proceso inferior y superior.', color: 0x6abf83, dimensiones: Object.freeze({ ancho: 1.5, alto: 2.4, profundidad: 1.5 }), campos: Object.freeze({ capacidad: campo('numero', 'Capacidad', 2000, { min: 100, max: 20000, paso: 100, unidad: 'L' }) }), puertos: Object.freeze([puerto('drenaje', 'proceso', { x: 0, y: -1, z: 0.68 }, { x: 0, y: 0, z: 1 }), puerto('alimentacion', 'proceso', { x: 0, y: 0.8, z: 0.68 }, { x: 0, y: 0, z: 1 })]) }),
  Object.freeze({ id: 'intercambiador', tipo: 'intercambiador', familia: 'intercambiador', nombre: 'Intercambiador', codigo: 'INT', categoria: 'Proceso', descripcion: 'Intercambiador de calor compacto con circuitos primario y secundario.', color: 0xa78bdb, dimensiones: Object.freeze({ ancho: 1.8, alto: 0.9, profundidad: 0.9 }), campos: Object.freeze({ potencia: campo('numero', 'Potencia térmica', 50, { min: 1, max: 500, paso: 1, unidad: 'kW' }) }), puertos: Object.freeze([puerto('primario-entrada', 'proceso', { x: -0.65, y: 0.25, z: 0 }, { x: -1, y: 0, z: 0 }), puerto('primario-salida', 'proceso', { x: 0.65, y: 0.25, z: 0 }, { x: 1, y: 0, z: 0 }), puerto('secundario-entrada', 'proceso', { x: -0.65, y: -0.25, z: 0 }, { x: -1, y: 0, z: 0 }), puerto('secundario-salida', 'proceso', { x: 0.65, y: -0.25, z: 0 }, { x: 1, y: 0, z: 0 })]) }),
  Object.freeze({ id: 'motor-electrico', tipo: 'motor', familia: 'motor', nombre: 'Motor eléctrico', codigo: 'MOT', categoria: 'Eléctrico', descripcion: 'Motor eléctrico industrial con conexión de alimentación.', color: 0xe7d25d, dimensiones: Object.freeze({ ancho: 1.2, alto: 1, profundidad: 0.8 }), campos: Object.freeze({ potencia: campo('numero', 'Potencia', 5.5, { min: 0.1, max: 250, paso: 0.1, unidad: 'kW' }), rpm: campo('numero', 'Velocidad', 1450, { min: 300, max: 3600, paso: 50, unidad: 'rpm' }) }), puertos: Object.freeze([puerto('eje', 'proceso', { x: 0.5, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }), puerto('alimentacion', 'electrico', { x: 0, y: 0.38, z: -0.25 }, { x: 0, y: 0, z: -1 })]) }),
  descriptorGabinete
];

// El array permanece vivo para que el HUD pueda listar familias registradas en runtime.
export const catalogo = [...definicionesIniciales];
const porId = new Map();
const porFamilia = new Map();

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

function crearCuerpo(componente, fantasma) {
  const { tipo, dimensiones: d, color } = componente.descriptor;
  const { ancho, alto, profundidad } = d;
  const material = fantasma ? crearMaterialFantasma() : new THREE.MeshStandardMaterial({ color, metalness: tipo === 'gabinete' ? 0.18 : 0.35, roughness: tipo === 'gabinete' ? 0.62 : 0.48 });
  const add = (geometry, position = [0, 0, 0], materialOverride = material) => {
    const mesh = new THREE.Mesh(geometry, materialOverride);
    mesh.position.set(...position);
    mesh.castShadow = !fantasma;
    mesh.receiveShadow = !fantasma;
    componente.grupo.add(mesh);
    return mesh;
  };

  if (tipo === 'bomba') {
    add(new THREE.CylinderGeometry(0.42, 0.42, 0.48, 24));
    add(new THREE.SphereGeometry(0.38, 20, 16), [0, 0.18, 0]);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 16), [-0.55, -0.15, 0], materiales.oscuro).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 16), [0, 0.48, 0], materiales.oscuro);
  } else if (tipo === 'valvula') {
    add(new THREE.SphereGeometry(0.38, 20, 16));
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.38, 16), [0, 0.4, 0], materiales.oscuro);
    add(new THREE.TorusGeometry(0.27, 0.045, 10, 24), [0, 0.64, 0], materiales.estructura);
  } else if (tipo === 'tanque') {
    add(new THREE.CylinderGeometry(0.68, 0.68, 1.9, 28));
    add(new THREE.SphereGeometry(0.68, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.95, 0]);
    add(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 28), [0, -0.9, 0], materiales.estructura);
    for (const x of [-0.42, 0.42]) add(new THREE.BoxGeometry(0.12, 0.28, 0.12), [x, -1.08, 0], materiales.oscuro);
  } else if (tipo === 'intercambiador') {
    add(new THREE.CylinderGeometry(0.32, 0.32, ancho * 0.78, 24)).rotation.z = Math.PI / 2;
    for (const x of [-0.42, -0.2, 0, 0.2, 0.42]) add(new THREE.TorusGeometry(0.34, 0.025, 8, 24), [x, 0, 0], materiales.estructura).rotation.y = Math.PI / 2;
  } else if (tipo === 'motor') {
    add(new THREE.CylinderGeometry(0.38, 0.38, 0.75, 24)).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.32, 16), [0.5, 0, 0], materiales.oscuro).rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(0.48, 0.12, 0.55), [0, -0.43, 0], materiales.estructura);
  } else if (tipo === 'gabinete') {
    add(new THREE.BoxGeometry(ancho, alto, profundidad));
    const puertas = Math.max(1, Math.min(3, Math.round(componente.params.puertas ?? 1)));
    const anchoPuerta = ancho * 0.9 / puertas;
    for (let i = 0; i < puertas; i++) add(new THREE.BoxGeometry(anchoPuerta, alto * 0.94, profundidad * 0.035), [-ancho * 0.45 + anchoPuerta * (i + 0.5), 0, profundidad / 2 + 0.02], fantasma ? material : materiales.puerta);
    if (!fantasma) {
      add(new THREE.BoxGeometry(0.035, 0.28, 0.045), [ancho * 0.36, 0.05, profundidad / 2 + 0.045], materiales.oscuro);
      add(new THREE.SphereGeometry(0.035, 16, 12), [-ancho * 0.34, alto * 0.3, profundidad / 2 + 0.045], materiales.indicador);
    }
  } else {
    add(new THREE.BoxGeometry(ancho, alto, profundidad));
  }

  for (const puertoDef of componente.puertos) {
    const marcador = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.045, puertoDef.diametro * 0.55), 12, 10), new THREE.MeshBasicMaterial({ color: CONFIG.puertos[puertoDef.tipo] ?? 0xffffff }));
    marcador.position.copy(puertoDef.posicion);
    marcador.userData.portId = puertoDef.id;
    marcador.userData.puerto = true;
    marcador.userData.esPuerto = true;
    marcador.visible = false;
    componente.grupo.add(marcador);
  }
}

export function crearComponente(catalogId, { fantasma = false, params = {} } = {}) {
  const base = obtenerDescriptor(catalogId);
  const dimensiones = { ...base.dimensiones };
  if (base.familia === 'gabinete') {
    dimensiones.ancho = Number(params.ancho ?? dimensiones.ancho);
    dimensiones.alto = Number(params.alto ?? dimensiones.alto);
    dimensiones.profundidad = Number(params.fondo ?? dimensiones.profundidad);
  }
  const puertos = base.familia === 'gabinete'
    ? base.puertos.map((item) => ({ ...item, posicion: { ...item.posicion, z: -dimensiones.profundidad / 2 } }))
    : base.puertos;
  const descriptor = { ...base, dimensiones, puertos };
  const componente = new Componente(descriptor);
  componente.descriptor = descriptor;
  componente.familia = base.familia;
  componente.nombre = base.nombre;
  componente.params = { ...Object.fromEntries(Object.entries(base.campos ?? {}).map(([clave, spec]) => [clave, spec.defecto])), ...params };
  componente.area = Number((dimensiones.ancho * dimensiones.profundidad).toFixed(2));
  crearCuerpo(componente, fantasma);
  componente.grupo.userData.fantasma = fantasma;
  return componente;
}
