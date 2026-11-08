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
const planoColocacion = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const puntoPlano = new THREE.Vector3();

let fantasma = null;
let familiaActiva = null;
let paramsActivos = {};
let posicionValida = false;
let solapeActual = null;
let seleccionado = null;
let modoConexiones = false;
let puertoPendiente = null;
let inicioPuntero = null;

function aviso(texto, error = false) {
  hud.aviso(texto, error);
}

function actualizarPanelDatos() {
  panelDatos.textContent = JSON.stringify(grafo.aJSON(), null, 2);
}

function ponerNDC(evento) {
  const rect = renderer.domElement.getBoundingClientRect();
  puntero.set(
    ((evento.clientX - rect.left) / rect.width) * 2 - 1,
    -((evento.clientY - rect.top) / rect.height) * 2 + 1
  );
  rayo.setFromCamera(puntero, camara);
}

function liberarGrupo(grupo) {
  grupo.traverse((objeto) => {
    objeto.geometry?.dispose();
    if (Array.isArray(objeto.material)) objeto.material.forEach((material) => material.dispose());
    else objeto.material?.dispose();
  });
}

function limpiarFantasma() {
  if (!fantasma) return;
  escena.remove(fantasma.grupo);
  liberarGrupo(fantasma.grupo);
  fantasma = null;
  posicionValida = false;
  solapeActual = null;
}

function crearFantasma() {
  limpiarFantasma();
  if (!familiaActiva) return;
  fantasma = crearComponente(familiaActiva, { fantasma: true, params: paramsActivos });
  // El preview utiliza algunos materiales compartidos con los modelos reales. Clonarlos
  // permite cambiar su color y liberarlos al cancelar sin afectar a los demás equipos.
  fantasma.grupo.traverse((objeto) => {
    if (!objeto.isMesh) return;
    if (Array.isArray(objeto.material)) objeto.material = objeto.material.map((material) => material.clone());
    else if (objeto.material) objeto.material = objeto.material.clone();
  });
  fantasma.grupo.visible = false;
  escena.add(fantasma.grupo);
}

function hacerVisiblesLosPuertos(visible) {
  for (const componente of grafo.listar()) {
    componente.grupo.traverse((objeto) => {
      if (objeto.userData.esPuerto) objeto.visible = visible;
    });
  }
  fantasma?.grupo.traverse((objeto) => {
    if (objeto.userData.esPuerto) objeto.visible = visible;
  });
}

function actualizarFantasma(evento) {
  if (!fantasma || !familiaActiva) return;
  ponerNDC(evento);
  if (!rayo.ray.intersectPlane(planoColocacion, puntoPlano)) {
    posicionValida = false;
    fantasma.grupo.visible = false;
    return;
  }

  const dimensiones = huella(fantasma);
  const posicionRejilla = new THREE.Vector3(
    ajustarAGrilla(puntoPlano.x),
    fantasma.dimensiones.alto / 2,
    ajustarAGrilla(puntoPlano.z)
  );
  const posicionAjustada = ajustarAEquipos(grafo, posicionRejilla, dimensiones);
  fantasma.grupo.position.copy(posicionAjustada);
  fantasma.grupo.visible = true;

  solapeActual = solapa(grafo, fantasma, fantasma.grupo.position);
  posicionValida = !solapeActual;
  fantasma.grupo.traverse((objeto) => {
    if (objeto.isMesh && objeto.material?.transparent) {
      objeto.material.color.setHex(posicionValida ? 0x53d6a4 : 0xe05555);
    }
  });
}

function obtenerComponenteDesdeObjeto(objeto) {
  let actual = objeto;
  while (actual && !actual.userData.componenteId) actual = actual.parent;
  return actual ? grafo.obtener(actual.userData.componenteId) : null;
}

function seleccionarEn(evento) {
  ponerNDC(evento);
  const intersecciones = rayo.intersectObjects(grafo.listar().map((c) => c.grupo), true);
  const hit = intersecciones.find((interseccion) => obtenerComponenteDesdeObjeto(interseccion.object));
  const componente = hit ? obtenerComponenteDesdeObjeto(hit.object) : null;
  seleccionado = componente;
  hud.mostrarPropiedades(componente);
  return { componente, objeto: hit?.object ?? null };
}

function alternarModoConexiones(activo) {
  modoConexiones = activo;
  puertoPendiente = null;
  hacerVisiblesLosPuertos(activo);
  aviso(activo ? 'Modo conexiones: selecciona un puerto y luego otro compatible' : 'Modo conexiones desactivado');
}

function colocarComponente() {
  if (!fantasma || !fantasma.grupo.visible) {
    aviso('Mueve el puntero sobre el plano para elegir una posición', true);
    return;
  }
  if (!posicionValida) {
    aviso(`No se puede colocar: solapa con ${solapeActual?.tag ?? 'otro equipo'}`, true);
    return;
  }

  const componente = crearComponente(familiaActiva, { params: paramsActivos });
  componente.grupo.position.copy(fantasma.grupo.position);
  componente.grupo.quaternion.copy(fantasma.grupo.quaternion);
  grafo.agregar(componente);
  escena.add(componente.grupo);
  hacerVisiblesLosPuertos(modoConexiones);
  seleccionado = componente;
  hud.mostrarPropiedades(componente);
  actualizarPanelDatos();
  aviso(`${componente.tag} colocado`);
}

function procesarSeleccionDePuerto(componente, objeto) {
  const portId = objeto?.userData.portId;
  const puerto = componente?.puertos.find((p) => p.id === portId);
  if (!puerto) {
    aviso('Selecciona un puerto visible para iniciar la conexión', true);
    return;
  }
  if (puerto.conectadoA) {
    aviso('Ese puerto ya está conectado', true);
    return;
  }
  if (!puertoPendiente) {
    puertoPendiente = { componente, puerto };
    aviso(`Puerto ${puerto.tipo} de ${componente.tag} seleccionado`);
    return;
  }
  if (puertoPendiente.componente.id === componente.id) {
    puertoPendiente = { componente, puerto };
    aviso('Puerto inicial actualizado; selecciona otro equipo compatible');
    return;
  }
  if (puertoPendiente.puerto.tipo !== puerto.tipo) {
    aviso(`Puertos incompatibles: ${puertoPendiente.puerto.tipo} y ${puerto.tipo}`, true);
    return;
  }
  try {
    grafo.conectar(puertoPendiente.componente.id, puertoPendiente.puerto.id, componente.id, puerto.id);
    aviso(`Conexión ${puerto.tipo} creada`);
    puertoPendiente = null;
    actualizarPanelDatos();
  } catch (error) {
    aviso(error.message || 'No se pudo crear la conexión', true);
  }
}

function exportarJSON() {
  const json = JSON.stringify(grafo.aJSON(), null, 2);
  actualizarPanelDatos();
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = 'planta-viva.json';
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  aviso(`JSON exportado (${grafo.listar().length} componentes)`);
}

const hud = montarHud({
  catalogo,
  alColocar(familia, params) {
    familiaActiva = familia;
    paramsActivos = { ...params };
    crearFantasma();
    hud.abrirCajon(false);
    aviso('Vista previa activa: toca un espacio libre para colocar');
  },
  alExportar: exportarJSON,
  alCambiarModo: alternarModoConexiones
});

renderer.domElement.addEventListener('pointermove', (evento) => {
  if (familiaActiva) actualizarFantasma(evento);
});
renderer.domElement.addEventListener('pointerdown', (evento) => {
  if (evento.button !== 0) return;
  inicioPuntero = { x: evento.clientX, y: evento.clientY, id: evento.pointerId };
});
renderer.domElement.addEventListener('pointerup', (evento) => {
  if (!inicioPuntero || inicioPuntero.id !== evento.pointerId) return;
  const movimiento = Math.hypot(evento.clientX - inicioPuntero.x, evento.clientY - inicioPuntero.y);
  inicioPuntero = null;
  if (movimiento > 7) return; // Un drag pertenece a OrbitControls, no al editor.

  if (familiaActiva) actualizarFantasma(evento);
  const seleccion = seleccionarEn(evento);
  if (modoConexiones) {
    if (seleccion.componente) procesarSeleccionDePuerto(seleccion.componente, seleccion.objeto);
    return;
  }
  if (seleccion.componente) return;
  if (familiaActiva) colocarComponente();
});
renderer.domElement.addEventListener('pointercancel', () => { inicioPuntero = null; });
renderer.domElement.addEventListener('pointerleave', () => {
  if (fantasma && !inicioPuntero) fantasma.grupo.visible = false;
});

window.addEventListener('keydown', (evento) => {
  const focoEnControl = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName);
  if (evento.key === 'Escape') {
    if (familiaActiva) {
      familiaActiva = null;
      paramsActivos = {};
      limpiarFantasma();
      aviso('Colocación cancelada');
    }
    if (modoConexiones) puertoPendiente = null;
    hud.abrirCajon(false);
    panelDatos.classList.remove('open');
    seleccionado = null;
    hud.mostrarPropiedades(null);
  } else if (!focoEnControl && evento.key.toLowerCase() === 'r' && fantasma) {
    fantasma.grupo.rotation.y += Math.PI / 2;
  } else if (!focoEnControl && evento.key.toLowerCase() === 'd') {
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
  renderer.render(escena, camara);
}

actualizarPanelDatos();
animar();
