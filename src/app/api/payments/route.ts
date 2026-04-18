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
// Supports overpayment spillover: excess is applied to the customer's next unpaid orders
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

    // Single query: fetch the target order AND all sibling orders for the same customer
    // This eliminates a separate round-trip for the spillover path
    const order = await prisma.order.findUnique({
        where: { id: parsedOrderId },
        include: { payments: true }
    });

    if (!order || (user.role !== 'ADMIN' && order.agencyId !== user.agencyId)) {
        return NextResponse.json({ error: 'Order not found or unauthorized' }, { status: 404 });
    }

    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = order.totalAmount - totalPaid;

    // If payment fits within this order, handle simply (fast path)
    if (parsedAmount <= remainingBalance) {
        // Use a transaction to create payment + update status in one round-trip
        const payment = await prisma.$transaction(async (tx) => {
            const p = await tx.payment.create({
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

            if (totalPaid + parsedAmount >= order.totalAmount && order.status === 'PENDING') {
                await tx.order.update({
                    where: { id: parsedOrderId },
                    data: { status: 'COMPLETED' }
                });
            }

            return p;
        });

        return NextResponse.json(payment);
    }

    // --- Overpayment spillover: single transaction for everything ---
    try {
        const result = await prisma.$transaction(async (tx) => {
            // Fetch all unpaid orders for this customer inside the transaction (shares connection)
            const customerOrders = await tx.order.findMany({
                where: {
                    customerId: order.customerId,
                    agencyId: order.agencyId,
                    status: { not: 'COMPLETED' },
                },
                include: { payments: true },
                orderBy: { createdAt: 'asc' },
            });

            // Calculate total outstanding
            const totalOutstanding = customerOrders.reduce((sum, o) => {
                const paid = o.payments.reduce((s, p) => s + p.amount, 0);
                return sum + (o.totalAmount - paid);
            }, 0);

            if (parsedAmount > totalOutstanding) {
                throw new Error(`VALIDATION:Payment amount (₹${parsedAmount}) exceeds total outstanding balance across all orders (₹${totalOutstanding.toFixed(2)})`);
            }

            let remaining = parsedAmount;
            const createdPayments = [];
            const orderUpdates: Promise<unknown>[] = [];

            // Process selected order first, then the rest by oldest
            const sortedOrders = [
                customerOrders.find(o => o.id === parsedOrderId)!,
                ...customerOrders.filter(o => o.id !== parsedOrderId),
            ];

            for (const o of sortedOrders) {
                if (remaining <= 0) break;

                const paid = o.payments.reduce((s, p) => s + p.amount, 0);
                const balance = o.totalAmount - paid;
                if (balance <= 0) continue;

                const applyAmount = Math.min(remaining, balance);
                remaining = parseFloat((remaining - applyAmount).toFixed(2));

                // Fire payment create (don't await yet for parallelism within transaction)
                const paymentPromise = tx.payment.create({
                    data: {
                        agencyId: user.agencyId,
                        orderId: o.id,
                        employeeId: user.id,
                        amount: applyAmount,
                        method: method || 'CASH',
                        notes: notes
                            ? `${notes} (auto-distributed)`
                            : `Auto-distributed from payment on Order #${parsedOrderId}`,
                    },
                    include: {
                        order: { select: { id: true, totalAmount: true, customer: { select: { name: true } } } },
                    },
                });

                createdPayments.push(paymentPromise);

                // Queue order completion if fully paid
                if (paid + applyAmount >= o.totalAmount && o.status === 'PENDING') {
                    orderUpdates.push(tx.order.update({
                        where: { id: o.id },
                        data: { status: 'COMPLETED' },
                    }));
                }
            }

            // Await all in parallel
            const payments = await Promise.all(createdPayments);
            await Promise.all(orderUpdates);

            return payments;
        });

        // Return with spillover summary
        return NextResponse.json({
            ...result[0],
            spillover: result.length > 1,
            spilloverCount: result.length,
            spilloverDetails: result.map(p => ({
                orderId: p.order.id,
                amount: p.amount,
                customerName: p.order.customer.name,
            })),
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.startsWith('VALIDATION:')) {
            return NextResponse.json({ error: message.replace('VALIDATION:', '') }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
    }
}
