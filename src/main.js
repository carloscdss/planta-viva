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
const reloj = new THREE.Clock();
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

function mostrarPropiedades(componente) {
  hud.mostrarPropiedades(componente);
  if (!componente || !['bomba', 'valvula'].includes(componente.familia)) return;

  const panel = document.getElementById('propiedades');
  if (!panel) return;
  const boton = document.createElement('button');
  boton.className = 'colocar';
  boton.type = 'button';
  boton.textContent = componente.familia === 'bomba'
    ? (componente.params.encendida ? 'Detener bomba' : 'Encender bomba')
    : (componente.params.abierta ? 'Cerrar válvula' : 'Abrir válvula');
  boton.addEventListener('click', () => {
    if (componente.familia === 'bomba') componente.params.encendida = !componente.params.encendida;
    else componente.params.abierta = !componente.params.abierta;
    actualizarFlujos();
    actualizarJSON();
    mostrarPropiedades(componente);
    aviso(componente.familia === 'bomba'
      ? (componente.params.encendida ? 'Bomba encendida' : 'Bomba detenida')
      : (componente.params.abierta ? 'Válvula abierta' : 'Válvula cerrada'));
  });
  panel.append(boton);
}

function actualizarFlujos() {
  const conexiones = grafo.listarConexiones();
  const conexionPorPuerto = new Map();
  for (const conexion of conexiones) {
    conexion.activo = false;
    conexion.sentidoFlujo = 1;
    conexionPorPuerto.set(`${conexion.componenteA.id}:${conexion.puertoA.id}`, conexion);
    conexionPorPuerto.set(`${conexion.componenteB.id}:${conexion.puertoB.id}`, conexion);
  }

  const cola = [];
  for (const componente of grafo.listar()) {
    if (componente.familia !== 'bomba' || !componente.params.encendida) continue;
    const descarga = componente.puertos.find((puerto) => puerto.id === 'descarga');
    if (descarga) cola.push({ componente, entrada: null, salidaInicial: descarga });
  }

  const visitados = new Set();
  while (cola.length) {
    const { componente, entrada, salidaInicial } = cola.shift();
    const claveEstado = `${componente.id}:${entrada?.id ?? `origen-${salidaInicial?.id ?? ''}`}`;
    if (visitados.has(claveEstado)) continue;
    visitados.add(claveEstado);

    let salidas = [];
    if (salidaInicial) {
      salidas = [salidaInicial];
    } else if (componente.familia === 'bomba') {
      if (componente.params.encendida && entrada?.id === 'succion') {
        const descarga = componente.puertos.find((puerto) => puerto.id === 'descarga');
        if (descarga) salidas = [descarga];
      }
    } else if (componente.familia === 'valvula') {
      if (componente.params.abierta) salidas = componente.puertos.filter((puerto) => puerto.tipo === 'proceso' && puerto !== entrada);
    } else if (componente.familia === 'intercambiador') {
      const pareja = {
        'proceso-entrada': 'proceso-salida',
        'proceso-salida': 'proceso-entrada',
        'servicio-entrada': 'servicio-salida',
        'servicio-salida': 'servicio-entrada'
      }[entrada?.id];
      const puertoPareja = pareja && componente.puertos.find((puerto) => puerto.id === pareja);
      if (puertoPareja) salidas = [puertoPareja];
    } else {
      salidas = componente.puertos.filter((puerto) => puerto.tipo === 'proceso' && puerto !== entrada);
    }

    for (const salida of salidas) {
      const conexion = conexionPorPuerto.get(`${componente.id}:${salida.id}`);
      if (!conexion) continue;
      const saleDesdeA = conexion.componenteA === componente && conexion.puertoA === salida;
      conexion.activo = true;
      conexion.sentidoFlujo = saleDesdeA ? 1 : -1;

      const siguienteComponente = saleDesdeA ? conexion.componenteB : conexion.componenteA;
      const siguientePuerto = saleDesdeA ? conexion.puertoB : conexion.puertoA;
      if (siguientePuerto.tipo === 'proceso') {
        cola.push({ componente: siguienteComponente, entrada: siguientePuerto });
      }
    }
  }
}

function seleccionar(evento) {
  actualizarRayo(evento);
  const hits = rayo.intersectObjects(grafo.listar().map((c) => c.grupo), true);
  
  let hit = null;
  if (modoConexiones) {
    // En modo conexiones, priorizar los puertos
    hit = hits.find((h) => h.object.userData?.puerto || h.object.userData?.esPuerto) || hits[0];
  } else {
    hit = hits[0];
  }
  
  const componente = hit ? componenteDe(hit.object) : null;
  seleccionado = componente;
  mostrarPropiedades(componente);
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
  mostrarPropiedades(componente);
  actualizarJSON();
  actualizarFlujos();
  aviso(`${componente.nombre ?? componente.tipo} colocado`);
}

function conectarPuerto(componente, objeto) {
  const puerto = componente?.puertos.find((p) => p.id === objeto?.userData.portId);
  if (!puerto) { aviso('Selecciona un puerto visible', true); return; }
  if (puerto.conectadoA) { aviso('Ese puerto ya está conectado', true); return; }
  if (!puertoPendiente) { 
    puertoPendiente = { componente, puerto }; 
    aviso(`Puerto ${puerto.tipo} seleccionado, elige el segundo puerto`); 
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
    // Crear la conexión lógica y visual
    const conexion = grafo.conectar(puertoPendiente.componente.id, puertoPendiente.puerto.id, componente.id, puerto.id);
    
    // Añadir el tubo a la escena 3D
    escena.add(conexion.malla);
    
    puertoPendiente = null;
    actualizarFlujos();
    actualizarJSON();
    aviso(`Conexión creada`);
  } catch (error) { 
    aviso(error.message || 'No se pudo crear la conexión', true); 
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
  if (distancia > 7) return; // Fue un arrastre, no un clic

  if (familiaActiva) actualizarFantasma(e);
  
  const resultado = seleccionar(e);
  
  if (modoConexiones) { 
    if (resultado.componente) conectarPuerto(resultado.componente, resultado.objeto); 
    return; 
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
    mostrarPropiedades(null);
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

function animar() { 
  requestAnimationFrame(animar); 
  controles.update();
  const dt = reloj.getDelta();
  for (const conexion of grafo.listarConexiones()) conexion.animarFlujo(dt);
  renderer.render(escena, camara); 
}

actualizarJSON();
animar();
