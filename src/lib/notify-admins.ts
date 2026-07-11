import { db } from './db'

/**
 * Send a notification to ALL admin users
 * Use this when an event happens that admins need to know about
 */
export async function notifyAdmins(params: {
  type: string
  title: string
  titleAr: string
  message: string
  messageAr: string
}) {
  try {
    const admins = await db.user.findMany({
      where: { role: 'admin', status: 'active' },
      select: { id: true },
    })

    if (admins.length === 0) return

    await db.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: params.type,
        title: params.title,
        titleAr: params.titleAr,
        message: params.message,
        messageAr: params.messageAr,
        isRead: false,
      })),
    })
  } catch (error) {
    console.error('notifyAdmins error:', error)
  }
}
