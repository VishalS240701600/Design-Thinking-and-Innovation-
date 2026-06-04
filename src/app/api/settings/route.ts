import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const doc = await adminDb.collection('agencies').doc(String(user.agencyId)).get();
    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, themeColor } = await request.json();

    if (!name || !themeColor) {
        return NextResponse.json({ error: 'Name and Theme Color are required' }, { status: 400 });
    }

    await adminDb.collection('agencies').doc(String(user.agencyId)).update({
        name,
        themeColor
    });

    return NextResponse.json({ id: String(user.agencyId), name, themeColor });
}
