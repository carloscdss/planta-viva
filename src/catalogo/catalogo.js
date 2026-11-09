import * as THREE from 'three';
import { materiales, crearMaterialFantasma } from '../nucleo/materiales.js';
import { Componente } from '../modelo/componente.js';
import { CONFIG } from '../config.js';
import { descriptorGabinete } from './gabinete.js';
import { descriptorBomba } from './bomba.js';
import { descriptorTuberia } from './tuberia.js';

const definicionesIniciales = [descriptorGabinete, descriptorBomba, descriptorTuberia];
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
  const material = fantasma ? crearMaterialFantasma() : new THREE.MeshStandardMaterial({ color, metalness: 0.42, roughness: 0.48 });
  const add = (geometry, position = [0, 0, 0], materialOverride = material) => {
    const mesh = new THREE.Mesh(geometry, materialOverride);
    mesh.position.set(...position);
    mesh.castShadow = !fantasma;
    mesh.receiveShadow = !fantasma;
    componente.grupo.add(mesh);
    return mesh;
  };

  if (tipo === 'bomba') {
    add(new THREE.BoxGeometry(1.5, 0.12, 0.72), [0, -0.52, 0], materiales.estructura);
    add(new THREE.SphereGeometry(0.36, 24, 18), [-0.08, -0.08, 0]);
    add(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 20), [-0.47, -0.1, 0], materiales.oscuro).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 20), [-0.05, 0.28, 0], materiales.oscuro);
    add(new THREE.CylinderGeometry(0.24, 0.24, 0.64, 24), [0.55, 0.08, 0]).rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(0.34, 0.12, 0.4), [0.55, -0.3, 0], materiales.oscuro);
  } else if (tipo === 'tuberia') {
    const radio = Number(componente.params.diametro ?? d.alto) / 2;
    const longitud = Number(componente.params.longitud ?? d.ancho);
    add(new THREE.CylinderGeometry(radio, radio, longitud, 24), [0, 0, 0]).rotation.z = Math.PI / 2;
    for (const x of [-longitud / 2, longitud / 2]) {
      add(new THREE.CylinderGeometry(radio * 1.35, radio * 1.35, 0.08, 24), [x, 0, 0], materiales.estructura).rotation.z = Math.PI / 2;
    }
  } else if (tipo === 'gabinete') {
    const { ancho, alto, profundidad } = d;
    add(new THREE.BoxGeometry(ancho, alto, profundidad));
    const puertas = Math.max(1, Math.min(3, Math.round(componente.params.puertas ?? 1)));
    const anchoPuerta = ancho * 0.9 / puertas;
    for (let i = 0; i < puertas; i++) {
      add(new THREE.BoxGeometry(anchoPuerta, alto * 0.94, profundidad * 0.035), [-ancho * 0.45 + anchoPuerta * (i + 0.5), 0, profundidad / 2 + 0.02], fantasma ? material : materiales.estructura);
    }
    if (!fantasma) {
      add(new THREE.BoxGeometry(0.035, 0.28, 0.045), [ancho * 0.36, 0.05, profundidad / 2 + 0.045], materiales.oscuro);
      add(new THREE.SphereGeometry(0.035, 16, 12), [-ancho * 0.34, alto * 0.3, profundidad / 2 + 0.045], materiales.indicador);
    }
  }

  for (const puertoDef of componente.puertos) {
    const marcador = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.045, puertoDef.diametro * 0.55), 12, 10),
      new THREE.MeshBasicMaterial({ color: CONFIG.puertos[puertoDef.tipo] ?? 0xffffff, depthTest: false })
    );
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
  componente.area = Number((dimensiones.ancho * dimensiones.profundidad).toFixed(2));
  crearCuerpo(componente, fantasma);
  componente.grupo.userData.fantasma = fantasma;
  return componente;
}
