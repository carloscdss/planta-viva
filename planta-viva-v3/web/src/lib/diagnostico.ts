// src/lib/diagnostico.ts — El "Segundo Ojo": intercepta consola, red, errores y rendimiento
'use client';

export type EventoDiag = {
  ts: string;
  tipo: 'info' | 'warn' | 'error' | 'api';
  msg: string;
  detalle?: unknown;
};

const MAX_EVENTOS = 200;
const eventos: EventoDiag[] = [];
let fpsActual = 0;
let drawCalls = 0;
let triangulos = 0;
let iniciado = false;

function push(tipo: EventoDiag['tipo'], msg: string, detalle?: unknown) {
  eventos.push({ ts: new Date().toISOString(), tipo, msg, detalle });
  if (eventos.length > MAX_EVENTOS) eventos.shift();
}

export function instalarDiagnostico() {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;

  // 1. Errores globales
  window.addEventListener('error', (e) => push('error', e.message, { archivo: e.filename?.split('/').pop(), linea: e.lineno }));
  window.addEventListener('unhandledrejection', (e) => push('error', 'Promise no capturada', String((e as PromiseRejectionEvent).reason)));

  // 2. Interceptación de consola (sin silenciar el original)
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => { push('error', args.map(String).join(' ').slice(0, 300)); origError(...args); };
  console.warn = (...args: unknown[]) => { push('warn', args.map(String).join(' ').slice(0, 300)); origWarn(...args); };

  // 3. Parche de fetch → registro automático de TODAS las llamadas API
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const ruta = url.replace(window.location.origin, '');
    const metodo = init?.method ?? 'GET';
    const t0 = performance.now();
    try {
      const res = await origFetch(input, init);
      push('api', `${metodo} ${ruta} → ${res.status}`, { ms: Math.round(performance.now() - t0) });
      return res;
    } catch (err) {
      push('api', `${metodo} ${ruta} → FALLO DE RED`, { error: String(err) });
      throw err;
    }
  };

  push('info', 'Diagnóstico v2 instalado (consola + red + errores + FPS)');
}

export function registrarRendimiento(fps: number, info: { calls: number; triangles: number }) {
  fpsActual = fps;
  drawCalls = info.calls;
  triangulos = info.triangles;
}

export function registrarAccion(msg: string) {
  push('info', msg);
}

export function generarDiagnosticoCompleto(editor: Record<string, unknown>) {
  const perf = performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } };
  return {
    app: 'Planta Viva v3.0',
    timestamp: new Date().toISOString(),
    navegador: navigator.userAgent,
    gpu: (() => {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') ?? c.getContext('webgl');
        const d = gl?.getExtension('WEBGL_debug_renderer_info');
        return d ? String(gl!.getParameter(d.UNMASKED_RENDERER_WEBGL)) : 'n/a';
      } catch { return 'n/a'; }
    })(),
    pantalla: `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`,
    memoria: perf.memory
      ? { usadoMB: Math.round(perf.memory.usedJSHeapSize / 1048576), limiteMB: Math.round(perf.memory.jsHeapSizeLimit / 1048576) }
      : 'n/a (solo Chrome/Edge)',
    rendimiento: { fps: fpsActual, drawCalls, triangulos },
    editor,
    ultimosEventos: eventos.slice(-40), // Los últimos 40 eventos (API, errores, acciones)
  };
}