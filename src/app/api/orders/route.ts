import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET orders — admin gets all, employee gets their own, customer gets their own
export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let where: Record<string, unknown> = { agencyId: user.agencyId };
    if (user.role === 'CUSTOMER') where.customerId = user.id;
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
        where,
        include: {
            customer: { select: { id: true, name: true, email: true } },
            employee: { select: { id: true, name: true } },
            items: { include: { product: { select: { name: true, unit: true } } } },
            payments: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
}

// POST order
export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { customerId, items, notes } = body;

    if (!items || items.length === 0) {
        return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Fetch product prices to calculate total
    // SECURITY PATCH: Only fetch products belonging to this agency
    const productIds = items.map((i: { productId: number }) => i.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds }, agencyId: user.agencyId }
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalAmount = 0;
    const orderItems = items.map((item: { productId: number; quantity: number }) => {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);
        const price = product.price * item.quantity;
        totalAmount += price;
        return { productId: item.productId, quantity: item.quantity, price: product.price };
    });

    const order = await prisma.order.create({
        data: {
            agencyId: user.agencyId,
            customerId: user.role === 'CUSTOMER' ? user.id : (customerId || user.id),
            employeeId: user.role === 'EMPLOYEE' ? user.id : undefined,
            totalAmount,
            notes,
            items: { create: orderItems },
        },
        include: {
            items: { include: { product: true } },
            customer: { select: { name: true } },
        },
    });

    // Reduce stock
    for (const item of items) {
        await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
        });
    }

    return NextResponse.json(order);
}

// PATCH: update order status (admin only)
export async function PATCH(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;

    // SECURITY PATCH: Check order ownership before updating status
    const existing = await prisma.order.findFirst({ where: { id, agencyId: user.agencyId } });
    if (!existing) return NextResponse.json({ error: 'Order not found or unauthorized' }, { status: 404 });

    const order = await prisma.order.update({
        where: { id },
        data: { status },
    });

    return NextResponse.json(order);
}
