
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking for backup model...');
    if (prisma.backup) {
        console.log('SUCCESS: prisma.backup exists');
    } else {
        console.error('FAILURE: prisma.backup DOES NOT exist');
        console.log('Keys on prisma:', Object.keys(prisma));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
