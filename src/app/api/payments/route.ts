import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    let paymentsQuery: FirebaseFirestore.Query = adminDb.collection('payments');

    if (user.role !== 'ADMIN') paymentsQuery = paymentsQuery.where('agencyId', '==', user.agencyId);
    if (user.role === 'EMPLOYEE') paymentsQuery = paymentsQuery.where('employeeId', '==', user.id);
    if (orderId) paymentsQuery = paymentsQuery.where('orderId', '==', orderId);

    const snapshot = await paymentsQuery.orderBy('paymentDate', 'desc').get();
    let payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (user.role === 'ADMIN') {
        const agenciesSnapshot = await adminDb.collection('agencies').get();
        const agenciesMap = new Map();
        agenciesSnapshot.forEach(doc => agenciesMap.set(doc.id, doc.data()));

        payments = payments.map(p => ({
            ...p,
            agency: { name: agenciesMap.get((p as any).agencyId)?.name || 'Unknown' }
        }));
    }

    return NextResponse.json(payments);
}

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

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
        return NextResponse.json({ error: 'Payment amount must be greater than 0' }, { status: 400 });
    }

    try {
        const result = await adminDb.runTransaction(async (t) => {
            // Read target order
            const orderDoc = await t.get(adminDb.collection('orders').doc(orderId));
            if (!orderDoc.exists) throw new Error('Order not found');
            const targetOrder = { id: orderDoc.id, ...orderDoc.data()! } as any;

            if (user.role !== 'ADMIN' && targetOrder.agencyId !== user.agencyId) {
                throw new Error('Order unauthorized');
            }

            // Read target order's payments to get current balance
            const targetPaymentsSnap = await t.get(adminDb.collection('payments').where('orderId', '==', orderId));
            const totalPaidTarget = targetPaymentsSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
            const remainingTarget = targetOrder.totalAmount - totalPaidTarget;

            // Fast path: fits inside this order
            if (parsedAmount <= remainingTarget) {
                const newPaymentRef = adminDb.collection('payments').doc();
                const paymentData = {
                    agencyId: user.agencyId,
                    orderId: orderId,
                    employeeId: user.id,
                    amount: parsedAmount,
                    method: method || 'CASH',
                    notes: notes || null,
                    paymentDate: new Date().toISOString(),
                    order: { totalAmount: targetOrder.totalAmount, customer: { name: targetOrder.customer?.name } },
                    employee: { id: user.id, name: user.name }
                };
                t.set(newPaymentRef, paymentData);

                if (totalPaidTarget + parsedAmount >= targetOrder.totalAmount && targetOrder.status === 'PENDING') {
                    t.update(orderDoc.ref, { status: 'COMPLETED' });
                }

                return [{ id: newPaymentRef.id, ...paymentData }];
            }

            // Spillover path: fetch all unpaid orders for this customer
            const customerOrdersSnap = await t.get(
                adminDb.collection('orders')
                    .where('customerId', '==', targetOrder.customerId)
                    .where('agencyId', '==', targetOrder.agencyId)
                    .where('status', 'in', ['PENDING']) // Simple equivalent for { not: 'COMPLETED' } if pending is the only unpaid state, else we must fetch all and filter
            );

            // Fetch payments for ALL these orders inside transaction
            // We can do this efficiently by fetching payments where orderId IN [...] 
            // but Firestore IN supports max 10. For simplicity, fetch all payments for these orders one by one
            const orderBalances = [];
            for (const oDoc of customerOrdersSnap.docs) {
                const oData = { id: oDoc.id, ...oDoc.data()! } as any;
                // Exclude COMPLETED just in case
                if (oData.status === 'COMPLETED') continue;

                const pSnap = await t.get(adminDb.collection('payments').where('orderId', '==', oDoc.id));
                const paid = pSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
                orderBalances.push({ order: oData, orderRef: oDoc.ref, balance: oData.totalAmount - paid });
            }

            const totalOutstanding = orderBalances.reduce((sum, ob) => sum + ob.balance, 0);

            if (parsedAmount > totalOutstanding) {
                throw new Error(`VALIDATION:Invalid amount exceeds existing balance. Payment ₹${parsedAmount} exceeds total outstanding ₹${totalOutstanding.toFixed(2)}`);
            }

            let remaining = parsedAmount;
            const createdPayments = [];

            // Sort logic: target order first, then by balance asc
            const selectedOB = orderBalances.find(ob => ob.order.id === orderId);
            if (!selectedOB) throw new Error('Target order not found in unpaid list (maybe already paid)');

            const othersSorted = orderBalances
                .filter(ob => ob.order.id !== orderId)
                .sort((a, b) => a.balance - b.balance);
            
            const sortedOrders = [selectedOB, ...othersSorted];

            for (const ob of sortedOrders) {
                if (remaining <= 0) break;
                if (ob.balance <= 0) continue;

                const applyAmount = Math.min(remaining, ob.balance);
                remaining = parseFloat((remaining - applyAmount).toFixed(2));

                const newPaymentRef = adminDb.collection('payments').doc();
                const paymentData = {
                    agencyId: user.agencyId,
                    orderId: ob.order.id,
                    employeeId: user.id,
                    amount: applyAmount,
                    method: method || 'CASH',
                    notes: notes ? `${notes} (auto-distributed)` : `Auto-distributed from payment on Order #${orderId}`,
                    paymentDate: new Date().toISOString(),
                    order: { totalAmount: ob.order.totalAmount, customer: { name: ob.order.customer?.name } },
                    employee: { id: user.id, name: user.name }
                };
                t.set(newPaymentRef, paymentData);
                createdPayments.push({ id: newPaymentRef.id, ...paymentData });

                if (ob.balance - applyAmount <= 0 && ob.order.status === 'PENDING') {
                    t.update(ob.orderRef, { status: 'COMPLETED' });
                }
            }

            return createdPayments;
        });

        if (result.length === 1) {
            return NextResponse.json(result[0]);
        }

        return NextResponse.json({
            ...result[0],
            spillover: true,
            spilloverCount: result.length,
            spilloverDetails: result.map((p: any) => ({
                orderId: p.orderId,
                amount: p.amount,
                customerName: p.order.customer.name,
            })),
        });

    } catch (err: any) {
        if (err.message.startsWith('VALIDATION:')) {
            return NextResponse.json({ error: err.message.replace('VALIDATION:', '') }, { status: 400 });
        }
        return NextResponse.json({ error: err.message || 'Failed to process payment' }, { status: 500 });
    }
}
