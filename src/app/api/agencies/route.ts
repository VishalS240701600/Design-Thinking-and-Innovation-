import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const agencies = await prisma.agency.findMany({
            select: { id: true, name: true, themeColor: true },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(agencies);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch agencies' }, { status: 500 });
    }
}
