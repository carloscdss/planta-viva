// src/app/api/equipos/sync/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { equipos } = await req.json();
    const version = await prisma.projectVersion.findFirst({ orderBy: { fecha: 'desc' } });
    if (!version) return NextResponse.json({ error: "Sin versión base" }, { status: 404 });

    await prisma.projectVersion.create({
      data: {
        projectId: version.projectId,
        padreId: version.id,
        autor: "Carlos",
        mensaje: "Sync automático",
        grafoJson: JSON.stringify({ meta: version.grafoJson ? JSON.parse(version.grafoJson).meta : {}, equipos })
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}