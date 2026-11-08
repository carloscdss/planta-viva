import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from './config.js';
import { configurarIluminacion } from './nucleo/iluminacion.js';
import { crearRejilla } from './edicion/rejilla.js';
import { catalogo, crearComponente } from './catalogo/catalogo.js';
import { Grafo } from './modelo/grafo.js';

const app = document.querySelector('#app');
const panelDatos = document.querySelector('#data-panel');
const selector = document.querySelector('#component-type');
const estado = document.querySelector('#status');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
app.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.background);
const camera = new THREE.PerspectiveCamera(CONFIG.cameraFov, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(...CONFIG.cameraPosition);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.8, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 3;
controls.maxDistance = 35;
configurarIluminacion(scene);
crearRejilla(scene);

for (const item of catalogo) {
  const option = document.createElement('option');
  option.value = item.id;
  option.textContent = item.nombre;
  selector.append(option);
}

const grafo = new Grafo();
let fantasma = crearComponente(selector.value, { fantasma: true });
scene.add(fantasma.grupo);
let posicionValida = false;
let acoplamientoActivo = null;
const raycaster = new THREE.Raycaster();
const puntero = new THREE.Vector2();
const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const puntoInterseccion = new THREE.Vector3();

function actualizarPanel() {
  panelDatos.textContent = JSON.stringify(grafo.aJSON(), null, 2);
}

function actualizarEstado() {
  estado.textContent = acoplamientoActivo
    ? `Acople: ${acoplamientoActivo.portA.tipo} · listo para conectar`
    : `Vista previa: ${fantasma.descriptor.nombre} · toca el plano para colocar`;
}

function reemplazarFantasma() {
  scene.remove(fantasma.grupo);
  fantasma.grupo.traverse((obj) => { if (obj.geometry) obj.geometry.dispose(); });
  fantasma = crearComponente(selector.value, { fantasma: true });
  scene.add(fantasma.grupo);
  acoplamientoActivo = null;
  actualizarEstado();
}

function buscarAcoplamiento() {
  scene.updateMatrixWorld(true);
  let mejor = null;
  let menorDistancia = CONFIG.snapDistance;
  for (const componente of grafo.listar()) {
    for (const portA of componente.puertos) {
      if (portA.conectadoA) continue;
      const posicionA = componente.grupo.localToWorld(portA.posicion.clone());
      const direccionA = portA.direccion.clone().transformDirection(componente.grupo.matrixWorld);
      for (const portB of fantasma.puertos) {
        if (portA.tipo !== portB.tipo) continue;
        const posicionB = fantasma.grupo.localToWorld(portB.posicion.clone());
        const distancia = posicionA.distanceTo(posicionB);
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          mejor = { componenteA: componente, portA, portB, posicionA, direccionA };
        }
      }
    }
  }

  if (!mejor) {
    acoplamientoActivo = null;
    return;
  }

  const orientacionObjetivo = mejor.direccionA.clone().negate();
  fantasma.grupo.quaternion.setFromUnitVectors(mejor.portB.direccion.clone().normalize(), orientacionObjetivo);
  const offsetPuerto = mejor.portB.posicion.clone().applyQuaternion(fantasma.grupo.quaternion);
  fantasma.grupo.position.copy(mejor.posicionA).sub(offsetPuerto);
  acoplamientoActivo = { componenteA: mejor.componenteA, portA: mejor.portA, portB: mejor.portB };
}

function actualizarFantasma(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  puntero.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  puntero.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(puntero, camera);
  if (!raycaster.ray.intersectPlane(plano, puntoInterseccion)) {
    posicionValida = false;
    fantasma.grupo.visible = false;
    return;
  }
  fantasma.grupo.visible = true;
  fantasma.grupo.quaternion.identity();
  fantasma.grupo.position.set(Math.round(puntoInterseccion.x * 2) / 2, fantasma.dimensiones.alto / 2, Math.round(puntoInterseccion.z * 2) / 2);
  buscarAcoplamiento();
  posicionValida = true;
  actualizarEstado();
}

function colocarComponente() {
  if (!posicionValida) return;
  const componente = crearComponente(selector.value);
  componente.grupo.position.copy(fantasma.grupo.position);
  componente.grupo.quaternion.copy(fantasma.grupo.quaternion);
  grafo.agregar(componente);
  scene.add(componente.grupo);
  if (acoplamientoActivo) {
    try {
      grafo.conectar(acoplamientoActivo.componenteA.id, acoplamientoActivo.portA.id, componente.id, acoplamientoActivo.portB.id);
    } catch (error) {
      console.warn('No se pudo completar el acople:', error);
    }
  }
  actualizarPanel();
  actualizarEstado();
}

renderer.domElement.addEventListener('pointermove', actualizarFantasma);
let inicioPuntero = null;
renderer.domElement.addEventListener('pointerdown', (event) => { inicioPuntero = { x: event.clientX, y: event.clientY }; });
renderer.domElement.addEventListener('pointerup', (event) => {
  if (!inicioPuntero) return;
  const movimiento = Math.hypot(event.clientX - inicioPuntero.x, event.clientY - inicioPuntero.y);
  if (movimiento < 7) {
    actualizarFantasma(event);
    colocarComponente();
  }
  inicioPuntero = null;
});
renderer.domElement.addEventListener('pointerleave', () => { fantasma.grupo.visible = false; posicionValida = false; });
selector.addEventListener('change', reemplazarFantasma);
document.querySelector('#add-component').addEventListener('click', colocarComponente);
document.querySelector('#toggle-data').addEventListener('click', () => panelDatos.classList.toggle('open'));
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'd' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) panelDatos.classList.toggle('open');
  if (event.key === 'Escape') panelDatos.classList.remove('open');
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animar() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animar);
}
actualizarPanel();
actualizarEstado();
animar();
