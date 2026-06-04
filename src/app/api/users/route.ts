import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (user.role !== 'ADMIN') {
        if (user.role === 'EMPLOYEE' && role === 'CUSTOMER') {
            // allowed
        } else {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    }

    let usersQuery: FirebaseFirestore.Query = adminDb.collection('users');

    if (user.role !== 'ADMIN') {
        usersQuery = usersQuery.where('agencyId', '==', user.agencyId);
    }
    if (role) {
        usersQuery = usersQuery.where('role', '==', role);
    }

    const snapshot = await usersQuery.orderBy('createdAt', 'desc').get();
    let users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (user.role === 'ADMIN') {
        const agenciesSnapshot = await adminDb.collection('agencies').get();
        const agenciesMap = new Map();
        agenciesSnapshot.forEach(doc => agenciesMap.set(doc.id, doc.data()));

        users = users.map(u => ({
            ...u,
            agency: { name: agenciesMap.get((u as any).agencyId)?.name || 'Unknown' }
        }));
    }

    return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, email, password, role, phone, address, agencyId } = body;

    if (!name || !email) {
        return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    if (!id && !agencyId) return NextResponse.json({ error: 'Agency selection is required' }, { status: 400 });

    try {
        if (id) {
            // Update
            const updateAuthData: any = {};
            if (name) updateAuthData.displayName = name;
            if (email) updateAuthData.email = email;
            if (password) updateAuthData.password = password;

            if (Object.keys(updateAuthData).length > 0) {
                await adminAuth.updateUser(id, updateAuthData);
            }

            if (role || agencyId) {
                const userRec = await adminAuth.getUser(id);
                const currentClaims = userRec.customClaims || {};
                await adminAuth.setCustomUserClaims(id, {
                    ...currentClaims,
                    role: role || currentClaims.role,
                    agencyId: agencyId ? String(agencyId) : currentClaims.agencyId
                });
            }

            const updateDbData: any = { name, email, role, phone: phone || null, address: address || null };
            if (agencyId) updateDbData.agencyId = String(agencyId);

            await adminDb.collection('users').doc(id).update(updateDbData);
            return NextResponse.json({ id, ...updateDbData });
        } else {
            // Create
            if (!password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });

            const userRecord = await adminAuth.createUser({
                email,
                password,
                displayName: name,
            });

            const newRole = role || 'CUSTOMER';
            await adminAuth.setCustomUserClaims(userRecord.uid, { role: newRole, agencyId: String(agencyId) });

            const newUser = {
                agencyId: String(agencyId),
                name,
                email,
                role: newRole,
                phone: phone || null,
                address: address || null,
                createdAt: new Date().toISOString()
            };

            await adminDb.collection('users').doc(userRecord.uid).set(newUser);
            return NextResponse.json({ id: userRecord.uid, ...newUser });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        await adminAuth.deleteUser(id);
        await adminDb.collection('users').doc(id).delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
