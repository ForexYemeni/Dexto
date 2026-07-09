import { PrismaClient } from '@prisma/client'

// Ensure DATABASE_URL is set - fallback to .env file value
// This handles cases where the shell environment has a stale value
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  // Try to load from .env file
  try {
    const fs = require('fs')
    const path = require('path')
    const envPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const lines = envContent.split('\n')
      for (const line of lines) {
        const match = line.match(/^DATABASE_URL=(.+)$/)
        if (match && match[1]) {
          process.env.DATABASE_URL = match[1].replace(/^["']|["']$/g, '')
          break
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Force new PrismaClient if the existing one was created with wrong provider
function createPrismaClient() {
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
