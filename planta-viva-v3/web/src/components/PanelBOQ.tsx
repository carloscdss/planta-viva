// src/components/PanelBOQ.tsx
'use client';
import { exportarCSV, type ResumenBOQ } from '@/lib/boq';

export function PanelBOQ({ boq, onClose }: { boq: ResumenBOQ; onClose: () => void }) {
  return (
    <div className="absolute top-16 right-4 z-20 w-[420px] max-w-[92vw] max-h-[80vh] bg-slate-800/97 border border-slate-700 rounded-lg shadow-2xl text-white overflow-auto">
      <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
        <div>
          <h2 className="font-bold text-green-400">Cómputos Métricos (MTO)</h2>
          <p className="text-[10px] text-slate-400">Calculado en vivo desde el Grafo</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
      </div>

      <table className="w-full text-[11px]">
        <thead className="bg-slate-900 text-slate-400 uppercase text-[9px]">
          <tr>
            <th className="p-2 text-left">Partida</th>
            <th className="p-2 text-right">Cant.</th>
            <th className="p-2 text-right">Unit.</th>
            <th className="p-2 text-right">Total $</th>
          </tr>
        </thead>
        <tbody>
          {boq.lineas.map((l, i) => (
            <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30" title={`Fuente: ${l.fuente}`}>
              <td className="p-2">
                <div className="font-semibold">{l.partida}</div>
                <div className="text-[9px] text-slate-500">{l.disciplina}</div>
              </td>
              <td className="p-2 text-right font-mono">{l.cantidad}</td>
              <td className="p-2 text-right text-slate-400">{l.unidad}</td>
              <td className="p-2 text-right font-mono text-green-300">${l.costoTotal.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-900 font-bold">
            <td className="p-2" colSpan={3}>TOTAL PLANTA</td>
            <td className="p-2 text-right font-mono text-green-400">${boq.total.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div className="p-3 border-t border-slate-700">
        <p className="text-[9px] uppercase text-slate-500 mb-1">Desglose por disciplina</p>
        {Object.entries(boq.porDisciplina).map(([d, v]) => (
          <div key={d} className="flex justify-between text-[10px] py-0.5">
            <span className="text-slate-300">{d}</span>
            <span className="font-mono">${v.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="p-3 flex gap-2 sticky bottom-0 bg-slate-800 border-t border-slate-700">
        <button onClick={() => exportarCSV(boq)} className="flex-1 p-2 rounded bg-green-600 hover:bg-green-500 text-xs font-bold">
          ⬇ Exportar CSV (MTO)
        </button>
        <button onClick={onClose} className="px-3 py-2 rounded bg-slate-700 border border-slate-600 text-xs">Cerrar</button>
      </div>
    </div>
  );
}