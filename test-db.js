require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('DATABASE_URL:', process.env.DATABASE_URL);

try {
    const p = new PrismaClient();
    console.log('PrismaClient created');
    p.$connect()
        .then(() => {
            console.log('Connected!');
            return p.user.findMany();
        })
        .then(users => {
            console.log('Users found:', users.length);
        })
        .catch(e => {
            console.error('Query error:', e.message);
            console.error('Full:', JSON.stringify(e, null, 2));
        })
        .finally(() => p.$disconnect());
} catch (e) {
    console.error('Init error:', e.message);
}
