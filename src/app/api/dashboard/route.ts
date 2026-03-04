import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role === 'ADMIN') {
        const [totalProducts, totalCustomers, totalEmployees, totalOrders, orders, payments] = await Promise.all([
            prisma.product.count({ where: { agencyId: user.agencyId } }),
            prisma.user.count({ where: { role: 'CUSTOMER', agencyId: user.agencyId } }),
            prisma.user.count({ where: { role: 'EMPLOYEE', agencyId: user.agencyId } }),
            prisma.order.count({ where: { agencyId: user.agencyId } }),
            prisma.order.findMany({
                where: { agencyId: user.agencyId },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { customer: { select: { name: true } } },
            }),
            prisma.payment.aggregate({ where: { agencyId: user.agencyId }, _sum: { amount: true } }),
        ]);

        return NextResponse.json({
            stats: {
                totalProducts,
                totalCustomers,
                totalEmployees,
                totalOrders,
                totalRevenue: payments._sum.amount || 0,
            },
            recentOrders: orders,
        });
    }

    if (user.role === 'EMPLOYEE') {
        const [myOrders, myPayments] = await Promise.all([
            prisma.order.count({ where: { employeeId: user.id, agencyId: user.agencyId } }),
            prisma.payment.aggregate({ where: { employeeId: user.id, agencyId: user.agencyId }, _sum: { amount: true } }),
        ]);
        return NextResponse.json({
            stats: { myOrders, myPaymentsTotal: myPayments._sum.amount || 0 },
        });
    }

    if (user.role === 'CUSTOMER') {
        const [myOrders, pendingOrders] = await Promise.all([
            prisma.order.count({ where: { customerId: user.id, agencyId: user.agencyId } }),
            prisma.order.count({ where: { customerId: user.id, status: 'PENDING', agencyId: user.agencyId } }),
        ]);
        return NextResponse.json({
            stats: { myOrders, pendingOrders },
        });
    }

    return NextResponse.json({ stats: {} });
}
