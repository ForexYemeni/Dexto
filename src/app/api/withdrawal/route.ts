import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { processCompletedMining } from '../dashboard/route'
import { notifyAdmins } from '@/lib/notify-admins'

// GET /api/withdrawal - get withdrawal history + settings + referral-gate status
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

  // Get user's active plan minWithdrawal
  const activeSession = await db.userMiningSession.findFirst({
    where: { userId: payload.userId, status: 'active' },
    include: { plan: true },
  })
  const planMinWithdrawal = activeSession?.plan?.minWithdrawal || null

  // ===== First-withdrawal exemption =====
  // The referral gate only applies starting from the user's SECOND withdrawal.
  // The first withdrawal is always allowed (so the user can verify the platform works).
  // We count any withdrawal ever attempted (regardless of status) to determine this.
  const previousWithdrawalsCount = await db.withdrawal.count({
    where: { userId: payload.userId },
  })
  const isFirstWithdrawal = previousWithdrawalsCount === 0

  // ===== Referral gate status =====
  // Count L1 referrals (users who joined with this user's referral code)
  const referralCount = user?.referralCode
    ? await db.user.count({ where: { referredBy: user.referralCode } })
    : 0

  const gateEnabled = !!settings?.enableReferralGate
  const minReferralsRequired = settings?.minReferralsForWithdrawal ?? 3
  const gateMode = settings?.referralGateMode ?? 'block'
  const gateDelayHours = settings?.referralGateDelayHours ?? 24
  // The gate is only "active" (will actually block/delay) when:
  //   1. The master toggle is on
  //   2. The user has fewer than the required referrals
  //   3. This is NOT the first withdrawal (first one is always allowed)
  const gateTriggered =
    gateEnabled &&
    !isFirstWithdrawal &&
    referralCount < minReferralsRequired
  // gatePassed = true means the user can withdraw without any restrictions
  // (this is what the UI uses to decide whether to show the banner / disable the button)
  const gatePassed = !gateTriggered
  const remainingReferrals = Math.max(0, minReferralsRequired - referralCount)

  // Active mining plan info (used to suggest "upgrade to next plan" as an alternative)
  const activePlan = activeSession?.plan
  let nextPlan: any = null
  if (activePlan) {
    nextPlan = await db.miningPlan.findFirst({
      where: {
        isActive: true,
        sortOrder: { gt: activePlan.sortOrder },
      },
      orderBy: { sortOrder: 'asc' },
    })
  } else {
    // If the user has no active plan, the "next plan" is the cheapest active plan
    nextPlan = await db.miningPlan.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
  }

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
    minWithdrawal: planMinWithdrawal || settings?.minWithdrawal || 10,
    planMinWithdrawal,
    globalMinWithdrawal: settings?.minWithdrawal ?? 10,
    withdrawalFee: settings?.withdrawalFee ?? 1,
    withdrawalFeeType: settings?.withdrawalFeeType ?? 'percent',
    balance: user?.balance ?? 0,
    // Referral gate info for the UI
    referralGate: {
      enabled: gateEnabled,
      // active = the gate is actually applying right now (not first-withdrawal exempted)
      active: gateTriggered,
      isFirstWithdrawal,
      previousWithdrawalsCount,
      mode: gateMode,
      delayHours: gateDelayHours,
      minRequired: minReferralsRequired,
      current: referralCount,
      remaining: remainingReferrals,
      passed: gatePassed,
      nextPlan: nextPlan
        ? {
            id: nextPlan.id,
            name: nextPlan.name,
            nameAr: nextPlan.nameAr,
            fixedAmount: nextPlan.fixedAmount || 0,
            color: nextPlan.color,
            icon: nextPlan.icon,
          }
        : null,
      referralCode: user?.referralCode ?? '',
      referralLink: user?.referralCode ? `${req.nextUrl.origin}/?ref=${user.referralCode}` : '',
    },
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
  const user = await db.user.findUnique({ where: { id: payload.userId } })

  // ===== First-withdrawal exemption =====
  // The referral gate does NOT apply on the user's first withdrawal.
  // We count any withdrawal ever attempted by this user (any status).
  // The first one is always allowed; from the second onward, the gate kicks in.
  const previousWithdrawalsCount = await db.withdrawal.count({
    where: { userId: payload.userId },
  })
  const isFirstWithdrawal = previousWithdrawalsCount === 0

  // ===== Referral gate enforcement =====
  // The gate only applies if:
  //   1. The master toggle is on
  //   2. This is NOT the first withdrawal
  //   3. The user has fewer than the required L1 referrals
  // When the gate triggers and mode = block, the withdrawal is rejected with
  // a clear message telling the user how many more friends they need to invite
  // — or suggesting they upgrade to the next plan.
  const gateEnabled = !!settings?.enableReferralGate
  if (gateEnabled && !isFirstWithdrawal) {
    const minRequired = settings.minReferralsForWithdrawal ?? 3
    const mode = settings.referralGateMode ?? 'block'

    const referralCount = user?.referralCode
      ? await db.user.count({ where: { referredBy: user.referralCode } })
      : 0

    if (referralCount < minRequired) {
      const remaining = minRequired - referralCount

      // block mode: reject the withdrawal outright
      if (mode === 'block') {
        return NextResponse.json(
          {
            error: 'referral_gate_blocked',
            required: minRequired,
            current: referralCount,
            remaining,
            message_ar: `تم رفض السحب. يجب عليك دعوة ${remaining} صديق إضافي (إجمالي ${minRequired} إحالات). لديك حالياً ${referralCount} إحالات. أو قم بالترقية إلى الخطة التالية لتفعيل السحب فوراً.`,
            message_en: `Withdrawal rejected. You must invite ${remaining} more friend(s) (total ${minRequired} referrals). You currently have ${referralCount} referrals. Or upgrade to the next plan to unlock withdrawal immediately.`,
          },
          { status: 403 }
        )
      }

      // upgrade_only mode: warn but allow (the warning is shown in the UI; here we just pass through)
      // delay mode: create the withdrawal but mark it as "pending_referral_hold" with a delayed review time
      // We handle delay below by continuing to create the request but flagging it.
    }
  }

  // Get user's active mining plan to determine minimum withdrawal
  const activeSession = await db.userMiningSession.findFirst({
    where: { userId: payload.userId, status: 'active' },
    include: { plan: true },
  })

  // Use plan's minWithdrawal if user has active plan, otherwise use global setting
  const minWithdrawal = activeSession?.plan?.minWithdrawal || settings?.minWithdrawal || 10

  if (amount < minWithdrawal) {
    return NextResponse.json({ error: 'below_minimum', minRequired: minWithdrawal }, { status: 400 })
  }

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

  // Determine if this withdrawal should be held due to the referral gate (delay mode)
  // The hold only applies when: gate is enabled AND not first withdrawal AND delay mode AND
  // the user has fewer than the required referrals.
  const gateMode = settings?.referralGateMode ?? 'block'
  const minRequired = settings?.minReferralsForWithdrawal ?? 3
  const delayHours = settings?.referralGateDelayHours ?? 24
  const referralCount = user?.referralCode
    ? await db.user.count({ where: { referredBy: user.referralCode } })
    : 0
  const shouldHold =
    gateEnabled &&
    !isFirstWithdrawal &&
    gateMode === 'delay' &&
    referralCount < minRequired

  // Compute the hold release time (used as the note + visible review ETA)
  const holdReleaseAt = shouldHold
    ? new Date(Date.now() + delayHours * 60 * 60 * 1000)
    : null

  // Create withdrawal and lock the amount
  const withdrawal = await db.$transaction(async (tx) => {
    // Deduct from balance immediately
    await tx.user.update({
      where: { id: payload.userId },
      data: { balance: { decrement: amount } },
    })

    const note = shouldHold
      ? `REFERRAL_GATE_HOLD|release_at=${holdReleaseAt!.toISOString()}|required=${minRequired}|current=${referralCount}`
      : null

    const w = await tx.withdrawal.create({
      data: {
        userId: payload.userId,
        network,
        amount,
        fee,
        netAmount,
        walletAddress,
        status: 'pending',
        note,
      },
    })

    await tx.transaction.create({
      data: {
        userId: payload.userId,
        type: 'withdrawal',
        amount: -amount,
        status: 'pending',
        description: `Withdrawal via ${network}${shouldHold ? ' (referral-gate held)' : ''}`,
        reference: w.id,
      },
    })

    return w
  })

  await db.activityLog.create({
    data: {
      userId: payload.userId,
      action: 'withdrawal_request',
      details: `Network: ${network}, Amount: ${amount} USDT${shouldHold ? ' (referral-gate held)' : ''}`,
    },
  })

  // Notify all admins about new withdrawal request
  await notifyAdmins({
    type: 'withdrawal',
    title: 'New Withdrawal Request',
    titleAr: 'طلب سحب جديد',
    message: `User requested withdrawal of ${amount} USDT via ${network} (net: ${netAmount} USDT)${shouldHold ? ' [REFERRAL GATE HELD]' : ''}`,
    messageAr: `مستخدم طلب سحب ${amount} USDT عبر شبكة ${network} (الصافي: ${netAmount} USDT)${shouldHold ? ' [معلّق بسبب بوابة الإحالات]' : ''}`,
  })

  // Notify user about the referral-gate hold
  if (shouldHold) {
    await db.notification.create({
      data: {
        userId: payload.userId,
        type: 'withdrawal',
        title: 'Withdrawal on hold — invite more friends',
        titleAr: 'السحب معلّق — ادعُ المزيد من الأصدقاء',
        message: `Your withdrawal of ${amount} USDT is on hold. Invite at least ${minRequired - referralCount} more friend(s) (you have ${referralCount}/${minRequired}) or upgrade to the next plan. It will be released after ${delayHours}h if no action is taken.`,
        messageAr: `طلب السحب بقيمة ${amount} USDT معلّق. ادعُ ${minRequired - referralCount} صديق إضافي على الأقل (لديك ${referralCount}/${minRequired}) أو قم بالترقية للخطة التالية. سيتم إطلاقه بعد ${delayHours} ساعة في حال عدم اتخاذ إجراء.`,
      },
    })
  }

  // Auto-approve if enabled (gate-held withdrawals are NEVER auto-approved)
  if (settings?.autoApproveWithdrawal && !shouldHold) {
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
    held: shouldHold,
    holdReleaseAt: holdReleaseAt?.toISOString() ?? null,
    withdrawal: {
      id: withdrawal.id,
      network: withdrawal.network,
      amount: withdrawal.amount,
      fee: withdrawal.fee,
      netAmount: withdrawal.netAmount,
      status: withdrawal.status,
      note: withdrawal.note,
      createdAt: withdrawal.createdAt.toISOString(),
    },
  })
}
