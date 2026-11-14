// src/workers/simulacion.worker.ts
// Motor determinista de simulación (10 Hz)
// No tiene acceso al DOM ni a Three.js. Solo matemáticas puras.

export type EstadoEquipo = {
  uuid: string;
  tag: string;
  familia: string;
  params: Record<string, number>; // T, P, Nivel, Flujo, RPM
};

export type MensajeEntrada = {
  type: 'INICIAR' | 'ACTUALIZAR_GRAFO';
  equipos: EstadoEquipo[];
  dt?: number; // Delta time en segundos
};

export type MensajeSalida = {
  type: 'ESTADO_ACTUALIZADO';
  equipos: EstadoEquipo[];
  timestamp: number;
};

let equiposState: EstadoEquipo[] = [];
const PASO_SIMULACION = 0.1; // 10 Hz

function simularPaso(dt: number): EstadoEquipo[] {
  return equiposState.map(eq => {
    const nuevo = { ...eq, params: { ...eq.params } };
    
    // Lógica simple de proceso (determinista)
    if (eq.familia === 'tanque') {
      // Simula llenado/vaciado basado en flujo entrante/saliente
      const flujoIn = nuevo.params.flujoIn || 0;
      const flujoOut = nuevo.params.flujoOut || 0;
      const capacidad = 1000; // Litros base
      let nivel = nuevo.params.nivel || 50;
      
      // Balance de masa simplificado
      const deltaVolumen = (flujoIn - flujoOut) * dt;
      nivel = Math.max(0, Math.min(100, nivel + (deltaVolumen / capacidad) * 100));
      nuevo.params.nivel = parseFloat(nivel.toFixed(2));
      
      // Presión hidrostática aproximada
      nuevo.params.presion = parseFloat((nivel * 0.098).toFixed(3));
    }
    
    if (eq.familia === 'bomba') {
      // Simula RPM y presión de descarga
      const encendida = nuevo.params.encendida ?? true;
      if (encendida) {
        nuevo.params.rpm = 1450;
        nuevo.params.presionDescarga = 3.5;
      } else {
        nuevo.params.rpm = 0;
        nuevo.params.presionDescarga = 0;
      }
    }
    
    if (eq.familia === 'valvula') {
      // Simula apertura/cierre
      const abierta = nuevo.params.abierta ?? true;
      nuevo.params.flujo = abierta ? 10 : 0;
    }

    return nuevo;
  });
}

self.onmessage = (e: MessageEvent<MensajeEntrada>) => {
  const { type, equipos, dt = PASO_SIMULACION } = e.data;
  
  if (type === 'ACTUALIZAR_GRAFO' && equipos) {
    equiposState = equipos;
  }
  
  if (type === 'INICIAR' || type === 'ACTUALIZAR_GRAFO') {
    const resultado = simularPaso(dt);
    self.postMessage({
      type: 'ESTADO_ACTUALIZADO',
      equipos: resultado,
      timestamp: Date.now()
    } as MensajeSalida);
  }
};