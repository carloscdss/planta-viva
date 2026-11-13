import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const GRAFO_SEMILLA = {
  meta: { nombre: "Planta Piloto de Agua", version: "3.0.0" },
  equipos: [
    { uuid: "e-tanque-01", tag: "TNQ-101", familia: "tanque", posicion: [0, 1.2, 0], dimensiones: { radio: 1, alto: 2.4 }, color: "#aaaaaa" },
    { uuid: "e-bomba-01", tag: "BOM-101", familia: "bomba", posicion: [3, 0.5, 0], dimensiones: { largo: 1, alto: 1, fondo: 1 }, color: "#d97706" }
  ]
};

export async function GET() {
  try {
    let version = await prisma.projectVersion.findFirst({
      orderBy: { fecha: 'desc' }
    });

    if (!version) {
      console.log("Creando semilla...");
      const proyecto = await prisma.project.create({
        data: {
          nombre: "Planta Piloto de Agua",
          versiones: {
            create: {
              autor: "Carlos",
              mensaje: "Semilla inicial",
              grafoJson: JSON.stringify(GRAFO_SEMILLA)
            }
          }
        },
        include: { versiones: true }
      });
      version = proyecto.versiones[0];
    }

    return NextResponse.json({ grafo: JSON.parse(version.grafoJson) });
  } catch (error: any) {
    console.error("❌ ERROR REAL EN API GRAFO:", error);
    return NextResponse.json({ 
      error: "Error de Base de Datos", 
      detalle: error.message,
      codigo: error.code 
    }, { status: 500 });
  }
}