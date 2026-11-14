// src/lib/colocacion.ts — portado de v2 (colocacion.js) a datos puros
export type Dimensiones = { ancho: number; alto: number; profundidad: number };

export type Equipo = {
  uuid: string;
  tag: string;
  familia: string;
  descriptorId: string;
  color: string;
  dimensiones: Dimensiones;
  posicion: [number, number, number];
  rotacionY: number;
  params?: Record<string, unknown>;
};

export const PASO_REJILLA = 0.25;
const MARGEN_SOLAPE = 0.05;
const RADIO_SNAP = 0.6;

export const snap = (v: number) => Math.round(v / PASO_REJILLA) * PASO_REJILLA;

/** Huella en planta (X/Z) con rotación de 90° aplicada. */
export function huella(e: Pick<Equipo, 'dimensiones' | 'rotacionY'>) {
  const girado = Math.abs(Math.sin(e.rotacionY || 0)) > 0.5;
  return girado
    ? { ancho: e.dimensiones.profundidad, fondo: e.dimensiones.ancho }
    : { ancho: e.dimensiones.ancho, fondo: e.dimensiones.profundidad };
}

function caja(x: number, z: number, d: { ancho: number; fondo: number }) {
  return { minX: x - d.ancho / 2, maxX: x + d.ancho / 2, minZ: z - d.fondo / 2, maxZ: z + d.fondo / 2 };
}

/** true si la posición candidata solapa con otro equipo. */
export function solapa(equipos: Equipo[], candidato: Pick<Equipo, 'dimensiones' | 'rotacionY'>, x: number, z: number) {
  const dim = huella(candidato);
  const c = caja(x, z, dim);
  for (const e of equipos) {
    const o = caja(e.posicion[0], e.posicion[2], huella(e));
    const ix = c.minX < o.maxX + MARGEN_SOLAPE && c.maxX > o.minX - MARGEN_SOLAPE;
    const iz = c.minZ < o.maxZ + MARGEN_SOLAPE && c.maxZ > o.minZ - MARGEN_SOLAPE;
    if (ix && iz) return true;
  }
  return false;
}

/** Ajusta X/Z a los bordes de equipos cercanos (imán de v2). */
export function ajustarAEquipos(equipos: Equipo[], x: number, z: number, dim: { ancho: number; fondo: number }) {
  let mejorX = x, mejorZ = z, dX = RADIO_SNAP, dZ = RADIO_SNAP;
  for (const e of equipos) {
    const o = caja(e.posicion[0], e.posicion[2], huella(e));
    for (const cx of [o.minX - dim.ancho / 2, o.maxX + dim.ancho / 2]) {
      const d = Math.abs(x - cx);
      const alineado = z + dim.fondo / 2 > o.minZ && z - dim.fondo / 2 < o.maxZ;
      if (d < dX && alineado) { dX = d; mejorX = cx; }
    }
    for (const cz of [o.minZ - dim.fondo / 2, o.maxZ + dim.fondo / 2]) {
      const d = Math.abs(z - cz);
      const alineado = x + dim.ancho / 2 > o.minX && x - dim.ancho / 2 < o.maxX;
      if (d < dZ && alineado) { dZ = d; mejorZ = cz; }
    }
  }
  return { x: mejorX, z: mejorZ };
}

/** Siguiente número libre para un prefijo de tag (TNQ-101, TNQ-102...). */
export function siguienteTag(prefijo: string, equipos: Equipo[]) {
  const re = new RegExp(`^${prefijo}-(\\d+)$`);
  let max = 100;
  for (const e of equipos) { const m = e.tag.match(re); if (m) max = Math.max(max, parseInt(m[1], 10)); }
  return `${prefijo}-${max + 1}`;
}

/** Normaliza equipos antiguos (radio/largo) al formato ancho/alto/profundidad. */
export function normalizarEquipo(e: any): Equipo {
  const d = e.dimensiones ?? {};
  const dimensiones: Dimensiones = d.ancho
    ? d
    : {
        ancho: d.ancho ?? d.largo ?? d.radio ? (d.radio ? d.radio * 2 : d.largo ?? 1) : 1,
        alto: d.alto ?? 1,
        profundidad: d.profundidad ?? d.fondo ?? (d.radio ? d.radio * 2 : 1),
      };
  return { ...e, dimensiones, rotacionY: e.rotacionY ?? 0 };
}