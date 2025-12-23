const { db: prisma } = require('./src/lib/db');

async function checkData() {
    try {
        const count = await prisma.cashShift.count();
        console.log('Total CashShifts:', count);

        if (count > 0) {
            const first = await prisma.cashShift.findFirst({
                include: { branch: true, user: true }
            });
            console.log('Sample Shift:', JSON.stringify(first, null, 2));
        }
    } catch (error) {
        console.error('Error checking data:', error);
    } finally {
        // await prisma.$disconnect(); 
        // Usually required in standalone script but prisma instance handling in Next.js might be different. 
        // We will just let it exit.
        process.exit(0);
    }
}

checkData();
