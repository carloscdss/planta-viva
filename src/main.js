import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from './config.js';
import { configurarIluminacion } from './nucleo/iluminacion.js';
import { crearRejilla } from './edicion/rejilla.js';
import { crearGabinete } from './catalogo/gabinete.js';
import { Grafo } from './modelo/grafo.js';

const app = document.querySelector('#app');
const panelDatos = document.querySelector('#data-panel');
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

const grafo = new Grafo();
let fantasma = crearGabinete({ fantasma: true });
scene.add(fantasma.grupo);
let posicionValida = false;
const raycaster = new THREE.Raycaster();
const puntero = new THREE.Vector2();
const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const puntoInterseccion = new THREE.Vector3();

function actualizarPanel() {
  panelDatos.textContent = JSON.stringify(grafo.aJSON(), null, 2);
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
  fantasma.grupo.position.x = Math.round(puntoInterseccion.x * 2) / 2;
  fantasma.grupo.position.z = Math.round(puntoInterseccion.z * 2) / 2;
  posicionValida = true;
}

function colocarGabinete() {
  if (!posicionValida) return;
  const componente = crearGabinete();
  componente.grupo.position.x = fantasma.grupo.position.x;
  componente.grupo.position.z = fantasma.grupo.position.z;
  scene.add(componente.grupo);
  grafo.agregar(componente);
  actualizarPanel();
}

renderer.domElement.addEventListener('pointermove', actualizarFantasma);
let inicioPuntero = null;
renderer.domElement.addEventListener('pointerdown', (event) => { inicioPuntero = { x: event.clientX, y: event.clientY }; });
renderer.domElement.addEventListener('pointerup', (event) => {
  if (!inicioPuntero) return;
  const movimiento = Math.hypot(event.clientX - inicioPuntero.x, event.clientY - inicioPuntero.y);
  if (movimiento < 7) {
    actualizarFantasma(event);
    colocarGabinete();
  }
  inicioPuntero = null;
});
renderer.domElement.addEventListener('pointerleave', () => { fantasma.grupo.visible = false; posicionValida = false; });
document.querySelector('#add-cabinet').addEventListener('click', colocarGabinete);
document.querySelector('#toggle-data').addEventListener('click', () => panelDatos.classList.toggle('open'));
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'd' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) panelDatos.classList.toggle('open');
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
animar();
