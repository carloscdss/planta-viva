// src/app/api/conexiones/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** POST: crear conexión (valida que ambos equipos existan). */
export async function POST(req: Request) {
  try {
    const c = await req.json();
    if (!c.id || !c.equipoA || !c.puertoA || !c.equipoB || !c.puertoB) {
      return NextResponse.json({ error: 'Conexión incompleta' }, { status: 400 });
    }

    const version = await prisma.projectVersion.findFirst({ orderBy: { fecha: 'desc' } });
    if (!version) return NextResponse.json({ error: 'Sin versión base' }, { status: 404 });

    const grafo = JSON.parse(version.grafoJson);
    grafo.conexiones = grafo.conexiones ?? [];

    const existe = grafo.conexiones.some((x: any) => x.id === c.id);
    if (existe) return NextResponse.json({ error: 'Conexión duplicada' }, { status: 409 });

    const tieneEquipo = (id: string) => grafo.equipos.some((e: any) => e.uuid === id);
    if (!tieneEquipo(c.equipoA) || !tieneEquipo(c.equipoB)) {
      return NextResponse.json({ error: 'Uno de los equipos no existe en el grafo' }, { status: 400 });
    }

    grafo.conexiones.push(c);

    await prisma.projectVersion.create({
      data: {
        projectId: version.projectId,
        padreId: version.id,
        autor: 'Carlos',
        mensaje: `Conexión: ${c.puertoA} → ${c.puertoB}`,
        grafoJson: JSON.stringify(grafo),
      },
    });

    return NextResponse.json({ ok: true, id: c.id });
  } catch (error: any) {
    console.error('❌ ERROR API CONEXIONES:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** DELETE: eliminar una conexión por id, o todas de un equipo por { equipoUuid }. */
export async function DELETE(req: Request) {
  try {
    const { id, equipoUuid } = await req.json();
    const version = await prisma.projectVersion.findFirst({ orderBy: { fecha: 'desc' } });
    if (!version) return NextResponse.json({ error: 'Sin versión base' }, { status: 404 });

    const grafo = JSON.parse(version.grafoJson);
    const antes = (grafo.conexiones ?? []).length;

    if (id) {
      grafo.conexiones = (grafo.conexiones ?? []).filter((c: any) => c.id !== id);
    } else if (equipoUuid) {
      grafo.conexiones = (grafo.conexiones ?? []).filter(
        (c: any) => c.equipoA !== equipoUuid && c.equipoB !== equipoUuid
      );
    }

    if ((grafo.conexiones ?? []).length === antes) {
      return NextResponse.json({ ok: true, mensaje: 'Nada que borrar' });
    }

    await prisma.projectVersion.create({
      data: {
        projectId: version.projectId,
        padreId: version.id,
        autor: 'Carlos',
        mensaje: equipoUuid ? `Limpia conexiones de ${equipoUuid}` : 'Conexión eliminada',
        grafoJson: JSON.stringify(grafo),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}