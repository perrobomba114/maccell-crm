import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Connecting to database...')
    const users = await prisma.user.findMany({ take: 1 })
    console.log('Connection successful!')
    console.log('Found users:', users.length)
    if (users.length > 0) {
        console.log('Sample user role:', users[0].role)
    }
  } catch (e) {
    console.error('Connection failed:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
