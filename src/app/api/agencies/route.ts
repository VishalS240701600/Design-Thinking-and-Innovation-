import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

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

// POST: Create a new agency (Global Admin only)
export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN' || user.agencyId !== 0) {
        return NextResponse.json({ error: 'Only Global Admin can create agencies' }, { status: 403 });
    }

    const { name, themeColor } = await request.json();

    if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Agency name is required' }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await prisma.agency.findUnique({ where: { name: name.trim() } });
    if (existing) {
        return NextResponse.json({ error: 'An agency with this name already exists' }, { status: 409 });
    }

    const agency = await prisma.agency.create({
        data: {
            name: name.trim(),
            themeColor: themeColor || '#0066cc',
        }
    });

    return NextResponse.json(agency, { status: 201 });
}

// DELETE: Remove an agency (Global Admin only)
export async function DELETE(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN' || user.agencyId !== 0) {
        return NextResponse.json({ error: 'Only Global Admin can delete agencies' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ error: 'Agency ID is required' }, { status: 400 });
    }

    await prisma.agency.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
}
