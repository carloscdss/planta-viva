// src/hooks/useEditor.ts — Cerebro del editor: estados, historial, worker, conexiones, MOVER
'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATALOGO, type Descriptor } from '@/lib/catalogo';
import { ajustarAEquipos, huella, normalizarEquipo, siguienteTag, snap, solapa, type Equipo } from '@/lib/colocacion';
import { resolverConexion, type ConexionPersistida, type ConexionRuntime } from '@/lib/conexion';
import type { EstadoEquipo, MensajeSalida } from '@/workers/simulacion.worker';
import { instalarDiagnostico, generarDiagnosticoCompleto, registrarAccion } from '@/lib/diagnostico';

export function useEditor() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [activa, setActiva] = useState<Descriptor | null>(null);
  const [rotY, setRotY] = useState(0);
  const [puntero, setPuntero] = useState<[number, number] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  // Conexiones
  const [modoConexion, setModoConexion] = useState(false);
  const [puertoSeleccionado, setPuertoSeleccionado] = useState<{ equipoUuid: string; puertoId: string } | null>(null);
  const [conexiones, setConexiones] = useState<ConexionPersistida[]>([]);

  // MOVER (nuevo)
  const [modoMover, setModoMover] = useState(false);
  const [bombeoActivo, setBombeoActivo] = useState(false);
  const [rotMover, setRotMover] = useState(0);

  // Simulación
  const [hoverEquipo, setHoverEquipo] = useState<string | null>(null);
  const [estadosSimulacion, setEstadosSimulacion] = useState<Record<string, EstadoEquipo>>({});

  const down = useRef<{ x: number; y: number } | null>(null);
  const historialRef = useRef<{ equipos: Equipo[]; conexiones: ConexionPersistida[] }[]>([]);
  const indiceRef = useRef(-1);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 3500); return () => clearTimeout(t); }, [aviso]);

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
    instalarDiagnostico();
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

  const onMove = useCallback((x: number, z: number) => setPuntero([x, z]), []);

  // Candidata de colocación (nuevo equipo)
  const candidata = useMemo(() => {
    if (!activa || !puntero) return null;
    const dim = huella({ dimensiones: activa.dimensiones, rotacionY: rotY });
    const s = ajustarAEquipos(equipos, snap(puntero[0]), snap(puntero[1]), dim);
    const valido = !solapa(equipos, { dimensiones: activa.dimensiones, rotacionY: rotY }, s.x, s.z);
    return { x: s.x, z: s.z, valido };
  }, [activa, puntero, equipos, rotY]);

  // Candidata de MOVER (equipo existente, excluyéndose a sí mismo de colisiones)
  const candidataMover = useMemo(() => {
    if (!modoMover || !seleccionado || !puntero) return null;
    const eq = equipos.find(e => e.uuid === seleccionado);
    if (!eq) return null;
    const otros = equipos.filter(e => e.uuid !== seleccionado);
    const dim = huella({ dimensiones: eq.dimensiones, rotacionY: rotMover });
    const s = ajustarAEquipos(otros, snap(puntero[0]), snap(puntero[1]), dim);
    const valido = !solapa(otros, { dimensiones: eq.dimensiones, rotacionY: rotMover }, s.x, s.z);
    return { x: s.x, z: s.z, valido, equipo: eq, rotacionY: rotMover };
  }, [modoMover, seleccionado, puntero, equipos, rotMover]);

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
    registrarAccion(`COLOCAR ${nuevo.tag}`);
    fetch('/api/equipos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevo) }).catch(console.error);
    setAviso({ texto: `${nuevo.tag} colocado`, tipo: 'ok' });
  }, [activa, candidata, equipos, rotY, conexiones, registrarHistorial]);

  // MOVER: iniciar / soltar / cancelar / rotar
  const iniciarMover = useCallback(() => {
    if (!seleccionado) return;
    const eq = equipos.find(e => e.uuid === seleccionado);
    if (!eq) return;
    setModoMover(true);
    setModoConexion(false);
    setPuertoSeleccionado(null);
    setActiva(null);
    setRotMover(eq.rotacionY || 0);
    setAviso({ texto: `Moviendo ${eq.tag} — clic en el piso para soltar · R rota · Esc cancela`, tipo: 'ok' });
  }, [seleccionado, equipos]);

  const soltarMover = useCallback(async () => {
    if (!modoMover || !candidataMover) return;
    if (!candidataMover.valido) { setAviso({ texto: '⚠️ Interferencia: no se puede soltar ahí.', tipo: 'error' }); return; }
    const eq = candidataMover.equipo;
    const nuevaPos: [number, number, number] = [candidataMover.x, eq.dimensiones.alto / 2, candidataMover.z];
    const nuevosEquipos = equipos.map(e => e.uuid === eq.uuid ? { ...e, posicion: nuevaPos, rotacionY: candidataMover.rotacionY } : e);
    registrarHistorial(nuevosEquipos, conexiones);
    setEquipos(nuevosEquipos);
    setModoMover(false);
    registrarAccion(`MOVER ${eq.tag} → [${nuevaPos[0].toFixed(2)}, ${nuevaPos[2].toFixed(2)}]`);
    fetch('/api/equipos/mover', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid: eq.uuid, posicion: nuevaPos, rotacionY: candidataMover.rotacionY }),
    })
      .then(async r => { if (!r.ok) throw new Error((await r.json()).error); })
      .catch(err => setAviso({ texto: err.message, tipo: 'error' }));
    setAviso({ texto: `${eq.tag} movido y guardado`, tipo: 'ok' });
  }, [modoMover, candidataMover, equipos, conexiones, registrarHistorial]);

  const cancelarMover = useCallback(() => {
    if (!modoMover) return;
    setModoMover(false);
    setAviso({ texto: 'Movimiento cancelado', tipo: 'ok' });
  }, [modoMover]);

  const alternarBombeo = useCallback(async () => {
  const nuevoEstado = !bombeoActivo;
  setBombeoActivo(nuevoEstado);
  registrarAccion(`BOMBEO ${nuevoEstado ? 'ACTIVADO' : 'DETENIDO'}`);
  // 1) Animar tuberías: persistir activo en todas las conexiones
  setConexiones(prev => prev.map(c => ({ ...c, activo: nuevoEstado })));
  fetch('/api/conexiones/bombeo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo: nuevoEstado }),
  }).catch(err => setAviso({ texto: String(err), tipo: 'error' }));
  // 2) Encender física en el worker (bombas, válvulas, niveles)
  workerRef.current?.postMessage({ type: 'BOMBEAR', activo: nuevoEstado });
  setAviso({ texto: nuevoEstado ? '💧 Bombeo ACTIVADO — flujo en marcha' : 'Bombeo DETENIDO', tipo: 'ok' });
}, [bombeoActivo]);

  const rotarMover = useCallback(() => {
    if (!modoMover) return;
    setRotMover(r => r + Math.PI / 2);
  }, [modoMover]);

  const seleccionar = useCallback((uuid: string, puertoId?: string) => {
    if (modoMover) return; // no cambiar selección mientras se mueve
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
        registrarAccion(`CONECTAR ${puertoSeleccionado.puertoId} → ${puertoId}`);
        fetch('/api/conexiones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(persistida) })
          .then(r => { if (!r.ok) throw new Error('Error al guardar conexión'); })
          .catch(err => setAviso({ texto: err.message, tipo: 'error' }));
        setAviso({ texto: 'Conexión creada y guardada', tipo: 'ok' });
      }
    } else {
      setSeleccionado(uuid); setActiva(null); setRotY(0);
    }
  }, [modoConexion, modoMover, puertoSeleccionado, equipos, conexiones, registrarHistorial]);

  const eliminarEquipo = useCallback(async (uuid: string) => {
    const eq = equipos.find(e => e.uuid === uuid); if (!eq) return;
    const nuevosEquipos = equipos.filter(e => e.uuid !== uuid);
    const nuevasConexiones = conexiones.filter(c => c.equipoA !== uuid && c.equipoB !== uuid);
    registrarHistorial(nuevosEquipos, nuevasConexiones);
    setEquipos(nuevosEquipos); setConexiones(nuevasConexiones); setSeleccionado(null); setModoMover(false);
    registrarAccion(`ELIMINAR ${eq.tag}`);
    fetch('/api/equipos/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uuid }) }).catch(console.error);
    fetch('/api/conexiones', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ equipoUuid: uuid }) }).catch(console.error);
    setAviso({ texto: `${eq.tag} eliminado (y sus conexiones)`, tipo: 'ok' });
  }, [equipos, conexiones, registrarHistorial]);

  const manejarUndoLocal = useCallback(() => {
    if (indiceRef.current > 0) {
      indiceRef.current--;
      const snapH = historialRef.current[indiceRef.current];
      setEquipos(snapH.equipos); setConexiones(snapH.conexiones); setModoMover(false);
      setAviso({ texto: '↩ Deshecho', tipo: 'ok' });
    } else { setAviso({ texto: 'Nada que deshacer', tipo: 'error' }); }
  }, []);

  const manejarRedoLocal = useCallback(() => {
    if (indiceRef.current < historialRef.current.length - 1) {
      indiceRef.current++;
      const snapH = historialRef.current[indiceRef.current];
      setEquipos(snapH.equipos); setConexiones(snapH.conexiones);
      setAviso({ texto: '↪ Rehecho', tipo: 'ok' });
    } else { setAviso({ texto: 'Nada que rehacer', tipo: 'error' }); }
  }, []);

  // Teclado (incluye R para mover)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modoMover) { cancelarMover(); return; }
        setActiva(null); setRotY(0); setSeleccionado(null); setPuertoSeleccionado(null);
      }
      if (e.key.toLowerCase() === 'r') {
        if (modoMover) { e.preventDefault(); rotarMover(); }
        else if (activa) setRotY((r) => r + Math.PI / 2);
      }
      if (e.key === 'Enter' && modoMover) { e.preventDefault(); soltarMover(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); manejarUndoLocal(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); manejarRedoLocal(); }
      if (e.key === 'Delete' && seleccionado && !modoMover) eliminarEquipo(seleccionado);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activa, seleccionado, modoMover, cancelarMover, rotarMover, soltarMover]);

  async function copiarDiagnostico() {
    const diag = generarDiagnosticoCompleto({
      equipos: equipos.length,
      conexiones: conexiones.length,
      historial: `${indiceRef.current + 1}/${historialRef.current.length}`,
      modoConexion, modoMover,
      puertoPendiente: puertoSeleccionado ? `${puertoSeleccionado.equipoUuid}:${puertoSeleccionado.puertoId}` : null,
      seleccionado, hoverEquipo, workerActivo: !!workerRef.current,
    });
    try { await navigator.clipboard.writeText(JSON.stringify(diag, null, 2)); setAviso({ texto: '🩺 Diagnóstico completo copiado.', tipo: 'ok' }); }
    catch { setAviso({ texto: 'No se pudo copiar.', tipo: 'error' }); }
  }

  const conexionesResueltas = useMemo<ConexionRuntime[]>(() => {
    return conexiones.map(c => resolverConexion(c, equipos)).filter((c): c is ConexionRuntime => c !== null);
  }, [conexiones, equipos]);

  const categorias = useMemo(() => { const map = new Map<string, Descriptor[]>(); for (const d of CATALOGO) { if (!map.has(d.categoria)) map.set(d.categoria, []); map.get(d.categoria)!.push(d); } return map; }, []);
  const fantasma: Equipo | null = activa && candidata ? { uuid: 'fantasma', tag: '', familia: activa.familia, descriptorId: activa.descriptorId, color: candidata.valido ? '#2fb37a' : '#e05555', dimensiones: activa.dimensiones, posicion: [candidata.x, activa.dimensiones.alto / 2, candidata.z], rotacionY: rotY } : null;
  const fantasmaMover: Equipo | null = candidataMover ? { ...candidataMover.equipo, color: candidataMover.valido ? '#2fb37a' : '#e05555', posicion: [candidataMover.x, candidataMover.equipo.dimensiones.alto / 2, candidataMover.z], rotacionY: candidataMover.rotacionY } : null;
  const equipoSel = equipos.find(e => e.uuid === seleccionado);

  return {
    equipos, activa, rotY, puntero, cargando, aviso, seleccionado,
    modoConexion, puertoSeleccionado, conexiones, conexionesResueltas,
    modoMover, candidataMover, fantasmaMover, bombeoActivo, alternarBombeo,
    hoverEquipo, estadosSimulacion, down, historialRef, indiceRef,
    cargarGrafo, onMove, candidata, colocar, seleccionar, eliminarEquipo,
    iniciarMover, soltarMover, cancelarMover,
    manejarUndoLocal, manejarRedoLocal, copiarDiagnostico,
    categorias, fantasma, equipoSel,
    puedeUndo: indiceRef.current > 0, puedeRedo: indiceRef.current < historialRef.current.length - 1,
    setActiva, setRotY, setSeleccionado, setModoConexion, setPuertoSeleccionado, setHoverEquipo,
  };
}