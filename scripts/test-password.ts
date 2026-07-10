// Test password verification
import { db } from '../src/lib/db'
import { comparePassword } from '../src/lib/auth'

async function main() {
  const user = await db.user.findUnique({ where: { email: 'admin@cryptomining.io' } })
  if (!user) {
    console.log('User not found!')
    return
  }

  console.log('User found:', user.email)
  console.log('Password hash:', user.passwordHash)

  const testPasswords = ['Admin@2026', 'admin@2026', 'password', '123456']
  for (const pwd of testPasswords) {
    const valid = await comparePassword(pwd, user.passwordHash)
    console.log(`Password "${pwd}": ${valid ? '✅ VALID' : '❌ invalid'}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('Error:', e); process.exit(1) })
