import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { action, name, email, password, role, agencyId, idToken } = body;

    if (action === 'register') {
        if (!name || !email || !password || !agencyId) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const agencyIdStr = String(agencyId);
        
        // Check if email exists in this agency (we allow same email in different agencies? Firebase Auth requires globally unique emails unless we use identity platform multitenancy, but let's assume globally unique for simplicity)
        try {
            await adminAuth.getUserByEmail(email);
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
        } catch (e: any) {
            // User does not exist, we can proceed
            if (e.code !== 'auth/user-not-found') {
                return NextResponse.json({ error: 'Error checking user' }, { status: 500 });
            }
        }

        if (role && role.toUpperCase() === 'ADMIN') {
            return NextResponse.json({ error: 'Admin registration is not allowed.' }, { status: 403 });
        }

        const validRole = role && ['CUSTOMER', 'EMPLOYEE'].includes(role.toUpperCase()) ? role.toUpperCase() : 'CUSTOMER';

        try {
            const userRecord = await adminAuth.createUser({
                email,
                password,
                displayName: name,
            });

            // Set custom claims (optional, but good for security rules)
            await adminAuth.setCustomUserClaims(userRecord.uid, { role: validRole, agencyId: agencyIdStr });

            // Store user in Firestore
            await adminDb.collection('users').doc(userRecord.uid).set({
                agencyId: agencyIdStr,
                name,
                email,
                role: validRole,
                createdAt: new Date().toISOString()
            });

            // We cannot automatically sign them in server-side with Firebase Admin.
            // The client will need to sign in using the Firebase Client SDK.
            return NextResponse.json({
                success: true,
                message: 'Registration successful. Please log in.',
                user: { id: userRecord.uid, agencyId: agencyIdStr, name, email, role: validRole },
            });
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    if (action === 'session') {
        if (!idToken) {
            return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
        }

        try {
            // Verify the ID token and get the UID
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            
            // Create a session cookie (expires in 7 days)
            const expiresIn = 60 * 60 * 24 * 7 * 1000;
            const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

            const response = NextResponse.json({ success: true });
            response.cookies.set('session', sessionCookie, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });

            // Fetch user data to return to client
            const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                return NextResponse.json({
                    user: { id: decodedToken.uid, ...userData }
                });
            }

            return response;
        } catch (error) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
    }

    if (action === 'logout') {
        const response = NextResponse.json({ success: true });
        response.cookies.delete('session');
        return response;
    }

    if (action === 'me') {
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) {
            return NextResponse.json({ user: null });
        }
        
        try {
            const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
            const userDoc = await adminDb.collection('users').doc(decodedClaims.uid).get();

            if (!userDoc.exists) return NextResponse.json({ user: null });

            const userData = userDoc.data();
            
            let themeColor = '#006591';
            if (userData?.agencyId && userData.agencyId !== '0') {
                const agencyDoc = await adminDb.collection('agencies').doc(userData.agencyId).get();
                if (agencyDoc.exists) {
                    themeColor = agencyDoc.data()?.themeColor || themeColor;
                }
            }

            return NextResponse.json({
                user: {
                    id: decodedClaims.uid,
                    agencyId: userData?.agencyId,
                    themeColor,
                    name: userData?.name,
                    email: userData?.email,
                    role: userData?.role,
                }
            });
        } catch (error) {
            return NextResponse.json({ user: null });
        }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
