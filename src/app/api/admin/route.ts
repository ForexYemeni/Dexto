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
  if (section === 'tickets') return getTickets()
  if (section === 'settings') return getSettings()
  if (section === 'security_logs') return getSecurityLogs(url)
  if (section === 'activity_logs') return getActivityLogs(url)

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
    case 'update_settings': return updateSettings(body)
    case 'update_admin_credentials': return updateAdminCredentials(body, admin.userId)
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
      price: p.price,
      dailyProfitRate: p.dailyProfitRate,
      durationHours: p.durationHours,
      minInvestment: p.minInvestment,
      maxInvestment: p.maxInvestment,
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
      price: Number(planData.price) || Number(planData.minInvestment) || 50,
      dailyProfitRate: Number(planData.dailyProfitRate) || 0.02,
      durationHours: Number(planData.durationHours) || 24,
      minInvestment: Number(planData.minInvestment) || 50,
      maxInvestment: Number(planData.maxInvestment) || 1000,
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
    if (data.dailyProfitRate !== undefined) updateData.dailyProfitRate = Number(data.dailyProfitRate)
    if (data.durationHours !== undefined) updateData.durationHours = Number(data.durationHours)
    if (data.minInvestment !== undefined) updateData.minInvestment = Number(data.minInvestment)
    if (data.maxInvestment !== undefined) updateData.maxInvestment = Number(data.maxInvestment)
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
      await tx.user.update({
        where: { id: deposit.userId },
        data: { balance: { increment: deposit.amount } },
      })
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
      await tx.notification.create({
        data: {
          userId: deposit.userId,
          type: 'deposit',
          title: 'Deposit Confirmed!',
          titleAr: 'تم تأكيد الإيداع!',
          message: `Your deposit of ${deposit.amount} USDT has been confirmed.`,
          messageAr: `تم تأكيد إيداعك بمبلغ ${deposit.amount} USDT.`,
        },
      })
    } else {
      await tx.notification.create({
        data: {
          userId: deposit.userId,
          type: 'deposit',
          title: 'Deposit Rejected',
          titleAr: 'تم رفض الإيداع',
          message: `Your deposit of ${deposit.amount} USDT was rejected. Please contact support.`,
          messageAr: `تم رفض إيداعك بمبلغ ${deposit.amount} USDT. يرجى التواصل مع الدعم.`,
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

// Update admin email and/or password - completely replaces old credentials
async function updateAdminCredentials(body: any, adminId: string) {
  const { newEmail, newPassword, currentPassword } = body

  // Get current admin user
  const admin = await db.user.findUnique({ where: { id: adminId } })
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

  // Update email if provided
  if (newEmail && newEmail.trim() !== '') {
    const email = newEmail.toLowerCase().trim()
    // Check if email is already used by another user
    const existing = await db.user.findFirst({
      where: { email, NOT: { id: adminId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'email_already_used' }, { status: 400 })
    }
    updateData.email = email
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

  // Update admin user
  await db.user.update({
    where: { id: adminId },
    data: updateData,
  })

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

