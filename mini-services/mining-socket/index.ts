import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Track connected users: socketId -> userId
const userSockets = new Map<string, string>()
// Reverse: userId -> Set<socketId>
const socketByUser = new Map<string, Set<string>>()

interface MiningTickPayload {
  userId: string
  sessionId: string
  remainingMs: number
  progressPercent: number
  expectedProfit: number
  endedAt: string
}

io.on('connection', (socket: Socket) => {
  console.log(`[socket] connected: ${socket.id}`)

  socket.on('auth', (data: { userId: string }) => {
    if (!data?.userId) return
    userSockets.set(socket.id, data.userId)
    if (!socketByUser.has(data.userId)) {
      socketByUser.set(data.userId, new Set())
    }
    socketByUser.get(data.userId)!.add(socket.id)
    socket.join(`user:${data.userId}`)
    console.log(`[socket] ${socket.id} authenticated as user ${data.userId}`)
  })

  socket.on('join-admin', () => {
    socket.join('admins')
    console.log(`[socket] ${socket.id} joined admin room`)
  })

  // Mining tick - client sends progress updates from its own clock
  // but server can also broadcast completion events
  socket.on('mining_tick', (data: MiningTickPayload) => {
    // Broadcast to user's other devices
    socket.to(`user:${data.userId}`).emit('mining_update', data)
  })

  socket.on('disconnect', () => {
    const userId = userSockets.get(socket.id)
    if (userId) {
      userSockets.delete(socket.id)
      const sockets = socketByUser.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          socketByUser.delete(userId)
        }
      }
    }
    console.log(`[socket] disconnected: ${socket.id}`)
  })

  socket.on('error', (err: Error) => {
    console.error(`[socket] error (${socket.id}):`, err.message)
  })
})

// Public broadcast helpers (called from API routes via HTTP webhook or direct)
// We expose these via a tiny HTTP endpoint
const adminServer = createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'mining-socket', connections: userSockets.size }))
    return
  }

  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', () => {
    try {
      const data = JSON.parse(body)
      // Broadcast notification to user
      if (data.event === 'notify' && data.userId) {
        io.to(`user:${data.userId}`).emit('notification', data.notification)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      }
      // Broadcast mining update to user
      if (data.event === 'mining_update' && data.userId) {
        io.to(`user:${data.userId}`).emit('mining_update', data.payload)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      }
      // Broadcast admin dashboard refresh
      if (data.event === 'admin_refresh') {
        io.to('admins').emit('admin_refresh', data.payload)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
        return
      }
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'unknown_event' }))
    } catch (e: any) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
  })
})

const SOCKET_PORT = 3003
const ADMIN_PORT = 3004

io.attach(httpServer)
httpServer.listen(SOCKET_PORT, () => {
  console.log(`[socket] Socket.io server running on port ${SOCKET_PORT}`)
})

adminServer.listen(ADMIN_PORT, () => {
  console.log(`[socket] Admin webhook listening on port ${ADMIN_PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[socket] SIGTERM received, shutting down...')
  io.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[socket] SIGINT received, shutting down...')
  io.close(() => process.exit(0))
})
