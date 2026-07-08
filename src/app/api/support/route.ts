import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/support - user tickets
export async function GET(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const tickets = await db.supportTicket.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: 'desc' },
  })

  const settings = await db.systemSetting.findFirst()

  return NextResponse.json({
    tickets: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      message: t.message,
      reply: t.reply,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    supportEmail: settings?.supportEmail ?? '',
    supportPhone: settings?.supportPhone ?? '',
    supportTelegram: settings?.supportTelegram ?? '',
  })
}

// POST /api/support - create ticket
export async function POST(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { subject, message, priority } = body

  if (!subject || !message) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const ticket = await db.supportTicket.create({
    data: {
      userId: payload.userId,
      subject,
      message,
      priority: priority || 'normal',
      status: 'open',
    },
  })

  await db.activityLog.create({
    data: {
      userId: payload.userId,
      action: 'support_ticket_created',
      details: `Subject: ${subject}`,
    },
  })

  return NextResponse.json({
    success: true,
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt.toISOString(),
    },
  })
}
