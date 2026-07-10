import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { processCompletedMining } from '../dashboard/route'

// GET /api/withdrawal - get withdrawal history + settings
export async function GET(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  await processCompletedMining(payload.userId)

  const withdrawals = await db.withdrawal.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const settings = await db.systemSetting.findFirst()
  const user = await db.user.findUnique({ where: { id: payload.userId } })

  return NextResponse.json({
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      network: w.network,
      amount: w.amount,
      fee: w.fee,
      netAmount: w.netAmount,
      walletAddress: w.walletAddress,
      status: w.status,
      note: w.note,
      createdAt: w.createdAt.toISOString(),
      reviewedAt: w.reviewedAt?.toISOString(),
    })),
    minWithdrawal: settings?.minWithdrawal ?? 10,
    withdrawalFee: settings?.withdrawalFee ?? 1,
    withdrawalFeeType: settings?.withdrawalFeeType ?? 'percent',
    balance: user?.balance ?? 0,
  })
}

// POST /api/withdrawal - create withdrawal request
export async function POST(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  await processCompletedMining(payload.userId)

  const body = await req.json()
  const { network, amount, walletAddress } = body

  if (!network || !amount || !walletAddress) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const settings = await db.systemSetting.findFirst()
  const minWithdrawal = settings?.minWithdrawal ?? 10

  if (amount < minWithdrawal) {
    return NextResponse.json({ error: 'below_minimum' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: payload.userId } })
  if (!user || user.balance < amount) {
    return NextResponse.json({ error: 'insufficient_balance' }, { status: 400 })
  }

  // Calculate fee
  let fee = 0
  if (settings?.withdrawalFeeType === 'percent') {
    fee = amount * (settings?.withdrawalFee ?? 0) / 100
  } else {
    fee = settings?.withdrawalFee ?? 0
  }
  const netAmount = amount - fee

  // Create withdrawal and lock the amount
  const withdrawal = await db.$transaction(async (tx) => {
    // Deduct from balance immediately
    await tx.user.update({
      where: { id: payload.userId },
      data: { balance: { decrement: amount } },
    })

    const w = await tx.withdrawal.create({
      data: {
        userId: payload.userId,
        network,
        amount,
        fee,
        netAmount,
        walletAddress,
        status: 'pending',
      },
    })

    await tx.transaction.create({
      data: {
        userId: payload.userId,
        type: 'withdrawal',
        amount: -amount,
        status: 'pending',
        description: `Withdrawal via ${network}`,
        reference: w.id,
      },
    })

    return w
  })

  await db.activityLog.create({
    data: {
      userId: payload.userId,
      action: 'withdrawal_request',
      details: `Network: ${network}, Amount: ${amount} USDT`,
    },
  })

  // Auto-approve if enabled
  if (settings?.autoApproveWithdrawal) {
    await db.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: 'completed', reviewedAt: new Date() },
      })
      await tx.transaction.updateMany({
        where: { reference: withdrawal.id, type: 'withdrawal' },
        data: { status: 'completed' },
      })
    })
  }

  return NextResponse.json({
    success: true,
    withdrawal: {
      id: withdrawal.id,
      network: withdrawal.network,
      amount: withdrawal.amount,
      fee: withdrawal.fee,
      netAmount: withdrawal.netAmount,
      status: withdrawal.status,
      createdAt: withdrawal.createdAt.toISOString(),
    },
  })
}
