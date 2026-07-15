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
  const { action, planId, investmentAmount, sessionId } = body

  if (action === 'subscribe') {
    return subscribePlan(payload.userId, planId, investmentAmount)
  } else if (action === 'activate') {
    return activateDailyMining(payload.userId, sessionId)
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}

// ===== SUBSCRIBE: User buys a plan (locks capital, creates session) =====
async function subscribePlan(userId: string, planId: string, investmentAmount: number) {
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

  const dailyProfit = investmentAmount * plan.dailyProfitRate
  const totalDays = plan.totalDays || 7
  const startedAt = new Date()
  // endsAt = startedAt (placeholder, will be set when user activates)
  const endsAt = new Date(startedAt)

  // Deduct investment (capital) from balance - CAPITAL IS LOCKED
  await db.user.update({
    where: { id: userId },
    data: {
      balance: { decrement: investmentAmount },
      totalInvested: { increment: investmentAmount },
    },
  })

  // Create mining session - needs daily activation
  const session = await db.userMiningSession.create({
    data: {
      userId,
      planId,
      investmentAmount,
      expectedProfit: dailyProfit,
      dailyProfit,
      totalDays,
      currentDay: 0,
      miningStarted: false, // needs user to activate
      activatedAt: null,
      startedAt,
      endsAt,
      status: 'active',
    },
  })

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
      action: 'mining_subscribe',
      details: `Plan: ${plan.name}, Amount: ${investmentAmount} USDT`,
    },
  })

  await db.notification.create({
    data: {
      userId,
      type: 'mining',
      title: 'Subscription Active!',
      titleAr: 'تم الاشتراك بنجاح!',
      message: `You subscribed to ${plan.name}. Activate mining daily to earn ${dailyProfit.toFixed(2)} USDT/day for ${totalDays} days.`,
      messageAr: `اشتركت في خطة ${plan.nameAr}. فعّل التعدين يومياً لربح ${dailyProfit.toFixed(2)} USDT/يوم لمدة ${totalDays} أيام.`,
    },
  })

  const miningUser = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  await notifyAdmins({
    type: 'mining',
    title: 'New Subscription',
    titleAr: 'اشتراك جديد',
    message: `${miningUser?.name || 'User'} subscribed to ${plan.name} with ${investmentAmount} USDT`,
    messageAr: `${miningUser?.name || 'مستخدم'} اشترك في ${plan.nameAr} بمبلغ ${investmentAmount} USDT`,
  })

  return NextResponse.json({
    success: true,
    session: {
      id: session.id,
      planId: session.planId,
      investmentAmount: session.investmentAmount,
      dailyProfit: session.dailyProfit,
      totalDays: session.totalDays,
      miningStarted: session.miningStarted,
      status: session.status,
    },
  })
}

// ===== ACTIVATE: User activates daily mining (press button each day) =====
async function activateDailyMining(userId: string, sessionId: string) {
  const session = await db.userMiningSession.findFirst({
    where: { id: sessionId, userId, status: 'active' },
    include: { plan: true },
  })

  if (!session) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }

  if (session.miningStarted) {
    return NextResponse.json({ error: 'already_mining' }, { status: 400 })
  }

  // Check if plan is complete
  if (session.currentDay >= session.totalDays) {
    return NextResponse.json({ error: 'plan_completed' }, { status: 400 })
  }

  // Get admin-set mining start time
  const settings = await db.systemSetting.findFirst()
  const miningStartTime = settings?.miningStartTime || ''

  const now = new Date()
  let endsAt: Date

  if (miningStartTime && miningStartTime.includes(':')) {
    // Admin set specific time: mining runs until next occurrence of that time + 24h
    // But since user activates manually, we just run 24h from now
    // The admin time is for the WAITING phase alignment (already handled)
    endsAt = new Date(now.getTime() + session.plan.durationHours * 60 * 60 * 1000)
  } else {
    // No admin time: mining runs 24h from activation
    endsAt = new Date(now.getTime() + session.plan.durationHours * 60 * 60 * 1000)
  }

  // Activate mining
  await db.userMiningSession.update({
    where: { id: sessionId },
    data: {
      miningStarted: true,
      activatedAt: now,
      endsAt,
    },
  })

  await db.activityLog.create({
    data: {
      userId,
      action: 'mining_activated',
      details: `Day ${session.currentDay + 1}/${session.totalDays} - ${session.plan.name}`,
    },
  })

  await db.notification.create({
    data: {
      userId,
      type: 'mining',
      title: `Mining Activated - Day ${session.currentDay + 1}/${session.totalDays}`,
      titleAr: `تم تفعيل التعدين - اليوم ${session.currentDay + 1}/${session.totalDays}`,
      message: `Mining started for ${session.plan.name}. You'll earn ${session.dailyProfit.toFixed(2)} USDT in 24 hours.`,
      messageAr: `بدأ التعدين لخطة ${session.plan.nameAr}. ستربح ${session.dailyProfit.toFixed(2)} USDT خلال 24 ساعة.`,
    },
  })

  return NextResponse.json({
    success: true,
    endsAt: endsAt.toISOString(),
  })
}

