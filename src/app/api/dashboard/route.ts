import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/dashboard - user dashboard data
export async function GET(req: NextRequest) {
  try {
    const payload = await getCurrentUser()
    if (!payload) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } })
    if (!user) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

  // Active mining sessions
  const activeSessions = await db.userMiningSession.findMany({
    where: { userId: user.id, status: 'active' },
    include: { plan: true },
    orderBy: { startedAt: 'desc' },
  })

  // Recent transactions
  const recentTransactions = await db.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // Mining history
  const miningHistory = await db.miningHistory.findMany({
    where: { userId: user.id },
    orderBy: { completedAt: 'desc' },
    take: 5,
  })

  // Recent activity logs
  const activityLogs = await db.activityLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // Referral count
  const referralCount = await db.user.count({
    where: { referredBy: user.referralCode },
  })

  // Active referrals (those who deposited)
  const activeReferrals = await db.user.count({
    where: {
      referredBy: user.referralCode,
      totalInvested: { gt: 0 },
    },
  })

  // Process mining completion (check if any session ended)
  // Wrapped in try-catch to prevent API failure for old sessions
  try {
    await processCompletedMining(user.id)
  } catch (e) {
    console.error('processCompletedMining error (non-fatal):', e)
  }

  // Profit chart data (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const profitTransactions = await db.transaction.findMany({
    where: {
      userId: user.id,
      type: 'mining_profit',
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: 'asc' },
  })

  const chartData: { date: string; profit: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const dayProfit = profitTransactions
      .filter((t) => t.createdAt >= date && t.createdAt < nextDate)
      .reduce((sum, t) => sum + t.amount, 0)

    chartData.push({
      date: date.toISOString().split('T')[0],
      profit: Number(dayProfit.toFixed(2)),
    })
  }

  // Re-fetch user after potential mining completion
  const updatedUser = await db.user.findUnique({ where: { id: user.id } })

  return NextResponse.json({
    user: {
      id: updatedUser!.id,
      email: updatedUser!.email,
      name: updatedUser!.name,
      role: updatedUser!.role,
      balance: updatedUser!.balance,
      totalInvested: updatedUser!.totalInvested,
      totalProfit: updatedUser!.totalProfit,
      todayProfit: updatedUser!.todayProfit,
      monthProfit: updatedUser!.monthProfit,
      referralProfit: updatedUser!.referralProfit,
      referralCode: updatedUser!.referralCode,
    },
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
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      status: t.status,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    miningHistory: miningHistory.map((h) => ({
      id: h.id,
      planName: h.planName,
      investmentAmount: h.investmentAmount,
      profitAmount: h.profitAmount,
      startedAt: h.startedAt.toISOString(),
      completedAt: h.completedAt.toISOString(),
    })),
    activityLogs: activityLogs.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      createdAt: a.createdAt.toISOString(),
    })),
    referralCount,
    activeReferrals,
    chartData,
  })
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'server_error', details: error.message }, { status: 500 })
  }
}

// Process completed mining sessions
// NEW LOGIC: Multi-day mining
// - Each 24h cycle: add daily profit to balance (withdrawable)
// - Capital stays LOCKED until all days are complete
// - After last day: return capital + last profit, mark as completed
export async function processCompletedMining(userId: string) {
  const now = new Date()
  const completedCycles = await db.userMiningSession.findMany({
    where: {
      userId,
      status: 'active',
      miningStarted: true,    // only process sessions where mining was activated
      endsAt: { lte: now },   // and the 24h cycle has ended
    },
    include: { plan: true },
  })

  for (const session of completedCycles) {
    await db.$transaction(async (tx) => {
      const profit = session.dailyProfit || session.expectedProfit || 0
      const capital = session.investmentAmount || 0
      const totalDays = session.totalDays || session.plan?.totalDays || 1
      const currentDay = session.currentDay ?? 0
      const nextDay = currentDay + 1

      if (nextDay >= totalDays) {
        // ===== PLAN COMPLETE - Return capital + last profit =====
        await tx.userMiningSession.update({
          where: { id: session.id },
          data: {
            status: 'completed',
            currentDay: totalDays,
            miningStarted: false,
            completedAt: now,
          },
        })

        // Return capital + last daily profit
        await tx.user.update({
          where: { id: userId },
          data: {
            balance: { increment: capital + profit },
            totalProfit: { increment: profit },
            todayProfit: { increment: profit },
            monthProfit: { increment: profit },
          },
        })

        await tx.transaction.create({
          data: {
            userId, type: 'mining_profit', amount: capital, status: 'completed',
            description: `Capital returned - ${session.plan.name} (Plan Complete)`,
            reference: session.id,
          },
        })

        await tx.transaction.create({
          data: {
            userId, type: 'mining_profit', amount: profit, status: 'completed',
            description: `Daily profit Day ${totalDays}/${totalDays} - ${session.plan.name}`,
            reference: session.id,
          },
        })

        await tx.miningHistory.create({
          data: {
            userId, planId: session.planId, planName: session.plan.name,
            investmentAmount: capital, profitAmount: profit * totalDays,
            startedAt: session.startedAt, completedAt: now,
          },
        })

        await tx.notification.create({
          data: {
            userId, type: 'mining',
            title: 'Plan Completed!', titleAr: 'اكتملت الخطة!',
            message: `Your ${session.plan.name} completed all ${totalDays} days. Capital (${capital.toFixed(2)}) + profit (${profit.toFixed(2)}) added to balance.`,
            messageAr: `اكتملت خطة ${session.plan.nameAr} لجميع ${totalDays} أيام. رأس المال (${capital.toFixed(2)}) + الربح (${profit.toFixed(2)}) أضيفت لرصيدك.`,
          },
        })

        await processReferralCommission(userId, profit, session.id, tx)
      } else {
        // ===== DAILY CYCLE COMPLETE =====
        // Add profit, set miningStarted=false (waiting for user to activate next day)
        await tx.userMiningSession.update({
          where: { id: session.id },
          data: {
            currentDay: nextDay,
            miningStarted: false,  // user must activate again
            activatedAt: null,
          },
        })

        // Add daily profit to balance
        await tx.user.update({
          where: { id: userId },
          data: {
            balance: { increment: profit },
            totalProfit: { increment: profit },
            todayProfit: { increment: profit },
            monthProfit: { increment: profit },
          },
        })

        await tx.transaction.create({
          data: {
            userId, type: 'mining_profit', amount: profit, status: 'completed',
            description: `Daily profit Day ${nextDay}/${totalDays} - ${session.plan.name}`,
            reference: session.id,
          },
        })

        await tx.notification.create({
          data: {
            userId, type: 'mining',
            title: `Daily Profit - Day ${nextDay}/${totalDays}`,
            titleAr: `ربح يومي - اليوم ${nextDay}/${totalDays}`,
            message: `You earned ${profit.toFixed(2)} USDT from ${session.plan.name}. Activate mining for Day ${nextDay + 1} to continue earning.`,
            messageAr: `ربحت ${profit.toFixed(2)} USDT من ${session.plan.nameAr}. فعّل التعدين لليوم ${nextDay + 1} لمواصلة الربح.`,
          },
        })

        await processReferralCommission(userId, profit, session.id, tx)
      }
    })
  }
}

// Process referral commissions on mining profit
async function processReferralCommission(userId: string, profitAmount: number, sessionId: string, tx: any) {
  const user = await tx.user.findUnique({ where: { id: userId } })
  if (!user || !user.referredBy) return

  const settings = await tx.systemSetting.findFirst()
  if (!settings) return

  const levels = [
    { level: 1, percentage: settings.referralLevel1 },
    { level: 2, percentage: settings.referralLevel2 },
    { level: 3, percentage: settings.referralLevel3 },
  ]

  let currentUser = user
  for (const { level, percentage } of levels) {
    if (!currentUser.referredBy) break
    const referrer = await tx.user.findFirst({ where: { referralCode: currentUser.referredBy } })
    if (!referrer) break

    const commission = profitAmount * percentage
    await tx.user.update({
      where: { id: referrer.id },
      data: {
        balance: { increment: commission },
        referralProfit: { increment: commission },
      },
    })

    await tx.referralCommission.create({
      data: {
        referrerId: referrer.id,
        referredUserId: userId,
        level,
        percentage,
        amount: commission,
        sourceType: 'mining_profit',
        sourceId: sessionId,
      },
    })

    await tx.transaction.create({
      data: {
        userId: referrer.id,
        type: 'referral_commission',
        amount: commission,
        status: 'completed',
        description: `Referral commission L${level} from ${user.name}`,
        reference: sessionId,
      },
    })

    await tx.notification.create({
      data: {
        userId: referrer.id,
        type: 'referral',
        title: `Referral Commission L${level}!`,
        titleAr: `عمولة إحالة المستوى ${level}!`,
        message: `You earned ${commission.toFixed(2)} USDT from your referral`,
        messageAr: `لقد ربحت ${commission.toFixed(2)} USDT من الإحالة`,
      },
    })

    currentUser = referrer
  }
}
