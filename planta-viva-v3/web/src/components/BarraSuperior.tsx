'use client';
export function BarraSuperior({ cargando, totalEquipos, puedeUndo, puedeRedo, indiceActual, pasosHistorial, onUndo, onRedo }: any) {
  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white">
      <span className={`w-2 h-2 rounded-full ${cargando ? 'bg-yellow-400' : 'bg-green-400'}`} />
      {cargando ? 'Conectando…' : `DB OK · ${totalEquipos} equipos`}
      <div className="h-4 w-px bg-slate-600 mx-1" />
      <button onClick={onUndo} disabled={!puedeUndo || cargando} className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-20 transition-colors group relative" title="Deshacer (Ctrl+Z)">
        <span className="text-sm">↩</span>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-black text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Deshacer ({indiceActual})</span>
      </button>
      <button onClick={onRedo} disabled={!puedeRedo || cargando} className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-20 transition-colors group relative" title="Rehacer (Ctrl+Y)">
        <span className="text-sm">↪</span>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-black text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Rehacer ({pasosHistorial - 1 - indiceActual})</span>
      </button>
      <span className="text-[10px] text-slate-400 ml-1">{indiceActual + 1}/{pasosHistorial}</span>
    </div>
  );
}