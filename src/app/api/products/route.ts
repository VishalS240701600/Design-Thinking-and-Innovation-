import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const products = await prisma.product.findMany({
        where: user.role === 'ADMIN' ? undefined : { agencyId: user.agencyId },
        orderBy: { createdAt: 'desc' },
        include: user.role === 'ADMIN' ? { agency: { select: { name: true } } } : undefined
    });
    return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const { id, name, description, price, stock, unit, category, agencyId } = body;
    if (!name || price === undefined) return NextResponse.json({ error: 'Name and price required' }, { status: 400 });

    if (!id && !agencyId) return NextResponse.json({ error: 'Agency selection is required' }, { status: 400 });

    if (id) {
        // Global Admins can update any product, optionally we could check existence
        const product = await prisma.product.update({
            where: { id },
            data: { name, description, price: parseFloat(price), stock: parseInt(stock), unit, category, agencyId: agencyId ? parseInt(agencyId) : undefined },
        });
        return NextResponse.json(product);
    } else {
        const product = await prisma.product.create({
            data: { agencyId: parseInt(agencyId), name, description, price: parseFloat(price), stock: parseInt(stock) || 0, unit: unit || 'pcs', category },
        });
        return NextResponse.json(product);
    }
}

export async function DELETE(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const parsedId = parseInt(id);

    // Global Admin can delete any product
    await prisma.product.deleteMany({
        where: { id: parsedId }
    });
    return NextResponse.json({ success: true });
}
