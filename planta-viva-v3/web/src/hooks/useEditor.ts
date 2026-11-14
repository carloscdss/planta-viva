// src/hooks/useEditor.ts — Cerebro del editor: estados, historial, worker, conexiones persistentes
'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATALOGO, type Descriptor } from '@/lib/catalogo';
import { ajustarAEquipos, huella, normalizarEquipo, siguienteTag, snap, solapa, type Equipo } from '@/lib/colocacion';
import { resolverConexion, type ConexionPersistida, type ConexionRuntime } from '@/lib/conexion';
import SimulacionWorker from '@/workers/simulacion.worker.ts?worker';
import type { EstadoEquipo, MensajeSalida } from '@/workers/simulacion.worker';

export function useEditor() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [activa, setActiva] = useState<Descriptor | null>(null);
  const [rotY, setRotY] = useState(0);
  const [puntero, setPuntero] = useState<[number, number] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  // Conexiones: persistidas (BD) + resueltas (runtime)
  const [modoConexion, setModoConexion] = useState(false);
  const [puertoSeleccionado, setPuertoSeleccionado] = useState<{ equipoUuid: string; puertoId: string } | null>(null);
  const [conexiones, setConexiones] = useState<ConexionPersistida[]>([]);

  const [hoverEquipo, setHoverEquipo] = useState<string | null>(null);
  const [estadosSimulacion, setEstadosSimulacion] = useState<Record<string, EstadoEquipo>>({});

  const down = useRef<{ x: number; y: number } | null>(null);
  const historialRef = useRef<{ equipos: Equipo[]; conexiones: ConexionPersistida[] }[]>([]);
  const indiceRef = useRef(-1);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 3500); return () => clearTimeout(t); }, [aviso]);

  // Historial local tipo Word (snapshot de equipos + conexiones)
  const registrarHistorial = useCallback((nuevosEquipos: Equipo[], nuevasConexiones: ConexionPersistida[]) => {
    historialRef.current = historialRef.current.slice(0, indiceRef.current + 1);
    historialRef.current.push({ equipos: nuevosEquipos, conexiones: nuevasConexiones });
    indiceRef.current++;
  }, []);

  const cargarGrafo = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const res = await fetch('/api/grafo');
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();
      const nuevos = (data.grafo?.equipos ?? []).map(normalizarEquipo);
      const nuevasConexiones = data.grafo?.conexiones ?? [];
      setEquipos(nuevos);
      setConexiones(nuevasConexiones);
      historialRef.current = [{ equipos: nuevos, conexiones: nuevasConexiones }];
      indiceRef.current = 0;
    } catch (err: any) { setAviso({ texto: err.message, tipo: 'error' }); }
    finally { if (!silencioso) setCargando(false); }
  }, []);

  useEffect(() => { cargarGrafo(); }, [cargarGrafo]);

  // Worker de simulación
  useEffect(() => {
    workerRef.current = new Worker(new URL('@/workers/simulacion.worker.ts', import.meta.url));
    workerRef.current.onmessage = (e: MessageEvent<MensajeSalida>) => {
      if (e.data.type === 'ESTADO_ACTUALIZADO') {
        const mapa: Record<string, EstadoEquipo> = {};
        e.data.equipos.forEach(eq => { mapa[eq.uuid] = eq; });
        setEstadosSimulacion(mapa);
      }
    };
    return () => { workerRef.current?.terminate(); };
  }, []);

  useEffect(() => {
    if (workerRef.current && equipos.length > 0) {
      workerRef.current.postMessage({
        type: 'ACTUALIZAR_GRAFO',
        equipos: equipos.map(eq => ({
          uuid: eq.uuid, tag: eq.tag, familia: eq.familia,
          params: { nivel: 50, presion: 0, flujo: 0, rpm: 0, encendida: true, abierta: true },
        })),
      });
    }
  }, [equipos]);

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActiva(null); setRotY(0); setSeleccionado(null); setPuertoSeleccionado(null); }
      if (e.key.toLowerCase() === 'r' && activa) setRotY((r) => r + Math.PI / 2);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); manejarUndoLocal(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); manejarRedoLocal(); }
      if (e.key === 'Delete' && seleccionado) eliminarEquipo(seleccionado);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activa, seleccionado]);

  const onMove = useCallback((x: number, z: number) => setPuntero([x, z]), []);

  const candidata = useMemo(() => {
    if (!activa || !puntero) return null;
    const dim = huella({ dimensiones: activa.dimensiones, rotacionY: rotY });
    const s = ajustarAEquipos(equipos, snap(puntero[0]), snap(puntero[1]), dim);
    const valido = !solapa(equipos, { dimensiones: activa.dimensiones, rotacionY: rotY }, s.x, s.z);
    return { x: s.x, z: s.z, valido };
  }, [activa, puntero, equipos, rotY]);

  const colocar = useCallback(async () => {
    if (!activa || !candidata) return;
    if (!candidata.valido) { setAviso({ texto: '⚠️ Interferencia detectada.', tipo: 'error' }); return; }
    const nuevo: Equipo = {
      uuid: crypto.randomUUID(), tag: siguienteTag(activa.tag, equipos), familia: activa.familia,
      descriptorId: activa.descriptorId, color: activa.color, dimensiones: { ...activa.dimensiones },
      posicion: [candidata.x, activa.dimensiones.alto / 2, candidata.z], rotacionY: rotY,
    };
    const nuevosEquipos = [...equipos, nuevo];
    registrarHistorial(nuevosEquipos, conexiones);
    setEquipos(nuevosEquipos); setActiva(null); setRotY(0);
    fetch('/api/equipos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevo) }).catch(console.error);
    setAviso({ texto: `${nuevo.tag} colocado`, tipo: 'ok' });
  }, [activa, candidata, equipos, rotY, conexiones, registrarHistorial]);

  // Selección con detección de puertos → conexión persistente
  const seleccionar = useCallback((uuid: string, puertoId?: string) => {
    if (modoConexion && puertoId) {
      const sel = { equipoUuid: uuid, puertoId };
      if (!puertoSeleccionado) {
        setPuertoSeleccionado(sel);
        setAviso({ texto: `Origen: ${puertoId}. Selecciona destino.`, tipo: 'ok' });
      } else {
        if (puertoSeleccionado.equipoUuid === uuid && puertoSeleccionado.puertoId === puertoId) {
          setAviso({ texto: 'No puedes conectar un puerto consigo mismo.', tipo: 'error' }); return;
        }
        const duplicada = conexiones.some(c =>
          (c.equipoA === puertoSeleccionado.equipoUuid && c.puertoA === puertoSeleccionado.puertoId && c.equipoB === uuid && c.puertoB === puertoId) ||
          (c.equipoA === uuid && c.puertoA === puertoId && c.equipoB === puertoSeleccionado.equipoUuid && c.puertoB === puertoSeleccionado.puertoId)
        );
        if (duplicada) { setAviso({ texto: 'Esa conexión ya existe.', tipo: 'error' }); return; }

        const persistida: ConexionPersistida = {
          id: crypto.randomUUID(),
          equipoA: puertoSeleccionado.equipoUuid, puertoA: puertoSeleccionado.puertoId,
          equipoB: uuid, puertoB: puertoId,
        };
        const nuevasConexiones = [...conexiones, persistida];
        registrarHistorial(equipos, nuevasConexiones);
        setConexiones(nuevasConexiones);
        setPuertoSeleccionado(null);
        fetch('/api/conexiones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(persistida) })
          .then(r => { if (!r.ok) throw new Error('Error al guardar conexión'); })
          .catch(err => setAviso({ texto: err.message, tipo: 'error' }));
        setAviso({ texto: 'Conexión creada y guardada', tipo: 'ok' });
      }
    } else {
      setSeleccionado(uuid); setActiva(null); setRotY(0);
    }
  }, [modoConexion, puertoSeleccionado, equipos, conexiones, registrarHistorial]);

  const eliminarEquipo = useCallback(async (uuid: string) => {
    const eq = equipos.find(e => e.uuid === uuid); if (!eq) return;
    const nuevosEquipos = equipos.filter(e => e.uuid !== uuid);
    const nuevasConexiones = conexiones.filter(c => c.equipoA !== uuid && c.equipoB !== uuid);
    registrarHistorial(nuevosEquipos, nuevasConexiones);
    setEquipos(nuevosEquipos); setConexiones(nuevasConexiones); setSeleccionado(null);
    fetch('/api/equipos/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uuid }) }).catch(console.error);
    fetch('/api/conexiones', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ equipoUuid: uuid }) }).catch(console.error);
    setAviso({ texto: `${eq.tag} eliminado (y sus conexiones)`, tipo: 'ok' });
  }, [equipos, conexiones, registrarHistorial]);

  const manejarUndoLocal = useCallback(() => {
    if (indiceRef.current > 0) {
      indiceRef.current--;
      const snap = historialRef.current[indiceRef.current];
      setEquipos(snap.equipos); setConexiones(snap.conexiones);
      setAviso({ texto: '↩ Deshecho', tipo: 'ok' });
    } else { setAviso({ texto: 'Nada que deshacer', tipo: 'error' }); }
  }, []);

  const manejarRedoLocal = useCallback(() => {
    if (indiceRef.current < historialRef.current.length - 1) {
      indiceRef.current++;
      const snap = historialRef.current[indiceRef.current];
      setEquipos(snap.equipos); setConexiones(snap.conexiones);
      setAviso({ texto: '↪ Rehecho', tipo: 'ok' });
    } else { setAviso({ texto: 'Nada que rehacer', tipo: 'error' }); }
  }, []);

  async function copiarDiagnostico() {
    const canvas = document.querySelector('canvas'); const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
    const diagnostico = { app: 'Planta Viva v3.0', timestamp: new Date().toISOString(), gpu: debugInfo ? gl!.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Desconocida', estado: { equipos: equipos.length, conexiones: conexiones.length, historial: `${indiceRef.current + 1}/${historialRef.current.length}` } };
    try { await navigator.clipboard.writeText(JSON.stringify(diagnostico, null, 2)); setAviso({ texto: '🩺 Diagnóstico copiado.', tipo: 'ok' }); } catch { setAviso({ texto: 'Error al copiar.', tipo: 'error' }); }
  }

  // Conexiones resueltas (recalculadas en vivo si un equipo se mueve/borra)
  const conexionesResueltas = useMemo<ConexionRuntime[]>(() => {
    const resueltas = conexiones.map(c => resolverConexion(c, equipos));
    return resueltas.filter((c): c is ConexionRuntime => c !== null);
  }, [conexiones, equipos]);

  const categorias = useMemo(() => { const map = new Map<string, Descriptor[]>(); for (const d of CATALOGO) { if (!map.has(d.categoria)) map.set(d.categoria, []); map.get(d.categoria)!.push(d); } return map; }, []);
  const fantasma: Equipo | null = activa && candidata ? { uuid: 'fantasma', tag: '', familia: activa.familia, descriptorId: activa.descriptorId, color: candidata.valido ? '#2fb37a' : '#e05555', dimensiones: activa.dimensiones, posicion: [candidata.x, activa.dimensiones.alto / 2, candidata.z], rotacionY: rotY } : null;
  const equipoSel = equipos.find(e => e.uuid === seleccionado);

  return {
    equipos, activa, rotY, puntero, cargando, aviso, seleccionado,
    modoConexion, puertoSeleccionado, conexiones, conexionesResueltas,
    hoverEquipo, estadosSimulacion, down, historialRef, indiceRef,
    cargarGrafo, onMove, candidata, colocar, seleccionar, eliminarEquipo,
    manejarUndoLocal, manejarRedoLocal, copiarDiagnostico,
    categorias, fantasma, equipoSel,
    puedeUndo: indiceRef.current > 0, puedeRedo: indiceRef.current < historialRef.current.length - 1,
    setActiva, setRotY, setSeleccionado, setModoConexion, setPuertoSeleccionado, setHoverEquipo,
  };
}