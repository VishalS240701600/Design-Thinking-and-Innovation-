import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        let productsRef: FirebaseFirestore.Query = adminDb.collection('products');
        
        if (user.role !== 'ADMIN') {
            productsRef = productsRef.where('agencyId', '==', user.agencyId);
        }

        const snapshot = await productsRef.orderBy('createdAt', 'desc').get();
        let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (user.role === 'ADMIN') {
            const agenciesSnapshot = await adminDb.collection('agencies').get();
            const agenciesMap = new Map();
            agenciesSnapshot.forEach(doc => agenciesMap.set(doc.id, doc.data()));

            products = products.map(p => ({
                ...p,
                agency: { name: agenciesMap.get((p as any).agencyId)?.name || 'Unknown' }
            }));
        }

        return NextResponse.json(products);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const { id, name, description, price, stock, unit, category, agencyId } = body;
    if (!name || price === undefined) return NextResponse.json({ error: 'Name and price required' }, { status: 400 });

    if (!id && !agencyId) return NextResponse.json({ error: 'Agency selection is required' }, { status: 400 });

    try {
        if (id) {
            const updateData: any = { name, description, price: parseFloat(price), stock: parseInt(stock), unit, category };
            if (agencyId) updateData.agencyId = String(agencyId);

            await adminDb.collection('products').doc(id).update(updateData);
            return NextResponse.json({ id, ...updateData });
        } else {
            const newProduct = {
                agencyId: String(agencyId),
                name,
                description: description || null,
                price: parseFloat(price),
                stock: parseInt(stock) || 0,
                unit: unit || 'pcs',
                category: category || null,
                createdAt: new Date().toISOString()
            };
            const docRef = await adminDb.collection('products').add(newProduct);
            return NextResponse.json({ id: docRef.id, ...newProduct });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save product' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await adminDb.collection('products').doc(id).delete();
    return NextResponse.json({ success: true });
}
