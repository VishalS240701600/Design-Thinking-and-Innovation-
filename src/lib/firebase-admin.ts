import * as admin from 'firebase-admin';

function formatPrivateKey(key: string | undefined): string {
    if (!key) return '';
    const base64Key = key
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/[^a-zA-Z0-9+/=]/g, ''); // Strip everything except valid base64 chars
    
    const chunks = base64Key.match(/.{1,64}/g) || [];
    return `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        }),
    });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
