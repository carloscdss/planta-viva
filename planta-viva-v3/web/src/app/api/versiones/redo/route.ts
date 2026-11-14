import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const actual = await prisma.projectVersion.findFirst({ orderBy: { fecha: 'desc' } });
    // Buscar la siguiente versión (la que fue creada después de la actual si hubiéramos hecho undo)
    // En este modelo simple de snapshot, redo solo funciona si hay una versión hija directa
    const hijo = await prisma.projectVersion.findFirst({ 
      where: { padreId: actual?.id },
      orderBy: { fecha: 'asc' }
    });
    
    if (!hijo) return NextResponse.json({ error: "Nada que rehacer" }, { status: 404 });
    return NextResponse.json({ grafo: JSON.parse(hijo.grafoJson) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}