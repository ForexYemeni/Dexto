// Quick script to give Ahmed user a balance via admin API
import { db } from '../src/lib/db'

async function main() {
  const user = await db.user.findFirst({ where: { email: 'ahmed@test.com' } })
  if (!user) {
    console.log('User not found')
    return
  }
  console.log('Found user:', user.name, user.email, 'current balance:', user.balance)

  // Add 1000 USDT to balance
  await db.user.update({
    where: { id: user.id },
    data: { balance: { increment: 1000 } },
  })

  await db.transaction.create({
    data: {
      userId: user.id,
      type: 'admin_adjustment',
      amount: 1000,
      status: 'completed',
      description: 'Initial test balance',
    },
  })

  const updated = await db.user.findUnique({ where: { id: user.id } })
  console.log('Updated balance:', updated?.balance)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
