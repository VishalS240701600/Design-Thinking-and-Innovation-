require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database with Multi-Tenancy...');

    // Create Agencies
    const agencyA = await prisma.agency.upsert({
        where: { name: 'Alpha Agency' },
        update: {},
        create: { name: 'Alpha Agency', themeColor: '#0066cc' }
    });

    const agencyB = await prisma.agency.upsert({
        where: { name: 'Beta Distributors' },
        update: {},
        create: { name: 'Beta Distributors', themeColor: '#cc0066' }
    });

    console.log('Agencies created:', agencyA.name, agencyB.name);

    const adminPass = await bcrypt.hash('admin123', 10);
    const empPass = await bcrypt.hash('emp123', 10);
    const custPass = await bcrypt.hash('cust123', 10);

    // Seed Alpha Agency
    await prisma.user.upsert({
        where: { email_agencyId: { email: 'admin@alpha.com', agencyId: agencyA.id } },
        update: {},
        create: { agencyId: agencyA.id, name: 'Alpha Admin', email: 'admin@alpha.com', password: adminPass, role: 'ADMIN' },
    });
    await prisma.user.upsert({
        where: { email_agencyId: { email: 'emp@alpha.com', agencyId: agencyA.id } },
        update: {},
        create: { agencyId: agencyA.id, name: 'Alpha Employee', email: 'emp@alpha.com', password: empPass, role: 'EMPLOYEE', phone: '9876543210' },
    });
    await prisma.user.upsert({
        where: { email_agencyId: { email: 'cust@alpha.com', agencyId: agencyA.id } },
        update: {},
        create: { agencyId: agencyA.id, name: 'Alpha Customer', email: 'cust@alpha.com', password: custPass, role: 'CUSTOMER', phone: '9123456780', address: 'Alpha Road' },
    });

    // Clear existing products to prevent duplicates on re-seed without wipe
    await prisma.product.deleteMany();

    const alphaProducts = [
        { name: 'Alpha Biscuits', price: 45, stock: 500, unit: 'pack', category: 'Biscuits', agencyId: agencyA.id },
        { name: 'Alpha Tea', price: 220, stock: 250, unit: 'pack', category: 'Beverages', agencyId: agencyA.id }
    ];

    for (const p of alphaProducts) {
        await prisma.product.create({ data: p });
    }

    // Seed Beta Distributors
    await prisma.user.upsert({
        where: { email_agencyId: { email: 'admin@beta.com', agencyId: agencyB.id } },
        update: {},
        create: { agencyId: agencyB.id, name: 'Beta Admin', email: 'admin@beta.com', password: adminPass, role: 'ADMIN' },
    });
    await prisma.user.upsert({
        where: { email_agencyId: { email: 'emp@beta.com', agencyId: agencyB.id } },
        update: {},
        create: { agencyId: agencyB.id, name: 'Beta Employee', email: 'emp@beta.com', password: empPass, role: 'EMPLOYEE', phone: '9876543210' },
    });
    await prisma.user.upsert({
        where: { email_agencyId: { email: 'cust@beta.com', agencyId: agencyB.id } },
        update: {},
        create: { agencyId: agencyB.id, name: 'Beta Customer', email: 'cust@beta.com', password: custPass, role: 'CUSTOMER', phone: '9123456780', address: 'Beta Road' },
    });

    const betaProducts = [
        { name: 'Beta Soap', price: 55, stock: 600, unit: 'pcs', category: 'Personal Care', agencyId: agencyB.id },
        { name: 'Beta Oil', price: 145, stock: 180, unit: 'litre', category: 'Cooking Oil', agencyId: agencyB.id }
    ];

    for (const p of betaProducts) {
        await prisma.product.create({ data: p });
    }

    console.log('Seed complete!');
    console.log('--- Alpha Agency ---');
    console.log('Admin: admin@alpha.com / admin123');
    console.log('Employee: emp@alpha.com / emp123');
    console.log('Customer: cust@alpha.com / cust123');
    console.log('--- Beta Distributors ---');
    console.log('Admin: admin@beta.com / admin123');
    console.log('Employee: emp@beta.com / emp123');
    console.log('Customer: cust@beta.com / cust123');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
