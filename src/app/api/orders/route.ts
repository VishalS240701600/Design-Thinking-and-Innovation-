import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
        const orderDoc = await adminDb.collection('orders').doc(id).get();
        if (!orderDoc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        
        const orderData = orderDoc.data()!;
        if (user.role !== 'ADMIN' && orderData.agencyId !== user.agencyId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (user.role === 'CUSTOMER' && orderData.customerId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (user.role === 'EMPLOYEE' && orderData.employeeId && orderData.employeeId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Fetch payments
        const paymentsSnap = await adminDb.collection('payments').where('orderId', '==', id).get();
        const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        let agency = undefined;
        if (user.role === 'ADMIN') {
            const agDoc = await adminDb.collection('agencies').doc(orderData.agencyId).get();
            agency = { name: agDoc.data()?.name || 'Unknown' };
        }

        return NextResponse.json({ ...orderData, id, payments, agency });
    }

    const status = searchParams.get('status');
    let ordersQuery: FirebaseFirestore.Query = adminDb.collection('orders');

    if (user.role !== 'ADMIN') {
        ordersQuery = ordersQuery.where('agencyId', '==', user.agencyId);
    }
    if (user.role === 'CUSTOMER') {
        ordersQuery = ordersQuery.where('customerId', '==', user.id);
    }
    if (status) {
        ordersQuery = ordersQuery.where('status', '==', status);
    }

    const ordersSnap = await ordersQuery.orderBy('createdAt', 'desc').get();
    let orders = await Promise.all(ordersSnap.docs.map(async doc => {
        const data = doc.data();
        const paymentsSnap = await adminDb.collection('payments').where('orderId', '==', doc.id).get();
        const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        return { id: doc.id, ...data, payments };
    }));

    if (user.role === 'ADMIN') {
        const agenciesSnapshot = await adminDb.collection('agencies').get();
        const agenciesMap = new Map();
        agenciesSnapshot.forEach(doc => agenciesMap.set(doc.id, doc.data()));

        orders = orders.map(o => ({
            ...o,
            agency: { name: agenciesMap.get((o as any).agencyId)?.name || 'Unknown' }
        }));
    }

    return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { customerId, items, notes } = body;

    if (!items || items.length === 0) {
        return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    try {
        const orderData = await adminDb.runTransaction(async (t) => {
            // Read products
            const productDocs = await Promise.all(items.map((i: any) => t.get(adminDb.collection('products').doc(i.productId))));
            
            let totalAmount = 0;
            const orderItems = [];

            for (let idx = 0; idx < productDocs.length; idx++) {
                const pDoc = productDocs[idx];
                const item = items[idx];
                
                if (!pDoc.exists) throw new Error(`Product ${item.productId} not found`);
                const product = pDoc.data()!;
                if (product.agencyId !== user.agencyId) throw new Error(`Product ${item.productId} unauthorized`);

                const price = product.price * item.quantity;
                totalAmount += price;
                
                orderItems.push({
                    productId: pDoc.id,
                    quantity: item.quantity,
                    price: product.price,
                    product: { name: product.name, unit: product.unit } // denormalized for easy rendering
                });

                // Prepare stock decrement
                t.update(pDoc.ref, { stock: (product.stock || 0) - item.quantity });
            }

            // Fetch customer name for denormalization
            const actualCustomerId = user.role === 'CUSTOMER' ? user.id : (customerId || user.id);
            const customerDoc = await t.get(adminDb.collection('users').doc(actualCustomerId));
            const customerName = customerDoc.exists ? customerDoc.data()?.name : 'Unknown';

            let employeeName = undefined;
            if (user.role === 'EMPLOYEE') {
                employeeName = user.name;
            }

            const newOrderRef = adminDb.collection('orders').doc();
            const newOrder = {
                agencyId: user.agencyId,
                customerId: actualCustomerId,
                customer: { id: actualCustomerId, name: customerName },
                employeeId: user.role === 'EMPLOYEE' ? user.id : null,
                employee: user.role === 'EMPLOYEE' ? { id: user.id, name: employeeName } : null,
                totalAmount,
                notes: notes || null,
                status: 'PENDING',
                items: orderItems,
                createdAt: new Date().toISOString()
            };

            t.set(newOrderRef, newOrder);
            return { id: newOrderRef.id, ...newOrder };
        });

        return NextResponse.json(orderData);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function PUT(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || !['ADMIN', 'EMPLOYEE'].includes(user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;
    if (!id || !status) return NextResponse.json({ error: 'ID and status required' }, { status: 400 });

    const orderRef = adminDb.collection('orders').doc(id);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (user.role !== 'ADMIN' && orderDoc.data()?.agencyId !== user.agencyId) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    await orderRef.update({ status });
    return NextResponse.json({ id, status });
}
