// src/lib/pid-proyeccion.ts — Proyección 3D→2D + routing ortogonal de tuberías
export type Punto2D = { x: number; y: number };

const ESCALA = 40;
const OFFSET_X = 400;
const OFFSET_Y = 300;

export function proyectarA2D(pos3D: [number, number, number]): Punto2D {
  return {
    x: (pos3D[0] * ESCALA) + OFFSET_X,
    y: (pos3D[2] * -ESCALA) + OFFSET_Y,
  };
}

/** Genera un path SVG ortogonal (codo en Z) entre dos puntos, con flecha al final. */
export function rutaOrtogonal(p1: Punto2D, p2: Punto2D): { d: string; punta: Punto2D; angulo: number } {
  const midX = (p1.x + p2.x) / 2;
  const d = `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
  const entraDesdeIzq = p2.x > midX;
  return { d, punta: p2, angulo: entraDesdeIzq ? 0 : 180 };
}

export const SIMBOLOS = {
  tanque: (x: number, y: number, r: number) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#e6ebef" stroke-width="2"/>
     <line x1="${x - r}" y1="${y + r}" x2="${x + r}" y2="${y + r}" stroke="#e6ebef" stroke-width="2"/>`,
  bomba: (x: number, y: number, r: number) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#e6ebef" stroke-width="2"/>
     <polygon points="${x - r},${y + r} ${x - r},${y - r} ${x + r},${y}" fill="none" stroke="#e6ebef" stroke-width="2"/>`,
  valvula: (x: number, y: number, r: number) =>
    `<polygon points="${x - r},${y - r} ${x - r},${y + r} ${x},${y} ${x + r},${y - r} ${x + r},${y + r} ${x},${y}" fill="none" stroke="#e6ebef" stroke-width="2"/>`,
  intercambiador: (x: number, y: number, r: number) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#e6ebef" stroke-width="2"/>
     <line x1="${x - r}" y1="${y - r}" x2="${x + r}" y2="${y + r}" stroke="#e6ebef" stroke-width="2"/>
     <line x1="${x - r}" y1="${y + r}" x2="${x + r}" y2="${y - r}" stroke="#e6ebef" stroke-width="2"/>`,
  motor: (x: number, y: number, r: number) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#e6ebef" stroke-width="2"/>
     <text x="${x}" y="${y + 4}" text-anchor="middle" fill="#e6ebef" font-size="${r}" font-family="monospace">M</text>`,
  gabinete: (x: number, y: number, r: number) =>
    `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" fill="none" stroke="#e6ebef" stroke-width="2"/>
     <line x1="${x - r}" y1="${y}" x2="${x + r}" y2="${y}" stroke="#e6ebef" stroke-width="1"/>`,
  tuberia: (x: number, y: number, r: number) =>
    `<line x1="${x - r}" y1="${y}" x2="${x + r}" y2="${y}" stroke="#e6ebef" stroke-width="3"/>`,
  default: (x: number, y: number, r: number) =>
    `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" fill="none" stroke="#e6ebef" stroke-width="2"/>`,
};

export const LEYENDA: { clave: keyof typeof SIMBOLOS; nombre: string }[] = [
  { clave: 'tanque', nombre: 'Tanque' },
  { clave: 'bomba', nombre: 'Bomba' },
  { clave: 'valvula', nombre: 'Válvula' },
  { clave: 'intercambiador', nombre: 'Intercambiador' },
  { clave: 'motor', nombre: 'Motor' },
  { clave: 'gabinete', nombre: 'Gabinete' },
  { clave: 'tuberia', nombre: 'Tubería' },
];