// Quick test to verify DATABASE_URL is loaded correctly
import { db } from '../src/lib/db'

async function main() {
  console.log('DATABASE_URL from env:', process.env.DATABASE_URL?.substring(0, 50))
  console.log('---')
  console.log('Testing MongoDB connection...')
  try {
    const userCount = await db.user.count()
    console.log('✅ MongoDB connection SUCCESS!')
    console.log('Total users:', userCount)
  } catch (error: any) {
    console.log('❌ MongoDB connection FAILED:')
    console.log('Error:', error.message)
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
