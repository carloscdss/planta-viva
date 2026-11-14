// src/lib/boq.ts — Cómputos métricos desde el Grafo (Regla de Oro: nada sin fuente)
import * as THREE from 'three';
import { CATALOGO } from './catalogo';
import type { Equipo } from './colocacion';
import type { ConexionRuntime } from './conexion';

export type LineaBOQ = {
  disciplina: string;
  partida: string;
  unidad: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  fuente: string; // uuids o tags que respaldan el número
};

export type ResumenBOQ = {
  lineas: LineaBOQ[];
  total: number;
  porDisciplina: Record<string, number>;
};

const PRECIO_TUBERIA_M = 60; // $/m (deriva del descriptor: 120 / 2 m)

export function calcularBOQ(equipos: Equipo[], conexiones: ConexionRuntime[]): ResumenBOQ {
  const lineas: LineaBOQ[] = [];
  const porFamilia = new Map<string, Equipo[]>();

  for (const eq of equipos) {
    if (!porFamilia.has(eq.familia)) porFamilia.set(eq.familia, []);
    porFamilia.get(eq.familia)!.push(eq);
  }

  // --- DISCIPLINAS POR FAMILIA DE EQUIPO ---
  const mapaDisciplina: Record<string, string> = {
    tanque: 'Mecánica - Equipos de Proceso',
    bomba: 'Mecánica - Equipos Rotativos',
    valvula: 'Instrumentación y Válvulas',
    intercambiador: 'Mecánica - Intercambio de Calor',
    gabinete: 'Eléctrica - Distribución',
    motor: 'Eléctrica - Accionamientos',
    tuberia: 'Piping - Tuberías',
  };

  for (const [familia, lista] of porFamilia) {
    const desc = CATALOGO.find(d => d.familia === familia);
    if (!desc) continue;
    const cantidad = familia === 'tuberia'
      ? lista.reduce((s, e) => s + e.dimensiones.ancho, 0)
      : lista.length;
    const unidad = familia === 'tuberia' ? 'm' : 'u';
    const costoUnitario = familia === 'tuberia' ? PRECIO_TUBERIA_M : desc.precio;
    lineas.push({
      disciplina: mapaDisciplina[familia] ?? 'General',
      partida: desc.nombre,
      unidad,
      cantidad: Number(cantidad.toFixed(2)),
      costoUnitario,
      costoTotal: Number((cantidad * costoUnitario).toFixed(2)),
      fuente: lista.map(e => e.tag).join(', '),
    });
  }

  // --- PIPING: CONEXIONES DINÁMICAS (longitud real entre puertos) ---
  if (conexiones.length > 0) {
    let metros = 0;
    for (const c of conexiones) {
     metros += c.posA.distanceTo(c.posB);
    }
    lineas.push({
      disciplina: 'Piping - Tuberías',
      partida: 'Tubería de proceso (conexiones)',
      unidad: 'm',
      cantidad: Number(metros.toFixed(2)),
      costoUnitario: PRECIO_TUBERIA_M,
      costoTotal: Number((metros * PRECIO_TUBERIA_M).toFixed(2)),
      fuente: `${conexiones.length} conexiones`,
    });
  }

  // --- ESTRUCTURAS: estimación por huella de equipos pesados ---
  const pesados = equipos.filter(e => ['tanque', 'intercambiador'].includes(e.familia));
  if (pesados.length > 0) {
    const area = pesados.reduce((s, e) => s + e.dimensiones.ancho * e.dimensiones.profundidad, 0);
    lineas.push({
      disciplina: 'Estructuras - Bases',
      partida: 'Base de concreto (estimación)',
      unidad: 'm²',
      cantidad: Number(area.toFixed(2)),
      costoUnitario: 150,
      costoTotal: Number((area * 150).toFixed(2)),
      fuente: pesados.map(e => e.tag).join(', '),
    });
  }

  // --- TOTALES ---
  const total = lineas.reduce((s, l) => s + l.costoTotal, 0);
  const porDisciplina: Record<string, number> = {};
  for (const l of lineas) {
    porDisciplina[l.disciplina] = Number(((porDisciplina[l.disciplina] ?? 0) + l.costoTotal).toFixed(2));
  }

  return { lineas, total: Number(total.toFixed(2)), porDisciplina };
}

export function exportarCSV(boq: ResumenBOQ) {
  const filas = [
    ['Disciplina', 'Partida', 'Unidad', 'Cantidad', 'Costo Unitario', 'Costo Total', 'Fuente (tags)'],
    ...boq.lineas.map(l => [l.disciplina, l.partida, l.unidad, l.cantidad, l.costoUnitario, l.costoTotal, l.fuente]),
    [],
    ['TOTAL GENERAL', '', '', '', '', boq.total, ''],
  ];
  const csv = filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MTO_PlantaViva_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}