import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Fetching users...')
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        })

        console.log(`Found ${users.length} users:`)
        users.forEach(u => {
            console.log(`- [${u.role}] ${u.name} (${u.email})`)
        })
    } catch (e) {
        console.error('Error fetching users:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
