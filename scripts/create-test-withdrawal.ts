// Give Mohamed test user a balance and create a test withdrawal
import { db } from '../src/lib/db'

async function main() {
  const user = await db.user.findFirst({ where: { email: 'mohamed@test.com' } })
  if (!user) {
    console.log('User not found')
    return
  }
  console.log('Found user:', user.name, 'current balance:', user.balance)

  // Add 500 USDT to balance
  await db.user.update({
    where: { id: user.id },
    data: { balance: { increment: 500 } },
  })

  await db.transaction.create({
    data: {
      userId: user.id,
      type: 'admin_adjustment',
      amount: 500,
      status: 'completed',
      description: 'Test balance for withdrawal',
    },
  })

  // Create a test withdrawal request with a specific address
  await db.withdrawal.create({
    data: {
      userId: user.id,
      network: 'TRC20',
      amount: 100,
      fee: 1,
      netAmount: 99,
      walletAddress: 'TJYxe5p3kQ7vN8mR2sL9wY4xA6bC3dE1fH',
      status: 'pending',
    },
  })

  // Deduct from balance (simulating the withdrawal request)
  await db.user.update({
    where: { id: user.id },
    data: { balance: { decrement: 100 } },
  })

  const updated = await db.user.findUnique({ where: { id: user.id } })
  console.log('Updated balance:', updated?.balance)
  console.log('Test withdrawal created with address: TJYxe5p3kQ7vN8mR2sL9wY4xA6bC3dE1fH')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
