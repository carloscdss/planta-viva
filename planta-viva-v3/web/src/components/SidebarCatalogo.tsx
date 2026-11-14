// src/components/SidebarCatalogo.tsx — catálogo + modo conexión + botón bombeo
'use client';
import { type Descriptor } from '@/lib/catalogo';

export function SidebarCatalogo({
  categorias, activa, setActiva, setRotY, setSeleccionado,
  modoConexion, setModoConexion, setPuertoSeleccionado, puertoSeleccionado,
  candidata, cargarGrafo, copiarDiagnostico,
  bombeoActivo, alternarBombeo, conexionesResueltas,
}: any) {
  return (
    <aside className="absolute top-4 left-4 z-10 w-72 bg-slate-800/95 border border-slate-700 rounded-lg p-4 text-white shadow-xl max-h-[90vh] overflow-auto">
      <h1 className="text-lg font-bold text-green-400">Planta Viva v3.0</h1>
      <p className="text-xs text-slate-400 mb-3">Arquitectura Modular</p>

      {[...categorias.entries()].map(([cat, defs]: [string, Descriptor[]]) => (
        <div key={cat} className="mb-2">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{cat}</p>
          {defs.map((d) => (
            <button key={d.descriptorId}
              onClick={() => { setActiva(activa?.descriptorId === d.descriptorId ? null : d); setRotY(0); setSeleccionado(null); }}
              className={`w-full p-2 mb-1 rounded text-left border transition ${activa?.descriptorId === d.descriptorId ? 'bg-green-600 border-green-400' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>
              <div className="font-bold uppercase text-sm">{d.nombre}</div>
              <div className="text-[11px] text-slate-300">${d.precio} · {d.tag}-xxx</div>
            </button>
          ))}
        </div>
      ))}

      <button
        onClick={() => { setModoConexion(!modoConexion); setPuertoSeleccionado(null); setSeleccionado(null); }}
        className={`w-full p-2 rounded border text-xs mb-2 transition ${modoConexion ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}>
        {modoConexion ? '✕ Salir Modo Conexión' : '⌁ Modo Conexiones'}
      </button>

      {/* BOTÓN BOMBEAR (port de alternarBombeo de v2) */}
      <button
        onClick={alternarBombeo}
        disabled={!conexionesResueltas || conexionesResueltas.length === 0}
        className={`w-full p-2 rounded border text-xs mb-2 transition disabled:opacity-40 ${
          bombeoActivo ? 'bg-blue-700 border-blue-300 text-white animate-pulse' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
        }`}>
        💧 {bombeoActivo ? 'Detener Bombeo' : 'Bombear'}
        {conexionesResueltas?.length ? ` (${conexionesResueltas.length} líneas)` : ''}
      </button>

      {modoConexion && puertoSeleccionado && (
        <p className="text-xs text-blue-300 mb-2">Origen: {puertoSeleccionado.puertoId} → Selecciona destino</p>
      )}
      {activa && (
        <p className={`text-xs mt-2 ${candidata && !candidata.valido ? 'text-red-300' : 'text-green-300'}`}>
          {candidata && !candidata.valido ? '🔴 Espacio ocupado' : '🟢 Toca el piso para colocar'} · R rota · Esc cancela
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button onClick={() => cargarGrafo()} className="flex-1 p-2 rounded bg-slate-700 border border-slate-600 text-xs hover:bg-slate-600">↻ Recargar</button>
        <button onClick={copiarDiagnostico} className="flex-1 p-2 rounded bg-slate-700 border border-slate-600 text-xs hover:bg-slate-600">🩺 Diagnóstico</button>
      </div>
    </aside>
  );
}