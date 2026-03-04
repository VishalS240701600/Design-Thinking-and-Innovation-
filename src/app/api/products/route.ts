import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const products = await prisma.product.findMany({
        where: { agencyId: user.agencyId },
        orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const { id, name, description, price, stock, unit, category } = body;
    if (!name || price === undefined) return NextResponse.json({ error: 'Name and price required' }, { status: 400 });

    if (id) {
        // SECURITY PATCH: Ensure product belongs to the admin's agency
        const existing = await prisma.product.findFirst({ where: { id, agencyId: user.agencyId } });
        if (!existing) return NextResponse.json({ error: 'Product not found or unauthorized' }, { status: 404 });

        const product = await prisma.product.update({
            where: { id },
            data: { name, description, price: parseFloat(price), stock: parseInt(stock), unit, category },
        });
        return NextResponse.json(product);
    } else {
        const product = await prisma.product.create({
            data: { agencyId: user.agencyId, name, description, price: parseFloat(price), stock: parseInt(stock) || 0, unit: unit || 'pcs', category },
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

    // SECURITY PATCH: Delete product scoped to agency
    await prisma.product.deleteMany({
        where: { id: parsedId, agencyId: user.agencyId }
    });
    return NextResponse.json({ success: true });
}
