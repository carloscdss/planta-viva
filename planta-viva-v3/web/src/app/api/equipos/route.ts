import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const nuevoEquipo = await req.json();

    // 1. Obtener la versión más reciente del proyecto
    const versionActual = await prisma.projectVersion.findFirst({
      orderBy: { fecha: 'desc' },
      include: { project: true }
    });

    if (!versionActual) {
      return NextResponse.json({ error: "No hay proyecto base inicializado" }, { status: 404 });
    }

    const grafo = JSON.parse(versionActual.grafoJson);

    // 2. VALIDACIÓN CRÍTICA: Unicidad de Tag (Protección del Grafo)
    const tagExiste = grafo.equipos.some((e: any) => e.tag === nuevoEquipo.tag);
    if (tagExiste) {
      return NextResponse.json({ 
        error: `El tag '${nuevoEquipo.tag}' ya existe en la planta. Debe ser único.` 
      }, { status: 409 }); // 409 Conflict
    }

    // 3. Agregar el nuevo equipo al grafo en memoria
    grafo.equipos.push(nuevoEquipo);

    // 4. CREAR UNA NUEVA VERSIÓN (No actualizar la existente)
    // Esto preserva el historial, permite deshacer y usa el padreId correctamente.
    const nuevaVersion = await prisma.projectVersion.create({
      data: {
        projectId: versionActual.projectId,
        padreId: versionActual.id, // <-- La cadena de historial (Git-like)
        grafoJson: JSON.stringify(grafo),
        autor: "Carlos", // Idealmente, esto vendrá de tu sesión de Auth en el futuro
        mensaje: `Agregado equipo: ${nuevoEquipo.tag}`,
      },
    });

    return NextResponse.json({ 
      ok: true, 
      versionId: nuevaVersion.id, 
      equipo: nuevoEquipo 
    });

  } catch (error: any) {
    console.error("❌ ERROR EN API EQUIPOS:", error);
    return NextResponse.json({
      error: "Error guardando equipo",
      detalle: error.message
    }, { status: 500 });
  }
}