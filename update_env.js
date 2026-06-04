const fs = require('fs');
const sa = require('C:/Users/S Vishal/Downloads/fmcg-distribution-firebase-adminsdk-fbsvc-72f742cff3.json');

let envLocal = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf-8') : '';

envLocal += `\nFIREBASE_PROJECT_ID="${sa.project_id}"\n`;
envLocal += `FIREBASE_CLIENT_EMAIL="${sa.client_email}"\n`;
envLocal += `FIREBASE_PRIVATE_KEY="${sa.private_key.replace(/\n/g, '\\n')}"\n`;

fs.writeFileSync('.env.local', envLocal);
console.log('Added Firebase Admin credentials to .env.local');
