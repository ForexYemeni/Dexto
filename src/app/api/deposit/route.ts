import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { processCompletedMining } from '../dashboard/route'
import { notifyAdmins } from '@/lib/notify-admins'

// GET /api/deposit - get wallets + deposit history
export async function GET(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  await processCompletedMining(payload.userId)

  const wallets = await db.wallet.findMany({
    where: { isActive: true },
    orderBy: { network: 'asc' },
  })

  const deposits = await db.deposit.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const settings = await db.systemSetting.findFirst()

  return NextResponse.json({
    wallets: wallets.map((w) => ({
      id: w.id,
      network: w.network,
      networkAr: w.networkAr,
      address: w.address,
      isActive: w.isActive,
    })),
    deposits: deposits.map((d) => ({
      id: d.id,
      network: d.network,
      amount: d.amount,
      txHash: d.txHash,
      walletAddress: d.walletAddress,
      status: d.status,
      note: d.note,
      createdAt: d.createdAt.toISOString(),
      reviewedAt: d.reviewedAt?.toISOString(),
    })),
    minDeposit: settings?.minDeposit ?? 10,
    autoApprove: settings?.autoApproveDeposit ?? false,
  })
}

// POST /api/deposit - create new deposit
export async function POST(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { network, amount, txHash, walletAddress } = body

  if (!network || !amount || !walletAddress) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const settings = await db.systemSetting.findFirst()
  const minDeposit = settings?.minDeposit ?? 10

  if (amount < minDeposit) {
    return NextResponse.json({ error: 'below_minimum' }, { status: 400 })
  }

  const wallet = await db.wallet.findFirst({ where: { network, isActive: true } })
  if (!wallet) {
    return NextResponse.json({ error: 'network_unavailable' }, { status: 400 })
  }

  const deposit = await db.deposit.create({
    data: {
      userId: payload.userId,
      network,
      amount,
      txHash: txHash || null,
      walletAddress,
      status: 'pending',
    },
  })

  await db.activityLog.create({
    data: {
      userId: payload.userId,
      action: 'deposit_request',
      details: `Network: ${network}, Amount: ${amount} USDT`,
    },
  })

  // Notify all admins about new deposit request
  await notifyAdmins({
    type: 'deposit',
    title: 'New Deposit Request',
    titleAr: 'طلب إيداع جديد',
    message: `User requested deposit of ${amount} USDT via ${network}`,
    messageAr: `مستخدم طلب إيداع ${amount} USDT عبر شبكة ${network}`,
  })

  // Auto-approve if enabled (typically not for production)
  if (settings?.autoApproveDeposit) {
    await db.$transaction(async (tx) => {
      await tx.deposit.update({
        where: { id: deposit.id },
        data: { status: 'completed', reviewedAt: new Date() },
      })
      await tx.user.update({
        where: { id: payload.userId },
        data: { balance: { increment: amount } },
      })
      await tx.transaction.create({
        data: {
          userId: payload.userId,
          type: 'deposit',
          amount,
          status: 'completed',
          description: `Deposit via ${network}`,
          reference: deposit.id,
        },
      })
    })
  }

  return NextResponse.json({
    success: true,
    deposit: {
      id: deposit.id,
      network: deposit.network,
      amount: deposit.amount,
      status: deposit.status,
      createdAt: deposit.createdAt.toISOString(),
    },
  })
}
