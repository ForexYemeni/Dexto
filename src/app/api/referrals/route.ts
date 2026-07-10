import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/referrals
export async function GET(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const user = await db.user.findUnique({ where: { id: payload.userId } })
  if (!user) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // All referrals (any user referred by this user's code)
  const allReferrals = await db.user.findMany({
    where: { referredBy: user.referralCode },
    orderBy: { createdAt: 'desc' },
  })

  // Active referrals (those who have invested)
  const activeReferrals = allReferrals.filter((u) => u.totalInvested > 0)

  // Referral commissions earned
  const commissions = await db.referralCommission.findMany({
    where: { referrerId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const settings = await db.systemSetting.findFirst()

  // Level-wise stats
  const level1Count = allReferrals.length
  // Level 2 = referrals of referrals
  const referralCodes = allReferrals.map((u) => u.referralCode)
  const level2Referrals = await db.user.findMany({
    where: { referredBy: { in: referralCodes } },
  })
  const level2Codes = level2Referrals.map((u) => u.referralCode)
  const level3Referrals = await db.user.findMany({
    where: { referredBy: { in: level2Codes } },
  })

  // Build referral link
  const baseUrl = req.nextUrl.origin
  const referralLink = `${baseUrl}/?ref=${user.referralCode}`

  return NextResponse.json({
    referralCode: user.referralCode,
    referralLink,
    referralProfit: user.referralProfit,
    levels: {
      level1: { count: level1Count, percentage: settings?.referralLevel1 ?? 0.10 },
      level2: { count: level2Referrals.length, percentage: settings?.referralLevel2 ?? 0.05 },
      level3: { count: level3Referrals.length, percentage: settings?.referralLevel3 ?? 0.02 },
    },
    totalReferrals: allReferrals.length,
    activeReferrals: activeReferrals.length,
    referrals: allReferrals.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      joinedAt: u.createdAt.toISOString(),
      totalInvested: u.totalInvested,
      status: u.status,
      isActive: u.totalInvested > 0,
    })),
    commissions: commissions.map((c) => ({
      id: c.id,
      level: c.level,
      percentage: c.percentage,
      amount: c.amount,
      sourceType: c.sourceType,
      createdAt: c.createdAt.toISOString(),
    })),
  })
}
