import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { processCompletedMining } from '../dashboard/route'

// GET /api/mining - get plans + active sessions + history
export async function GET(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  // Process any completed sessions first
  await processCompletedMining(payload.userId)

  const plans = await db.miningPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  const activeSessions = await db.userMiningSession.findMany({
    where: { userId: payload.userId, status: 'active' },
    include: { plan: true },
    orderBy: { startedAt: 'desc' },
  })

  const history = await db.miningHistory.findMany({
    where: { userId: payload.userId },
    orderBy: { completedAt: 'desc' },
    take: 50,
  })

  const user = await db.user.findUnique({ where: { id: payload.userId } })

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.nameAr,
      description: p.description,
      descriptionAr: p.descriptionAr,
      price: p.price,
      dailyProfitRate: p.dailyProfitRate,
      durationHours: p.durationHours,
      minInvestment: p.minInvestment,
      maxInvestment: p.maxInvestment,
      color: p.color,
      icon: p.icon,
      isActive: p.isActive,
    })),
    activeSessions: activeSessions.map((s) => ({
      id: s.id,
      planId: s.planId,
      planName: s.plan.name,
      planNameAr: s.plan.nameAr,
      planColor: s.plan.color,
      investmentAmount: s.investmentAmount,
      expectedProfit: s.expectedProfit,
      startedAt: s.startedAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      status: s.status,
    })),
    history: history.map((h) => ({
      id: h.id,
      planName: h.planName,
      investmentAmount: h.investmentAmount,
      profitAmount: h.profitAmount,
      startedAt: h.startedAt.toISOString(),
      completedAt: h.completedAt.toISOString(),
    })),
    balance: user?.balance ?? 0,
  })
}

// POST /api/mining - start mining
export async function POST(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  // Process completed first
  await processCompletedMining(payload.userId)

  const body = await req.json()
  const { action, planId, investmentAmount } = body

  if (action === 'start') {
    return startMining(payload.userId, planId, investmentAmount)
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}

async function startMining(userId: string, planId: string, investmentAmount: number) {
  const plan = await db.miningPlan.findUnique({ where: { id: planId } })
  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: 'plan_not_available' }, { status: 400 })
  }

  if (investmentAmount < plan.minInvestment || investmentAmount > plan.maxInvestment) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 })
  }

  if (user.balance < investmentAmount) {
    return NextResponse.json({ error: 'insufficient_balance' }, { status: 400 })
  }

  // Check if user already has an active session for this plan
  const existing = await db.userMiningSession.findFirst({
    where: { userId, planId, status: 'active' },
  })
  if (existing) {
    return NextResponse.json({ error: 'already_active_for_plan' }, { status: 400 })
  }

  // Calculate expected profit
  const expectedProfit = investmentAmount * plan.dailyProfitRate

  // Start time = now (server time, Asia/Riyadh conceptually)
  const startedAt = new Date()
  const endsAt = new Date(startedAt.getTime() + plan.durationHours * 60 * 60 * 1000)

  // Deduct investment from balance
  await db.user.update({
    where: { id: userId },
    data: {
      balance: { decrement: investmentAmount },
      totalInvested: { increment: investmentAmount },
    },
  })

  // Create mining session
  const session = await db.userMiningSession.create({
    data: {
      userId,
      planId,
      investmentAmount,
      expectedProfit,
      startedAt,
      endsAt,
      status: 'active',
    },
  })

  // Record transaction
  await db.transaction.create({
    data: {
      userId,
      type: 'mining_profit',
      amount: -investmentAmount,
      status: 'completed',
      description: `Investment in ${plan.name}`,
      reference: session.id,
    },
  })

  await db.activityLog.create({
    data: {
      userId,
      action: 'mining_start',
      details: `Plan: ${plan.name}, Amount: ${investmentAmount} USDT`,
    },
  })

  await db.notification.create({
    data: {
      userId,
      type: 'mining',
      title: 'Mining Started!',
      titleAr: 'بدأ التعدين!',
      message: `Your mining for ${plan.name} has started. Expected profit: ${expectedProfit.toFixed(2)} USDT`,
      messageAr: `بدأ التعدين لخطة ${plan.nameAr}. الأرباح المتوقعة: ${expectedProfit.toFixed(2)} USDT`,
    },
  })

  return NextResponse.json({
    success: true,
    session: {
      id: session.id,
      planId: session.planId,
      investmentAmount: session.investmentAmount,
      expectedProfit: session.expectedProfit,
      startedAt: session.startedAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      status: session.status,
    },
  })
}

