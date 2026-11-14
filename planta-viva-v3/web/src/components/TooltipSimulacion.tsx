'use client';
import { type EstadoEquipo } from '@/workers/simulacion.worker';

export function TooltipSimulacion({ hoverEquipo, estados }: { hoverEquipo: string | null; estados: Record<string, EstadoEquipo> }) {
  if (!hoverEquipo || !estados[hoverEquipo]) return null;
  const data = estados[hoverEquipo];
  
  return (
    <div className="absolute pointer-events-none z-20 bg-slate-900/95 border border-slate-600 rounded p-3 text-xs text-white shadow-xl backdrop-blur-sm" style={{ left: '50%', top: '20%', transform: 'translateX(-50%)' }}>
      <div className="font-bold text-green-400 mb-2">{data.tag}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-slate-400">Nivel:</span> <span>{data.params.nivel}%</span>
        <span className="text-slate-400">Presión:</span> <span>{data.params.presion} bar</span>
        <span className="text-slate-400">Flujo:</span> <span>{data.params.flujo} m³/h</span>
        {data.familia === 'bomba' && (<><span className="text-slate-400">RPM:</span> <span>{data.params.rpm}</span></>)}
      </div>
    </div>
  );
}