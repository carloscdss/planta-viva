'use client';
import { type Equipo } from '@/lib/colocacion';

export function PanelPropiedades({ equipo, onClose, onDelete }: { equipo: Equipo; onClose: () => void; onDelete: (uuid: string) => void }) {
  return (
    <div className="absolute bottom-4 right-4 z-10 w-72 bg-slate-800/95 border border-slate-700 rounded-lg p-4 text-white shadow-xl">
      <div className="flex justify-between items-center mb-3"><h2 className="font-bold text-green-400">{equipo.tag}</h2><button onClick={onClose} className="text-slate-400 hover:text-white">×</button></div>
      <dl className="grid grid-cols-2 gap-2 text-xs mb-4">
        <dt className="text-slate-400">Familia:</dt><dd>{equipo.familia}</dd>
        <dt className="text-slate-400">Dimensiones:</dt><dd>{equipo.dimensiones.ancho}×{equipo.dimensiones.alto}×{equipo.dimensiones.profundidad} m</dd>
        <dt className="text-slate-400">Posición:</dt><dd>[{equipo.posicion[0].toFixed(2)}, {equipo.posicion[1].toFixed(2)}, {equipo.posicion[2].toFixed(2)}]</dd>
      </dl>
      <button onClick={() => onDelete(equipo.uuid)} className="w-full p-2 rounded bg-red-900/50 border border-red-700 text-red-200 text-xs hover:bg-red-800">🗑 Eliminar Equipo</button>
    </div>
  );
}