import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/notifications
export async function GET(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const notifications = await db.notification.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

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
    unreadCount: notifications.filter((n) => !n.isRead).length,
  })
}

// POST /api/notifications - mark as read
export async function POST(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { action, notificationId } = body

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
}
