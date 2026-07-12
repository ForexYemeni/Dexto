import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyAdmins } from '@/lib/notify-admins'

/**
 * Cron job endpoint - processes ALL users' completed mining sessions
 * Called automatically by Vercel Cron every hour
 * Protected by CRON_SECRET environment variable
 * 
 * Also can be called manually: GET /api/cron/mining?secret=YOUR_SECRET
 */
export async function GET(req: NextRequest) {
  // Verify secret
  const secret = req.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET || 'dexto-cron-secret-2026'

  if (secret !== cronSecret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let processedCount = 0
  let errorCount = 0

  try {
    // Find ALL active sessions that have ended (across ALL users)
    const completedSessions = await db.userMiningSession.findMany({
      where: {
        status: 'active',
        endsAt: { lte: now },
      },
      include: { plan: true, user: true },
    })

    for (const session of completedSessions) {
      try {
        await db.$transaction(async (tx) => {
          const profit = session.dailyProfit || session.expectedProfit || 0
          const capital = session.investmentAmount || 0
          const totalDays = session.totalDays || session.plan?.totalDays || 1
          const currentDay = session.currentDay ?? 0
          const isMiningStarted = session.miningStarted ?? true
          const userId = session.userId

          // Get settings for mining start time
          const settings = await tx.systemSetting.findFirst()
          const miningStartTime = settings?.miningStartTime || ''

          // ===== PHASE 1: WAITING → MINING START =====
          if (!isMiningStarted) {
            const miningEnd = new Date(now.getTime() + session.plan.durationHours * 60 * 60 * 1000)
            await tx.userMiningSession.update({
              where: { id: session.id },
              data: { miningStarted: true, endsAt: miningEnd },
            })
            await tx.notification.create({
              data: {
                userId, type: 'mining',
                title: 'Mining Started!', titleAr: 'بدأ التعدين!',
                message: `Mining for ${session.plan.name} started. Daily profit: ${profit.toFixed(2)} USDT`,
                messageAr: `بدأ التعدين لخطة ${session.plan.nameAr}. الربح اليومي: ${profit.toFixed(2)} USDT`,
              },
            })
            processedCount++
            return
          }

          // ===== PHASE 2: MINING CYCLE COMPLETE =====
          const nextDay = currentDay + 1

          if (nextDay >= totalDays) {
            // PLAN COMPLETE
            await tx.userMiningSession.update({
              where: { id: session.id },
              data: { status: 'completed', currentDay: totalDays, completedAt: now },
            })

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
                userId,
                type: 'mining_profit',
                amount: capital,
                status: 'completed',
                description: `Capital returned - ${session.plan.name} (Plan Complete)`,
                reference: session.id,
              },
            })

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

            await tx.miningHistory.create({
              data: {
                userId,
                planId: session.planId,
                planName: session.plan.name,
                investmentAmount: capital,
                profitAmount: profit * totalDays,
                startedAt: session.startedAt,
                completedAt: now,
              },
            })

            await tx.notification.create({
              data: {
                userId,
                type: 'mining',
                title: 'Plan Completed!',
                titleAr: 'اكتملت الخطة!',
                message: `Your ${session.plan.name} completed all ${totalDays} days. Capital (${capital.toFixed(2)} USDT) + profit (${profit.toFixed(2)} USDT) added to balance.`,
                messageAr: `اكتملت خطة ${session.plan.nameAr} لجميع ${totalDays} أيام. رأس المال (${capital.toFixed(2)} USDT) + الربح (${profit.toFixed(2)} USDT) أضيفت لرصيدك.`,
              },
            })

            // Referral commissions
            await processReferralCommissionCron(userId, profit, session.id, tx)
          } else {
            // ===== DAILY CYCLE - Add profit, start next waiting phase =====
            let newEndsAt: Date
            let newMiningStarted: boolean

            if (miningStartTime && miningStartTime.includes(':')) {
              const [targetHours, targetMinutes] = miningStartTime.split(':').map(Number)
              let targetUTCHours = targetHours - 3
              let targetDateOffset = 0
              if (targetUTCHours < 0) { targetUTCHours += 24; targetDateOffset = -1 }
              const nextTarget = new Date(now)
              nextTarget.setUTCHours(targetUTCHours, targetMinutes, 0, 0)
              nextTarget.setUTCDate(nextTarget.getUTCDate() + targetDateOffset)
              if (nextTarget <= now) nextTarget.setUTCDate(nextTarget.getUTCDate() + 1)
              newEndsAt = nextTarget
              newMiningStarted = false
            } else {
              newEndsAt = new Date(now.getTime() + session.plan.durationHours * 60 * 60 * 1000)
              newMiningStarted = true
            }

            await tx.userMiningSession.update({
              where: { id: session.id },
              data: {
                currentDay: nextDay,
                miningStarted: newMiningStarted,
                endsAt: newEndsAt,
              },
            })

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
                userId,
                type: 'mining_profit',
                amount: profit,
                status: 'completed',
                description: `Daily profit Day ${nextDay}/${totalDays} - ${session.plan.name}`,
                reference: session.id,
              },
            })

            await tx.notification.create({
              data: {
                userId,
                type: 'mining',
                title: `Daily Profit - Day ${nextDay}/${totalDays}`,
                titleAr: `ربح يومي - اليوم ${nextDay}/${totalDays}`,
                message: `You earned ${profit.toFixed(2)} USDT from ${session.plan.name}. Capital locked until day ${totalDays}.`,
                messageAr: `ربحت ${profit.toFixed(2)} USDT من ${session.plan.nameAr}. رأس المال مقفل حتى اليوم ${totalDays}.`,
              },
            })

            await processReferralCommissionCron(userId, profit, session.id, tx)
          }

          processedCount++
        })
      } catch (e) {
        console.error(`Failed to process session ${session.id}:`, e)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      timestamp: now.toISOString(),
    })
  } catch (error: any) {
    console.error('Cron mining error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Referral commission processing for cron
async function processReferralCommissionCron(userId: string, profitAmount: number, sessionId: string, tx: any) {
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
