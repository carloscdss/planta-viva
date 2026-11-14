// src/app/api/conexiones/bombeo/route.ts — POST: activa/desactiva el flujo en todas las conexiones
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { activo } = await req.json();
    if (typeof activo !== 'boolean') return NextResponse.json({ error: 'Falta booleano activo' }, { status: 400 });

    const version = await prisma.projectVersion.findFirst({ orderBy: { fecha: 'desc' } });
    if (!version) return NextResponse.json({ error: 'Sin versión base' }, { status: 404 });

    const grafo = JSON.parse(version.grafoJson);
    grafo.conexiones = (grafo.conexiones ?? []).map((c: any) => ({ ...c, activo }));

    await prisma.projectVersion.create({
      data: {
        projectId: version.projectId,
        padreId: version.id,
        autor: 'Carlos',
        mensaje: activo ? 'Bombeo ACTIVADO' : 'Bombeo DETENIDO',
        grafoJson: JSON.stringify(grafo),
      },
    });

    return NextResponse.json({ ok: true, activo, total: grafo.conexiones.length });
  } catch (error: any) {
    console.error('❌ ERROR API BOMBEO:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}