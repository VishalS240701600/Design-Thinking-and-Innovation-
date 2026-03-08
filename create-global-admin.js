const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Creating Global Admin user...');

    // Check if the master admin already exists
    const existing = await prisma.user.findFirst({
        where: { email: 'master.admin@example.com' }
    });

    if (existing) {
        console.log('Global admin already exists:', existing.email);
    } else {
        const hashedPassword = await bcrypt.hash('masterpass', 10);

        const superAdmin = await prisma.user.create({
            data: {
                name: 'Global System Admin',
                email: 'master.admin@example.com',
                password: hashedPassword,
                role: 'ADMIN',
                // Notice agencyId is deliberately omitted -> null
            }
        });

        console.log('Global Admin created successfully:');
        console.log('- Login Email:', superAdmin.email);
        console.log('- Login Password: masterpass');
        console.log('- Agency: Global (All Agencies)');
    }
}

main()
    .catch(e => {
        console.error('Error creating super admin:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
