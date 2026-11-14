// src/workers/simulacion.worker.ts — Motor determinista 10 Hz con modo bombeo
export type EstadoEquipo = {
  uuid: string;
  tag: string;
  familia: string;
  params: Record<string, number>;
};

export type MensajeEntrada = {
  type: 'INICIAR' | 'ACTUALIZAR_GRAFO' | 'BOMBEAR';
  equipos?: EstadoEquipo[];
  activo?: boolean;
  dt?: number;
};

export type MensajeSalida = {
  type: 'ESTADO_ACTUALIZADO';
  equipos: EstadoEquipo[];
  timestamp: number;
};

let equiposState: EstadoEquipo[] = [];
let bombeoActivo = false;
const PASO = 0.1; // 10 Hz

function simularPaso(dt: number): EstadoEquipo[] {
  return equiposState.map(eq => {
    const nuevo = { ...eq, params: { ...eq.params } };

    if (eq.familia === 'bomba') {
      nuevo.params.encendida = bombeoActivo ? 1 : 0;
      nuevo.params.rpm = bombeoActivo ? 1450 : 0;
      nuevo.params.presion = bombeoActivo ? 3.5 : 0;
      nuevo.params.flujo = bombeoActivo ? 10 : 0;
    }

    if (eq.familia === 'valvula') {
      nuevo.params.flujo = bombeoActivo ? 10 : 0;
    }

    if (eq.familia === 'tuberia') {
      nuevo.params.flujo = bombeoActivo ? 10 : 0;
    }

    if (eq.familia === 'tanque') {
      const nivel = nuevo.params.nivel || 50;
      // Con bombeo, el tanque se llena lentamente hacia 85%; sin bombeo se estabiliza
      const destino = bombeoActivo ? 85 : 50;
      nuevo.params.nivel = parseFloat((nivel + (destino - nivel) * 0.02).toFixed(2));
      nuevo.params.presion = parseFloat((nuevo.params.nivel * 0.098).toFixed(3));
      nuevo.params.flujo = bombeoActivo ? 10 : 0;
    }

    if (eq.familia === 'intercambiador') {
      nuevo.params.flujo = bombeoActivo ? 10 : 0;
      nuevo.params.presion = bombeoActivo ? 2.1 : 0;
    }

    if (eq.familia === 'motor') {
      nuevo.params.rpm = bombeoActivo ? 1780 : 0;
    }

    if (eq.familia === 'gabinete') {
      nuevo.params.presion = bombeoActivo ? 480 : 0; // Voltaje simulado
    }

    return nuevo;
  });
}

self.onmessage = (e: MessageEvent<MensajeEntrada>) => {
  const { type, equipos, activo, dt = PASO } = e.data;

  if (type === 'ACTUALIZAR_GRAFO' && equipos) equiposState = equipos;
  if (type === 'BOMBEAR' && typeof activo === 'boolean') bombeoActivo = activo;

  const resultado = simularPaso(dt);
  self.postMessage({ type: 'ESTADO_ACTUALIZADO', equipos: resultado, timestamp: Date.now() } as MensajeSalida);
};