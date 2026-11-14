// src/app/api/equipos/mover/route.ts — PUT: actualiza posición/rotación de un equipo
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
  try {
    const { uuid, posicion, rotacionY } = await req.json();
    if (!uuid || !Array.isArray(posicion) || typeof rotacionY !== 'number') {
      return NextResponse.json({ error: 'Faltan uuid, posicion o rotacionY' }, { status: 400 });
    }

    const version = await prisma.projectVersion.findFirst({ orderBy: { fecha: 'desc' } });
    if (!version) return NextResponse.json({ error: 'Sin versión base' }, { status: 404 });

    const grafo = JSON.parse(version.grafoJson);
    const idx = grafo.equipos.findIndex((e: any) => e.uuid === uuid);
    if (idx === -1) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });

    grafo.equipos[idx].posicion = posicion;
    grafo.equipos[idx].rotacionY = rotacionY;

    await prisma.projectVersion.create({
      data: {
        projectId: version.projectId,
        padreId: version.id,
        autor: 'Carlos',
        mensaje: `Movido: ${grafo.equipos[idx].tag}`,
        grafoJson: JSON.stringify(grafo),
      },
    });

    return NextResponse.json({ ok: true, tag: grafo.equipos[idx].tag });
  } catch (error: any) {
    console.error('❌ ERROR API MOVER:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}