import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword } from '@/lib/auth'

async function requireAdmin() {
  const payload = await getCurrentUser()
  if (!payload || payload.role !== 'admin') {
    return null
  }
  return payload
}

// GET /api/admin - dashboard stats
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'admin_only' }, { status: 403 })
  }

  const url = new URL(req.url)
  const section = url.searchParams.get('section') || 'dashboard'

  if (section === 'dashboard') return getDashboardStats()
  if (section === 'users') return getUsers(url)
  if (section === 'plans') return getPlans()
  if (section === 'deposits') return getDeposits(url)
  if (section === 'withdrawals') return getWithdrawals(url)
  if (section === 'wallets') return getWallets()
  if (section === 'tasks') return getTasks()
  if (section === 'tickets') return getTickets()
  if (section === 'settings') return getSettings()
  if (section === 'security_logs') return getSecurityLogs(url)
  if (section === 'activity_logs') return getActivityLogs(url)
  if (section === 'admins') return getAdmins()

  return NextResponse.json({ error: 'invalid_section' }, { status: 400 })
}

// POST /api/admin - actions
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'admin_only' }, { status: 403 })
  }

  const body = await req.json()
  const { action } = body

  switch (action) {
    case 'update_user': return updateUser(body)
    case 'suspend_user': return suspendUser(body.userId)
    case 'activate_user': return activateUser(body.userId)
    case 'delete_user': return deleteUser(body.userId)
    case 'adjust_balance': return adjustBalance(body)
    case 'create_plan': return createPlan(body)
    case 'update_plan': return updatePlan(body)
    case 'delete_plan': return deletePlan(body.planId)
    case 'toggle_plan': return togglePlan(body.planId)
    case 'approve_deposit': return reviewDeposit(body.depositId, 'completed', admin.userId)
    case 'reject_deposit': return reviewDeposit(body.depositId, 'rejected', admin.userId)
    case 'approve_withdrawal': return reviewWithdrawal(body.withdrawalId, 'completed', admin.userId)
    case 'reject_withdrawal': return reviewWithdrawal(body.withdrawalId, 'rejected', admin.userId)
    case 'add_wallet': return addWallet(body)
    case 'update_wallet': return updateWallet(body)
    case 'delete_wallet': return deleteWallet(body.walletId)
    case 'toggle_wallet': return toggleWallet(body.walletId)
    case 'reply_ticket': return replyTicket(body, admin.userId)
    case 'close_ticket': return closeTicket(body.ticketId)
    case 'create_task': return createTask(body)
    case 'update_task': return updateTask(body)
    case 'delete_task': return deleteTask(body.taskId)
    case 'toggle_task': return toggleTask(body.taskId)
    case 'update_settings': return updateSettings(body)
    case 'update_admin_credentials': return updateAdminCredentials(body, admin.userId)
    // ===== Additional admins management =====
    case 'create_admin': return createAdmin(body, admin.userId)
    case 'reset_admin_password': return resetAdminPassword(body, admin.userId)
    case 'delete_admin': return deleteAdmin(body, admin.userId, admin.role)
    case 'toggle_admin_status': return toggleAdminStatus(body, admin.userId)
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}

// === Section handlers ===

async function getDashboardStats() {
  const totalUsers = await db.user.count({ where: { role: 'user' } })
  const activeUsers = await db.user.count({ where: { role: 'user', status: 'active' } })
  const totalDeposits = await db.deposit.aggregate({ _sum: { amount: true } })
  const completedDeposits = await db.deposit.aggregate({
    where: { status: 'completed' },
    _sum: { amount: true },
  })
  const totalWithdrawals = await db.withdrawal.aggregate({ _sum: { amount: true } })
  const completedWithdrawals = await db.withdrawal.aggregate({
    where: { status: 'completed' },
    _sum: { amount: true },
  })
  const pendingDeposits = await db.deposit.count({ where: { status: 'pending' } })
  const pendingWithdrawals = await db.withdrawal.count({ where: { status: 'pending' } })
  const totalProfitPaid = await db.transaction.aggregate({
    where: { type: 'mining_profit', amount: { gt: 0 } },
    _sum: { amount: true },
  })
  const totalMiningSessions = await db.userMiningSession.count()
  const activeMiningSessions = await db.userMiningSession.count({ where: { status: 'active' } })

  // Recent operations
  const recentDeposits = await db.deposit.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: { select: { name: true, email: true } } },
  })
  const recentWithdrawals = await db.withdrawal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: { select: { name: true, email: true } } },
  })

  // Chart data - last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const depositsData: { date: string; amount: number }[] = []
  const withdrawalsData: { date: string; amount: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const dayDeposits = await db.deposit.aggregate({
      where: { createdAt: { gte: date, lt: nextDate } },
      _sum: { amount: true },
    })
    const dayWithdrawals = await db.withdrawal.aggregate({
      where: { createdAt: { gte: date, lt: nextDate } },
      _sum: { amount: true },
    })

    depositsData.push({
      date: date.toISOString().split('T')[0],
      amount: dayDeposits._sum.amount ?? 0,
    })
    withdrawalsData.push({
      date: date.toISOString().split('T')[0],
      amount: dayWithdrawals._sum.amount ?? 0,
    })
  }

  return NextResponse.json({
    totalUsers,
    activeUsers,
    totalDeposits: totalDeposits._sum.amount ?? 0,
    completedDeposits: completedDeposits._sum.amount ?? 0,
    totalWithdrawals: totalWithdrawals._sum.amount ?? 0,
    completedWithdrawals: completedWithdrawals._sum.amount ?? 0,
    pendingDeposits,
    pendingWithdrawals,
    totalProfitPaid: totalProfitPaid._sum.amount ?? 0,
    totalMiningSessions,
    activeMiningSessions,
    recentDeposits: recentDeposits.map((d) => ({
      id: d.id,
      userName: d.user.name,
      userEmail: d.user.email,
      network: d.network,
      amount: d.amount,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    })),
    recentWithdrawals: recentWithdrawals.map((w) => ({
      id: w.id,
      userName: w.user.name,
      userEmail: w.user.email,
      network: w.network,
      amount: w.amount,
      status: w.status,
      createdAt: w.createdAt.toISOString(),
    })),
    chartData: {
      deposits: depositsData,
      withdrawals: withdrawalsData,
    },
  })
}

async function getUsers(url: URL) {
  const search = url.searchParams.get('search') || ''
  const status = url.searchParams.get('status') || ''
  const limit = parseInt(url.searchParams.get('limit') || '100')

  const where: any = { role: 'user' }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
      { referralCode: { contains: search } },
    ]
  }
  if (status && status !== 'all') {
    where.status = status
  }

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      balance: true,
      totalInvested: true,
      totalProfit: true,
      referralCode: true,
      referredBy: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ users })
}

async function getPlans() {
  const plans = await db.miningPlan.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.nameAr,
      description: p.description,
      descriptionAr: p.descriptionAr,
      fixedAmount: p.fixedAmount || 50,
      dailyProfitRate: p.dailyProfitRate,
      durationHours: p.durationHours,
      totalDays: p.totalDays || 7,
      minWithdrawal: p.minWithdrawal || 10,
      color: p.color,
      icon: p.icon,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    })),
  })
}

async function getDeposits(url: URL) {
  const status = url.searchParams.get('status') || ''
  const where: any = {}
  if (status && status !== 'all') where.status = status

  const deposits = await db.deposit.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  })

  return NextResponse.json({
    deposits: deposits.map((d) => ({
      id: d.id,
      userId: d.userId,
      userName: d.user.name,
      userEmail: d.user.email,
      network: d.network,
      amount: d.amount,
      txHash: d.txHash,
      walletAddress: d.walletAddress,
      status: d.status,
      note: d.note,
      createdAt: d.createdAt.toISOString(),
      reviewedAt: d.reviewedAt?.toISOString(),
    })),
  })
}

async function getWithdrawals(url: URL) {
  const status = url.searchParams.get('status') || ''
  const where: any = {}
  if (status && status !== 'all') where.status = status

  const withdrawals = await db.withdrawal.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { name: true, email: true, balance: true } } },
  })

  return NextResponse.json({
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      userId: w.userId,
      userName: w.user.name,
      userEmail: w.user.email,
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
  })
}

async function getWallets() {
  const wallets = await db.wallet.findMany({ orderBy: { network: 'asc' } })
  return NextResponse.json({
    wallets: wallets.map((w) => ({
      id: w.id,
      network: w.network,
      networkAr: w.networkAr,
      address: w.address,
      isActive: w.isActive,
    })),
  })
}

async function getTickets() {
  const tickets = await db.supportTicket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  })
  return NextResponse.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      userId: t.userId,
      userName: t.user.name,
      userEmail: t.user.email,
      subject: t.subject,
      message: t.message,
      reply: t.reply,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  })
}

async function getSettings() {
  const settings = await db.systemSetting.findFirst()
  return NextResponse.json({ settings })
}

async function getSecurityLogs(url: URL) {
  const logs = await db.securityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      eventType: l.eventType,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    })),
  })
}

async function getActivityLogs(url: URL) {
  const logs = await db.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  })
  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user?.name ?? '',
      userEmail: l.user?.email ?? '',
      action: l.action,
      details: l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
    })),
  })
}

// === Action handlers ===

async function updateUser(body: any) {
  const { userId, name, email, phone, status, language, theme } = body
  const user = await db.user.update({
    where: { id: userId },
    data: { name, email, phone, status, language, theme },
  })
  return NextResponse.json({ success: true, user })
}

async function suspendUser(userId: string) {
  await db.user.update({ where: { id: userId }, data: { status: 'suspended' } })
  return NextResponse.json({ success: true })
}

async function activateUser(userId: string) {
  await db.user.update({ where: { id: userId }, data: { status: 'active' } })
  return NextResponse.json({ success: true })
}

async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } })
  return NextResponse.json({ success: true })
}

async function adjustBalance(body: any) {
  const { userId, amount, reason } = body
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } },
    })
    await tx.transaction.create({
      data: {
        userId,
        type: 'admin_adjustment',
        amount,
        status: 'completed',
        description: reason || 'Admin balance adjustment',
      },
    })
  })
  return NextResponse.json({ success: true })
}

async function createPlan(body: any) {
  try {
    // Remove id, createdAt, updatedAt - they should not be set manually
    const { id, createdAt, updatedAt, ...planData } = body

    // Ensure required fields
    const safeData = {
      name: planData.name || 'New Plan',
      nameAr: planData.nameAr || 'خطة جديدة',
      description: planData.description || null,
      descriptionAr: planData.descriptionAr || null,
      fixedAmount: Number(planData.fixedAmount) || 50,
      dailyProfitRate: Number(planData.dailyProfitRate) || 0.02,
      durationHours: Number(planData.durationHours) || 24,
      totalDays: Number(planData.totalDays) || 7,
      minWithdrawal: Number(planData.minWithdrawal) || 10,
      color: planData.color || '#3B82F6',
      icon: planData.icon || 'pickaxe',
      isActive: planData.isActive !== undefined ? planData.isActive : true,
      sortOrder: Number(planData.sortOrder) || 0,
    }

    const plan = await db.miningPlan.create({ data: safeData })
    return NextResponse.json({ success: true, plan })
  } catch (error: any) {
    console.error('createPlan error:', error)
    return NextResponse.json({ error: error.message || 'create_failed' }, { status: 500 })
  }
}

async function updatePlan(body: any) {
  try {
    const { planId, id, createdAt, updatedAt, ...data } = body

    if (!planId) {
      return NextResponse.json({ error: 'plan_id_required' }, { status: 400 })
    }

    // Only include fields that are provided and valid
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr
    if (data.description !== undefined) updateData.description = data.description
    if (data.descriptionAr !== undefined) updateData.descriptionAr = data.descriptionAr
    if (data.price !== undefined) updateData.price = Number(data.price)
    if (data.fixedAmount !== undefined) updateData.fixedAmount = Number(data.fixedAmount)
    if (data.dailyProfitRate !== undefined) updateData.dailyProfitRate = Number(data.dailyProfitRate)
    if (data.durationHours !== undefined) updateData.durationHours = Number(data.durationHours)
    if (data.totalDays !== undefined) updateData.totalDays = Number(data.totalDays)
    if (data.minWithdrawal !== undefined) updateData.minWithdrawal = Number(data.minWithdrawal)
    if (data.color !== undefined) updateData.color = data.color
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.sortOrder !== undefined) updateData.sortOrder = Number(data.sortOrder)

    const plan = await db.miningPlan.update({ where: { id: planId }, data: updateData })
    return NextResponse.json({ success: true, plan })
  } catch (error: any) {
    console.error('updatePlan error:', error)
    return NextResponse.json({ error: error.message || 'update_failed' }, { status: 500 })
  }
}

async function deletePlan(planId: string) {
  await db.miningPlan.delete({ where: { id: planId } })
  return NextResponse.json({ success: true })
}

async function togglePlan(planId: string) {
  const plan = await db.miningPlan.findUnique({ where: { id: planId } })
  if (!plan) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  await db.miningPlan.update({ where: { id: planId }, data: { isActive: !plan.isActive } })
  return NextResponse.json({ success: true })
}

async function reviewDeposit(depositId: string, status: 'completed' | 'rejected', adminId: string) {
  const deposit = await db.deposit.findUnique({ where: { id: depositId } })
  if (!deposit) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (deposit.status !== 'pending') return NextResponse.json({ error: 'already_reviewed' }, { status: 400 })

  await db.$transaction(async (tx) => {
    await tx.deposit.update({
      where: { id: depositId },
      data: { status, reviewedAt: new Date(), reviewedBy: adminId },
    })
    if (status === 'completed') {
      // Get settings for bonus + referral
      const settings = await tx.systemSetting.findFirst()

      // Check if this is user's FIRST deposit
      const previousDeposits = await tx.deposit.count({
        where: { userId: deposit.userId, status: 'completed', id: { not: depositId } },
      })
      const isFirstDeposit = previousDeposits === 0

      let bonusAmount = 0
      let totalCredit = deposit.amount

      // First deposit bonus
      if (isFirstDeposit && settings) {
        const bonusValue = settings.firstDepositBonus || 0
        if (bonusValue > 0) {
          if (settings.firstDepositBonusType === 'percent') {
            bonusAmount = deposit.amount * (bonusValue / 100)
          } else {
            bonusAmount = bonusValue
          }
          totalCredit += bonusAmount
        }
      }

      // Credit user balance (deposit + bonus)
      await tx.user.update({
        where: { id: deposit.userId },
        data: { balance: { increment: totalCredit } },
      })

      // Record deposit transaction
      await tx.transaction.create({
        data: {
          userId: deposit.userId,
          type: 'deposit',
          amount: deposit.amount,
          status: 'completed',
          description: `Deposit via ${deposit.network}`,
          reference: deposit.id,
        },
      })

      // Record bonus transaction
      if (bonusAmount > 0) {
        await tx.transaction.create({
          data: {
            userId: deposit.userId,
            type: 'admin_adjustment',
            amount: bonusAmount,
            status: 'completed',
            description: `First deposit bonus (${settings?.firstDepositBonusType === 'percent' ? `${settings.firstDepositBonus}%` : `${settings.firstDepositBonus} USDT`})`,
            reference: deposit.id,
          },
        })
      }

      // Notification
      await tx.notification.create({
        data: {
          userId: deposit.userId,
          type: 'deposit',
          title: 'Deposit Confirmed!',
          titleAr: 'تم تأكيد الإيداع!',
          message: `Deposit of ${deposit.amount} USDT confirmed${bonusAmount > 0 ? ` + ${bonusAmount.toFixed(2)} USDT bonus!` : ''}`,
          messageAr: `تم تأكيد إيداعك بمبلغ ${deposit.amount} USDT${bonusAmount > 0 ? ` + مكافأة ${bonusAmount.toFixed(2)} USDT!` : ''}`,
        },
      })

      // Process referral commissions as PERCENTAGE of deposit
      if (settings) {
        const levels = [
          { level: 1, percentage: settings.referralLevel1Fixed || 0 },
          { level: 2, percentage: settings.referralLevel2Fixed || 0 },
          { level: 3, percentage: settings.referralLevel3Fixed || 0 },
        ]

        const depositUser = await tx.user.findUnique({ where: { id: deposit.userId } })
        let currentUser = depositUser
        for (const { level, percentage } of levels) {
          if (!currentUser?.referredBy || percentage <= 0) break
          const referrer = await tx.user.findFirst({ where: { referralCode: currentUser.referredBy } })
          if (!referrer) break

          // Commission = percentage × deposit amount
          const commission = deposit.amount * percentage

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
              referredUserId: deposit.userId,
              level,
              percentage: 0,
              amount: commission,
              sourceType: 'deposit',
              sourceId: deposit.id,
            },
          })

          await tx.transaction.create({
            data: {
              userId: referrer.id,
              type: 'referral_commission',
              amount: commission,
              status: 'completed',
              description: `Referral commission L${level} (fixed) from deposit`,
              reference: deposit.id,
            },
          })

          await tx.notification.create({
            data: {
              userId: referrer.id,
              type: 'referral',
              title: `Referral Bonus L${level}!`,
              titleAr: `عمولة إحالة المستوى ${level}!`,
              message: `You earned ${commission.toFixed(2)} USDT from your referral's deposit`,
              messageAr: `لقد ربحت ${commission.toFixed(2)} USDT من إيداع أحد إحالاتك`,
            },
          })

          currentUser = referrer
        }
      }
    } else {
      await tx.notification.create({
        data: {
          userId: deposit.userId,
          type: 'deposit',
          title: 'Deposit Rejected',
          titleAr: 'تم رفض الإيداع',
          message: `Your deposit of ${deposit.amount} USDT was rejected.`,
          messageAr: `تم رفض إيداعك بمبلغ ${deposit.amount} USDT.`,
        },
      })
    }
  })

  return NextResponse.json({ success: true })
}

async function reviewWithdrawal(withdrawalId: string, status: 'completed' | 'rejected', adminId: string) {
  const withdrawal = await db.withdrawal.findUnique({ where: { id: withdrawalId } })
  if (!withdrawal) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (withdrawal.status !== 'pending') return NextResponse.json({ error: 'already_reviewed' }, { status: 400 })

  await db.$transaction(async (tx) => {
    await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status, reviewedAt: new Date(), reviewedBy: adminId },
    })
    await tx.transaction.updateMany({
      where: { reference: withdrawalId, type: 'withdrawal' },
      data: { status: status === 'completed' ? 'completed' : 'failed' },
    })

    if (status === 'rejected') {
      // Refund the amount
      await tx.user.update({
        where: { id: withdrawal.userId },
        data: { balance: { increment: withdrawal.amount } },
      })
    }

    await tx.notification.create({
      data: {
        userId: withdrawal.userId,
        type: 'withdrawal',
        title: status === 'completed' ? 'Withdrawal Completed!' : 'Withdrawal Rejected',
        titleAr: status === 'completed' ? 'تم السحب بنجاح!' : 'تم رفض السحب',
        message:
          status === 'completed'
            ? `Your withdrawal of ${withdrawal.amount} USDT has been processed.`
            : `Your withdrawal of ${withdrawal.amount} USDT was rejected. Amount refunded.`,
        messageAr:
          status === 'completed'
            ? `تم معالجة سحبك بمبلغ ${withdrawal.amount} USDT.`
            : `تم رفض سحبك بمبلغ ${withdrawal.amount} USDT. تم استرجاع المبلغ.`,
      },
    })
  })

  return NextResponse.json({ success: true })
}

async function addWallet(body: any) {
  const { network, networkAr, address } = body
  const wallet = await db.wallet.create({ data: { network, networkAr, address, isActive: true } })
  return NextResponse.json({ success: true, wallet })
}

async function updateWallet(body: any) {
  const { walletId, network, networkAr, address, isActive } = body
  const wallet = await db.wallet.update({
    where: { id: walletId },
    data: { network, networkAr, address, isActive },
  })
  return NextResponse.json({ success: true, wallet })
}

async function deleteWallet(walletId: string) {
  await db.wallet.delete({ where: { id: walletId } })
  return NextResponse.json({ success: true })
}

async function toggleWallet(walletId: string) {
  const wallet = await db.wallet.findUnique({ where: { id: walletId } })
  if (!wallet) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  await db.wallet.update({ where: { id: walletId }, data: { isActive: !wallet.isActive } })
  return NextResponse.json({ success: true })
}

async function replyTicket(body: any, adminId: string) {
  const { ticketId, reply } = body
  const ticket = await db.supportTicket.update({
    where: { id: ticketId },
    data: { reply, status: 'replied' },
  })
  await db.notification.create({
    data: {
      userId: ticket.userId,
      type: 'system',
      title: 'Support Reply',
      titleAr: 'رد الدعم',
      message: `Your ticket "${ticket.subject}" has been replied to.`,
      messageAr: `تم الرد على تذكرتك "${ticket.subject}".`,
    },
  })
  return NextResponse.json({ success: true, ticket })
}

async function closeTicket(ticketId: string) {
  await db.supportTicket.update({ where: { id: ticketId }, data: { status: 'closed' } })
  return NextResponse.json({ success: true })
}

async function updateSettings(body: any) {
  const { settings } = body
  // Remove id and updatedAt - they should not be updated
  const { id, updatedAt, ...updateData } = settings
  const existing = await db.systemSetting.findFirst()
  if (!existing) {
    const created = await db.systemSetting.create({ data: updateData })
    return NextResponse.json({ success: true, settings: created })
  }
  const updated = await db.systemSetting.update({
    where: { id: existing.id },
    data: updateData,
  })
  return NextResponse.json({ success: true, settings: updated })
}

// Update admin phone and/or password - completely replaces old credentials
async function updateAdminCredentials(body: any, adminId: string) {
  const { newPhone, newPassword, currentPassword } = body

  // Get current admin user — use the flexible lookup helper that handles
  // both ObjectId and string _id in MongoDB.
  const admin = await findUserByIdFlexible(adminId)

  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'admin_not_found' }, { status: 404 })
  }

  // Verify current password for security
  const { comparePassword } = await import('@/lib/auth')
  if (currentPassword) {
    const valid = await comparePassword(currentPassword, admin.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'current_password_wrong' }, { status: 400 })
    }
  } else {
    return NextResponse.json({ error: 'current_password_required' }, { status: 400 })
  }

  const updateData: any = {}

  // Update phone if provided (primary login identifier now)
  if (newPhone && String(newPhone).trim() !== '') {
    const { normalizePhone, isValidPhone } = await import('@/lib/auth')
    const normalizedPhone = normalizePhone(String(newPhone))
    if (!isValidPhone(normalizedPhone)) {
      return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
    }
    // Check if phone is already used by another user
    const existing = await db.user.findFirst({
      where: { phone: normalizedPhone, NOT: { id: adminId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'phone_already_used' }, { status: 400 })
    }
    updateData.phone = normalizedPhone
    // Also update the placeholder email to keep it unique and consistent
    updateData.email = `admin_${normalizedPhone}@dexto.local`
  }

  // Update password if provided
  if (newPassword && newPassword.trim() !== '') {
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
    }
    // Hash the new password - completely replaces old hash
    updateData.passwordHash = await hashPassword(newPassword)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 })
  }

  // Update admin user via the flexible update helper (handles ObjectId)
  const updated = await updateUserRaw(adminId, updateData)
  if (!updated) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  // Log the security event
  await db.securityLog.create({
    data: {
      userId: adminId,
      eventType: 'admin_credentials_changed',
      details: `Changed: ${Object.keys(updateData).join(', ')}`,
    },
  })

  // Clear auth cookie to force re-login with new credentials
  const { clearAuthCookie } = await import('@/lib/auth')
  await clearAuthCookie()

  return NextResponse.json({
    success: true,
    message: 'Credentials updated. Please login again with new credentials.',
    clearedSession: true,
  })
}

// ===== Tasks Management =====
async function getTasks() {
  const tasks = await db.task.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      titleAr: t.titleAr,
      description: t.description,
      descriptionAr: t.descriptionAr,
      type: t.type,
      rewardAmount: t.rewardAmount,
      rewardPoints: t.rewardPoints,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
    })),
  })
}

async function createTask(body: any) {
  try {
    const { id, createdAt, ...taskData } = body
    const safeData = {
      title: taskData.title || 'Task',
      titleAr: taskData.titleAr || 'مهمة',
      description: taskData.description || null,
      descriptionAr: taskData.descriptionAr || null,
      type: taskData.type || 'custom',
      rewardAmount: Number(taskData.rewardAmount) || 0,
      rewardPoints: Number(taskData.rewardPoints) || 0,
      isActive: taskData.isActive !== undefined ? taskData.isActive : true,
    }
    const task = await db.task.create({ data: safeData })
    return NextResponse.json({ success: true, task })
  } catch (error: any) {
    console.error('createTask error:', error)
    return NextResponse.json({ error: error.message || 'create_failed' }, { status: 500 })
  }
}

async function updateTask(body: any) {
  try {
    const { taskId, id, createdAt, ...data } = body
    if (!taskId) {
      return NextResponse.json({ error: 'task_id_required' }, { status: 400 })
    }
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.titleAr !== undefined) updateData.titleAr = data.titleAr
    if (data.description !== undefined) updateData.description = data.description
    if (data.descriptionAr !== undefined) updateData.descriptionAr = data.descriptionAr
    if (data.type !== undefined) updateData.type = data.type
    if (data.rewardAmount !== undefined) updateData.rewardAmount = Number(data.rewardAmount)
    if (data.rewardPoints !== undefined) updateData.rewardPoints = Number(data.rewardPoints)
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const task = await db.task.update({ where: { id: taskId }, data: updateData })
    return NextResponse.json({ success: true, task })
  } catch (error: any) {
    console.error('updateTask error:', error)
    return NextResponse.json({ error: error.message || 'update_failed' }, { status: 500 })
  }
}

async function deleteTask(taskId: string) {
  await db.task.delete({ where: { id: taskId } })
  return NextResponse.json({ success: true })
}

async function toggleTask(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } })
  if (!task) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  await db.task.update({ where: { id: taskId }, data: { isActive: !task.isActive } })
  return NextResponse.json({ success: true })
}

/**
 * Helper: find a user by id, trying multiple strategies to handle legacy
 * MongoDB documents (ObjectId vs string _id, Prisma type validation issues).
 * Returns the user document (with .id normalized) or null.
 */
async function findUserByIdFlexible(userId: string): Promise<any | null> {
  // Strategy 1: Prisma findFirst
  try {
    const user = await db.user.findFirst({ where: { id: userId } })
    if (user) return user
  } catch (e) {
    // ignore
  }

  // Strategy 2: raw MongoDB find with ObjectId conversion
  if (/^[0-9a-fA-F]{24}$/.test(userId)) {
    try {
      const { ObjectId } = await import('mongodb')
      const findResult: any = await (db as any).$runCommandRaw({
        find: 'users',
        filter: { _id: new ObjectId(userId) },
        limit: 1,
      })
      const doc = findResult?.cursor?.firstBatch?.[0]
      if (doc) {
        // Normalize: add .id property if missing
        if (!doc.id && doc._id) {
          doc.id = typeof doc._id === 'string' ? doc._id : doc._id.toString()
        }
        return doc
      }
    } catch (e) {
      // ignore
    }
  }

  // Strategy 3: raw MongoDB find with string _id
  try {
    const findResult: any = await (db as any).$runCommandRaw({
      find: 'users',
      filter: { _id: userId },
      limit: 1,
    })
    const doc = findResult?.cursor?.firstBatch?.[0]
    if (doc) {
      if (!doc.id && doc._id) {
        doc.id = typeof doc._id === 'string' ? doc._id : doc._id.toString()
      }
      return doc
    }
  } catch (e) {
    // ignore
  }

  return null
}

/**
 * Helper: update a user by id using raw MongoDB command (handles ObjectId).
 * Returns true if the update affected at least one document.
 */
async function updateUserRaw(userId: string, updateData: any): Promise<boolean> {
  // Try raw update with ObjectId first
  if (/^[0-9a-fA-F]{24}$/.test(userId)) {
    try {
      const { ObjectId } = await import('mongodb')
      const result: any = await (db as any).$runCommandRaw({
        update: 'users',
        updates: [
          {
            q: { _id: new ObjectId(userId) },
            u: { $set: updateData },
          },
        ],
      })
      if (result?.nModified > 0 || result?.n > 0) return true
    } catch (e) {
      // ignore
    }
  }

  // Try raw update with string _id
  try {
    const result: any = await (db as any).$runCommandRaw({
      update: 'users',
      updates: [
        {
          q: { _id: userId },
          u: { $set: updateData },
        },
      ],
    })
    if (result?.nModified > 0 || result?.n > 0) return true
  } catch (e) {
    // ignore
  }

  // Fallback to Prisma
  try {
    await db.user.update({ where: { id: userId }, data: updateData })
    return true
  } catch (e) {
    return false
  }
}

// =====================================================
// ===== Additional Admins Management (multi-admin) =====
// =====================================================

// GET section=admins — list all admin accounts (excluding passwordHash)
async function getAdmins() {
  const admins = await db.user.findMany({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      status: true,
      language: true,
      lastLoginAt: true,
      createdAt: true,
      referralCode: true,
    },
  })
  return NextResponse.json({ admins })
}

// Create a new admin account — requires admin privileges.
// Body: { name, phone, password }
async function createAdmin(body: any, creatorId: string) {
  const { name, phone, password } = body
  if (!name || !phone || !password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }
  const { normalizePhone, isValidPhone, generateReferralCode } = await import('@/lib/auth')
  const normalizedPhone = normalizePhone(String(phone))
  if (!isValidPhone(normalizedPhone)) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
  }
  // Use findFirst (not findUnique) — MongoDB may not have a unique index on `phone`.
  const existing = await db.user.findFirst({ where: { phone: normalizedPhone } })
  if (existing) {
    return NextResponse.json({ error: 'phone_already_used' }, { status: 409 })
  }
  const passwordHash = await hashPassword(password)
  // Generate a unique placeholder email to satisfy the legacy unique index
  // on `email` in MongoDB. Without this, creating two users with email=null
  // throws P2002 'Unique constraint failed on users_email_key'.
  // The email is optional for login (phone is the primary identifier).
  const placeholderEmail = `admin_${normalizedPhone}@dexto.local`
  const newAdmin = await db.user.create({
    data: {
      phone: normalizedPhone,
      email: placeholderEmail,
      name,
      passwordHash,
      referralCode: generateReferralCode(name),
      role: 'admin',
      status: 'active',
      balance: 0,
      language: 'ar',
      theme: 'dark',
    },
  })
  await db.securityLog.create({
    data: {
      userId: creatorId,
      eventType: 'admin_created',
      details: `Created admin ${newAdmin.name} (phone: ${newAdmin.phone})`,
    },
  })
  return NextResponse.json({
    success: true,
    admin: {
      id: newAdmin.id,
      phone: newAdmin.phone,
      name: newAdmin.name,
      role: newAdmin.role,
      status: newAdmin.status,
    },
  })
}

// Reset another admin's password (admin-only).
// Body: { adminId, newPassword }
async function resetAdminPassword(body: any, requesterId: string) {
  const { adminId, newPassword } = body
  if (!adminId || !newPassword) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }
  const target = await findUserByIdFlexible(adminId)
  if (!target || target.role !== 'admin') {
    return NextResponse.json({ error: 'admin_not_found' }, { status: 404 })
  }
  const passwordHash = await hashPassword(newPassword)
  const updated = await updateUserRaw(adminId, { passwordHash })
  if (!updated) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  await db.securityLog.create({
    data: {
      userId: requesterId,
      eventType: 'admin_password_reset',
      details: `Reset password for admin ${target.name} (id: ${target.id})`,
    },
  })
  return NextResponse.json({ success: true })
}

// Delete an admin account. The primary/seed admin cannot be deleted.
// Body: { adminId }
async function deleteAdmin(body: any, requesterId: string, _requesterRole: string) {
  const { adminId } = body
  if (!adminId) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (adminId === requesterId) {
    return NextResponse.json({ error: 'cannot_delete_self' }, { status: 400 })
  }
  const target = await findUserByIdFlexible(adminId)
  if (!target || target.role !== 'admin') {
    return NextResponse.json({ error: 'admin_not_found' }, { status: 404 })
  }
  // Protect the seed admin (phone 773178684) from deletion
  if (target.phone === '773178684') {
    return NextResponse.json({ error: 'cannot_delete_primary_admin' }, { status: 400 })
  }
  // Downgrade to a regular user rather than hard-delete to preserve historical references.
  const updated = await updateUserRaw(adminId, { role: 'user' })
  if (!updated) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  await db.securityLog.create({
    data: {
      userId: requesterId,
      eventType: 'admin_removed',
      details: `Removed admin privileges from ${target.name} (id: ${target.id})`,
    },
  })
  return NextResponse.json({ success: true })
}

// Suspend / activate an admin (cannot suspend the primary seed admin)
// Body: { adminId }
async function toggleAdminStatus(body: any, requesterId: string) {
  const { adminId } = body
  if (!adminId) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (adminId === requesterId) {
    return NextResponse.json({ error: 'cannot_suspend_self' }, { status: 400 })
  }
  const target = await findUserByIdFlexible(adminId)
  if (!target || target.role !== 'admin') {
    return NextResponse.json({ error: 'admin_not_found' }, { status: 404 })
  }
  if (target.phone === '773178684') {
    return NextResponse.json({ error: 'cannot_modify_primary_admin' }, { status: 400 })
  }
  const newStatus = target.status === 'active' ? 'suspended' : 'active'
  const updated = await updateUserRaw(adminId, { status: newStatus })
  if (!updated) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  await db.securityLog.create({
    data: {
      userId: requesterId,
      eventType: 'admin_status_toggled',
      details: `${target.name} status → ${newStatus}`,
    },
  })
  return NextResponse.json({ success: true, status: newStatus })
}


