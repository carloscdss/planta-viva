import * as THREE from 'three';
import { CONFIG } from '../config.js';

export function huella(componente) {
  const d = componente.dimensiones ?? componente.descriptor?.dimensiones ?? {};
  let w = Number(d.ancho ?? 0.6);
  let depth = Number(d.profundidad ?? d.fondo ?? d.diametro ?? 0.6);
  const yaw = componente.grupo?.rotation?.y ?? componente.rotacionY ?? 0;
  if (Math.abs(Math.sin(yaw)) > 0.5) [w, depth] = [depth, w];
  return { w, d: depth };
}

function caja(centro, dim) { return { minX:centro.x-dim.w/2,maxX:centro.x+dim.w/2,minZ:centro.z-dim.d/2,maxZ:centro.z+dim.d/2 }; }

export function solapa(grafo, candidato, posicion, idExcluido = null) {
  const nuevo = caja(posicion, huella(candidato));
  const margen = CONFIG.edicion.margenSolape;
  for (const otro of grafo.listar()) {
    if (otro.id === idExcluido) continue;
    const b = caja(otro.grupo.position, huella(otro));
    if (nuevo.minX < b.maxX + margen && nuevo.maxX > b.minX - margen && nuevo.minZ < b.maxZ + margen && nuevo.maxZ > b.minZ - margen) return otro;
  }
  return null;
}

export function ajustarAEquipos(grafo, posicion, dim) {
  const radio=CONFIG.edicion.radioSnap, p=posicion.clone();
  let bx=null,bz=null,dx=radio,dz=radio;
  for (const c of grafo.listar()) {
    const o=caja(c.grupo.position,huella(c));
    for(const x of [o.minX-dim.w/2,o.maxX+dim.w/2]) { const d=Math.abs(p.x-x); if(d<dx&&p.z>=o.minZ-dim.d/2&&p.z<=o.maxZ+dim.d/2){dx=d;bx=x;} }
    for(const z of [o.minZ-dim.d/2,o.maxZ+dim.d/2]) { const d=Math.abs(p.z-z); if(d<dz&&p.x>=o.minX-dim.w/2&&p.x<=o.maxX+dim.w/2){dz=d;bz=z;} }
  }
  if(bx!==null)p.x=bx; if(bz!==null)p.z=bz; return p;
}

export function ajustarAGrilla(valor) { const paso=CONFIG.edicion.pasoRejilla; return Math.round(valor/paso)*paso; }
