// src/components/PidViewer.tsx — P&ID con líneas ortogonales, leyenda y export SVG
'use client';
import { useRef } from 'react';
import { proyectarA2D, rutaOrtogonal, SIMBOLOS, LEYENDA } from '@/lib/pid-proyeccion';
import type { Equipo } from '@/lib/colocacion';
import type { ConexionRuntime } from '@/lib/conexion';

export function PidViewer({ equipos, conexiones }: { equipos: Equipo[]; conexiones: ConexionRuntime[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 800;
  const height = 600;

  const descargarSVG = () => {
    if (!svgRef.current) return;
    const clon = svgRef.current.cloneNode(true) as SVGSVGElement;
    clon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const blob = new Blob([new XMLSerializer().serializeToString(clon)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PID_PlantaViva_${new Date().toISOString().slice(0, 10)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full bg-[#0e1114] flex flex-col items-center justify-center p-4 overflow-auto gap-3">
      <div className="relative bg-[#161b20] border border-slate-700 rounded-lg shadow-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-green-400 font-bold text-sm uppercase tracking-widest">
            P&ID — Proyección del Grafo
          </h2>
          <button onClick={descargarSVG} className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-bold">
            ⬇ Descargar SVG
          </button>
        </div>

        <svg ref={svgRef} width={width} height={height} className="border border-slate-800 rounded bg-[#0a0f13]">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1c232a" strokeWidth="1" />
            </pattern>
            <marker id="flecha" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#3b82f6" />
            </marker>
            <marker id="flechaOff" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#52665f" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Título técnico dentro del SVG (para que salga en el archivo descargado) */}
          <text x={16} y={24} fill="#8b98a5" fontSize="10" fontFamily="monospace">
            PLANTA PILOTO DE AGUA — Rev. A — {new Date().toLocaleDateString('es')}
          </text>

          {/* Tuberías ortogonales */}
          {conexiones.map((c) => {
            const p1 = proyectarA2D([c.posA.x, c.posA.y, c.posA.z]);
            const p2 = proyectarA2D([c.posB.x, c.posB.y, c.posB.z]);
            const { d } = rutaOrtogonal(p1, p2);
            return (
              <path
                key={c.id}
                d={d}
                fill="none"
                stroke={c.activo ? '#3b82f6' : '#52665f'}
                strokeWidth={c.activo ? 2.5 : 1.5}
                strokeDasharray={c.activo ? '10 6' : 'none'}
                markerEnd={c.activo ? 'url(#flecha)' : 'url(#flechaOff)'}
              >
                {c.activo && (
                  <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.6s" repeatCount="indefinite" />
                )}
              </path>
            );
          })}

          {/* Equipos */}
          {equipos.map((eq) => {
            const pos = proyectarA2D(eq.posicion);
            const radio = Math.max(12, ((eq.dimensiones.ancho + eq.dimensiones.profundidad) / 4) * 10);
            const simbolo = SIMBOLOS[eq.familia as keyof typeof SIMBOLOS] || SIMBOLOS.default;
            return (
              <g key={eq.uuid}>
                <g dangerouslySetInnerHTML={{ __html: simbolo(pos.x, pos.y, radio) }} />
                <text x={pos.x} y={pos.y + radio + 14} textAnchor="middle" fill="#8b98a5" fontSize="10" fontFamily="monospace">
                  {eq.tag}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 justify-center mt-3 pt-3 border-t border-slate-800">
          {LEYENDA.map((l) => (
            <div key={l.clave} className="flex items-center gap-2">
              <svg width="36" height="28">
                <g dangerouslySetInnerHTML={{ __html: SIMBOLOS[l.clave](18, 14, 10) }} />
              </svg>
              <span className="text-[10px] text-slate-400 uppercase">{l.nombre}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-500">
        Las líneas con flecha azul animada = flujo activo (bombeo). Gris punteada = inactivo.
      </p>
    </div>
  );
}