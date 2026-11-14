// src/components/PanelPropiedades.tsx — con botón Mover
'use client';
import { type Equipo } from '@/lib/colocacion';

export function PanelPropiedades({
  equipo, onClose, onDelete, onMover, modoMover, onSoltar, onCancelarMover,
}: {
  equipo: Equipo; onClose: () => void; onDelete: (uuid: string) => void;
  onMover: () => void; modoMover: boolean; onSoltar: () => void; onCancelarMover: () => void;
}) {
  return (
    <div className="absolute bottom-4 right-4 z-10 w-72 bg-slate-800/95 border border-slate-700 rounded-lg p-4 text-white shadow-xl">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-green-400">{equipo.tag}</h2>
        {!modoMover && <button onClick={onClose} className="text-slate-400 hover:text-white">×</button>}
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs mb-4">
        <dt className="text-slate-400">Familia:</dt><dd>{equipo.familia}</dd>
        <dt className="text-slate-400">Dimensiones:</dt><dd>{equipo.dimensiones.ancho}×{equipo.dimensiones.alto}×{equipo.dimensiones.profundidad} m</dd>
        <dt className="text-slate-400">Posición:</dt><dd>[{equipo.posicion[0].toFixed(2)}, {equipo.posicion[1].toFixed(2)}, {equipo.posicion[2].toFixed(2)}]</dd>
      </dl>

      {modoMover ? (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-yellow-300">Arrastra el cursor sobre el piso · R rota 90°</p>
          <div className="flex gap-2">
            <button onClick={onSoltar} className="flex-1 p-2 rounded bg-green-600 hover:bg-green-500 text-xs font-bold">✓ Soltar aquí</button>
            <button onClick={onCancelarMover} className="flex-1 p-2 rounded bg-slate-700 border border-slate-600 text-xs hover:bg-slate-600">✕ Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button onClick={onMover} className="w-full p-2 rounded bg-blue-600/80 border border-blue-400 text-white text-xs font-bold hover:bg-blue-500">✥ Mover Equipo</button>
          <button onClick={() => onDelete(equipo.uuid)} className="w-full p-2 rounded bg-red-900/50 border border-red-700 text-red-200 text-xs hover:bg-red-800">🗑 Eliminar Equipo</button>
        </div>
      )}
    </div>
  );
}