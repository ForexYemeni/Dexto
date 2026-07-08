import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { processCompletedMining } from '../dashboard/route'

// GET /api/tasks - all tasks + user completions for today
export async function GET(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  await processCompletedMining(payload.userId)

  const tasks = await db.task.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  // Get today's user tasks
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const userTasks = await db.userTask.findMany({
    where: {
      userId: payload.userId,
      createdAt: { gte: today, lt: tomorrow },
    },
    include: { task: true },
  })

  const user = await db.user.findUnique({ where: { id: payload.userId } })

  return NextResponse.json({
    tasks: tasks.map((t) => {
      const userTask = userTasks.find((ut) => ut.taskId === t.id)
      return {
        id: t.id,
        title: t.title,
        titleAr: t.titleAr,
        description: t.description,
        descriptionAr: t.descriptionAr,
        type: t.type,
        rewardAmount: t.rewardAmount,
        rewardPoints: t.rewardPoints,
        isActive: t.isActive,
        userTaskId: userTask?.id,
        status: userTask?.status || 'pending',
        completedAt: userTask?.completedAt?.toISOString(),
        claimedAt: userTask?.claimedAt?.toISOString(),
      }
    }),
    balance: user?.balance ?? 0,
  })
}

// POST /api/tasks - claim reward
export async function POST(req: NextRequest) {
  const payload = await getCurrentUser()
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { action, taskId } = body

  if (action === 'claim') {
    return claimReward(payload.userId, taskId)
  } else if (action === 'complete') {
    return completeTask(payload.userId, taskId)
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}

async function claimReward(userId: string, taskId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const userTask = await db.userTask.findFirst({
    where: {
      userId,
      taskId,
      createdAt: { gte: today, lt: tomorrow },
    },
    include: { task: true },
  })

  if (!userTask) {
    return NextResponse.json({ error: 'task_not_completed' }, { status: 400 })
  }

  if (userTask.status === 'claimed') {
    return NextResponse.json({ error: 'already_claimed' }, { status: 400 })
  }

  if (userTask.status !== 'completed') {
    return NextResponse.json({ error: 'task_not_completed' }, { status: 400 })
  }

  await db.$transaction(async (tx) => {
    await tx.userTask.update({
      where: { id: userTask.id },
      data: { status: 'claimed', claimedAt: new Date() },
    })

    await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: userTask.rewardAmount } },
    })

    await tx.transaction.create({
      data: {
        userId,
        type: 'task_reward',
        amount: userTask.rewardAmount,
        status: 'completed',
        description: `Task reward: ${userTask.task.title}`,
        reference: userTask.id,
      },
    })

    await tx.notification.create({
      data: {
        userId,
        type: 'task',
        title: 'Task Reward Claimed!',
        titleAr: 'تم استلام مكافأة المهمة!',
        message: `You claimed ${userTask.rewardAmount} USDT reward`,
        messageAr: `لقد استلمت ${userTask.rewardAmount} USDT كمكافأة`,
      },
    })
  })

  return NextResponse.json({ success: true })
}

async function completeTask(userId: string, taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } })
  if (!task || !task.isActive) {
    return NextResponse.json({ error: 'task_not_found' }, { status: 404 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const existing = await db.userTask.findFirst({
    where: {
      userId,
      taskId,
      createdAt: { gte: today, lt: tomorrow },
    },
  })

  if (existing) {
    return NextResponse.json({ error: 'already_completed' }, { status: 400 })
  }

  const userTask = await db.userTask.create({
    data: {
      userId,
      taskId,
      status: 'completed',
      completedAt: new Date(),
      rewardAmount: task.rewardAmount,
      rewardPoints: task.rewardPoints,
    },
  })

  return NextResponse.json({ success: true, userTaskId: userTask.id })
}
