import { cookies } from 'next/headers';
import { adminAuth, adminDb } from './firebase-admin';

export interface AuthUser {
    id: string; // Firebase UID
    agencyId: string;
    themeColor: string;
    name: string;
    email: string;
    role: string;
}

export async function getAuthUser(): Promise<AuthUser | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) return null;

    try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        const userDoc = await adminDb.collection('users').doc(decodedClaims.uid).get();

        if (!userDoc.exists) return null;

        const userData = userDoc.data() as AuthUser;
        
        let themeColor = '#006591'; // default DistributeIQ theme
        if (userData.agencyId && userData.agencyId !== '0') {
            const agencyDoc = await adminDb.collection('agencies').doc(userData.agencyId).get();
            if (agencyDoc.exists) {
                themeColor = agencyDoc.data()?.themeColor || themeColor;
            }
        }

        return {
            id: decodedClaims.uid,
            agencyId: userData.agencyId,
            themeColor,
            name: userData.name,
            email: userData.email,
            role: userData.role,
        };
    } catch (error) {
        return null;
    }
}
