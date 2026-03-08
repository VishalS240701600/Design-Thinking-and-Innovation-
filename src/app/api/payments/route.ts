import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET payments — admin gets all, employee gets their own
export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let where: Record<string, unknown> = user.role === 'ADMIN' ? {} : { agencyId: user.agencyId };

    // CUSTOMER payment viewing (futureproofing, though normally EMP/ADMIN only)
    // if (user.role === 'CUSTOMER') ...
    // EMPLOYEE sees their own collected payments unless they need to see agency
    if (user.role === 'EMPLOYEE') where.employeeId = user.id;

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    if (orderId) where.orderId = parseInt(orderId);

    const payments = await prisma.payment.findMany({
        where,
        include: {
            order: { select: { id: true, totalAmount: true, customer: { select: { name: true } } } },
            employee: { select: { id: true, name: true } },
            ...(user.role === 'ADMIN' ? { agency: { select: { name: true } } } : {})
        },
        orderBy: { paymentDate: 'desc' },
    });

    return NextResponse.json(payments);
}

// POST payment (employee only)
export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, amount, method, notes } = body;

    if (!orderId || !amount) {
        return NextResponse.json({ error: 'Order ID and amount are required' }, { status: 400 });
    }

    const parsedOrderId = parseInt(orderId);
    const parsedAmount = parseFloat(amount);

    if (parsedAmount <= 0) {
        return NextResponse.json({ error: 'Payment amount must be greater than 0' }, { status: 400 });
    }

    // SECURITY PATCH: Ensure the order being paid belongs to the employee's agency
    const order = await prisma.order.findUnique({
        where: { id: parsedOrderId },
        include: { payments: true }
    });

    if (!order || (user.role !== 'ADMIN' && order.agencyId !== user.agencyId)) {
        return NextResponse.json({ error: 'Order not found or unauthorized' }, { status: 404 });
    }

    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = order.totalAmount - totalPaid;

    if (parsedAmount > remainingBalance) {
        return NextResponse.json({
            error: `Payment amount (₹${parsedAmount}) exceeds remaining balance (₹${remainingBalance})`
        }, { status: 400 });
    }

    const payment = await prisma.payment.create({
        data: {
            agencyId: user.agencyId,
            orderId: parsedOrderId,
            employeeId: user.id,
            amount: parsedAmount,
            method: method || 'CASH',
            notes,
        },
        include: {
            order: { select: { totalAmount: true, customer: { select: { name: true } } } },
        },
    });

    // Auto-update order status if fully paid
    if (totalPaid + parsedAmount >= order.totalAmount && order.status === 'PENDING') {
        await prisma.order.update({
            where: { id: parsedOrderId },
            data: { status: 'COMPLETED' }
        });
    }

    return NextResponse.json(payment);
}
