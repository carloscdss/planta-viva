import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const nuevoEquipo = await req.json();

    const version = await prisma.projectVersion.findFirst({
      orderBy: { fecha: 'desc' }
    });

    if (!version) {
      return NextResponse.json({ error: "No hay proyecto base" }, { status: 404 });
    }

    const grafo = JSON.parse(version.grafoJson);
    grafo.equipos.push(nuevoEquipo);

    await prisma.projectVersion.update({
      where: { id: version.id },
      data: { grafoJson: JSON.stringify(grafo) }
    });

    return NextResponse.json({ ok: true, equipo: nuevoEquipo });
  } catch (error: any) {
    console.error("❌ ERROR REAL EN API EQUIPOS:", error);
    return NextResponse.json({ 
      error: "Error guardando equipo", 
      detalle: error.message 
    }, { status: 500 });
  }
}