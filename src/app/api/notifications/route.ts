import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/notifications - get notifications + unread count
export async function GET(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  try {
    const notifications = await db.notification.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const unreadCount = await db.notification.count({
      where: { userId: payload.userId, isRead: false },
    })

    // For admin - also get system-wide stats (pending deposits/withdrawals, open tickets)
    let adminAlerts: any = null
    if (payload.role === 'admin') {
      const pendingDeposits = await db.deposit.count({ where: { status: 'pending' } })
      const pendingWithdrawals = await db.withdrawal.count({ where: { status: 'pending' } })
      const openTickets = await db.supportTicket.count({ where: { status: 'open' } })
      const totalUsers = await db.user.count({ where: { role: 'user' } })

      adminAlerts = {
        pendingDeposits,
        pendingWithdrawals,
        openTickets,
        totalUsers,
        totalAlerts: pendingDeposits + pendingWithdrawals + openTickets,
      }
    }

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        titleAr: n.titleAr,
        message: n.message,
        messageAr: n.messageAr,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
      adminAlerts,
    })
  } catch (error: any) {
    console.error('Notifications API error:', error)
    return NextResponse.json({ error: 'server_error', details: error.message }, { status: 500 })
  }
}

// POST /api/notifications - mark as read
export async function POST(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { action, notificationId } = body

  try {
    if (action === 'mark_all_read') {
      await db.notification.updateMany({
        where: { userId: payload.userId, isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'mark_read' && notificationId) {
      await db.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'delete' && notificationId) {
      await db.notification.delete({
        where: { id: notificationId },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  } catch (error: any) {
    console.error('Notifications POST error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
