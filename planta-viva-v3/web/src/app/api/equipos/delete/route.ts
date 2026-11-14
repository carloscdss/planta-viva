import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  try {
    // Parseo seguro del cuerpo de la petición
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "El cuerpo de la petición no es un JSON válido" }, { status: 400 });
    }

    const { uuid } = body;
    
    if (!uuid || typeof uuid !== 'string') {
      return NextResponse.json({ error: "Falta el uuid del equipo o tiene formato incorrecto" }, { status: 400 });
    }

    // Obtener la última versión para leer el grafo actual
    const version = await prisma.projectVersion.findFirst({ orderBy: { fecha: 'desc' } });
    if (!version) return NextResponse.json({ error: "Sin versión base en la base de datos" }, { status: 404 });

    const grafo = JSON.parse(version.grafoJson);
    const idx = grafo.equipos.findIndex((e: any) => e.uuid === uuid);
    
    if (idx === -1) {
      return NextResponse.json({ error: "El equipo no existe en el grafo actual" }, { status: 404 });
    }

    // Extraer el equipo antes de borrarlo para usar su tag en el mensaje
    const equipoEliminado = grafo.equipos.splice(idx, 1)[0];

    // Crear nueva versión inmutable (historial)
    await prisma.projectVersion.create({
      data: {
        projectId: version.projectId,
        padreId: version.id,
        autor: "Carlos",
        mensaje: `Eliminado: ${equipoEliminado.tag}`,
        grafoJson: JSON.stringify(grafo)
      }
    });
    
    return NextResponse.json({ ok: true, tag: equipoEliminado.tag });
  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO EN DELETE:", error);
    return NextResponse.json({ error: error.message || "Error interno inesperado al eliminar" }, { status: 500 });
  }
}