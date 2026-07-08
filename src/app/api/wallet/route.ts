import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { processCompletedMining } from '../dashboard/route'

// GET /api/wallet - transaction history
export async function GET(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  await processCompletedMining(payload.userId)

  const transactions = await db.transaction.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const user = await db.user.findUnique({ where: { id: payload.userId } })

  // Calculate summary
  const summary = {
    totalDeposits: transactions
      .filter((t) => t.type === 'deposit' && t.status === 'completed')
      .reduce((s, t) => s + t.amount, 0),
    totalWithdrawals: Math.abs(
      transactions
        .filter((t) => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((s, t) => s + t.amount, 0)
    ),
    totalMiningProfit: transactions
      .filter((t) => t.type === 'mining_profit' && t.amount > 0)
      .reduce((s, t) => s + t.amount, 0),
    totalReferralProfit: transactions
      .filter((t) => t.type === 'referral_commission')
      .reduce((s, t) => s + t.amount, 0),
    totalTaskRewards: transactions
      .filter((t) => t.type === 'task_reward')
      .reduce((s, t) => s + t.amount, 0),
  }

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      status: t.status,
      description: t.description,
      reference: t.reference,
      createdAt: t.createdAt.toISOString(),
    })),
    balance: user?.balance ?? 0,
    summary,
  })
}
