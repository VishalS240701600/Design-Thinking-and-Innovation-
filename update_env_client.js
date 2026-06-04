const fs = require('fs');

const envContent = `
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyCsTjMjcAiZRXCU5iVOAElazRQb2lSlBig"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="fmcg-distribution.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="fmcg-distribution"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="fmcg-distribution.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="644470241269"
NEXT_PUBLIC_FIREBASE_APP_ID="1:644470241269:web:e0fba364ccf726ed45d2bc"
`;

fs.appendFileSync('.env.local', envContent);
console.log('Added NEXT_PUBLIC_FIREBASE variables to .env.local');
