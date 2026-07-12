import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { processCompletedMining } from '../dashboard/route'
import { notifyAdmins } from '@/lib/notify-admins'

// GET /api/mining - get plans + active sessions + history
export async function GET(req: NextRequest) {
  try {
    const payload = await getCurrentUser()
    if (!payload) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }

  // Process any completed sessions first
  try {
    await processCompletedMining(payload.userId)
  } catch (e) {
    console.error('processCompletedMining error (non-fatal):', e)
  }

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
      totalDays: p.totalDays || 7,
    })),
    activeSessions: activeSessions.map((s) => ({
      id: s.id,
      planId: s.planId,
      planName: s.plan.name,
      planNameAr: s.plan.nameAr,
      planColor: s.plan.color,
      investmentAmount: s.investmentAmount,
      expectedProfit: s.expectedProfit,
      dailyProfit: s.dailyProfit || s.expectedProfit,
      totalDays: s.totalDays || 1,
      currentDay: s.currentDay || 0,
      startedAt: s.startedAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      planEndsAt: s.planEndsAt?.toISOString() || null,
      miningStarted: s.miningStarted ?? true,
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
  } catch (error: any) {
    console.error('Mining API error:', error)
    return NextResponse.json({ error: 'server_error', details: error.message }, { status: 500 })
  }
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

  // Calculate daily profit (per 24h cycle)
  const dailyProfit = investmentAmount * plan.dailyProfitRate
  const totalDays = plan.totalDays || 7

  // Get admin-set mining start time
  const settings = await db.systemSetting.findFirst()
  const miningStartTime = settings?.miningStartTime || '' // e.g., "00:00"

  const startedAt = new Date()

  let endsAt: Date
  let miningStarted: boolean

  if (miningStartTime && miningStartTime.includes(':')) {
    // Admin has set a specific mining start time (in Mecca timezone = UTC+3)
    const [targetHours, targetMinutes] = miningStartTime.split(':').map(Number)
    const now = new Date()

    // Convert target time from Mecca (UTC+3) to UTC
    // Mecca is UTC+3, so if target is 00:00 Mecca = 21:00 UTC previous day
    let targetUTCHours = targetHours - 3
    let targetDateOffset = 0
    if (targetUTCHours < 0) {
      targetUTCHours += 24
      targetDateOffset = -1 // previous day in UTC
    }

    // Create date for today at the specified UTC time
    const todayTarget = new Date(now)
    todayTarget.setUTCHours(targetUTCHours, targetMinutes, 0, 0)
    todayTarget.setUTCDate(todayTarget.getUTCDate() + targetDateOffset)

    // If the target time has already passed, use tomorrow
    if (todayTarget <= now) {
      todayTarget.setUTCDate(todayTarget.getUTCDate() + 1)
    }

    endsAt = todayTarget
    miningStarted = false
  } else {
    // No admin-set time: mining starts immediately (backward compatible)
    endsAt = new Date(startedAt.getTime() + plan.durationHours * 60 * 60 * 1000)
    miningStarted = true // mining in progress immediately
  }

  const planEndsAt = new Date(startedAt.getTime() + (totalDays + 1) * 24 * 60 * 60 * 1000)

  // Deduct investment (capital) from balance - CAPITAL IS LOCKED
  await db.user.update({
    where: { id: userId },
    data: {
      balance: { decrement: investmentAmount },
      totalInvested: { increment: investmentAmount },
    },
  })

  // Create mining session with multi-day support
  const session = await db.userMiningSession.create({
    data: {
      userId,
      planId,
      investmentAmount,
      expectedProfit: dailyProfit,
      dailyProfit,
      totalDays,
      currentDay: 0,
      miningStarted,
      startedAt,
      endsAt,
      planEndsAt,
      status: 'active',
    },
  })

  // Record transaction - capital locked
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

  // Notify all admins about new mining start
  const miningUser = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  await notifyAdmins({
    type: 'mining',
    title: 'New Mining Started',
    titleAr: 'بدء تعدين جديد',
    message: `${miningUser?.name || 'User'} started mining ${plan.name} with ${investmentAmount} USDT (daily: ${dailyProfit.toFixed(2)} USDT, ${totalDays} days)`,
    messageAr: `${miningUser?.name || 'مستخدم'} بدأ التعدين ${plan.nameAr} بمبلغ ${investmentAmount} USDT (يومي: ${dailyProfit.toFixed(2)} USDT، ${totalDays} أيام)`,
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

