import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role === 'ADMIN') {
        const [
            productsCount, 
            customersCount, 
            employeesCount, 
            ordersCount, 
            ordersSnap, 
            paymentsAgg
        ] = await Promise.all([
            adminDb.collection('products').count().get(),
            adminDb.collection('users').where('role', '==', 'CUSTOMER').count().get(),
            adminDb.collection('users').where('role', '==', 'EMPLOYEE').count().get(),
            adminDb.collection('orders').count().get(),
            adminDb.collection('orders').orderBy('createdAt', 'desc').limit(10).get(),
            adminDb.collection('payments').aggregate({ totalAmount: admin.firestore.AggregateField.sum('amount') }).get()
        ]);

        const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        return NextResponse.json({
            stats: {
                totalProducts: productsCount.data().count,
                totalCustomers: customersCount.data().count,
                totalEmployees: employeesCount.data().count,
                totalOrders: ordersCount.data().count,
                totalRevenue: paymentsAgg.data().totalAmount || 0,
            },
            recentOrders: orders,
        });
    }

    if (user.role === 'EMPLOYEE') {
        const [myOrdersCount, myPaymentsAgg] = await Promise.all([
            adminDb.collection('orders').where('employeeId', '==', user.id).where('agencyId', '==', user.agencyId).count().get(),
            adminDb.collection('payments').where('employeeId', '==', user.id).where('agencyId', '==', user.agencyId).aggregate({ totalAmount: admin.firestore.AggregateField.sum('amount') }).get(),
        ]);
        return NextResponse.json({
            stats: { 
                myOrders: myOrdersCount.data().count, 
                myPaymentsTotal: myPaymentsAgg.data().totalAmount || 0 
            },
        });
    }

    if (user.role === 'CUSTOMER') {
        const [myOrdersCount, pendingOrdersCount] = await Promise.all([
            adminDb.collection('orders').where('customerId', '==', user.id).where('agencyId', '==', user.agencyId).count().get(),
            adminDb.collection('orders').where('customerId', '==', user.id).where('status', '==', 'PENDING').where('agencyId', '==', user.agencyId).count().get(),
        ]);
        return NextResponse.json({
            stats: { 
                myOrders: myOrdersCount.data().count, 
                pendingOrders: pendingOrdersCount.data().count 
            },
        });
    }

    return NextResponse.json({ stats: {} });
}
