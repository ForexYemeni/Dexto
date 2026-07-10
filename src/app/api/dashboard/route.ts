import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/dashboard - user dashboard data
export async function GET(req: NextRequest) {
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
  await processCompletedMining(user.id)

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
      endsAt: { lte: now },
    },
    include: { plan: true },
  })

  for (const session of completedCycles) {
    await db.$transaction(async (tx) => {
      const profit = session.dailyProfit || session.expectedProfit
      const capital = session.investmentAmount
      const totalDays = session.totalDays || 1
      const nextDay = session.currentDay + 1

      // Check if this is the LAST day
      if (nextDay >= totalDays) {
        // ===== PLAN COMPLETE - Return capital + last profit =====
        await tx.userMiningSession.update({
          where: { id: session.id },
          data: {
            status: 'completed',
            currentDay: totalDays,
            completedAt: now,
          },
        })

        // Return capital + last daily profit to balance
        await tx.user.update({
          where: { id: userId },
          data: {
            balance: { increment: capital + profit },
            totalProfit: { increment: profit },
            todayProfit: { increment: profit },
            monthProfit: { increment: profit },
          },
        })

        // Record capital return
        await tx.transaction.create({
          data: {
            userId,
            type: 'mining_profit',
            amount: capital,
            status: 'completed',
            description: `Capital returned - ${session.plan.name} (Plan Complete)`,
            reference: session.id,
          },
        })

        // Record last daily profit
        await tx.transaction.create({
          data: {
            userId,
            type: 'mining_profit',
            amount: profit,
            status: 'completed',
            description: `Daily profit Day ${totalDays}/${totalDays} - ${session.plan.name}`,
            reference: session.id,
          },
        })

        // Add to mining history
        await tx.miningHistory.create({
          data: {
            userId,
            planId: session.planId,
            planName: session.plan.name,
            investmentAmount: capital,
            profitAmount: profit * totalDays, // total profit over all days
            startedAt: session.startedAt,
            completedAt: now,
          },
        })

        // Notification - Plan complete
        await tx.notification.create({
          data: {
            userId,
            type: 'mining',
            title: 'Plan Completed!',
            titleAr: 'اكتملت الخطة!',
            message: `Your ${session.plan.name} has completed all ${totalDays} days. Capital (${capital.toFixed(2)} USDT) + last profit (${profit.toFixed(2)} USDT) added to your balance.`,
            messageAr: `اكتملت خطة ${session.plan.nameAr} لجميع أيام ${totalDays}. تم إرجاع رأس المال (${capital.toFixed(2)} USDT) + آخر ربح (${profit.toFixed(2)} USDT) إلى رصيدك.`,
          },
        })

        // Process referral commissions on profit
        await processReferralCommission(userId, profit, session.id, tx)
      } else {
        // ===== DAILY CYCLE - Add profit only, capital stays LOCKED =====
        const newEndsAt = new Date(now.getTime() + session.plan.durationHours * 60 * 60 * 1000)

        await tx.userMiningSession.update({
          where: { id: session.id },
          data: {
            currentDay: nextDay,
            endsAt: newEndsAt,  // extend to next 24h cycle
            // status stays 'active', capital stays locked
          },
        })

        // Add ONLY daily profit to balance (capital is still locked)
        await tx.user.update({
          where: { id: userId },
          data: {
            balance: { increment: profit },
            totalProfit: { increment: profit },
            todayProfit: { increment: profit },
            monthProfit: { increment: profit },
          },
        })

        // Record daily profit transaction
        await tx.transaction.create({
          data: {
            userId,
            type: 'mining_profit',
            amount: profit,
            status: 'completed',
            description: `Daily profit Day ${nextDay}/${totalDays} - ${session.plan.name}`,
            reference: session.id,
          },
        })

        // Notification - Daily profit
        await tx.notification.create({
          data: {
            userId,
            type: 'mining',
            title: `Daily Profit - Day ${nextDay}/${totalDays}`,
            titleAr: `ربح يومي - اليوم ${nextDay}/${totalDays}`,
            message: `You earned ${profit.toFixed(2)} USDT from ${session.plan.name}. Capital remains locked until day ${totalDays}.`,
            messageAr: `ربحت ${profit.toFixed(2)} USDT من خطة ${session.plan.nameAr}. رأس المال مقفل حتى اليوم ${totalDays}.`,
          },
        })

        // Process referral commissions on daily profit
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
