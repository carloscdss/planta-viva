import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from './config.js';
import { configurarIluminacion } from './nucleo/iluminacion.js';
import { crearRejilla } from './edicion/rejilla.js';
import { catalogo, crearComponente } from './catalogo/catalogo.js';
import { Grafo } from './modelo/grafo.js';
import { ajustarAGrilla, ajustarAEquipos, huella, solapa } from './edicion/colocacion.js';
import { montarHud } from './ui/hud.js';
import { analizarMaqueta } from './supervisor.js';
import { registrar } from './nucleo/registro.js';

const app = document.querySelector('#app');
const panelDatos = document.querySelector('#data-panel');
if (!app || !panelDatos) throw new Error('Faltan #app o #data-panel en index.html.');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(app.clientWidth, app.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.prepend(renderer.domElement);

const escena = new THREE.Scene();
escena.background = new THREE.Color(CONFIG.background);
const camara = new THREE.PerspectiveCamera(CONFIG.cameraFov, app.clientWidth / app.clientHeight, 0.1, 200);
camara.position.set(...CONFIG.cameraPosition);
const controles = new OrbitControls(camara, renderer.domElement);
controles.target.set(0, 0.8, 0);
controles.enableDamping = true;
controles.dampingFactor = 0.08;
controles.maxPolarAngle = Math.PI * 0.49;
controles.minDistance = 3;
controles.maxDistance = 35;
configurarIluminacion(escena);
crearRejilla(escena);

const grafo = new Grafo();

registrar('escena', escena);
registrar('renderer', renderer);
registrar('camara', camara);
registrar('grafo', grafo);

const rayo = new THREE.Raycaster();
const puntero = new THREE.Vector2();
const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const interseccion = new THREE.Vector3();
let fantasma = null;
let familiaActiva = null;
let paramsActivos = {};
let posicionValida = false;
let colision = null;
let seleccionado = null;
let modoConexiones = false;
let puertoPendiente = null;
let inicioPuntero = null;
let hud;

function aviso(texto, error = false) { hud.aviso(texto, error); }
function actualizarJSON() { panelDatos.textContent = JSON.stringify(grafo.aJSON(), null, 2); }
function actualizarRayo(evento) {
  const rect = renderer.domElement.getBoundingClientRect();
  puntero.set(((evento.clientX - rect.left) / rect.width) * 2 - 1, -((evento.clientY - rect.top) / rect.height) * 2 + 1);
  rayo.setFromCamera(puntero, camara);
}
function liberarGrupo(grupo) {
  grupo.traverse((obj) => {
    obj.geometry?.dispose();
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
    else obj.material?.dispose();
  });
}
function limpiarFantasma() {
  if (!fantasma) return;
  escena.remove(fantasma.grupo);
  liberarGrupo(fantasma.grupo);
  fantasma = null;
  posicionValida = false;
  colision = null;
}
function crearFantasma() {
  limpiarFantasma();
  if (!familiaActiva) return;
  fantasma = crearComponente(familiaActiva, { fantasma: true, params: paramsActivos });
  fantasma.grupo.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    obj.material = Array.isArray(obj.material) ? obj.material.map((m) => m.clone()) : obj.material.clone();
  });
  fantasma.grupo.visible = false;
  escena.add(fantasma.grupo);
  actualizarVisibilidadPuertos(modoConexiones);
}
function actualizarVisibilidadPuertos(visible) {
  escena.traverse((obj) => {
    if (obj.userData?.puerto || obj.userData?.esPuerto) obj.visible = visible;
  });
}
function pintarFantasma() {
  if (!fantasma) return;
  const color = colision ? 0x8a3b3b : 0xffffff;
  fantasma.grupo.traverse((obj) => {
    if (!obj.isMesh || obj.userData?.puerto || obj.userData?.esPuerto || !obj.material) return;
    for (const material of (Array.isArray(obj.material) ? obj.material : [obj.material])) material.color?.setHex(color);
  });
}
function actualizarFantasma(evento) {
  if (!fantasma || !familiaActiva) return;
  actualizarRayo(evento);
  if (!rayo.ray.intersectPlane(plano, interseccion)) {
    posicionValida = false;
    fantasma.grupo.visible = false;
    return;
  }
  const dim = huella(fantasma);
  const base = new THREE.Vector3(ajustarAGrilla(interseccion.x), fantasma.dimensiones.alto / 2, ajustarAGrilla(interseccion.z));
  const posicion = ajustarAEquipos(grafo, base, dim);
  fantasma.grupo.position.copy(posicion);
  fantasma.grupo.visible = true;
  colision = solapa(grafo, fantasma, posicion);
  posicionValida = !colision;
  pintarFantasma();
}
function componenteDe(objeto) {
  let actual = objeto;
  while (actual && !actual.userData.componenteId) actual = actual.parent;
  return actual ? grafo.obtener(actual.userData.componenteId) : null;
}

function seleccionar(evento) {
  actualizarRayo(evento);
  const hits = rayo.intersectObjects(grafo.listar().map((c) => c.grupo), true);
  
  let hit = null;
  if (modoConexiones) {
    hit = hits.find((h) => h.object.userData?.puerto || h.object.userData?.esPuerto) || hits[0];
  } else {
    hit = hits[0];
  }
  
  const componente = hit ? componenteDe(hit.object) : null;
  seleccionado = componente;
  hud.mostrarPropiedades(componente);
  return { componente, objeto: hit?.object ?? null };
}

function cambiarModoConexiones(activo) {
  modoConexiones = activo;
  puertoPendiente = null;
  actualizarVisibilidadPuertos(activo);
  aviso(activo ? 'Modo conexiones activo: toca un equipo para autoconectar' : 'Modo conexiones desactivado');
}

function colocar() {
  if (!fantasma?.grupo.visible) { aviso('Mueve el puntero sobre el plano para elegir una posición', true); return; }
  if (!posicionValida) { aviso(`No se puede colocar: solapa con ${colision?.tag ?? 'otro equipo'}`, true); return; }
  
  const componente = crearComponente(familiaActiva, { params: paramsActivos });
  componente.grupo.position.copy(fantasma.grupo.position);
  componente.grupo.quaternion.copy(fantasma.grupo.quaternion);
  
  grafo.agregar(componente);
  escena.add(componente.grupo);
  actualizarVisibilidadPuertos(modoConexiones);
  
  seleccionado = componente;
  hud.mostrarPropiedades(componente);
  actualizarJSON();
  aviso(`${componente.nombre ?? componente.tipo} colocado`);
}

// Función de Auto-Conexión (corregida para solo conectar equipos cercanos)
function autoConectarDesdeEquipo(componente) {
  const puertosLibres = [];
  grafo.listar().forEach(c => {
    if (c.id === componente.id) return;
    c.puertos.forEach(p => {
      if (!p.conectadoA && p.tipo === 'proceso') {
        const posMundo = new THREE.Vector3().copy(p.posicion);
        c.grupo.localToWorld(posMundo);
        const dist = componente.grupo.position.distanceTo(posMundo);
        // Solo consideramos equipos a menos de 4 metros
        if (dist < 4) {
          puertosLibres.push({ componente: c, puerto: p, distancia: dist });
        }
      }
    });
  });

  puertosLibres.sort((a, b) => a.distancia - b.distancia);

  if (puertosLibres.length === 0) {
    aviso('No hay equipos cercanos con puertos libres (distancia max 4m).', true);
    return;
  }

  const mejor = puertosLibres[0];
  const miPuertoLibre = componente.puertos.find(p => !p.conectadoA && p.tipo === 'proceso');

  if (!miPuertoLibre) {
    aviso('Este equipo no tiene puertos libres.', true);
    return;
  }

  try {
    const conexion = grafo.conectar(componente.id, miPuertoLibre.id, mejor.componente.id, mejor.puerto.id);
    escena.add(conexion.malla);
    actualizarJSON();
    aviso(`Auto-conectado a ${mejor.componente.nombre} (a ${mejor.distancia.toFixed(1)}m)`);
  } catch (error) {
    aviso('No se pudo autoconectar: ' + error.message, true);
  }
}

async function exportarJSON() {
  const json = JSON.stringify(grafo.aJSON(), null, 2);
  actualizarJSON();
  try {
    await navigator.clipboard.writeText(json);
    aviso('JSON copiado al portapapeles');
  } catch (error) {
    console.log('JSON:', json);
    aviso('JSON impreso en consola', true);
  }
}

// Exponer funciones globales para el HUD
window.alternarBombeo = () => {
  const conexiones = grafo.listarConexiones();
  if (conexiones.length === 0) { hud.aviso('No hay tuberías', true); return false; }
  const nuevoEstado = !conexiones[0].activo;
  conexiones.forEach(c => c.activo = nuevoEstado);
  hud.aviso(nuevoEstado ? 'Bombeo ACTIVADO' : 'Bombeo DETENIDO');
  return nuevoEstado;
};

window.auditarMaqueta = async () => {
  hud.aviso('El supervisor IA está analizando la maqueta. Por favor espera...');
  const analisis = await analizarMaqueta(escena, grafo);
  panelDatos.textContent = "ANÁLISIS DEL SUPERVISOR IA:\n\n" + analisis;
  hud.aviso('Análisis completado. Revisa el panel.');
};

window.exportarJSON = exportarJSON;

hud = montarHud({
  catalogo,
  alColocar(familia, params) {
    familiaActiva = familia;
    paramsActivos = { ...params };
    crearFantasma();
    hud.abrirCajon(false);
    aviso('Vista previa activa: toca un espacio libre para colocar');
  },
  alExportar: exportarJSON,
  alCambiarModo: cambiarModoConexiones
});

renderer.domElement.addEventListener('pointermove', (e) => { if (familiaActiva) actualizarFantasma(e); });
renderer.domElement.addEventListener('pointerdown', (e) => { if (e.button === 0) inicioPuntero = { x: e.clientX, y: e.clientY, id: e.pointerId }; });

renderer.domElement.addEventListener('pointerup', (e) => {
  if (!inicioPuntero || inicioPuntero.id !== e.pointerId) return;
  const distancia = Math.hypot(e.clientX - inicioPuntero.x, e.clientY - inicioPuntero.y);
  inicioPuntero = null;
  if (distancia > 7) return;

  if (familiaActiva) actualizarFantasma(e);
  const resultado = seleccionar(e);
  
  if (modoConexiones && resultado.componente) { 
    autoConectarDesdeEquipo(resultado.componente);
    return;
  }
  
  if (!resultado.componente && familiaActiva) colocar();
});

window.addEventListener('keydown', (e) => {
  const controlEnfocado = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName);
  if (e.key === 'Escape') {
    if (familiaActiva) { familiaActiva = null; paramsActivos = {}; limpiarFantasma(); aviso('Cancelado'); }
    puertoPendiente = null;
    hud.abrirCajon(false);
    panelDatos.classList.remove('open');
  } else if (!controlEnfocado && e.key.toLowerCase() === 'r' && fantasma) {
    fantasma.grupo.rotation.y += Math.PI / 2;
    pintarFantasma();
  } else if (!controlEnfocado && e.key.toLowerCase() === 'd') {
    panelDatos.classList.toggle('open');
  }
});

function redimensionar() {
  camara.aspect = app.clientWidth / app.clientHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(app.clientWidth, app.clientHeight);
}
window.addEventListener('resize', redimensionar);

const relojAnimacion = new THREE.Clock();
function animar() { 
  requestAnimationFrame(animar); 
  const dt = relojAnimacion.getDelta();
  grafo.listarConexiones().forEach(c => c.animarFlujo(dt));
  controles.update(); 
  renderer.render(escena, camara); 
}

actualizarJSON();
animar();
