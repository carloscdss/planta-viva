import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from './config.js';
import { configurarIluminacion } from './nucleo/iluminacion.js';
import { crearRejilla } from './edicion/rejilla.js';
import { catalogo, crearComponente } from './catalogo/catalogo.js';
import { Grafo } from './modelo/grafo.js';
import { ajustarAGrilla, ajustarAEquipos, huella, solapa } from './edicion/colocacion.js';
import { montarHud } from './ui/hud.js';

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
  aviso(activo ? 'Modo conexiones activo: selecciona puertos compatibles' : 'Modo conexiones desactivado');
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

// Lógica de Conexión Manual Mejorada
function conectarPuerto(componente, objeto) {
  const puerto = componente?.puertos.find((p) => p.id === objeto?.userData.portId);
  if (!puerto) { aviso('Selecciona un puerto visible', true); return; }
  if (puerto.conectadoA) { aviso('Ese puerto ya está conectado', true); return; }
  
  // Si es el primer clic, guardamos el puerto pendiente
  if (!puertoPendiente) { 
    puertoPendiente = { componente, puerto }; 
    aviso(`Puerto ${puerto.tipo} seleccionado, elige el segundo puerto`); 
    
    // Resaltar puertos compatibles cercanos (opcional visual)
    escena.traverse((obj) => {
      if (obj.userData?.esPuerto && obj !== objeto) {
        // Si es del mismo tipo, brillar
      }
    });
    return; 
  }
  
  if (puertoPendiente.componente.id === componente.id) { 
    puertoPendiente = { componente, puerto }; 
    aviso('Selecciona un puerto de otro equipo', true); 
    return; 
  }
  if (puertoPendiente.puerto.tipo !== puerto.tipo) { 
    aviso('Los puertos no son compatibles (ej. agua con electricidad)', true); 
    return; 
  }
  
  try {
    const conexion = grafo.conectar(puertoPendiente.componente.id, puertoPendiente.puerto.id, componente.id, puerto.id);
    escena.add(conexion.malla);
    puertoPendiente = null;
    actualizarJSON();
    aviso(`Conexión creada`);
  } catch (error) { 
    aviso(error.message || 'No se pudo crear la conexión', true); 
  }
}

// Nueva Lógica: Auto-Conectar al hacer clic en el piso o equipo cercano
function autoConectarDesdeEquipo(componente) {
  // Buscar el puerto libre más cercano
  const puertosLibres = [];
  grafo.listar().forEach(c => {
    if (c.id === componente.id) return; // No conectar consigo mismo
    c.puertos.forEach(p => {
      if (!p.conectadoA && p.tipo === 'proceso') {
        // Calcular distancia global
        const posMundo = new THREE.Vector3().copy(p.posicion);
        c.grupo.localToWorld(posMundo);
        const dist = componente.grupo.position.distanceTo(posMundo);
        puertosLibres.push({ componente: c, puerto: p, distancia: dist });
      }
    });
  });

  // Ordenar por cercanía
  puertosLibres.sort((a, b) => a.distancia - b.distancia);

  if (puertosLibres.length === 0) {
    aviso('No hay otros equipos con puertos libres.', true);
    return;
  }

  // Tomar el más cercano
  const mejor = puertosLibres[0];
  
  try {
    const conexion = grafo.conectar(componente.id, componente.puertos.find(p=>!p.conectadoA && p.tipo==='proceso').id, mejor.componente.id, mejor.puerto.id);
    escena.add(conexion.malla);
    actualizarJSON();
    aviso(`Auto-conectado a ${mejor.componente.nombre}`);
  } catch (error) {
    aviso('No se pudo autoconectar', true);
  }
}

async function exportarJSON() {
  const json = JSON.stringify(grafo.aJSON(), null, 2);
  console.log('Planta Viva — grafo JSON:', json);
  actualizarJSON();
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API no disponible');
    await navigator.clipboard.writeText(json);
    aviso('JSON del grafo copiado al portapapeles');
  } catch (error) {
    aviso('JSON impreso en consola; el navegador no permitió copiarlo', true);
  }
}

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

renderer.domElement.addEventListener('pointermove', (e) => { 
  if (familiaActiva) actualizarFantasma(e); 
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button === 0) inicioPuntero = { x: e.clientX, y: e.clientY, id: e.pointerId };
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (!inicioPuntero || inicioPuntero.id !== e.pointerId) return;
  const distancia = Math.hypot(e.clientX - inicioPuntero.x, e.clientY - inicioPuntero.y);
  inicioPuntero = null;
  if (distancia > 7) return;

  if (familiaActiva) actualizarFantasma(e);
  
  const resultado = seleccionar(e);
  
  // Si estamos en modo conexiones
  if (modoConexiones) { 
    // Si tocamos un puerto específico
    if (resultado.componente && resultado.objeto?.userData?.esPuerto) { 
      conectarPuerto(resultado.componente, resultado.objeto); 
      return;
    }
    // Si tocamos el cuerpo de un equipo, autoconectar al puerto más cercano
    if (resultado.componente) {
      autoConectarDesdeEquipo(resultado.componente);
      return;
    }
  }
  
  if (!resultado.componente && familiaActiva) colocar();
});

renderer.domElement.addEventListener('pointercancel', () => { inicioPuntero = null; });
renderer.domElement.addEventListener('pointerleave', () => { if (fantasma && !inicioPuntero) fantasma.grupo.visible = false; });

window.addEventListener('keydown', (e) => {
  const controlEnfocado = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName);
  if (e.key === 'Escape') {
    if (familiaActiva) { familiaActiva = null; paramsActivos = {}; limpiarFantasma(); aviso('Colocación cancelada'); }
    puertoPendiente = null;
    hud.abrirCajon(false);
    panelDatos.classList.remove('open');
    seleccionado = null;
    hud.mostrarPropiedades(null);
  } else if (!controlEnfocado && e.key.toLowerCase() === 'r' && fantasma) {
    fantasma.grupo.rotation.y += Math.PI / 2;
    pintarFantasma();
  } else if (!controlEnfocado && e.key.toLowerCase() === 'd') {
    panelDatos.classList.toggle('open');
  }
});

function redimensionar() {
  const ancho = app.clientWidth;
  const alto = app.clientHeight;
  camara.aspect = ancho / alto;
  camara.updateProjectionMatrix();
  renderer.setSize(ancho, alto);
}
window.addEventListener('resize', redimensionar);

// --- LÓGICA DE FLUJO (FASE 3) ---
window.alternarBombeo = () => {
  const conexiones = grafo.listarConexiones();
  if (conexiones.length === 0) {
    hud.aviso('No hay tuberías conectadas para bombear', true);
    return false;
  }
  const nuevoEstado = !conexiones[0].activo;
  conexiones.forEach(c => c.activo = nuevoEstado);
  hud.aviso(nuevoEstado ? 'Bombeo ACTIVADO: El agua está fluyendo' : 'Bombeo DETENIDO');
  return nuevoEstado;
};

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
