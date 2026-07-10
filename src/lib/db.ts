import { PrismaClient } from '@prisma/client'

// Ensure DATABASE_URL is set
// On Vercel, this comes from environment variables
// On local dev, it comes from .env file
if (!process.env.DATABASE_URL) {
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
    // ignore - will use process.env.DATABASE_URL from Vercel
  }
}

// PrismaClient is attached to `globalThis` to prevent exhausting database connections
// during hot reloads in development, and to reuse the connection in serverless functions
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
