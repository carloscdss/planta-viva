// src/nucleo/registro.js
const ctx = { escena: null, renderer: null, camara: null, grafo: null, listo: false };

export function registrar(k, v) { 
  ctx[k] = v; 
  if (ctx.escena && ctx.renderer && ctx.camara) ctx.listo = true; 
}

export function contexto() { return ctx; }
export function estaListo() { return ctx.listo; }
