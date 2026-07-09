// Reset admin password
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  const newPasswordHash = await hashPassword('Admin@2026')

  await db.user.updateMany({
    where: { email: 'admin@cryptomining.io' },
    data: { passwordHash: newPasswordHash },
  })

  const user = await db.user.findUnique({ where: { email: 'admin@cryptomining.io' } })
  console.log('Admin password reset!')
  console.log('Email:', user?.email)
  console.log('New hash (first 30):', user?.passwordHash.substring(0, 30))
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
