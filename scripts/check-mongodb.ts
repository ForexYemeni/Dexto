// Check users in MongoDB Atlas
import { db } from '../src/lib/db'

async function main() {
  console.log('Checking users in MongoDB Atlas...')
  const users = await db.user.findMany({})
  console.log('Total users:', users.length)
  for (const u of users) {
    console.log('---')
    console.log('ID:', u.id)
    console.log('Email:', u.email)
    console.log('Name:', u.name)
    console.log('Role:', u.role)
    console.log('Status:', u.status)
    console.log('PasswordHash (first 20):', u.passwordHash.substring(0, 20))
    console.log('ReferralCode:', u.referralCode)
  }

  console.log('\n--- System Settings ---')
  const settings = await db.systemSetting.findFirst()
  console.log('Platform Name:', settings?.platformName)
  console.log('Platform Name Ar:', settings?.platformNameAr)

  console.log('\n--- Mining Plans ---')
  const plans = await db.miningPlan.findMany({})
  console.log('Total plans:', plans.length)
  for (const p of plans) {
    console.log(`  - ${p.name} (${p.nameAr}): ${p.dailyProfitRate * 100}% daily`)
  }

  console.log('\n--- Wallets ---')
  const wallets = await db.wallet.findMany({})
  console.log('Total wallets:', wallets.length)
  for (const w of wallets) {
    console.log(`  - ${w.network} (${w.networkAr}): ${w.address.substring(0, 20)}...`)
  }

  console.log('\n--- Tasks ---')
  const tasks = await db.task.findMany({})
  console.log('Total tasks:', tasks.length)
  for (const t of tasks) {
    console.log(`  - ${t.type}: ${t.title} (${t.titleAr})`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('Error:', e); process.exit(1) })
