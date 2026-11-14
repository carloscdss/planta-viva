import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const GRAFO_SEMILLA = {
  meta: { nombre: 'Planta Piloto de Agua', version: '3.0.0' },
  equipos: [
    { uuid: 'e-tanque-01', tag: 'TNQ-101', familia: 'tanque', descriptorId: 'tanque-vertical', color: '#a5a5a5', dimensiones: { ancho: 1.6, alto: 2.4, profundidad: 1.6 }, posicion: [0, 1.2, 0], rotacionY: 0 },
    { uuid: 'e-bomba-01', tag: 'BOM-101', familia: 'bomba', descriptorId: 'bomba-centrifuga', color: '#a5a5a5', dimensiones: { ancho: 1.8, alto: 1.3, profundidad: 0.9 }, posicion: [3, 0.65, 0], rotacionY: 0 },
  ],
};

export async function GET() {
  try {
    let version = await prisma.projectVersion.findFirst({ orderBy: { fecha: 'desc' } });
    if (!version) {
      const proyecto = await prisma.project.create({
        data: { nombre: 'Planta Piloto de Agua', versiones: { create: { autor: 'Carlos', mensaje: 'Semilla inicial', grafoJson: JSON.stringify(GRAFO_SEMILLA) } } },
        include: { versiones: true },
      });
      version = proyecto.versiones[0];
    }
    return NextResponse.json({ grafo: JSON.parse(version.grafoJson) });
  } catch (error: any) {
    console.error('❌ ERROR REAL EN API GRAFO:', error);
    return NextResponse.json({ error: 'Error de Base de Datos', detalle: error.message, codigo: error.code }, { status: 500 });
  }
}