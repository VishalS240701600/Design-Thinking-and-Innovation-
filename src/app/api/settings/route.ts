import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const agency = await prisma.agency.findUnique({
        where: { id: user.agencyId }
    });

    return NextResponse.json(agency);
}

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, themeColor } = await request.json();

    if (!name || !themeColor) {
        return NextResponse.json({ error: 'Name and Theme Color are required' }, { status: 400 });
    }

    const agency = await prisma.agency.update({
        where: { id: user.agencyId },
        data: { name, themeColor }
    });

    return NextResponse.json(agency);
}
