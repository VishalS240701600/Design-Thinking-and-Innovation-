import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
    try {
        const snapshot = await adminDb.collection('agencies').orderBy('name', 'asc').get();
        const agencies = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return NextResponse.json(agencies);
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch agencies' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN' || user.agencyId !== '0') {
        return NextResponse.json({ error: 'Only Global Admin can create agencies' }, { status: 403 });
    }

    const { name, themeColor } = await request.json();

    if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Agency name is required' }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await adminDb.collection('agencies').where('name', '==', name.trim()).limit(1).get();
    if (!existing.empty) {
        return NextResponse.json({ error: 'An agency with this name already exists' }, { status: 409 });
    }

    const docRef = await adminDb.collection('agencies').add({
        name: name.trim(),
        themeColor: themeColor || '#0066cc',
        createdAt: new Date().toISOString()
    });

    return NextResponse.json({ id: docRef.id, name: name.trim(), themeColor: themeColor || '#0066cc' }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN' || user.agencyId !== '0') {
        return NextResponse.json({ error: 'Only Global Admin can delete agencies' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ error: 'Agency ID is required' }, { status: 400 });
    }

    await adminDb.collection('agencies').doc(id).delete();
    return NextResponse.json({ success: true });
}
