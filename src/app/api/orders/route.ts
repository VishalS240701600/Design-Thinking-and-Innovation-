import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET orders — admin gets all, employee gets their own, customer gets their own
export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
        let where: Record<string, unknown> = { id: parseInt(id) };
        if (user.role !== 'ADMIN') where.agencyId = user.agencyId;

        if (user.role === 'CUSTOMER') where.customerId = user.id;
        if (user.role === 'EMPLOYEE') where.employeeId = user.id;

        const order = await prisma.order.findFirst({
            where,
            include: {
                items: { include: { product: { select: { name: true, price: true, unit: true } } } },
                customer: { select: { name: true, email: true, phone: true } },
                employee: { select: { name: true } },
                payments: true,
                ...(user.role === 'ADMIN' ? { agency: { select: { name: true } } } : {})
            }
        });
        if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(order);
    }

    const status = searchParams.get('status');

    let where: Record<string, unknown> = {};
    if (user.role !== 'ADMIN') {
        where.agencyId = user.agencyId;
    }
    if (user.role === 'CUSTOMER') where.customerId = user.id;
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
        where,
        include: {
            customer: { select: { id: true, name: true, email: true } },
            employee: { select: { id: true, name: true } },
            items: { include: { product: { select: { name: true, unit: true } } } },
            payments: true,
            ...(user.role === 'ADMIN' ? { agency: { select: { name: true } } } : {})
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
export async function PUT(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || !['ADMIN', 'EMPLOYEE'].includes(user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;
    if (!id || !status) return NextResponse.json({ error: 'ID and status required' }, { status: 400 });

    const existing = await prisma.order.findFirst({ where: { id: parseInt(id), ...(user.role !== 'ADMIN' ? { agencyId: user.agencyId } : {}) } });
    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const order = await prisma.order.update({
        where: { id: parseInt(id) },
        data: { status }
    });
    return NextResponse.json(order);
}
