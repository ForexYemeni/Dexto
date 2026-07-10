// Fix admin user - delete duplicates and set correct
import { db } from '../src/lib/db'
import { hashPassword, comparePassword } from '../src/lib/auth'

async function main() {
  // Find all users with admin@cryptomining.io email
  const duplicates = await db.user.findMany({ where: { email: 'admin@cryptomining.io' } })
  console.log('Users with admin@cryptomining.io:', duplicates.length)

  // Delete all duplicates except keep one
  for (let i = 1; i < duplicates.length; i++) {
    await db.user.delete({ where: { id: duplicates[i].id } })
    console.log('Deleted duplicate:', duplicates[i].id)
  }

  // Find the admin by role
  const admins = await db.user.findMany({ where: { role: 'admin' } })
  console.log('Admins found:', admins.length)

  // Update the admin user
  const admin = admins[0]
  if (!admin) {
    console.log('No admin found! Creating one...')
    const newPasswordHash = await hashPassword('Admin@2026')
    await db.user.create({
      data: {
        email: 'admin@cryptomining.io',
        name: 'Super Admin',
        passwordHash: newPasswordHash,
        referralCode: 'ADMIN2026',
        role: 'admin',
        status: 'active',
        language: 'ar',
        theme: 'dark',
      },
    })
  } else {
    // First delete the admin's current email record if it's different
    if (admin.email !== 'admin@cryptomining.io') {
      // Check if admin@cryptomining.io exists
      const existing = await db.user.findUnique({ where: { email: 'admin@cryptomining.io' } })
      if (existing && existing.id !== admin.id) {
        await db.user.delete({ where: { id: existing.id } })
        console.log('Deleted existing admin@cryptomining.io user')
      }
    }

    const newPasswordHash = await hashPassword('Admin@2026')
    await db.user.update({
      where: { id: admin.id },
      data: {
        email: 'admin@cryptomining.io',
        name: 'Super Admin',
        passwordHash: newPasswordHash,
        role: 'admin',
        status: 'active',
      },
    })
    console.log('✅ Admin updated')
  }

  // Verify
  const finalAdmin = await db.user.findUnique({ where: { email: 'admin@cryptomining.io' } })
  console.log('\n=== Final Admin ===')
  console.log('Email:', finalAdmin?.email)
  console.log('Name:', finalAdmin?.name)
  console.log('Role:', finalAdmin?.role)

  if (finalAdmin) {
    const valid = await comparePassword('Admin@2026', finalAdmin.passwordHash)
    console.log('Password "Admin@2026" valid:', valid ? '✅ YES' : '❌ NO')
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
