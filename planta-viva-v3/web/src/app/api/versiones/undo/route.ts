import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const actual = await prisma.projectVersion.findFirst({ orderBy: { fecha: 'desc' } });
    if (!actual || !actual.padreId) return NextResponse.json({ error: "Nada que deshacer" }, { status: 404 });
    
    const padre = await prisma.projectVersion.findUnique({ where: { id: actual.padreId } });
    if (!padre) return NextResponse.json({ error: "Versión padre no encontrada" }, { status: 404 });

    return NextResponse.json({ grafo: JSON.parse(padre.grafoJson) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}